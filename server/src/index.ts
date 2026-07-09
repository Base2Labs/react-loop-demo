import express from "express";

const PORT = 3001;

const app = express();
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});
