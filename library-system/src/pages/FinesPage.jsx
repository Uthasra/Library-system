import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import api from '../lib/api';
import { useApi } from '../lib/useApi';
import {
  Badge, Button, EmptyState, ErrorNote, Field, Modal, PageHeader, SearchInput, Table, Textarea,
  Toast, statusLabel, statusTone,
} from '../components/ui';
import { formatDate, money } from '../lib/format';

export default function FinesPage() {
  const [status, setStatus] = useState('unpaid');
  const [search, setSearch] = useState('');
  const { data, loading, error, reload } = useApi(
    () => api.fines.list({ status, search }), [status, search]
  );

  const [waiving, setWaiving] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [toast, setToast] = useState(null);

  const pay = async (fine) => {
    setBusy(true);
    try {
      await api.fines.pay(fine.id);
      setToast({ message: `${money(fine.amount)} recorded as paid.`, tone: 'ok' });
      reload();
    } catch (err) {
      setToast({ message: err.message, tone: 'late' });
    } finally { setBusy(false); }
  };

  const waive = async () => {
    setBusy(true); setFormError(null);
    try {
      await api.fines.waive(waiving.id, reason);
      setToast({ message: 'Fine waived and noted.', tone: 'ok' });
      setWaiving(null); setReason(''); reload();
    } catch (err) { setFormError(err); } finally { setBusy(false); }
  };

  const total = (data ?? [])
    .filter((f) => f.status === 'unpaid')
    .reduce((s, f) => s + f.amount, 0);

  return (
    <>
      <PageHeader
        eyebrow="Money"
        title="Fines"
        description="Charges raised on late returns. Settle or waive them here."
        actions={
          total > 0 && (
            <div className="rounded-md border border-shelf bg-white px-3.5 py-2">
              <span className="text-[12px] text-ink-400">Outstanding</span>
              <span className="data ml-2 text-[15px] font-semibold text-[var(--color-due-late)]">
                {money(total)}
              </span>
            </div>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex gap-1 rounded-lg border border-shelf bg-white p-1">
          {[['unpaid', 'Unpaid'], ['paid', 'Paid'], ['waived', 'Waived'], ['', 'All']].map(([value, label]) => (
            <button
              key={label}
              onClick={() => setStatus(value)}
              className={`rounded-md px-3 py-1.5 text-[13.5px] font-medium transition-colors ${
                status === value ? 'bg-ink-800 text-white' : 'text-ink-500 hover:text-ink-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search member or book" className="sm:w-72" />
      </div>

      {error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : (
        <Table
          columns={[
            {
              key: 'member', header: 'Member', width: 200,
              render: (f) => (
                <Link to={`/members/${f.member?.id}`} className="block min-w-0 hover:underline">
                  <p className="truncate font-medium text-ink-800">{f.member?.name}</p>
                  <p className="data truncate text-[12px] text-ink-400">{f.member?.memberNo}</p>
                </Link>
              ),
            },
            { key: 'book', header: 'Book', render: (f) => <span className="truncate text-ink-600">{f.book?.title ?? '—'}</span> },
            { key: 'reason', header: 'Reason', hideSm: true, render: (f) => <span className="text-[13px] text-ink-400">{f.reason}</span> },
            { key: 'days', header: 'Days late', hideSm: true, width: 100, align: 'right', render: (f) => <span className="data text-ink-500">{f.daysLate}</span> },
            {
              key: 'amount', header: 'Amount', width: 130, align: 'right',
              render: (f) => <span className="data font-semibold text-ink-800">{money(f.amount)}</span>,
            },
            { key: 'status', header: 'Status', width: 110, align: 'right', render: (f) => <Badge tone={statusTone(f.status)}>{statusLabel(f.status)}</Badge> },
            {
              key: 'actions', header: '', width: 160, align: 'right',
              render: (f) => f.status !== 'unpaid'
                ? <span className="text-[12.5px] text-ink-300">{formatDate(f.paidAt)}</span>
                : (
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => setWaiving(f)}>Waive</Button>
                    <Button size="sm" variant="success" loading={busy} onClick={() => pay(f)}>Mark paid</Button>
                  </div>
                ),
            },
          ]}
          rows={data ?? []}
          loading={loading}
          empty={
            <EmptyState
              icon={Receipt}
              title={status === 'unpaid' ? 'Nothing outstanding' : 'No fines to show'}
              body={status === 'unpaid' ? 'Every fine has been settled. Late returns will add new ones automatically.' : 'Change the filter to see other fines.'}
            />
          }
        />
      )}

      <Modal
        open={Boolean(waiving)}
        onClose={() => { setWaiving(null); setFormError(null); }}
        title="Waive this fine"
        description="Waiving clears the charge. The reason is kept on the record."
        footer={
          <>
            <Button variant="secondary" onClick={() => setWaiving(null)}>Cancel</Button>
            <Button onClick={waive} loading={busy}>Waive fine</Button>
          </>
        }
      >
        <p className="mb-3 text-[14px] text-ink-500">
          {waiving?.member?.name} owes <span className="data font-semibold text-ink-800">{money(waiving?.amount)}</span> on
          {' '}{waiving?.book?.title ?? 'this loan'}.
        </p>
        <Field label="Reason" required error={formError?.fields?.reason}>
          <Textarea
            rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Book returned during the closure week"
            error={formError?.fields?.reason}
          />
        </Field>
        {formError && !formError.fields && <div className="mt-3"><ErrorNote error={formError} /></div>}
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
