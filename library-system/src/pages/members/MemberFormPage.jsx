import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { Button, ErrorNote, Field, Input, PageHeader, Select, Textarea } from '../../components/ui';

const EMPTY = {
  name: '', email: '', phone: '', address: '',
  membershipType: 'standard', status: 'active',
};

export default function MemberFormPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const { data: existing, loading } = useApi(
    () => (isNew ? Promise.resolve(null) : api.members.get(id)), [id]
  );

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (existing) setForm({ ...EMPTY, ...existing }); }, [existing]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null); setErrors({});
    try {
      const saved = isNew ? await api.members.create(form) : await api.members.update(id, form);
      navigate(`/members/${saved.id}`);
    } catch (err) {
      setError(err);
      if (err.fields) setErrors(err.fields);
      setBusy(false);
    }
  };

  if (loading) return <div className="h-48 animate-pulse rounded-lg border border-shelf bg-white" />;

  return (
    <form onSubmit={submit} className="max-w-2xl">
      <PageHeader
        breadcrumb={[
          { label: 'Members', to: '/members' },
          ...(isNew ? [{ label: 'Register' }] : [{ label: existing?.name, to: `/members/${id}` }, { label: 'Edit' }]),
        ]}
        title={isNew ? 'Register a member' : 'Edit member'}
        description={isNew ? 'The member number is assigned automatically once the record is saved.' : null}
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" loading={busy}>{isNew ? 'Register member' : 'Save changes'}</Button>
          </>
        }
      />

      {error && !error.fields && <div className="mb-4"><ErrorNote error={error} /></div>}

      <div className="space-y-4 rounded-lg border border-shelf bg-white p-5">
        <Field label="Full name" required error={errors.name}>
          <Input value={form.name} onChange={set('name')} error={errors.name} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" required error={errors.email}>
            <Input type="email" value={form.email} onChange={set('email')} error={errors.email} />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <Input mono value={form.phone} onChange={set('phone')} placeholder="071 234 5678" />
          </Field>
        </div>

        <Field label="Address">
          <Textarea rows={2} value={form.address} onChange={set('address')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Membership type" hint="Students and seniors may have different limits">
            <Select value={form.membershipType} onChange={set('membershipType')}>
              <option value="standard">Standard</option>
              <option value="student">Student</option>
              <option value="senior">Senior</option>
            </Select>
          </Field>
          {!isNew && (
            <Field label="Status" hint="Suspended and expired members cannot borrow">
              <Select value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
              </Select>
            </Field>
          )}
        </div>
      </div>
    </form>
  );
}
