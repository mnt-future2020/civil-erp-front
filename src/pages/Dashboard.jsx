import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  IndianRupee, 
  FolderKanban, 
  Users, 
  ShoppingCart,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  HardHat,
  Truck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { formatCurrency, formatNumber } from '../lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

const COLORS = ['#0052CC', '#FFAB00', '#00875A', '#6554C0'];

export default function Dashboard() {
  const { user, api } = useAuth();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, chartRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/chart-data')
        ]);
        setStats(statsRes.data);
        setChartData(chartRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [api]);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton-pulse h-16 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-pulse h-32 rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Total Projects',
      value: stats?.total_projects || 0,
      subtitle: `${stats?.active_projects || 0} active`,
      icon: FolderKanban,
      trend: '+2 this month',
      trendUp: true,
      variant: 'default'
    },
    {
      title: 'Budget Utilization',
      value: `${Math.round(stats?.budget_utilization || 0)}%`,
      subtitle: formatCurrency(stats?.total_spent || 0),
      icon: IndianRupee,
      trend: 'of ' + formatCurrency(stats?.total_budget || 0),
      trendUp: (stats?.budget_utilization || 0) < 90,
      variant: (stats?.budget_utilization || 0) > 90 ? 'warning' : 'default'
    },
    {
      title: 'Schedule Performance',
      value: stats?.spi?.toFixed(2) || '0.00',
      subtitle: 'SPI Index',
      icon: Clock,
      trend: stats?.spi >= 0.95 ? 'On Track' : 'Needs Attention',
      trendUp: stats?.spi >= 0.95,
      variant: stats?.spi >= 0.95 ? 'success' : 'warning'
    },
    {
      title: 'Safety Record',
      value: stats?.safety_incidents || 0,
      subtitle: 'Incidents this month',
      icon: HardHat,
      trend: 'Zero harm achieved',
      trendUp: true,
      variant: 'success'
    }
  ];

  const secondaryKpis = [
    {
      title: 'Vendors',
      value: stats?.total_vendors || 0,
      icon: Truck,
      subtitle: 'Active suppliers'
    },
    {
      title: 'Employees',
      value: stats?.total_employees || 0,
      icon: Users,
      subtitle: 'Workforce'
    },
    {
      title: 'Pending POs',
      value: stats?.pending_pos || 0,
      icon: ShoppingCart,
      subtitle: 'Awaiting approval'
    },
    {
      title: 'Equipment',
      value: `${stats?.equipment_utilization || 0}%`,
      icon: Gauge,
      subtitle: 'Utilization rate'
    }
  ];

  const costChartData = chartData?.monthly_cost?.labels?.map((month, i) => ({
    month,
    budget: chartData.monthly_cost.budget[i],
    actual: chartData.monthly_cost.actual[i]
  })) || [];

  const projectStatusData = chartData?.project_status ? [
    { name: 'Planning', value: chartData.project_status.planning || 0 },
    { name: 'In Progress', value: chartData.project_status.in_progress || 0 },
    { name: 'On Hold', value: chartData.project_status.on_hold || 0 },
    { name: 'Completed', value: chartData.project_status.completed || 0 }
  ].filter(item => item.value > 0) : [];

  const expenseData = chartData?.expense_breakdown ? [
    { name: 'Materials', value: chartData.expense_breakdown.materials },
    { name: 'Labor', value: chartData.expense_breakdown.labor },
    { name: 'Equipment', value: chartData.expense_breakdown.equipment },
    { name: 'Overhead', value: chartData.expense_breakdown.overhead }
  ] : [];

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="dashboard-greeting">
            Vanakkam, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="dashboard-date">{today}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-sm border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">All systems operational</span>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Card 
              key={index} 
              className={`kpi-card ${kpi.variant}`}
              data-testid={`kpi-${kpi.title.toLowerCase().replace(' ', '-')}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {kpi.title}
                    </p>
                    <p className="text-3xl font-bold mt-1 tracking-tight">{kpi.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{kpi.subtitle}</p>
                  </div>
                  <div className="p-2 rounded-sm bg-muted">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs">
                  {kpi.trendUp ? (
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-amber-500" />
                  )}
                  <span className={kpi.trendUp ? 'text-emerald-600' : 'text-amber-600'}>
                    {kpi.trend}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {secondaryKpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Card key={index} className="border rounded-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 rounded-sm bg-accent/10">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cost Trend Chart */}
        <Card className="lg:col-span-2 rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold uppercase tracking-wide">
              Budget vs Actual Cost (Lakhs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={costChartData}>
                  <defs>
                    <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0052CC" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0052CC" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFAB00" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#FFAB00" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0F172A', 
                      border: 'none', 
                      borderRadius: '2px',
                      color: '#F8FAFC'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="budget" 
                    stroke="#0052CC" 
                    fill="url(#budgetGradient)"
                    strokeWidth={2}
                    name="Budget"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#FFAB00" 
                    fill="url(#actualGradient)"
                    strokeWidth={2}
                    name="Actual"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Project Status Pie */}
        <Card className="rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold uppercase tracking-wide">
              Project Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectStatusData.length > 0 ? projectStatusData : [{ name: 'No Data', value: 1 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {projectStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown */}
      <Card className="rounded-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold uppercase tracking-wide">
            Expense Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0F172A', 
                    border: 'none', 
                    borderRadius: '2px',
                    color: '#F8FAFC'
                  }}
                  formatter={(value) => [`${value}%`, 'Share']}
                />
                <Bar dataKey="value" fill="#0052CC" radius={[0, 4, 4, 0]}>
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-sm border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center gap-4">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cost Variance</p>
              <p className="text-xl font-bold">{formatCurrency(Math.abs(stats?.cost_variance || 0))}</p>
              <p className="text-xs text-muted-foreground">
                {(stats?.cost_variance || 0) >= 0 ? 'Under budget' : 'Over budget'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center gap-4">
            <Users className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Present Today</p>
              <p className="text-xl font-bold">{stats?.present_today || 0}</p>
              <p className="text-xs text-muted-foreground">Workers on site</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center gap-4">
            <Gauge className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Equipment Status</p>
              <Progress value={stats?.equipment_utilization || 0} className="h-2 mt-2" />
              <p className="text-xs text-muted-foreground mt-1">{stats?.equipment_utilization || 0}% utilized</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
