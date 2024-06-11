import express from "express";
var indexRouter = express.Router();
// BASE Path: /health
indexRouter.get("/", function (_, res) {
    res.status(200).json({ message: "OK" });
});
export default indexRouter;
