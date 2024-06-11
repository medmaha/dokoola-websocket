var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { loggerSocketRequest, UserDatabase } from ".";
var WSAuthController = /** @class */ (function () {
    function WSAuthController() {
    }
    WSAuthController.init = function (socket) {
        socket.on("login", function (user) {
            return WSAuthController.onLogin(user, WSAuthController.io, socket);
        });
        socket.on("logout", function (user) {
            return WSAuthController.onLogout(user, WSAuthController.io, socket);
        });
    };
    // User logging in
    WSAuthController.onLogin = function (user, io, socket) {
        loggerSocketRequest(socket.id, "/ws/login", "auth");
        UserDatabase.set(user.username, __assign(__assign({}, user), { socketId: socket.id }));
        socket.data = { user: user };
        socket.emit("logged-in", user);
    };
    // User logging out
    WSAuthController.onLogout = function (user, io, socket) {
        loggerSocketRequest(socket.id, "/ws/logout", "auth");
        UserDatabase.delete(user.username);
        socket.emit("logged-out", user);
    };
    return WSAuthController;
}());
export default WSAuthController;
