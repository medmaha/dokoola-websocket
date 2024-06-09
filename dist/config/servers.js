import "dotenv/config";
import express from "express";
import { createServer } from "http";
var app = express();
export var ExpressApp = app;
export var HttpServer = createServer(app);
