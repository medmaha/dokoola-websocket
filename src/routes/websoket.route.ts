import express from "express";

const wsRouter = express.Router();

// BASE Path: /health

wsRouter.get("*", (_, res) => {
  //   res.status(200).json({ message: "OK" });
});

export default wsRouter;
