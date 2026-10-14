'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Check, Link2, Loader2, Minus, Plus, UserPlus, X } from 'lucide-react';
import { Badge, Button, Field, Input, Kbd, LeadStatusBadge, Panel, PanelHeader, Select, cn } from '@/components/ui';
import { BIHAR_DISTRICTS, JHARKHAND_DISTRICTS } from '@/lib/constants';
import { LEAD_TYPE_OPTIONS } from '@/lib/types';
import { validateChallan } from '@/lib/validators';
import { formatDate, formatDateTime, todayIST } from '@/lib/date';

const STATES = ['Bihar', 'Jharkhand', 'Other'] as const;
const RECENT_KEY = 'uphar.de.recent';

interface Agent { id: string; name: string }
interface Book { id: string; title: string }
interface SpecimenLine { title: string; quantity: number }
interface ExistingLead {
  id: string;
  lead_id: string;
  contact_person: string | null;
  institute_name: string | null;
  district: string | null;
  village_town: string | null;
  mobile_no: string | null;
  status: string;
  last_visit: string | null;
  last_books: string[];
}
interface RecentEntry { challan_no: string; lead_seq_id: string | null; name: string; institute: string; attached: boolean; at: string }

const EMPTY = {
  challan_no: '',
  lead_type: 'teacher',
  teacher_name: '',
  mobile_no: '',
  institute_name: '',
  address: '',
  village_town: '',
  locality: '',
  pincode: '',
  state: 'Bihar',
  district: '',
  other_state: '',
  other_district: '',
};
type FormState = typeof EMPTY;

function districtsFor(state: string): string[] {
  if (state === 'Bihar') return BIHAR_DISTRICTS;
  if (state === 'Jharkhand') return JHARKHAND_DISTRICTS;
  return [];
}

function readRecent(): RecentEntry[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeRecent(list: RecentEntry[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 10)));
  } catch {
    // storage unavailable — the list just won't persist
  }
}

function notifyDashboardRefresh() {
  try {
    const channel = new BroadcastChannel('dashboard-refresh');
    channel.postMessage('refresh');
    channel.close();
  } catch {
    // not supported — dashboard refreshes on its own interval
  }
}

export default function ChallanForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [challanDate, setChallanDate] = useState(todayIST());
  const [agentName, setAgentName] = useState('');
  const [specimens, setSpecimens] = useState<SpecimenLine[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [recent, setRecent] = useState<RecentEntry[]>([]);

  // Results are keyed by the input they answer, so stale ones simply stop applying.
  const [matchResult, setMatchResult] = useState<{ mobile: string; lead: ExistingLead | null } | null>(null);
  const [matchChecking, setMatchChecking] = useState(false);
  const [matchChoice, setMatchChoice] = useState<'attach_to_lead' | 'create_new'>('attach_to_lead');
  const [pinResult, setPinResult] = useState<{ pin: string; status: 'loading' | 'found' | 'missing' } | null>(null);

  const [addingRep, setAddingRep] = useState(false);
  const [newRep, setNewRep] = useState('');
  const [savingRep, setSavingRep] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const challanNoRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => (e[key] ? { ...e, [key]: '' } : e));
  };

  const loadAgents = useCallback(
    () =>
      fetch('/api/agents')
        .then(r => r.json())
        .then(d => { if (d.data) setAgents(d.data); })
        .catch(() => toast.error('Could not load representatives')),
    []
  );

  useEffect(() => {
    loadAgents();
    fetch('/api/specimen-books')
      .then(r => r.json())
      .then(d => d.data && setBooks(d.data))
      .catch(() => toast.error('Could not load the book list'));
    // localStorage is client-only: read it after hydration.
    queueMicrotask(() => setRecent(readRecent()));
    challanNoRef.current?.focus();
  }, [loadAgents]);

  // ── Inline duplicate check as soon as the mobile number is complete ──
  useEffect(() => {
    const mobile = form.mobile_no;
    if (!/^\d{10}$/.test(mobile)) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setMatchChecking(true);
      try {
        const res = await fetch(`/api/challans?lookup=mobile&mobile=${mobile}`, { signal: ctrl.signal });
        const data = await res.json();
        setMatchResult({ mobile, lead: data.data || null });
        setMatchChoice('attach_to_lead');
      } catch {
        // aborted or offline — the server re-checks on save
      } finally {
        setMatchChecking(false);
      }
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [form.mobile_no]);

  // ── Pincode → state/district autofill. Known locations first, then India Post. ──
  useEffect(() => {
    const pin = form.pincode;
    if (!/^\d{6}$/.test(pin)) return;
    const ctrl = new AbortController();
    const setPinLookup = (status: 'loading' | 'found' | 'missing') => setPinResult({ pin, status });
    const apply = (rawState: string, district: string) => {
      // Trust the district lists over the stored state name.
      const state = BIHAR_DISTRICTS.includes(district) ? 'Bihar' : JHARKHAND_DISTRICTS.includes(district) ? 'Jharkhand' : rawState;
      const knownState = STATES.includes(state as (typeof STATES)[number]) && state !== 'Other';
      setForm(f => {
        const next = { ...f };
        if (knownState && districtsFor(state).includes(district)) {
          next.state = state;
          next.district = district;
          next.other_district = '';
        } else {
          next.state = knownState ? state : 'Other';
          next.other_state = knownState ? '' : state;
          next.district = 'Other';
          next.other_district = district;
        }
        return next;
      });
      setErrors(e => ({ ...e, district: '' }));
      setPinLookup('found');
    };
    (async () => {
      await Promise.resolve();
      if (ctrl.signal.aborted) return;
      setPinLookup('loading');
      try {
        const res = await fetch(`/api/challans?lookup=pincode&pincode=${pin}`, { signal: ctrl.signal });
        const data = await res.json();
        if (data.data?.district) {
          apply(data.data.state || '', data.data.district);
          return;
        }
        const post = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: ctrl.signal }).then(r => r.json());
        const po = post?.[0]?.Status === 'Success' ? post[0].PostOffice?.[0] : null;
        if (po) {
          apply(po.State, po.District);
          setForm(f => (f.village_town ? f : { ...f, village_town: po.Name }));
        } else {
          setPinLookup('missing');
        }
      } catch {
        if (!ctrl.signal.aborted) setPinLookup('missing');
      }
    })();
    return () => ctrl.abort();
  }, [form.pincode]);

  const checkChallanNo = async () => {
    const no = form.challan_no.trim();
    if (!no) return;
    try {
      const res = await fetch(`/api/challans?lookup=challan_no&challan_no=${encodeURIComponent(no)}`);
      const data = await res.json();
      if (data.data?.exists) setErrors(e => ({ ...e, challan_no: `Challan ${no} is already entered` }));
    } catch {
      // server re-checks on save
    }
  };

  const match = matchResult && matchResult.mobile === form.mobile_no ? matchResult.lead : null;
  const pinLookup = pinResult && pinResult.pin === form.pincode ? pinResult.status : 'idle';

  const effectiveState = form.state === 'Other' ? form.other_state.trim() : form.state;
  const effectiveDistrict = form.district === 'Other' ? form.other_district.trim() : form.district;

  const payload = () => ({
    challan_no: form.challan_no.trim(),
    challan_date: challanDate,
    lead_type: form.lead_type,
    teacher_name: form.teacher_name.trim(),
    mobile_no: form.mobile_no,
    institute_name: form.institute_name.trim(),
    address: form.address.trim(),
    village_town: form.village_town.trim() || null,
    locality: form.locality.trim() || null,
    pincode: form.pincode,
    state: effectiveState,
    district: effectiveDistrict,
    agent_name: agentName,
    specimens_given: specimens,
    ...(match
      ? { confirm_action: matchChoice, ...(matchChoice === 'attach_to_lead' ? { existing_lead_id: match.id } : {}) }
      : {}),
  });

  const resetForNext = () => {
    // Keep date + rep: operators key in a rep's whole stack at once.
    setForm(f => ({ ...EMPTY, state: f.state }));
    setSpecimens([]);
    setErrors({});
    setMatchResult(null);
    setPinResult(null);
    requestAnimationFrame(() => challanNoRef.current?.focus());
  };

  const submit = async () => {
    if (saving) return;
    const body = payload();
    const check = validateChallan(body);
    if (!check.valid) {
      setErrors(check.fields);
      const firstKey = Object.keys(check.fields)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${firstKey}"]`)?.focus();
      toast.error('Some fields need attention');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/challans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (data.duplicate_found) {
        // Someone created a lead for this number since we last checked.
        setMatchResult({ mobile: body.mobile_no, lead: data.existing_lead });
        setMatchChoice('attach_to_lead');
        toast.warning('This mobile already has a lead — choose how to save it');
        return;
      }
      if (!res.ok) {
        if (data.fields) setErrors(data.fields);
        toast.error(data.error || 'Could not save the challan');
        return;
      }

      const entry: RecentEntry = {
        challan_no: body.challan_no,
        lead_seq_id: data.lead_seq_id,
        name: body.teacher_name,
        institute: body.institute_name,
        attached: !!match && matchChoice === 'attach_to_lead',
        at: new Date().toISOString(),
      };
      const nextRecent = [entry, ...recent].slice(0, 10);
      setRecent(nextRecent);
      writeRecent(nextRecent);
      notifyDashboardRefresh();
      toast.success(`Saved challan ${body.challan_no}`, {
        description: data.lead_seq_id ? `${entry.attached ? 'Attached to' : 'New lead'} ${data.lead_seq_id}` : undefined,
      });
      resetForNext();
    } catch {
      toast.error('Network error — the challan was not saved');
    } finally {
      setSaving(false);
    }
  };

  // Enter moves to the next field (paper-order data entry); Ctrl/Cmd+Enter saves.
  const onFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      submit();
      return;
    }
    const target = e.target as HTMLElement;
    if (target.dataset.enter === 'self' || target.tagName === 'BUTTON' || target.tagName === 'TEXTAREA') return;
    e.preventDefault();
    const fields = Array.from(
      formRef.current?.querySelectorAll<HTMLElement>('input:not([type=hidden]):not([disabled]), select:not([disabled])') || []
    ).filter(el => el.offsetParent !== null && el.tabIndex !== -1);
    const next = fields[fields.indexOf(target) + 1];
    next?.focus();
  };

  const addRep = async () => {
    const name = newRep.trim();
    if (!name) return;
    setSavingRep(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not add representative');
        return;
      }
      await loadAgents();
      setAgentName(name);
      setNewRep('');
      setAddingRep(false);
      toast.success(`Added ${name}`);
    } catch {
      toast.error('Could not add representative');
    } finally {
      setSavingRep(false);
    }
  };

  const districtOptions = districtsFor(form.state);
  const totalCopies = specimens.reduce((n, s) => n + s.quantity, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
      <form
        ref={formRef}
        onSubmit={e => { e.preventDefault(); submit(); }}
        onKeyDown={onFormKeyDown}
        noValidate
        className="min-w-0"
      >
        <Panel>
          <Section title="Challan">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Challan no." htmlFor="challan_no" required error={errors.challan_no}>
                <Input
                  ref={challanNoRef}
                  id="challan_no"
                  name="challan_no"
                  value={form.challan_no}
                  onChange={e => set('challan_no', e.target.value)}
                  onBlur={checkChallanNo}
                  aria-invalid={!!errors.challan_no}
                  autoComplete="off"
                  className="font-mono"
                />
              </Field>
              <Field label="Date" htmlFor="challan_date" required error={errors.challan_date}>
                <Input
                  id="challan_date"
                  name="challan_date"
                  type="date"
                  max={todayIST()}
                  value={challanDate}
                  onChange={e => { setChallanDate(e.target.value); setErrors(x => ({ ...x, challan_date: '' })); }}
                  aria-invalid={!!errors.challan_date}
                />
              </Field>
              <Field label="Representative" htmlFor="agent_name" required error={errors.agent_name}>
                {addingRep ? (
                  <div className="flex gap-1.5">
                    <Input
                      autoFocus
                      value={newRep}
                      onChange={e => setNewRep(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRep(); } if (e.key === 'Escape') setAddingRep(false); }}
                      data-enter="self"
                      placeholder="Full name"
                    />
                    <Button size="icon" variant="primary" onClick={addRep} loading={savingRep} aria-label="Save representative">
                      {!savingRep && <Check className="size-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setAddingRep(false)} aria-label="Cancel">
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <div className="flex-1 min-w-0">
                      <Select
                        id="agent_name"
                        name="agent_name"
                        value={agentName}
                        onChange={e => { setAgentName(e.target.value); setErrors(x => ({ ...x, agent_name: '' })); }}
                        aria-invalid={!!errors.agent_name}
                      >
                        <option value="">Select rep</option>
                        {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                      </Select>
                    </div>
                    <Button size="icon" variant="secondary" onClick={() => setAddingRep(true)} aria-label="Add representative" title="Add representative" tabIndex={-1}>
                      <UserPlus className="size-4" />
                    </Button>
                  </div>
                )}
              </Field>
            </div>
          </Section>

          <Section title="Contact">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Lead type" htmlFor="lead_type" required error={errors.lead_type}>
                <Select id="lead_type" name="lead_type" value={form.lead_type} onChange={e => set('lead_type', e.target.value)}>
                  {LEAD_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
              <Field label="Contact name" htmlFor="teacher_name" required error={errors.teacher_name}>
                <Input id="teacher_name" name="teacher_name" value={form.teacher_name} onChange={e => set('teacher_name', e.target.value)} aria-invalid={!!errors.teacher_name} autoComplete="off" />
              </Field>
              <Field
                label="Mobile"
                htmlFor="mobile_no"
                required
                error={errors.mobile_no}
                hint={matchChecking && form.mobile_no.length === 10 ? 'Checking for an existing lead…' : undefined}
              >
                <Input
                  id="mobile_no"
                  name="mobile_no"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.mobile_no}
                  onChange={e => set('mobile_no', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  aria-invalid={!!errors.mobile_no}
                  autoComplete="off"
                  className="font-mono tracking-wide"
                />
              </Field>
            </div>

            {match && (
              <div className="mt-4 rounded-md border border-warn/40 bg-warn-soft/60 p-3.5">
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  <Link2 className="size-4 text-warn" />
                  <span className="font-medium text-ink">This number already has a lead</span>
                  <span className="font-mono text-[12px] text-ink-2">{match.lead_id}</span>
                  <LeadStatusBadge status={match.status} />
                </div>
                <div className="mt-2 text-[13px] text-ink">
                  {match.contact_person || 'Unknown'} · {match.institute_name || 'No institute'}
                  {match.district && <span className="text-ink-2"> · {match.district}</span>}
                </div>
                <div className="mt-0.5 text-[12.5px] text-ink-2">
                  Last visit {match.last_visit ? formatDate(match.last_visit) : '—'}
                  {match.last_books.length > 0 && <> · {match.last_books.slice(0, 3).join(', ')}{match.last_books.length > 3 && ` +${match.last_books.length - 3}`}</>}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="How to save this challan">
                  {([
                    ['attach_to_lead', `Attach to ${match.lead_id}`, 'Same person, new visit'],
                    ['create_new', 'Create a new lead', 'Different person, shared number'],
                  ] as const).map(([value, label, help]) => (
                    <label
                      key={value}
                      className={cn(
                        'flex items-start gap-2 rounded-md border px-3 py-2 cursor-pointer bg-surface',
                        matchChoice === value ? 'border-accent ring-1 ring-accent/30' : 'border-line-strong hover:border-ink-3'
                      )}
                    >
                      <input
                        type="radio"
                        name="match_choice"
                        value={value}
                        checked={matchChoice === value}
                        onChange={() => setMatchChoice(value)}
                        className="mt-0.5 accent-[var(--color-accent)]"
                        tabIndex={-1}
                      />
                      <span>
                        <span className="block text-[13px] font-medium text-ink">{label}</span>
                        <span className="block text-[12px] text-ink-2">{help}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </Section>

          <Section title="Institute & address">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Institute / shop" htmlFor="institute_name" required error={errors.institute_name} className="sm:col-span-2">
                <Input id="institute_name" name="institute_name" value={form.institute_name} onChange={e => set('institute_name', e.target.value)} aria-invalid={!!errors.institute_name} autoComplete="off" />
              </Field>
              <Field label="Address" htmlFor="address" required error={errors.address} className="sm:col-span-2">
                <Input id="address" name="address" value={form.address} onChange={e => set('address', e.target.value)} aria-invalid={!!errors.address} autoComplete="off" />
              </Field>
              <Field label="Village / town" htmlFor="village_town" error={errors.village_town}>
                <Input id="village_town" name="village_town" value={form.village_town} onChange={e => set('village_town', e.target.value)} autoComplete="off" />
              </Field>
              <Field label="Locality" htmlFor="locality" error={errors.locality}>
                <Input id="locality" name="locality" value={form.locality} onChange={e => set('locality', e.target.value)} autoComplete="off" />
              </Field>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field
                label="Pincode"
                htmlFor="pincode"
                required
                error={errors.pincode}
                hint={pinLookup === 'loading' ? 'Looking up district…' : pinLookup === 'found' ? 'District filled from pincode' : pinLookup === 'missing' ? 'Pincode not found — pick the district' : undefined}
              >
                <div className="relative">
                  <Input
                    id="pincode"
                    name="pincode"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.pincode}
                    onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    aria-invalid={!!errors.pincode}
                    autoComplete="off"
                    className="font-mono tracking-wide"
                  />
                  {pinLookup === 'loading' && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-ink-3" />}
                </div>
              </Field>
              <Field label="State" htmlFor="state" required>
                {form.state === 'Other' ? (
                  <div className="flex gap-1.5">
                    <Input id="state" name="other_state" value={form.other_state} onChange={e => set('other_state', e.target.value)} placeholder="State name" />
                    <Button size="icon" variant="ghost" onClick={() => setForm(f => ({ ...f, state: 'Bihar', district: '', other_state: '', other_district: '' }))} aria-label="Pick from list" tabIndex={-1}>
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <Select id="state" name="state" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value, district: e.target.value === 'Other' ? 'Other' : '', other_district: '' }))}>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="District" htmlFor="district" required error={errors.district}>
                {form.district === 'Other' || form.state === 'Other' ? (
                  <Input id="district" name="district" value={form.other_district} onChange={e => { setForm(f => ({ ...f, district: 'Other', other_district: e.target.value })); setErrors(x => ({ ...x, district: '' })); }} placeholder="District name" aria-invalid={!!errors.district} />
                ) : (
                  <Select id="district" name="district" value={form.district} onChange={e => set('district', e.target.value)} aria-invalid={!!errors.district}>
                    <option value="">Select district</option>
                    {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
                    <option value="Other">Other…</option>
                  </Select>
                )}
              </Field>
            </div>
          </Section>

          <Section title="Specimens" meta={specimens.length ? `${specimens.length} titles · ${totalCopies} copies` : undefined} last>
            <SpecimenPicker
              books={books}
              value={specimens}
              onChange={v => { setSpecimens(v); setErrors(x => ({ ...x, specimens_given: '' })); }}
              onSubmitRequest={submit}
              error={errors.specimens_given}
            />
          </Section>
        </Panel>

        <div className="sticky bottom-0 z-10 mt-4 -mx-4 md:mx-0 px-4 md:px-0 py-3 bg-paper/95 backdrop-blur border-t border-line md:border-0 flex items-center justify-between gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-[12px] text-ink-3">
            <Kbd>Enter</Kbd> next field <span className="mx-1">·</span> <Kbd>Ctrl</Kbd><Kbd>Enter</Kbd> save
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={resetForNext} disabled={saving}>Clear</Button>
            <Button type="submit" variant="primary" loading={saving}>Save &amp; next</Button>
          </div>
        </div>
      </form>

      <aside className="hidden lg:block sticky top-20">
        <Panel>
          <PanelHeader title="Saved this session" meta={recent.length ? `${recent.length}` : undefined} />
          {recent.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-ink-3">Challans you save appear here.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map(r => (
                <li key={`${r.challan_no}-${r.at}`} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[12.5px] text-ink">{r.challan_no}</span>
                    <span className="text-[11.5px] text-ink-3">{formatDateTime(r.at)}</span>
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-ink-2 truncate">{r.name} · {r.institute}</div>
                  {r.lead_seq_id && (
                    <div className="mt-1">
                      <Badge tone={r.attached ? 'info' : 'ok'}>{r.attached ? 'Attached' : 'New'} {r.lead_seq_id}</Badge>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </aside>
    </div>
  );
}

function Section({ title, meta, children, last }: { title: string; meta?: string; children: React.ReactNode; last?: boolean }) {
  return (
    <fieldset className={cn('px-4 md:px-5 py-4 md:py-5', !last && 'border-b border-line')}>
      <legend className="sr-only">{title}</legend>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
        {meta && <span className="text-[12px] text-ink-3 font-mono">{meta}</span>}
      </div>
      {children}
    </fieldset>
  );
}

// Typeahead over the catalogue. Arrow keys + Enter add a title; Enter on an
// empty query (with at least one title chosen) saves the challan.
function SpecimenPicker({
  books, value, onChange, onSubmitRequest, error,
}: {
  books: Book[]; value: SpecimenLine[]; onChange: (v: SpecimenLine[]) => void; onSubmitRequest: () => void; error?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const chosen = useMemo(() => new Set(value.map(v => v.title.toLowerCase())), [value]);
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books
      .filter(b => !chosen.has(b.title.toLowerCase()) && (!q || b.title.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [books, chosen, query]);

  const add = (title: string) => {
    onChange([...value, { title, quantity: 1 }]);
    setQuery('');
    setActive(0);
    inputRef.current?.focus();
  };

  const setQty = (title: string, q: number) =>
    onChange(value.map(v => (v.title === title ? { ...v, quantity: Math.max(1, Math.min(999, q || 1)) } : v)));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(a + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Escape') { setOpen(false); }
    else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (query.trim() && options[active]) add(options[active].title);
      else if (!query.trim() && value.length > 0) onSubmitRequest();
    } else if (e.key === 'Backspace' && !query && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div>
      <div className="relative">
        <Input
          ref={inputRef}
          name="specimens_given"
          data-enter="self"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder={value.length ? 'Add another title, or press Enter to save' : 'Type a book title'}
          aria-invalid={!!error}
          role="combobox"
          aria-expanded={open && options.length > 0}
          aria-controls="specimen-options"
          autoComplete="off"
        />
        {open && options.length > 0 && (
          <ul
            id="specimen-options"
            role="listbox"
            className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-md border border-line bg-surface py-1 shadow-[var(--shadow-pop)]"
          >
            {options.map((b, i) => (
              <li
                key={b.id}
                role="option"
                aria-selected={i === active}
                onMouseDown={e => { e.preventDefault(); add(b.title); }}
                onMouseEnter={() => setActive(i)}
                className={cn('px-3 py-1.5 text-[13px] cursor-pointer', i === active ? 'bg-sunken text-ink' : 'text-ink-2')}
              >
                {b.title}
              </li>
            ))}
          </ul>
        )}
        {open && query.trim() && options.length === 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-[12.5px] text-ink-3 shadow-[var(--shadow-pop)]">
            No title matches “{query.trim()}”. Ask the catalogue team to add it.
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-[12px] text-bad">{error}</p>}

      {value.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-md border border-line">
          {value.map(v => (
            <li key={v.title} className="flex items-center gap-3 px-3 py-1.5">
              <span className="flex-1 min-w-0 truncate text-[13px] text-ink">{v.title}</span>
              <div className="flex items-center rounded-md border border-line-strong">
                <button type="button" tabIndex={-1} onClick={() => setQty(v.title, v.quantity - 1)} className="h-7 w-7 grid place-items-center text-ink-2 hover:bg-sunken" aria-label={`Fewer copies of ${v.title}`}>
                  <Minus className="size-3.5" />
                </button>
                <input
                  type="number"
                  min={1}
                  value={v.quantity}
                  onChange={e => setQty(v.title, parseInt(e.target.value, 10))}
                  data-enter="self"
                  tabIndex={-1}
                  className="w-10 h-7 text-center font-mono text-[12.5px] bg-transparent border-x border-line-strong focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label={`Copies of ${v.title}`}
                />
                <button type="button" tabIndex={-1} onClick={() => setQty(v.title, v.quantity + 1)} className="h-7 w-7 grid place-items-center text-ink-2 hover:bg-sunken" aria-label={`More copies of ${v.title}`}>
                  <Plus className="size-3.5" />
                </button>
              </div>
              <button type="button" tabIndex={-1} onClick={() => onChange(value.filter(x => x.title !== v.title))} className="h-7 w-7 grid place-items-center rounded-md text-ink-3 hover:bg-bad-soft hover:text-bad" aria-label={`Remove ${v.title}`}>
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
