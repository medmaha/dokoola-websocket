import express from "express";

const indexRouter = express.Router();

// BASE Path: /health

indexRouter.get("/", (_, res) => {
  res
    .status(200)
    .json({
      message: "OK",
      data: "msedge --unsafely-treat-insecure-origin-as-secure=http://your-insecure-domain.com --user-data-dir=/tmp/temporary-edge-profile",
    });
});

export default indexRouter;
