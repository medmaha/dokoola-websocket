import { InfoLogger } from "../logger.js";
import { SocketUser } from "../types.js";
import redisClient from "../redis-cache/index.js";

const mapDB = new Map<string, SocketUser>();
const logger = InfoLogger("user_database.log");

const KEY_PREFIX="ws-users"


class UserDatabase {

  private static getKey(key:string):`ws-users:${string}`{
    return `${KEY_PREFIX}:${key}`
  }

  public static async get(publicId: string): Promise<SocketUser|null> {
    
    logger.info("Retrieving user from database", { publicId });
    if (!redisClient) return mapDB.get(publicId) || null

    const user = (await redisClient.hGetAll(this.getKey(publicId)) as any);
    return user || null
  }

  public static async set(publicId: string, user: SocketUser) {
    logger.info("User added/updated in database", { publicId, user });

    if (!redisClient) return mapDB.set(publicId, user)

    const identity = this.getKey(publicId)
    await redisClient.hSet(identity, {
      public_id: publicId,
      name: String(user.name||""),
      avatar: String(user.avatar||""),
      socket_id: String(user.socketId || "") 
    })
    redisClient.expire(identity, 60*60*24)
  }

  public static async delete(publicId: string) {
    logger.info("User deleted from database", { publicId });

    if (!redisClient) return mapDB.delete(publicId)

    await redisClient.del(this.getKey(publicId));
  }
}
export default UserDatabase;
