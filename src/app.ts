import "dotenv/config";
import cors from "cors";
import express from "express";
import { format } from "date-fns";

import { ExpressApp, HttpServer } from "./config/index.js";
import { InitializeSocketIOServer } from "./controllers/ws.controllers.js";

const app = ExpressApp;

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.static("dist/public"));

app.use((req, res, next) => {
  let timer = Date.now();
  res.on("finish", () => {
    const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
    const duration = Date.now() - timer;

    console.log(
      `<${timestamp}> - ${req.method} - ${req.url} - ${res.statusCode} - ${duration}ms`
    );
  });
  next();
});

app.get("/", (_, res) => {
  res.sendFile("index.html", { root: "dist/public" });
});

app.get("/health", (_, res) => {
  res.status(200).json({ message: "OK" });
});
app.get("/api/health", (_, res) => {
  res.status(200).json({ message: "OK" });
});

const PORT = process.env.PORT || 7500;
const BASE_URL = process.env.BASE_URL || "http://localhost";

HttpServer.listen(PORT, () => {
  console.log(`Listening on port ${BASE_URL}:${PORT}`);

  InitializeSocketIOServer.initialize(HttpServer);
});
