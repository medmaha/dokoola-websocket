import { CallSocket, SocketCallData } from "../../types";
import { loggerSocketRequest } from "./utilities/helpers.js";
import UserDatabase from "./utilities/db.js";
import { Server } from "socket.io";

export default class CallController {
  public static io: Server;

  private static getSocketForUser(userId: string): CallSocket | undefined {
    if (userId) return;
    return CallController.io.sockets.sockets.get(userId);
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
    const remoteUserSocket = CallController.getSocketForUser(
      remoteUser.socketId
    );
    if (remoteUserSocket) {
      remoteUserSocket.emit("incoming-call", callData);
      return;
    }
    // If the remote user socket is not found
    socket.emit(
      "call-not-found",
      ` Connection to remote user not found`,
      callData
    );
  }

  // Accept the incoming call
  public static async accept(data: SocketCallData, socket: CallSocket) {
    loggerSocketRequest(socket.id, "/ws/accept-call", "call");

    // find the caller user's socket
    const callerSocket = CallController.getSocketForUser(data.callerPublicId);

    if (!callerSocket)
      return socket.emit("call-not-found", "You're offline", data);

    callerSocket.emit("call-accepted", data);
    callerSocket.emit("call-accepted-sent");
  }

  // This event emiited by the remote-user
  public static async decline(data: SocketCallData, socket: CallSocket) {
    loggerSocketRequest(socket.id, "/ws/decline-call", "call");

    // find the caller user's socket
    const callerSocket = CallController.getSocketForUser(data.callerPublicId);

    if (!callerSocket)
      return socket.emit("call-not-found", `User Busy! try again later`, data);

    callerSocket.emit("call-declined", data);
    callerSocket.emit("call-declined-sent");
  }

  public static async cancel(
    data: SocketCallData,
    cancelledBy: string,
    socket: CallSocket
  ) {
    loggerSocketRequest(socket.id, "/ws/cancel-call", "call");

    const remoteRejection = cancelledBy.toLowerCase() === "remote";

    // find the other user's socket
    const otherSocket = CallController.getSocketForUser(
      remoteRejection ? data.callerPublicId : data.remotePublicId
    );

    if (!otherSocket)
      return socket.emit("call-not-found", `User Busy! try again later`, data);

    // Notify the user that the call has been canceled
    socket.emit("call-cancelled-sent");
    return otherSocket.emit("call-cancelled", data);
  }
}
