/**
 * ============================================================================
 *  THE API CLIENT  —  this is your build list
 * ============================================================================
 *
 * Every function below is exactly one endpoint you are going to write in the
 * backend. Nothing else in the app calls fetch directly, so this file is the
 * complete contract between the two halves.
 *
 * How to work through it:
 *   1. Pick a function.
 *   2. Read its comment: the method, the path, and what it returns.
 *   3. Build that endpoint in your backend.
 *   4. Add the path to LIVE_ENDPOINTS in src/lib/mockServer.js.
 *   5. Refresh — that screen is now running on your own code.
 *
 * Full request and response shapes are in API_CONTRACT.md.
 */

/** Thrown when the server rejects the request. `fields` marks bad inputs. */
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error ?? 'Something went wrong. Please try again.');
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.code;
    this.fields = body?.fields ?? null;
  }
}

/** Thrown when the browser cannot reach the server at all. */
export class NetworkError extends Error {
  constructor() {
    super('Cannot reach the server. Check that your backend is running.');
    this.name = 'NetworkError';
  }
}

const TOKEN_KEY = 'library.token';

export const token = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t) => {
    try { localStorage.setItem(TOKEN_KEY, t); } catch { /* private mode */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

/** The single place a network request is made. */
async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  const jwt = token.get();
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  if (body) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 204) return null;

  const text = await res.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { error: text }; }

  if (!res.ok) throw new ApiError(res.status, payload);
  return payload;
}

/** Builds `?a=1&b=2`, skipping empty values so URLs stay clean. */
const qs = (params = {}) => {
  const pairs = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all'
  );
  return pairs.length ? `?${new URLSearchParams(pairs)}` : '';
};

/* ==========================================================================
 * 1. AUTHENTICATION
 * ========================================================================== */

export const auth = {
  /** POST /api/auth/login  →  { token, user } */
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: { email, password } }),

  /** GET /api/auth/me  →  the signed-in staff member */
  me: () => request('/api/auth/me'),
};

/* ==========================================================================
 * 2. BOOKS  —  the catalogue
 * ========================================================================== */

export const books = {
  /**
   * GET /api/books?search=&category=&availability=&page=
   * →  { items: Book[], total: number, page: number, pageSize: number }
   */
  list: (params) => request(`/api/books${qs(params)}`),

  /** GET /api/books/:id  →  Book, including its copies */
  get: (id) => request(`/api/books/${id}`),

  /** POST /api/books  →  the created Book */
  create: (data) => request('/api/books', { method: 'POST', body: data }),

  /** PUT /api/books/:id  →  the updated Book */
  update: (id, data) => request(`/api/books/${id}`, { method: 'PUT', body: data }),

  /** DELETE /api/books/:id  →  204. Refuse if any copy is on loan. */
  remove: (id) => request(`/api/books/${id}`, { method: 'DELETE' }),

  /** POST /api/books/:id/copies  →  the created Copy (a physical book) */
  addCopy: (id, data) => request(`/api/books/${id}/copies`, { method: 'POST', body: data }),
};

/* ==========================================================================
 * 3. MEMBERS  —  the people who borrow
 * ========================================================================== */

export const members = {
  /** GET /api/members?search=&status=&page=  →  { items, total, page, pageSize } */
  list: (params) => request(`/api/members${qs(params)}`),

  /** GET /api/members/:id  →  Member, with current loans and unpaid fines */
  get: (id) => request(`/api/members/${id}`),

  /** POST /api/members  →  the created Member (server assigns the member number) */
  create: (data) => request('/api/members', { method: 'POST', body: data }),

  /** PUT /api/members/:id  →  the updated Member */
  update: (id, data) => request(`/api/members/${id}`, { method: 'PUT', body: data }),

  /** GET /api/members/:id/loans?status=  →  Loan[] for one member */
  loans: (id, params) => request(`/api/members/${id}/loans${qs(params)}`),
};

/* ==========================================================================
 * 4. CIRCULATION  —  issuing and returning. The heart of the system.
 * ========================================================================== */

export const circulation = {
  /**
   * POST /api/loans  { memberId, barcode }  →  the created Loan
   *
   * This is the most interesting endpoint in the project. Before creating the
   * loan the server has to check: does the copy exist, is it on the shelf, is
   * the member active, are they under their borrowing limit, do they owe fines
   * over the threshold. The due date is calculated by the server, never sent
   * by the client.
   */
  issue: (memberId, barcode) =>
    request('/api/loans', { method: 'POST', body: { memberId, barcode } }),

  /**
   * POST /api/loans/return  { barcode }  →  { loan, fine }
   * Marks the copy available again and raises a fine if it is late.
   */
  returnBook: (barcode) =>
    request('/api/loans/return', { method: 'POST', body: { barcode } }),

  /** POST /api/loans/:id/renew  →  the Loan with a new due date */
  renew: (id) => request(`/api/loans/${id}/renew`, { method: 'POST' }),

  /** GET /api/loans?status=&search=&page=  →  { items, total, page, pageSize } */
  list: (params) => request(`/api/loans${qs(params)}`),

  /** GET /api/copies/:barcode  →  the Copy with its book and current loan */
  lookupCopy: (barcode) => request(`/api/copies/${encodeURIComponent(barcode)}`),
};

/* ==========================================================================
 * 5. FINES
 * ========================================================================== */

export const fines = {
  /** GET /api/fines?status=&search=  →  Fine[] */
  list: (params) => request(`/api/fines${qs(params)}`),

  /** POST /api/fines/:id/pay  →  the paid Fine */
  pay: (id) => request(`/api/fines/${id}/pay`, { method: 'POST' }),

  /** POST /api/fines/:id/waive  { reason }  →  the waived Fine */
  waive: (id, reason) => request(`/api/fines/${id}/waive`, { method: 'POST', body: { reason } }),
};

/* ==========================================================================
 * 6. DASHBOARD
 * ========================================================================== */

export const dashboard = {
  /**
   * GET /api/dashboard  →  counts and recent activity for the home screen.
   * Build this one last: it is a set of COUNT queries over tables you will
   * already have.
   */
  summary: () => request('/api/dashboard'),
};

/* ==========================================================================
 * 7. SETTINGS  —  the rules the circulation logic reads
 * ========================================================================== */

export const settings = {
  /** GET /api/settings  →  loan period, borrowing limit, fine rate, and so on */
  get: () => request('/api/settings'),

  /** PUT /api/settings  →  the updated settings (admin only) */
  update: (data) => request('/api/settings', { method: 'PUT', body: data }),
};

export default { auth, books, members, circulation, fines, dashboard, settings };
