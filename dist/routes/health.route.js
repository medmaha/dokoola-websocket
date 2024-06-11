import express from "express";
var healthRouter = express.Router();
// BASE Path: /health
healthRouter.get("/", function (_, res) {
    res.status(200).json({ message: "Application up and running", status: "OK" });
});
export default healthRouter;
