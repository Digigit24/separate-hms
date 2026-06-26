import { useMemo, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { useIPD } from '@/hooks/useIPD';
import type { IPDDoctorStat } from '@/types/ipd.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Bed,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  FileClock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';

type IPDStatsPeriod = 'today' | 'week' | 'month' | 'custom';

const fmt = (date: Date) => format(date, 'yyyy-MM-dd');
const today = () => fmt(new Date());

const PERIODS: { key: IPDStatsPeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'custom', label: 'Custom' },
];

function rangeForPeriod(period: IPDStatsPeriod, customFrom: string, customTo: string) {
  const now = new Date();
  switch (period) {
    case 'today':
      return { date_from: today(), date_to: today() };
    case 'week':
      return {
        date_from: fmt(startOfWeek(now, { weekStartsOn: 1 })),
        date_to: fmt(endOfWeek(now, { weekStartsOn: 1 })),
      };
    case 'month':
      return { date_from: fmt(startOfMonth(now)), date_to: fmt(endOfMonth(now)) };
    case 'custom':
      return { date_from: customFrom || today(), date_to: customTo || today() };
  }
}

function periodLabel(period: IPDStatsPeriod, dateFrom: string, dateTo: string) {
  if (period === 'today') return 'Today';
  if (period === 'week') return 'This Week';
  if (period === 'month') return 'This Month';
  if (dateFrom === dateTo) return format(parseISO(dateFrom), 'MMM d, yyyy');
  return `${format(parseISO(dateFrom), 'MMM d')} - ${format(parseISO(dateTo), 'MMM d, yyyy')}`;
}

function SummaryPill({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone?: 'default' | 'success' | 'warning' | 'muted';
}) {
  const tones = {
    default: 'border-border bg-background text-foreground',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300',
    warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300',
    muted: 'border-border bg-muted/40 text-muted-foreground',
  };

  return (
    <div className={cn('flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px]', tones[tone])}>
      <Icon className="h-3.5 w-3.5" />
      <span className="font-semibold">{value}</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
}

function DoctorCard({ stat }: { stat: IPDDoctorStat }) {
  const navigate = useNavigate();
  const pendingClaims = stat.claim_pending || 0;
  const completedClaims = (stat.claim_approved || 0) + (stat.claim_settled || 0);

  return (
    <Card className="border hover:shadow-md transition-shadow">
      <CardHeader className="px-4 pt-4 pb-2">
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
            onClick={() => navigate('/ipd/admissions')}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted/40 py-2 px-1">
            <p className="text-xl font-bold leading-none">{stat.admissions_count}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Admissions</p>
          </div>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 py-2 px-1">
            <p className="text-xl font-bold leading-none text-blue-700 dark:text-blue-300">{stat.active}</p>
            <p className="text-[10px] text-blue-700/70 dark:text-blue-300/70 mt-0.5">Active</p>
          </div>
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 py-2 px-1">
            <p className="text-xl font-bold leading-none text-emerald-700 dark:text-emerald-300">{stat.discharged}</p>
            <p className="text-[10px] text-emerald-700/70 dark:text-emerald-300/70 mt-0.5">Discharged</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="rounded-md">
            {stat.mediclaim_count} mediclaim
          </Badge>
          {pendingClaims > 0 && (
            <Badge className="rounded-md bg-amber-600 hover:bg-amber-600">
              {pendingClaims} pending claim
            </Badge>
          )}
          {completedClaims > 0 && (
            <Badge className="rounded-md bg-emerald-600 hover:bg-emerald-600">
              {completedClaims} approved/settled
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-2.5 text-xs">
          <span className="text-muted-foreground">Avg length of stay</span>
          <span className="font-semibold">
            {stat.avg_length_of_stay_days !== null ? `${stat.avg_length_of_stay_days} days` : '-'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function IPDDashboard() {
  const [period, setPeriod] = useState<IPDStatsPeriod>('today');
  const [customFrom, setCustomFrom] = useState(today());
  const [customTo, setCustomTo] = useState(today());
  const { useIPDDoctorStats, useAdmissionStatistics } = useIPD();

  const range = useMemo(
    () => rangeForPeriod(period, customFrom, customTo),
    [period, customFrom, customTo],
  );
  const admissionStatsRange = useMemo(
    () => ({
      admission_date__gte: range.date_from,
      admission_date__lte: range.date_to,
    }),
    [range.date_from, range.date_to],
  );

  const { data, isLoading, error, mutate } = useIPDDoctorStats(range);
  const { data: statsData, mutate: mutateStats } = useAdmissionStatistics(admissionStatsRange);
  const doctors = data?.data ?? [];
  const label = periodLabel(period, range.date_from, range.date_to);

  const totalAdmissions = doctors.reduce((sum, doctor) => sum + doctor.admissions_count, 0);
  const active = doctors.reduce((sum, doctor) => sum + doctor.active, 0);
  const discharged = doctors.reduce((sum, doctor) => sum + doctor.discharged, 0);
  const mediclaim = doctors.reduce((sum, doctor) => sum + doctor.mediclaim_count, 0);
  const pendingClaims = doctors.reduce((sum, doctor) => sum + doctor.claim_pending, 0);
  const settledClaims = doctors.reduce((sum, doctor) => sum + doctor.claim_settled, 0);
  const avgStay = statsData?.data?.avg_length_of_stay_days ?? null;

  return (
    <div className="p-4 md:p-5 w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold leading-none">IPD Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Doctor-wise admissions and claim workload - <span className="font-medium text-foreground">{label}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 gap-0.5">
            {PERIODS.map(({ key, label: periodText }) => (
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
                {periodText}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(event) => setCustomFrom(event.target.value || today())}
                className="h-8 text-xs w-32"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="date"
                value={customTo}
                min={customFrom}
                onChange={(event) => setCustomTo(event.target.value || today())}
                className="h-8 text-xs w-32"
              />
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              mutate();
              mutateStats();
            }}
            className="h-8 px-2"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <SummaryPill icon={Users} label="admissions" value={totalAdmissions} />
        <SummaryPill icon={Bed} label="active" value={active} />
        <SummaryPill icon={CheckCircle2} label="discharged" value={discharged} tone="success" />
        <SummaryPill icon={ShieldCheck} label="mediclaim" value={mediclaim} />
        <SummaryPill icon={FileClock} label="pending claims" value={pendingClaims} tone={pendingClaims > 0 ? 'warning' : 'muted'} />
        <SummaryPill icon={FileCheck2} label="settled" value={settledClaims} tone="success" />
        <SummaryPill icon={ClipboardList} label="avg stay" value={avgStay !== null ? `${avgStay}d` : '-'} tone="muted" />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item} className="animate-pulse">
              <CardContent className="p-4 space-y-3">
                <div className="h-8 bg-muted rounded" />
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((cell) => <div key={cell} className="h-12 bg-muted rounded-lg" />)}
                </div>
                <div className="h-4 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive font-medium">Failed to load IPD statistics</p>
          <p className="text-xs text-muted-foreground">{error.message}</p>
          <Button size="sm" variant="outline" onClick={() => mutate()}>Try Again</Button>
        </div>
      )}

      {!isLoading && !error && doctors.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Calendar className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No IPD admissions found</p>
          <p className="text-xs text-muted-foreground">No admissions recorded for {label}</p>
        </div>
      )}

      {!isLoading && doctors.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {doctors.map((doctor) => (
            <DoctorCard key={doctor.doctor_id || doctor.doctor} stat={doctor} />
          ))}
        </div>
      )}

      {data && (
        <p className="text-[10px] text-muted-foreground text-right">
          {label} - refreshes every 60s
        </p>
      )}
    </div>
  );
}
