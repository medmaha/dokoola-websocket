import { InfoLogger } from "../logger.js";
import { SocketUser } from "../types.js";
import { getRedisClient } from "../redis-cache/index.js";

const mapDB = new Map<string, SocketUser>();
const logger = InfoLogger("user_database.log");

const KEY_PREFIX = "ws-users"


class _Database {

  client?: Awaited<ReturnType<typeof getRedisClient>>
  onlineUsers: Set<string>

  constructor() {
    this.init()
    this.onlineUsers = new Set()
  }

  async init() {
    this.client = await getRedisClient()
  }

  getKey(key: string): `ws-users:${string}` {
    return `${KEY_PREFIX}:${key}`
  }

  async get(publicId: string): Promise<SocketUser | null> {

    const identity = this.getKey(publicId)

    logger.info("Retrieving user from database", { publicId });
    if (!this.client) return mapDB.get(identity) || null

    const user = (await this.client.hGetAll(identity) as any);
    return user || null
  }



  async set(publicId: string, user: SocketUser) {
    logger.info("User added/updated in database", { publicId, user });

    const identity = this.getKey(publicId)

    if (!this.client) return mapDB.set(identity, user)

    await this.client.hSet(identity, {
      public_id: publicId,
      name: String(user.name || ""),
      avatar: String(user.avatar || ""),
      socket_id: String(user.socketId || "")
    })

    this.client.expire(identity, 60 * 60 * 24)
  }
  async setAny(publicId: string, data: any, expiresInSeconds?: number) {

    const identity = this.getKey(publicId)

    if (!this.client) return mapDB.set(identity, data)

    await this.client.set(identity, JSON.stringify(data))

    this.client.expire(identity, expiresInSeconds || 60 * 60 * 24)
  }

  async delete(publicId: string) {
    logger.info("User deleted from database", { publicId });

    const identity = this.getKey(publicId)

    if (!this.client) return mapDB.delete(identity)

    await this.client.del(this.getKey(identity));
  }

  async all(public_id?: string): Promise<[any, SocketUser[]]> {


    // if (public_id) {
    //   const cached = await this.get(public_id)
    //   if (cached) {
    //     return [cached, null] as any
    //   }
    // }

    if (!this.client) {
      return [null, Object.values(mapDB) as SocketUser[]]
    }

    const keys = [];
    let cursor = 0
    do {
      const { cursor: nextCursor, keys: found } = await this.client.scan(cursor, {
        // COUNT, count,
        MATCH: `${KEY_PREFIX}*`,
      });
      keys.push(...found);
      cursor = nextCursor;
    } while (cursor !== 0);

    const values = await this.client.mGet(keys);
    const items = keys.reduce((acc, key, idx) => {
      const value = values[idx]
      if (!!value) {
        acc[key] = JSON.stringify(value);
      }
      return acc;
    }, {} as Record<string, any>);

    return [null, Object.values(items) as SocketUser[]]

  }
}

const UserDatabase = new _Database()

export default UserDatabase;
