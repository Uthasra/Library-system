import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import api from '../../lib/api';
import { useApi } from '../../lib/useApi';
import {
  Badge, Button, EmptyState, ErrorNote, PageHeader, Pagination, SearchInput, Select, Table,
  statusLabel, statusTone,
} from '../../components/ui';
import { formatDate, money } from '../../lib/format';

export default function MembersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useApi(
    () => api.members.list({ search, status, page }),
    [search, status, page]
  );

  const columns = [
    {
      key: 'name', header: 'Member',
      render: (m) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-800">{m.name}</p>
          <p className="data truncate text-[12.5px] text-ink-400">{m.memberNo}</p>
        </div>
      ),
    },
    { key: 'email', header: 'Contact', hideSm: true, render: (m) => (
      <div className="min-w-0">
        <p className="truncate text-[13px] text-ink-500">{m.email}</p>
        <p className="data truncate text-[12.5px] text-ink-400">{m.phone}</p>
      </div>
    ) },
    { key: 'type', header: 'Type', hideSm: true, width: 100, render: (m) => <span className="capitalize text-ink-500">{m.membershipType}</span> },
    { key: 'status', header: 'Status', width: 110, render: (m) => <Badge tone={statusTone(m.status)}>{statusLabel(m.status)}</Badge> },
    { key: 'loans', header: 'Out', width: 70, align: 'right', render: (m) => <span className="data text-ink-700">{m.activeLoans}</span> },
    {
      key: 'fines', header: 'Owes', width: 120, align: 'right',
      render: (m) => (
        <span className="data" style={{ color: m.unpaidFines ? 'var(--color-due-late)' : 'var(--color-ink-300)' }}>
          {m.unpaidFines ? money(m.unpaidFines) : '—'}
        </span>
      ),
    },
    { key: 'joined', header: 'Joined', hideSm: true, width: 120, align: 'right', render: (m) => <span className="text-[13px] text-ink-400">{formatDate(m.joinedAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Members"
        description="Everyone registered to borrow, with what they have out and what they owe."
        actions={<Button icon={Plus} onClick={() => navigate('/members/new')}>Register a member</Button>}
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search name, member number, email or phone"
          className="sm:max-w-sm sm:flex-1"
        />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="sm:w-44">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired</option>
        </Select>
      </div>

      {error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : (
        <>
          <Table
            columns={columns}
            rows={data?.items ?? []}
            loading={loading}
            onRowClick={(m) => navigate(`/members/${m.id}`)}
            empty={
              <EmptyState
                icon={Users}
                title={search || status ? 'No members match' : 'No members yet'}
                body={search || status ? 'Try a different search, or clear the filter.' : 'Register the first member to start lending.'}
                action={<Button icon={Plus} onClick={() => navigate('/members/new')}>Register a member</Button>}
              />
            }
          />
          {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
        </>
      )}
    </>
  );
}
