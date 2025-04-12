import { Server, Socket } from "socket.io";
import { SocketUser } from "../../types.js";
import UserDatabase from "../../storage/db.js";
import { InfoLogger } from "../../logger.js";

const logger = InfoLogger("auth_controller.log");
export default class AuthController {
  public static io: Server;

  public static init(socket: Socket) {
    logger.info(`Initializing socket events for user: ${socket.id}`);
    socket.on("login", (user: SocketUser) =>
      AuthController.login(user, socket)
    );
    socket.on("logout", (user: SocketUser) =>
      AuthController.logout(user, socket)
    );
    socket.on("online-users", () =>
      AuthController.getOnlineUsers(socket)
    );
  }

  // User logging in
  public static async login(user: SocketUser, socket: Socket) {
    logger.info("User logging in", { user, socketId: socket.id });
    socket.data = { user: user, userId: user.public_id };
    socket.emit("logged-in", user);
    await UserDatabase.set(user.public_id, {
      ...user,
      socketId: socket.id,
    });
    UserDatabase.onlineUsers.add(user.public_id)
  }

  // User logging out
  public static async logout(user: SocketUser, socket: Socket) {
    logger.info("User logging out", { user, socketId: socket.id });
    socket.emit("logged-out", user);
    await UserDatabase.delete(user.public_id);
    UserDatabase.onlineUsers.delete(user.public_id)
  }

  public static async getOnlineUsers(socket: Socket){
    socket.emit("online-users", Array.from(UserDatabase.onlineUsers))
  }
}
