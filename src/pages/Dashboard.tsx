import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useTheme } from 'next-themes';
import {
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  FileText,
  Loader2,
  ArrowRight,
  ClipboardList,
  Activity,
  IndianRupee,
  UserPlus,
  Stethoscope,
  Receipt,
  Microscope,
  Pill,
  ChevronRight,
} from 'lucide-react';
import { usePatient } from '@/hooks/usePatient';
import { useOpdVisit } from '@/hooks/useOpdVisit';
import { useOPDBill } from '@/hooks/useOPDBill';

// ==================== TOGGLE BETWEEN DEMO & REAL DATA ====================
const USE_DEMO_DATA = true;
// ========================================================================

const DEMO_DATA = {
  patients: {
    total_patients: 1247,
    active_patients: 1180,
    inactive_patients: 52,
    deceased_patients: 15,
    patients_with_insurance: 834,
    average_age: 42.5,
    total_visits: 4832,
    gender_distribution: { Male: 687, Female: 523, Other: 37 },
    blood_group_distribution: { 'A+': 342, 'A-': 87, 'B+': 298, 'B-': 64, 'AB+': 156, 'AB-': 43, 'O+': 187, 'O-': 70 },
  },
  visits: {
    total_visits: 4832,
    today_visits: 48,
    waiting_patients: 12,
    in_progress_patients: 5,
    completed_today: 31,
    average_waiting_time: '15 mins',
    visits_by_type: { new: 1245, follow_up: 2987, emergency: 432, referral: 168 },
    visits_by_status: { waiting: 12, in_progress: 5, completed: 4698, cancelled: 87, no_show: 30 },
    revenue_today: '45680',
    pending_payments: 23,
  },
  bills: {
    total_bills: 3421,
    total_amount: '12450000',
    received_amount: '10890000',
    balance_amount: '1560000',
    paid_bills: 2856,
    unpaid_bills: 398,
    partial_bills: 167,
  },
};

const Dashboard = () => {
  const navigate = useNavigate();

  const { usePatientStatistics } = usePatient();
  const { useOpdVisitStatistics } = useOpdVisit();
  const { useOPDBillStatistics } = useOPDBill();

  const { data: realPatientStats, isLoading: patientLoading } = usePatientStatistics();
  const { data: realVisitStats, isLoading: visitLoading } = useOpdVisitStatistics();
  const { data: realBillStats, isLoading: billLoading } = useOPDBillStatistics();

  const patientStats = USE_DEMO_DATA ? DEMO_DATA.patients : realPatientStats;
  const visitStats = USE_DEMO_DATA ? DEMO_DATA.visits : realVisitStats;
  const billStats = USE_DEMO_DATA ? DEMO_DATA.bills : realBillStats;
  const isLoading = USE_DEMO_DATA ? false : (patientLoading || visitLoading || billLoading);

  const pendingBills = (billStats?.unpaid_bills || 0) + (billStats?.partial_bills || 0);

  // Quick nav items
  const quickNav = [
    { label: 'Patients', desc: 'Manage records', icon: UserPlus, path: '/patients' },
    { label: 'OPD Visits', desc: 'Track visits', icon: ClipboardList, path: '/opd/visits' },
    { label: 'OPD Bills', desc: 'View billing', icon: Receipt, path: '/opd/bills' },
    { label: 'Diagnostics', desc: 'Lab & reports', icon: Microscope, path: '/diagnostics' },
  ];

  return (
    <div className="flex-1 p-4 md:p-5 overflow-auto bg-background">
      <div className="w-full space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Welcome back! Here's your hospital overview.</p>
          </div>
          {USE_DEMO_DATA && (
            <span className="text-[11px] font-medium px-2 py-1 rounded-md border border-border text-muted-foreground">
              Demo Mode
            </span>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Patients"
            value={patientStats?.total_patients?.toLocaleString() || '0'}
            change="+12%"
            changeUp={true}
            icon={<Users className="w-4 h-4" />}
            loading={isLoading}
          />
          <StatCard
            title="Today's Visits"
            value={visitStats?.today_visits?.toLocaleString() || '0'}
            change="+5%"
            changeUp={true}
            icon={<Calendar className="w-4 h-4" />}
            loading={isLoading}
          />
          <StatCard
            title="Revenue"
            value={`₹${parseFloat(billStats?.received_amount || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            change="+8%"
            changeUp={true}
            icon={<IndianRupee className="w-4 h-4" />}
            loading={isLoading}
          />
          <StatCard
            title="Pending Bills"
            value={pendingBills.toString()}
            change="-3%"
            changeUp={false}
            icon={<FileText className="w-4 h-4" />}
            loading={isLoading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Activity & Quick Nav */}
          <div className="lg:col-span-2 space-y-4">
            {/* Quick Navigation */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quickNav.map((item) => (
                <Card
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="group cursor-pointer p-3 hover:shadow-sm transition-all border-border"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors">
                      <item.icon className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-foreground truncate">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Recent Activities */}
            <RecentActivitiesTable />
          </div>

          {/* Right Column - Summary Cards */}
          <div className="space-y-4">
            {/* Visit Breakdown */}
            <Card className="p-4 border-border">
              <h3 className="text-[13px] font-semibold text-foreground mb-3">Visit Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: 'Completed', value: visitStats?.visits_by_status?.completed || 0, total: visitStats?.total_visits || 1 },
                  { label: 'In Progress', value: visitStats?.visits_by_status?.in_progress || 0, total: visitStats?.total_visits || 1 },
                  { label: 'Waiting', value: visitStats?.visits_by_status?.waiting || 0, total: visitStats?.total_visits || 1 },
                  { label: 'Cancelled', value: visitStats?.visits_by_status?.cancelled || 0, total: visitStats?.total_visits || 1 },
                ].map((item) => {
                  const pct = Math.round((item.value / item.total) * 100);
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium text-foreground">{item.value.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-neutral-900 dark:bg-neutral-200 rounded-full transition-all"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Payment Summary */}
            <Card className="p-4 border-border">
              <h3 className="text-[13px] font-semibold text-foreground mb-3">Payment Summary</h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">Total Bills</span>
                  <span className="text-[12px] font-medium text-foreground">{(billStats?.total_bills || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">Paid</span>
                  <span className="text-[12px] font-medium text-green-600 dark:text-green-400">{(billStats?.paid_bills || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">Unpaid</span>
                  <span className="text-[12px] font-medium text-red-600 dark:text-red-400">{(billStats?.unpaid_bills || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">Partial</span>
                  <span className="text-[12px] font-medium text-amber-600 dark:text-amber-400">{(billStats?.partial_bills || 0).toLocaleString()}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-muted-foreground">Balance</span>
                    <span className="text-[13px] font-semibold text-foreground">
                      ₹{parseFloat(billStats?.balance_amount || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Patient Demographics */}
            <Card className="p-4 border-border">
              <h3 className="text-[13px] font-semibold text-foreground mb-3">Patient Demographics</h3>
              <div className="space-y-2.5">
                {patientStats?.gender_distribution && Object.entries(patientStats.gender_distribution).map(([gender, count]) => {
                  const total = patientStats.total_patients || 1;
                  const pct = Math.round(((count as number) / total) * 100);
                  return (
                    <div key={gender} className="flex items-center gap-3">
                      <span className="text-[12px] text-muted-foreground w-14">{gender}</span>
                      <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-neutral-900 dark:bg-neutral-200 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-foreground w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
                <div className="pt-2 mt-1 border-t border-border flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">Avg. Age</span>
                  <span className="text-[12px] font-medium text-foreground">{patientStats?.average_age || '-'} yrs</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== STAT CARD ====================
interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeUp: boolean;
  icon: React.ReactNode;
  loading?: boolean;
}

const StatCard = ({ title, value, change, changeUp, icon, loading }: StatCardProps) => (
  <Card className="p-4 border-border">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[12px] text-muted-foreground font-medium">{title}</p>
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-2" />
        ) : (
          <p className="text-2xl font-bold text-foreground mt-1 tracking-tight">{value}</p>
        )}
      </div>
      <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
        {icon}
      </div>
    </div>
    {!loading && (
      <div className="mt-2 flex items-center gap-1">
        {changeUp ? (
          <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />
        ) : (
          <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400" />
        )}
        <span className={`text-[11px] font-medium ${changeUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {change}
        </span>
        <span className="text-[11px] text-muted-foreground ml-0.5">from last period</span>
      </div>
    )}
  </Card>
);

// ==================== RECENT ACTIVITIES TABLE ====================
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import { format } from 'date-fns';
import { useIPD } from '@/hooks/useIPD';
import { OpdVisit } from '@/types/opdVisit.types';
import { Admission } from '@/types/ipd.types';

const RecentActivitiesTable = () => {
  const navigate = useNavigate();
  const { useOpdVisits } = useOpdVisit();
  const { useAdmissions } = useIPD();

  const { data: opdData, isLoading: opdLoading } = useOpdVisits({ page_size: 5, ordering: '-visit_date' });
  const { data: ipdData, isLoading: ipdLoading } = useAdmissions({ page_size: 5, ordering: '-admission_date' });

  const opdVisits = opdData?.results || [];
  const ipdAdmissions = ipdData?.results || [];

  const opdColumns: DataTableColumn<OpdVisit>[] = [
    {
      header: 'Visit ID',
      key: 'visit_number',
      accessor: (row) => row.visit_number,
      cell: (row) => <span className="font-mono text-[11px]">{row.visit_number}</span>,
    },
    {
      header: 'Patient',
      key: 'patient_name',
      accessor: (row) => row.patient_name || row.patient_details?.full_name || 'N/A',
      cell: (row) => <span className="text-[12px] font-medium">{row.patient_name || row.patient_details?.full_name}</span>,
    },
    {
      header: 'Doctor',
      key: 'doctor_name',
      accessor: (row) => row.doctor_name || row.doctor_details?.full_name || 'N/A',
      cell: (row) => <span className="text-[12px] text-muted-foreground">{row.doctor_name || row.doctor_details?.full_name}</span>,
    },
    {
      header: 'Status',
      key: 'status',
      accessor: (row) => row.status,
      cell: (row) => (
        <span className={`px-1.5 py-0.5 rounded text-[11px] capitalize ${
          row.status === 'completed' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
          row.status === 'in_progress' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
          'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
        }`}>
          {row.status?.replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Date',
      key: 'visit_date',
      accessor: (row) => row.visit_date,
      cell: (row) => <span className="text-[11px] text-muted-foreground">{format(new Date(row.visit_date), 'MMM dd, HH:mm')}</span>,
    },
  ];

  const ipdColumns: DataTableColumn<Admission>[] = [
    {
      header: 'Admission ID',
      key: 'admission_id',
      accessor: (row) => row.admission_id,
      cell: (row) => <span className="font-mono text-[11px]">{row.admission_id}</span>,
    },
    {
      header: 'Patient',
      key: 'patient_name',
      accessor: (row) => row.patient_name || '',
      cell: (row) => <span className="text-[12px] font-medium">{row.patient_name}</span>,
    },
    {
      header: 'Ward/Bed',
      key: 'ward_name',
      accessor: (row) => row.ward_name,
      cell: (row) => (
        <div className="flex flex-col">
          <span className="text-[12px]">{row.ward_name}</span>
          <span className="text-[11px] text-muted-foreground">Bed: {row.bed_number || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      accessor: (row) => row.status,
      cell: (row) => (
        <span className={`px-1.5 py-0.5 rounded text-[11px] capitalize ${
          row.status === 'admitted' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
          row.status === 'discharged' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
          'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
        }`}>
          {row.status}
        </span>
      ),
    },
    {
      header: 'Date',
      key: 'admission_date',
      accessor: (row) => row.admission_date,
      cell: (row) => <span className="text-[11px] text-muted-foreground">{format(new Date(row.admission_date), 'MMM dd, HH:mm')}</span>,
    },
  ];

  return (
    <Card className="border-border overflow-hidden">
      <Tabs defaultValue="opd" className="w-full">
        <div className="px-4 pt-3 pb-0 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-foreground">Recent Activity</h3>
          <TabsList className="h-7 p-0.5 bg-neutral-100 dark:bg-neutral-800">
            <TabsTrigger value="opd" className="text-[11px] h-6 px-2.5 data-[state=active]:bg-background">OPD</TabsTrigger>
            <TabsTrigger value="ipd" className="text-[11px] h-6 px-2.5 data-[state=active]:bg-background">IPD</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="opd" className="mt-0">
          <DataTable
            rows={opdVisits}
            columns={opdColumns}
            isLoading={opdLoading}
            onRowClick={(row) => navigate(`/opd/consultation/${row.id}`)}
            getRowId={(row) => row.id}
            hidePagination
            emptyTitle="No recent visits"
            density="compact"
          />
          <div className="px-4 py-2 border-t border-border">
            <button onClick={() => navigate('/opd/visits')} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              View all visits <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </TabsContent>

        <TabsContent value="ipd" className="mt-0">
          <DataTable
            rows={ipdAdmissions}
            columns={ipdColumns}
            isLoading={ipdLoading}
            onRowClick={(row) => navigate(`/ipd/admissions/${row.id}`)}
            getRowId={(row) => row.id}
            hidePagination
            emptyTitle="No recent admissions"
            density="compact"
          />
          <div className="px-4 py-2 border-t border-border">
            <button onClick={() => navigate('/ipd/admissions')} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              View all admissions <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default Dashboard;
