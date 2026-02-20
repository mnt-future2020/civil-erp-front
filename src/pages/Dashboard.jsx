import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, IndianRupee, FolderKanban, Users, ShoppingCart,
  Clock, AlertTriangle, CheckCircle2, Gauge, HardHat, Truck, Package,
  FileText, Activity, ArrowUpRight, ArrowDownRight, CircleDot, Wallet,
  ClipboardList, BarChart3, Receipt
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { formatCurrency, formatNumber } from '../lib/utils';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#8b5cf6'];
const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-600',
};

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
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton-pulse h-16 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-pulse h-32 rounded-sm" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 skeleton-pulse h-80 rounded-sm" />
          <div className="skeleton-pulse h-80 rounded-sm" />
        </div>
      </div>
    );
  }

  // ── Chart Data ──────────────────────────────────────
  const costChartData = chartData?.project_cost?.labels?.map((name, i) => ({
    name: name.length > 15 ? name.slice(0, 13) + '…' : name,
    budget: chartData.project_cost.budget[i],
    actual: chartData.project_cost.actual[i]
  })) || [];

  const projectStatusData = chartData?.project_status ? [
    { name: 'Planning', value: chartData.project_status.planning || 0 },
    { name: 'In Progress', value: chartData.project_status.in_progress || 0 },
    { name: 'On Hold', value: chartData.project_status.on_hold || 0 },
    { name: 'Completed', value: chartData.project_status.completed || 0 }
  ].filter(item => item.value > 0) : [];

  const billingPipeline = stats?.billing_pipeline || [];
  const stockAlerts = stats?.stock_alerts || [];
  const recentPOs = stats?.recent_pos || [];
  const recentActivity = stats?.recent_activity || [];

  const formatTs = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' }) +
      ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  };

  const actionColors = {
    LOGIN: 'text-blue-600', LOGOUT: 'text-slate-500', CREATE: 'text-emerald-600',
    UPDATE: 'text-amber-600', DELETE: 'text-red-600', VIEW: 'text-slate-500',
  };

  return (
    <div className="space-y-6" data-testid="dashboard-page">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Vanakkam, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-sm border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-medium text-emerald-700">All systems operational</span>
        </div>
      </div>

      {/* ── Row 1: Primary KPIs ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <Card className="rounded-sm border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Projects</p>
                <p className="text-3xl font-bold mt-1">{stats?.total_projects || 0}</p>
                <p className="text-sm text-muted-foreground">{stats?.active_projects || 0} active</p>
              </div>
              <div className="p-2 rounded-sm bg-blue-50"><FolderKanban className="w-5 h-5 text-blue-600" /></div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-emerald-600">
              <TrendingUp className="w-3 h-3" />
              <span>+{stats?.projects_this_month || 0} this month</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="rounded-sm border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Billed</p>
                <p className="text-3xl font-bold mt-1">{formatNumber(stats?.total_billed || 0)}</p>
                <p className="text-sm text-muted-foreground">{formatNumber(stats?.total_received || 0)} received</p>
              </div>
              <div className="p-2 rounded-sm bg-emerald-50"><IndianRupee className="w-5 h-5 text-emerald-600" /></div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs">
              {(stats?.pending_collection || 0) > 0 ? (
                <><ArrowUpRight className="w-3 h-3 text-amber-500" /><span className="text-amber-600">{formatNumber(stats.pending_collection)} pending</span></>
              ) : (
                <><CheckCircle2 className="w-3 h-3 text-emerald-500" /><span className="text-emerald-600">Fully collected</span></>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Budget Utilization */}
        <Card className="rounded-sm border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Budget Used</p>
                <p className="text-3xl font-bold mt-1">{Math.round(stats?.budget_utilization || 0)}%</p>
                <p className="text-sm text-muted-foreground">{formatNumber(stats?.total_spent || 0)} of {formatNumber(stats?.total_budget || 0)}</p>
              </div>
              <div className="p-2 rounded-sm bg-amber-50"><Wallet className="w-5 h-5 text-amber-600" /></div>
            </div>
            <Progress value={stats?.budget_utilization || 0} className="h-1.5 mt-3" />
          </CardContent>
        </Card>

        {/* Workforce */}
        <Card className="rounded-sm border-l-4 border-l-violet-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Workforce</p>
                <p className="text-3xl font-bold mt-1">{stats?.total_employees || 0}</p>
                <p className="text-sm text-muted-foreground">{stats?.present_today || 0} present today</p>
              </div>
              <div className="p-2 rounded-sm bg-violet-50"><Users className="w-5 h-5 text-violet-600" /></div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-blue-600">
              <HardHat className="w-3 h-3" />
              <span>{stats?.absent_today || 0} absent</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Quick Stats (6 cards) ──────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="rounded-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-1.5 rounded-sm bg-amber-50"><Receipt className="w-4 h-4 text-amber-600" /></div>
            <div>
              <p className="text-lg font-bold">{billingPipeline.find(b => b.status === 'pending')?.count || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Pending Bills</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-1.5 rounded-sm bg-blue-50"><ShoppingCart className="w-4 h-4 text-blue-600" /></div>
            <div>
              <p className="text-lg font-bold">{(stats?.pending_pos || 0) + (stats?.approved_pos || 0)}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Active POs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-1.5 rounded-sm bg-emerald-50"><Truck className="w-4 h-4 text-emerald-600" /></div>
            <div>
              <p className="text-lg font-bold">{stats?.total_vendors || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Vendors</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-1.5 rounded-sm bg-blue-50"><ClipboardList className="w-4 h-4 text-blue-600" /></div>
            <div>
              <p className="text-lg font-bold">{stats?.completed_tasks || 0}/{stats?.total_tasks || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Tasks Done</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-1.5 rounded-sm bg-red-50"><AlertTriangle className="w-4 h-4 text-red-600" /></div>
            <div>
              <p className="text-lg font-bold">{(stats?.low_stock_count || 0) + (stats?.out_of_stock_count || 0)}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Stock Alerts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-1.5 rounded-sm bg-violet-50"><Gauge className="w-4 h-4 text-violet-600" /></div>
            <div>
              <p className="text-lg font-bold">{stats?.equipment_utilization || 0}%</p>
              <p className="text-[10px] text-muted-foreground uppercase">Equipment</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Charts ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Budget vs Actual Bar Chart */}
        <Card className="lg:col-span-2 rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Project Budget vs Actual Cost
            </CardTitle>
            <CardDescription>Values in Lakhs (₹)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-72 w-full overflow-x-auto">
              {costChartData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No projects found</div>
              ) : (
                <div style={{ minWidth: Math.max(400, costChartData.length * 100) }}>
                  <ResponsiveContainer width="100%" height={window.innerWidth >= 768 ? 288 : 256}>
                    <BarChart data={costChartData} barCategoryGap="30%" barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11 }} unit="L" width={45} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '4px', color: '#f8fafc', fontSize: 12 }}
                        formatter={(value, name) => [`₹${value}L`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="budget" name="Budget" fill="#2563eb" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="actual" name="Actual" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Project Status Donut */}
        <Card className="rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide">Project Status</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const total = projectStatusData.reduce((s, d) => s + d.value, 0);
              return (
                <div className="flex flex-col items-center gap-4">
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={projectStatusData.length > 0 ? projectStatusData : [{ name: 'No Data', value: 1 }]}
                          cx="50%" cy="50%"
                          innerRadius={50} outerRadius={76}
                          paddingAngle={2} dataKey="value"
                        >
                          {projectStatusData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [value, 'Projects']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full space-y-2">
                    {projectStatusData.map((entry, i) => (
                      <div key={entry.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
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

      {/* ── Row 4: Billing Pipeline + Recent POs ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Billing Pipeline */}
        <Card className="rounded-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-muted-foreground" />
              Billing Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {billingPipeline.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No bills created yet</p>
            ) : (
              <>
                {billingPipeline.map((stage) => {
                  const percentage = stats?.total_billed > 0 ? Math.round((stage.amount / stats.total_billed) * 100) : 0;
                  const colors = { pending: 'bg-amber-500', approved: 'bg-blue-500', paid: 'bg-emerald-500' };
                  const labels = { pending: 'Pending', approved: 'Approved', paid: 'Paid' };
                  return (
                    <div key={stage.status}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${colors[stage.status] || 'bg-slate-400'}`} />
                          <span className="text-sm font-medium">{labels[stage.status] || stage.status}</span>
                          <Badge variant="secondary" className="rounded-sm text-[10px] px-1.5 py-0">
                            {stage.count} {stage.count === 1 ? 'bill' : 'bills'}
                          </Badge>
                        </div>
                        <span className="text-sm font-bold">{formatCurrency(stage.amount)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className={`h-2 rounded-full ${colors[stage.status] || 'bg-slate-400'} transition-all`}
                          style={{ width: `${Math.max(percentage, 2)}%` }} />
                      </div>
                    </div>
                  );
                })}
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Total Billed</span>
                  <span className="font-bold text-lg">{formatCurrency(stats?.total_billed || 0)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Purchase Orders */}
        <Card className="rounded-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
              Recent Purchase Orders
            </CardTitle>
            {stats?.active_po_value > 0 && (
              <CardDescription>Active PO Value: {formatCurrency(stats.active_po_value)}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {recentPOs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No purchase orders yet</p>
            ) : (
              <div className="space-y-3">
                {recentPOs.map((po, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{po.po_number}</p>
                      <p className="text-xs text-muted-foreground">{po.vendor_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(po.total)}</p>
                      <Badge className={`rounded-sm text-[10px] ${STATUS_COLORS[po.status] || 'bg-slate-100 text-slate-600'}`}>
                        {po.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 5: Stock Alerts + Recent Activity ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stock Alerts */}
        <Card className="rounded-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                Stock Alerts
              </CardTitle>
              <div className="flex items-center gap-1.5">
                {(stats?.out_of_stock_count || 0) > 0 && (
                  <Badge variant="destructive" className="rounded-sm text-[10px] px-1.5 py-0">{stats.out_of_stock_count} Out</Badge>
                )}
                {(stats?.low_stock_count || 0) > 0 && (
                  <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700">{stats.low_stock_count} Low</Badge>
                )}
                {(stats?.out_of_stock_count || 0) === 0 && (stats?.low_stock_count || 0) === 0 && (
                  <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700">All OK</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {stockAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">All materials well stocked</p>
            ) : (
              <div className={stockAlerts.length > 5 ? "max-h-64 overflow-y-auto" : ""}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-[10px] text-muted-foreground uppercase">
                      <th className="text-left py-1.5 pr-3 font-medium">Item</th>
                      <th className="text-left py-1.5 pr-3 font-medium">Project</th>
                      <th className="text-right py-1.5 pr-3 font-medium">Qty</th>
                      <th className="text-right py-1.5 pr-3 font-medium">Min</th>
                      <th className="text-center py-1.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockAlerts.map((item, i) => (
                      <tr key={item.id || i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-1.5 pr-3 font-medium text-xs">{item.item_name}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground text-xs truncate max-w-[100px]">{item.project_name}</td>
                        <td className="py-1.5 pr-3 text-right font-mono text-xs">{item.quantity} {item.unit}</td>
                        <td className="py-1.5 pr-3 text-right font-mono text-xs text-muted-foreground">{item.minimum_quantity}</td>
                        <td className="py-1.5 text-center">
                          {item.status === 'out_of_stock' ? (
                            <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-semibold bg-red-100 text-red-700">Out</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-semibold bg-amber-100 text-amber-700">Low</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
            ) : (
              <div className="space-y-0">
                {recentActivity.map((log, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b last:border-0">
                    <div className="mt-0.5">
                      <CircleDot className={`w-3.5 h-3.5 ${actionColors[log.action] || 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">
                        <span className="font-medium">{log.user_name}</span>
                        <span className="text-muted-foreground"> · </span>
                        <span className="text-muted-foreground capitalize">{log.module}</span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{log.description}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">{formatTs(log.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 6: Footer Stats ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cost Variance */}
        <Card className="rounded-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-sm ${(stats?.cost_variance || 0) >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              {(stats?.cost_variance || 0) >= 0 ? (
                <ArrowDownRight className="w-5 h-5 text-emerald-600" />
              ) : (
                <ArrowUpRight className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Cost Variance</p>
              <p className="text-xl font-bold">{formatCurrency(Math.abs(stats?.cost_variance || 0))}</p>
              <p className="text-xs text-muted-foreground">
                {(stats?.cost_variance || 0) >= 0 ? 'Under budget' : 'Over budget'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* SPI */}
        <Card className="rounded-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-sm ${(stats?.spi || 0) >= 0.9 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              <Clock className={`w-5 h-5 ${(stats?.spi || 0) >= 0.9 ? 'text-emerald-600' : 'text-amber-600'}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Schedule Performance</p>
              <p className="text-xl font-bold">{stats?.spi?.toFixed(2) || '0.00'} SPI</p>
              <p className="text-xs text-muted-foreground">
                {(stats?.spi || 0) >= 0.95 ? 'On track' : (stats?.spi || 0) >= 0.8 ? 'Slightly behind' : 'Needs attention'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payroll */}
        <Card className="rounded-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-sm bg-blue-50">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Payroll This Month</p>
              <p className="text-xl font-bold">{formatCurrency(stats?.payroll_processed || 0)}</p>
              <p className="text-xs text-muted-foreground">
                {stats?.payroll_count || 0} employees
                {(stats?.payroll_pending || 0) > 0 && ` · ${formatCurrency(stats.payroll_pending)} pending`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
