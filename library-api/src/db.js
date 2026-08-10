import mysql from 'mysql2/promise';
import 'dotenv/config';

/**
 * A pool keeps a small set of open connections and hands them out as needed,
 * instead of opening a new one for every request. Opening a connection is slow;
 * reusing one is not.
 */
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'library',
  waitForConnections: true,
  connectionLimit: 10,

  // DECIMAL columns arrive as strings by default, to avoid losing precision on
  // very large values. Our amounts are small, and the frontend does arithmetic
  // on them, so ask for real numbers instead.
  decimalNumbers: true,
});

/**
 * Runs a query and gives you back just the rows.
 *
 *   const rows = await query('SELECT * FROM books WHERE id = ?', [5]);
 *
 * ALWAYS pass values in the second argument, never build them into the string.
 * This is wrong, and lets anyone read your whole database:
 *
 *   query(`SELECT * FROM books WHERE title = '${userInput}'`)   // NEVER
 *
 * With ? the driver sends the value separately from the SQL, so it can only
 * ever be treated as data. That is what stops SQL injection.
 */
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/** Same, but returns the first row (or null). Handy for "find one" queries. */
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

/**
 * For INSERT. MySQL has no RETURNING clause, so the new id comes back on the
 * result object instead.
 *
 *   const id = await insert('INSERT INTO books (title) VALUES (?)', ['Dune']);
 */
export async function insert(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result.insertId;
}

/** For UPDATE and DELETE — tells you how many rows actually changed. */
export async function execute(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result.affectedRows;
}
