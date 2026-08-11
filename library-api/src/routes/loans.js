import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { LOAN_COLUMNS, LOAN_JOINS, shapeLoan } from '../shape.js';

const router = Router();

const PAGE_SIZE = 15;   // loans list shows more rows than the catalogue

/* ===========================================================================
 *  GET /api/loans   —  every issue and return, newest first
 * ===========================================================================
 *
 * The interesting part is `status`. It is not a column, so it cannot be
 * filtered with `WHERE l.status = ?`. Each status is a different condition on
 * `returned_at` and `due_at`:
 *
 *   returned  ->  it has a return date
 *   overdue   ->  no return date, and the due date has passed
 *   active    ->  no return date, and the due date has not passed
 *
 * Working it out in SQL means the database can use its indexes. Fetching every
 * loan and filtering in JavaScript would mean pulling thousands of rows across
 * the network to throw most of them away.
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const where = [];
    const params = [];

    if (status === 'returned') {
      where.push('l.returned_at IS NOT NULL');
    } else if (status === 'overdue') {
      where.push('l.returned_at IS NULL AND l.due_at < NOW()');
    } else if (status === 'active') {
      where.push('l.returned_at IS NULL AND l.due_at >= NOW()');
    }

    if (search) {
      const term = `%${search}%`;
      where.push('(b.title LIKE ? OR m.name LIKE ? OR m.member_no LIKE ? OR c.barcode LIKE ?)');
      params.push(term, term, term, term);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await query(
      `SELECT ${LOAN_COLUMNS}
       ${LOAN_JOINS}
       ${whereSql}
       ORDER BY l.issued_at DESC
       LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
      params
    );

    // No GROUP BY in this query, so a plain COUNT over the same joins and the
    // same WHERE gives the filtered total.
    const totalRow = await queryOne(
      `SELECT COUNT(*) AS total ${LOAN_JOINS} ${whereSql}`,
      params
    );

    res.json({
      items: rows.map(shapeLoan),
      total: totalRow.total,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
