import { InfoLogger } from "../../logger.js";
import { CallSocket, SocketCallData } from "../../types";
import UserDatabase from "./utilities/db.js";
import { Server } from "socket.io";

const logger = InfoLogger("call_controller.log");

export default class CallController {
  public static io: Server;

  private static async getSocketForId(socketId: string) {
    if (!socketId) {
      logger.warn("getSocketForId called with an empty socketId");
      return;
    }
    const socket = CallController.io.sockets.sockets.get(socketId);
    logger.info(`Retrieved socket for ID: ${socketId}`);
    return socket as CallSocket;
  }

  public static init(socket: CallSocket) {
    try {
      logger.info(`Initializing socket events for user: ${socket.id}`);
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
      logger.error("Error in CallController.init: ", error);
    }
  }

  public static async request(callData: any, socket: CallSocket) {
    logger.info("Processing request-call", { callData, socketId: socket.id });
    const remoteUser = await UserDatabase.get(callData.remotePublicId);
    if (!remoteUser) {
      logger.warn("Remote user not found", callData);
      return socket.emit(
        "call-not-found",
        "Couldn't connect to remote user",
        callData
      );
    }

    const remoteUserSocket = await CallController.getSocketForId(
      remoteUser.socketId
    );
    if (!remoteUserSocket) {
      logger.warn("Remote user socket not found", callData);
      return socket.emit(
        "call-not-found",
        "Connection to remote user not found",
        callData
      );
    }

    remoteUserSocket.emit("incoming-call", callData);
    socket.emit("incoming-call-sent");
    logger.info("Incoming call event emitted", callData);
  }

  public static async accept(callData: SocketCallData, socket: CallSocket) {
    logger.info("Processing accept-call", { callData, socketId: socket.id });
    const caller = await UserDatabase.get(callData.callerPublicId);
    if (!caller) {
      logger.warn("Caller not found", callData);
      return socket.emit("call-not-found", "Caller went offline", callData);
    }

    const callerSocket = await CallController.getSocketForId(caller.socketId);
    if (!callerSocket) {
      logger.warn("Caller socket not found", callData);
      return socket.emit("call-not-found", "Caller went offline", callData);
    }

    callerSocket.emit("call-accepted", callData);
    socket.emit("call-accepted-sent");
    logger.info("Call accepted event emitted", callData);
  }

  public static async decline(callData: SocketCallData, socket: CallSocket) {
    logger.info("Processing decline-call", { callData, socketId: socket.id });
    const caller = await UserDatabase.get(callData.callerPublicId);
    if (!caller) {
      logger.warn("Caller not found", callData);
      return socket.emit("call-not-found", "Caller went offline", callData);
    }

    const callerSocket = await CallController.getSocketForId(caller.socketId);
    if (!callerSocket) {
      logger.warn("Caller socket not found", callData);
      return socket.emit(
        "call-not-found",
        "User Busy! Try again later",
        callData
      );
    }

    callerSocket.emit("call-declined", callData);
    socket.emit("call-declined-sent");
    logger.info("Call declined event emitted", callData);
  }

  public static async cancel(
    callData: SocketCallData,
    cancelledBy: string,
    socket: CallSocket
  ) {
    logger.info("Processing cancel-call", {
      callData,
      cancelledBy,
      socketId: socket.id,
    });
    const remoteRejection = cancelledBy.toLowerCase() === "remote";
    const otherUser = await UserDatabase.get(
      remoteRejection ? callData.callerPublicId : callData.remotePublicId
    );
    if (!otherUser) {
      logger.warn("Other user not found", callData);
      return socket.emit("call-not-found", "Other user is offline", callData);
    }

    const otherSocket = await CallController.getSocketForId(otherUser.socketId);
    if (!otherSocket) {
      logger.warn("Other user's socket not found", callData);
      return socket.emit(
        "call-not-found",
        "User Busy! Try again later",
        callData
      );
    }

    otherSocket.emit("call-cancelled", callData);
    socket.emit("call-cancelled-sent");
    logger.info("Call cancelled event emitted", { callData, cancelledBy });
  }
}
