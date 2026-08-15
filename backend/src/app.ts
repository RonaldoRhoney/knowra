import "dotenv/config";
import cors from "cors";
import express from "express";
import { askRouter } from "./api/ask.js";
import { assinaturaRouter } from "./api/assinatura.js";
import { desafiosRouter } from "./api/desafios.js";
import { sessaoRouter } from "./api/sessao.js";

export const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "knowra-backend" });
});

app.use("/api", askRouter);
app.use("/api", assinaturaRouter);
app.use("/api", desafiosRouter);
app.use("/api", sessaoRouter);
