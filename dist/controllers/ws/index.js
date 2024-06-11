import { Server } from "socket.io";
import AuthController from "./auth.controller.js";
import CallController from "./call.controller.js";
import RoomController from "./room.controller.js";
import { loggerSocketRequest } from "./utilities/helpers.js";
import UserDatabase from "./utilities/db.js";
var WSController = /** @class */ (function () {
    function WSController(httpServer) {
        var io = new Server(httpServer, {
            cors: {
                origin: "*",
            },
            connectionStateRecovery: {
                // the backup duration of the sessions and the packets
                maxDisconnectionDuration: 2 * 60 * 1000,
                // whether to skip middlewares upon successful recovery
                skipMiddlewares: true,
            },
        });
        this.initialize(io);
    }
    WSController.prototype.initialize = function (io) {
        AuthController.io = io;
        CallController.io = io;
        RoomController.io = io;
        io.on("connection", function (socket) {
            AuthController.init(socket);
            CallController.init(socket);
            RoomController.init(socket);
            if (socket.recovered) {
                // recovery was successful: socket.id, socket.rooms and socket.data were restored
                loggerSocketRequest(socket.id, "/ws", "recover");
            }
            else {
                // new or unrecoverable session
                loggerSocketRequest(socket.id, "/ws", "connect");
            }
            socket.on("disconnect", function () {
                var _a, _b;
                loggerSocketRequest(socket.id, "/ws", "disconnect");
                var rooms = Array.from(socket.rooms);
                for (var _i = 0, rooms_1 = rooms; _i < rooms_1.length; _i++) {
                    var roomId = rooms_1[_i];
                    socket.to(roomId).emit("user-disconnected", socket.data.user);
                }
                // Clear the socket rooms
                socket.rooms.clear();
                socket.emit("disconnected");
                // remove the user from the database
                UserDatabase.delete((_b = (_a = socket.data) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.username);
            });
        });
        return io;
    };
    return WSController;
}());
export { WSController };
