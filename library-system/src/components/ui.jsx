import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search, X } from 'lucide-react';
import { deweyClass } from '../lib/format';

/* -------------------------------------------------------------- Button --- */

const VARIANTS = {
  primary: 'bg-ink-800 text-white hover:bg-ink-700 disabled:bg-ink-300',
  secondary: 'bg-white text-ink-800 border border-shelf hover:border-ink-300 hover:bg-ink-50 disabled:text-ink-300',
  ghost: 'text-ink-500 hover:text-ink-800 hover:bg-ink-50',
  danger: 'bg-[var(--color-due-late)] text-white hover:brightness-110 disabled:opacity-50',
  success: 'bg-[var(--color-due-ok)] text-white hover:brightness-110 disabled:opacity-50',
};

const SIZES = {
  sm: 'px-2.5 py-1.5 text-[13px] gap-1.5',
  md: 'px-3.5 py-2 text-[14px] gap-2',
  lg: 'px-5 py-2.5 text-[15px] gap-2',
};

export function Button({
  as: Tag = 'button', variant = 'primary', size = 'md', icon: Icon,
  loading, children, className = '', ...props
}) {
  return (
    <Tag
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors
                  disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : Icon ? <Icon size={15} /> : null}
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------- Spine ----- */

/**
 * The signature element. A call number rendered the way it appears on a book's
 * spine, with the colour bar carrying the Dewey classification. Used wherever
 * a book is identified, so the shelf's colour system is present throughout.
 */
export function Spine({ dewey, className = '' }) {
  if (!dewey) return null;
  return (
    <span className={`spine ${className}`} style={{ '--spine-color': deweyClass(dewey) }}>
      {dewey}
    </span>
  );
}

/* -------------------------------------------------------------- Badge ---- */

const TONES = {
  neutral: 'bg-ink-50 text-ink-500 border-ink-100',
  ok: 'bg-[var(--color-due-ok)]/10 text-[var(--color-due-ok)] border-[var(--color-due-ok)]/25',
  soon: 'bg-[var(--color-due-soon)]/10 text-[var(--color-due-soon)] border-[var(--color-due-soon)]/25',
  late: 'bg-[var(--color-due-late)]/10 text-[var(--color-due-late)] border-[var(--color-due-late)]/25',
  hold: 'bg-[var(--color-due-hold)]/10 text-[var(--color-due-hold)] border-[var(--color-due-hold)]/25',
};

export function Badge({ tone = 'neutral', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[12px]
                  font-medium whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Maps the domain's status words onto the shared tone vocabulary. */
export const statusTone = (status) => ({
  available: 'ok', returned: 'ok', active: 'ok', paid: 'ok',
  on_loan: 'soon', due_soon: 'soon', unpaid: 'soon',
  overdue: 'late', lost: 'late', suspended: 'late', expired: 'late',
  repair: 'neutral', waived: 'neutral',
}[status] ?? 'neutral');

export const statusLabel = (status) =>
  ({ on_loan: 'On loan', available: 'On shelf', repair: 'In repair' }[status] ??
    String(status ?? '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()));

/* -------------------------------------------------------------- Table ---- */

export function Table({ columns, rows, rowKey = (r) => r.id, onRowClick, empty, loading }) {
  if (loading) {
    return (
      <div className="divide-y divide-shelf rounded-lg border border-shelf bg-white">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3.5">
            {columns.slice(0, 4).map((c, j) => (
              <div key={j} className="h-4 flex-1 animate-pulse rounded bg-ink-50" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!rows.length) return empty ?? null;

  return (
    <div className="overflow-x-auto rounded-lg border border-shelf bg-white">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-shelf bg-ink-50/60">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em]
                            text-ink-400 ${c.align === 'right' ? 'text-right' : ''} ${c.hideSm ? 'hidden md:table-cell' : ''}`}
                style={{ width: c.width }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-shelf">
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-ink-50/70' : ''}`}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-4 py-3 align-middle text-[14px] ${c.align === 'right' ? 'text-right' : ''} ${c.hideSm ? 'hidden md:table-cell' : ''}`}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------------------------------------- EmptyState ---- */

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="rounded-lg border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
      {Icon && <Icon size={26} className="mx-auto mb-3 text-ink-300" strokeWidth={1.5} />}
      <h3 className="text-[16px] font-semibold text-ink-800">{title}</h3>
      {body && <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-relaxed text-ink-400">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------ Inputs ----- */

export function Field({ label, hint, error, required, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-700">
        {label}
        {required && <span className="ml-0.5 text-[var(--color-due-late)]">*</span>}
      </span>
      {children}
      {error
        ? <span className="mt-1 block text-[12.5px] text-[var(--color-due-late)]">{error}</span>
        : hint
          ? <span className="mt-1 block text-[12.5px] text-ink-400">{hint}</span>
          : null}
    </label>
  );
}

const inputBase =
  'w-full rounded-md border bg-white px-3 py-2 text-[14px] text-ink-800 placeholder:text-ink-300 ' +
  'transition-colors focus:border-ink-500 focus:outline-none disabled:bg-ink-50 disabled:text-ink-400';

export const Input = forwardRef(function Input({ error, mono, className = '', ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`${inputBase} ${error ? 'border-[var(--color-due-late)]' : 'border-shelf'}
                  ${mono ? 'data' : ''} ${className}`}
      {...props}
    />
  );
});

export function Textarea({ error, className = '', ...props }) {
  return (
    <textarea
      className={`${inputBase} resize-y ${error ? 'border-[var(--color-due-late)]' : 'border-shelf'} ${className}`}
      {...props}
    />
  );
}

export function Select({ error, className = '', children, ...props }) {
  return (
    <select
      className={`${inputBase} ${error ? 'border-[var(--color-due-late)]' : 'border-shelf'} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputBase} border-shelf pl-9 ${value ? 'pr-9' : ''}`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-300 hover:text-ink-700"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- Modal ---- */

export function Modal({ open, onClose, title, description, children, footer, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${width} rounded-t-xl bg-white shadow-xl sm:rounded-xl`}
      >
        <div className="border-b border-shelf px-5 py-4">
          <h2 className="text-[17px] font-semibold text-ink-800">{title}</h2>
          {description && <p className="mt-1 text-[13.5px] text-ink-400">{description}</p>}
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-shelf px-5 py-3.5">{footer}</div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- PageHeader ---- */

export function PageHeader({ eyebrow, title, description, actions, breadcrumb }) {
  return (
    <div className="mb-6">
      {breadcrumb && (
        <nav className="mb-2 flex items-center gap-1.5 text-[13px] text-ink-400">
          {breadcrumb.map((b, i) => (
            <span key={b.label} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-ink-200">/</span>}
              {b.to ? <Link to={b.to} className="hover:text-ink-700">{b.label}</Link> : <span className="text-ink-700">{b.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow && (
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
              {eyebrow}
            </div>
          )}
          <h1 className="text-[26px] leading-tight font-semibold text-ink-800">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-[14px] text-ink-400">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- feedback ---- */

export function ErrorNote({ error, onRetry }) {
  if (!error) return null;
  const network = error.name === 'NetworkError';
  return (
    <div className="rounded-lg border border-[var(--color-due-late)]/30 bg-[var(--color-due-late)]/5 px-4 py-3">
      <p className="text-[14px] font-medium text-[var(--color-due-late)]">{error.message}</p>
      {network && (
        <p className="mt-1 text-[13px] text-ink-500">
          Start your backend, or list the endpoint in <code className="data">LIVE_ENDPOINTS</code> only
          once it is ready.
        </p>
      )}
      {onRetry && (
        <button onClick={onRetry} className="mt-2 text-[13px] font-medium text-ink-700 underline underline-offset-2">
          Try again
        </button>
      )}
    </div>
  );
}

export function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const tone = toast.tone ?? 'ok';
  const colour = {
    ok: 'var(--color-due-ok)',
    late: 'var(--color-due-late)',
    soon: 'var(--color-due-soon)',
  }[tone];
  return (
    <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
      <div
        className="flex items-start gap-3 rounded-lg bg-ink-800 px-4 py-3 text-white shadow-lg"
        style={{ borderLeft: `3px solid ${colour}` }}
      >
        <p className="flex-1 text-[14px] leading-snug">{toast.message}</p>
        <button onClick={onDismiss} aria-label="Dismiss" className="text-ink-300 hover:text-white">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- Pagination --- */

export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-[13px] text-ink-400">
        Showing <span className="data">{from}–{to}</span> of <span className="data">{total}</span>
      </p>
      <div className="flex gap-1.5">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <span className="flex items-center px-2 text-[13px] text-ink-500 data">
          {page} / {pages}
        </span>
        <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
