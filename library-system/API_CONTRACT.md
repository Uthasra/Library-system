# API Contract — your build list

Twenty-two endpoints, ordered from easiest to hardest. Build them in this order: each stage
gives you something you can see working in the browser, and each one uses what you learned in
the one before.

After you finish an endpoint, open `src/lib/mockServer.js` and add it to `LIVE_ENDPOINTS`. The
progress bar in the sidebar counts up, and that screen is now running on your code.

**Conventions used throughout**

- All request and response bodies are JSON.
- Send `Authorization: Bearer <token>` on every endpoint except login.
- Errors return a matching HTTP status and `{ "error": "message a person can act on" }`.
- Validation errors add a `fields` object so the form can mark the bad input:
  `{ "error": "Some details are missing.", "fields": { "isbn": "This is required." } }`
- Dates are ISO 8601 strings in UTC: `2026-08-09T14:30:00.000Z`.
- Money is a plain number. The currency lives in settings, not on each amount.

---

## Stage 1 — Reading data (start here)

Only `SELECT` queries. No authentication logic yet, no validation. The goal is to get data out
of a database and into the browser.

### 1. `GET /api/books`

Query parameters, all optional: `search`, `category`, `availability` (`available` or `out`),
`page`.

```json
{
  "items": [
    {
      "id": 1,
      "isbn": "9780262033848",
      "title": "Introduction to Algorithms",
      "author": "Thomas H. Cormen",
      "publisher": "MIT Press",
      "year": 2009,
      "dewey": "005.1",
      "category": "Computing",
      "shelf": "005-A",
      "totalCopies": 3,
      "availableCopies": 1
    }
  ],
  "total": 26,
  "page": 1,
  "pageSize": 12
}
```

`totalCopies` and `availableCopies` are counted from the `copies` table — they are not columns
on `books`. This is your first `JOIN` with a `COUNT`.

`search` should match title, author, ISBN or call number.

### 2. `GET /api/books/:id`

Same fields as one item above, plus the physical copies:

```json
{
  "id": 1, "title": "Introduction to Algorithms", "...": "...",
  "copies": [
    {
      "id": 4, "barcode": "C00004", "status": "on_loan", "condition": "good",
      "currentLoan": {
        "id": 88, "dueAt": "2026-08-20T00:00:00.000Z", "status": "active",
        "member": { "id": 3, "name": "Nethmi Fernando", "memberNo": "M-1003" }
      }
    }
  ]
}
```

`currentLoan` is `null` when the copy is on the shelf. Return `404` if there is no such book.

### 3. `GET /api/members`

Parameters: `search`, `status`, `page`. Same paginated envelope as books.

```json
{
  "items": [
    {
      "id": 1, "memberNo": "M-1001", "name": "Amara Silva",
      "email": "amara@example.lk", "phone": "070 543 1613",
      "address": "40 Temple Lane, Matara",
      "membershipType": "standard", "status": "active",
      "joinedAt": "2025-11-18T00:00:00.000Z",
      "expiresAt": "2026-12-20T00:00:00.000Z",
      "activeLoans": 2,
      "unpaidFines": 160
    }
  ],
  "total": 25, "page": 1, "pageSize": 12
}
```

`activeLoans` counts loans with no return date. `unpaidFines` sums unpaid fines. Two more
aggregates — same pattern as stage 1.

### 4. `GET /api/members/:id`

The member, plus `loans` (every loan, newest first, each with its `book` and `barcode`),
`fines`, `activeLoans` and `unpaidFines`.

### 5. `GET /api/loans`

Parameters: `status` (`active`, `overdue`, `returned`), `search`, `page`. Page size 15.

```json
{
  "items": [
    {
      "id": 88, "issuedAt": "...", "dueAt": "...", "returnedAt": null,
      "renewals": 0, "status": "overdue", "daysLate": 3, "barcode": "C00004",
      "book": { "id": 1, "title": "Introduction to Algorithms", "author": "...", "dewey": "005.1" },
      "member": { "id": 3, "name": "Nethmi Fernando", "memberNo": "M-1003" }
    }
  ],
  "total": 124, "page": 1, "pageSize": 15
}
```

`status` and `daysLate` are **calculated**, not stored. A loan is `returned` if it has a return
date, `overdue` if the due date has passed, otherwise `active`. Storing a status column here is
a common mistake — it goes stale the moment the clock ticks past midnight.

### 6. `GET /api/fines`

Parameters: `status` (`unpaid`, `paid`, `waived`), `search`. Returns a plain array, no
pagination.

### 7. `GET /api/settings`

```json
{
  "libraryName": "Athenaeum Public Library",
  "loanPeriodDays": 14, "maxBooksPerMember": 5, "maxRenewals": 2,
  "finePerDay": 20, "currency": "LKR", "fineThresholdForBlock": 500
}
```

One row in a `settings` table. Simple, but the circulation logic depends on it, so build it
before stage 4.

---

## Stage 2 — Writing data

Now you need validation and proper status codes.

### 8. `POST /api/books`

Body: `title`, `author`, `isbn`, `publisher`, `year`, `dewey`, `category`, `shelf`,
`description`. Returns `201` with the created book.

Rules: `title`, `author` and `isbn` are required; the ISBN must not already exist (`422` with
`fields.isbn`). Creating a book should also create its first copy, otherwise the title is in the
catalogue but nothing can be borrowed.

### 9. `PUT /api/books/:id` → the updated book, or `404`.

### 10. `DELETE /api/books/:id` → `204`.

Refuse with `409` if any copy is currently on loan, and say how many. Deleting a book while a
member has it would leave a loan pointing at nothing.

### 11. `POST /api/books/:id/copies`

Body: `barcode` (optional), `condition`. Returns `201`. Generate the barcode if none is given;
reject duplicates with `422`.

### 12. `POST /api/members`

Required: `name`, `email`. The email must be unique. **The server assigns `memberNo`** — never
trust the client with an identifier that has to be unique.

### 13. `PUT /api/members/:id` → the updated member. `memberNo` cannot be changed.

### 14. `PUT /api/settings` → the updated settings. Administrators only.

---

## Stage 3 — Authentication

### 15. `POST /api/auth/login`

Body `{ email, password }` → `{ token, user }` where user is `{ id, name, email, role }`.

Store **hashed** passwords, never plain text — bcrypt or argon2. Return `401` for both a wrong
password and an unknown email, with the same message, so the response cannot be used to discover
which emails have accounts.

### 16. `GET /api/auth/me` → the signed-in user, or `401`.

Once these work, add the middleware that rejects requests without a valid token, and require
`role === 'admin'` for `PUT /api/settings`.

---

## Stage 4 — Circulation (the interesting part)

This is where a library system stops being a CRUD app. Take your time here.

### 17. `GET /api/copies/:barcode`

The copy, its book, and its current loan if it has one. Used to look up a book before issuing.

### 18. `POST /api/loans` — issue a book

Body: `{ memberId, barcode }`. Returns `201` with the loan.

Every one of these checks has to pass, and each returns `409` with a message naming the actual
problem:

1. The member exists, and their status is `active`.
2. The copy exists.
3. The copy's status is `available`. If it is already on loan, say who has it.
4. The member is under `maxBooksPerMember`.
5. Their unpaid fines are below `fineThresholdForBlock`.

Then, in **one transaction**: insert the loan with `dueAt = now + loanPeriodDays`, and set the
copy's status to `on_loan`. If either statement fails, neither must apply — otherwise you end up
with a copy marked out and no loan explaining where it went.

**The due date is calculated on the server.** Never accept it from the client, or a member could
give themselves a year.

### 19. `POST /api/loans/return`

Body: `{ barcode }` → `{ loan, fine }`, where `fine` is `null` if it came back on time.

In one transaction: set `returnedAt`, set the copy back to `available`, and if it is late, create
a fine of `daysLate × finePerDay`.

Watch for the case where an overdue loan already has a fine attached — update it rather than
creating a second one.

### 20. `POST /api/loans/:id/renew`

Refuse with `409` if the loan is already returned, if `renewals >= maxRenewals`, or if it is
already overdue. Otherwise add `loanPeriodDays` to the due date and increment `renewals`.

### 21. `POST /api/fines/:id/pay` → mark paid, record the time. `409` if already settled.

### 22. `POST /api/fines/:id/waive`

Body `{ reason }`, required. Mark the fine waived and keep the reason — a librarian cancelling a
charge is something the record should explain.

---

## Stage 5 — The dashboard

### `GET /api/dashboard`

Counts and short lists for the home screen:

```json
{
  "totalBooks": 26, "totalCopies": 66, "availableCopies": 29,
  "totalMembers": 25, "activeMembers": 22,
  "activeLoans": 34, "overdueLoans": 21, "dueToday": 3,
  "unpaidFines": 4820,
  "recentLoans": [],
  "overdueList": [],
  "popular": []
}
```

`recentLoans` and `overdueList` are up to six loans in the same shape as `GET /api/loans`.
`popular` is the five most-borrowed books, each with a `loanCount`.

Left until last on purpose: it is entirely queries over tables you already have, so it is a good
check of whether your schema turned out well. If any of these counts is painful to write, that is
telling you something about the schema, not about the query.

---

## Suggested database tables

You will need roughly this. Exact types depend on which database you choose.

```
staff        id, name, email (unique), password_hash, role
books        id, isbn (unique), title, author, publisher, year,
             dewey, category, shelf, description, added_at
copies       id, book_id → books, barcode (unique), status, condition, acquired_at
members      id, member_no (unique), name, email (unique), phone, address,
             membership_type, status, joined_at, expires_at
loans        id, copy_id → copies, member_id → members,
             issued_at, due_at, returned_at, renewals
fines        id, loan_id → loans, member_id → members, amount, days_late,
             reason, status, created_at, paid_at, waived_reason
settings     id, library_name, loan_period_days, max_books_per_member,
             max_renewals, fine_per_day, currency, fine_threshold_for_block
```

Two things worth noticing before you start:

**Loans point at a copy, not at a book.** Two people can borrow the same title at the same time;
they cannot borrow the same physical copy. If loans referenced `book_id`, you could not tell
which copy to expect back.

**Nothing stores a loan's status.** It is derived from `returned_at` and `due_at` at read time.
A stored status would be wrong every night at midnight when yesterday's due books become overdue.
