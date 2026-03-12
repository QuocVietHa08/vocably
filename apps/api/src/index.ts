import express from 'express';
import cors from 'cors';

const app  = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});

// TODO: add routes
// - POST /api/session   → proxy OpenAI Realtime ephemeral token (move from Next.js route)
// - GET  /api/words     → fetch captured vocabulary
// - POST /api/words     → save a new word

app.listen(PORT, () => {
  console.log(`[api] running on http://localhost:${PORT}`);
});
