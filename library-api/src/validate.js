/**
 * Validation helpers shared by the write endpoints.
 *
 * The frontend expects failures in this exact shape:
 *
 *   { error: "Some details are missing.", fields: { isbn: "This is required." } }
 *
 * `fields` is what lets BookFormPage mark the offending input red instead of
 * showing one message above the whole form.
 */

/** Thrown by the checks below; app.js turns it into a 422 response. */
export class ValidationError extends Error {
  constructor(fields, message = 'Some details are missing.') {
    super(message);
    this.name = 'ValidationError';
    this.status = 422;
    this.fields = fields;
  }
}

/** Any error with a status the client should see, e.g. 404 or 409. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** Trims a value and turns empty strings into null, so blanks are not stored. */
export const clean = (v) =>
  typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : v ?? null;

/**
 * Collects every problem before throwing, so the form can highlight all the
 * bad inputs at once. Reporting them one at a time is a miserable experience:
 * fix the title, submit, learn the author is wrong, submit, learn the ISBN is.
 */
export function check(rules) {
  const fields = {};
  for (const [name, message] of Object.entries(rules)) {
    if (message) fields[name] = message;
  }
  if (Object.keys(fields).length) throw new ValidationError(fields);
}

/** `required(value, 'Title')` -> a message when it is missing, else null. */
export const required = (value, label = 'This') =>
  clean(value) === null ? `${label} is required.` : null;

/** ISBN-10 or ISBN-13, ignoring dashes and spaces. */
export const isbnRule = (value) => {
  const v = clean(value);
  if (v === null) return 'ISBN is required.';
  const digits = v.replace(/[-\s]/g, '');
  if (!/^\d{9}[\dX]$|^\d{13}$/i.test(digits)) {
    return 'Enter a 10 or 13 digit ISBN.';
  }
  return null;
};

/**
 * A deliberately loose email check: something, an @, something with a dot.
 * Stricter patterns reject valid addresses, and the only real proof an address
 * works is sending to it.
 */
export const emailRule = (value) => {
  const v = clean(value);
  if (v === null) return 'Email is required.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'Enter a valid email address.';
  return null;
};

/** Rejects a value that is not one of the allowed words. */
export const oneOf = (value, allowed, label) => {
  const v = clean(value);
  if (v === null) return null;
  return allowed.includes(v) ? null : `${label} must be one of: ${allowed.join(', ')}.`;
};

/** Books published in the future, or before printing existed, are typos. */
export const yearRule = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n)) return 'Enter the year as a number.';
  if (n < 1450 || n > new Date().getFullYear() + 1) {
    return `Enter a year between 1450 and ${new Date().getFullYear() + 1}.`;
  }
  return null;
};

/** Reads :id from the path, rejecting anything that is not a positive whole number. */
export function readId(raw, what = 'record') {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(400, `The ${what} id must be a whole number.`);
  }
  return id;
}
