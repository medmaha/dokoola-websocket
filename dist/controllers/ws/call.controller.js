import { loggerSocketRequest } from "./utilities/helpers.js";
import UserDatabase from "./utilities/db.js";
var CallController = /** @class */ (function () {
    function CallController() {
    }
    CallController.init = function (socket) {
        socket.on("request-call", function (data) {
            return CallController.request(data, socket);
        });
        socket.on("accept-call", function (data) {
            return CallController.accept(data, socket);
        });
        socket.on("call-received", function (data) {
            return CallController.accept(data, socket);
        });
    };
    CallController.request = function (data, socket) {
        var _a;
        loggerSocketRequest(socket.id, "/ws/request-call", "call");
        // Find the remote user from the connected users list in the database
        var remoteUser = UserDatabase.get((_a = data.remoteUser) === null || _a === void 0 ? void 0 : _a.username);
        if (!remoteUser)
            return socket.emit("call-not-found", "Couldn't connect to ".concat(data.remoteUser.name), data);
        // Emit the incoming call to the remote user
        switch (data.type) {
            case "video":
                // find the remote user socket
                var remoteUserSocket = CallController.io.sockets.sockets.get(remoteUser.socketId);
                if (remoteUserSocket) {
                    remoteUserSocket.emit("incoming-call", data);
                    return;
                }
                // If the remote user socket is not found
                socket.emit("call-not-found", " Connection for ".concat(data.remoteUser.name, " not found"), data);
                break;
            default:
                break;
        }
    };
    // User receives the emitted incoming-call event
    CallController.accept = function (data, socket) {
        var _a, _b;
        loggerSocketRequest(socket.id, "/ws/call-received", "call");
        // find the remote user
        var remoteUser = UserDatabase.get((_a = data.remoteUser) === null || _a === void 0 ? void 0 : _a.username);
        if (!remoteUser)
            return socket.emit("call-not-connected", data);
        // find the local user
        var localUser = UserDatabase.get((_b = data.localUser) === null || _b === void 0 ? void 0 : _b.username);
        if (!localUser)
            return socket.emit("call-not-connected", data);
        // find the local user socket
        var localUserSocket = CallController.io.sockets.sockets.get(localUser.socketId);
        if (!localUserSocket)
            return socket.emit("call-not-connected", data);
        // Emit the call to the local user with the event-data
        // Let the initiate a pair of peer connections
        data["initiator"] = "local";
        // data["localUser"] = localUser;
        // data["remoteUser"] = remoteUser;
        localUserSocket.emit("make-peer-call", data);
    };
    return CallController;
}());
export default CallController;
