'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Row { district: string; challans: number; leads: number; pending_followups: number }

function TooltipBox({ active, payload }: { active?: boolean; payload?: Array<{ payload: Row }> }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 shadow-[var(--shadow-pop)] text-[12.5px]">
      <div className="font-semibold text-ink mb-1">{r.district}</div>
      <div className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-ink-2">
        <span>Challans</span><span className="font-mono text-ink text-right">{r.challans.toLocaleString('en-IN')}</span>
        <span>Leads</span><span className="font-mono text-ink text-right">{r.leads.toLocaleString('en-IN')}</span>
        <span>Open follow-ups</span><span className="font-mono text-ink text-right">{r.pending_followups.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}

// Horizontal bars, one series (challans), sorted high → low.
export default function DistrictChart({ data, onSelect }: { data: Row[]; onSelect?: (district: string) => void }) {
  const rows = data.filter(d => d.challans > 0).slice(0, 12);
  const height = Math.max(120, rows.length * 30 + 28);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 0 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} stroke="var(--color-line)" strokeWidth={1} />
          <XAxis
            type="number"
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-ink-3)', fontFamily: 'var(--font-mono)' }}
          />
          <YAxis
            type="category"
            dataKey="district"
            width={118}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'var(--color-ink-2)' }}
          />
          <Tooltip cursor={{ fill: 'var(--color-sunken)' }} content={<TooltipBox />} isAnimationActive={false} />
          <Bar
            dataKey="challans"
            name="Challans"
            fill="var(--color-chart-1)"
            radius={[0, 4, 4, 0]}
            maxBarSize={16}
            animationDuration={300}
            label={{ position: 'right', fontSize: 11, fill: 'var(--color-ink-2)', fontFamily: 'var(--font-mono)' }}
            cursor={onSelect ? 'pointer' : undefined}
            onClick={onSelect ? (d: { payload?: Row }) => d?.payload && onSelect(d.payload.district) : undefined}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
