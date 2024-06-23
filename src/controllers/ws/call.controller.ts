import { Server, Socket } from "socket.io";
import { CallRequest, OutGoingCall } from "../../types";
import { loggerSocketRequest } from "./utilities/helpers.js";
import UserDatabase from "./utilities/db.js";

export default class CallController {
  public static io: Server;

  public static init(socket: Socket) {
    socket.on("request-call", (data: CallRequest) =>
      CallController.request(data, socket)
    );
    socket.on("accept-call", (data: OutGoingCall) =>
      CallController.accept(data, socket)
    );
    socket.on("decline-call", (data: CallRequest) =>
      CallController.decline(data, socket)
    );
  }

  public static async request(data: CallRequest, socket: Socket) {
    loggerSocketRequest(socket.id, "/ws/request-call", "call");

    // Find the remote user from the connected users list in the database
    const remoteUser = await UserDatabase.get(data.remoteUser?.username);
    if (!remoteUser)
      return socket.emit(
        "call-not-found",
        `Couldn't connect to ${data.remoteUser.name}`,
        data
      );

    // Emit the incoming call to the remote user
    switch (data.type) {
      case "video":
        // find the remote user socket
        const remoteUserSocket = CallController.io.sockets.sockets.get(
          remoteUser.socketId
        );
        if (remoteUserSocket) {
          remoteUserSocket.emit("incoming-call", data);
          return;
        }
        // If the remote user socket is not found
        socket.emit(
          "call-not-found",
          ` Connection for ${data.remoteUser.name} not found`,
          data
        );
        break;

      default:
        break;
    }
  }

  // User receives the emitted incoming-call event
  public static async accept(data: OutGoingCall, socket: Socket) {
    loggerSocketRequest(socket.id, "/ws/accept-call", "call");

    // find the remote user
    const remoteUser = await UserDatabase.get(data.remoteUser?.username);
    if (!remoteUser)
      return socket.emit("call-not-found", "Other user is not online", data);

    // find the local user
    const caller = await UserDatabase.get(data.caller.username);
    if (!caller)
      return socket.emit(
        "call-not-found",
        `Could not ${data.caller.name} online`,
        data
      );

    // find the local user socket
    const callerSocket = CallController.io.sockets.sockets.get(caller.socketId);
    if (!callerSocket)
      return socket.emit("call-not-found", "Other user is not online", data);

    data["initiator"] = "local";
    callerSocket.emit("accepted-call", data);
  }
  // User receives the emitted incoming-call event
  public static async decline(data: CallRequest, socket: Socket) {
    loggerSocketRequest(socket.id, "/ws/decline-call", "call");

    // find the local user
    const caller = await UserDatabase.get(data.caller.username);
    if (!caller) return socket.emit("call-not-connected", data);

    // find the local user socket
    const callerSocket = CallController.io.sockets.sockets.get(caller.socketId);

    if (callerSocket) {
      socket.emit("call-not-found", `User Busy! try again later`, data);
      callerSocket.emit("declined-call", data);
    }
  }
}
