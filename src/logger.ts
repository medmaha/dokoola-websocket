import winston from "winston";
import path from "path";

const getFilePath = (filename: string) => {
  return path.join(".logs", filename);
};

export const InfoLogger = (filename: `${string}.log`) => {
  return winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console(),
      // new winston.transports.File({ filename: getFilePath(filename) }),
    ],
  });
};

export const DebugLogger = (filename: `${string}.log`) => {
  return winston.createLogger({
    level: "debug",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console(),
      // new winston.transports.File({ filename: getFilePath(filename) }),
    ],
  });
};
