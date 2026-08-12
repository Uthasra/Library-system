import { Router } from 'express';
import { execute, insert, query, queryOne, transaction } from '../db.js';
import { HttpError, check, clean, isbnRule, readId, required, yearRule } from '../validate.js';

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

/**
 * One book with its copy counts. Written once because create, update and the
 * detail endpoint all have to return exactly the same shape -- if they drifted
 * apart, the form would show different numbers after saving than before.
 */
const BOOK_BY_ID = `
  SELECT
    b.id, b.isbn, b.title, b.author, b.publisher, b.year,
    b.dewey, b.category, b.shelf, b.description,
    b.added_at AS addedAt,
    COUNT(c.id) AS totalCopies,
    COUNT(CASE WHEN c.status = 'available' THEN 1 END) AS availableCopies
  FROM books b
  LEFT JOIN copies c ON c.book_id = b.id
  WHERE b.id = ?
  GROUP BY b.id
`;

/** Rejects the request unless title, author, ISBN and year all pass. */
function validateBook(body) {
  check({
    title: required(body.title, 'Title'),
    author: required(body.author, 'Author'),
    isbn: isbnRule(body.isbn),
    year: yearRule(body.year),
  });
}

/** Next free barcode, e.g. C00042. Kept inside the transaction so two
 *  simultaneous inserts cannot pick the same number. */
async function nextBarcode(tx) {
  const row = await tx.queryOne(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(barcode, 2) AS UNSIGNED)), 0) + 1 AS next
     FROM copies WHERE barcode REGEXP '^C[0-9]+$'`
  );
  return `C${String(row.next).padStart(5, '0')}`;
}

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
         l.id          AS loanId,
         l.due_at      AS loanDueAt,
         m.id          AS memberId,
         m.name        AS memberName,
         m.member_no   AS memberNo
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

/* ===========================================================================
 *  POST /api/books     —  catalogue a new title
 * ===========================================================================
 *
 * Two rows have to be written: the book, and its first physical copy. A title
 * with no copy sits in the catalogue looking normal but cannot be borrowed --
 * so both inserts go in one transaction. Either both land or neither does.
 */
router.post('/', async (req, res, next) => {
  try {
    validateBook(req.body);

    const book = await transaction(async (tx) => {
      const bookId = await tx.insert(
        `INSERT INTO books (isbn, title, author, publisher, year, dewey, category, shelf, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clean(req.body.isbn),
          clean(req.body.title),
          clean(req.body.author),
          clean(req.body.publisher),
          req.body.year ? Number(req.body.year) : null,
          clean(req.body.dewey),
          clean(req.body.category),
          clean(req.body.shelf),
          clean(req.body.description),
        ]
      );

      await tx.insert(
        'INSERT INTO copies (book_id, barcode, `condition`) VALUES (?, ?, ?)',
        [bookId, await nextBarcode(tx), 'good']
      );

      return tx.queryOne(BOOK_BY_ID, [bookId]);
    });

    // 201 means "created", and it is what tells the frontend to navigate to
    // the new book rather than just showing a success message.
    res.status(201).json(book);
  } catch (err) {
    next(err);
  }
});

/* ===========================================================================
 *  PUT /api/books/:id  —  edit a title
 * ===========================================================================
 *
 * No transaction: this is a single UPDATE. Copies are untouched -- correcting
 * a typo in the author should not disturb the physical stock.
 */
router.put('/:id', async (req, res, next) => {
  try {
    const id = readId(req.params.id, 'book');
    validateBook(req.body);

    const changed = await execute(
      `UPDATE books
       SET isbn = ?, title = ?, author = ?, publisher = ?, year = ?,
           dewey = ?, category = ?, shelf = ?, description = ?
       WHERE id = ?`,
      [
        clean(req.body.isbn),
        clean(req.body.title),
        clean(req.body.author),
        clean(req.body.publisher),
        req.body.year ? Number(req.body.year) : null,
        clean(req.body.dewey),
        clean(req.body.category),
        clean(req.body.shelf),
        clean(req.body.description),
        id,
      ]
    );

    /**
     * affectedRows is 0 both when the id does not exist AND when the values
     * submitted are identical to what is already stored. Checking the row
     * exists separately keeps a no-op save from looking like a 404.
     */
    if (changed === 0) {
      const exists = await queryOne('SELECT id FROM books WHERE id = ?', [id]);
      if (!exists) throw new HttpError(404, 'No book with that id.');
    }

    res.json(await queryOne(BOOK_BY_ID, [id]));
  } catch (err) {
    next(err);
  }
});

/* ===========================================================================
 *  DELETE /api/books/:id  —  remove a title
 * ===========================================================================
 *
 * Refused while any copy is on loan. Deleting would cascade the copies away
 * and leave loan rows pointing at nothing, so the borrower's record would
 * silently lose the book they are holding.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const id = readId(req.params.id, 'book');

    const book = await queryOne('SELECT id, title FROM books WHERE id = ?', [id]);
    if (!book) throw new HttpError(404, 'No book with that id.');

    const out = await queryOne(
      `SELECT COUNT(*) AS n
       FROM copies WHERE book_id = ? AND status = 'on_loan'`,
      [id]
    );

    // 409 Conflict: the request is well formed, but the current state of the
    // data forbids it. Saying how many are out tells the librarian what to do.
    if (out.n > 0) {
      throw new HttpError(
        409,
        `${out.n} ${out.n === 1 ? 'copy is' : 'copies are'} still on loan. Every copy has to come back before this title can be removed.`
      );
    }

    // `copies` has ON DELETE CASCADE, so the copies go with the book.
    await execute('DELETE FROM books WHERE id = ?', [id]);

    // 204 No Content: it worked, and there is nothing to send back.
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/* ===========================================================================
 *  POST /api/books/:id/copies  —  add another physical copy
 * ========================================================================= */
router.post('/:id/copies', async (req, res, next) => {
  try {
    const id = readId(req.params.id, 'book');

    const book = await queryOne('SELECT id FROM books WHERE id = ?', [id]);
    if (!book) throw new HttpError(404, 'No book with that id.');

    const copy = await transaction(async (tx) => {
      // A blank barcode means "assign the next one" -- the common case when a
      // librarian is adding a copy that has not been labelled yet.
      const barcode = clean(req.body.barcode) ?? (await nextBarcode(tx));

      const copyId = await tx.insert(
        'INSERT INTO copies (book_id, barcode, `condition`) VALUES (?, ?, ?)',
        [id, barcode, clean(req.body.condition) ?? 'good']
      );

      return tx.queryOne(
        'SELECT id, barcode, status, `condition`, acquired_at AS acquiredAt FROM copies WHERE id = ?',
        [copyId]
      );
    });

    res.status(201).json(copy);
  } catch (err) {
    next(err);
  }
});

export default router;
