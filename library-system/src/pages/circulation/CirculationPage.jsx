import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeftRight, BookOpen, Check, CornerDownLeft, Search, User, X,
} from 'lucide-react';
import api from '../../lib/api';
import { useApi } from '../../lib/useApi';
import {
  Badge, Button, EmptyState, ErrorNote, Field, Input, PageHeader, SearchInput, Spine, Toast,
  statusLabel, statusTone,
} from '../../components/ui';
import { dueLabel, formatDate, money } from '../../lib/format';

/**
 * The circulation desk. Two modes, because a librarian is doing one or the
 * other, never both: issuing needs a member first, returning needs only the
 * book. The scan field keeps focus throughout so a barcode reader can drive
 * the whole screen without touching the mouse.
 */
export default function CirculationPage() {
  const [mode, setMode] = useState('issue');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <>
      <PageHeader
        eyebrow="Circulation"
        title="Circulation desk"
        description="Scan or type a barcode. The due date is set by the library rules, not typed in here."
      />

      <div className="mb-5 inline-flex rounded-lg border border-shelf bg-white p-1">
        {[
          ['issue', 'Issue a book', BookOpen],
          ['return', 'Take a return', CornerDownLeft],
        ].map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-[14px] font-medium transition-colors ${
              mode === key ? 'bg-ink-800 text-white' : 'text-ink-500 hover:text-ink-800'
            }`}
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>

      {mode === 'issue'
        ? <IssuePanel onDone={setToast} />
        : <ReturnPanel onDone={setToast} />}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}

/* ============================================================== issuing == */

function IssuePanel({ onDone }) {
  const [query, setQuery] = useState('');
  const [member, setMember] = useState(null);
  const [barcode, setBarcode] = useState('');
  const [issued, setIssued] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const scanRef = useRef(null);

  const { data: results, loading } = useApi(
    () => (query.trim().length >= 2 && !member ? api.members.list({ search: query }) : Promise.resolve(null)),
    [query, member]
  );

  const { data: detail, reload: reloadMember } = useApi(
    () => (member ? api.members.get(member.id) : Promise.resolve(null)),
    [member?.id]
  );

  useEffect(() => { if (member) scanRef.current?.focus(); }, [member]);

  const issue = async (e) => {
    e.preventDefault();
    const code = barcode.trim();
    if (!code) return;
    setBusy(true);
    setError(null);
    try {
      const loan = await api.circulation.issue(member.id, code);
      setIssued((prev) => [loan, ...prev]);
      setBarcode('');
      reloadMember();
      onDone({ message: `${loan.book?.title} issued to ${member.name}.`, tone: 'ok' });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
      scanRef.current?.focus();
    }
  };

  const reset = () => {
    setMember(null); setQuery(''); setIssued([]); setError(null); setBarcode('');
  };

  /* Step 1 — find the member. */
  if (!member) {
    return (
      <div className="max-w-2xl">
        <div className="rounded-lg border border-shelf bg-white p-5">
          <h2 className="text-[15px] font-semibold text-ink-800">Who is borrowing?</h2>
          <p className="mt-1 text-[13.5px] text-ink-400">
            Search by name, member number, email or phone.
          </p>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="e.g. Amara Silva or M-1004"
            className="mt-4"
          />

          {query.trim().length >= 2 && (
            <div className="mt-3 overflow-hidden rounded-md border border-shelf">
              {loading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-9 animate-pulse rounded bg-ink-50" />
                  ))}
                </div>
              ) : !results?.items.length ? (
                <p className="px-4 py-6 text-center text-[13.5px] text-ink-400">
                  No member matches “{query}”. Check the spelling, or register them first.
                </p>
              ) : (
                <ul className="divide-y divide-shelf">
                  {results.items.slice(0, 6).map((m) => (
                    <li key={m.id}>
                      <button
                        onClick={() => setMember(m)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-ink-50"
                      >
                        <User size={15} className="text-ink-300" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium text-ink-800">{m.name}</p>
                          <p className="data truncate text-[12px] text-ink-400">{m.memberNo}</p>
                        </div>
                        <Badge tone={statusTone(m.status)}>{statusLabel(m.status)}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* Step 2 — scan books onto that member. */
  const blocked = detail && (
    detail.status !== 'active' ? `This membership is ${detail.status}.` : null
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <form onSubmit={issue} className="rounded-lg border border-shelf bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink-800">Scan the book</h2>
            <Button variant="ghost" size="sm" icon={X} onClick={reset} type="button">
              Change member
            </Button>
          </div>

          <div className="mt-4 flex gap-2">
            <Input
              ref={scanRef}
              mono
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="C00042"
              className="text-[16px]"
              autoFocus
            />
            <Button type="submit" loading={busy} disabled={!barcode.trim()} size="lg">
              Issue
            </Button>
          </div>
          <p className="mt-2 text-[12.5px] text-ink-400">
            The barcode is on the inside cover. A scanner types it and presses enter for you.
          </p>

          {error && <div className="mt-4"><ErrorNote error={error} /></div>}
        </form>

        <div className="rounded-lg border border-shelf bg-white">
          <div className="border-b border-shelf px-4 py-3">
            <h2 className="text-[14.5px] font-semibold text-ink-800">
              Issued in this visit {issued.length > 0 && <span className="data text-ink-400">({issued.length})</span>}
            </h2>
          </div>
          {issued.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13.5px] text-ink-400">
              Nothing issued yet. Scan a barcode above to start.
            </p>
          ) : (
            <ul className="divide-y divide-shelf">
              {issued.map((loan) => (
                <li key={loan.id} className="flex items-center gap-3 px-4 py-3">
                  <Check size={16} className="text-[var(--color-due-ok)]" />
                  <Spine dewey={loan.book?.dewey} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink-800">{loan.book?.title}</p>
                    <p className="data truncate text-[12px] text-ink-400">{loan.barcode}</p>
                  </div>
                  <Badge tone="soon">Due {formatDate(loan.dueAt)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <aside className="space-y-3">
        <div className="rounded-lg border border-shelf bg-white p-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-ink-800">{member.name}</p>
              <p className="data text-[12.5px] text-ink-400">{member.memberNo}</p>
            </div>
            <Badge tone={statusTone(detail?.status ?? member.status)}>
              {statusLabel(detail?.status ?? member.status)}
            </Badge>
          </div>

          {blocked && (
            <div className="mt-3 flex gap-2 rounded-md border border-[var(--color-due-late)]/30 bg-[var(--color-due-late)]/5 p-2.5">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--color-due-late)]" />
              <p className="text-[12.5px] leading-snug text-[var(--color-due-late)]">
                {blocked} Renew it before issuing anything.
              </p>
            </div>
          )}

          <dl className="mt-4 space-y-2 border-t border-shelf pt-3">
            <div className="flex justify-between text-[13px]">
              <dt className="text-ink-400">Books out</dt>
              <dd className="data font-medium text-ink-800">{detail?.activeLoans ?? '—'}</dd>
            </div>
            <div className="flex justify-between text-[13px]">
              <dt className="text-ink-400">Unpaid fines</dt>
              <dd className="data font-medium" style={{ color: detail?.unpaidFines ? 'var(--color-due-late)' : undefined }}>
                {detail ? money(detail.unpaidFines) : '—'}
              </dd>
            </div>
          </dl>

          <Link
            to={`/members/${member.id}`}
            className="mt-3 block text-[13px] font-medium text-ink-500 hover:text-ink-800"
          >
            Open full record →
          </Link>
        </div>

        {detail?.loans?.filter((l) => !l.returnedAt).length > 0 && (
          <div className="rounded-lg border border-shelf bg-white">
            <div className="border-b border-shelf px-4 py-2.5">
              <h3 className="text-[13px] font-semibold text-ink-800">Already has out</h3>
            </div>
            <ul className="divide-y divide-shelf">
              {detail.loans.filter((l) => !l.returnedAt).map((loan) => (
                <li key={loan.id} className="px-4 py-2.5">
                  <p className="truncate text-[13px] font-medium text-ink-800">{loan.book?.title}</p>
                  <p className={`text-[12px] ${loan.status === 'overdue' ? 'text-[var(--color-due-late)]' : 'text-ink-400'}`}>
                    {dueLabel(loan.dueAt)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ============================================================ returning == */

function ReturnPanel({ onDone }) {
  const [barcode, setBarcode] = useState('');
  const [returned, setReturned] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const scanRef = useRef(null);

  useEffect(() => { scanRef.current?.focus(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    const code = barcode.trim();
    if (!code) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.circulation.returnBook(code);
      setReturned((prev) => [result, ...prev]);
      setBarcode('');
      onDone(
        result.fine
          ? { message: `Returned late. A fine of ${money(result.fine.amount)} was added.`, tone: 'soon' }
          : { message: `${result.loan.book?.title} returned. Nothing owed.`, tone: 'ok' }
      );
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
      scanRef.current?.focus();
    }
  };

  return (
    <div className="grid max-w-4xl gap-4">
      <form onSubmit={submit} className="rounded-lg border border-shelf bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink-800">Scan the returned book</h2>
        <p className="mt-1 text-[13.5px] text-ink-400">
          No need to look the member up — the barcode is enough.
        </p>
        <div className="mt-4 flex gap-2">
          <Input
            ref={scanRef}
            mono
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="C00042"
            className="text-[16px]"
          />
          <Button type="submit" loading={busy} disabled={!barcode.trim()} size="lg" variant="success">
            Take return
          </Button>
        </div>
        {error && <div className="mt-4"><ErrorNote error={error} /></div>}
      </form>

      <div className="rounded-lg border border-shelf bg-white">
        <div className="border-b border-shelf px-4 py-3">
          <h2 className="text-[14.5px] font-semibold text-ink-800">
            Returned in this session {returned.length > 0 && <span className="data text-ink-400">({returned.length})</span>}
          </h2>
        </div>
        {returned.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="Nothing returned yet"
            body="Scan a barcode above. Late items raise a fine automatically at the daily rate."
          />
        ) : (
          <ul className="divide-y divide-shelf">
            {returned.map(({ loan, fine }) => (
              <li key={loan.id} className="flex items-start gap-3 px-4 py-3.5">
                <Spine dewey={loan.book?.dewey} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink-800">{loan.book?.title}</p>
                  <p className="truncate text-[12.5px] text-ink-400">
                    {loan.member?.name} · due {formatDate(loan.dueAt)}
                  </p>
                </div>
                {fine
                  ? <Badge tone="late">{fine.daysLate} days late · {money(fine.amount)}</Badge>
                  : <Badge tone="ok">On time</Badge>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
