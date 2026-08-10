import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Mail, MapPin, Pencil, Phone, RotateCcw, ScanLine } from 'lucide-react';
import api from '../../lib/api';
import { useApi } from '../../lib/useApi';
import {
  Badge, Button, EmptyState, ErrorNote, PageHeader, Spine, Table, Toast,
  statusLabel, statusTone,
} from '../../components/ui';
import { dueLabel, formatDate, money } from '../../lib/format';

export default function MemberDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: member, loading, error, reload } = useApi(() => api.members.get(id), [id]);
  const [toast, setToast] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const renew = async (loan) => {
    setBusyId(loan.id);
    try {
      const updated = await api.circulation.renew(loan.id);
      setToast({ message: `Renewed. Now due ${formatDate(updated.dueAt)}.`, tone: 'ok' });
      reload();
    } catch (err) {
      setToast({ message: err.message, tone: 'late' });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="h-48 animate-pulse rounded-lg border border-shelf bg-white" />;
  if (error) return <><PageHeader title="Member" /><ErrorNote error={error} onRetry={reload} /></>;

  const current = member.loans.filter((l) => !l.returnedAt);
  const past = member.loans.filter((l) => l.returnedAt);

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Members', to: '/members' }, { label: member.name }]}
        eyebrow={<span className="data">{member.memberNo}</span>}
        title={member.name}
        actions={
          <>
            <Button variant="secondary" icon={Pencil} onClick={() => navigate(`/members/${id}/edit`)}>Edit</Button>
            <Button icon={ScanLine} onClick={() => navigate('/circulation')}>Issue a book</Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <section className="rounded-lg border border-shelf bg-white">
            <div className="flex items-center justify-between border-b border-shelf px-4 py-3">
              <h2 className="text-[14.5px] font-semibold text-ink-800">
                Currently borrowed <span className="data text-ink-400">({current.length})</span>
              </h2>
            </div>
            {current.length === 0 ? (
              <EmptyState title="Nothing out at the moment" body="Books issued to this member will appear here." />
            ) : (
              <ul className="divide-y divide-shelf">
                {current.map((loan) => (
                  <li key={loan.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Spine dewey={loan.book?.dewey} />
                    <div className="min-w-0 flex-1">
                      <Link to={`/books/${loan.book?.id}`} className="block truncate text-[14px] font-medium text-ink-800 hover:underline">
                        {loan.book?.title}
                      </Link>
                      <p className="data truncate text-[12px] text-ink-400">
                        {loan.barcode} · issued {formatDate(loan.issuedAt)}
                        {loan.renewals > 0 && ` · renewed ${loan.renewals}×`}
                      </p>
                    </div>
                    <Badge tone={loan.status === 'overdue' ? 'late' : 'soon'}>{dueLabel(loan.dueAt)}</Badge>
                    <Button
                      size="sm" variant="secondary" icon={RotateCcw}
                      loading={busyId === loan.id}
                      onClick={() => renew(loan)}
                    >
                      Renew
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-shelf bg-white">
            <div className="border-b border-shelf px-4 py-3">
              <h2 className="text-[14.5px] font-semibold text-ink-800">
                Borrowing history <span className="data text-ink-400">({past.length})</span>
              </h2>
            </div>
            <Table
              columns={[
                {
                  key: 'book', header: 'Book',
                  render: (l) => (
                    <div className="flex items-center gap-2.5">
                      <Spine dewey={l.book?.dewey} />
                      <span className="truncate text-ink-800">{l.book?.title}</span>
                    </div>
                  ),
                },
                { key: 'issued', header: 'Issued', hideSm: true, width: 120, render: (l) => <span className="text-ink-500">{formatDate(l.issuedAt)}</span> },
                { key: 'due', header: 'Due', hideSm: true, width: 120, render: (l) => <span className="text-ink-500">{formatDate(l.dueAt)}</span> },
                {
                  key: 'returned', header: 'Returned', width: 140, align: 'right',
                  render: (l) => {
                    const late = new Date(l.returnedAt) > new Date(l.dueAt);
                    return (
                      <span className={late ? 'text-[var(--color-due-late)]' : 'text-ink-500'}>
                        {formatDate(l.returnedAt)}
                      </span>
                    );
                  },
                },
              ]}
              rows={past}
              empty={<EmptyState title="No completed loans yet" body="Returned books are listed here." />}
            />
          </section>
        </div>

        <aside className="space-y-3">
          <div className="rounded-lg border border-shelf bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-400">Membership</span>
              <Badge tone={statusTone(member.status)}>{statusLabel(member.status)}</Badge>
            </div>
            <dl className="mt-3 space-y-2.5 border-t border-shelf pt-3 text-[13px]">
              <div className="flex justify-between"><dt className="text-ink-400">Type</dt><dd className="capitalize font-medium text-ink-800">{member.membershipType}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-400">Joined</dt><dd className="font-medium text-ink-800">{formatDate(member.joinedAt)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-400">Expires</dt><dd className="font-medium text-ink-800">{formatDate(member.expiresAt)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-400">Books out</dt><dd className="data font-medium text-ink-800">{member.activeLoans}</dd></div>
              <div className="flex justify-between">
                <dt className="text-ink-400">Unpaid fines</dt>
                <dd className="data font-medium" style={{ color: member.unpaidFines ? 'var(--color-due-late)' : undefined }}>
                  {money(member.unpaidFines)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-shelf bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-400">Contact</p>
            <ul className="mt-3 space-y-2.5 text-[13px]">
              <li className="flex items-start gap-2"><Mail size={14} className="mt-0.5 shrink-0 text-ink-300" /><span className="break-all text-ink-600">{member.email}</span></li>
              <li className="flex items-start gap-2"><Phone size={14} className="mt-0.5 shrink-0 text-ink-300" /><span className="data text-ink-600">{member.phone}</span></li>
              {member.address && <li className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-ink-300" /><span className="text-ink-600">{member.address}</span></li>}
            </ul>
          </div>

          {member.fines?.filter((f) => f.status === 'unpaid').length > 0 && (
            <div className="rounded-lg border border-[var(--color-due-late)]/30 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--color-due-late)]">Owes</p>
              <ul className="mt-3 space-y-2">
                {member.fines.filter((f) => f.status === 'unpaid').map((f) => (
                  <li key={f.id} className="flex justify-between gap-2 text-[13px]">
                    <span className="truncate text-ink-500">{f.book?.title ?? f.reason}</span>
                    <span className="data shrink-0 font-medium text-[var(--color-due-late)]">{money(f.amount)}</span>
                  </li>
                ))}
              </ul>
              <Link to="/fines" className="mt-3 block text-[13px] font-medium text-ink-500 hover:text-ink-800">
                Settle at the fines desk →
              </Link>
            </div>
          )}
        </aside>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
