import "dotenv/config";
import cors from "cors";
import express from "express";

import { ExpressApp, HttpServer } from "./config/index.js";
import { WSController } from "./controllers/ws/index.js";

import { requestLogger } from "./middleware/logger.js";
import { healthRouter, indexRouter } from "./routes/index.js";

const app = ExpressApp;

const allowedHosts = () => {
  return "*";
  const hosts =
    process.env.ALLOWED_ORIGINS?.split(",").map((host) => {
      return host.trim();
    }) || [];

  const copy = hosts.slice();
  for (const host of copy) {
    hosts.push(host.replace(/http:/gi, "ws:").replace(/https:/gi, "wss:"));
  }
  return hosts;
};

app.use(
  cors({
    // origin: [
    //   "http://localhost:3000",
    //   "http://127.0.0.1:3000",
    //   "https://129.151.181.32",
    //   "http://129.151.181.32",
    // ],
    origin: "*",
  })
);

app.use(express.json());
app.use(express.static("dist/public"));
app.use(requestLogger);

app.use("/", indexRouter);
app.use("/health", healthRouter);

const PORT = process.env.PORT;

HttpServer.listen(PORT, () => {
  console.log(`Listening on port 0.0.0.0:${PORT}`);
  new WSController(HttpServer);
});
