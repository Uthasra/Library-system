import { Router } from 'express';
import { execute, queryOne } from '../db.js';
import { check } from '../validate.js';

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
const SETTINGS_SELECT = `
  SELECT
    library_name             AS libraryName,
    loan_period_days         AS loanPeriodDays,
    max_books_per_member     AS maxBooksPerMember,
    max_renewals             AS maxRenewals,
    fine_per_day             AS finePerDay,
    currency,
    fine_threshold_for_block AS fineThresholdForBlock
  FROM settings
  WHERE id = 1
`;

router.get('/', async (_req, res, next) => {
  try {
    const settings = await queryOne(SETTINGS_SELECT);

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

/* ===========================================================================
 *  PUT /api/settings   —  change the library rules
 * ===========================================================================
 *
 * These numbers drive the circulation logic, so a bad value here breaks
 * lending for everyone. A loan period of 0 makes every book overdue the moment
 * it is issued; a negative fine rate pays members to return books late.
 * Hence the bounds below rather than a bare "is it a number" check.
 */

/** A whole number within a range, or a message explaining the range. */
const intInRange = (value, min, max, label) => {
  if (value === undefined || value === null || value === '') return `${label} is required.`;
  const n = Number(value);
  if (!Number.isInteger(n)) return `${label} must be a whole number.`;
  if (n < min || n > max) return `${label} must be between ${min} and ${max}.`;
  return null;
};

/** Money can have decimals, so this one allows them. */
const moneyInRange = (value, min, max, label) => {
  if (value === undefined || value === null || value === '') return `${label} is required.`;
  const n = Number(value);
  if (Number.isNaN(n)) return `${label} must be a number.`;
  if (n < min || n > max) return `${label} must be between ${min} and ${max}.`;
  return null;
};

router.put('/', async (req, res, next) => {
  try {
    const b = req.body;

    check({
      libraryName: String(b.libraryName ?? '').trim() === '' ? 'Library name is required.' : null,
      loanPeriodDays: intInRange(b.loanPeriodDays, 1, 365, 'Loan period'),
      maxBooksPerMember: intInRange(b.maxBooksPerMember, 1, 50, 'Books per member'),
      maxRenewals: intInRange(b.maxRenewals, 0, 10, 'Renewals allowed'),
      finePerDay: moneyInRange(b.finePerDay, 0, 10000, 'Fine per day'),
      fineThresholdForBlock: moneyInRange(b.fineThresholdForBlock, 0, 1000000, 'Borrowing block threshold'),
      currency: String(b.currency ?? '').trim() === '' ? 'Currency is required.' : null,
    });

    // Always row 1 -- the table has a CHECK constraint allowing only that id,
    // so there is exactly one settings row and no way to create a second.
    await execute(
      `UPDATE settings
       SET library_name = ?, loan_period_days = ?, max_books_per_member = ?,
           max_renewals = ?, fine_per_day = ?, currency = ?, fine_threshold_for_block = ?
       WHERE id = 1`,
      [
        String(b.libraryName).trim(),
        Number(b.loanPeriodDays),
        Number(b.maxBooksPerMember),
        Number(b.maxRenewals),
        Number(b.finePerDay),
        String(b.currency).trim(),
        Number(b.fineThresholdForBlock),
      ]
    );

    res.json(await queryOne(SETTINGS_SELECT));
  } catch (err) {
    next(err);
  }
});

export default router;
