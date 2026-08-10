import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, BookOpen, CalendarClock, Receipt, ScanLine, Users,
} from 'lucide-react';
import api from '../lib/api';
import { useApi } from '../lib/useApi';
import { Badge, Button, ErrorNote, PageHeader, Spine } from '../components/ui';
import { dueLabel, formatDate, money } from '../lib/format';

function Stat({ label, value, sub, icon: Icon, tone = 'neutral', to }) {
  const colour = {
    neutral: 'var(--color-ink-500)',
    late: 'var(--color-due-late)',
    soon: 'var(--color-due-soon)',
    ok: 'var(--color-due-ok)',
  }[tone];

  const inner = (
    <>
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-400">
          {label}
        </span>
        <Icon size={16} className="text-ink-300" strokeWidth={1.75} />
      </div>
      <div className="data mt-2 text-[28px] font-semibold leading-none" style={{ color: colour }}>
        {value}
      </div>
      {sub && <p className="mt-1.5 text-[12.5px] text-ink-400">{sub}</p>}
    </>
  );

  const className =
    'block rounded-lg border border-shelf bg-white p-4 transition-colors ' +
    (to ? 'hover:border-ink-300' : '');

  return to
    ? <Link to={to} className={className} style={{ borderLeft: `3px solid ${colour}` }}>{inner}</Link>
    : <div className={className} style={{ borderLeft: `3px solid ${colour}` }}>{inner}</div>;
}

function Panel({ title, action, children }) {
  return (
    <section className="rounded-lg border border-shelf bg-white">
      <div className="flex items-center justify-between border-b border-shelf px-4 py-3">
        <h2 className="text-[14.5px] font-semibold text-ink-800">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(() => api.dashboard.summary(), []);

  if (error) {
    return (
      <>
        <PageHeader title="Today at the desk" />
        <ErrorNote error={error} onRetry={reload} />
      </>
    );
  }

  const skeleton = <div className="h-4 w-full animate-pulse rounded bg-ink-50" />;

  return (
    <>
      <PageHeader
        eyebrow={formatDate(new Date())}
        title="Today at the desk"
        description="What is out, what is late, and what needs chasing before closing."
        actions={
          <>
            <Button variant="secondary" icon={BookOpen} onClick={() => navigate('/books/new')}>
              Add a book
            </Button>
            <Button icon={ScanLine} onClick={() => navigate('/circulation')}>
              Open circulation desk
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-lg border border-shelf bg-white" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Out on loan" value={data.activeLoans} icon={BookOpen}
            sub={`${data.availableCopies} copies on the shelf`} to="/loans"
          />
          <Stat
            label="Overdue" value={data.overdueLoans} icon={AlertTriangle}
            tone={data.overdueLoans ? 'late' : 'ok'}
            sub={data.overdueLoans ? 'Needs chasing today' : 'Nothing outstanding'}
            to="/loans?status=overdue"
          />
          <Stat
            label="Due back today" value={data.dueToday} icon={CalendarClock}
            tone={data.dueToday ? 'soon' : 'neutral'}
            sub="Expect these at the desk" to="/loans?status=active"
          />
          <Stat
            label="Unpaid fines" value={money(data.unpaidFines).replace('LKR ', '')} icon={Receipt}
            tone={data.unpaidFines ? 'soon' : 'ok'}
            sub={`Across ${data.activeMembers} active members`} to="/fines"
          />
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Overdue, longest first"
          action={<Link to="/loans?status=overdue" className="text-[13px] font-medium text-ink-500 hover:text-ink-800">See all</Link>}
        >
          {loading ? (
            <div className="space-y-3 p-4">{skeleton}{skeleton}{skeleton}</div>
          ) : data.overdueList.length === 0 ? (
            <p className="px-4 py-8 text-center text-[14px] text-ink-400">
              Nothing is overdue. The shelves are in good order.
            </p>
          ) : (
            <ul className="divide-y divide-shelf">
              {data.overdueList.map((loan) => (
                <li key={loan.id}>
                  <Link
                    to={`/members/${loan.member?.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-ink-50/60"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Spine dewey={loan.book?.dewey} />
                        <span className="truncate text-[14px] font-medium text-ink-800">
                          {loan.book?.title}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[12.5px] text-ink-400">
                        {loan.member?.name} · <span className="data">{loan.member?.memberNo}</span>
                      </p>
                    </div>
                    <Badge tone="late">{loan.daysLate} days late</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Just issued"
          action={<Link to="/loans" className="text-[13px] font-medium text-ink-500 hover:text-ink-800">See all</Link>}
        >
          {loading ? (
            <div className="space-y-3 p-4">{skeleton}{skeleton}{skeleton}</div>
          ) : (
            <ul className="divide-y divide-shelf">
              {data.recentLoans.map((loan) => (
                <li key={loan.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Spine dewey={loan.book?.dewey} />
                      <span className="truncate text-[14px] font-medium text-ink-800">
                        {loan.book?.title}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[12.5px] text-ink-400">
                      {loan.member?.name} · issued {formatDate(loan.issuedAt)}
                    </p>
                  </div>
                  <Badge tone={loan.status === 'overdue' ? 'late' : loan.status === 'returned' ? 'ok' : 'soon'}>
                    {loan.status === 'returned' ? 'Returned' : dueLabel(loan.dueAt)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Borrowed most often">
          {loading ? (
            <div className="space-y-3 p-4">{skeleton}{skeleton}{skeleton}</div>
          ) : (
            <ul className="divide-y divide-shelf">
              {data.popular.map((book, i) => (
                <li key={book.id}>
                  <Link to={`/books/${book.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-ink-50/60">
                    <span className="data w-5 text-[13px] text-ink-300">{i + 1}</span>
                    <Spine dewey={book.dewey} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-ink-800">{book.title}</p>
                      <p className="truncate text-[12.5px] text-ink-400">{book.author}</p>
                    </div>
                    <span className="data text-[13px] text-ink-500">{book.loanCount} loans</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Collection">
          {loading ? (
            <div className="space-y-3 p-4">{skeleton}{skeleton}</div>
          ) : (
            <dl className="divide-y divide-shelf">
              {[
                ['Titles catalogued', data.totalBooks, '/books'],
                ['Physical copies', data.totalCopies, '/books'],
                ['On the shelf now', data.availableCopies, '/books?availability=available'],
                ['Registered members', data.totalMembers, '/members'],
              ].map(([label, value, to]) => (
                <div key={label} className="flex items-center justify-between px-4 py-3">
                  <dt className="text-[13.5px] text-ink-500">{label}</dt>
                  <dd>
                    <Link to={to} className="data flex items-center gap-1.5 text-[14px] font-semibold text-ink-800 hover:underline">
                      {value}
                      <ArrowRight size={13} className="text-ink-300" />
                    </Link>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </Panel>
      </div>
    </>
  );
}
