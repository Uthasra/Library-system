/**
 * Shared row-shaping helpers.
 *
 * `shapeLoan` started life inside members.js. Now that loans.js needs the same
 * logic, it lives here instead of being copied. Two copies of a rule means two
 * places to fix when the rule changes -- and one of them always gets missed.
 */

/**
 * `status` and `daysLate` are CALCULATED, never stored. A loan is returned if
 * it has a return date, overdue if its due date has passed, active otherwise.
 * A stored status column would be wrong every night at midnight.
 */
export function shapeLoan(row) {
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

/** The nested shape the fines table and the member page both expect. */
export function shapeFine(row) {
  return {
    id: row.id,
    amount: row.amount,
    daysLate: row.daysLate,
    reason: row.reason,
    status: row.status,
    createdAt: row.createdAt,
    paidAt: row.paidAt,
    loanId: row.loanId,
    waivedReason: row.waivedReason ?? null,
    book: { id: row.bookId, title: row.bookTitle },
    member: { id: row.memberId, name: row.memberName, memberNo: row.memberNo },
  };
}

/**
 * The SELECT list every loan query needs, so the column aliases match what
 * shapeLoan() reads. Written once, used by both routers.
 */
export const LOAN_COLUMNS = `
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
`;

/** The joins that go with LOAN_COLUMNS. */
export const LOAN_JOINS = `
  FROM loans l
  JOIN copies c  ON c.id = l.copy_id
  JOIN books b   ON b.id = c.book_id
  JOIN members m ON m.id = l.member_id
`;