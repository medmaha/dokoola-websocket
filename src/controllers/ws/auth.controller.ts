import { Server, Socket } from "socket.io";
import { SocketUser } from "../../types";
import UserDatabase from "./utilities/db.js";
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
    logger.info("User login successful", { userId: user.public_id });
  }

  // User logging out
  public static async logout(user: SocketUser, socket: Socket) {
    logger.info("User logging out", { user, socketId: socket.id });
    socket.emit("logged-out", user);
    await UserDatabase.delete(user.public_id);
    logger.info("User logout successful", { userId: user.public_id });
  }
}
