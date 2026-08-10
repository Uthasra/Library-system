/**
 * ============================================================================
 *  MOCK SERVER  —  your scaffolding while you build the real one
 * ============================================================================
 *
 * This intercepts fetch() calls to /api/... and answers them from the demo data
 * in mockData.js, so the whole interface works before any backend exists.
 *
 *  >>> AS YOU BUILD EACH ENDPOINT, ADD IT TO THIS LIST. <<<
 *
 * Anything listed here is NOT intercepted — it goes over the network to your
 * backend on http://localhost:4000 (see the proxy in vite.config.js).
 * Start with an empty list and watch it grow.
 */
export const LIVE_ENDPOINTS = [
  // 'POST /api/auth/login',
  'GET /api/books',
  'GET /api/books/:id',
];

/**
 * Read the handlers below as a specification, not as code to copy. They show
 * the shape of every response and the rules the real endpoint has to apply --
 * particularly `POST /api/loans`, where most of the thinking lives.
 */
import { books, copies, members, loans, fines, staff, settings } from './mockData.js';

const LATENCY = 220;                     // so loading states are visible
const DAY = 86400000;
const clone = (v) => JSON.parse(JSON.stringify(v));
const nextId = (rows) => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;

/* ------------------------------------------------------------- shaping ---- */

const bookWithCounts = (book) => {
  const mine = copies.filter((c) => c.bookId === book.id);
  return {
    ...book,
    totalCopies: mine.length,
    availableCopies: mine.filter((c) => c.status === 'available').length,
  };
};

const loanRow = (loan) => {
  const book = books.find((b) => b.id === loan.bookId);
  const member = members.find((m) => m.id === loan.memberId);
  const copy = copies.find((c) => c.id === loan.copyId);
  const overdue = !loan.returnedAt && new Date(loan.dueAt) < new Date();
  return {
    ...loan,
    status: loan.returnedAt ? 'returned' : overdue ? 'overdue' : 'active',
    daysLate: overdue ? Math.floor((Date.now() - new Date(loan.dueAt)) / DAY) : 0,
    book: book ? { id: book.id, title: book.title, author: book.author, dewey: book.dewey } : null,
    member: member ? { id: member.id, name: member.name, memberNo: member.memberNo } : null,
    barcode: copy?.barcode ?? null,
  };
};

const fineRow = (fine) => {
  const member = members.find((m) => m.id === fine.memberId);
  const loan = loans.find((l) => l.id === fine.loanId);
  const book = loan ? books.find((b) => b.id === loan.bookId) : null;
  return {
    ...fine,
    member: member ? { id: member.id, name: member.name, memberNo: member.memberNo } : null,
    book: book ? { id: book.id, title: book.title } : null,
  };
};

const paginate = (items, page = 1, pageSize = 12) => ({
  items: items.slice((page - 1) * pageSize, page * pageSize),
  total: items.length,
  page: Number(page),
  pageSize,
});

/* ------------------------------------------------------------- responses -- */

const ok = (data, status = 200) =>
  new Response(data === null ? null : JSON.stringify(data), {
    status: data === null ? 204 : status,
    headers: { 'Content-Type': 'application/json' },
  });

const fail = (status, error, extra = {}) =>
  new Response(JSON.stringify({ error, ...extra }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/* --------------------------------------------------------------- handlers - */

const routes = [
  /* ------------------------------------------------------------- auth ---- */
  ['POST', /^\/api\/auth\/login$/, (_m, body) => {
    const user = staff.find((s) => s.email.toLowerCase() === String(body.email).toLowerCase());
    if (!user || user.password !== body.password) {
      return fail(401, 'That email and password do not match.');
    }
    const { password, ...safe } = user;
    return ok({ token: `mock.${user.id}`, user: safe });
  }],

  ['GET', /^\/api\/auth\/me$/, () => {
    const { password, ...safe } = staff[0];
    return ok(safe);
  }],

  /* ------------------------------------------------------------ books ---- */
  ['GET', /^\/api\/books$/, (_m, _b, params) => {
    let list = books.map(bookWithCounts);
    const search = (params.get('search') ?? '').toLowerCase();
    if (search) {
      list = list.filter((b) =>
        `${b.title} ${b.author} ${b.isbn} ${b.dewey}`.toLowerCase().includes(search)
      );
    }
    const category = params.get('category');
    if (category) list = list.filter((b) => b.category === category);

    const availability = params.get('availability');
    if (availability === 'available') list = list.filter((b) => b.availableCopies > 0);
    if (availability === 'out') list = list.filter((b) => b.availableCopies === 0);

    return ok(paginate(list, params.get('page') ?? 1));
  }],

  ['GET', /^\/api\/books\/(\d+)$/, (m) => {
    const book = books.find((b) => b.id === Number(m[1]));
    if (!book) return fail(404, 'No book with that id.');
    const mine = copies.filter((c) => c.bookId === book.id).map((c) => {
      const loan = loans.find((l) => l.copyId === c.id && !l.returnedAt);
      return { ...c, currentLoan: loan ? loanRow(loan) : null };
    });
    return ok({ ...bookWithCounts(book), copies: mine });
  }],

  ['POST', /^\/api\/books$/, (_m, body) => {
    const missing = ['title', 'author', 'isbn'].filter((f) => !String(body[f] ?? '').trim());
    if (missing.length) {
      return fail(422, 'Some details are missing.', {
        fields: Object.fromEntries(missing.map((f) => [f, 'This is required.'])),
      });
    }
    if (books.some((b) => b.isbn === body.isbn)) {
      return fail(422, 'A book with that ISBN is already in the catalogue.', {
        fields: { isbn: 'Already used by another title.' },
      });
    }
    const book = {
      id: nextId(books),
      ...body,
      year: Number(body.year) || null,
      addedAt: new Date().toISOString(),
    };
    books.push(book);

    // A new title with no physical copy cannot be borrowed, so create one.
    copies.push({
      id: nextId(copies),
      bookId: book.id,
      barcode: `C${String(100000 + nextId(copies)).slice(1)}`,
      status: 'available',
      condition: 'good',
      acquiredAt: new Date().toISOString(),
    });
    return ok(bookWithCounts(book), 201);
  }],

  ['PUT', /^\/api\/books\/(\d+)$/, (m, body) => {
    const book = books.find((b) => b.id === Number(m[1]));
    if (!book) return fail(404, 'No book with that id.');
    Object.assign(book, body, { id: book.id, year: Number(body.year) || book.year });
    return ok(bookWithCounts(book));
  }],

  ['DELETE', /^\/api\/books\/(\d+)$/, (m) => {
    const id = Number(m[1]);
    const mine = copies.filter((c) => c.bookId === id);
    const out = mine.filter((c) => c.status === 'on_loan');
    if (out.length) {
      return fail(409, `${out.length} copy of this title is still on loan. It cannot be removed until every copy is back.`);
    }
    const i = books.findIndex((b) => b.id === id);
    if (i === -1) return fail(404, 'No book with that id.');
    books.splice(i, 1);
    mine.forEach((c) => copies.splice(copies.indexOf(c), 1));
    return ok(null);
  }],

  ['POST', /^\/api\/books\/(\d+)\/copies$/, (m, body) => {
    const book = books.find((b) => b.id === Number(m[1]));
    if (!book) return fail(404, 'No book with that id.');
    const copy = {
      id: nextId(copies),
      bookId: book.id,
      barcode: body.barcode || `C${String(100000 + nextId(copies)).slice(1)}`,
      status: 'available',
      condition: body.condition || 'good',
      acquiredAt: new Date().toISOString(),
    };
    if (copies.some((c) => c.barcode === copy.barcode)) {
      return fail(422, 'That barcode is already on another copy.', {
        fields: { barcode: 'Already in use.' },
      });
    }
    copies.push(copy);
    return ok(copy, 201);
  }],

  /* ---------------------------------------------------------- members ---- */
  ['GET', /^\/api\/members$/, (_m, _b, params) => {
    let list = members.map((mem) => ({
      ...mem,
      activeLoans: loans.filter((l) => l.memberId === mem.id && !l.returnedAt).length,
      unpaidFines: fines
        .filter((f) => f.memberId === mem.id && f.status === 'unpaid')
        .reduce((s, f) => s + f.amount, 0),
    }));

    const search = (params.get('search') ?? '').toLowerCase();
    if (search) {
      list = list.filter((mem) =>
        `${mem.name} ${mem.memberNo} ${mem.email} ${mem.phone}`.toLowerCase().includes(search)
      );
    }
    const status = params.get('status');
    if (status) list = list.filter((mem) => mem.status === status);

    return ok(paginate(list, params.get('page') ?? 1));
  }],

  ['GET', /^\/api\/members\/(\d+)$/, (m) => {
    const member = members.find((x) => x.id === Number(m[1]));
    if (!member) return fail(404, 'No member with that id.');
    const mine = loans.filter((l) => l.memberId === member.id);
    return ok({
      ...member,
      loans: mine.map(loanRow).sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt)),
      activeLoans: mine.filter((l) => !l.returnedAt).length,
      fines: fines.filter((f) => f.memberId === member.id).map(fineRow),
      unpaidFines: fines
        .filter((f) => f.memberId === member.id && f.status === 'unpaid')
        .reduce((s, f) => s + f.amount, 0),
    });
  }],

  ['POST', /^\/api\/members$/, (_m, body) => {
    const missing = ['name', 'email'].filter((f) => !String(body[f] ?? '').trim());
    if (missing.length) {
      return fail(422, 'Some details are missing.', {
        fields: Object.fromEntries(missing.map((f) => [f, 'This is required.'])),
      });
    }
    if (members.some((x) => x.email.toLowerCase() === String(body.email).toLowerCase())) {
      return fail(422, 'That email is already registered.', {
        fields: { email: 'Already registered to another member.' },
      });
    }
    const id = nextId(members);
    const member = {
      id,
      memberNo: `M-${1000 + id}`,          // the server assigns this, not the form
      status: 'active',
      membershipType: body.membershipType || 'standard',
      joinedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * DAY).toISOString(),
      ...body,
    };
    members.push(member);
    return ok(member, 201);
  }],

  ['PUT', /^\/api\/members\/(\d+)$/, (m, body) => {
    const member = members.find((x) => x.id === Number(m[1]));
    if (!member) return fail(404, 'No member with that id.');
    Object.assign(member, body, { id: member.id, memberNo: member.memberNo });
    return ok(member);
  }],

  ['GET', /^\/api\/members\/(\d+)\/loans$/, (m, _b, params) => {
    let mine = loans.filter((l) => l.memberId === Number(m[1])).map(loanRow);
    const status = params.get('status');
    if (status) mine = mine.filter((l) => l.status === status);
    return ok(mine.sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt)));
  }],

  /* ------------------------------------------------------ circulation ---- */
  ['GET', /^\/api\/copies\/([^/]+)$/, (m) => {
    const barcode = decodeURIComponent(m[1]);
    const copy = copies.find((c) => c.barcode === barcode);
    if (!copy) return fail(404, `No copy with barcode ${barcode}.`);
    const book = books.find((b) => b.id === copy.bookId);
    const loan = loans.find((l) => l.copyId === copy.id && !l.returnedAt);
    return ok({ ...copy, book, currentLoan: loan ? loanRow(loan) : null });
  }],

  /**
   * Issuing a book. Every check below has to exist in your version too --
   * this is the endpoint where the library's rules actually live.
   */
  ['POST', /^\/api\/loans$/, (_m, body) => {
    const member = members.find((x) => x.id === Number(body.memberId));
    if (!member) return fail(404, 'No member with that id.');

    const copy = copies.find((c) => c.barcode === body.barcode);
    if (!copy) return fail(404, `No copy with barcode ${body.barcode}.`);

    // 1. The member must be allowed to borrow at all.
    if (member.status !== 'active') {
      return fail(409, `${member.name}'s membership is ${member.status}. It must be renewed before borrowing.`);
    }

    // 2. The copy must be on the shelf.
    if (copy.status === 'on_loan') {
      const existing = loans.find((l) => l.copyId === copy.id && !l.returnedAt);
      const holder = members.find((x) => x.id === existing?.memberId);
      return fail(409, `That copy is already on loan to ${holder?.name ?? 'another member'}.`);
    }
    if (copy.status !== 'available') {
      return fail(409, `That copy is marked "${copy.status}" and cannot be issued.`);
    }

    // 3. The borrowing limit.
    const active = loans.filter((l) => l.memberId === member.id && !l.returnedAt).length;
    if (active >= settings.maxBooksPerMember) {
      return fail(409, `${member.name} already has ${active} books out, which is the limit of ${settings.maxBooksPerMember}.`);
    }

    // 4. Outstanding fines over the threshold block further borrowing.
    const owed = fines
      .filter((f) => f.memberId === member.id && f.status === 'unpaid')
      .reduce((s, f) => s + f.amount, 0);
    if (owed >= settings.fineThresholdForBlock) {
      return fail(409, `${member.name} owes ${settings.currency} ${owed} in fines. Settle the balance before borrowing.`);
    }

    // 5. The due date is calculated here, never sent by the client.
    const loan = {
      id: nextId(loans),
      copyId: copy.id,
      bookId: copy.bookId,
      memberId: member.id,
      issuedAt: new Date().toISOString(),
      dueAt: new Date(Date.now() + settings.loanPeriodDays * DAY).toISOString(),
      returnedAt: null,
      renewals: 0,
      status: 'active',
    };
    loans.push(loan);
    copy.status = 'on_loan';
    return ok(loanRow(loan), 201);
  }],

  ['POST', /^\/api\/loans\/return$/, (_m, body) => {
    const copy = copies.find((c) => c.barcode === body.barcode);
    if (!copy) return fail(404, `No copy with barcode ${body.barcode}.`);

    const loan = loans.find((l) => l.copyId === copy.id && !l.returnedAt);
    if (!loan) return fail(409, 'That copy is not currently on loan.');

    loan.returnedAt = new Date().toISOString();
    loan.status = 'returned';
    copy.status = 'available';

    // A late return raises a fine at the daily rate.
    const daysLate = Math.floor((Date.now() - new Date(loan.dueAt)) / DAY);
    let fine = null;
    if (daysLate > 0) {
      const existing = fines.find((f) => f.loanId === loan.id && f.status === 'unpaid');
      if (existing) {
        existing.amount = daysLate * settings.finePerDay;
        existing.daysLate = daysLate;
        existing.reason = 'Returned after the due date';
        fine = fineRow(existing);
      } else {
        const created = {
          id: nextId(fines),
          loanId: loan.id,
          memberId: loan.memberId,
          amount: daysLate * settings.finePerDay,
          daysLate,
          reason: 'Returned after the due date',
          status: 'unpaid',
          createdAt: new Date().toISOString(),
          paidAt: null,
        };
        fines.push(created);
        fine = fineRow(created);
      }
    }
    return ok({ loan: loanRow(loan), fine });
  }],

  ['POST', /^\/api\/loans\/(\d+)\/renew$/, (m) => {
    const loan = loans.find((l) => l.id === Number(m[1]));
    if (!loan) return fail(404, 'No loan with that id.');
    if (loan.returnedAt) return fail(409, 'That loan is already closed.');
    if (loan.renewals >= settings.maxRenewals) {
      return fail(409, `This loan has already been renewed ${loan.renewals} times, which is the maximum.`);
    }
    if (new Date(loan.dueAt) < new Date()) {
      return fail(409, 'An overdue loan cannot be renewed. The book has to come back to the desk first.');
    }
    loan.renewals += 1;
    loan.dueAt = new Date(new Date(loan.dueAt).getTime() + settings.loanPeriodDays * DAY).toISOString();
    return ok(loanRow(loan));
  }],

  ['GET', /^\/api\/loans$/, (_m, _b, params) => {
    let list = loans.map(loanRow);
    const status = params.get('status');
    if (status) list = list.filter((l) => l.status === status);

    const search = (params.get('search') ?? '').toLowerCase();
    if (search) {
      list = list.filter((l) =>
        `${l.book?.title} ${l.member?.name} ${l.member?.memberNo} ${l.barcode}`.toLowerCase().includes(search)
      );
    }
    list.sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
    return ok(paginate(list, params.get('page') ?? 1, 15));
  }],

  /* ------------------------------------------------------------ fines ---- */
  ['GET', /^\/api\/fines$/, (_m, _b, params) => {
    let list = fines.map(fineRow);
    const status = params.get('status');
    if (status) list = list.filter((f) => f.status === status);
    const search = (params.get('search') ?? '').toLowerCase();
    if (search) {
      list = list.filter((f) =>
        `${f.member?.name} ${f.member?.memberNo} ${f.book?.title}`.toLowerCase().includes(search)
      );
    }
    return ok(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  }],

  ['POST', /^\/api\/fines\/(\d+)\/pay$/, (m) => {
    const fine = fines.find((f) => f.id === Number(m[1]));
    if (!fine) return fail(404, 'No fine with that id.');
    if (fine.status !== 'unpaid') return fail(409, 'That fine is already settled.');
    fine.status = 'paid';
    fine.paidAt = new Date().toISOString();
    return ok(fineRow(fine));
  }],

  ['POST', /^\/api\/fines\/(\d+)\/waive$/, (m, body) => {
    const fine = fines.find((f) => f.id === Number(m[1]));
    if (!fine) return fail(404, 'No fine with that id.');
    if (fine.status !== 'unpaid') return fail(409, 'That fine is already settled.');
    if (!String(body?.reason ?? '').trim()) {
      return fail(422, 'Record why the fine is being waived.', {
        fields: { reason: 'This is required.' },
      });
    }
    fine.status = 'waived';
    fine.waivedReason = body.reason;
    fine.paidAt = new Date().toISOString();
    return ok(fineRow(fine));
  }],

  /* -------------------------------------------------------- dashboard ---- */
  ['GET', /^\/api\/dashboard$/, () => {
    const active = loans.filter((l) => !l.returnedAt);
    const overdue = active.filter((l) => new Date(l.dueAt) < new Date());
    const dueToday = active.filter((l) => {
      const d = new Date(l.dueAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    });
    return ok({
      totalBooks: books.length,
      totalCopies: copies.length,
      availableCopies: copies.filter((c) => c.status === 'available').length,
      totalMembers: members.length,
      activeMembers: members.filter((m) => m.status === 'active').length,
      activeLoans: active.length,
      overdueLoans: overdue.length,
      dueToday: dueToday.length,
      unpaidFines: fines.filter((f) => f.status === 'unpaid').reduce((s, f) => s + f.amount, 0),
      recentLoans: [...loans]
        .sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt))
        .slice(0, 6)
        .map(loanRow),
      overdueList: overdue
        .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
        .slice(0, 6)
        .map(loanRow),
      popular: books
        .map((b) => ({ ...b, loanCount: loans.filter((l) => l.bookId === b.id).length }))
        .sort((a, b) => b.loanCount - a.loanCount)
        .slice(0, 5),
    });
  }],

  /* --------------------------------------------------------- settings ---- */
  ['GET', /^\/api\/settings$/, () => ok(clone(settings))],
  ['PUT', /^\/api\/settings$/, (_m, body) => {
    Object.assign(settings, body);
    return ok(clone(settings));
  }],
];

/* ------------------------------------------------------------ installer -- */

/** True when this request should be handled by the real backend instead. */
function isLive(method, pathname) {
  return LIVE_ENDPOINTS.some((entry) => {
    const [m, pattern] = entry.split(' ');
    if (m !== method) return false;
    // ':id' in a listed endpoint matches any single path segment.
    const re = new RegExp(`^${pattern.replace(/:[^/]+/g, '[^/]+')}$`);
    return re.test(pathname);
  });
}

export function installMockServer() {
  const realFetch = (window.fetch ?? globalThis.fetch).bind(window);

  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, window.location.origin);
    const method = (init.method ?? 'GET').toUpperCase();

    if (!url.pathname.startsWith('/api/') || isLive(method, url.pathname)) {
      return realFetch(input, init);
    }

    const route = routes.find(([m, re]) => m === method && re.test(url.pathname));
    if (!route) {
      return fail(404, `The mock server has no handler for ${method} ${url.pathname}.`);
    }

    const match = url.pathname.match(route[1]);
    let body = null;
    if (init.body) {
      try { body = JSON.parse(init.body); } catch { body = null; }
    }

    await new Promise((r) => setTimeout(r, LATENCY));
    try {
      return route[2](match, body, url.searchParams);
    } catch (err) {
      return fail(500, `The mock server threw: ${err.message}`);
    }
  };

  const live = LIVE_ENDPOINTS.length;
  console.info(
    `%c Mock server active `,
    'background:#14213D;color:#fff;border-radius:3px',
    live
      ? `${live} endpoint${live === 1 ? '' : 's'} going to your real backend.`
      : 'All endpoints mocked. Add to LIVE_ENDPOINTS in src/lib/mockServer.js as you build.'
  );
}
