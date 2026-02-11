import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Download, 
  Filter, 
  Calendar,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Users,
  Building2,
  Truck,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  BarChart3,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Printer,
  Mail,
  Loader2,
  ChevronRight,
  Target,
  Gauge,
  Shield,
  Receipt
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  LineChart as RechartsLine,
  Line,
  RadialBarChart,
  RadialBar
} from 'recharts';

const COLORS = ['#0052CC', '#FFAB00', '#00875A', '#6554C0', '#FF5630', '#00B8D9'];

// Report Card Component
const ReportCard = ({ title, description, icon: Icon, onClick, color = 'blue' }) => (
  <Card 
    className="rounded-sm cursor-pointer card-hover group"
    onClick={onClick}
    data-testid={`report-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <CardContent className="p-5">
      <div className="flex items-start gap-4">
        <div className={cn(
          "p-3 rounded-sm",
          color === 'blue' && "bg-blue-100 dark:bg-blue-900/30",
          color === 'amber' && "bg-amber-100 dark:bg-amber-900/30",
          color === 'emerald' && "bg-emerald-100 dark:bg-emerald-900/30",
          color === 'purple' && "bg-purple-100 dark:bg-purple-900/30"
        )}>
          <Icon className={cn(
            "w-6 h-6",
            color === 'blue' && "text-blue-600",
            color === 'amber' && "text-amber-600",
            color === 'emerald' && "text-emerald-600",
            color === 'purple' && "text-purple-600"
          )} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-base">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
      </div>
    </CardContent>
  </Card>
);

// KPI Metric Component
const KPIMetric = ({ label, value, subValue, trend, trendUp, icon: Icon }) => (
  <div className="flex items-center justify-between p-4 border rounded-sm">
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="p-2 rounded-sm bg-muted">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold">{value}</p>
        {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
      </div>
    </div>
    {trend && (
      <div className={cn(
        "flex items-center gap-1 text-sm font-medium",
        trendUp ? "text-emerald-600" : "text-red-600"
      )}>
        {trendUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        {trend}
      </div>
    )}
  </div>
);

// Gauge Chart Component
const GaugeChart = ({ value, max = 100, label, color = "#0052CC" }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const data = [{ name: label, value: percentage, fill: color }];
  
  return (
    <div className="relative w-32 h-32">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={data} startAngle={180} endAngle={0}>
          <RadialBar dataKey="value" cornerRadius={5} background />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{Math.round(value)}%</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
};

export default function Reports() {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState('overview');
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedProject, setSelectedProject] = useState('all');
  const [projects, setProjects] = useState([]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }, [api]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const fetchReport = async (reportType) => {
    setLoading(true);
    try {
      let endpoint = '';
      switch (reportType) {
        case 'executive':
          endpoint = '/reports/executive-summary';
          break;
        case 'project':
          endpoint = selectedProject !== 'all' 
            ? `/reports/project-analysis?project_id=${selectedProject}`
            : '/reports/project-analysis';
          break;
        case 'financial':
          endpoint = `/reports/financial-summary?start_date=${dateRange.start}&end_date=${dateRange.end}`;
          break;
        case 'procurement':
          endpoint = '/reports/procurement-analysis';
          break;
        case 'hrms':
          endpoint = '/reports/hrms-summary';
          break;
        case 'compliance':
          endpoint = '/reports/compliance-status';
          break;
        case 'variance':
          endpoint = '/reports/cost-variance';
          break;
        default:
          endpoint = '/reports/executive-summary';
      }
      
      const response = await api.get(endpoint);
      setReportData(response.data);
      setActiveReport(reportType);
    } catch (error) {
      console.error('Failed to fetch report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const reportTypeMap = {
    executive: 'executive-summary', project: 'project-analysis', financial: 'financial-summary',
    procurement: 'procurement-analysis', hrms: 'hrms-summary', compliance: 'compliance-status', variance: 'cost-variance'
  };

  const handleExport = async (format) => {
    const reportSlug = reportTypeMap[activeReport];
    if (!reportSlug) { toast.error('Select a report first'); return; }
    try {
      toast.info(`Generating ${format.toUpperCase()}...`);
      const response = await api.get(`/reports/export/${reportSlug}?format=${format}`, { responseType: 'blob' });
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportSlug}_${new Date().toISOString().slice(0,10)}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} downloaded`);
    } catch {
      toast.error(`Failed to export ${format}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmailReport = () => {
    toast.success('Report scheduled for email delivery');
  };

  // Render Overview (Report Selection)
  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReportCard 
          title="Executive Summary"
          description="High-level KPIs, financial overview, and project status"
          icon={BarChart3}
          color="blue"
          onClick={() => fetchReport('executive')}
        />
        <ReportCard 
          title="Project Analysis"
          description="Detailed project performance, timeline, and cost breakdown"
          icon={Building2}
          color="amber"
          onClick={() => fetchReport('project')}
        />
        <ReportCard 
          title="Financial Report"
          description="Billing summary, CVR analysis, and cash flow"
          icon={IndianRupee}
          color="emerald"
          onClick={() => fetchReport('financial')}
        />
        <ReportCard 
          title="Procurement Report"
          description="Vendor analysis, PO trends, and material costs"
          icon={Truck}
          color="purple"
          onClick={() => fetchReport('procurement')}
        />
        <ReportCard 
          title="HRMS Report"
          description="Workforce analytics, attendance, and payroll summary"
          icon={Users}
          color="blue"
          onClick={() => fetchReport('hrms')}
        />
        <ReportCard 
          title="Compliance Status"
          description="GST returns, RERA compliance, and statutory deadlines"
          icon={Shield}
          color="amber"
          onClick={() => fetchReport('compliance')}
        />
        <ReportCard 
          title="Cost Variance Report"
          description="Budget vs actual analysis with CPI/SPI indices"
          icon={Target}
          color="emerald"
          onClick={() => fetchReport('variance')}
        />
      </div>
    </div>
  );

  // Render Executive Summary Report
  const renderExecutiveReport = () => {
    if (!reportData) return null;
    const { projects: proj, financial, procurement, hrms, compliance } = reportData;
    
    const projectStatusData = proj?.by_status ? [
      { name: 'Planning', value: proj.by_status.planning || 0 },
      { name: 'In Progress', value: proj.by_status.in_progress || 0 },
      { name: 'On Hold', value: proj.by_status.on_hold || 0 },
      { name: 'Completed', value: proj.by_status.completed || 0 }
    ].filter(d => d.value > 0) : [];

    return (
      <div className="space-y-6 print:space-y-4">
        {/* Report Header */}
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h2 className="text-2xl font-bold">Executive Summary Report</h2>
            <p className="text-muted-foreground">Generated: {formatDate(reportData.generated_at)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
              <Download className="w-4 h-4 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
              <Download className="w-4 h-4 mr-1" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="kpi-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Total Projects</p>
                  <p className="text-2xl font-bold">{proj?.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="kpi-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <IndianRupee className="w-8 h-8 text-emerald-500" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Total Budget</p>
                  <p className="text-2xl font-bold">{formatCurrency(proj?.total_budget || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="kpi-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Gauge className="w-8 h-8 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Budget Used</p>
                  <p className="text-2xl font-bold">{proj?.budget_utilization_pct || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="kpi-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Avg Progress</p>
                  <p className="text-2xl font-bold">{proj?.average_progress_pct || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Project Status Pie */}
          <Card className="rounded-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold uppercase">Project Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={projectStatusData.length > 0 ? projectStatusData : [{ name: 'No Data', value: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card className="rounded-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold uppercase">Financial Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <KPIMetric 
                label="Total Billed" 
                value={formatCurrency(financial?.total_billed || 0)}
                icon={Receipt}
              />
              <KPIMetric 
                label="Pending Collection" 
                value={formatCurrency(financial?.pending_collection || 0)}
                icon={AlertTriangle}
              />
              <KPIMetric 
                label="Collection Efficiency" 
                value={`${financial?.collection_efficiency_pct || 0}%`}
                trend={financial?.collection_efficiency_pct >= 80 ? "Good" : "Needs Attention"}
                trendUp={financial?.collection_efficiency_pct >= 80}
                icon={CheckCircle2}
              />
              <KPIMetric 
                label="Retention Held" 
                value={formatCurrency(financial?.retention_held || 0)}
                icon={IndianRupee}
              />
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Procurement */}
          <Card className="rounded-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold uppercase">Procurement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Active Vendors</span>
                <span className="font-semibold">{procurement?.active_vendors || 0}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total PO Value</span>
                <span className="font-semibold">{formatCurrency(procurement?.total_po_value || 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Pending POs</span>
                <Badge variant={procurement?.pending_pos > 0 ? "destructive" : "secondary"}>
                  {procurement?.pending_pos || 0}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* HRMS */}
          <Card className="rounded-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold uppercase">Workforce</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Employees</span>
                <span className="font-semibold">{hrms?.total_employees || 0}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Monthly Payroll</span>
                <span className="font-semibold">{formatCurrency(hrms?.total_payroll_cost || 0)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Compliance */}
          <Card className="rounded-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold uppercase">Compliance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">GST Payable</span>
                <span className="font-semibold">{formatCurrency(compliance?.gst_payable || 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">ITC Claimed</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(compliance?.itc_claimed || 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Net Liability</span>
                <span className="font-semibold">{formatCurrency(compliance?.net_gst_liability || 0)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Render Project Analysis Report
  const renderProjectReport = () => {
    if (!reportData || !reportData.projects) return null;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Project Analysis Report</h2>
            <p className="text-muted-foreground">{reportData.total_projects} Projects Analyzed</p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedProject} onValueChange={(v) => { setSelectedProject(v); fetchReport('project'); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} data-testid="export-pdf-btn">
              <Download className="w-4 h-4 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('excel')} data-testid="export-excel-btn">
              <Download className="w-4 h-4 mr-1" /> Excel
            </Button>
          </div>
        </div>

        {reportData.projects.map((project, idx) => (
          <Card key={idx} className="rounded-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{project.project_name}</CardTitle>
                  <CardDescription>{project.project_code} • {project.client} • {project.location}</CardDescription>
                </div>
                <Badge className={cn(
                  "status-badge",
                  project.status === 'completed' && "completed",
                  project.status === 'in_progress' && "in-progress",
                  project.status === 'planning' && "planning"
                )}>
                  {project.status?.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Timeline */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground">Timeline</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Start</span>
                      <span>{formatDate(project.timeline?.start_date)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>End</span>
                      <span>{formatDate(project.timeline?.end_date)}</span>
                    </div>
                    <Progress value={project.timeline?.work_progress_pct || 0} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress: {project.timeline?.work_progress_pct || 0}%</span>
                      <span className={project.timeline?.schedule_variance_pct >= 0 ? "text-emerald-600" : "text-red-600"}>
                        {project.timeline?.schedule_status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tasks */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground">Tasks</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Tasks</span>
                      <span className="font-semibold">{project.tasks?.total || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Completed</span>
                      <span className="font-semibold text-emerald-600">{project.tasks?.completed || 0}</span>
                    </div>
                    <Progress value={project.tasks?.completion_pct || 0} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">{project.tasks?.completion_pct || 0}% complete</p>
                  </div>
                </div>

                {/* Financials */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground">Financials</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Budget</span>
                      <span className="font-semibold">{formatCurrency(project.financials?.budget || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Spent</span>
                      <span className="font-semibold">{formatCurrency(project.financials?.actual_cost || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Variance</span>
                      <span className={cn(
                        "font-semibold",
                        project.financials?.budget_variance >= 0 ? "text-emerald-600" : "text-red-600"
                      )}>
                        {formatCurrency(Math.abs(project.financials?.budget_variance || 0))}
                        {project.financials?.budget_variance >= 0 ? " under" : " over"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance Indices */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground">CVR Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Contracted</span>
                      <span className="font-semibold">{formatCurrency(project.cvr_summary?.contracted_value || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Work Done</span>
                      <span className="font-semibold">{formatCurrency(project.cvr_summary?.work_done_value || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>CPI</span>
                      <Badge variant={project.cvr_summary?.cost_performance_index >= 1 ? "default" : "destructive"}>
                        {project.cvr_summary?.cost_performance_index || 0}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Render Financial Report
  const renderFinancialReport = () => {
    if (!reportData) return null;
    
    const monthlyData = reportData.monthly_trend || [];
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Financial Summary Report</h2>
            <p className="text-muted-foreground">Period: {reportData.period?.start_date} to {reportData.period?.end_date}</p>
          </div>
          <div className="flex gap-2 items-center">
            <Input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="w-36"
            />
            <span>to</span>
            <Input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="w-36"
            />
            <Button size="sm" onClick={() => fetchReport('financial')}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} data-testid="export-pdf-btn">
              <Download className="w-4 h-4 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('excel')} data-testid="export-excel-btn">
              <Download className="w-4 h-4 mr-1" /> Excel
            </Button>
          </div>
        </div>

        {/* Billing Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="kpi-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Total Bills</p>
              <p className="text-2xl font-bold">{reportData.billing?.total_bills || 0}</p>
              <p className="text-sm text-muted-foreground">{formatCurrency(reportData.billing?.total_amount || 0)}</p>
            </CardContent>
          </Card>
          <Card className="kpi-card success">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">GST Collected</p>
              <p className="text-2xl font-bold">{formatCurrency(reportData.billing?.gst_collected || 0)}</p>
            </CardContent>
          </Card>
          <Card className="kpi-card warning">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Pending</p>
              <p className="text-2xl font-bold">{formatCurrency(reportData.billing?.by_status?.pending || 0)}</p>
            </CardContent>
          </Card>
          <Card className="kpi-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Collection Rate</p>
              <p className="text-2xl font-bold">{reportData.cash_flow?.collection_rate_pct || 0}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Monthly Trend */}
          <Card className="rounded-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base uppercase">Billing vs Collection Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="billed" name="Billed" fill="#0052CC" />
                    <Bar dataKey="received" name="Received" fill="#00875A" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Billing by Type */}
          <Card className="rounded-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base uppercase">Billing by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={[
                        { name: 'Running', value: reportData.billing?.by_type?.running || 0 },
                        { name: 'Final', value: reportData.billing?.by_type?.final || 0 },
                        { name: 'Advance', value: reportData.billing?.by_type?.advance || 0 }
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CVR Summary Table */}
        <Card className="rounded-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base uppercase">CVR Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Total Contracted Value</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(reportData.cvr_summary?.total_contracted || 0)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Work Done Value</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(reportData.cvr_summary?.total_work_done || 0)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total Billed</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(reportData.cvr_summary?.total_billed || 0)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total Received</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-600">{formatCurrency(reportData.cvr_summary?.total_received || 0)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Retention Held</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(reportData.cvr_summary?.total_retention || 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render Cost Variance Report
  const renderVarianceReport = () => {
    if (!reportData) return null;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Cost Variance Report</h2>
            <p className="text-muted-foreground">Budget vs Actual Analysis with Performance Indices</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}><Download className="w-4 h-4 mr-1" /> PDF</Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('excel')}><Download className="w-4 h-4 mr-1" /> Excel</Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="kpi-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Total Budget</p>
              <p className="text-2xl font-bold">{formatCurrency(reportData.summary?.total_budget || 0)}</p>
            </CardContent>
          </Card>
          <Card className="kpi-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Total Actual</p>
              <p className="text-2xl font-bold">{formatCurrency(reportData.summary?.total_actual || 0)}</p>
            </CardContent>
          </Card>
          <Card className={cn("kpi-card", reportData.summary?.overall_variance >= 0 ? "success" : "danger")}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Overall Variance</p>
              <p className="text-2xl font-bold">
                {reportData.summary?.overall_variance >= 0 ? '+' : ''}{formatCurrency(reportData.summary?.overall_variance || 0)}
              </p>
              <p className="text-xs">{reportData.summary?.overall_variance_pct}%</p>
            </CardContent>
          </Card>
          <Card className="kpi-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Over Budget</p>
              <p className="text-2xl font-bold text-red-600">{reportData.summary?.projects_over_budget || 0}</p>
              <p className="text-xs text-muted-foreground">of {(reportData.summary?.projects_over_budget || 0) + (reportData.summary?.projects_under_budget || 0)} projects</p>
            </CardContent>
          </Card>
        </div>

        {/* Project Variance Table */}
        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle className="text-base uppercase">Project-wise Cost Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-center">CPI</TableHead>
                  <TableHead className="text-center">SPI</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.projects?.map((proj, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{proj.project_name}</p>
                        <p className="text-xs text-muted-foreground">{proj.project_code}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(proj.budget)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(proj.actual_cost)}</TableCell>
                    <TableCell className={cn(
                      "text-right font-semibold",
                      proj.variance >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {proj.variance >= 0 ? '+' : ''}{formatCurrency(proj.variance)}
                      <span className="text-xs ml-1">({proj.variance_pct}%)</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={proj.performance_indices?.cpi >= 1 ? "default" : "destructive"}>
                        {proj.performance_indices?.cpi}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={proj.performance_indices?.spi >= 1 ? "default" : "destructive"}>
                        {proj.performance_indices?.spi}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "status-badge",
                        proj.status === "Under Budget" && "completed",
                        proj.status === "Over Budget" && "pending"
                      )}>
                        {proj.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Performance Index Legend */}
        <Card className="rounded-sm bg-muted/50">
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">Performance Index Guide</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">CPI (Cost Performance Index)</span>
                <p className="text-muted-foreground">CPI ≥ 1.0 = Under Budget</p>
              </div>
              <div>
                <span className="font-medium">SPI (Schedule Performance Index)</span>
                <p className="text-muted-foreground">SPI ≥ 1.0 = Ahead of Schedule</p>
              </div>
              <div>
                <span className="font-medium text-emerald-600">Green Badge</span>
                <p className="text-muted-foreground">Performance is good</p>
              </div>
              <div>
                <span className="font-medium text-red-600">Red Badge</span>
                <p className="text-muted-foreground">Needs attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render Compliance Report
  const renderComplianceReport = () => {
    if (!reportData) return null;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Compliance Status Report</h2>
            <p className="text-muted-foreground">GST, RERA & Statutory Compliance - Tamil Nadu</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}><Download className="w-4 h-4 mr-1" /> PDF</Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('excel')}><Download className="w-4 h-4 mr-1" /> Excel</Button>
          </div>
        </div>

        {/* Compliance Score */}
        <Card className="rounded-sm border-l-4 border-l-emerald-500">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Overall Compliance Score</h3>
              <p className="text-muted-foreground">Based on GST filings and RERA status</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-emerald-600">{reportData.compliance_score || 100}%</p>
              <Badge className="status-badge completed">Compliant</Badge>
            </div>
          </CardContent>
        </Card>

        {/* GST Summary */}
        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle className="text-base uppercase flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              GST Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-muted rounded-sm">
                <p className="text-xs text-muted-foreground uppercase">Returns Filed</p>
                <p className="text-2xl font-bold">{reportData.gst?.returns_filed || 0}</p>
              </div>
              <div className="p-4 bg-muted rounded-sm">
                <p className="text-xs text-muted-foreground uppercase">Output Tax</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.gst?.total_output_tax || 0)}</p>
              </div>
              <div className="p-4 bg-muted rounded-sm">
                <p className="text-xs text-muted-foreground uppercase">Input Tax (ITC)</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(reportData.gst?.total_input_tax || 0)}</p>
              </div>
              <div className="p-4 bg-muted rounded-sm">
                <p className="text-xs text-muted-foreground uppercase">Net Payable</p>
                <p className="text-2xl font-bold">{formatCurrency(reportData.gst?.net_payable || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RERA Projects */}
        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle className="text-base uppercase flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              RERA Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-muted rounded-sm">
                <p className="text-xs text-muted-foreground uppercase">Registered Projects</p>
                <p className="text-2xl font-bold">{reportData.rera?.total_projects || 0}</p>
              </div>
              <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-sm">
                <p className="text-xs text-muted-foreground uppercase">Compliant</p>
                <p className="text-2xl font-bold text-emerald-600">{reportData.rera?.compliant || 0}</p>
              </div>
              <div className="p-4 bg-muted rounded-sm">
                <p className="text-xs text-muted-foreground uppercase">Units Sold</p>
                <p className="text-2xl font-bold">{reportData.rera?.sold_units || 0} / {reportData.rera?.total_units || 0}</p>
                <Progress value={reportData.rera?.sales_pct || 0} className="h-2 mt-2" />
              </div>
            </div>

            {reportData.rera?.projects?.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>RERA Number</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.rera.projects.map((proj, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{proj.project_name}</TableCell>
                      <TableCell className="font-mono text-sm">{proj.rera_number}</TableCell>
                      <TableCell>{formatDate(proj.validity_date)}</TableCell>
                      <TableCell>{proj.units_sold}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "status-badge",
                          proj.compliance_status === 'compliant' ? "completed" : "pending"
                        )}>
                          {proj.compliance_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="rounded-sm border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="text-base uppercase flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportData.upcoming_deadlines?.map((deadline, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{deadline.type}</Badge>
                    <span>{deadline.description}</span>
                  </div>
                  <span className="font-mono text-sm">{formatDate(deadline.due_date)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Main Render
  const renderActiveReport = () => {
    switch (activeReport) {
      case 'executive':
        return renderExecutiveReport();
      case 'project':
        return renderProjectReport();
      case 'financial':
        return renderFinancialReport();
      case 'variance':
        return renderVarianceReport();
      case 'compliance':
        return renderComplianceReport();
      case 'procurement':
      case 'hrms':
        // Simplified render for other reports
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold capitalize">{activeReport} Report</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}><Download className="w-4 h-4 mr-1" /> PDF</Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('excel')}><Download className="w-4 h-4 mr-1" /> Excel</Button>
              </div>
            </div>
            <Card className="rounded-sm">
              <CardContent className="p-6">
                <pre className="text-sm overflow-auto">{JSON.stringify(reportData, null, 2)}</pre>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return renderOverview();
    }
  };

  return (
    <div className="space-y-6" data-testid="reports-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText className="w-8 h-8" />
            Reports & Analytics
          </h1>
          <p className="page-subtitle">Comprehensive insights across all modules</p>
        </div>
        {activeReport !== 'overview' && (
          <Button variant="outline" onClick={() => { setActiveReport('overview'); setReportData(null); }}>
            ← Back to Reports
          </Button>
        )}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
            <p className="mt-2 text-muted-foreground">Generating report...</p>
          </div>
        </div>
      ) : (
        renderActiveReport()
      )}
    </div>
  );
}
