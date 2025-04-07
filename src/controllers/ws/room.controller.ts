import { Server, Socket } from "socket.io";
import { SocketUser } from "../../types.js";
import { getSocketRoomMembers } from "../../utilities/helpers.js";
import AuthController from "./auth.controller.js";
import { InfoLogger } from "../../logger.js";

const logger = InfoLogger("room_controller.log");

export default class RoomController {
  public static io: Server;

  public static init(socket: Socket) {
    logger.info(`Initializing socket events for user: ${socket.id}`);
    socket.on("join-room", (data: { roomId: string; user: SocketUser }) =>
      RoomController.join(data.roomId, data.user, socket)
    );
    socket.on("leave-room", (data: { roomId: string; user: SocketUser }) =>
      RoomController.leave(data.roomId, data.user, socket)
    );
    socket.on("new-chat", (data: { roomId: string; data: any }) =>
      RoomController.chat(data.roomId, data.data, socket)
    );
  }

  public static join(roomId: string, user: SocketUser, socket: Socket) {
    logger.info("User joining room", {
      roomId,
      userId: user.public_id,
      socketId: socket.id,
    });
    socket.data.user = user;

    if (user.public_id) {
      AuthController.login(user, socket);
    }

    async function notifyMembers() {
      const roomMembers = await getSocketRoomMembers(roomId, RoomController.io);
      RoomController.io.to(roomId).emit("room-members", roomMembers);
    }

    if (!socket.rooms.has(roomId)) {
      socket.join(roomId);
      socket.emit("joined-room", roomId);
      socket.broadcast.to(roomId).emit("joined-group", user);
      logger.info("User joined room", { roomId, userId: user.public_id });
    }
    notifyMembers();
  }

  public static leave(roomId: string, user: SocketUser, socket: Socket) {
    logger.info("User leaving room", {
      roomId,
      userId: user.public_id,
      socketId: socket.id,
    });
    socket.emit("left-room", roomId);
    socket.to(roomId).emit("left-group", user);
    socket.leave(roomId);
    logger.info("User left room", { roomId, userId: user.public_id });
  }

  public static chat(roomId: string, data: any, socket: Socket) {
    logger.info("User sending chat message", {
      roomId,
      socketId: socket.id,
      message: data,
    });
    socket.emit("new-chat-dispatched", roomId);
    socket.to(roomId).emit("new-chat", data);
  }
}
