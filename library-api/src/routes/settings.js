import { Router } from 'express';
import { queryOne } from '../db.js';

const router = Router();

/* ===========================================================================
 *  GET /api/settings   —  the rules the circulation desk works to
 * ===========================================================================
 *
 * One row, id 1. These numbers are read by the issue, return and renew
 * endpoints in stage 4, so they are worth having in place before you get
 * there: the loan period, the borrowing limit and the fine rate all live here
 * rather than being hard-coded in the logic.
 */
router.get('/', async (_req, res, next) => {
  try {
    const settings = await queryOne(
      `SELECT
         library_name             AS libraryName,
         loan_period_days         AS loanPeriodDays,
         max_books_per_member     AS maxBooksPerMember,
         max_renewals             AS maxRenewals,
         fine_per_day             AS finePerDay,
         currency,
         fine_threshold_for_block AS fineThresholdForBlock
       FROM settings
       WHERE id = 1`
    );

    // If the row is missing the database was never seeded properly. Saying so
    // is far more useful than returning null and letting the frontend break.
    if (!settings) {
      return res.status(500).json({
        error: 'Library settings are missing. Run "npm run db:setup" to create them.',
      });
    }

    res.json(settings);
  } catch (err) {
    next(err);
  }
});

export default router;
