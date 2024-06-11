import express from "express";

const indexRouter = express.Router();

// BASE Path: /health

indexRouter.get("/", (_, res) => {
  res.status(200).json({ message: "OK" });
});

export default indexRouter;
