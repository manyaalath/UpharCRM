import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight, BookOpen, Check, FilePlus2, FileSpreadsheet, Keyboard, LayoutDashboard, MapPin, Newspaper, Phone,
  PhoneCall, Search, ShieldCheck, Smartphone, Users,
} from 'lucide-react';
import { LinkButton, buttonClass } from '@/components/ui';
import InstallButton from '@/components/pwa/InstallButton';
import { BIHAR_DISTRICTS, JHARKHAND_DISTRICTS } from '@/lib/constants';
import { CALL_OUTCOME_OPTIONS } from '@/lib/types';

export const metadata: Metadata = {
  title: { absolute: 'Uphar CRM — specimen distribution for Uphar Prakashan' },
  description: 'Every specimen book handed to a teacher becomes a lead, a follow-up call and a number on the district map.',
};

// Signed-in users never see this page: the proxy sends them to their desk.

const STEPS = [
  {
    n: '01',
    title: 'A paper challan is keyed in',
    body: 'The operator types it in the order it is printed. The pincode fills state and district; the phone number is checked against existing leads as it is typed.',
  },
  {
    n: '02',
    title: 'It becomes a lead',
    body: 'A new number creates a lead. A known number attaches the visit to that teacher’s history, so one person is never counted twice.',
  },
  {
    n: '03',
    title: 'A follow-up is queued',
    body: 'Fifteen days after the visit, the teacher appears in the call queue. Overdue calls rise to the top on their own.',
  },
  {
    n: '04',
    title: 'The call is logged in one tap',
    body: 'The telecaller sees the books given and past calls, picks an outcome and the next date. The overview updates for the manager.',
  },
];

const DESKS = [
  {
    icon: PhoneCall,
    name: 'CRM',
    who: 'Admins, managers, telecallers',
    points: ['Call queue with overdue first', 'Lead history: visits, calls, books', 'District, rep and title analytics'],
  },
  {
    icon: FilePlus2,
    name: 'Challan entry',
    who: 'Back-office operators',
    points: ['Enter moves to the next field', 'Bulk import from Excel', 'Duplicates reviewed before saving'],
  },
  {
    icon: BookOpen,
    name: 'Book catalogue',
    who: 'Catalogue team',
    points: ['Add titles one by one or paste a list', 'Upload a sheet of titles', 'See copies given per title'],
  },
];

const DETAILS = [
  { icon: Keyboard, title: 'Built for the keyboard', body: 'Number keys pick a call outcome. Ctrl + Enter saves. Operators key a whole stack of challans without touching the mouse.' },
  { icon: FileSpreadsheet, title: 'Excel in, Excel out', body: 'Import a filled template, resolve duplicates side by side, and export leads, challans or analytics back to a sheet.' },
  { icon: Search, title: 'Find anyone in two keystrokes', body: 'Ctrl + K searches every lead by name, phone, institute or lead ID, and every challan by number.' },
  { icon: LayoutDashboard, title: 'Numbers a manager can act on', body: 'Challans by district, rep performance, books given and who needs a call today — for any date range.' },
  { icon: Newspaper, title: 'A morning brief', body: 'An optional AI summary of today’s queue and rep workload, always shown next to the live counts it was written from.' },
  { icon: ShieldCheck, title: 'Access by approval', body: 'New accounts wait for an admin. Each role opens only its own desk, and revoked access ends on the next page load.' },
];

function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-baseline gap-2 ${className}`}>
      <span className="font-deva text-[21px] font-bold text-ink leading-none">उपहार प्रकाशन</span>
      <span className="text-[10.5px] font-semibold tracking-[0.1em] text-ink-3">CRM</span>
    </span>
  );
}

// Hero illustration: a paper challan on the left becomes a lead with a queued call.
function ChallanToLead() {
  const dotted = 'flex items-baseline gap-2 after:order-2 after:flex-1 after:border-b after:border-dotted after:border-line-strong after:translate-y-[-3px] [&>span:last-child]:order-3';
  return (
    <figure className="relative mx-auto w-full max-w-[520px] pb-10 sm:pb-16" aria-label="Illustration: a paper challan becomes a lead with a follow-up call">
      {/* The paper slip */}
      <div className="relative w-[82%] -rotate-2 rounded-[3px] border border-line-strong bg-[#fffdf7] px-5 py-4 shadow-[var(--shadow-pop)] animate-rise [animation-delay:120ms]">
        <div className="flex items-start justify-between gap-3 border-b border-dashed border-line-strong pb-2.5">
          <div>
            <div className="font-deva text-[15px] font-bold leading-none text-ink">उपहार प्रकाशन</div>
            <div className="mt-1 font-mono text-[9.5px] tracking-[0.14em] text-ink-3">SPECIMEN CHALLAN</div>
          </div>
          <div className="text-right font-mono text-[11px] leading-snug text-ink-2">
            <div>No. <span className="text-accent font-semibold">4127</span></div>
            <div>14-11-2026</div>
          </div>
        </div>
        <dl className="mt-3 space-y-1.5 font-mono text-[11.5px] text-ink">
          <div className={dotted}><dt className="text-ink-3">Teacher</dt><span>Anita Kumari</span></div>
          <div className={dotted}><dt className="text-ink-3">School</dt><span>Middle School, Bihta</span></div>
          <div className={dotted}><dt className="text-ink-3">Mobile</dt><span>98765 43210</span></div>
          <div className={dotted}><dt className="text-ink-3">PIN</dt><span>801103</span></div>
        </dl>
        <div className="mt-3 border-t border-dashed border-line-strong pt-2.5 font-mono text-[11px] text-ink-2">
          <div className="flex justify-between"><span>Hindi Vyakaran · Class 8</span><span>×1</span></div>
          <div className="flex justify-between"><span>Ganit · Class 10</span><span>×2</span></div>
        </div>
      </div>

      {/* The lead it turns into */}
      <div className="absolute bottom-0 right-0 w-[78%] rounded-lg border border-line bg-surface shadow-[var(--shadow-pop)] animate-rise [animation-delay:420ms]">
        <div className="flex items-start justify-between gap-3 px-4 pt-3.5">
          <div className="min-w-0">
            <div className="font-serif text-[18px] font-semibold leading-tight text-ink">Anita Kumari</div>
            <div className="mt-0.5 truncate text-[12px] text-ink-2">Middle School, Bihta</div>
          </div>
          <span className="inline-flex h-5.5 shrink-0 items-center gap-1.5 rounded-sm bg-info-soft px-2 text-[11.5px] font-medium leading-none text-info">
            <span className="size-1.5 rounded-full bg-info" aria-hidden />New
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3 px-4 text-[11.5px] text-ink-3">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3" />Patna</span>
          <span className="inline-flex items-center gap-1"><BookOpen className="size-3" />3 copies</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
          <span className="text-[12px] text-ink-2">Follow-up call <span className="font-medium text-warn">in 15 days</span></span>
          <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-accent px-2.5 text-[11.5px] font-medium text-white">
            <Phone className="size-3" />Call
          </span>
        </div>
      </div>

      <figcaption className="absolute -bottom-6 left-0 text-[11px] text-ink-3">Illustration · sample data</figcaption>
    </figure>
  );
}

export default function LandingPage() {
  const districts = BIHAR_DISTRICTS.length + JHARKHAND_DISTRICTS.length;

  const facts = [
    { value: String(districts), label: 'districts mapped', sub: `${BIHAR_DISTRICTS.length} in Bihar · ${JHARKHAND_DISTRICTS.length} in Jharkhand` },
    { value: '15', label: 'days to the first call', sub: 'Queued automatically after every visit' },
    { value: String(CALL_OUTCOME_OPTIONS.length), label: 'call outcomes', sub: 'One key each, from “busy” to “interested”' },
    { value: '3', label: 'desks, one sign-in', sub: 'CRM · challan entry · catalogue' },
  ];

  return (
    <div className="min-h-dvh bg-paper text-ink">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur pt-[var(--safe-t)]">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Uphar CRM home"><Wordmark /></Link>
          <nav className="hidden items-center gap-6 text-[13.5px] text-ink-2 md:flex" aria-label="Sections">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#desks" className="hover:text-ink">Desks</a>
            <a href="#details" className="hover:text-ink">Details</a>
            <a href="#install" className="hover:text-ink">Install</a>
          </nav>
          <div className="flex items-center gap-1.5">
            <Link href="/login?mode=request" className={buttonClass('ghost', 'md', 'hidden sm:inline-flex')}>Request access</Link>
            <LinkButton href="/login" variant="primary">Sign in</LinkButton>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-line">
          <div className="pointer-events-none absolute inset-0 ledger-rules" aria-hidden />
          <div className="pointer-events-none absolute -right-10 -top-24 select-none font-deva text-[420px] font-bold leading-none text-ink/[0.035] sm:text-[560px]" aria-hidden>उ</div>

          <div className="relative mx-auto grid max-w-[1180px] items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-8 lg:py-24">
            <div className="animate-rise">
              <p className="inline-flex items-center gap-2 text-[12.5px] font-medium text-ink-2">
                <span className="h-px w-6 bg-accent" aria-hidden />
                Specimen distribution CRM · Bihar &amp; Jharkhand
              </p>
              <h1 className="mt-4 font-serif text-[38px] font-semibold leading-[1.08] tracking-[-0.02em] text-ink text-balance sm:text-[52px] lg:text-[58px]">
                Every specimen handed to a teacher is the start of a <em className="not-italic text-accent">relationship</em>.
              </h1>
              <p className="mt-5 max-w-[520px] text-[16px] leading-relaxed text-ink-2 sm:text-[17px]">
                Uphar CRM turns each paper challan into a lead, a follow-up call and a number on the district map — so no
                book that leaves the godown is forgotten.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-2.5">
                <LinkButton href="/login" variant="primary" size="lg" className="flex-1 sm:flex-none">
                  Sign in <ArrowRight className="size-4" />
                </LinkButton>
                <LinkButton href="/login?mode=request" size="lg" className="flex-1 sm:flex-none">Request access</LinkButton>
                <InstallButton size="lg" variant="ghost" />
              </div>
              <p className="mt-4 text-[12.5px] text-ink-3">For Uphar Prakashan staff. New accounts are approved by an admin.</p>
            </div>

            <ChallanToLead />
          </div>
        </section>

        {/* Facts — every number here comes from how the app is configured. */}
        <section aria-label="At a glance" className="border-b border-line bg-surface">
          <dl className="mx-auto grid max-w-[1180px] grid-cols-2 lg:grid-cols-4">
            {facts.map((f, i) => (
              <div
                key={f.label}
                className={`px-4 py-6 sm:px-6 lg:px-8 lg:py-8 ${i % 2 === 1 ? 'border-l border-line' : ''} ${i >= 2 ? 'border-t border-line lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}
              >
                <dd className="font-mono text-[34px] font-medium leading-none text-ink tabular sm:text-[40px]">{f.value}</dd>
                <dt className="mt-2 text-[13.5px] font-semibold text-ink">{f.label}</dt>
                <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{f.sub}</p>
              </div>
            ))}
          </dl>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-16 border-b border-line">
          <div className="mx-auto max-w-[1180px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <SectionHead eyebrow="How it works" title="From a paper slip to a phone call, without anyone remembering to" />
            <ol className="mt-10 grid gap-x-8 border-t border-line-strong md:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(s => (
                <li key={s.n} className="border-b border-line py-6 md:[&:nth-child(n+3)]:border-b-0 lg:border-b-0">
                  <div className="font-mono text-[13px] font-medium text-accent">{s.n}</div>
                  <h3 className="mt-2 font-serif text-[20px] font-semibold leading-snug text-ink">{s.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Desks */}
        <section id="desks" className="scroll-mt-16 border-b border-line bg-surface">
          <div className="mx-auto max-w-[1180px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <SectionHead eyebrow="Three desks" title="One sign-in. Your account opens the right screen." />
            <div className="mt-10 grid divide-y divide-line border-y border-line md:grid-cols-3 md:divide-x md:divide-y-0">
              {DESKS.map(d => (
                <div key={d.name} className="py-7 md:px-7 md:first:pl-0 md:last:pr-0">
                  <d.icon className="size-5 text-accent" aria-hidden />
                  <h3 className="mt-3 font-serif text-[22px] font-semibold text-ink">{d.name}</h3>
                  <p className="mt-0.5 text-[12.5px] text-ink-3">{d.who}</p>
                  <ul className="mt-4 space-y-2">
                    {d.points.map(p => (
                      <li key={p} className="flex items-start gap-2 text-[14px] text-ink-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />{p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Details */}
        <section id="details" className="scroll-mt-16 border-b border-line">
          <div className="mx-auto max-w-[1180px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <SectionHead eyebrow="Details" title="Made for people who do this all day" />
            <div className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {DETAILS.map(d => (
                <div key={d.title} className="border-l-2 border-line-strong pl-4">
                  <d.icon className="size-[18px] text-ink-3" aria-hidden />
                  <h3 className="mt-2.5 text-[15px] font-semibold text-ink">{d.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{d.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Install */}
        <section id="install" className="scroll-mt-16 border-b border-line bg-ink text-white">
          <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:px-8">
            <div>
              <p className="inline-flex items-center gap-2 text-[12.5px] font-medium text-white/60">
                <Smartphone className="size-4" aria-hidden /> Works as an app
              </p>
              <h2 className="mt-3 font-serif text-[30px] font-semibold leading-[1.15] tracking-[-0.01em] text-balance sm:text-[38px]">
                Keep the call queue one tap from the home screen
              </h2>
              <p className="mt-4 max-w-[460px] text-[15px] leading-relaxed text-white/70">
                Install Uphar CRM on a phone or computer. It opens in its own window, takes almost no storage and
                updates itself — there is nothing to download from a store.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <InstallButton
                  size="lg"
                  variant="primary"
                  fallback={<span className="text-[13px] text-white/60">Open this page on your phone or in Chrome or Edge to install.</span>}
                />
              </div>
            </div>
            <ol className="divide-y divide-white/15 border-y border-white/15 text-[14px]">
              {[
                ['Android', 'Tap Install app above, or open the browser menu and choose “Install app”.'],
                ['iPhone and iPad', 'In Safari, tap Share, then “Add to Home Screen”.'],
                ['Windows and Mac', 'In Chrome or Edge, click the install icon at the end of the address bar.'],
              ].map(([device, how]) => (
                <li key={device} className="grid gap-1 py-4 sm:grid-cols-[150px_1fr] sm:gap-4">
                  <span className="font-semibold">{device}</span>
                  <span className="leading-relaxed text-white/70">{how}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Closing */}
        <section>
          <div className="mx-auto flex max-w-[1180px] flex-col items-start gap-6 px-4 py-14 sm:px-6 sm:py-16 md:flex-row md:items-center md:justify-between lg:px-8">
            <div>
              <h2 className="font-serif text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">Today’s calls are waiting.</h2>
              <p className="mt-1.5 flex items-center gap-2 text-[14px] text-ink-2">
                <Users className="size-4 text-ink-3" aria-hidden /> Sign in with your work email to open your desk.
              </p>
            </div>
            <div className="flex w-full flex-wrap gap-2.5 md:w-auto">
              <LinkButton href="/login" variant="primary" size="lg" className="flex-1 md:flex-none">Sign in <ArrowRight className="size-4" /></LinkButton>
              <LinkButton href="/login?mode=request" size="lg" className="flex-1 md:flex-none">Request access</LinkButton>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-sunken/60 pb-[var(--safe-b)]">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-4 py-7 text-[12.5px] text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Wordmark />
          <p>Internal tool · Bihar &amp; Jharkhand · restricted access</p>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-[640px]">
      <p className="inline-flex items-center gap-2 text-[12.5px] font-medium text-ink-2">
        <span className="h-px w-6 bg-accent" aria-hidden />{eyebrow}
      </p>
      <h2 className="mt-3 font-serif text-[28px] font-semibold leading-[1.15] tracking-[-0.01em] text-ink text-balance sm:text-[36px]">{title}</h2>
    </div>
  );
}
