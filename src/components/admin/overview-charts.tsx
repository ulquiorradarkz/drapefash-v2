"use client";

import Link from "next/link";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Eye, MousePointerClick, Package, Percent, type LucideIcon } from "lucide-react";
import type { DashboardData } from "@/lib/types";
import { storeName, STORE_META } from "@/lib/stores";
import { compactNumber } from "@/lib/format";

function ctr(clicks: number, views: number): string {
  if (!views) return clicks ? "n/a" : "0%";
  return `${((clicks / views) * 100).toFixed(1)}%`;
}

function Kpi({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="size-4" /> {label}
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Bars({ rows, label }: { rows: { key: string; label: string; value: number; color?: string }[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <h2 className="text-sm font-semibold">{label}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No clicks yet in this range.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex justify-between text-sm">
                <span>{r.label}</span>
                <span className="tabular-nums text-muted-foreground">{r.value}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? "linear-gradient(90deg,#7ee7ff,#b49cff)" }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const REGION = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
function countryLabel(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return code;
  try {
    return REGION?.of(code) ?? code;
  } catch {
    return code;
  }
}

export function OverviewCharts({ data, range }: { data: DashboardData; range: number }) {
  const rangeViews = range === 1 ? data.views.today : range === 7 ? data.views.d7 : data.views.d30;
  const rangeClicks = range === 1 ? data.clicks.today : range === 7 ? data.clicks.d7 : data.clicks.d30;
  const series = data.series.map((d) => ({ ...d, label: d.day.slice(5) }));

  return (
    <div className="min-w-0 space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Package} label="Products" value={compactNumber(data.products.total)} sub={`${data.products.published} published · ${data.products.featured} featured`} />
        <Kpi
          icon={Eye}
          label="Views"
          value={compactNumber(rangeViews)}
          sub={`Today ${data.views.today} · 7d ${data.views.d7} · 30d ${data.views.d30}`}
        />
        <Kpi
          icon={MousePointerClick}
          label="Clicks"
          value={compactNumber(rangeClicks)}
          sub={`Today ${data.clicks.today} · 7d ${data.clicks.d7} · 30d ${data.clicks.d30}`}
        />
        <Kpi
          icon={Percent}
          label="Click-through rate"
          value={ctr(rangeClicks, rangeViews)}
          sub={`Today ${ctr(data.clicks.today, data.views.today)} · 7d ${ctr(data.clicks.d7, data.views.d7)} · 30d ${ctr(data.clicks.d30, data.views.d30)}`}
        />
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <h2 className="text-sm font-semibold">Views and clicks over time</h2>
        <div className="mt-3 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#14141c", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: "#fff" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="views" name="Views" stroke="#7ee7ff" strokeWidth={2} dot={series.length < 3} />
              <Line type="monotone" dataKey="clicks" name="Clicks" stroke="#ff9de2" strokeWidth={2} dot={series.length < 3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <h2 className="text-sm font-semibold">Top 10 products by clicks</h2>
          {data.top_products.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No clicks yet in this range.</p>
          ) : (
            <ol className="mt-3 divide-y divide-white/5">
              {data.top_products.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-5 text-right tabular-nums text-muted-foreground">{i + 1}</span>
                  <Link href={`/admin/products/${p.id}`} className="min-w-0 flex-1 truncate hover:underline">
                    {p.title}
                  </Link>
                  <span className="hidden text-xs text-muted-foreground sm:inline">{storeName(p.store)}</span>
                  <span className="w-10 text-right font-semibold tabular-nums">{p.clicks}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <div className="grid gap-4">
          <Bars
            label="Clicks by store"
            rows={data.by_store.map((s) => ({ key: s.store, label: storeName(s.store), value: s.clicks, color: STORE_META[s.store]?.color }))}
          />
          <Bars label="Clicks by country" rows={data.by_country.map((c) => ({ key: c.country, label: countryLabel(c.country), value: c.clicks }))} />
        </div>
      </div>
    </div>
  );
}
