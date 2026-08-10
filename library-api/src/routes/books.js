import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

/**
 * A Router is a mini Express app. Because app.js mounts it with
 *
 *     app.use('/api/books', booksRouter)
 *
 * every path in here is relative to /api/books. So router.get('/') below
 * answers GET /api/books, and router.get('/:id') would answer
 * GET /api/books/42.
 */

/* ===========================================================================
 *  YOUR TASK — Endpoint 1 of 22:  GET /api/books
 * ===========================================================================
 *
 * Return the catalogue, in this exact shape:
 *
 *   {
 *     "items": [ { id, isbn, title, author, publisher, year, dewey,
 *                  category, shelf, totalCopies, availableCopies } ],
 *     "total": 26,
 *     "page": 1,
 *     "pageSize": 12
 *   }
 *
 * Build it in three passes. Get each one working before starting the next.
 *
 * ---------------------------------------------------------------------------
 * PASS 1 — return every book, no counts, no filters
 * ---------------------------------------------------------------------------
 * Write a SELECT over `books`, and send it back as { items, total, page,
 * pageSize }. Hard-code page 1 and pageSize 12 for now.
 *
 * Careful: the database column is `added_at`, but the frontend expects
 * `addedAt`. Rename columns in SQL with AS:
 *
 *     SELECT added_at AS addedAt FROM books
 *
 * MySQL keeps the capitals in an alias, so no quoting is needed. (In
 * PostgreSQL you would have to write "addedAt" in double quotes.)
 *
 * ---------------------------------------------------------------------------
 * PASS 2 — add totalCopies and availableCopies
 * ---------------------------------------------------------------------------
 * These are not columns on `books`. They are counted from `copies`.
 *
 * You need a LEFT JOIN onto copies, then GROUP BY b.id. Two hints:
 *
 *   - COUNT(c.id) counts the copies. Use COUNT(c.id), not COUNT(*), or a book
 *     with no copies will come back as 1 instead of 0.
 *   - To count only the available ones, use a conditional count:
 *
 *         COUNT(CASE WHEN c.status = 'available' THEN 1 END)
 *
 *     COUNT ignores NULLs, so rows that fail the condition are not counted.
 *     (PostgreSQL has a neater FILTER clause for this; MySQL does not.)
 *
 * ---------------------------------------------------------------------------
 * PASS 3 — filters and paging
 * ---------------------------------------------------------------------------
 * Read from req.query:
 *
 *   search        matches title, author, isbn or dewey. Use LIKE with %
 *                 around the term. MySQL's default collation is already
 *                 case-insensitive, so LIKE 'clean%' finds "Clean Code".
 *   category      exact match
 *   availability  'available' → availableCopies > 0
 *                 'out'       → availableCopies = 0
 *   page          which page, default 1
 *
 * Two things that catch people out:
 *
 *   1. `total` must be the number of books MATCHING THE FILTERS, not the
 *      number on this page. Otherwise the pager shows the wrong page count.
 *      This usually means a second COUNT query.
 *
 *   2. `availability` filters on an aggregate, so it belongs in HAVING, not
 *      WHERE. WHERE runs before rows are grouped; HAVING runs after.
 *
 * Build the parameter list as you go, in the same order as the ? marks:
 *
 *     const params = [];
 *     const where = [];
 *     if (search) {
 *       params.push(`%${search}%`);
 *       where.push('(b.title LIKE ? OR b.author LIKE ? ...)');
 *     }
 *
 * MySQL uses ? for every value, so ORDER MATTERS: the first ? takes the first
 * item in the array. If a condition needs the search term four times, push it
 * four times.
 *
 * One catch: pool.execute() does not accept ? for LIMIT and OFFSET in some
 * MySQL versions. If you hit that, use pool.query() for this one, or put the
 * numbers straight into the string AFTER checking they are integers:
 *
 *     const limit = 12;
 *     const offset = (Number(page) - 1) * limit;   // never a raw string
 *
 * ---------------------------------------------------------------------------
 * Test it as you go:
 *     curl "http://localhost:4000/api/books"
 *     curl "http://localhost:4000/api/books?search=clean"
 *     curl "http://localhost:4000/api/books?availability=out&page=2"
 * ===========================================================================
 */
router.get('/', async (req, res, next) => {
  try {
    const PAGE_SIZE = 12;
    const page = Math.max(1, Number(req.query.page) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const items = await query(
      `SELECT
         b.id, b.isbn, b.title, b.author, b.publisher, b.year,
         b.dewey, b.category, b.shelf,
         b.added_at AS addedAt,
         COUNT(c.id) AS totalCopies,
         COUNT(CASE WHEN c.status = 'available' THEN 1 END) AS availableCopies
       FROM books b
       LEFT JOIN copies c ON c.book_id = b.id
       GROUP BY b.id
       ORDER BY b.title
       LIMIT ${PAGE_SIZE} OFFSET ${offset}`
    );

    const [{ total }] = await query('SELECT COUNT(*) AS total FROM books');
    
  

    res.json({ items, total, page, pageSize: PAGE_SIZE });
  } catch (err) {
    next(err);
  }
});

export default router;
