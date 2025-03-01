import { CallSocket, SocketCallData } from "../../types";
import { loggerSocketRequest } from "./utilities/helpers.js";
import UserDatabase from "./utilities/db.js";
import { Server } from "socket.io";

export default class CallController {
  public static io: Server;

  private static async getSocketForId(socketId: string) {
    if (socketId) return;
    const socket = CallController.io.sockets.sockets.get(socketId);
    return socket as CallSocket;
  }

  public static init(socket: CallSocket) {
    try {
      socket.on("request-call", (callData) =>
        CallController.request(callData, socket)
      );
      socket.on("accept-call", (callData) =>
        CallController.accept(callData, socket)
      );
      socket.on("decline-call", (callData) =>
        CallController.decline(callData, socket)
      );
      socket.on("cancel-call", (callData, cancelledBy) =>
        CallController.cancel(callData, cancelledBy, socket)
      );
    } catch (error) {
      console.log(error);
    }
  }

  public static async request(callData: any, socket: CallSocket) {
    loggerSocketRequest(socket.id, "/ws/request-call", "call");

    // Find the remote user from the connected users list in the database
    const remoteUser = await UserDatabase.get(callData.remotePublicId);
    if (!remoteUser)
      return socket.emit(
        "call-not-found",
        `Couldn't connect to remote user`,
        callData
      );

    // find the remote user socket
    const remoteUserSocket = await CallController.getSocketForId(
      remoteUser.socketId
    );
    if (!remoteUserSocket)
      return socket.emit(
        "call-not-found",
        ` Connection to remote user not found`,
        callData
      );

    remoteUserSocket.emit("incoming-call", callData);
    socket.emit("incoming-call-sent");
  }

  // Accept the incoming call
  public static async accept(data: SocketCallData, socket: CallSocket) {
    loggerSocketRequest(socket.id, "/ws/accept-call", "call");

    const caller = await UserDatabase.get(data.callerPublicId);
    if (!caller)
      return socket.emit("call-not-found", "Caller when offline", data);

    // find the caller user's socket
    const callerSocket = await CallController.getSocketForId(caller.socketId);
    if (!callerSocket)
      return socket.emit("call-not-found", "Caller when offline", data);

    callerSocket.emit("call-accepted", data);
    socket.emit("call-accepted-sent");
  }

  // This event is emitted by the remote-user
  public static async decline(data: SocketCallData, socket: CallSocket) {
    loggerSocketRequest(socket.id, "/ws/decline-call", "call");

    const caller = await UserDatabase.get(data.callerPublicId);
    if (!caller)
      return socket.emit("call-not-found", "Caller when offline", data);

    // find the caller user's socket
    const callerSocket = await CallController.getSocketForId(caller.socketId);
    if (!callerSocket)
      return socket.emit("call-not-found", `User Busy! try again later`, data);

    callerSocket.emit("call-declined", data);
    socket.emit("call-declined-sent");
  }

  public static async cancel(
    data: SocketCallData,
    cancelledBy: string,
    socket: CallSocket
  ) {
    loggerSocketRequest(socket.id, "/ws/cancel-call", "call");

    const remoteRejection = cancelledBy.toLowerCase() === "remote";

    const otherUser = await UserDatabase.get(
      remoteRejection ? data.callerPublicId : data.remotePublicId
    );
    if (!otherUser)
      return socket.emit("call-not-found", "Other user is offline", data);

    // find the other user's socket
    const otherSocket = await CallController.getSocketForId(otherUser.socketId);
    if (!otherSocket)
      return socket.emit("call-not-found", `User Busy! try again later`, data);

    // Notify the user that the call has been canceled
    otherSocket.emit("call-cancelled", data);
    socket.emit("call-cancelled-sent");
  }
}
