'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Chip, Dialog, Field, Input, Select, Textarea } from '@/components/ui';
import { LEAD_STATUS_OPTIONS } from '@/lib/types';
import { addDaysIST, formatDate, todayIST } from '@/lib/date';
import { CallForm, emptyCallForm, forgetLeadContext, notifyRefresh, type CallFormState } from '../../follow-ups/shared';

// Status dropdown that saves immediately.
export function LeadStatusSelect({
  leadId, status, onChanged, className,
}: { leadId: string; status: string; onChanged: (status: string) => void; className?: string }) {
  const [saving, setSaving] = useState(false);

  const change = async (next: string) => {
    if (next === status) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not update status');
      onChanged(next);
      toast.success(`Status set to ${LEAD_STATUS_OPTIONS.find(o => o.value === next)?.label}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update status');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Select
      aria-label="Lead status"
      value={status}
      disabled={saving}
      onChange={e => change(e.target.value)}
      searchable={false}
      className={className}
    >
      {LEAD_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Select>
  );
}

// Same questions as call mode: what happened, when to call next, any notes.
export function LogCallDialog({
  leadId, open, onClose, onSaved,
}: { leadId: string; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CallFormState>(emptyCallForm);
  const [suggestions, setSuggestions] = useState('');
  const [complaints, setComplaints] = useState('');
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => { setForm(emptyCallForm()); setSuggestions(''); setComplaints(''); setMore(false); };

  const save = async () => {
    if (!form.outcome || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/call-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          call_outcome: form.outcome,
          remarks: form.remarks || null,
          suggestions: suggestions || null,
          complaints: complaints || null,
          next_followup_date: form.nextDate || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not save the call');
      toast.success('Call logged', {
        description: form.nextDate ? `Next call ${formatDate(form.nextDate)}` : 'No further follow-up',
      });
      forgetLeadContext(leadId);
      notifyRefresh();
      reset();
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the call');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Log call"
      className="sm:max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} loading={saving} disabled={!form.outcome}>
            {form.outcome ? 'Save call' : 'Pick an outcome'}
          </Button>
        </>
      }
    >
      <div onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); save(); } }}>
        <CallForm value={form} onChange={setForm} />

        {more ? (
          <div className="mt-4 grid gap-3">
            <Field label="Suggestion" htmlFor="call-sugg">
              <Textarea id="call-sugg" rows={2} value={suggestions} onChange={e => setSuggestions(e.target.value)} />
            </Field>
            <Field label="Complaint" htmlFor="call-comp">
              <Textarea id="call-comp" rows={2} value={complaints} onChange={e => setComplaints(e.target.value)} />
            </Field>
          </div>
        ) : (
          <button type="button" onClick={() => setMore(true)} className="mt-3 h-9 md:h-auto text-[12.5px] font-medium text-accent hover:underline underline-offset-2">
            Add a suggestion or complaint
          </button>
        )}
      </div>
    </Dialog>
  );
}

const QUICK = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'Next week', days: 7 },
  { label: 'In 2 weeks', days: 14 },
];

export function ScheduleFollowUpDialog({
  leadId, open, onClose, onSaved,
}: { leadId: string; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(addDaysIST(3));
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const today = todayIST();

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, followup_date: date, remarks: remarks || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not schedule the follow-up');
      toast.success(`Follow-up scheduled for ${formatDate(date)}`);
      notifyRefresh();
      setRemarks('');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not schedule the follow-up');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Schedule follow-up"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} loading={saving} disabled={!date || date < today}>Schedule</Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-1.5 mb-3">
        {QUICK.map(q => {
          const value = addDaysIST(q.days, today);
          return <Chip key={q.days} selected={date === value} onClick={() => setDate(value)}>{q.label}</Chip>;
        })}
      </div>
      <Field label="Date" htmlFor="fu-date" required error={date && date < today ? 'Pick today or a later date' : undefined}>
        <Input id="fu-date" type="date" min={today} value={date} onChange={e => setDate(e.target.value)} />
      </Field>
      <Field label="Note" htmlFor="fu-note" className="mt-3">
        <Textarea id="fu-note" rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Why call back?" />
      </Field>
    </Dialog>
  );
}
