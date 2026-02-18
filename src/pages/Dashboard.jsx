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
      trend: `+${stats?.projects_this_month || 0} this month`,
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

  const costChartData = chartData?.project_cost?.labels?.map((name, i) => ({
    name: name.length > 18 ? name.slice(0, 16) + '…' : name,
    budget: chartData.project_cost.budget[i],
    actual: chartData.project_cost.actual[i]
  })) || [];

  const projectStatusData = chartData?.project_status ? [
    { name: 'Planning', value: chartData.project_status.planning || 0 },
    { name: 'In Progress', value: chartData.project_status.in_progress || 0 },
    { name: 'On Hold', value: chartData.project_status.on_hold || 0 },
    { name: 'Completed', value: chartData.project_status.completed || 0 }
  ].filter(item => item.value > 0) : [];

  const stockAlerts = stats?.stock_alerts || [];

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
        {/* Project Budget vs Actual Chart */}
        <Card className="lg:col-span-2 rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold uppercase tracking-wide">
              Project Budget vs Actual Cost (Lakhs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-80 w-full overflow-x-auto">
              {costChartData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No projects found</div>
              ) : (
                <div style={{ minWidth: Math.max(500, costChartData.length * 100) }}>
                  <ResponsiveContainer width="100%" height={window.innerWidth >= 768 ? 320 : 256}>
                    <BarChart data={costChartData} barCategoryGap="30%" barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={55} />
                      <YAxis tick={{ fontSize: 12 }} unit="L" width={45} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '2px', color: '#F8FAFC' }}
                        formatter={(value, name) => [`₹${value}L`, name]}
                      />
                      <Legend />
                      <Bar dataKey="budget" name="Budget" fill="#0052CC" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="actual" name="Actual Cost" fill="#FFAB00" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
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
            {(() => {
              const total = projectStatusData.reduce((s, d) => s + d.value, 0);
              return (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={projectStatusData.length > 0 ? projectStatusData : [{ name: 'No Data', value: 1 }]}
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={78}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {projectStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [value, 'Projects']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full space-y-1.5">
                    {projectStatusData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-muted-foreground">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-2 font-medium">
                          <span>{entry.value}</span>
                          <span className="text-xs text-muted-foreground w-10 text-right">
                            {total > 0 ? `${Math.round(entry.value / total * 100)}%` : '0%'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {projectStatusData.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground">No projects yet</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Stock Alerts */}
      <Card className="rounded-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold uppercase tracking-wide">
              Stock Alerts
            </CardTitle>
            <div className="flex items-center gap-2">
              {(stats?.out_of_stock_count || 0) > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {stats.out_of_stock_count} Out of Stock
                </span>
              )}
              {(stats?.low_stock_count || 0) > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {stats.low_stock_count} Low Stock
                </span>
              )}
              {(stats?.out_of_stock_count || 0) === 0 && (stats?.low_stock_count || 0) === 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  All items in stock
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stockAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No stock alerts — all materials are well stocked.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className={stockAlerts.length > 5 ? "max-h-72 overflow-y-auto" : ""}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="text-left py-2 pr-4 font-medium">Item</th>
                    <th className="text-left py-2 pr-4 font-medium">Project</th>
                    <th className="text-left py-2 pr-4 font-medium">Category</th>
                    <th className="text-right py-2 pr-4 font-medium">Qty</th>
                    <th className="text-right py-2 pr-4 font-medium">Min Qty</th>
                    <th className="text-center py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stockAlerts.map((item, i) => (
                    <tr key={item.id || i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-4 font-medium">{item.item_name}</td>
                      <td className="py-2 pr-4 text-muted-foreground text-xs">{item.project_name}</td>
                      <td className="py-2 pr-4 text-muted-foreground text-xs">{item.category}</td>
                      <td className="py-2 pr-4 text-right font-mono">
                        {item.quantity} <span className="text-xs text-muted-foreground">{item.unit}</span>
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-muted-foreground">
                        {item.minimum_quantity} <span className="text-xs">{item.unit}</span>
                      </td>
                      <td className="py-2 text-center">
                        {item.status === 'out_of_stock' ? (
                          <span className="px-2 py-0.5 rounded-sm text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Out of Stock</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-sm text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Low Stock</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
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
