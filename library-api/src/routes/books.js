import { Router } from 'express';
import { query, queryOne } from '../db.js';

const router = Router();

/**
 * A Router is a mini Express app. Because app.js mounts it with
 *
 *     app.use('/api/books', booksRouter)
 *
 * every path in here is relative to /api/books. So router.get('/') answers
 * GET /api/books, and router.get('/:id') answers GET /api/books/42.
 */

const PAGE_SIZE = 12;

/* ===========================================================================
 *  GET /api/books      —  the catalogue, filtered and paged
 * ===========================================================================
 *
 * The pattern below is worth learning properly, because every list endpoint in
 * this project uses it: build the WHERE and HAVING pieces in arrays, push each
 * value onto `params` in the same order, then glue it together at the end.
 */
router.get('/', async (req, res, next) => {
  try {
    const { search, category, availability } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const where = [];
    const having = [];
    const params = [];

    // Filters that look at columns on `books` go in WHERE.
    if (search) {
      // One term, four columns, so the value is pushed four times -- MySQL's
      // ? does not repeat the way PostgreSQL's $1 does.
      const term = `%${search}%`;
      where.push('(b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? OR b.dewey LIKE ?)');
      params.push(term, term, term, term);
    }

    if (category) {
      where.push('b.category = ?');
      params.push(category);
    }

    // `availability` looks at a COUNT, which does not exist until the rows
    // have been grouped -- so it belongs in HAVING, not WHERE.
    if (availability === 'available') having.push('availableCopies > 0');
    if (availability === 'out') having.push('availableCopies = 0');

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const havingSql = having.length ? `HAVING ${having.join(' AND ')}` : '';

    const items = await query(
      `SELECT
         b.id, b.isbn, b.title, b.author, b.publisher, b.year,
         b.dewey, b.category, b.shelf,
         b.added_at AS addedAt,
         COUNT(c.id) AS totalCopies,
         COUNT(CASE WHEN c.status = 'available' THEN 1 END) AS availableCopies
       FROM books b
       LEFT JOIN copies c ON c.book_id = b.id
       ${whereSql}
       GROUP BY b.id
       ${havingSql}
       ORDER BY b.title
       LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
      params
    );

    /**
     * `total` has to be the number of books MATCHING THE FILTERS -- not the 26
     * in the table, and not the 12 on this page -- otherwise the pager shows
     * the wrong number of pages.
     *
     * Because HAVING filters a grouped result, counting means grouping first
     * and then counting the groups. That is what the subquery does: the inner
     * query produces one row per matching book, the outer one counts them.
     */
    const totalRow = await queryOne(
      `SELECT COUNT(*) AS total FROM (
         SELECT b.id,
                COUNT(CASE WHEN c.status = 'available' THEN 1 END) AS availableCopies
         FROM books b
         LEFT JOIN copies c ON c.book_id = b.id
         ${whereSql}
         GROUP BY b.id
         ${havingSql}
       ) AS matched`,
      params
    );

    res.json({ items, total: totalRow.total, page, pageSize: PAGE_SIZE });
  } catch (err) {
    next(err);
  }
});

/* ===========================================================================
 *  GET /api/books/:id  —  one book, with its physical copies
 * ===========================================================================
 *
 * Two queries rather than one. Joining copies onto the book would repeat every
 * book column once per copy, and you would have to stitch the rows back
 * together in JavaScript anyway. Fetching the book, then its copies, is
 * clearer and no slower at this size.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    // The path is a string, so anything could arrive here. Reject nonsense
    // before it reaches the database.
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'The book id must be a whole number.' });
    }

    const book = await queryOne(
      `SELECT
         b.id, b.isbn, b.title, b.author, b.publisher, b.year,
         b.dewey, b.category, b.shelf, b.description,
         b.added_at AS addedAt,
         COUNT(c.id) AS totalCopies,
         COUNT(CASE WHEN c.status = 'available' THEN 1 END) AS availableCopies
       FROM books b
       LEFT JOIN copies c ON c.book_id = b.id
       WHERE b.id = ?
       GROUP BY b.id`,
      [id]
    );

    // "Not found" is a 404, not an empty 200. The client has to be able to
    // tell "no such book" from "a book with no data".
    if (!book) {
      return res.status(404).json({ error: 'No book with that id.' });
    }

    /**
     * Each copy carries its current loan, if it has one. The join onto loans
     * uses `l.returned_at IS NULL`, so only an OPEN loan matches -- a copy
     * borrowed twenty times still has at most one open loan.
     */
    const copies = await query(
      `SELECT
         c.id, c.barcode, c.status, c.\`condition\`,
         c.acquired_at AS acquiredAt,
         l.id        AS loanId,
         l.due_at    AS loanDueAt,
         m.id        AS memberId,
         m.name      AS memberName,
         m.member_no AS memberNo
       FROM copies c
       LEFT JOIN loans l   ON l.copy_id = c.id AND l.returned_at IS NULL
       LEFT JOIN members m ON m.id = l.member_id
       WHERE c.book_id = ?
       ORDER BY c.barcode`,
      [id]
    );

    /**
     * SQL gives back flat rows; the frontend wants the loan nested inside the
     * copy. Reshaping in JavaScript is the normal way to bridge that gap.
     */
    book.copies = copies.map((c) => ({
      id: c.id,
      barcode: c.barcode,
      status: c.status,
      condition: c.condition,
      acquiredAt: c.acquiredAt,
      currentLoan: c.loanId
        ? {
            id: c.loanId,
            dueAt: c.loanDueAt,
            status: new Date(c.loanDueAt) < new Date() ? 'overdue' : 'active',
            member: { id: c.memberId, name: c.memberName, memberNo: c.memberNo },
          }
        : null,
    }));

    res.json(book);
  } catch (err) {
    next(err);
  }
});

export default router;