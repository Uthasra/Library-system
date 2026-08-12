import { Router } from 'express';
import { execute, query, queryOne, transaction } from '../db.js';
import { HttpError, check, clean, emailRule, oneOf, readId, required } from '../validate.js';
import { shapeLoan, shapeFine } from '../shape.js';

const router = Router();

const PAGE_SIZE = 12;

const MEMBERSHIP_TYPES = ['standard', 'student', 'senior'];
const STATUSES = ['active', 'suspended', 'expired'];

/**
 * One member with the two aggregates. Create, update and the detail endpoint
 * all return this same shape, so the form shows the same numbers after saving
 * that it showed before.
 */
const MEMBER_BY_ID = `
  SELECT
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
  WHERE m.id = ?
`;

function validateMember(body, { isNew }) {
  check({
    name: required(body.name, 'Name'),
    email: emailRule(body.email),
    membershipType: oneOf(body.membershipType, MEMBERSHIP_TYPES, 'Membership type'),
    // Status is chosen by staff on an existing record; a new member is always
    // active, so the field is not accepted on create.
    status: isNew ? null : oneOf(body.status, STATUSES, 'Status'),
  });
}

/**
 * The next member number, e.g. M-1026.
 *
 * The server assigns this, never the client. A number that has to be unique
 * cannot be trusted to the browser: two people registering at once would both
 * send M-1026 and one insert would fail. Reading MAX inside the transaction
 * keeps the two steps together.
 */
async function nextMemberNo(tx) {
  const row = await tx.queryOne(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(member_no, 3) AS UNSIGNED)), 1000) + 1 AS next
     FROM members WHERE member_no REGEXP '^M-[0-9]+$'`
  );
  return `M-${row.next}`;
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
         f.loan_id       AS loanId,
         f.waived_reason AS waivedReason,
         b.id    AS bookId,
         b.title AS bookTitle,
         m.id        AS memberId,
         m.name      AS memberName,
         m.member_no AS memberNo
       FROM fines f
       JOIN members m ON m.id = f.member_id
       JOIN loans l  ON l.id = f.loan_id
       JOIN copies c ON c.id = l.copy_id
       JOIN books b  ON b.id = c.book_id
       WHERE f.member_id = ?
       ORDER BY f.created_at DESC`,
      [id]
    );

    member.loans = loanRows.map(shapeLoan);
    member.fines = fines.map(shapeFine);

    res.json(member);
  } catch (err) {
    next(err);
  }
});

/* ===========================================================================
 *  POST /api/members     —  register someone new
 * ===========================================================================
 *
 * The client sends name, email, phone, address and membership type. Everything
 * else is decided here: the member number, the joining date, the expiry a year
 * out, and the active status. Those are library policy, not user input.
 */
router.post('/', async (req, res, next) => {
  try {
    validateMember(req.body, { isNew: true });

    const member = await transaction(async (tx) => {
      const memberNo = await nextMemberNo(tx);

      const id = await tx.insert(
        `INSERT INTO members
           (member_no, name, email, phone, address, membership_type, status, joined_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR))`,
        [
          memberNo,
          clean(req.body.name),
          clean(req.body.email),
          clean(req.body.phone),
          clean(req.body.address),
          clean(req.body.membershipType) ?? 'standard',
        ]
      );

      return tx.queryOne(MEMBER_BY_ID, [id]);
    });

    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
});

/* ===========================================================================
 *  PUT /api/members/:id  —  edit a member
 * ===========================================================================
 *
 * `member_no` and `joined_at` are deliberately not in the UPDATE. A member
 * number appears on a printed card and in every past loan record; letting it
 * change would break the paper trail. Staff CAN change status here, which is
 * how a card gets suspended or reinstated.
 */
router.put('/:id', async (req, res, next) => {
  try {
    const id = readId(req.params.id, 'member');
    validateMember(req.body, { isNew: false });

    const existing = await queryOne('SELECT id FROM members WHERE id = ?', [id]);
    if (!existing) throw new HttpError(404, 'No member with that id.');

    await execute(
      `UPDATE members
       SET name = ?, email = ?, phone = ?, address = ?,
           membership_type = ?, status = ?
       WHERE id = ?`,
      [
        clean(req.body.name),
        clean(req.body.email),
        clean(req.body.phone),
        clean(req.body.address),
        clean(req.body.membershipType) ?? 'standard',
        clean(req.body.status) ?? 'active',
        id,
      ]
    );

    res.json(await queryOne(MEMBER_BY_ID, [id]));
  } catch (err) {
    next(err);
  }
});

export default router;
