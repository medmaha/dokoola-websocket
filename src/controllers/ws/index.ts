import { Server } from "socket.io";
import AuthController from "./auth.controller.js";
import CallController from "./call.controller.js";
import RoomController from "./room.controller.js";
import UserDatabase from "../../storage/db.js";
import { InfoLogger } from "../../logger.js";

const logger = InfoLogger("ws_controller.log");
export default class WSController {
  constructor(httpServer: any) {
    const io = new Server(httpServer, {
      cors: {
        origin: "*",
      },
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
      },
    });
    this.initialize(io);
  }

  initialize(io: Server) {
    io.on("connection", (socket) => {
      logger.info("New connection established", { socketId: socket.id });

      AuthController.io = io;
      CallController.io = io;
      RoomController.io = io;

      AuthController.init(socket);
      CallController.init(socket);
      RoomController.init(socket);

      if (socket.recovered) {
        logger.info("Session recovered", {
          socketId: socket.id,
          rooms: Array.from(socket.rooms),
        });
      } else {
        logger.info("New session started", { socketId: socket.id });
      }

      socket.on("disconnect", () => {
        logger.info("User disconnected", {
          socketId: socket.id,
          user: socket.data.user,
        });

        const rooms = Array.from(socket.rooms);
        for (const roomId of rooms) {
          socket.to(roomId).emit("user-disconnected", socket.data.user);
        }

        socket.rooms.clear();
        socket.emit("disconnected");

        if (socket.data?.user?.username) {
          UserDatabase.delete(socket.data.user.username);
          logger.info("User removed from database", {
            username: socket.data.user.username,
          });
        }
      });
    });

    return io;
  }
}
