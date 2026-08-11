import { Router } from 'express';
import { query, queryOne } from '../db.js';

const router = Router();

const PAGE_SIZE = 12;

/**
 * Turns a raw loan row into the shape the frontend expects, including the two
 * values that are CALCULATED rather than stored: `status` and `daysLate`.
 *
 * A loan is returned if it has a return date, overdue if its due date has
 * passed, and active otherwise. Storing that in a column would be wrong every
 * night at midnight, when yesterday's due books quietly become overdue.
 */
function shapeLoan(row) {
  const overdue = !row.returnedAt && new Date(row.dueAt) < new Date();
  return {
    id: row.id,
    issuedAt: row.issuedAt,
    dueAt: row.dueAt,
    returnedAt: row.returnedAt,
    renewals: row.renewals,
    barcode: row.barcode,
    status: row.returnedAt ? 'returned' : overdue ? 'overdue' : 'active',
    daysLate: overdue ? Math.floor((Date.now() - new Date(row.dueAt)) / 86400000) : 0,
    book: { id: row.bookId, title: row.bookTitle, author: row.bookAuthor, dewey: row.bookDewey },
    member: { id: row.memberId, name: row.memberName, memberNo: row.memberNo },
  };
}

/* ===========================================================================
 *  GET /api/members     —  everyone registered to borrow
 * ===========================================================================
 *
 * `activeLoans` and `unpaidFines` come from two DIFFERENT tables. The obvious
 * approach -- two LEFT JOINs and a GROUP BY -- produces wrong numbers: a
 * member with 2 loans and 3 fines gets 2 x 3 = 6 rows, so both counts are
 * inflated. That is a row explosion, and it is a classic SQL trap.
 *
 * Correlated subqueries in the SELECT avoid it entirely. Each one runs on its
 * own and returns a single value per member, so nothing multiplies and no
 * GROUP BY is needed.
 */
router.get('/', async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const where = [];
    const params = [];

    if (search) {
      const term = `%${search}%`;
      where.push('(m.name LIKE ? OR m.member_no LIKE ? OR m.email LIKE ? OR m.phone LIKE ?)');
      params.push(term, term, term, term);
    }

    if (status) {
      where.push('m.status = ?');
      params.push(status);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const items = await query(
      `SELECT
         m.id,
         m.member_no       AS memberNo,
         m.name, m.email, m.phone, m.address,
         m.membership_type AS membershipType,
         m.status,
         m.joined_at       AS joinedAt,
         m.expires_at      AS expiresAt,

         (SELECT COUNT(*) FROM loans l
           WHERE l.member_id = m.id AND l.returned_at IS NULL) AS activeLoans,

         -- SUM over no rows gives NULL, not 0. COALESCE turns that into 0, so
         -- the frontend never has to guard against null when formatting money.
         (SELECT COALESCE(SUM(f.amount), 0) FROM fines f
           WHERE f.member_id = m.id AND f.status = 'unpaid') AS unpaidFines

       FROM members m
       ${whereSql}
       ORDER BY m.name
       LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
      params
    );

    // No GROUP BY here, so a plain COUNT over the same WHERE is enough --
    // simpler than the subquery the books endpoint needed.
    const totalRow = await queryOne(
      `SELECT COUNT(*) AS total FROM members m ${whereSql}`,
      params
    );

    res.json({ items, total: totalRow.total, page, pageSize: PAGE_SIZE });
  } catch (err) {
    next(err);
  }
});

/* ===========================================================================
 *  GET /api/members/:id  —  one member, with loans and fines
 * ========================================================================= */
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'The member id must be a whole number.' });
    }

    const member = await queryOne(
      `SELECT
         m.id,
         m.member_no       AS memberNo,
         m.name, m.email, m.phone, m.address,
         m.membership_type AS membershipType,
         m.status,
         m.joined_at       AS joinedAt,
         m.expires_at      AS expiresAt,
         (SELECT COUNT(*) FROM loans l
           WHERE l.member_id = m.id AND l.returned_at IS NULL) AS activeLoans,
         (SELECT COALESCE(SUM(f.amount), 0) FROM fines f
           WHERE f.member_id = m.id AND f.status = 'unpaid') AS unpaidFines
       FROM members m
       WHERE m.id = ?`,
      [id]
    );

    if (!member) {
      return res.status(404).json({ error: 'No member with that id.' });
    }

    // Every loan this member has ever had. Three tables joined because the
    // frontend shows the book title and the barcode alongside each loan.
    const loanRows = await query(
      `SELECT
         l.id,
         l.issued_at   AS issuedAt,
         l.due_at      AS dueAt,
         l.returned_at AS returnedAt,
         l.renewals,
         c.barcode,
         b.id     AS bookId,
         b.title  AS bookTitle,
         b.author AS bookAuthor,
         b.dewey  AS bookDewey,
         m.id        AS memberId,
         m.name      AS memberName,
         m.member_no AS memberNo
       FROM loans l
       JOIN copies c  ON c.id = l.copy_id
       JOIN books b   ON b.id = c.book_id
       JOIN members m ON m.id = l.member_id
       WHERE l.member_id = ?
       ORDER BY l.issued_at DESC`,
      [id]
    );

    const fines = await query(
      `SELECT
         f.id, f.amount,
         f.days_late  AS daysLate,
         f.reason, f.status,
         f.created_at AS createdAt,
         f.paid_at    AS paidAt,
         f.loan_id    AS loanId,
         b.id    AS bookId,
         b.title AS bookTitle
       FROM fines f
       JOIN loans l  ON l.id = f.loan_id
       JOIN copies c ON c.id = l.copy_id
       JOIN books b  ON b.id = c.book_id
       WHERE f.member_id = ?
       ORDER BY f.created_at DESC`,
      [id]
    );

    member.loans = loanRows.map(shapeLoan);
    member.fines = fines.map((f) => ({
      id: f.id,
      amount: f.amount,
      daysLate: f.daysLate,
      reason: f.reason,
      status: f.status,
      createdAt: f.createdAt,
      paidAt: f.paidAt,
      loanId: f.loanId,
      book: { id: f.bookId, title: f.bookTitle },
      member: { id: member.id, name: member.name, memberNo: member.memberNo },
    }));

    res.json(member);
  } catch (err) {
    next(err);
  }
});

export default router;