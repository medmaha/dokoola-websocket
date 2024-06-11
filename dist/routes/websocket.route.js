import express from "express";
var wsRouter = express.Router();
// BASE Path: /health
wsRouter.get("*", function (_, res) {
    //   res.status(200).json({ message: "OK" });
});
export default wsRouter;
