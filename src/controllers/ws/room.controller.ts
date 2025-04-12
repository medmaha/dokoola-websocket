import { Server, Socket } from "socket.io";
import { SocketUser } from "../../types.js";
import { getSocketRoomMembers } from "../../utilities/helpers.js";
import AuthController from "./auth.controller.js";
import { InfoLogger } from "../../logger.js";

const logger = InfoLogger("room_controller.log");

export default class RoomController {
  public static io: Server;

  public static init(socket: Socket) {
    socket.on("join-chat-room", (roomId: string, user: SocketUser) =>
      RoomController.join(roomId, user, socket)
    );
    socket.on("leave-chat-room", (roomId: string, user: SocketUser) =>
      RoomController.leave(roomId, user, socket)
    );
    socket.on("new-message", (roomId: string, data: any) =>
      RoomController.chat(roomId, data, socket)
    );
  }

  public static join(roomId: string, user: SocketUser, socket: Socket) {
    logger.info("User joining chat room", {
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
      RoomController.io.to(roomId).emit("chat-room-members", roomMembers);
    }

    if (!socket.rooms.has(roomId)) {
      socket.join(roomId);
      socket.emit("joined-chat-room", roomId);
      socket.broadcast.to(roomId).emit("joined-chat-group", user);
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
  }

  public static chat(roomId: string, data: any, socket: Socket) {
    logger.info("User sending chat message", {
      roomId,
      socketId: socket.id,
      message: JSON.stringify(data),
    });
    if (!socket.rooms.has(roomId)) {
      socket.join(roomId);
      socket.emit("joined-chat-room", roomId);
    }

    // get all sockets from this room
    const sockets = Array.from(RoomController.io.sockets.adapter.rooms.get(roomId) ?? []);

    console.log("S=====================================================================================")
    console.log(sockets)
    console.log("S=====================================================================================")

    socket.emit("new-message-sent", data);
    socket.to(roomId).emit("new-message", data);
  }
}
