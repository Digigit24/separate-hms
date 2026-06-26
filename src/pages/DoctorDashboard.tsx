// src/pages/DoctorDashboard.tsx
// Admin-facing per-doctor statistics dashboard with Today / Week / Month / Custom range.
import { useState, useMemo } from 'react';
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  parseISO, isValid,
} from 'date-fns';
import { useOpdVisit } from '@/hooks/useOpdVisit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Users, Clock, CheckCircle2, IndianRupee, Bed as BedIcon,
  Loader2, RefreshCw, Calendar, Stethoscope, Activity,
  ChevronRight, AlertCircle, TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DoctorStat, DoctorStatsPeriod } from '@/types/opdVisit.types';
import { cn } from '@/lib/utils';

// ─── period helpers ───────────────────────────────────────────────────────────
const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
const today = () => fmt(new Date());

function rangeForPeriod(period: DoctorStatsPeriod, customFrom: string, customTo: string) {
  const now = new Date();
  switch (period) {
    case 'today':
      return { dateFrom: today(), dateTo: today() };
    case 'week': {
      const s = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const e = endOfWeek(now, { weekStartsOn: 1 });
      return { dateFrom: fmt(s), dateTo: fmt(e) };
    }
    case 'month':
      return { dateFrom: fmt(startOfMonth(now)), dateTo: fmt(endOfMonth(now)) };
    case 'custom':
      return { dateFrom: customFrom || today(), dateTo: customTo || today() };
  }
}

function periodLabel(period: DoctorStatsPeriod, dateFrom: string, dateTo: string) {
  if (period === 'today') return 'Today';
  if (period === 'week')  return 'This Week';
  if (period === 'month') return 'This Month';
  if (dateFrom === dateTo) return format(parseISO(dateFrom), 'MMM d, yyyy');
  return `${format(parseISO(dateFrom), 'MMM d')} – ${format(parseISO(dateTo), 'MMM d, yyyy')}`;
}

// ─── Period pill buttons ──────────────────────────────────────────────────────
const PERIODS: { key: DoctorStatsPeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'custom', label: 'Custom' },
];

// ─── Stat mini-badge ──────────────────────────────────────────────────────────
function StatBadge({ label, value, icon: Icon, variant = 'default' }: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'success' | 'warning' | 'muted';
}) {
  const colors = {
    default:  'bg-muted/60 text-foreground',
    success:  'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    warning:  'bg-amber-50  text-amber-700  dark:bg-amber-950  dark:text-amber-300',
    muted:    'bg-muted/40  text-muted-foreground',
  };
  return (
    <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${colors[variant]}`}>
      <Icon className="h-3 w-3" />
      <span>{value}</span>
      <span className="text-[10px] opacity-70">{label}</span>
    </div>
  );
}

// ─── Doctor card ──────────────────────────────────────────────────────────────
function DoctorStatCard({ stat, isSingleDay, periodLabel: pLabel }: {
  stat: DoctorStat;
  isSingleDay: boolean;
  periodLabel: string;
}) {
  const navigate = useNavigate();
  const visits = stat.visits_count ?? stat.visits_today;
  const revenue = parseFloat(stat.revenue ?? stat.revenue_today ?? '0');

  return (
    <Card className="hover:shadow-md transition-shadow border">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Stethoscope className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold truncate">
                {stat.doctor_name.startsWith('Dr.') ? stat.doctor_name : `Dr. ${stat.doctor_name}`}
              </CardTitle>
              {stat.doctor_specialty && (
                <p className="text-[11px] text-muted-foreground truncate">{stat.doctor_specialty}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => navigate(`/opd/visits?doctor=${stat.doctor}`)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Main stats row */}
        <div className={cn('grid gap-2 text-center', isSingleDay ? 'grid-cols-3' : 'grid-cols-2')}>
          {/* Visits */}
          <div className="rounded-lg bg-muted/40 py-2 px-1">
            <p className="text-xl font-bold leading-none">{visits}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {isSingleDay ? 'Today' : 'Visits'}
            </p>
          </div>

          {/* Completed */}
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 py-2 px-1">
            <p className="text-xl font-bold leading-none text-emerald-600 dark:text-emerald-400">
              {stat.completed}
            </p>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Done</p>
          </div>

          {/* Waiting — only meaningful for today */}
          {isSingleDay && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 py-2 px-1">
              <p className="text-xl font-bold leading-none text-amber-600 dark:text-amber-400">
                {stat.waiting}
              </p>
              <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">Waiting</p>
            </div>
          )}
        </div>

        {/* Secondary badges */}
        <div className="flex flex-wrap gap-1.5">
          {isSingleDay && stat.in_consultation > 0 && (
            <StatBadge label="in consult" value={stat.in_consultation} icon={Activity} variant="warning" />
          )}
          {stat.avg_consultation_mins !== null && (
            <StatBadge label="avg min" value={stat.avg_consultation_mins} icon={Clock} variant="muted" />
          )}
          {stat.ipd_admissions > 0 && (
            <StatBadge label="IPD active" value={stat.ipd_admissions} icon={BedIcon} variant="default" />
          )}
        </div>

        {/* Revenue */}
        <div className="flex items-center justify-between border-t pt-2.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <IndianRupee className="h-3 w-3" />
            <span>Revenue {isSingleDay ? 'today' : `(${pLabel})`}</span>
          </div>
          <span className="text-sm font-semibold">
            ₹{revenue.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Completion bar */}
        {visits > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Completion rate</span>
              <span>{stat.completed}/{visits}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.round((stat.completed / visits) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DoctorDashboard() {
  const [period, setPeriod] = useState<DoctorStatsPeriod>('today');
  const [customFrom, setCustomFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customTo, setCustomTo]     = useState(format(new Date(), 'yyyy-MM-dd'));

  const range = useMemo(
    () => rangeForPeriod(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  const { useDoctorStats } = useOpdVisit();
  const { data, isLoading, error, mutate } = useDoctorStats(range);

  const doctors: DoctorStat[] = data?.data ?? [];
  const isSingleDay = data?.is_single_day ?? (range.dateFrom === range.dateTo);
  const pLabel = periodLabel(period, range.dateFrom, range.dateTo);

  const totalVisits    = doctors.reduce((s, d) => s + (d.visits_count ?? d.visits_today), 0);
  const totalWaiting   = doctors.reduce((s, d) => s + d.waiting, 0);
  const totalCompleted = doctors.reduce((s, d) => s + d.completed, 0);
  const totalRevenue   = doctors.reduce((s, d) => s + parseFloat(d.revenue ?? d.revenue_today ?? '0'), 0);
  const totalIPD       = doctors.reduce((s, d) => s + d.ipd_admissions, 0);

  return (
    <div className="p-4 md:p-5 w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold leading-none">Doctor Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Per-doctor performance · <span className="font-medium text-foreground">{pLabel}</span>
          </p>
        </div>

        {/* Period picker + refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period pills */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 gap-0.5">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  period === key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          {period === 'custom' && (
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value || today())}
                className="h-8 text-xs w-32"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="date"
                value={customTo}
                min={customFrom}
                onChange={(e) => setCustomTo(e.target.value || today())}
                className="h-8 text-xs w-32"
              />
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            className="h-8 px-2"
            disabled={isLoading}
          >
            {isLoading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="h-3.5 w-3.5" />
            }
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      {doctors.length > 0 && (
        <div className="flex flex-wrap gap-2 text-[12px]">
          <div className="flex items-center gap-1.5 rounded-md border px-3 py-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold">{totalVisits}</span>
            <span className="text-muted-foreground">total visits</span>
          </div>
          {isSingleDay && (
            <div className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-400">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-semibold">{totalWaiting}</span>
              <span className="opacity-80">waiting</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="font-semibold">{totalCompleted}</span>
            <span className="opacity-80">completed</span>
          </div>
          {totalIPD > 0 && (
            <div className="flex items-center gap-1.5 rounded-md border px-3 py-1.5">
              <BedIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">{totalIPD}</span>
              <span className="text-muted-foreground">IPD active</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-md border px-3 py-1.5">
            <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold">₹{totalRevenue.toLocaleString('en-IN')}</span>
            <span className="text-muted-foreground">revenue</span>
          </div>
          {totalVisits > 0 && (
            <div className="flex items-center gap-1.5 rounded-md border px-3 py-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">{Math.round((totalCompleted / totalVisits) * 100)}%</span>
              <span className="text-muted-foreground">completion</span>
            </div>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 space-y-3">
                <div className="h-8 bg-muted rounded" />
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((j) => <div key={j} className="h-12 bg-muted rounded-lg" />)}
                </div>
                <div className="h-4 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive font-medium">Failed to load doctor statistics</p>
          <p className="text-xs text-muted-foreground">{error.message}</p>
          <Button size="sm" variant="outline" onClick={() => mutate()}>Try Again</Button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && doctors.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Calendar className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No visits found</p>
          <p className="text-xs text-muted-foreground">No visits recorded for {pLabel}</p>
        </div>
      )}

      {/* Doctor cards */}
      {!isLoading && doctors.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {doctors.map((stat) => (
            <DoctorStatCard
              key={stat.doctor}
              stat={stat}
              isSingleDay={isSingleDay}
              periodLabel={pLabel}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {data && (
        <p className="text-[10px] text-muted-foreground text-right">
          {pLabel} · refreshes every 60s
        </p>
      )}
    </div>
  );
}
