import { SocketUser } from "../../../types";

// import redisClient from "../../../redis-cache/index.js";

class UserDatabase {
  static DB = new Map<string, SocketUser>();
  public static async get(username: string) {
    // const user = await redisClient.get(username);
    // if (user) return JSON.parse(user) as SocketUser;
    // return undefined;
    const user = UserDatabase.DB.get(username);
    return user;
  }

  public static async set(username: string, user: SocketUser) {
    // await redisClient.set(username, JSON.stringify(user));
    UserDatabase.DB.set(username, user);
    UserDatabase.DB.set(username, user);
  }

  public static async delete(username: string) {
    // await redisClient.hDel("users", username);
    UserDatabase.DB.delete(username);
  }
}
export default UserDatabase;
