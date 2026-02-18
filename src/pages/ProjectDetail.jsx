import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Save, X, Plus, Trash2, Loader2,
  MapPin, Calendar, IndianRupee, Users, CheckCircle2,
  Clock, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, BarChart3,
  ListTodo, FileText, Wallet, CloudSun, HardHat, Wrench, Fuel, Camera,
  Upload, Image, FileDown, Eye, Paperclip, FolderOpen, Briefcase, Package, Download, Share2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { formatCurrency, formatDate, projectStatusLabels } from '../lib/utils';
import { DeleteConfirmationDialog } from '../components/DeleteConfirmationDialog';


const statusColors = {
  planning: 'bg-slate-100 text-slate-700 border-slate-300',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-300',
  on_hold: 'bg-amber-100 text-amber-700 border-amber-300',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-300',
};
const taskStatusColors = {
  pending: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
};
const taskStatusLabels = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' };

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { api, user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [dprs, setDprs] = useState([]);
  const [billings, setBillings] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Dialogs
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [dprDialogOpen, setDprDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [documents, setDocuments] = useState([]);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [docCategoryFilter, setDocCategoryFilter] = useState('all');
  const [viewDpr, setViewDpr] = useState(null);

  // Delete States
  const [deleteTaskDialogOpen, setDeleteTaskDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  const [deleteDocDialogOpen, setDeleteDocDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  // Pagination
  const TASK_PAGE_SIZE = 10;
  const DPR_PAGE_SIZE = 8;
  const [taskPage, setTaskPage] = useState(1);
  const [dprPage, setDprPage] = useState(1);


  const fetchAll = useCallback(async () => {
    try {
      const [projRes, summRes, tasksRes, dprsRes, billsRes, docsRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/summary`),
        api.get(`/tasks?project_id=${id}`),
        api.get(`/dpr?project_id=${id}`),
        api.get(`/billing?project_id=${id}`),
        api.get(`/documents?project_id=${id}&exclude_category=dpr`)
      ]);
      setProject(projRes.data);
      setSummary(summRes.data);
      setTasks(tasksRes.data);
      setDprs(dprsRes.data);
      setBillings(billsRes.data);
      setDocuments(docsRes.data);
      setEditForm(projRes.data);
    } catch (error) {
      toast.error('Failed to load project');
      navigate('/projects');
    } finally { setLoading(false); }
  }, [api, id, navigate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Read ?tab=&action= params from Projects page quick-actions
  useEffect(() => {
    const tab = searchParams.get('tab');
    const action = searchParams.get('action');
    if (tab) setActiveTab(tab);
    if (action === 'edit') setEditing(true);
    if (action === 'add-task') { setEditingTask(null); setTaskDialogOpen(true); }
    if (tab || action) setSearchParams({}, { replace: true });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // --- Project Edit ---
  const handleSaveProject = async () => {
    setSaving(true);
    try {
      await api.put(`/projects/${id}`, {
        name: editForm.name, code: editForm.code, description: editForm.description || '',
        client_name: editForm.client_name, location: editForm.location,
        start_date: editForm.start_date, expected_end_date: editForm.expected_end_date,
        budget: parseFloat(editForm.budget)
      });
      toast.success('Project updated');
      setEditing(false);
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || 'Update failed'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (status) => {
    try {
      await api.patch(`/projects/${id}/status`, { status });
      toast.success(`Status: ${projectStatusLabels[status]}`);
      fetchAll();
    } catch { toast.error('Failed to update status'); }
  };

  const handleProgressUpdate = async (cost) => {
    try {
      const payload = {};
      if (cost) payload.actual_cost = parseFloat(cost);
      await api.patch(`/projects/${id}/progress`, payload);
      toast.success('Actual cost updated');
      setProgressDialogOpen(false);
      fetchAll();
    } catch { toast.error('Failed to update'); }
  };

  // --- Tasks ---
  const handleTaskSubmit = async (taskData) => {
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, { ...taskData, project_id: id });
        toast.success('Task updated');
      } else {
        await api.post('/tasks', { ...taskData, project_id: id });
        toast.success('Task created');
      }
      setTaskDialogOpen(false);
      setEditingTask(null);
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleTaskStatusChange = async (taskId, status) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status });
      toast.success(`Task: ${taskStatusLabels[status]}`);
      fetchAll();
    } catch { toast.error('Failed'); }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsDeletingTask(true);
    try {
      await api.delete(`/tasks/${taskToDelete.id}`);
      toast.success('Task deleted');
      setDeleteTaskDialogOpen(false);
      fetchAll();
    } catch { toast.error('Failed to delete task'); }
    finally { setIsDeletingTask(false); }
  };

  // --- DPR ---
  const handleDprSubmit = async (dprData) => {
    try {
      await api.post('/dpr', { ...dprData, project_id: id });
      toast.success('DPR created');
      setDprDialogOpen(false);
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  // --- Documents ---
  const handleDocUpload = async (file, category, description) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', id);
    formData.append('category', category);
    formData.append('description', description);
    try {
      await api.post('/documents/upload', formData);
      toast.success('Document uploaded');
      setUploadDialogOpen(false);
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || 'Upload failed'); }
  };

  const handleDeleteDoc = async () => {
    if (!docToDelete) return;
    setIsDeletingDoc(true);
    try {
      await api.delete(`/documents/${docToDelete.id}`);
      toast.success('Document deleted');
      setDeleteDocDialogOpen(false);
      setPreviewDoc(null);
      fetchAll();
    } catch { toast.error('Failed to delete'); }
    finally { setIsDeletingDoc(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!project) return null;

  const budgetPct = project.budget > 0 ? ((project.actual_cost / project.budget) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6" data-testid="project-detail-page">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/projects')} className="mt-1" data-testid="back-to-projects-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <p className="text-xs font-mono text-muted-foreground">{project.code}</p>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge className={`${statusColors[project.status]} rounded-sm font-medium`} data-testid="project-status-badge">
                {projectStatusLabels[project.status]}
              </Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1"><Users className="w-3.5 h-3.5" />{project.client_name}</span>
              <span className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{project.location}</span>
            </div>
          </div>
        </div>
        {hasPermission('projects', 'edit') && (
          <div className="flex gap-2">
            <Select value={project.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-40 rounded-sm text-sm" data-testid="change-status-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(projectStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="rounded-sm gap-1" onClick={() => setProgressDialogOpen(true)} data-testid="update-progress-btn">
              <BarChart3 className="w-4 h-4" /> Progress
            </Button>
            <Button variant="outline" size="sm" className="rounded-sm gap-1" onClick={() => { setEditForm(project); setEditing(true); }} data-testid="edit-project-btn">
              <Edit3 className="w-4 h-4" /> Edit
            </Button>
          </div>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Budget" value={formatCurrency(project.budget)} icon={IndianRupee} color="blue" />
        <KpiCard label="Spent" value={formatCurrency(project.actual_cost)} icon={Wallet} color={parseFloat(budgetPct) > 90 ? 'red' : 'emerald'} />
        <KpiCard label="Progress" value={`${project.progress_percentage || 0}%`} icon={BarChart3} color="purple" />
        <KpiCard label="Tasks" value={`${summary?.tasks?.completed || 0}/${summary?.tasks?.total || 0}`} icon={ListTodo} color="amber" />
        <KpiCard label="DPRs" value={summary?.dprs?.total || 0} icon={FileText} color="slate" />
      </div>

      {/* Progress Bar */}
      <Card className="rounded-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-bold">{project.progress_percentage || 0}%</span>
          </div>
          <Progress value={project.progress_percentage || 0} className="h-3" />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{formatDate(project.start_date)}</span>
            <span>Budget Used: {budgetPct}%</span>
            <span>{formatDate(project.expected_end_date)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="rounded-sm">
          <TabsTrigger value="overview" className="rounded-sm gap-1.5" data-testid="tab-overview"><BarChart3 className="w-4 h-4" />Overview</TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-sm gap-1.5" data-testid="tab-tasks"><ListTodo className="w-4 h-4" />Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="dpr" className="rounded-sm gap-1.5" data-testid="tab-dpr"><FileText className="w-4 h-4" />DPR ({dprs.length})</TabsTrigger>
          <TabsTrigger value="financials" className="rounded-sm gap-1.5" data-testid="tab-financials"><IndianRupee className="w-4 h-4" />Financials</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-sm gap-1.5" data-testid="tab-documents"><Paperclip className="w-4 h-4" />Documents ({documents.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="rounded-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Project Information</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ['Project Name', project.name],
                  ['Project Code', project.code],
                  ['Client', project.client_name],
                  ['Location', project.location],
                  ['Description', project.description || '-'],
                  ['Start Date', formatDate(project.start_date)],
                  ['End Date', formatDate(project.expected_end_date)],
                  ['Created', formatDate(project.created_at)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b pb-2 last:border-0">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium text-right max-w-[60%] truncate">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Project Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ['Budget', formatCurrency(project.budget)],
                  ['Actual Cost', formatCurrency(project.actual_cost)],
                  ['Variance', formatCurrency(summary?.financial?.variance || 0)],
                  ['Tasks Completed', `${summary?.tasks?.completed || 0} / ${summary?.tasks?.total || 0}`],
                  ['In Progress Tasks', summary?.tasks?.in_progress || 0],
                  ['Total DPRs', summary?.dprs?.total || 0],
                  ['Total Billed', formatCurrency(summary?.financial?.total_billed || 0)],
                  ['Purchase Orders', `${summary?.procurement?.total_pos || 0} (${formatCurrency(summary?.procurement?.total_po_value || 0)})`],
                  ['Labor Days', summary?.workforce?.labor_days || 0],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b pb-2 last:border-0">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Task Timeline */}
          {tasks.length > 0 && (
            <Card className="rounded-sm mt-4">
              <CardHeader className="pb-3"><CardTitle className="text-base">Task Timeline</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tasks.map((t) => {
                    const prog = t.status === 'completed' ? 100 : t.status === 'in_progress' ? (t.progress || 50) : 0;
                    return (
                      <div key={t.id} className="flex items-center gap-3">
                        <div className="w-40 text-sm truncate font-medium">{t.name}</div>
                        <div className="flex-1"><Progress value={prog} className="h-2" /></div>
                        <Badge className={`${taskStatusColors[t.status]} text-xs rounded-sm`}>{taskStatusLabels[t.status]}</Badge>
                        <span className="text-xs text-muted-foreground w-20 text-right">{formatDate(t.end_date)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{tasks.length} tasks | {summary?.tasks?.completed || 0} completed</p>
            {hasPermission('projects', 'edit') && (
              <Button className="action-btn action-btn-accent" onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }} data-testid="add-task-btn">
                <Plus className="w-4 h-4" /> Add Task
              </Button>
            )}
          </div>
          <Card className="rounded-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="text-right">Est. Cost</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  {hasPermission('projects', 'edit') && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No tasks yet. Add your first task.</TableCell></TableRow>
                ) : tasks.slice((taskPage - 1) * TASK_PAGE_SIZE, taskPage * TASK_PAGE_SIZE).map((t) => (
                  <TableRow key={t.id} data-testid={`task-row-${t.id}`}>
                    <TableCell>
                      <p className="font-medium text-sm">{t.name}</p>
                      {t.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{t.description}</p>}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(t.start_date)} - {formatDate(t.end_date)}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(t.estimated_cost)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 w-28">
                        <Progress value={t.progress || 0} className="h-1.5 flex-1" />
                        <span className="text-xs">{t.progress || 0}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {hasPermission('projects', 'edit') ? (
                        <Select value={t.status} onValueChange={(v) => handleTaskStatusChange(t.id, v)} disabled={t.status === 'completed'}>
                          <SelectTrigger className="h-7 text-xs rounded-sm w-28" data-testid={`task-status-${t.id}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(taskStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={`${taskStatusColors[t.status]} text-xs rounded-sm`}>{taskStatusLabels[t.status]}</Badge>
                      )}
                    </TableCell>
                    {hasPermission('projects', 'edit') && (
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingTask(t); setTaskDialogOpen(true); }} data-testid={`edit-task-${t.id}`}>
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => { setTaskToDelete(t); setDeleteTaskDialogOpen(true); }} data-testid={`delete-task-${t.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          {tasks.length > TASK_PAGE_SIZE && (
            <div className="flex items-center justify-between pt-3">
              <p className="text-sm text-muted-foreground">
                {(taskPage - 1) * TASK_PAGE_SIZE + 1}–{Math.min(taskPage * TASK_PAGE_SIZE, tasks.length)} of {tasks.length} tasks
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-sm" onClick={() => setTaskPage(p => Math.max(1, p - 1))} disabled={taskPage <= 1}>
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <span className="text-sm font-medium px-1">Page {taskPage} / {Math.ceil(tasks.length / TASK_PAGE_SIZE)}</span>
                <Button variant="outline" size="sm" className="rounded-sm" onClick={() => setTaskPage(p => Math.min(Math.ceil(tasks.length / TASK_PAGE_SIZE), p + 1))} disabled={taskPage >= Math.ceil(tasks.length / TASK_PAGE_SIZE)}>
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* DPR Tab */}
        <TabsContent value="dpr">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{dprs.length} daily progress reports</p>
            {hasPermission('projects', 'edit') && (
              <Button className="action-btn action-btn-accent" onClick={() => setDprDialogOpen(true)} data-testid="add-dpr-btn">
                <Plus className="w-4 h-4" /> New DPR
              </Button>
            )}
          </div>
          {dprs.length === 0 ? (
            <Card className="rounded-sm"><CardContent className="text-center py-12 text-muted-foreground"><FileText className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No daily progress reports yet.</p></CardContent></Card>
          ) : (
            <div className="border rounded-sm overflow-hidden">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="bg-blue-50">
                    <TableHead className="h-9 text-xs font-semibold text-blue-800">#</TableHead>
                    <TableHead className="h-9 text-xs font-semibold text-blue-800">Date</TableHead>
                    <TableHead className="h-9 text-xs font-semibold text-blue-800">Weather</TableHead>
                    <TableHead className="h-9 text-xs font-semibold text-blue-800">Work Summary</TableHead>
                    <TableHead className="h-9 text-xs font-semibold text-blue-800 text-center">Labour</TableHead>
                    <TableHead className="h-9 text-xs font-semibold text-blue-800 text-center">Materials</TableHead>
                    <TableHead className="h-9 text-xs font-semibold text-blue-800 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...dprs].reverse().slice((dprPage - 1) * DPR_PAGE_SIZE, dprPage * DPR_PAGE_SIZE).map((d, idx) => {
                    const labourTotal = d.labour_entries?.reduce((s, r) => s + (r.labour_count || 0), 0) || d.labor_count || 0;
                    const matCount = d.material_stock_entries?.length || d.materials_used_entries?.length || 0;
                    const workSnippet = d.work_summary_entries?.length > 0
                      ? d.work_summary_entries.map(w => w.task_name).join(', ')
                      : (d.work_done || '—');
                    return (
                      <TableRow key={d.id} className="hover:bg-muted/30" data-testid={`dpr-card-${d.id}`}>
                        <TableCell className="py-2 font-mono text-xs text-muted-foreground">{(dprPage - 1) * DPR_PAGE_SIZE + idx + 1}</TableCell>
                        <TableCell className="py-2 font-medium whitespace-nowrap">{formatDate(d.date)}</TableCell>
                        <TableCell className="py-2 text-xs">{d.weather || '—'}</TableCell>
                        <TableCell className="py-2 text-xs max-w-[250px] truncate">{workSnippet}</TableCell>
                        <TableCell className="py-2 text-center"><Badge variant="outline" className="rounded-sm text-[10px]">{labourTotal}</Badge></TableCell>
                        <TableCell className="py-2 text-center"><Badge variant="outline" className="rounded-sm text-[10px]">{matCount}</Badge></TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View DPR" onClick={() => setViewDpr(d)}>
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Download PDF" onClick={() => generateDprPdf(d, project, api)}>
                              <Download className="w-3.5 h-3.5 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Share DPR" onClick={() => shareDpr(d, project?.name)}>
                              <Share2 className="w-3.5 h-3.5 text-blue-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {dprs.length > DPR_PAGE_SIZE && (
            <div className="flex items-center justify-between pt-3">
              <p className="text-sm text-muted-foreground">
                {(dprPage - 1) * DPR_PAGE_SIZE + 1}–{Math.min(dprPage * DPR_PAGE_SIZE, dprs.length)} of {dprs.length} reports
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-sm" onClick={() => setDprPage(p => Math.max(1, p - 1))} disabled={dprPage <= 1}>
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <span className="text-sm font-medium px-1">Page {dprPage} / {Math.ceil(dprs.length / DPR_PAGE_SIZE)}</span>
                <Button variant="outline" size="sm" className="rounded-sm" onClick={() => setDprPage(p => Math.min(Math.ceil(dprs.length / DPR_PAGE_SIZE), p + 1))} disabled={dprPage >= Math.ceil(dprs.length / DPR_PAGE_SIZE)}>
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Financials Tab */}
        <TabsContent value="financials">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card className="rounded-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase">Budget</p>
                <p className="text-2xl font-bold">{formatCurrency(project.budget)}</p>
                <Progress value={parseFloat(budgetPct)} className="h-1.5 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">{budgetPct}% utilized</p>
              </CardContent>
            </Card>
            <Card className="rounded-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase">Total Billed</p>
                <p className="text-2xl font-bold">{formatCurrency(summary?.financial?.total_billed || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">{billings.length} bills</p>
              </CardContent>
            </Card>
            <Card className="rounded-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase">Variance</p>
                <p className={`text-2xl font-bold ${(summary?.financial?.variance || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(summary?.financial?.variance || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{(summary?.financial?.variance || 0) >= 0 ? 'Under budget' : 'Over budget'}</p>
              </CardContent>
            </Card>
          </div>
          <Card className="rounded-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base">Bills</CardTitle></CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billings.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No bills for this project</TableCell></TableRow>
                ) : billings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-sm">{b.bill_number}</TableCell>
                    <TableCell className="text-sm">{formatDate(b.bill_date)}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{b.description}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs rounded-sm capitalize">{b.bill_type}</Badge></TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(b.amount)}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(b.gst_amount)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatCurrency(b.total_amount)}</TableCell>
                    <TableCell><Badge className={`text-xs rounded-sm ${b.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : b.status === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>{b.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-muted-foreground">{documents.length} documents</p>
            {hasPermission('projects', 'edit') && (
              <Button className="action-btn action-btn-accent" onClick={() => setUploadDialogOpen(true)} data-testid="upload-doc-btn">
                <Upload className="w-4 h-4" /> Upload Document
              </Button>
            )}
          </div>

          {/* Category filter chips */}
          {documents.length > 0 && (() => {
            const uniqueCats = ['all', ...Array.from(new Set(documents.map(d => d.category).filter(Boolean)))];
            return (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {uniqueCats.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setDocCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-sm text-xs font-medium border transition-colors capitalize ${
                      docCategoryFilter === cat
                        ? 'bg-accent text-accent-foreground border-accent'
                        : 'bg-background text-muted-foreground border-border hover:border-accent hover:text-accent'
                    }`}
                  >
                    {cat === 'all' ? `All (${documents.length})` : `${cat.replace(/_/g, ' ')} (${documents.filter(d => d.category === cat).length})`}
                  </button>
                ))}
              </div>
            );
          })()}

          {previewDoc ? (
            <DocPreview doc={previewDoc} onBack={() => setPreviewDoc(null)} onDelete={() => { setDocToDelete(previewDoc); setDeleteDocDialogOpen(true); }} canEdit={hasPermission('projects', 'edit')} />
          ) : documents.length === 0 ? (
            <Card className="rounded-sm"><CardContent className="text-center py-12 text-muted-foreground"><FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No documents uploaded yet</p><p className="text-xs mt-1">Upload plans, drawings, PDFs, and images</p></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(docCategoryFilter === 'all' ? documents : documents.filter(d => d.category === docCategoryFilter)).map((doc) => (
                <Card key={doc.id} className="rounded-sm card-hover cursor-pointer group" onClick={() => setPreviewDoc(doc)} data-testid={`doc-card-${doc.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-sm shrink-0 ${isImageFile(doc.file_extension) ? 'bg-purple-100' : 'bg-blue-100'}`}>
                        {isImageFile(doc.file_extension) ? <Image className="w-5 h-5 text-purple-600" /> : <FileText className="w-5 h-5 text-blue-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{doc.filename}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="text-[10px] rounded-sm capitalize">{doc.category}</Badge>
                          <span className="text-[10px] text-muted-foreground">{formatDate(doc.created_at)}</span>
                        </div>
                        {doc.description && <p className="text-xs text-muted-foreground mt-1 truncate">{doc.description}</p>}
                      </div>
                      {hasPermission('projects', 'edit') && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 shrink-0" onClick={(e) => { e.stopPropagation(); setDocToDelete(doc); setDeleteDocDialogOpen(true); }} data-testid={`delete-doc-${doc.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    {isImageFile(doc.file_extension) && (
                      <div className="mt-3 rounded-sm overflow-hidden bg-muted h-32">
                        <img src={getFileUrl(doc)} alt={doc.filename} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Project Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="text-xl font-bold uppercase">Edit Project</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Project Name" value={editForm.name} onChange={v => setEditForm(f => ({ ...f, name: v }))} testId="edit-name" />
              <FormField label="Project Code" value={editForm.code} onChange={v => setEditForm(f => ({ ...f, code: v }))} testId="edit-code" />
            </div>
            <FormField label="Description" value={editForm.description || ''} onChange={v => setEditForm(f => ({ ...f, description: v }))} />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Client" value={editForm.client_name} onChange={v => setEditForm(f => ({ ...f, client_name: v }))} testId="edit-client" />
              <FormField label="Location" value={editForm.location} onChange={v => setEditForm(f => ({ ...f, location: v }))} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Start Date" type="date" value={editForm.start_date} onChange={v => setEditForm(f => ({ ...f, start_date: v }))} />
              <FormField label="End Date" type="date" value={editForm.expected_end_date} onChange={v => setEditForm(f => ({ ...f, expected_end_date: v }))} />
              <FormField label="Budget (INR)" type="number" value={editForm.budget} onChange={v => setEditForm(f => ({ ...f, budget: v }))} testId="edit-budget" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditing(false)} className="rounded-sm">Cancel</Button>
              <Button onClick={handleSaveProject} className="action-btn-accent rounded-sm" disabled={saving} data-testid="save-project-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Progress Update Dialog */}
      <ProgressDialog open={progressDialogOpen} onClose={() => setProgressDialogOpen(false)} currentProgress={project.progress_percentage || 0} currentCost={project.actual_cost} totalTasks={tasks.length} completedTasks={tasks.filter(t => t.status === 'completed').length} onSubmit={handleProgressUpdate} />

      {/* Task Dialog */}
      <TaskDialog open={taskDialogOpen} onClose={() => { setTaskDialogOpen(false); setEditingTask(null); }} task={editingTask} onSubmit={handleTaskSubmit} />

      {/* DPR Dialog */}
      <DprDialog open={dprDialogOpen} onClose={() => setDprDialogOpen(false)} onSubmit={handleDprSubmit} project={project} api={api} />

      {/* DPR View Dialog */}
      <DprViewDialog dpr={viewDpr} project={project} api={api} onClose={() => setViewDpr(null)} />

      <UploadDialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} onSubmit={handleDocUpload} />

      <DeleteConfirmationDialog
        open={deleteTaskDialogOpen}
        onOpenChange={setDeleteTaskDialogOpen}
        onConfirm={handleDeleteTask}
        isDeleting={isDeletingTask}
        title="Delete Task?"
        description="This will permanently delete this task. This action cannot be undone."
      />

      <DeleteConfirmationDialog
        open={deleteDocDialogOpen}
        onOpenChange={setDeleteDocDialogOpen}
        onConfirm={handleDeleteDoc}
        isDeleting={isDeletingDoc}
        title={`Delete "${docToDelete?.filename}"?`}
        description="This will permanently delete this document. This action cannot be undone."
      />
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <Card className="kpi-card">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`p-2 rounded-sm bg-${color}-100`}><Icon className={`w-4 h-4 text-${color}-600`} /></div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
          <p className="text-lg font-bold leading-tight" data-testid={`kpi-${label.toLowerCase()}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FormField({ label, value, onChange, type = 'text', testId }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value || ''} onChange={e => onChange(e.target.value)} className="rounded-sm text-sm" data-testid={testId} />
    </div>
  );
}

function ProgressDialog({ open, onClose, currentProgress, currentCost, totalTasks, completedTasks, onSubmit }) {
  const [cost, setCost] = useState(currentCost || '');
  useEffect(() => { setCost(currentCost || ''); }, [currentCost]);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Project Progress</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Progress</Label>
              <span className="text-sm font-bold text-accent">{currentProgress}%</span>
            </div>
            <Progress value={currentProgress} className="h-2.5" />
            <p className="text-xs text-muted-foreground">
              Auto-calculated: {completedTasks} of {totalTasks} tasks completed
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Actual Cost (INR)</Label>
            <Input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="Current cost" className="rounded-sm" data-testid="progress-cost-input" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="rounded-sm">Cancel</Button>
            <Button onClick={() => onSubmit(cost)} className="action-btn-accent rounded-sm" data-testid="save-progress-btn">Update</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskDialog({ open, onClose, task, onSubmit }) {
  const [form, setForm] = useState({ name: '', description: '', start_date: '', end_date: '', estimated_cost: 0, assigned_to: '' });
  useEffect(() => {
    if (task) setForm({ name: task.name, description: task.description || '', start_date: task.start_date, end_date: task.end_date, estimated_cost: task.estimated_cost, assigned_to: task.assigned_to || '' });
    else setForm({ name: '', description: '', start_date: '', end_date: '', estimated_cost: 0, assigned_to: '' });
  }, [task, open]);
  const handleSubmit = (e) => { e.preventDefault(); onSubmit(form); };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="text-lg font-bold uppercase">{task ? 'Edit Task' : 'Add Task'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <FormField label="Task Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} testId="task-name-input" />
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Task details..." className="rounded-sm text-sm" rows={2} data-testid="task-desc-input" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Start Date *" type="date" value={form.start_date} onChange={v => setForm(f => ({ ...f, start_date: v }))} testId="task-start-date" />
            <FormField label="End Date *" type="date" value={form.end_date} onChange={v => setForm(f => ({ ...f, end_date: v }))} testId="task-end-date" />
            <FormField label="Est. Cost" type="number" value={form.estimated_cost} onChange={v => setForm(f => ({ ...f, estimated_cost: +v }))} testId="task-cost-input" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-sm">Cancel</Button>
            <Button type="submit" className="action-btn-accent rounded-sm" data-testid="submit-task-btn">{task ? 'Update Task' : 'Add Task'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PickerSection({ label, items, addedItems, itemKey, nameKey, subKey, subLabel, countLabel, onAdd, onRemove, totalLabel, totalVal, emptyMsg }) {
  const [selId, setSelId] = useState('');
  const [selCount, setSelCount] = useState('');
  const unused = items.filter(i => !addedItems.find(r => r[itemKey] === i.id));
  const doAdd = () => {
    const item = items.find(i => i.id === selId);
    if (!item || !selCount || parseFloat(selCount) <= 0) return;
    onAdd(item, parseFloat(selCount));
    setSelId(''); setSelCount('');
  };
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2 px-3 bg-muted/40 rounded-sm">{emptyMsg}</p>
      ) : (
        <>
          <Select value={selId} onValueChange={setSelId}>
            <SelectTrigger className="rounded-sm text-sm w-full"><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
            <SelectContent>
              {unused.map(i => (
                <SelectItem key={i.id} value={i.id}>
                  {i[nameKey]}{i[subKey] ? <span className="text-muted-foreground text-xs ml-1">{subLabel(i)}</span> : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input type="number" min="0.01" step="any" placeholder={countLabel}
              value={selCount} onChange={e => setSelCount(e.target.value)}
              className="flex-1 rounded-sm text-sm"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } }}
            />
            <Button type="button" variant="outline" className="rounded-sm px-3 shrink-0" onClick={doAdd} disabled={!selId || !selCount}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {addedItems.length > 0 && (
            <div className="border rounded-sm">
              <div className="divide-y overflow-y-auto max-h-36">
                {addedItems.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 text-sm">
                    <span className="font-medium">{r.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-xs">{r.sub}</span>
                      <span className="font-semibold w-10 text-right">{r.count}</span>
                      <button type="button" onClick={() => onRemove(r[itemKey])} className="text-muted-foreground hover:text-red-500 transition-colors text-base leading-none">×</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between px-3 py-1.5 text-sm font-semibold bg-muted/40 border-t">
                <span>{totalLabel}</span><span>{totalVal}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Helper: fetch image as base64 via backend proxy (avoids CORS) ──
async function fetchImageAsDataUrl(api, docId) {
  try {
    const resp = await api.get(`/documents/${docId}/content`, { responseType: 'blob' });
    const blob = resp.data;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Failed to fetch image content for', docId, e);
    return null;
  }
}

// ── DPR Share ──────────────────────────────────────────
function shareDpr(dpr, projectName) {
  const workSnippet = dpr.work_summary_entries?.length > 0
    ? dpr.work_summary_entries.map(w => w.task_name).join(', ')
    : (dpr.work_done || '-');
  const workerCount = dpr.labour_entries?.reduce((s, r) => s + (r.labour_count || 0), 0) || dpr.labor_count || 0;
  const text = [
    `Daily Progress Report`,
    `Project: ${projectName || '-'}`,
    `Date: ${formatDate(dpr.date)}`,
    `Weather: ${dpr.weather || '-'}`,
    `Work Done: ${workSnippet}`,
    `Workers: ${workerCount}`,
    dpr.issues ? `Issues: ${dpr.issues}` : null,
  ].filter(Boolean).join('\n');
  const title = `DPR – ${formatDate(dpr.date)}`;
  const url = window.location.href;
  if (navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text + '\n\n' + url)
      .then(() => toast.success('DPR details copied to clipboard'))
      .catch(() => toast.error('Could not copy to clipboard'));
  }
}

// ── DPR PDF Generator ──────────────────────────────────
async function generateDprPdf(dpr, project, api) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth();
  const margin = 14;
  const usable = pw - margin * 2;
  let y = 14;

  // Colors (muted professional tones)
  const headerBg = [51, 65, 85]; // slate-700
  const lightBg = [241, 245, 249]; // slate-100
  const darkText = [30, 41, 59]; // slate-800

  // Title block
  doc.setFillColor(...headerBg);
  doc.rect(0, 0, pw, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('DAILY PROGRESS REPORT', pw / 2, 12, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(project?.name || '', pw / 2, 19, { align: 'center' });
  if (project?.code) doc.text(`Code: ${project.code}`, pw / 2, 24, { align: 'center' });
  y = 34;

  // Info bar
  doc.setFillColor(...lightBg);
  doc.rect(margin, y, usable, 10, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, usable, 10, 'S');
  doc.setTextColor(...darkText);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Date: ${dpr.date}`, margin + 4, y + 6.5);
  doc.text(`Weather: ${dpr.weather || 'N/A'}`, margin + 60, y + 6.5);
  const totalLabour = dpr.labour_entries?.reduce((s, r) => s + (r.labour_count || 0), 0) || dpr.labor_count || 0;
  doc.text(`Total Labour: ${totalLabour}`, margin + 120, y + 6.5);
  y += 16;

  const sectionTitle = (title) => {
    if (y > 270) { doc.addPage(); y = 14; }
    doc.setFillColor(...headerBg);
    doc.rect(margin, y, usable, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 3, y + 5);
    y += 9;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
  };

  // 1. Work Summary
  const wsEntries = dpr.work_summary_entries?.length > 0
    ? dpr.work_summary_entries
    : dpr.work_done ? [{ task_name: dpr.work_done, progress_today: '', overall_progress: '', status: '', remark: '' }] : [];
  const tblOpts = (opts) => ({
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [...lightBg], textColor: [...darkText], fontStyle: 'bold', lineWidth: 0.2, lineColor: [200, 200, 200] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: 'grid',
    ...opts,
  });

  const runTable = (opts) => { autoTable(doc, tblOpts(opts)); y = doc.lastAutoTable.finalY; };

  if (wsEntries.length > 0) {
    sectionTitle('WORK SUMMARY');
    runTable({
      startY: y,
      head: [['#', 'Task / Activity', "Today's Progress", 'Overall Progress', 'Status', 'Remark']],
      body: wsEntries.map((w, i) => [i + 1, w.task_name, w.progress_today || '', w.overall_progress || '', w.status || '', w.remark || '']),
    }); y += 6;
  }

  // 2. Labour Details
  const labEntries = dpr.labour_entries?.length > 0 ? dpr.labour_entries : [];
  if (labEntries.length > 0) {
    sectionTitle('LABOUR DETAILS');
    runTable({
      startY: y,
      head: [['#', 'Party / Contractor', 'Workforce Category', 'Count', 'Shift', 'OT (hr)']],
      body: labEntries.map((l, i) => [i + 1, l.contractor_name, l.workforce_category || '', l.labour_count, l.shift, l.overtime_hours || 0]),
    }); y += 6;
  }

  // 3. Material Inventory
  const matEntries = dpr.material_stock_entries?.length > 0 ? dpr.material_stock_entries : [];
  if (matEntries.length > 0) {
    sectionTitle('MATERIAL USED');
    runTable({
      startY: y,
      head: [['#', 'Material', 'Unit', 'Opening Stock', 'Received', 'Used', 'Closing Stock']],
      body: matEntries.map((m, i) => [i + 1, m.item_name, m.unit || '', m.opening_stock, m.received || 0, m.used, m.closing_stock]),
    }); y += 6;
  }

  // 4. Equipment Used
  const eqEntries = dpr.equipment_entries?.length > 0 ? dpr.equipment_entries : [];
  if (eqEntries.length > 0) {
    sectionTitle('EQUIPMENT USED');
    runTable({
      startY: y,
      head: [['#', 'Equipment', 'No.', 'Hours', 'Fuel']],
      body: eqEntries.map((e, i) => [i + 1, e.equipment_name, e.equipment_no || '', `${e.total_used_hours}h`, e.fuel_added > 0 ? e.fuel_added : '—']),
    }); y += 6;
  }

  // 5. Next Day Requirement
  const ndMat = dpr.next_day_material_requests || [];
  const ndEq = dpr.next_day_equipment_requests || [];
  if (ndMat.length > 0 || ndEq.length > 0) {
    sectionTitle('NEXT DAY REQUIREMENT');
    if (ndMat.length > 0) {
      doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text('Material Requests:', margin + 2, y + 3);
      y += 5;
      runTable({
        startY: y,
        head: [['#', 'Material', 'Unit', 'Qty Needed']],
        body: ndMat.map((r, i) => [i + 1, r.item_name, r.unit || '', r.qty_needed || '']),
      }); y += 4;
    }
    if (ndEq.length > 0) {
      doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text('Equipment Requests:', margin + 2, y + 3);
      y += 5;
      runTable({
        startY: y,
        head: [['#', 'Equipment', 'Note']],
        body: ndEq.map((r, i) => [i + 1, r.equipment_name, r.note || '']),
      }); y += 6;
    }
  }

  // 6. Contractor Work Summary
  const cwEntries = dpr.contractor_work_entries || [];
  if (cwEntries.length > 0) {
    sectionTitle('CONTRACTOR WORK SUMMARY');
    runTable({
      startY: y,
      head: [['#', 'Contractor', 'Work Title', 'Progress', 'Overall']],
      body: cwEntries.map((c, i) => [i + 1, c.contractor_name, c.title, c.progress || '', c.overall_progress || '']),
    }); y += 6;
  }

  // 7. Issues / Notes
  if (dpr.issues || dpr.notes) {
    sectionTitle('ISSUES & NOTES');
    doc.setFontSize(8);
    if (dpr.issues) { doc.setFont('helvetica', 'bold'); doc.text('Issues / Delays: ', margin + 2, y + 3); doc.setFont('helvetica', 'normal'); doc.text(dpr.issues, margin + 32, y + 3); y += 6; }
    if (dpr.notes) { doc.setFont('helvetica', 'bold'); doc.text('Notes: ', margin + 2, y + 3); doc.setFont('helvetica', 'normal'); doc.text(dpr.notes, margin + 18, y + 3); y += 6; }
  }

  // 8. Site Photos — fetch via backend proxy to avoid CORS
  const docIds = dpr.document_ids || [];
  if (docIds.length > 0 && api) {
    // Fetch metadata for filenames, and image bytes via proxy
    const loaded = [];
    for (const docId of docIds) {
      try {
        const [metaRes, dataUrl] = await Promise.all([
          api.get(`/documents/${docId}`),
          fetchImageAsDataUrl(api, docId),
        ]);
        if (dataUrl) loaded.push({ filename: metaRes.data?.filename || '', dataUrl });
      } catch (e) { console.warn('Failed to load image:', docId, e); }
    }

    if (loaded.length > 0) {
      sectionTitle('SITE PHOTOS');
      const imgWidth = (usable - 6) / 2; // 2 images per row with gap
      const imgHeight = imgWidth * 0.65;
      let xCol = 0;

      for (const img of loaded) {
        // Check page space
        if (y + imgHeight + 8 > doc.internal.pageSize.getHeight() - 14) {
          doc.addPage(); y = 14; xCol = 0;
        }

        const xPos = margin + xCol * (imgWidth + 6);
        doc.addImage(img.dataUrl, 'JPEG', xPos, y, imgWidth, imgHeight);

        // Filename caption
        doc.setFontSize(6); doc.setTextColor(120, 120, 120);
        doc.text(img.filename, xPos, y + imgHeight + 3);
        doc.setTextColor(0, 0, 0);

        xCol++;
        if (xCol >= 2) { xCol = 0; y += imgHeight + 8; }
      }
      if (xCol === 1) y += imgHeight + 8;
      y += 4;
    }
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, pw / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });
    doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, pw - margin, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
  }

  doc.save(`DPR_${project?.code || 'Report'}_${dpr.date}.pdf`);
}


// ── DPR View Dialog ─────────────────────────────────────
function DprViewDialog({ dpr, project, api, onClose }) {
  const [photoDocs, setPhotoDocs] = useState([]);

  useEffect(() => {
    if (!dpr?.document_ids?.length || !api) { setPhotoDocs([]); return; }
    let cancelled = false;
    (async () => {
      const results = [];
      for (const docId of dpr.document_ids) {
        try {
          const res = await api.get(`/documents/${docId}`);
          if (res.data?.file_url) {
            const backendOrigin = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
            const url = res.data.file_url.startsWith('http')
              ? res.data.file_url
              : `${backendOrigin}${res.data.file_url}`;
            results.push({ ...res.data, resolved_url: url });
          }
        } catch (e) { console.warn('Failed to fetch doc for view:', docId, e); }
      }
      if (!cancelled) setPhotoDocs(results);
    })();
    return () => { cancelled = true; };
  }, [dpr?.id, dpr?.document_ids, api]);

  if (!dpr) return null;
  const totalLabour = dpr.labour_entries?.reduce((s, r) => s + (r.labour_count || 0), 0) || dpr.labor_count || 0;
  return (
    <Dialog open={!!dpr} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold uppercase text-blue-800">Daily Progress Report</DialogTitle>
          {project && <p className="text-sm text-muted-foreground font-medium mt-0.5">{project.name}{project.code ? ` · ${project.code}` : ''}</p>}
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Info bar */}
          <div className="flex gap-4 text-sm bg-blue-50 border border-blue-200 rounded-sm p-3">
            <span><strong className="text-blue-800">Date:</strong> {formatDate(dpr.date)}</span>
            <span><strong className="text-blue-800">Weather:</strong> {dpr.weather || 'N/A'}</span>
            <span><strong className="text-blue-800">Total Labour:</strong> {totalLabour}</span>
          </div>

          {/* Work Summary */}
          {dpr.work_summary_entries?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-blue-800 mb-1.5 flex items-center gap-1.5 border-b border-blue-200 pb-1"><FileText className="w-3.5 h-3.5 text-blue-600" />Work Summary</p>
              <div className="overflow-x-auto border rounded-sm">
                <Table className="text-xs">
                  <TableHeader><TableRow className="bg-blue-50">
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">#</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">Task</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">Progress</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">Overall</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">Status</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">Remark</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{dpr.work_summary_entries.map((w, i) => (
                    <TableRow key={i}>
                      <TableCell className="py-1">{i + 1}</TableCell>
                      <TableCell className="py-1 font-medium">{w.task_name}</TableCell>
                      <TableCell className="py-1">{w.progress_today}</TableCell>
                      <TableCell className="py-1">{w.overall_progress}</TableCell>
                      <TableCell className="py-1"><Badge className={`text-[9px] ${w.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{w.status}</Badge></TableCell>
                      <TableCell className="py-1 text-muted-foreground">{w.remark}</TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            </div>
          )}
          {!dpr.work_summary_entries?.length && dpr.work_done && (
            <div><span className="text-muted-foreground font-medium">Work Done:</span> {dpr.work_done}</div>
          )}

          {/* Labour Details */}
          {dpr.labour_entries?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-blue-800 mb-1.5 flex items-center gap-1.5 border-b border-blue-200 pb-1"><HardHat className="w-3.5 h-3.5 text-blue-600" />Labour Details</p>
              <div className="overflow-x-auto border rounded-sm">
                <Table className="text-xs">
                  <TableHeader><TableRow className="bg-blue-50">
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">#</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">Party</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">Workforce</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">Count</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">Shift</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">OT</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{dpr.labour_entries.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell className="py-1">{i + 1}</TableCell>
                      <TableCell className="py-1 font-medium">{l.contractor_name}</TableCell>
                      <TableCell className="py-1">{l.workforce_category}</TableCell>
                      <TableCell className="py-1 font-semibold">{l.labour_count}</TableCell>
                      <TableCell className="py-1">{l.shift}</TableCell>
                      <TableCell className="py-1">{l.overtime_hours || 0}h</TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Material Stock */}
          {dpr.material_stock_entries?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-blue-800 mb-1.5 flex items-center gap-1.5 border-b border-blue-200 pb-1"><Package className="w-3.5 h-3.5 text-blue-600" />Material Used</p>
              <div className="overflow-x-auto border rounded-sm">
                <Table className="text-xs">
                  <TableHeader><TableRow className="bg-blue-50">
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">#</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">Material</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800 text-right">Opening</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800 text-right">Received</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800 text-right">Used</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800 text-right">Closing</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{dpr.material_stock_entries.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="py-1">{i + 1}</TableCell>
                      <TableCell className="py-1 font-medium">{m.item_name} <span className="text-muted-foreground">({m.unit})</span></TableCell>
                      <TableCell className="py-1 text-right">{m.opening_stock}</TableCell>
                      <TableCell className="py-1 text-right text-emerald-600">{m.received > 0 ? `+${m.received}` : '0'}</TableCell>
                      <TableCell className="py-1 text-right text-red-600">{m.used}</TableCell>
                      <TableCell className="py-1 text-right font-semibold">{m.closing_stock}</TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Equipment Used */}
          {dpr.equipment_entries?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-blue-800 mb-1.5 flex items-center gap-1.5 border-b border-blue-200 pb-1"><Wrench className="w-3.5 h-3.5 text-blue-600" />Equipment Used</p>
              <div className="overflow-x-auto border rounded-sm">
                <Table className="text-xs">
                  <TableHeader><TableRow className="bg-blue-50">
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">#</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">Equipment</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">No.</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800 text-right">Hours</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800 text-right">Fuel</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{dpr.equipment_entries.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell className="py-1">{i + 1}</TableCell>
                      <TableCell className="py-1 font-medium">{e.equipment_name}</TableCell>
                      <TableCell className="py-1 text-muted-foreground">{e.equipment_no || '—'}</TableCell>
                      <TableCell className="py-1 text-right">{e.total_used_hours}h</TableCell>
                      <TableCell className="py-1 text-right">{e.fuel_added > 0 ? e.fuel_added : '—'}</TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Next Day Requirement */}
          {(dpr.next_day_material_requests?.length > 0 || dpr.next_day_equipment_requests?.length > 0) && (
            <div>
              <p className="text-xs font-semibold uppercase text-blue-800 mb-1.5 flex items-center gap-1.5 border-b border-blue-200 pb-1"><Calendar className="w-3.5 h-3.5 text-blue-600" />Next Day Requirement</p>
              <div className="flex flex-wrap gap-1.5">
                {dpr.next_day_material_requests?.map((r, i) => (
                  <Badge key={`m-${i}`} variant="secondary" className="rounded-sm text-xs">{r.item_name} {r.qty_needed} {r.unit}</Badge>
                ))}
                {dpr.next_day_equipment_requests?.map((r, i) => (
                  <Badge key={`e-${i}`} variant="secondary" className="rounded-sm text-xs">{r.equipment_name}{r.note ? ` — ${r.note}` : ''}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Contractor Work Summary */}
          {dpr.contractor_work_entries?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-blue-800 mb-1.5 flex items-center gap-1.5 border-b border-blue-200 pb-1"><Briefcase className="w-3.5 h-3.5 text-blue-600" />Contractor Work Summary</p>
              <div className="overflow-x-auto border rounded-sm">
                <Table className="text-xs">
                  <TableHeader><TableRow className="bg-blue-50">
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">#</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">Contractor</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">Title</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">Progress</TableHead>
                    <TableHead className="h-7 text-[10px] font-semibold text-blue-800">Overall</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{dpr.contractor_work_entries.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="py-1">{i + 1}</TableCell>
                      <TableCell className="py-1 font-medium">{c.contractor_name}</TableCell>
                      <TableCell className="py-1">{c.title}</TableCell>
                      <TableCell className="py-1">{c.progress}</TableCell>
                      <TableCell className="py-1">{c.overall_progress}</TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Issues & Notes */}
          {(dpr.issues || dpr.notes) && (
            <div className="text-sm space-y-1">
              {dpr.issues && <div className="flex items-start gap-1.5 text-amber-600"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{dpr.issues}</span></div>}
              {dpr.notes && <div className="text-muted-foreground italic">{dpr.notes}</div>}
            </div>
          )}

          {/* Site Photos */}
          {photoDocs.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-blue-800 mb-1.5 flex items-center gap-1.5 border-b border-blue-200 pb-1"><Camera className="w-3.5 h-3.5 text-blue-600" />Site Photos</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {photoDocs.map((pd) => (
                  <a key={pd.id} href={pd.resolved_url} target="_blank" rel="noopener noreferrer" className="block border rounded-sm overflow-hidden hover:shadow-md transition-shadow">
                    <img src={pd.resolved_url} alt={pd.filename} className="w-full h-32 object-cover bg-muted" />
                    <p className="text-[10px] text-muted-foreground px-1.5 py-1 truncate">{pd.filename}</p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" className="rounded-sm gap-1.5" onClick={onClose}>Close</Button>
            <Button className="rounded-sm gap-1.5 bg-blue-600 hover:bg-blue-700" onClick={() => generateDprPdf(dpr, project, api)}>
              <Download className="w-4 h-4" /> Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


function DprSectionHeader({ title, icon: Icon, isOpen, onToggle, count }) {
  return (
    <button type="button" onClick={onToggle}
      className="w-full flex items-center justify-between py-2 px-3 bg-accent text-accent-foreground rounded-sm text-sm font-semibold hover:bg-accent/90 transition-colors">
      <span className="flex items-center gap-2">
        <Icon className="w-4 h-4" />{title}
        {count > 0 && <Badge className="text-[10px] rounded-full h-5 px-1.5 bg-white/20 text-white">{count}</Badge>}
      </span>
      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );
}

const UNIT_OPTIONS = ['sqft', 'rft', 'cum', 'cft', 'nos', 'bags', 'kg', 'ton', 'mtr', 'ltr', 'trips', 'brass', 'load'];

const DPR_API_BASE = process.env.REACT_APP_BACKEND_URL;

function DprDialog({ open, onClose, onSubmit, project, api }) {
  const emptyForm = { date: new Date().toISOString().slice(0, 10), weather: '', issues: '', notes: '' };
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Data sources
  const [availableLabor, setAvailableLabor] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [availableContractors, setAvailableContractors] = useState([]);

  // Section data
  const [workSummaryRows, setWorkSummaryRows] = useState([]);
  const [labourRows, setLabourRows] = useState([]);
  const [materialStockRows, setMaterialStockRows] = useState([]);
  const [equipmentRows, setEquipmentRows] = useState([]);
  const [nextDayMaterialRows, setNextDayMaterialRows] = useState([]);
  const [nextDayEquipmentRows, setNextDayEquipmentRows] = useState([]);
  const [contractorWorkRows, setContractorWorkRows] = useState([]);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Collapsible sections
  const [openSections, setOpenSections] = useState({ workSummary: true, labour: true, materials: true, equipment: false, nextDay: false, contractorWork: false, images: false });
  const toggleSection = (key) => setOpenSections(s => ({ ...s, [key]: !s[key] }));

  // Inline row forms
  const [wsRow, setWsRow] = useState({ task_name: '', progress_today: '', progress_unit: '', overall_progress: '', status: 'Ongoing', remark: '' });
  const [lbParty, setLbParty] = useState('daily_wage');
  const [lbContractorId, setLbContractorId] = useState('');
  const [lbCategoryId, setLbCategoryId] = useState('');
  const [lbCategoryText, setLbCategoryText] = useState('');
  const [lbCount, setLbCount] = useState('');
  const [lbShift, setLbShift] = useState('1');
  const [lbOvertime, setLbOvertime] = useState('0');
  const [msSelId, setMsSelId] = useState('');
  const [msOpening, setMsOpening] = useState(null);
  const [msReceived, setMsReceived] = useState('0');
  const [msUsed, setMsUsed] = useState('');
  const [eqSelId, setEqSelId] = useState('');
  const [eqHours, setEqHours] = useState('');
  const [eqFuel, setEqFuel] = useState('0');
  const [ndMatName, setNdMatName] = useState('');
  const [ndMatUnit, setNdMatUnit] = useState('');
  const [ndMatQty, setNdMatQty] = useState('');
  const [ndEqName, setNdEqName] = useState('');
  const [ndEqNote, setNdEqNote] = useState('');
  const [cwContractorId, setCwContractorId] = useState('');
  const [cwTitle, setCwTitle] = useState('');
  const [cwProgress, setCwProgress] = useState('');
  const [cwProgressUnit, setCwProgressUnit] = useState('');
  const [cwOverall, setCwOverall] = useState('');

  useEffect(() => {
    if (open && project?.id) {
      setForm(emptyForm);
      setWorkSummaryRows([]); setLabourRows([]); setMaterialStockRows([]);
      setEquipmentRows([]); setNextDayMaterialRows([]); setNextDayEquipmentRows([]);
      setContractorWorkRows([]); setUploadedDocs([]);
      setOpenSections({ workSummary: true, labour: true, materials: true, equipment: false, nextDay: false, contractorWork: false, images: false });
      Promise.all([
        api.get(`/labor?project_id=${project.id}`),
        api.get(`/inventory?project_id=${project.id}`),
        api.get(`/contractors?project_id=${project.id}`)
      ]).then(([labRes, invRes, conRes]) => {
        setAvailableLabor(labRes.data);
        const allInv = invRes.data;
        setAvailableMaterials(allInv.filter(i => (i.item_type || 'material') === 'material'));
        setAvailableEquipment(allInv.filter(i => i.item_type === 'equipment'));
        setAvailableContractors(conRes.data);
      }).catch(() => {});
    }
  }, [open, project?.id]);

  // Material opening stock fetch
  const handleMaterialSelect = async (invId) => {
    setMsSelId(invId); setMsOpening(null); setMsReceived('0'); setMsUsed('');
    if (invId && project?.id && form.date) {
      try {
        const res = await api.get(`/dpr/opening-stock?project_id=${project.id}&inventory_id=${invId}&date=${form.date}`);
        setMsOpening(res.data.opening_stock);
      } catch {
        const item = availableMaterials.find(m => m.id === invId);
        setMsOpening(item?.quantity || 0);
      }
    }
  };

  const msClosing = msOpening !== null ? Math.max(0, msOpening + parseFloat(msReceived || 0) - parseFloat(msUsed || 0)) : null;

  // Image upload
  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('project_id', project.id);
        fd.append('category', 'dpr');
        fd.append('description', `DPR ${form.date}`);
        const res = await api.post('/documents/upload', fd);
        setUploadedDocs(prev => [...prev, { id: res.data.id, url: res.data.file_url, name: res.data.filename, storage_type: res.data.storage_type }]);
      }
      toast.success(`${files.length > 1 ? files.length + ' images' : 'Image'} uploaded`);
    } catch (e) {
      console.error('DPR image upload error:', e?.response?.data || e?.message || e);
      toast.error(e?.response?.data?.detail || 'Upload failed — check console for details');
    } finally { setUploading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (workSummaryRows.length === 0) { toast.error('Add at least one work summary entry'); return; }
    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        work_done: workSummaryRows.map(r => r.task_name).join(', '),
        work_summary_entries: workSummaryRows,
        labour_entries: labourRows,
        labor_count: labourRows.reduce((s, r) => s + (r.labour_count || 0), 0),
        material_stock_entries: materialStockRows,
        equipment_entries: equipmentRows,
        next_day_material_requests: nextDayMaterialRows,
        next_day_equipment_requests: nextDayEquipmentRows,
        contractor_work_entries: contractorWorkRows,
        document_ids: uploadedDocs.map(d => d.id),
      });
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold uppercase">New Daily Progress Report</DialogTitle>
          {project && <p className="text-sm text-muted-foreground font-medium mt-0.5">{project.name}{project.code ? ` · ${project.code}` : ''}</p>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">

          {/* Date + Weather */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date *" type="date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} testId="dpr-date-input" />
            <div className="space-y-1.5">
              <Label className="text-xs">Weather</Label>
              <Select value={form.weather} onValueChange={v => setForm(f => ({ ...f, weather: v }))}>
                <SelectTrigger className="rounded-sm text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{['Sunny', 'Cloudy', 'Rainy', 'Windy', 'Hot', 'Cold'].map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Section 1: Work Summary ── */}
          <DprSectionHeader title="Work Summary" icon={FileText} isOpen={openSections.workSummary} onToggle={() => toggleSection('workSummary')} count={workSummaryRows.length} />
          {openSections.workSummary && (
            <div className="space-y-2 px-1">
              {workSummaryRows.length > 0 && (
                <div className="overflow-x-auto border rounded-sm">
                  <Table className="text-xs">
                    <TableHeader><TableRow className="bg-muted/30">
                      <TableHead className="h-7 text-[10px]">#</TableHead>
                      <TableHead className="h-7 text-[10px]">Task</TableHead>
                      <TableHead className="h-7 text-[10px]">Progress</TableHead>
                      <TableHead className="h-7 text-[10px]">Overall</TableHead>
                      <TableHead className="h-7 text-[10px]">Status</TableHead>
                      <TableHead className="h-7 text-[10px]">Remark</TableHead>
                      <TableHead className="h-7 w-8"></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {workSummaryRows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-1">{i + 1}</TableCell>
                          <TableCell className="py-1 font-medium">{r.task_name}</TableCell>
                          <TableCell className="py-1">{r.progress_today}</TableCell>
                          <TableCell className="py-1">{r.overall_progress}</TableCell>
                          <TableCell className="py-1"><Badge className={`text-[10px] ${r.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{r.status}</Badge></TableCell>
                          <TableCell className="py-1 text-muted-foreground">{r.remark}</TableCell>
                          <TableCell className="py-1"><button type="button" onClick={() => setWorkSummaryRows(p => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">×</button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="grid grid-cols-7 gap-1.5 items-end">
                <div className="space-y-1"><Label className="text-[10px]">Task *</Label><Input className="h-7 text-xs rounded-sm" value={wsRow.task_name} onChange={e => setWsRow(r => ({ ...r, task_name: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-[10px]">Today's Progress</Label><Input type="number" min="0" className="h-7 text-xs rounded-sm" value={wsRow.progress_today} onChange={e => setWsRow(r => ({ ...r, progress_today: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-[10px]">Unit</Label>
                  <Select value={wsRow.progress_unit} onValueChange={v => setWsRow(r => ({ ...r, progress_unit: v }))}><SelectTrigger className="h-7 text-xs rounded-sm"><SelectValue placeholder="Unit" /></SelectTrigger><SelectContent>{UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1"><Label className="text-[10px]">Overall</Label><Input className="h-7 text-xs rounded-sm" value={wsRow.overall_progress} onChange={e => setWsRow(r => ({ ...r, overall_progress: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-[10px]">Status</Label>
                  <Select value={wsRow.status} onValueChange={v => setWsRow(r => ({ ...r, status: v }))}><SelectTrigger className="h-7 text-xs rounded-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Ongoing">Ongoing</SelectItem><SelectItem value="Completed">Completed</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-1"><Label className="text-[10px]">Remark</Label><Input className="h-7 text-xs rounded-sm" value={wsRow.remark} onChange={e => setWsRow(r => ({ ...r, remark: e.target.value }))} /></div>
                <Button type="button" variant="outline" className="h-7 rounded-sm text-xs" onClick={() => {
                  if (!wsRow.task_name.trim()) return;
                  const progressDisplay = wsRow.progress_today ? `${wsRow.progress_today} ${wsRow.progress_unit}`.trim() : '';
                  setWorkSummaryRows(p => [...p, { ...wsRow, progress_today: progressDisplay }]);
                  setWsRow({ task_name: '', progress_today: '', progress_unit: '', overall_progress: '', status: 'Ongoing', remark: '' });
                }}><Plus className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          )}

          {/* ── Section 2: Labour Details ── */}
          <DprSectionHeader title="Labour Report" icon={HardHat} isOpen={openSections.labour} onToggle={() => toggleSection('labour')} count={labourRows.length} />
          {openSections.labour && (
            <div className="space-y-2 px-1">
              {labourRows.length > 0 && (
                <div className="overflow-x-auto border rounded-sm">
                  <Table className="text-xs">
                    <TableHeader><TableRow className="bg-muted/30">
                      <TableHead className="h-7 text-[10px]">#</TableHead>
                      <TableHead className="h-7 text-[10px]">Party</TableHead>
                      <TableHead className="h-7 text-[10px]">Workforce</TableHead>
                      <TableHead className="h-7 text-[10px]">Count</TableHead>
                      <TableHead className="h-7 text-[10px]">Shift</TableHead>
                      <TableHead className="h-7 text-[10px]">OT (hr)</TableHead>
                      <TableHead className="h-7 w-8"></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {labourRows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-1">{i + 1}</TableCell>
                          <TableCell className="py-1 font-medium">{r.contractor_name}</TableCell>
                          <TableCell className="py-1">{r.workforce_category}</TableCell>
                          <TableCell className="py-1 font-semibold">{r.labour_count}</TableCell>
                          <TableCell className="py-1">{r.shift}</TableCell>
                          <TableCell className="py-1">{r.overtime_hours}</TableCell>
                          <TableCell className="py-1"><button type="button" onClick={() => setLabourRows(p => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">×</button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="border rounded-sm p-2 bg-muted/20 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-[10px]">Party Type</Label>
                    <Select value={lbParty} onValueChange={v => { setLbParty(v); setLbContractorId(''); setLbCategoryId(''); setLbCategoryText(''); }}>
                      <SelectTrigger className="h-7 text-xs rounded-sm"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="daily_wage">Daily Wage Worker</SelectItem><SelectItem value="contractor">Contractor</SelectItem></SelectContent>
                    </Select>
                  </div>
                  {lbParty === 'daily_wage' ? (
                    <div className="space-y-1"><Label className="text-[10px]">Category</Label>
                      <Select value={lbCategoryId} onValueChange={setLbCategoryId}>
                        <SelectTrigger className="h-7 text-xs rounded-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{availableLabor.map(l => <SelectItem key={l.id} value={l.id}>{l.category_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-1"><Label className="text-[10px]">Contractor</Label>
                      <Select value={lbContractorId} onValueChange={setLbContractorId}>
                        <SelectTrigger className="h-7 text-xs rounded-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{availableContractors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {lbParty === 'contractor' && (() => {
                  const selCon = availableContractors.find(c => c.id === lbContractorId);
                  const roles = selCon?.roles || [];
                  return roles.length > 0 ? (
                    <div className="space-y-1"><Label className="text-[10px]">Workforce Category</Label>
                      <Select value={lbCategoryText} onValueChange={setLbCategoryText}>
                        <SelectTrigger className="h-7 text-xs rounded-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>{roles.map((r, i) => <SelectItem key={i} value={r.category}>{r.category}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-1"><Label className="text-[10px]">Workforce Category</Label><Input className="h-7 text-xs rounded-sm" value={lbCategoryText} onChange={e => setLbCategoryText(e.target.value)} /></div>
                  );
                })()}
                <div className="grid grid-cols-4 gap-2 items-end">
                  <div className="space-y-1"><Label className="text-[10px]">Count *</Label><Input type="number" min="1" className="h-7 text-xs rounded-sm" value={lbCount} onChange={e => setLbCount(e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Shift</Label>
                    <Select value={lbShift} onValueChange={setLbShift}><SelectTrigger className="h-7 text-xs rounded-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem></SelectContent></Select>
                  </div>
                  <div className="space-y-1"><Label className="text-[10px]">OT Hours</Label><Input type="number" min="0" step="0.5" className="h-7 text-xs rounded-sm" value={lbOvertime} onChange={e => setLbOvertime(e.target.value)} /></div>
                  <Button type="button" variant="outline" className="h-7 rounded-sm text-xs w-full" onClick={() => {
                    if (!lbCount || parseInt(lbCount) <= 0) return;
                    let row;
                    if (lbParty === 'daily_wage') {
                      const labor = availableLabor.find(l => l.id === lbCategoryId);
                      if (!labor) return;
                      row = { party_type: 'daily_wage', contractor_id: null, contractor_name: 'Daily Wage Worker', workforce_category: labor.category_name, labour_count: parseInt(lbCount), shift: lbShift, overtime_hours: parseFloat(lbOvertime) || 0 };
                    } else {
                      const con = availableContractors.find(c => c.id === lbContractorId);
                      if (!con) return;
                      row = { party_type: 'contractor', contractor_id: lbContractorId, contractor_name: con.name, workforce_category: lbCategoryText, labour_count: parseInt(lbCount), shift: lbShift, overtime_hours: parseFloat(lbOvertime) || 0 };
                    }
                    setLabourRows(p => [...p, row]);
                    setLbContractorId(''); setLbCategoryId(''); setLbCategoryText(''); setLbCount(''); setLbShift('1'); setLbOvertime('0');
                  }}><Plus className="w-3.5 h-3.5 mr-1" /> Add</Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Section 3: Material Inventory ── */}
          <DprSectionHeader title="Material Inventory" icon={Package} isOpen={openSections.materials} onToggle={() => toggleSection('materials')} count={materialStockRows.length} />
          {openSections.materials && (
            <div className="space-y-2 px-1">
              {materialStockRows.length > 0 && (
                <div className="overflow-x-auto border rounded-sm">
                  <Table className="text-xs">
                    <TableHeader><TableRow className="bg-muted/30">
                      <TableHead className="h-7 text-[10px]">#</TableHead>
                      <TableHead className="h-7 text-[10px]">Material</TableHead>
                      <TableHead className="h-7 text-[10px] text-right">Opening</TableHead>
                      <TableHead className="h-7 text-[10px] text-right">Received</TableHead>
                      <TableHead className="h-7 text-[10px] text-right">Used</TableHead>
                      <TableHead className="h-7 text-[10px] text-right">Closing</TableHead>
                      <TableHead className="h-7 w-8"></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {materialStockRows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-1">{i + 1}</TableCell>
                          <TableCell className="py-1 font-medium">{r.item_name} <span className="text-muted-foreground">({r.unit})</span></TableCell>
                          <TableCell className="py-1 text-right">{r.opening_stock}</TableCell>
                          <TableCell className="py-1 text-right text-emerald-600">{r.received > 0 ? `+${r.received}` : '0'}</TableCell>
                          <TableCell className="py-1 text-right text-red-600">{r.used}</TableCell>
                          <TableCell className="py-1 text-right font-semibold">{r.closing_stock}</TableCell>
                          <TableCell className="py-1"><button type="button" onClick={() => setMaterialStockRows(p => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">×</button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="border rounded-sm p-2 bg-muted/20 space-y-2">
                <div className="space-y-1"><Label className="text-[10px]">Select Material</Label>
                  <Select value={msSelId} onValueChange={handleMaterialSelect}>
                    <SelectTrigger className="h-7 text-xs rounded-sm"><SelectValue placeholder="Select material" /></SelectTrigger>
                    <SelectContent>{availableMaterials.filter(m => !materialStockRows.find(r => r.inventory_id === m.id)).map(m => <SelectItem key={m.id} value={m.id}>{m.item_name} ({m.unit})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {msSelId && (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1"><Label className="text-[10px]">Opening Stock</Label><div className="h-7 px-2 flex items-center text-xs bg-muted rounded-sm font-mono">{msOpening !== null ? msOpening : '...'}</div></div>
                    <div className="space-y-1"><Label className="text-[10px]">Received</Label><Input type="number" min="0" className="h-7 text-xs rounded-sm" value={msReceived} onChange={e => setMsReceived(e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-[10px]">Used *</Label><Input type="number" min="0" className="h-7 text-xs rounded-sm" value={msUsed} onChange={e => setMsUsed(e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-[10px]">Closing Stock</Label><div className={`h-7 px-2 flex items-center text-xs rounded-sm font-mono font-semibold ${msClosing !== null && msClosing <= 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{msClosing !== null ? msClosing.toFixed(1) : '—'}</div></div>
                  </div>
                )}
                <Button type="button" variant="outline" className="h-7 w-full rounded-sm text-xs" disabled={!msSelId || !msUsed} onClick={() => {
                  const item = availableMaterials.find(m => m.id === msSelId);
                  if (!item) return;
                  setMaterialStockRows(p => [...p, { inventory_id: item.id, item_name: item.item_name, unit: item.unit, opening_stock: msOpening || 0, received: parseFloat(msReceived) || 0, used: parseFloat(msUsed), closing_stock: msClosing || 0 }]);
                  setMsSelId(''); setMsOpening(null); setMsReceived('0'); setMsUsed('');
                }}><Plus className="w-3.5 h-3.5 mr-1" /> Add Material</Button>
              </div>
            </div>
          )}

          {/* ── Section 4: Equipment Used ── */}
          <DprSectionHeader title="Equipment Used" icon={Wrench} isOpen={openSections.equipment} onToggle={() => toggleSection('equipment')} count={equipmentRows.length} />
          {openSections.equipment && (
            <div className="space-y-2 px-1">
              {equipmentRows.length > 0 && (
                <div className="overflow-x-auto border rounded-sm">
                  <Table className="text-xs">
                    <TableHeader><TableRow className="bg-muted/30">
                      <TableHead className="h-7 text-[10px]">#</TableHead>
                      <TableHead className="h-7 text-[10px]">Equipment</TableHead>
                      <TableHead className="h-7 text-[10px]">No.</TableHead>
                      <TableHead className="h-7 text-[10px] text-right">Hours</TableHead>
                      <TableHead className="h-7 text-[10px] text-right">Fuel</TableHead>
                      <TableHead className="h-7 w-8"></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {equipmentRows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-1">{i + 1}</TableCell>
                          <TableCell className="py-1 font-medium">{r.equipment_name}</TableCell>
                          <TableCell className="py-1 font-mono text-muted-foreground">{r.equipment_no || '—'}</TableCell>
                          <TableCell className="py-1 text-right">{r.total_used_hours}h</TableCell>
                          <TableCell className="py-1 text-right">{r.fuel_added > 0 ? `${r.fuel_added} unit` : '—'}</TableCell>
                          <TableCell className="py-1"><button type="button" onClick={() => setEquipmentRows(p => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">×</button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2 items-end">
                <div className="col-span-2 space-y-1"><Label className="text-[10px]">Equipment</Label>
                  <Select value={eqSelId} onValueChange={setEqSelId}>
                    <SelectTrigger className="h-7 text-xs rounded-sm"><SelectValue placeholder="Select equipment" /></SelectTrigger>
                    <SelectContent>{availableEquipment.filter(e => !equipmentRows.find(r => r.inventory_id === e.id)).map(e => <SelectItem key={e.id} value={e.id}>{e.item_name}{e.serial_number ? ` (${e.serial_number})` : ''}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-[10px]">Hours *</Label><Input type="number" min="0" step="0.5" className="h-7 text-xs rounded-sm" value={eqHours} onChange={e => setEqHours(e.target.value)} /></div>
                <div className="flex gap-1 items-end">
                  <div className="flex-1 space-y-1"><Label className="text-[10px]">Fuel</Label><Input type="number" min="0" className="h-7 text-xs rounded-sm" value={eqFuel} onChange={e => setEqFuel(e.target.value)} /></div>
                  <Button type="button" variant="outline" className="h-7 px-2 rounded-sm" disabled={!eqSelId || !eqHours} onClick={() => {
                    const eq = availableEquipment.find(e => e.id === eqSelId);
                    if (!eq) return;
                    setEquipmentRows(p => [...p, { inventory_id: eq.id, equipment_name: eq.item_name, equipment_no: eq.serial_number || '', total_used_hours: parseFloat(eqHours), fuel_added: parseFloat(eqFuel) || 0 }]);
                    setEqSelId(''); setEqHours(''); setEqFuel('0');
                  }}><Plus className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Section 5: Next Day Requirement ── */}
          <DprSectionHeader title="Next Day Requirement" icon={Calendar} isOpen={openSections.nextDay} onToggle={() => toggleSection('nextDay')} count={nextDayMaterialRows.length + nextDayEquipmentRows.length} />
          {openSections.nextDay && (
            <div className="space-y-3 px-1">
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Material Requests</Label>
                {nextDayMaterialRows.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {nextDayMaterialRows.map((r, i) => (
                      <Badge key={i} variant="outline" className="text-xs gap-1 rounded-sm">{r.item_name} × {r.qty_needed} {r.unit}<button type="button" onClick={() => setNextDayMaterialRows(p => p.filter((_, j) => j !== i))} className="ml-1 text-red-400 hover:text-red-600">×</button></Badge>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-4 gap-2 items-end">
                  <div className="space-y-1"><Label className="text-[10px]">Material</Label><Input className="h-7 text-xs rounded-sm" value={ndMatName} onChange={e => setNdMatName(e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Unit</Label>
                    <Select value={ndMatUnit} onValueChange={setNdMatUnit}><SelectTrigger className="h-7 text-xs rounded-sm"><SelectValue placeholder="Unit" /></SelectTrigger><SelectContent>{UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="space-y-1"><Label className="text-[10px]">Qty</Label><Input type="number" min="0" className="h-7 text-xs rounded-sm" value={ndMatQty} onChange={e => setNdMatQty(e.target.value)} /></div>
                  <Button type="button" variant="outline" className="h-7 rounded-sm text-xs" disabled={!ndMatName} onClick={() => {
                    setNextDayMaterialRows(p => [...p, { item_name: ndMatName, unit: ndMatUnit, qty_needed: parseFloat(ndMatQty) || 0 }]);
                    setNdMatName(''); setNdMatUnit(''); setNdMatQty('');
                  }}><Plus className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Equipment Requests</Label>
                {nextDayEquipmentRows.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {nextDayEquipmentRows.map((r, i) => (
                      <Badge key={i} variant="outline" className="text-xs gap-1 rounded-sm">{r.equipment_name}{r.note ? ` — ${r.note}` : ''}<button type="button" onClick={() => setNextDayEquipmentRows(p => p.filter((_, j) => j !== i))} className="ml-1 text-red-400 hover:text-red-600">×</button></Badge>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 items-end">
                  <div className="space-y-1"><Label className="text-[10px]">Equipment</Label><Input className="h-7 text-xs rounded-sm" value={ndEqName} onChange={e => setNdEqName(e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Note</Label><Input className="h-7 text-xs rounded-sm" value={ndEqNote} onChange={e => setNdEqNote(e.target.value)} /></div>
                  <Button type="button" variant="outline" className="h-7 rounded-sm text-xs" disabled={!ndEqName} onClick={() => {
                    setNextDayEquipmentRows(p => [...p, { equipment_name: ndEqName, note: ndEqNote }]);
                    setNdEqName(''); setNdEqNote('');
                  }}><Plus className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Section 6: Contractor Work Summary ── */}
          <DprSectionHeader title="Subcon Progress Summary" icon={Briefcase} isOpen={openSections.contractorWork} onToggle={() => toggleSection('contractorWork')} count={contractorWorkRows.length} />
          {openSections.contractorWork && (
            <div className="space-y-2 px-1">
              {contractorWorkRows.length > 0 && (
                <div className="overflow-x-auto border rounded-sm">
                  <Table className="text-xs">
                    <TableHeader><TableRow className="bg-muted/30">
                      <TableHead className="h-7 text-[10px]">#</TableHead>
                      <TableHead className="h-7 text-[10px]">Contractor</TableHead>
                      <TableHead className="h-7 text-[10px]">Title</TableHead>
                      <TableHead className="h-7 text-[10px]">Progress</TableHead>
                      <TableHead className="h-7 text-[10px]">Overall</TableHead>
                      <TableHead className="h-7 w-8"></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {contractorWorkRows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-1">{i + 1}</TableCell>
                          <TableCell className="py-1 font-medium">{r.contractor_name}</TableCell>
                          <TableCell className="py-1">{r.title}</TableCell>
                          <TableCell className="py-1">{r.progress}</TableCell>
                          <TableCell className="py-1">{r.overall_progress}</TableCell>
                          <TableCell className="py-1"><button type="button" onClick={() => setContractorWorkRows(p => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">×</button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="grid grid-cols-6 gap-1.5 items-end">
                <div className="space-y-1"><Label className="text-[10px]">Contractor</Label>
                  <Select value={cwContractorId} onValueChange={setCwContractorId}>
                    <SelectTrigger className="h-7 text-xs rounded-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{availableContractors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-[10px]">Work Title</Label><Input className="h-7 text-xs rounded-sm" value={cwTitle} onChange={e => setCwTitle(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-[10px]">Progress</Label><Input type="number" min="0" className="h-7 text-xs rounded-sm" value={cwProgress} onChange={e => setCwProgress(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-[10px]">Unit</Label>
                  <Select value={cwProgressUnit} onValueChange={setCwProgressUnit}><SelectTrigger className="h-7 text-xs rounded-sm"><SelectValue placeholder="Unit" /></SelectTrigger><SelectContent>{UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1"><Label className="text-[10px]">Overall</Label><Input className="h-7 text-xs rounded-sm" value={cwOverall} onChange={e => setCwOverall(e.target.value)} /></div>
                <Button type="button" variant="outline" className="h-7 rounded-sm text-xs" disabled={!cwContractorId || !cwTitle} onClick={() => {
                  const con = availableContractors.find(c => c.id === cwContractorId);
                  const progressDisplay = cwProgress ? `${cwProgress} ${cwProgressUnit}`.trim() : '';
                  setContractorWorkRows(p => [...p, { contractor_id: cwContractorId, contractor_name: con?.name || '', title: cwTitle, progress: progressDisplay, overall_progress: cwOverall }]);
                  setCwContractorId(''); setCwTitle(''); setCwProgress(''); setCwProgressUnit(''); setCwOverall('');
                }}><Plus className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          )}

          {/* ── Section 7: Site Images ── */}
          <DprSectionHeader title="Site Photos" icon={Camera} isOpen={openSections.images} onToggle={() => toggleSection('images')} count={uploadedDocs.length} />
          {openSections.images && (
            <div className="space-y-2 px-1">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded-sm py-5 cursor-pointer hover:bg-muted/20 transition-colors">
                <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Click to upload images (JPG, PNG, WebP)</span>
                <input type="file" accept=".jpg,.jpeg,.png,.webp" multiple className="hidden" disabled={uploading}
                  onChange={e => { handleImageUpload(Array.from(e.target.files || [])); e.target.value = ''; }} />
              </label>
              {uploading && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Uploading...</p>}
              {uploadedDocs.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {uploadedDocs.map(doc => (
                    <div key={doc.id} className="relative group">
                      <img src={doc.storage_type === 'cloudinary' ? doc.url : `${DPR_API_BASE}${doc.url}`} alt={doc.name} className="w-full aspect-square object-cover rounded-sm border" />
                      <button type="button" onClick={() => setUploadedDocs(p => p.filter(d => d.id !== doc.id))}
                        className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Issues + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Issues / Delays</Label><Input value={form.issues} onChange={e => setForm(f => ({ ...f, issues: e.target.value }))} className="rounded-sm text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="rounded-sm text-sm" /></div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-sm">Cancel</Button>
            <Button type="submit" className="action-btn-accent rounded-sm" disabled={submitting} data-testid="submit-dpr-btn">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Saving...</> : 'Save DPR'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const API_BASE = process.env.REACT_APP_BACKEND_URL;

function isImageFile(ext) {
  return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext?.toLowerCase());
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileUrl(doc) {
  if (doc.storage_type === 'cloudinary') return doc.file_url;
  return `${API_BASE}${doc.file_url}`;
}

const DEFAULT_DOC_CATEGORIES = [
  { value: 'plan', label: 'Plan / Drawing' },
  { value: 'photo', label: 'Site Photo' },
  { value: 'report', label: 'Report' },
  { value: 'approval', label: 'Approval Document' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'general', label: 'General' },
];

function UploadDialog({ open, onClose, onSubmit }) {
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('plan');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [categories, setCategories] = useState(DEFAULT_DOC_CATEGORIES);
  const [newCatMode, setNewCatMode] = useState(false);
  const [newCatValue, setNewCatValue] = useState('');

  useEffect(() => {
    if (open) { setFile(null); setCategory('plan'); setDescription(''); setNewCatMode(false); setNewCatValue(''); }
  }, [open]);

  const handleFile = (f) => {
    const maxSize = 20 * 1024 * 1024;
    if (f.size > maxSize) { toast.error('File size exceeds 20MB'); return; }
    setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Select a file'); return; }
    setUploading(true);
    try { await onSubmit(file, category, description); }
    finally { setUploading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-lg font-bold uppercase">Upload Document</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-sm p-6 text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-muted-foreground/25 hover:border-muted-foreground/50'}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById('file-input').click()}
            data-testid="drop-zone"
          >
            {file ? (
              <div className="flex items-center gap-3 justify-center">
                {isImageFile('.' + file.name.split('.').pop()) ? <Image className="w-8 h-8 text-purple-500" /> : <FileText className="w-8 h-8 text-blue-500" />}
                <div className="text-left">
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Drop file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, Images, Drawings (max 20MB)</p>
              </>
            )}
            <input id="file-input" type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.dwg,.dxf,.doc,.docx,.xls,.xlsx" onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); }} data-testid="file-input" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            {newCatMode ? (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  value={newCatValue}
                  onChange={e => setNewCatValue(e.target.value)}
                  placeholder="Enter category name..."
                  className="rounded-sm text-sm flex-1"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const trimmed = newCatValue.trim();
                      if (!trimmed) return;
                      const val = trimmed.toLowerCase().replace(/\s+/g, '_');
                      if (!categories.find(c => c.value === val)) {
                        setCategories(prev => [...prev, { value: val, label: trimmed }]);
                      }
                      setCategory(val);
                      setNewCatMode(false);
                      setNewCatValue('');
                    }
                    if (e.key === 'Escape') { setNewCatMode(false); setNewCatValue(''); }
                  }}
                />
                <Button type="button" size="sm" className="action-btn action-btn-accent rounded-sm shrink-0" onClick={() => {
                  const trimmed = newCatValue.trim();
                  if (!trimmed) return;
                  const val = trimmed.toLowerCase().replace(/\s+/g, '_');
                  if (!categories.find(c => c.value === val)) {
                    setCategories(prev => [...prev, { value: val, label: trimmed }]);
                  }
                  setCategory(val);
                  setNewCatMode(false);
                  setNewCatValue('');
                }}>Add</Button>
                <Button type="button" size="sm" variant="ghost" className="rounded-sm shrink-0" onClick={() => { setNewCatMode(false); setNewCatValue(''); }}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <Select value={category} onValueChange={v => { if (v === '__new__') { setNewCatMode(true); } else { setCategory(v); } }}>
                <SelectTrigger className="rounded-sm text-sm" data-testid="doc-category-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  <div className="border-t mt-1 pt-1">
                    <SelectItem value="__new__" className="text-blue-600 font-medium">
                      + Create new category
                    </SelectItem>
                  </div>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." className="rounded-sm text-sm" data-testid="doc-description-input" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-sm">Cancel</Button>
            <Button type="submit" className="action-btn-accent rounded-sm" disabled={uploading || !file} data-testid="submit-upload-btn">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
              Upload
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DocPreview({ doc, onBack, onDelete, canEdit }) {
  const isImage = isImageFile(doc.file_extension);
  const isPdf = doc.file_extension === '.pdf';
  const fileUrl = getFileUrl(doc);

  return (
    <div className="space-y-4" data-testid="doc-preview">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1" data-testid="back-to-docs-btn">
          <ArrowLeft className="w-4 h-4" /> Back to documents
        </Button>
        <div className="flex gap-2">
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" download={doc.filename}>
            <Button variant="outline" size="sm" className="rounded-sm gap-1" data-testid="download-doc-btn"><FileDown className="w-4 h-4" />Download</Button>
          </a>
          {canEdit && (
            <Button variant="outline" size="sm" className="rounded-sm gap-1 text-red-500 hover:text-red-700" onClick={() => onDelete(doc.id)} data-testid="delete-doc-preview-btn"><Trash2 className="w-4 h-4" />Delete</Button>
          )}
        </div>
      </div>

      <Card className="rounded-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-sm ${isImage ? 'bg-purple-100' : 'bg-blue-100'}`}>
                {isImage ? <Image className="w-5 h-5 text-purple-600" /> : <FileText className="w-5 h-5 text-blue-600" />}
              </div>
              <div>
                <CardTitle className="text-base">{doc.filename}</CardTitle>
                <CardDescription>{formatFileSize(doc.file_size)} | {doc.category} | Uploaded {formatDate(doc.created_at)} by {doc.uploaded_by_name}</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="rounded-sm text-xs capitalize">{doc.storage_type === 'cloudinary' ? 'Cloud' : 'Local'}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {doc.description && <p className="text-sm text-muted-foreground mb-3">{doc.description}</p>}
          {/* Preview Area */}
          <div className="rounded-sm overflow-hidden bg-muted border">
            {isImage ? (
              <img src={fileUrl} alt={doc.filename} className="max-w-full max-h-[600px] mx-auto object-contain" data-testid="image-preview" />
            ) : isPdf ? (
              <iframe src={fileUrl} title={doc.filename} className="w-full h-[600px]" data-testid="pdf-preview" />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileText className="w-16 h-16 mb-3 opacity-30" />
                <p className="font-medium">Preview not available</p>
                <p className="text-sm">Download to view this file</p>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" download={doc.filename}>
                  <Button variant="outline" className="mt-3 rounded-sm gap-1"><FileDown className="w-4 h-4" />Download File</Button>
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
