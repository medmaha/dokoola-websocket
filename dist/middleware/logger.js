import { format } from "date-fns";
export function requestLogger(req, res, next) {
    var timer = Date.now();
    res.on("finish", function () {
        var timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
        var duration = Date.now() - timer;
        console.log("<".concat(timestamp, "> - ").concat(req.method, " - ").concat(req.url, " - ").concat(res.statusCode, " - ").concat(duration, "ms"));
    });
    next();
}
