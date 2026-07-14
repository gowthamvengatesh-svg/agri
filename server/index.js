import cors from 'cors';
import express from 'express';

const app = express();
const port = process.env.PORT || 4100;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'AgriSense AI Rover mock backend' });
});

app.get('/api/live', (_req, res) => {
  res.json({
    NPK: {
      nitrogen: 45 + Math.round(Math.random() * 72),
      phosphorus: 18 + Math.round(Math.random() * 42),
      potassium: 70 + Math.round(Math.random() * 126)
    },
    moisture: 22 + Math.round(Math.random() * 38),
    temperature: 23 + Math.round(Math.random() * 12),
    EC: Number((0.6 + Math.random() * 2).toFixed(2)),
    ph: Number((5.6 + Math.random() * 1.9).toFixed(1)),
    gps: {
      lat: 17.385 + Math.random() * 0.006,
      lng: 78.4867 + Math.random() * 0.006
    },
    time: new Date().toISOString(),
    mode: 'mock'
  });
});

app.post('/api/sync', (req, res) => {
  res.json({
    ok: true,
    received: Array.isArray(req.body?.records) ? req.body.records.length : 0,
    message: 'MongoDB sync placeholder accepted payload.'
  });
});

app.listen(port, () => {
  console.log(`AgriSense mock backend listening on http://localhost:${port}`);
});
