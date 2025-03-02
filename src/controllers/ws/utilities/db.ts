import { InfoLogger } from "../../../logger.js";
import { SocketUser } from "../../../types";

// import redisClient from "../../../redis-cache/index.js";

const logger = InfoLogger("user_database.log");
class UserDatabase {
  static DB = new Map<string, SocketUser>();
  public static async get(publicId: string) {
    // const user = await redisClient.get(publicId);
    // if (user) return JSON.parse(user) as SocketUser;
    // return undefined;
    const user = UserDatabase.DB.get(publicId);
    if (user) {
      logger.info("User retrieved from database", { publicId });
    } else {
      logger.warn("User not found in database", { publicId });
    }
    return user;
  }

  public static async set(publicId: string, user: SocketUser) {
    // await redisClient.set(publicId, JSON.stringify(user));
    UserDatabase.DB.set(publicId, user);
    logger.info("User added/updated in database", { publicId, user });
  }

  public static async delete(publicId: string) {
    // await redisClient.hDel("users", publicId);
    if (UserDatabase.DB.has(publicId)) {
      UserDatabase.DB.delete(publicId);
      logger.info("User deleted from database", { publicId });
    } else {
      logger.warn("Attempted to delete non-existent user", { publicId });
    }
  }
}
export default UserDatabase;
