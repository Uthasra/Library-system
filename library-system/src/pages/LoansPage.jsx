import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';
import api from '../lib/api';
import { useApi } from '../lib/useApi';
import {
  Badge, EmptyState, ErrorNote, PageHeader, Pagination, SearchInput, Select, Spine, Table,
} from '../components/ui';
import { dueLabel, formatDate } from '../lib/format';

const TABS = [
  ['', 'All'],
  ['active', 'Out on loan'],
  ['overdue', 'Overdue'],
  ['returned', 'Returned'],
];

export default function LoansPage() {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useApi(
    () => api.circulation.list({ status, search, page }),
    [status, search, page]
  );

  const setTab = (value) => {
    setStatus(value); setPage(1);
    const next = new URLSearchParams();
    if (value) next.set('status', value);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader
        eyebrow="Circulation"
        title="Loans"
        description="Every issue and return, newest first."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-shelf bg-white p-1">
          {TABS.map(([value, label]) => (
            <button
              key={label}
              onClick={() => setTab(value)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-[13.5px] font-medium transition-colors ${
                status === value ? 'bg-ink-800 text-white' : 'text-ink-500 hover:text-ink-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search book, member or barcode"
          className="sm:w-80"
        />
      </div>

      {error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : (
        <>
          <Table
            columns={[
              {
                key: 'book', header: 'Book',
                render: (l) => (
                  <div className="flex items-center gap-2.5">
                    <Spine dewey={l.book?.dewey} />
                    <div className="min-w-0">
                      <Link to={`/books/${l.book?.id}`} className="block truncate font-medium text-ink-800 hover:underline">
                        {l.book?.title}
                      </Link>
                      <p className="data truncate text-[12px] text-ink-400">{l.barcode}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: 'member', header: 'Member', width: 200,
                render: (l) => (
                  <Link to={`/members/${l.member?.id}`} className="block min-w-0 hover:underline">
                    <p className="truncate text-ink-800">{l.member?.name}</p>
                    <p className="data truncate text-[12px] text-ink-400">{l.member?.memberNo}</p>
                  </Link>
                ),
              },
              { key: 'issued', header: 'Issued', hideSm: true, width: 120, render: (l) => <span className="text-ink-500">{formatDate(l.issuedAt)}</span> },
              { key: 'due', header: 'Due', hideSm: true, width: 120, render: (l) => <span className="text-ink-500">{formatDate(l.dueAt)}</span> },
              {
                key: 'status', header: 'Status', width: 170, align: 'right',
                render: (l) => l.returnedAt
                  ? <Badge tone="ok">Returned {formatDate(l.returnedAt)}</Badge>
                  : <Badge tone={l.status === 'overdue' ? 'late' : 'soon'}>{dueLabel(l.dueAt)}</Badge>,
              },
            ]}
            rows={data?.items ?? []}
            loading={loading}
            empty={
              <EmptyState
                icon={ArrowLeftRight}
                title="No loans to show"
                body={status === 'overdue' ? 'Nothing is overdue right now.' : 'Issue a book at the circulation desk and it appears here.'}
              />
            }
          />
          {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
        </>
      )}
    </>
  );
}
