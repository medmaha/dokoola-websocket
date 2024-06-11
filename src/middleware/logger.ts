import { format } from "date-fns";
import { NextFunction, Request, Response } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  let timer = Date.now();
  res.on("finish", () => {
    const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
    const duration = Date.now() - timer;

    console.log(
      `<${timestamp}> - ${req.method} - ${req.url} - ${res.statusCode} - ${duration}ms`
    );
  });
  next();
}
