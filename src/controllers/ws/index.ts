import { Server } from "socket.io";
import AuthController from "./auth.controller.js";
import CallController from "./call.controller.js";
import RoomController from "./room.controller.js";
import { loggerSocketRequest } from "./utilities/helpers.js";
import UserDatabase from "./utilities/db.js";

export class WSController {
  constructor(httpServer: any) {
    const io = new Server(httpServer, {
      cors: {
        origin: "*",
      },
      connectionStateRecovery: {
        // the backup duration of the sessions and the packets
        maxDisconnectionDuration: 2 * 60 * 1000,
        // We skip the middlewares upon successful recovery
        skipMiddlewares: true,
      },
    });
    this.initialize(io);
  }

  initialize(io: Server) {
    io.on("connection", (socket) => {
      AuthController.io = io;
      CallController.io = io;
      RoomController.io = io;

      AuthController.init(socket);
      CallController.init(socket);
      RoomController.init(socket);

      if (socket.recovered) {
        // recovery was successful: socket.id, socket.rooms and socket.data were restored
        loggerSocketRequest(socket.id, "/ws", "recover");
      } else {
        // new or unrecoverable session
        loggerSocketRequest(socket.id, "/ws", "connect");
      }

      socket.on("disconnect", () => {
        loggerSocketRequest(socket.id, "/ws", "disconnect");

        const rooms = Array.from(socket.rooms);

        for (const roomId of rooms) {
          socket.to(roomId).emit("user-disconnected", socket.data.user);
        }

        // Clear the socket rooms
        socket.rooms.clear();
        socket.emit("disconnected");

        // remove the user from the database
        UserDatabase.delete(socket.data?.user?.username);
      });
    });

    return io;
  }
}
