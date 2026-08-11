import { Router } from 'express';
import { query } from '../db.js';
import { shapeFine } from '../shape.js';

const router = Router();

/* ===========================================================================
 *  GET /api/fines   —  charges raised on late returns
 * ===========================================================================
 *
 * No pagination here: the contract says a plain array. A library rarely has
 * enough unpaid fines for paging to matter, and the page shows a running total
 * across all of them.
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, search } = req.query;

    const where = [];
    const params = [];

    if (status) {
      where.push('f.status = ?');
      params.push(status);
    }

    if (search) {
      const term = `%${search}%`;
      where.push('(m.name LIKE ? OR m.member_no LIKE ? OR b.title LIKE ?)');
      params.push(term, term, term);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await query(
      `SELECT
         f.id, f.amount,
         f.days_late     AS daysLate,
         f.reason, f.status,
         f.created_at    AS createdAt,
         f.paid_at       AS paidAt,
         f.loan_id       AS loanId,
         f.waived_reason AS waivedReason,
         b.id    AS bookId,
         b.title AS bookTitle,
         m.id        AS memberId,
         m.name      AS memberName,
         m.member_no AS memberNo
       FROM fines f
       JOIN members m ON m.id = f.member_id
       JOIN loans l   ON l.id = f.loan_id
       JOIN copies c  ON c.id = l.copy_id
       JOIN books b   ON b.id = c.book_id
       ${whereSql}
       ORDER BY f.created_at DESC`,
      params
    );

    res.json(rows.map(shapeFine));
  } catch (err) {
    next(err);
  }
});

export default router;
