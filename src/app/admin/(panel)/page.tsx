import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import type { DashboardData } from "@/lib/types";
import { OverviewCharts } from "@/components/admin/overview-charts";
import { cn } from "@/lib/utils";

const RANGES = [
  { value: 1, label: "Today" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
];

export default async function AdminOverview({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { supabase } = await requireAdminPage();
  const sp = await searchParams;
  const range = [1, 7, 30].includes(Number(sp.range)) ? Number(sp.range) : 30;
  const { data, error } = await supabase.rpc("admin_dashboard", { p_days: range });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-sm text-muted-foreground">Views come from visitors who accepted analytics. Clicks are every Shop Now redirect.</p>
        </div>
        <nav aria-label="Range" className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1">
          {RANGES.map((r) => (
            <Link
              key={r.value}
              href={`/admin?range=${r.value}`}
              aria-current={range === r.value ? "true" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                range === r.value && "bg-white/15 text-foreground",
              )}
            >
              {r.label}
            </Link>
          ))}
        </nav>
      </header>
      {error || !data ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Could not load statistics: {error?.message ?? "no data"}
        </p>
      ) : (
        <OverviewCharts data={data as DashboardData} range={range} />
      )}
    </div>
  );
}
