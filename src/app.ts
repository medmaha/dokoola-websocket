import "dotenv/config";
import cors from "cors";
import express from "express";

import { ExpressApp, HttpServer } from "./config/index.js";
import { WSController } from "./controllers/ws/index.js";

import { requestLogger } from "./middleware/logger.js";
import { healthRouter, indexRouter } from "./routes/index.js";

const app = ExpressApp;

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.static("dist/public"));
app.use(requestLogger);

app.use("/", indexRouter);
app.use("/health", healthRouter);

const PORT = process.env.PORT;
const BASE_URL = process.env.BASE_URL!;

HttpServer.listen(PORT, () => {
  console.log(`Listening on port ${BASE_URL}:${PORT}`);
  new WSController(HttpServer);
});
