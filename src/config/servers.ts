import "dotenv/config";
import express from "express";
import { createServer } from "http";

const app = express();

export const ExpressApp = app;

export const HttpServer = createServer(app);
