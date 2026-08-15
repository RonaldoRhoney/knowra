import "dotenv/config";
import cors from "cors";
import express from "express";
import { askRouter } from "./api/ask.js";
import { desafiosRouter } from "./api/desafios.js";

export const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "knowra-backend" });
});

app.use("/api", askRouter);
app.use("/api", desafiosRouter);
