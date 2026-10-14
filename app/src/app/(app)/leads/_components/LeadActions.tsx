'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Dialog, Field, Input, Select, Textarea, cn } from '@/components/ui';
import { CALL_OUTCOME_OPTIONS, LEAD_STATUS_OPTIONS, type CallOutcome } from '@/lib/types';
import { addDaysIST, todayIST } from '@/lib/date';

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
      className={cn('h-8 text-[13px]', className)}
    >
      {LEAD_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Select>
  );
}

const OUTCOME_KEYS = CALL_OUTCOME_OPTIONS.map((o, i) => ({ ...o, key: String(i + 1) }));

export function LogCallDialog({
  leadId, open, onClose, onSaved,
}: { leadId: string; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [outcome, setOutcome] = useState<CallOutcome | ''>('');
  const [remarks, setRemarks] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [complaints, setComplaints] = useState('');
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => { setOutcome(''); setRemarks(''); setSuggestions(''); setComplaints(''); setMore(false); };

  const save = async () => {
    if (!outcome) return;
    setSaving(true);
    try {
      const res = await fetch('/api/call-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          call_outcome: outcome,
          remarks: remarks || null,
          suggestions: suggestions || null,
          complaints: complaints || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not save the call');
      toast.success('Call logged');
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
      description="Pick what happened on the call."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} loading={saving} disabled={!outcome}>Save call</Button>
        </>
      }
    >
      <div
        className="grid grid-cols-2 gap-1.5"
        role="radiogroup"
        aria-label="Call outcome"
        onKeyDown={e => {
          const hit = OUTCOME_KEYS.find(o => o.key === e.key);
          if (hit) { e.preventDefault(); setOutcome(hit.value); }
        }}
      >
        {OUTCOME_KEYS.map(o => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={outcome === o.value}
            onClick={() => setOutcome(o.value)}
            className={cn(
              'flex items-center gap-2 h-9 px-2.5 rounded-md border text-left text-[13px] transition-colors',
              outcome === o.value ? 'border-accent bg-accent-soft text-ink' : 'border-line-strong text-ink-2 hover:bg-sunken'
            )}
          >
            <span className="font-mono text-[11px] text-ink-3 w-3">{o.key}</span>
            {o.label}
          </button>
        ))}
      </div>

      <Field label="Remarks" htmlFor="call-remarks" className="mt-3">
        <Textarea id="call-remarks" rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="What did they say?" />
      </Field>

      {more ? (
        <div className="mt-3 grid gap-3">
          <Field label="Suggestion" htmlFor="call-sugg">
            <Textarea id="call-sugg" rows={2} value={suggestions} onChange={e => setSuggestions(e.target.value)} />
          </Field>
          <Field label="Complaint" htmlFor="call-comp">
            <Textarea id="call-comp" rows={2} value={complaints} onChange={e => setComplaints(e.target.value)} />
          </Field>
        </div>
      ) : (
        <button type="button" onClick={() => setMore(true)} className="mt-2 text-[12.5px] font-medium text-accent hover:underline underline-offset-2">
          Add suggestion or complaint
        </button>
      )}
    </Dialog>
  );
}

export function ScheduleFollowUpDialog({
  leadId, open, onClose, onSaved,
}: { leadId: string; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(addDaysIST(3));
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const quick = [
    { label: 'Tomorrow', days: 1 },
    { label: 'In 3 days', days: 3 },
    { label: 'Next week', days: 7 },
    { label: 'In 2 weeks', days: 14 },
  ];

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
      toast.success('Follow-up scheduled');
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
          <Button variant="primary" onClick={save} loading={saving} disabled={!date}>Schedule</Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-1.5 mb-3">
        {quick.map(q => {
          const value = addDaysIST(q.days);
          return (
            <button
              key={q.days}
              type="button"
              onClick={() => setDate(value)}
              className={cn(
                'h-7 px-2.5 rounded-md border text-[12.5px] transition-colors',
                date === value ? 'border-accent bg-accent-soft text-ink' : 'border-line-strong text-ink-2 hover:bg-sunken'
              )}
            >
              {q.label}
            </button>
          );
        })}
      </div>
      <Field label="Date" htmlFor="fu-date" required>
        <Input id="fu-date" type="date" min={todayIST()} value={date} onChange={e => setDate(e.target.value)} />
      </Field>
      <Field label="Note" htmlFor="fu-note" className="mt-3">
        <Textarea id="fu-note" rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Why call back?" />
      </Field>
    </Dialog>
  );
}
