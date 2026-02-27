import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import {
  Users,
  Calendar,
  FileText,
  Loader2,
  ClipboardList,
  IndianRupee,
  UserPlus,
  Receipt,
  Microscope,
  ChevronRight,
} from 'lucide-react';
import { usePatient } from '@/hooks/usePatient';
import { useOpdVisit } from '@/hooks/useOpdVisit';
import { useOPDBill } from '@/hooks/useOPDBill';

const Dashboard = () => {
  const navigate = useNavigate();

  const { usePatientStatistics } = usePatient();
  const { useOpdVisitStatistics } = useOpdVisit();
  const { useOPDBillStatistics } = useOPDBill();

  const { data: patientStats, isLoading: patientLoading } = usePatientStatistics();
  const { data: visitStats, isLoading: visitLoading } = useOpdVisitStatistics();
  const { data: billStats, isLoading: billLoading } = useOPDBillStatistics();

  const isLoading = patientLoading || visitLoading || billLoading;

  const pendingBills = (billStats?.bills_unpaid || 0) + (billStats?.bills_partial || 0);

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
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Patients"
            value={patientStats?.total_patients?.toLocaleString() || '0'}
            subtitle={`${patientStats?.active_patients?.toLocaleString() || '0'} active`}
            icon={<Users className="w-4 h-4" />}
            loading={isLoading}
          />
          <StatCard
            title="Today's Visits"
            value={visitStats?.today_visits?.toLocaleString() || '0'}
            subtitle={`${visitStats?.waiting_patients || 0} waiting`}
            icon={<Calendar className="w-4 h-4" />}
            loading={isLoading}
          />
          <StatCard
            title="Revenue"
            value={`₹${parseFloat(billStats?.paid_revenue || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            subtitle={`₹${parseFloat(billStats?.pending_amount || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })} pending`}
            icon={<IndianRupee className="w-4 h-4" />}
            loading={isLoading}
          />
          <StatCard
            title="Pending Bills"
            value={pendingBills.toString()}
            subtitle={`${billStats?.total_bills?.toLocaleString() || '0'} total bills`}
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
                  { label: 'In Consultation', value: visitStats?.visits_by_status?.in_consultation || 0, total: visitStats?.total_visits || 1 },
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
                  <span className="text-[12px] font-medium text-green-600 dark:text-green-400">{(billStats?.bills_paid || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">Unpaid</span>
                  <span className="text-[12px] font-medium text-red-600 dark:text-red-400">{(billStats?.bills_unpaid || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">Partial</span>
                  <span className="text-[12px] font-medium text-amber-600 dark:text-amber-400">{(billStats?.bills_partial || 0).toLocaleString()}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-muted-foreground">Pending Amount</span>
                    <span className="text-[13px] font-semibold text-foreground">
                      ₹{parseFloat(billStats?.pending_amount || '0').toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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
  subtitle?: string;
  icon: React.ReactNode;
  loading?: boolean;
}

const StatCard = ({ title, value, subtitle, icon, loading }: StatCardProps) => (
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
    {!loading && subtitle && (
      <p className="mt-2 text-[11px] text-muted-foreground">{subtitle}</p>
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
          row.status === 'completed' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300' :
          row.status === 'in_consultation' ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300' :
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
          row.status === 'admitted' ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300' :
          row.status === 'discharged' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300' :
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
