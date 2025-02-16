import { Server, Socket } from "socket.io";
import { MediaCallData } from "../../types";
import { loggerSocketRequest } from "./utilities/helpers.js";
import UserDatabase from "./utilities/db.js";

export default class CallController {
  public static io: Server;

  public static init(socket: Socket) {
    try {
      socket.on("request-call", (data: MediaCallData) =>
        CallController.request(data, socket)
      );
      socket.on("accept-call", (data: MediaCallData) =>
        CallController.accept(data, socket)
      );
      socket.on("decline-call", (data: MediaCallData) =>
        CallController.decline(data, socket)
      );
      socket.on(
        "cancel-call",
        (
          localUserPublicId: string,
          remoteUserPublicId: string,
          data: MediaCallData
        ) =>
          CallController.cancel(
            localUserPublicId,
            remoteUserPublicId,
            data,
            socket
          )
      );
    } catch (error) {
      console.log(error);
    }
  }

  public static async request(callData: MediaCallData, socket: Socket) {
    loggerSocketRequest(socket.id, "/ws/request-call", "call");

    // Find the remote user from the connected users list in the database
    const remoteUser = await UserDatabase.get(callData.remoteUser?.public_id);
    if (!remoteUser)
      return socket.emit(
        "call-not-found",
        `Couldn't connect to ${callData.remoteUser.name}`,
        callData
      );

    // Emit the incoming call to the remote user
    switch (callData.type) {
      case "video":
        // find the remote user socket
        const remoteUserSocket = CallController.io.sockets.sockets.get(
          remoteUser.socketId
        );
        if (remoteUserSocket) {
          remoteUserSocket.emit("incoming-call", callData);
          return;
        }
        // If the remote user socket is not found
        socket.emit(
          "call-not-found",
          ` Connection for ${callData.remoteUser.name} not found`,
          callData
        );
        break;

      default:
        break;
    }
  }

  // Accept the incoming call
  public static async accept(data: MediaCallData, socket: Socket) {
    loggerSocketRequest(socket.id, "/ws/accept-call", "call");

    // find the remote user
    const remoteUser = await UserDatabase.get(data.remoteUser?.public_id);
    if (!remoteUser)
      return socket.emit("call-not-found", "Other user is not online", data);

    // find the local user
    const localUser = await UserDatabase.get(data.localUser.public_id);
    if (!localUser)
      return socket.emit(
        "call-not-found",
        `Could not ${data.localUser.name} online`,
        data
      );

    // find the local user's socket
    const localUserSocket = CallController.io.sockets.sockets.get(
      localUser.socketId
    );
    if (!localUserSocket)
      return socket.emit("call-not-found", "Other user is not online", data);

    data["callerId"] = localUser.public_id;
    localUserSocket.emit("accepted-call", data);
  }
  // User receives the emitted incoming-call event
  public static async decline(data: MediaCallData, socket: Socket) {
    loggerSocketRequest(socket.id, "/ws/decline-call", "call");

    // find the local user
    const localUser = await UserDatabase.get(data.localUser.public_id);
    if (!localUser) return socket.emit("call-not-connected", data);

    // find the local user's socket
    const localUserSocket = CallController.io.sockets.sockets.get(
      localUser.socketId
    );

    if (localUserSocket) {
      socket.emit("call-not-found", `User Busy! try again later`, data);
      localUserSocket.emit("declined-call", data);
    }
  }

  public static async cancel(
    localUserPublicId: string,
    remoteUserPublicId: string,
    data: MediaCallData,
    socket: Socket
  ) {
    loggerSocketRequest(socket.id, "/ws/cancel-call", "call");

    // find the user
    const user = await UserDatabase.get(localUserPublicId);
    if (!user) return socket.emit("call-not-connected", data);

    // find the user's socket
    const userSocket = CallController.io.sockets.sockets.get(user.socketId);
    if (!userSocket) return socket.emit("call-not-connected", data);

    // Notify the user that the call has been canceled
    userSocket.emit("canceled-call", data);

    // find the remote user
    const remoteUser = await UserDatabase.get(remoteUserPublicId);
    if (!remoteUser) return socket.emit("call-not-connected", data);

    // find the remote user's socket
    const remoteUserSocket = CallController.io.sockets.sockets.get(
      remoteUser.socketId
    );

    // Notify the remote user that the call has been canceled
    if (remoteUserSocket) remoteUserSocket.emit("call-canceled", data);
  }
}
