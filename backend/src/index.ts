import { app } from "./app.js";

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`KnowRa backend rodando em http://localhost:${port}`);
});
