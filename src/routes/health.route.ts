import express from "express";

const healthRouter = express.Router();

// BASE Path: /health

healthRouter.get("/", (_, res) => {
  res.status(200).json({ message: "Application up and running", status: "OK" });
});

export default healthRouter;
