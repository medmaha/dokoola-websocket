import { Server, Socket } from "socket.io";
import { SocketUser } from "../../types";
import { loggerSocketRequest } from "./utilities/helpers.js";
import UserDatabase from "./utilities/db.js";

export default class AuthController {
  public static io: Server;

  public static init(socket: Socket) {
    socket.on("login", (user: SocketUser) =>
      AuthController.login(user, socket)
    );
    socket.on("logout", (user: SocketUser) =>
      AuthController.logout(user, socket)
    );
  }

  // User logging in
  public static async login(user: SocketUser, socket: Socket) {
    loggerSocketRequest(socket.id, "/ws/login", "auth");
    socket.data = { user: user };
    socket.emit("logged-in", user);
    await UserDatabase.set(user.public_id, {
      ...user,
      socketId: socket.id,
    });
  }
  // User logging out
  public static async logout(user: SocketUser, socket: Socket) {
    loggerSocketRequest(socket.id, "/ws/logout", "auth");
    socket.emit("logged-out", user);
    await UserDatabase.delete(user.public_id);
  }
}
