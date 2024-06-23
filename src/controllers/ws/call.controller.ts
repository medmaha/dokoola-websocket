import { Server, Socket } from "socket.io";
import { CallRequest, IncomingCall, OutGoingCall } from "../../types";
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
    socket.on("call-received", (data: OutGoingCall) =>
      CallController.accept(data, socket)
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
    loggerSocketRequest(socket.id, "/ws/call-received", "call");

    // find the remote user
    const remoteUser = await UserDatabase.get(data.remoteUser?.username);
    if (!remoteUser) return socket.emit("call-not-connected", data);

    // find the local user
    const localUser = await UserDatabase.get(data.localUser?.username);
    if (!localUser) return socket.emit("call-not-connected", data);

    // find the local user socket
    const localUserSocket = CallController.io.sockets.sockets.get(
      localUser.socketId
    );
    if (!localUserSocket) return socket.emit("call-not-connected", data);

    // Emit the call to the local user with the event-data
    // Let the initiator create a peer2peer connections
    data["initiator"] = "local";
    // data["localUser"] = localUser;
    // data["remoteUser"] = remoteUser;
    localUserSocket.emit("accepted-call", data);
  }
}
