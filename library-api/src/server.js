import 'dotenv/config';
import { createApp } from './app.js';
import { pool } from './db.js';

const port = process.env.PORT || 4000;
const app = createApp();

// Fail loudly at startup if the database is unreachable, rather than on the
// first request when it is harder to notice.
try {
  await pool.query('SELECT 1');
  console.log('Database connected.');
} catch (err) {
  console.error('Cannot reach the database. Is PostgreSQL running?');
  console.error(err.message);
  process.exit(1);
}

app.listen(port, () => {
  console.log(`Library API listening on http://localhost:${port}`);
});
