import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Save, X, Plus, Trash2, Loader2,
  MapPin, Calendar, IndianRupee, Users, CheckCircle2,
  Clock, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, BarChart3,
  ListTodo, FileText, Wallet, CloudSun, HardHat,
  Upload, Image, FileDown, Eye, Paperclip, FolderOpen
} from 'lucide-react';
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
  const { api, user, hasPermission } = useAuth();
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
        api.get(`/documents?project_id=${id}`)
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

  const handleProgressUpdate = async (progress, cost) => {
    try {
      const payload = { progress_percentage: parseFloat(progress) };
      if (cost) payload.actual_cost = parseFloat(cost);
      await api.patch(`/projects/${id}/progress`, payload);
      toast.success('Progress updated');
      setProgressDialogOpen(false);
      fetchAll();
    } catch { toast.error('Failed to update progress'); }
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
      await api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
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
      <Tabs defaultValue="overview" className="space-y-4">
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
            <div className="space-y-3">
              {[...dprs].reverse().slice((dprPage - 1) * DPR_PAGE_SIZE, dprPage * DPR_PAGE_SIZE).map((d) => (
                <Card key={d.id} className="rounded-sm" data-testid={`dpr-card-${d.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-sm bg-blue-100"><Calendar className="w-4 h-4 text-blue-600" /></div>
                        <div>
                          <p className="font-semibold text-sm">{formatDate(d.date)}</p>
                          {d.weather && <p className="text-xs text-muted-foreground flex items-center gap-1"><CloudSun className="w-3 h-3" />{d.weather}</p>}
                        </div>
                      </div>
                      {d.labor_count > 0 && (
                        <div className="flex flex-wrap gap-1 justify-end">
                          {d.labor_entries?.length > 0
                            ? d.labor_entries.map((le, i) => (
                              <Badge key={i} variant="outline" className="gap-1 rounded-sm text-[10px]">
                                <HardHat className="w-3 h-3" />{le.category_name}: {le.count}
                              </Badge>
                            ))
                            : <Badge variant="outline" className="gap-1 rounded-sm"><HardHat className="w-3 h-3" />{d.labor_count} workers</Badge>
                          }
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-muted-foreground font-medium">Work Done:</span> <span>{d.work_done}</span></div>
                      {(d.materials_used_entries?.length > 0 || d.materials_used) && (
                        <div>
                          <span className="text-muted-foreground font-medium">Materials: </span>
                          {d.materials_used_entries?.length > 0
                            ? d.materials_used_entries.map((m, i) => (
                              <span key={i} className="inline-block mr-2">{m.item_name} <strong>{m.quantity_used}{m.unit}</strong></span>
                            ))
                            : <span>{d.materials_used}</span>
                          }
                        </div>
                      )}
                      {d.sqft_completed != null && d.sqft_completed !== '' && <div><span className="text-muted-foreground font-medium">Area Completed:</span> <span>{d.sqft_completed} sq.ft</span></div>}
                      {d.tomorrow_schedule && <div><span className="text-muted-foreground font-medium">Tomorrow's Schedule:</span> <span>{d.tomorrow_schedule}</span></div>}
                      {d.issues && <div className="flex items-start gap-1 text-amber-600"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{d.issues}</span></div>}
                      {d.notes && <div className="text-muted-foreground italic">{d.notes}</div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
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
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{documents.length} documents</p>
            {hasPermission('projects', 'edit') && (
              <Button className="action-btn action-btn-accent" onClick={() => setUploadDialogOpen(true)} data-testid="upload-doc-btn">
                <Upload className="w-4 h-4" /> Upload Document
              </Button>
            )}
          </div>

          {previewDoc ? (
            <DocPreview doc={previewDoc} onBack={() => setPreviewDoc(null)} onDelete={() => { setDocToDelete(previewDoc); setDeleteDocDialogOpen(true); }} canEdit={hasPermission('projects', 'edit')} />
          ) : documents.length === 0 ? (
            <Card className="rounded-sm"><CardContent className="text-center py-12 text-muted-foreground"><FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No documents uploaded yet</p><p className="text-xs mt-1">Upload plans, drawings, PDFs, and images</p></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {documents.map((doc) => (
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
      <ProgressDialog open={progressDialogOpen} onClose={() => setProgressDialogOpen(false)} current={project.progress_percentage || 0} currentCost={project.actual_cost} onSubmit={handleProgressUpdate} />

      {/* Task Dialog */}
      <TaskDialog open={taskDialogOpen} onClose={() => { setTaskDialogOpen(false); setEditingTask(null); }} task={editingTask} onSubmit={handleTaskSubmit} />

      {/* DPR Dialog */}
      <DprDialog open={dprDialogOpen} onClose={() => setDprDialogOpen(false)} onSubmit={handleDprSubmit} project={project} api={api} />

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

function ProgressDialog({ open, onClose, current, currentCost, onSubmit }) {
  const [progress, setProgress] = useState(current);
  const [cost, setCost] = useState(currentCost || '');
  useEffect(() => { setProgress(current); setCost(currentCost || ''); }, [current, currentCost]);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Update Progress</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Progress ({progress}%)</Label>
            <input type="range" min="0" max="100" step="5" value={progress} onChange={e => setProgress(+e.target.value)} className="w-full accent-amber-500" data-testid="progress-slider" />
            <Progress value={progress} className="h-2" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Actual Cost (INR)</Label>
            <Input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="Current cost" className="rounded-sm" data-testid="progress-cost-input" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="rounded-sm">Cancel</Button>
            <Button onClick={() => onSubmit(progress, cost)} className="action-btn-accent rounded-sm" data-testid="save-progress-btn">Update</Button>
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

function DprDialog({ open, onClose, onSubmit, project, api }) {
  const emptyForm = { date: new Date().toISOString().slice(0, 10), weather: '', work_done: '', issues: '', notes: '', sqft_completed: '', tomorrow_schedule: '' };
  const [form, setForm] = useState(emptyForm);
  const [availableLabor, setAvailableLabor] = useState([]);
  const [availableInventory, setAvailableInventory] = useState([]);
  const [addedLabor, setAddedLabor] = useState([]);
  const [addedMaterials, setAddedMaterials] = useState([]);

  useEffect(() => {
    if (open) {
      setForm(emptyForm);
      setAddedLabor([]);
      setAddedMaterials([]);
      if (project?.id) {
        api.get(`/labor?project_id=${project.id}`).then(r => setAvailableLabor(r.data)).catch(() => setAvailableLabor([]));
        api.get(`/inventory?project_id=${project.id}`).then(r => setAvailableInventory(r.data)).catch(() => setAvailableInventory([]));
      }
    }
  }, [open, project?.id]);

  const addLabor = (item, count) => {
    setAddedLabor(prev => {
      const idx = prev.findIndex(r => r.labor_id === item.id);
      const row = { labor_id: item.id, category_id: item.category_id, category_name: item.category_name, day_rate: item.day_rate, count: parseInt(count), name: item.category_name, sub: `₹${item.day_rate}/day` };
      return idx >= 0 ? prev.map((r, i) => i === idx ? { ...r, count: parseInt(count) } : r) : [...prev, row];
    });
  };
  const addMaterial = (item, count) => {
    setAddedMaterials(prev => {
      const idx = prev.findIndex(r => r.inventory_id === item.id);
      const row = { inventory_id: item.id, item_name: item.item_name, unit: item.unit, quantity_used: count, name: item.item_name, sub: `${item.unit} · ${item.quantity} in stock` };
      return idx >= 0 ? prev.map((r, i) => i === idx ? { ...r, quantity_used: count, sub: `${item.unit} · ${item.quantity} in stock` } : r) : [...prev, row];
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const labor_entries = addedLabor.map(({ labor_id, name, sub, ...rest }) => rest);
    const labor_count = addedLabor.reduce((s, r) => s + r.count, 0);
    const materials_used_entries = addedMaterials.map(({ name, sub, ...rest }) => rest);
    const materials_used = addedMaterials.map(m => `${m.item_name} ${m.quantity_used}${m.unit}`).join(', ');
    onSubmit({ ...form, labor_count, labor_entries, materials_used_entries, materials_used });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold uppercase">New Daily Progress Report</DialogTitle>
          {project && <p className="text-sm text-muted-foreground font-medium mt-0.5">{project.name}{project.code ? ` · ${project.code}` : ''}</p>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date *" type="date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} testId="dpr-date-input" />
            <div className="space-y-1.5">
              <Label className="text-xs">Weather</Label>
              <Select value={form.weather} onValueChange={v => setForm(f => ({ ...f, weather: v }))}>
                <SelectTrigger className="rounded-sm text-sm" data-testid="dpr-weather-select"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{['Sunny', 'Cloudy', 'Rainy', 'Windy', 'Hot', 'Cold'].map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Labor */}
            <PickerSection
              label="Labor"
              items={availableLabor}
              addedItems={addedLabor}
              itemKey="labor_id"
              nameKey="category_name"
              subKey="day_rate"
              subLabel={i => `₹${i.day_rate}/day`}
              countLabel="Count"
              onAdd={addLabor}
              onRemove={id => setAddedLabor(prev => prev.filter(r => r.labor_id !== id))}
              totalLabel="Total Workers"
              totalVal={addedLabor.reduce((s, r) => s + r.count, 0)}
              emptyMsg="No labor set up for this project."
            />
            {/* Materials */}
            <PickerSection
              label="Materials Used"
              items={availableInventory}
              addedItems={addedMaterials}
              itemKey="inventory_id"
              nameKey="item_name"
              subKey="unit"
              subLabel={i => `${i.unit} · ${i.quantity} in stock`}
              countLabel="Qty used"
              onAdd={addMaterial}
              onRemove={id => setAddedMaterials(prev => prev.filter(r => r.inventory_id !== id))}
              totalLabel="Items selected"
              totalVal={addedMaterials.length}
              emptyMsg="No inventory items for this project."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Work Done *</Label>
            <Textarea value={form.work_done} onChange={e => setForm(f => ({ ...f, work_done: e.target.value }))} required placeholder="Describe work completed today..." className="rounded-sm text-sm" rows={3} data-testid="dpr-work-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Issues / Delays</Label>
              <Input value={form.issues} onChange={e => setForm(f => ({ ...f, issues: e.target.value }))} placeholder="Any problems encountered..." className="rounded-sm text-sm" data-testid="dpr-issues-input" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." className="rounded-sm text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Completed Area Today (sq.ft)</Label>
              <Input type="number" min="0" step="0.01" value={form.sqft_completed} onChange={e => setForm(f => ({ ...f, sqft_completed: e.target.value }))} placeholder="e.g. 250" className="rounded-sm text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tomorrow's Schedule</Label>
              <Input value={form.tomorrow_schedule} onChange={e => setForm(f => ({ ...f, tomorrow_schedule: e.target.value }))} placeholder="Plan for tomorrow..." className="rounded-sm text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-sm">Cancel</Button>
            <Button type="submit" className="action-btn-accent rounded-sm" data-testid="submit-dpr-btn">Save DPR</Button>
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

function UploadDialog({ open, onClose, onSubmit }) {
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('plan');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { if (open) { setFile(null); setCategory('plan'); setDescription(''); } }, [open]);

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
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="rounded-sm text-sm" data-testid="doc-category-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="plan">Plan / Drawing</SelectItem>
                <SelectItem value="photo">Site Photo</SelectItem>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="approval">Approval Document</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
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
          {hasPermission('projects', 'edit') && (
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
