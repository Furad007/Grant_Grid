import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// GET /api/people?role=PI|CO_PI|PERSONNEL&q=ha
app.get('/api/people', async (req, res) => {
  try {
    const role = (req.query.role || '').toUpperCase();
    const q    = (req.query.q || '').trim();

    if (!['PI','CO_PI','PERSONNEL'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (!q) {
      const r = await pool.query(
        `SELECT id, name FROM people WHERE role = $1 ORDER BY name ASC LIMIT 25`,
        [role]
      );
      return res.json(r.rows);
    }

    // simple case-insensitive contains search using ILIKE
    const r = await pool.query(
      `SELECT id, name
         FROM people
        WHERE role = $1
          AND name ILIKE '%' || $2 || '%'
        ORDER BY name ASC
        LIMIT 25`,
      [role, q]
    );
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`GrantGrid API running on http://localhost:${port}`));
