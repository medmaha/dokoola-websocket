import "dotenv/config";
import cors from "cors";
import express from "express";
import { format } from "date-fns";
import { ExpressApp, HttpServer } from "./config/index.js";
import { InitializeSocketIOServer } from "./controllers/ws.controllers.js";
var app = ExpressApp;
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.static("dist/public"));
app.use(function (req, res, next) {
    var timer = Date.now();
    res.on("finish", function () {
        var timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
        var duration = Date.now() - timer;
        console.log("<".concat(timestamp, "> - ").concat(req.method, " - ").concat(req.url, " - ").concat(res.statusCode, " - ").concat(duration, "ms"));
    });
    next();
});
app.get("/", function (_, res) {
    res.sendFile("index.html", { root: "dist/public" });
});
app.get("/health", function (_, res) {
    res.status(200).json({ message: "OK" });
});
app.get("/api/health", function (_, res) {
    res.status(200).json({ message: "OK" });
});
var PORT = process.env.PORT || 7500;
var BASE_URL = process.env.BASE_URL || "http://localhost";
HttpServer.listen(PORT, function () {
    console.log("Listening on port ".concat(BASE_URL, ":").concat(PORT));
    InitializeSocketIOServer.initialize(HttpServer);
});
