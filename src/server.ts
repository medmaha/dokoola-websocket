import { config } from "dotenv";
import cors from "cors";
import express, { Request, Response, NextFunction } from "express";

import { ExpressApp, HttpServer } from "./config/index.js";
import { WSController } from "./controllers/index.js";
import { healthRouter, indexRouter } from "./routes/index.js";
import { DebugLogger } from "./logger.js";
import { format } from "date-fns";

const app = ExpressApp;

config()

const logger = DebugLogger("server.log");

const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const middleware = (req: Request, res: Response, next: NextFunction) => {
    const timer = Date.now();
    res.on("finish", () => {
      const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      const duration = Date.now() - timer;
      logger.debug({
        method: req.method,
        url: req.url,
        ip: req.ip,
        timestamp,
        duration,
        status: res.statusCode,
      });
    });
    next();
  };
  return middleware(req, res, next);
};

// const allowedHosts = () => {
//   if (!process.env.ALLOWED_ORIGINS) return "*";

//   const hosts = process.env.ALLOWED_ORIGINS.split(",").map(host => host.trim());
//   return [...hosts, ...hosts.map(host => host.replace(/^http:/, "ws:").replace(/^https:/, "wss:"))];
// };

app.use(
  cors({
    origin: "*",
    // origin: allowedHosts(),
  })
);

app.use(express.json());
app.use(requestLogger);

app.use("/", indexRouter);
app.use("/health", healthRouter);

const PORT = process.env.PORT || 5500;

HttpServer.listen(PORT, () => {
  logger.debug(`Server is running on port ${PORT}`);
  new WSController(HttpServer);
});
