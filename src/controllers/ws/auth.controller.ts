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
  public static login(user: SocketUser, socket: Socket) {
    loggerSocketRequest(socket.id, "/ws/login", "auth");
    UserDatabase.set(user.username, {
      ...user,
      socketId: socket.id,
    });
    socket.data = { user: user };
    socket.emit("logged-in", user);
  }
  // User logging out
  public static logout(user: SocketUser, socket: Socket) {
    loggerSocketRequest(socket.id, "/ws/logout", "auth");
    UserDatabase.delete(user.username);
    socket.emit("logged-out", user);
  }
}
