import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { Button, ErrorNote, Field, Input, PageHeader, Toast } from '../../components/ui';

/**
 * These numbers are read by the circulation logic on the server. Nothing here
 * is enforced by the browser -- the client only displays them.
 */
export default function SettingsPage() {
  const { data, loading, error, reload } = useApi(() => api.settings.get(), []);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { if (data) setForm(data); }, [data]);

  const set = (key, asNumber = true) => (e) =>
    setForm((f) => ({ ...f, [key]: asNumber ? Number(e.target.value) : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setSaveError(null);
    try {
      await api.settings.update(form);
      setToast({ message: 'Library rules updated. New loans use these values.', tone: 'ok' });
    } catch (err) { setSaveError(err); } finally { setBusy(false); }
  };

  if (loading || !form) return <div className="h-48 animate-pulse rounded-lg border border-shelf bg-white" />;
  if (error) return <><PageHeader title="Library rules" /><ErrorNote error={error} onRetry={reload} /></>;

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <PageHeader
        eyebrow="Administration"
        title="Library rules"
        description="The limits the circulation desk works to. Changing them affects new loans, not ones already out."
        actions={<Button type="submit" loading={busy}>Save rules</Button>}
      />

      {saveError && <div className="mb-4"><ErrorNote error={saveError} /></div>}

      <div className="space-y-5 rounded-lg border border-shelf bg-white p-5">
        <Field label="Library name">
          <Input value={form.libraryName} onChange={set('libraryName', false)} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Loan period" hint="Days before a book is due back">
            <Input type="number" mono min={1} value={form.loanPeriodDays} onChange={set('loanPeriodDays')} />
          </Field>
          <Field label="Books per member" hint="How many can be out at once">
            <Input type="number" mono min={1} value={form.maxBooksPerMember} onChange={set('maxBooksPerMember')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Renewals allowed" hint="Per loan, before it must come back">
            <Input type="number" mono min={0} value={form.maxRenewals} onChange={set('maxRenewals')} />
          </Field>
          <Field label="Fine per day" hint={`Charged for each day late, in ${form.currency}`}>
            <Input type="number" mono min={0} value={form.finePerDay} onChange={set('finePerDay')} />
          </Field>
        </div>

        <Field
          label="Borrowing blocked above"
          hint="Once unpaid fines reach this amount, the member cannot borrow"
        >
          <Input type="number" mono min={0} value={form.fineThresholdForBlock} onChange={set('fineThresholdForBlock')} />
        </Field>
      </div>

      <div className="mt-4 rounded-lg border border-shelf bg-white p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-400">
          Where these are used
        </p>
        <ul className="mt-2.5 space-y-1.5 text-[13px] text-ink-500">
          <li>· <span className="data">POST /api/loans</span> reads the loan period, the borrowing limit and the fine threshold.</li>
          <li>· <span className="data">POST /api/loans/return</span> reads the daily fine rate.</li>
          <li>· <span className="data">POST /api/loans/:id/renew</span> reads the renewal limit and the loan period.</li>
        </ul>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </form>
  );
}
