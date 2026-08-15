import "dotenv/config";
import cors from "cors";
import express from "express";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "knowra-backend" });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`KnowRa backend rodando em http://localhost:${port}`);
});
