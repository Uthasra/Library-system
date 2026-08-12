import 'dotenv/config';
import { createApp } from './app.js';
import { pool } from './db.js';

const port = process.env.PORT || 4000;
const app = createApp();

/**
 * Check the database before opening the port. Failing here is much easier to
 * diagnose than a server that starts happily and then returns 500 on every
 * request because MySQL was never switched on.
 */
try {
  await pool.query('SELECT 1');
  console.log(`Database connected: ${process.env.DB_NAME} on ${process.env.DB_HOST}:${process.env.DB_PORT}`);
} catch (err) {
  console.error('\nCannot reach the database.\n');

  // The driver's error codes say exactly what went wrong, so say it plainly
  // instead of making the reader interpret a stack trace.
  if (err.code === 'ECONNREFUSED') {
    console.error('  Nothing is listening on that port.');
    console.error('  -> Open the XAMPP Control Panel and press Start next to MySQL.');
    console.error(`  -> Check DB_PORT in .env (currently ${process.env.DB_PORT}). XAMPP usually uses 3306.`);
  } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('  MySQL rejected the username or password.');
    console.error('  -> Check DB_USER and DB_PASSWORD in .env. In XAMPP the password is usually empty.');
  } else if (err.code === 'ER_BAD_DB_ERROR') {
    console.error(`  There is no database called "${process.env.DB_NAME}".`);
    console.error('  -> Create it in phpMyAdmin, then run: npm run db:setup');
  } else {
    console.error(`  ${err.message}`);
  }

  console.error('');
  process.exit(1);
}

app.listen(port, () => {
  console.log(`Library API listening on http://localhost:${port}`);
});
