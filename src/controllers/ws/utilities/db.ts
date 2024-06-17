import { SocketUser } from "../../../types";

import redisClient from "../../../redis-cache/index.js";

class UserDatabase {
  public static async get(username: string) {
    const user = await redisClient.get(username);

    if (user) return JSON.parse(user) as SocketUser;

    return undefined;
  }

  public static async set(username: string, user: SocketUser) {
    await redisClient.set(username, JSON.stringify(user));
  }

  public static async delete(username: string) {
    await redisClient.hDel("users", username);
  }
}
export default UserDatabase;
