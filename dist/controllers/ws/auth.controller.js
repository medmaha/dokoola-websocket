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
import { loggerSocketRequest } from "./utilities/helpers.js";
import UserDatabase from "./utilities/db.js";
var AuthController = /** @class */ (function () {
    function AuthController() {
    }
    AuthController.init = function (socket) {
        socket.on("login", function (user) {
            return AuthController.login(user, socket);
        });
        socket.on("logout", function (user) {
            return AuthController.logout(user, socket);
        });
    };
    // User logging in
    AuthController.login = function (user, socket) {
        loggerSocketRequest(socket.id, "/ws/login", "auth");
        UserDatabase.set(user.username, __assign(__assign({}, user), { socketId: socket.id }));
        socket.data = { user: user };
        socket.emit("logged-in", user);
    };
    // User logging out
    AuthController.logout = function (user, socket) {
        loggerSocketRequest(socket.id, "/ws/logout", "auth");
        UserDatabase.delete(user.username);
        socket.emit("logged-out", user);
    };
    return AuthController;
}());
export default AuthController;
