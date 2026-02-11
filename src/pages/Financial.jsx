import React, { useState, useEffect, useMemo } from 'react';
import {
  IndianRupee, FileText, TrendingUp, TrendingDown, Plus, Loader2,
  Receipt, PiggyBank, CheckCircle2, Clock, Eye, Trash2,
  ArrowUpRight, ArrowDownRight, BarChart3, Wallet, Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { formatCurrency, formatDate, getStatusColor } from '../lib/utils';

const billStatusFlow = { pending: 'approved', approved: 'paid' };
const billStatusColors = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
};

export default function Financial() {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [billings, setBillings] = useState([]);
  const [cvrs, setCvrs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [isBillingDialogOpen, setIsBillingDialogOpen] = useState(false);
  const [isCvrDialogOpen, setIsCvrDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [billingForm, setBillingForm] = useState({
    project_id: '', bill_number: '', bill_date: '', description: '',
    amount: '', gst_rate: '18', bill_type: 'running'
  });
  const [cvrForm, setCvrForm] = useState({
    project_id: '', period_start: '', period_end: '', contracted_value: '',
    work_done_value: '', billed_value: '', received_value: '', retention_held: '0', notes: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [billingsRes, cvrsRes, projectsRes, dashRes] = await Promise.all([
        api.get('/billing'), api.get('/cvr'), api.get('/projects'), api.get('/financial/dashboard')
      ]);
      setBillings(billingsRes.data);
      setCvrs(cvrsRes.data);
      setProjects(projectsRes.data);
      setDashboard(dashRes.data);
    } catch (error) {
      toast.error('Failed to load financial data');
    } finally { setLoading(false); }
  };

  const handleBillingSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post('/billing', {
        ...billingForm, amount: parseFloat(billingForm.amount), gst_rate: parseFloat(billingForm.gst_rate)
      });
      toast.success('Bill created');
      setIsBillingDialogOpen(false);
      setBillingForm({ project_id: '', bill_number: '', bill_date: '', description: '', amount: '', gst_rate: '18', bill_type: 'running' });
      fetchData();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed'); }
    finally { setFormLoading(false); }
  };

  const handleCvrSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post('/cvr', {
        ...cvrForm, contracted_value: parseFloat(cvrForm.contracted_value),
        work_done_value: parseFloat(cvrForm.work_done_value), billed_value: parseFloat(cvrForm.billed_value),
        received_value: parseFloat(cvrForm.received_value), retention_held: parseFloat(cvrForm.retention_held)
      });
      toast.success('CVR created');
      setIsCvrDialogOpen(false);
      setCvrForm({ project_id: '', period_start: '', period_end: '', contracted_value: '', work_done_value: '', billed_value: '', received_value: '', retention_held: '0', notes: '' });
      fetchData();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed'); }
    finally { setFormLoading(false); }
  };

  const handleBillStatusChange = async (billId, newStatus) => {
    try {
      await api.patch(`/billing/${billId}/status`, { status: newStatus });
      toast.success(`Bill ${newStatus}`);
      fetchData();
    } catch { toast.error('Failed to update status'); }
  };

  const handleDeleteBill = async (billId) => {
    try {
      await api.delete(`/billing/${billId}`);
      toast.success('Bill deleted');
      setSelectedBill(null);
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  const handleDeleteCvr = async (cvrId) => {
    try {
      await api.delete(`/cvr/${cvrId}`);
      toast.success('CVR deleted');
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  const filteredBillings = useMemo(() => {
    return billings.filter(b => {
      if (projectFilter !== 'all' && b.project_id !== projectFilter) return false;
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      return true;
    });
  }, [billings, projectFilter, statusFilter]);

  const filteredCvrs = useMemo(() => {
    return cvrs.filter(c => projectFilter === 'all' || c.project_id === projectFilter);
  }, [cvrs, projectFilter]);

  const getProjectName = (pid) => projects.find(p => p.id === pid)?.name || '-';
  const ds = dashboard?.summary || {};

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6" data-testid="financial-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial Management</h1>
          <p className="page-subtitle">Billing, CVR, cash flow and project financials</p>
        </div>
      </div>

      {/* KPI Row - 6 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Total Billed" value={formatCurrency(ds.total_billed || 0)} icon={Receipt} color="blue" testId="kpi-total-billed" />
        <KpiCard label="Pending" value={formatCurrency(ds.pending_collection || 0)} icon={Clock} color="amber" testId="kpi-pending" />
        <KpiCard label="Approved" value={formatCurrency(ds.approved_amount || 0)} icon={CheckCircle2} color="purple" testId="kpi-approved" />
        <KpiCard label="Paid" value={formatCurrency(ds.paid_amount || 0)} icon={Wallet} color="emerald" testId="kpi-paid" />
        <KpiCard label="Collection" value={`${ds.collection_efficiency || 0}%`} icon={TrendingUp} color="cyan" testId="kpi-collection" />
        <KpiCard label="Retention" value={formatCurrency(ds.total_retention || 0)} icon={PiggyBank} color="slate" testId="kpi-retention" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-56 rounded-sm text-sm" data-testid="project-filter">
            <Filter className="w-4 h-4 mr-1" /><SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="billing" className="space-y-4">
        <TabsList className="rounded-sm">
          <TabsTrigger value="billing" className="rounded-sm gap-1.5" data-testid="billing-tab"><Receipt className="w-4 h-4" />Billing ({filteredBillings.length})</TabsTrigger>
          <TabsTrigger value="cvr" className="rounded-sm gap-1.5" data-testid="cvr-tab"><BarChart3 className="w-4 h-4" />CVR ({filteredCvrs.length})</TabsTrigger>
          <TabsTrigger value="projects" className="rounded-sm gap-1.5" data-testid="projects-financial-tab"><IndianRupee className="w-4 h-4" />Project Financials</TabsTrigger>
        </TabsList>

        {/* ============ BILLING TAB ============ */}
        <TabsContent value="billing" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 rounded-sm text-sm" data-testid="status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isBillingDialogOpen} onOpenChange={setIsBillingDialogOpen}>
              <DialogTrigger asChild>
                <Button className="action-btn action-btn-accent" data-testid="create-billing-btn"><Plus className="w-4 h-4" />New Bill</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle className="text-xl font-bold uppercase">Create Bill</DialogTitle></DialogHeader>
                <form onSubmit={handleBillingSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Project *</Label>
                    <Select value={billingForm.project_id} onValueChange={(v) => setBillingForm(f => ({...f, project_id: v}))}>
                      <SelectTrigger className="rounded-sm" data-testid="billing-project-select"><SelectValue placeholder="Select project" /></SelectTrigger>
                      <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Bill Number *</Label><Input value={billingForm.bill_number} onChange={(e) => setBillingForm(f => ({...f, bill_number: e.target.value}))} placeholder="RA-001" required className="rounded-sm" data-testid="billing-number-input" /></div>
                    <div className="space-y-2"><Label>Bill Date *</Label><Input type="date" value={billingForm.bill_date} onChange={(e) => setBillingForm(f => ({...f, bill_date: e.target.value}))} required className="rounded-sm" data-testid="billing-date-input" /></div>
                  </div>
                  <div className="space-y-2"><Label>Description *</Label><Input value={billingForm.description} onChange={(e) => setBillingForm(f => ({...f, description: e.target.value}))} placeholder="Running Account Bill" required className="rounded-sm" data-testid="billing-desc-input" /></div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Amount (INR) *</Label><Input type="number" value={billingForm.amount} onChange={(e) => setBillingForm(f => ({...f, amount: e.target.value}))} placeholder="1000000" required className="rounded-sm" data-testid="billing-amount-input" /></div>
                    <div className="space-y-2"><Label>GST Rate %</Label>
                      <Select value={billingForm.gst_rate} onValueChange={(v) => setBillingForm(f => ({...f, gst_rate: v}))}>
                        <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{[0,5,12,18,28].map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Bill Type</Label>
                      <Select value={billingForm.bill_type} onValueChange={(v) => setBillingForm(f => ({...f, bill_type: v}))}>
                        <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="running">Running</SelectItem>
                          <SelectItem value="final">Final</SelectItem>
                          <SelectItem value="advance">Advance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {billingForm.amount && (
                    <div className="p-3 bg-muted/50 rounded-sm text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Base Amount</span><span className="font-mono">{formatCurrency(parseFloat(billingForm.amount) || 0)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">GST ({billingForm.gst_rate}%)</span><span className="font-mono">{formatCurrency((parseFloat(billingForm.amount) || 0) * parseFloat(billingForm.gst_rate) / 100)}</span></div>
                      <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span className="font-mono">{formatCurrency((parseFloat(billingForm.amount) || 0) * (1 + parseFloat(billingForm.gst_rate) / 100))}</span></div>
                    </div>
                  )}
                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsBillingDialogOpen(false)} className="rounded-sm">Cancel</Button>
                    <Button type="submit" className="action-btn-accent rounded-sm" disabled={formLoading} data-testid="submit-billing-btn">{formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Bill'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {selectedBill ? (
            <BillDetail bill={selectedBill} projectName={getProjectName(selectedBill.project_id)} onBack={() => setSelectedBill(null)} onStatusChange={handleBillStatusChange} onDelete={handleDeleteBill} />
          ) : (
            <Card className="rounded-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">GST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBillings.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground"><Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No bills found</p></TableCell></TableRow>
                  ) : filteredBillings.map((bill) => (
                    <TableRow key={bill.id} data-testid={`bill-row-${bill.id}`}>
                      <TableCell className="font-mono text-sm font-medium">{bill.bill_number}</TableCell>
                      <TableCell className="text-sm">{formatDate(bill.bill_date)}</TableCell>
                      <TableCell className="text-sm max-w-[120px] truncate">{getProjectName(bill.project_id)}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm">{bill.description}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs rounded-sm capitalize">{bill.bill_type}</Badge></TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(bill.amount)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(bill.gst_amount)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{formatCurrency(bill.total_amount)}</TableCell>
                      <TableCell>
                        <Badge className={`${billStatusColors[bill.status] || billStatusColors.pending} text-xs rounded-sm capitalize`}>{bill.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedBill(bill)} data-testid={`view-bill-${bill.id}`}><Eye className="w-3.5 h-3.5" /></Button>
                          {billStatusFlow[bill.status] && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600" onClick={() => handleBillStatusChange(bill.id, billStatusFlow[bill.status])} data-testid={`advance-bill-${bill.id}`}>
                              {bill.status === 'pending' ? 'Approve' : 'Mark Paid'}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ============ CVR TAB ============ */}
        <TabsContent value="cvr" className="space-y-4">
          <div className="flex justify-between">
            <div className="text-sm text-muted-foreground">{filteredCvrs.length} CVR records</div>
            <Dialog open={isCvrDialogOpen} onOpenChange={setIsCvrDialogOpen}>
              <DialogTrigger asChild>
                <Button className="action-btn action-btn-accent" data-testid="create-cvr-btn"><Plus className="w-4 h-4" />New CVR</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle className="text-xl font-bold uppercase">Cost Value Reconciliation</DialogTitle></DialogHeader>
                <form onSubmit={handleCvrSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Project *</Label>
                    <Select value={cvrForm.project_id} onValueChange={(v) => setCvrForm(f => ({...f, project_id: v}))}>
                      <SelectTrigger className="rounded-sm" data-testid="cvr-project-select"><SelectValue placeholder="Select project" /></SelectTrigger>
                      <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Period Start *</Label><Input type="date" value={cvrForm.period_start} onChange={(e) => setCvrForm(f => ({...f, period_start: e.target.value}))} required className="rounded-sm" data-testid="cvr-period-start" /></div>
                    <div className="space-y-2"><Label>Period End *</Label><Input type="date" value={cvrForm.period_end} onChange={(e) => setCvrForm(f => ({...f, period_end: e.target.value}))} required className="rounded-sm" data-testid="cvr-period-end" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Contracted Value *</Label><Input type="number" value={cvrForm.contracted_value} onChange={(e) => setCvrForm(f => ({...f, contracted_value: e.target.value}))} required className="rounded-sm" data-testid="cvr-contracted-value" /></div>
                    <div className="space-y-2"><Label>Work Done Value *</Label><Input type="number" value={cvrForm.work_done_value} onChange={(e) => setCvrForm(f => ({...f, work_done_value: e.target.value}))} required className="rounded-sm" data-testid="cvr-work-done" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Billed Value *</Label><Input type="number" value={cvrForm.billed_value} onChange={(e) => setCvrForm(f => ({...f, billed_value: e.target.value}))} required className="rounded-sm" data-testid="cvr-billed" /></div>
                    <div className="space-y-2"><Label>Received Value *</Label><Input type="number" value={cvrForm.received_value} onChange={(e) => setCvrForm(f => ({...f, received_value: e.target.value}))} required className="rounded-sm" data-testid="cvr-received" /></div>
                    <div className="space-y-2"><Label>Retention Held</Label><Input type="number" value={cvrForm.retention_held} onChange={(e) => setCvrForm(f => ({...f, retention_held: e.target.value}))} className="rounded-sm" /></div>
                  </div>
                  <div className="space-y-2"><Label>Notes</Label><Input value={cvrForm.notes} onChange={(e) => setCvrForm(f => ({...f, notes: e.target.value}))} placeholder="Additional notes..." className="rounded-sm" /></div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsCvrDialogOpen(false)} className="rounded-sm">Cancel</Button>
                    <Button type="submit" className="action-btn-accent rounded-sm" disabled={formLoading} data-testid="submit-cvr-btn">{formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create CVR'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {filteredCvrs.length === 0 ? (
            <Card className="rounded-sm"><CardContent className="text-center py-12 text-muted-foreground"><BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No CVR records</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filteredCvrs.map((cvr) => {
                const cpi = cvr.contracted_value > 0 ? (cvr.work_done_value / cvr.contracted_value) : 0;
                const billingEff = cvr.work_done_value > 0 ? (cvr.billed_value / cvr.work_done_value * 100) : 0;
                const collectionEff = cvr.billed_value > 0 ? (cvr.received_value / cvr.billed_value * 100) : 0;
                return (
                  <Card key={cvr.id} className="rounded-sm" data-testid={`cvr-card-${cvr.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-sm">{getProjectName(cvr.project_id)}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(cvr.period_start)} - {formatDate(cvr.period_end)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${cvr.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {cvr.variance >= 0 ? <ArrowUpRight className="w-4 h-4 inline" /> : <ArrowDownRight className="w-4 h-4 inline" />}
                            {formatCurrency(Math.abs(cvr.variance))}
                          </span>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => handleDeleteCvr(cvr.id)} data-testid={`delete-cvr-${cvr.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      {/* Values Grid */}
                      <div className="grid grid-cols-5 gap-4 text-sm">
                        <div><p className="text-[10px] text-muted-foreground uppercase">Contracted</p><p className="font-semibold">{formatCurrency(cvr.contracted_value)}</p></div>
                        <div><p className="text-[10px] text-muted-foreground uppercase">Work Done</p><p className="font-semibold">{formatCurrency(cvr.work_done_value)}</p></div>
                        <div><p className="text-[10px] text-muted-foreground uppercase">Billed</p><p className="font-semibold">{formatCurrency(cvr.billed_value)}</p></div>
                        <div><p className="text-[10px] text-muted-foreground uppercase">Received</p><p className="font-semibold text-emerald-600">{formatCurrency(cvr.received_value)}</p></div>
                        <div><p className="text-[10px] text-muted-foreground uppercase">Retention</p><p className="font-semibold">{formatCurrency(cvr.retention_held)}</p></div>
                      </div>
                      {/* Performance Indicators */}
                      <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t">
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">CPI</span>
                            <span className={`font-bold ${cpi >= 1 ? 'text-emerald-600' : 'text-red-600'}`}>{cpi.toFixed(2)}</span>
                          </div>
                          <Progress value={Math.min(cpi * 100, 100)} className="h-1.5" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Billing Eff.</span>
                            <span className="font-bold">{billingEff.toFixed(0)}%</span>
                          </div>
                          <Progress value={Math.min(billingEff, 100)} className="h-1.5" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Collection</span>
                            <span className="font-bold">{collectionEff.toFixed(0)}%</span>
                          </div>
                          <Progress value={Math.min(collectionEff, 100)} className="h-1.5" />
                        </div>
                      </div>
                      {cvr.notes && <p className="text-xs text-muted-foreground italic mt-2">{cvr.notes}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ============ PROJECT FINANCIALS TAB ============ */}
        <TabsContent value="projects" className="space-y-4">
          <Card className="rounded-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base">Project-wise Financial Summary</CardTitle></CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Actual Cost</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Budget Usage</TableHead>
                  <TableHead>Bills</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dashboard?.project_breakdown || []).length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No project data</TableCell></TableRow>
                ) : (dashboard?.project_breakdown || []).map((p) => {
                  const usagePct = p.budget > 0 ? (p.actual_cost / p.budget * 100).toFixed(1) : 0;
                  return (
                    <TableRow key={p.project_id} data-testid={`project-fin-${p.project_id}`}>
                      <TableCell className="font-medium text-sm max-w-[180px] truncate">{p.project_name}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(p.budget)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(p.actual_cost)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(p.total_billed)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(p.received)}</TableCell>
                      <TableCell className="text-right text-sm">
                        <span className={p.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}>{formatCurrency(p.variance)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 w-24">
                          <Progress value={Math.min(parseFloat(usagePct), 100)} className="h-1.5 flex-1" />
                          <span className="text-xs">{usagePct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-xs rounded-sm">{p.bills_count}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Totals row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="rounded-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Total Budget</p><p className="text-xl font-bold">{formatCurrency(ds.total_budget || 0)}</p></CardContent></Card>
            <Card className="rounded-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Total Spent</p><p className="text-xl font-bold">{formatCurrency(ds.total_spent || 0)}</p></CardContent></Card>
            <Card className="rounded-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">CPI</p><p className={`text-xl font-bold ${(ds.cpi || 0) >= 1 ? 'text-emerald-600' : 'text-red-600'}`}>{ds.cpi || 0}</p><p className="text-xs text-muted-foreground">{(ds.cpi || 0) >= 1 ? 'On Track' : 'Over Cost'}</p></CardContent></Card>
            <Card className="rounded-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">GST Collected</p><p className="text-xl font-bold">{formatCurrency(ds.total_gst || 0)}</p></CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, testId }) {
  return (
    <Card className="kpi-card">
      <CardContent className="p-3 flex items-center gap-2.5">
        <div className={`p-1.5 rounded-sm bg-${color}-100`}><Icon className={`w-4 h-4 text-${color}-600`} /></div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase leading-tight">{label}</p>
          <p className="text-base font-bold leading-tight" data-testid={testId}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BillDetail({ bill, projectName, onBack, onStatusChange, onDelete }) {
  const nextStatus = billStatusFlow[bill.status];
  return (
    <div className="space-y-4" data-testid="bill-detail-view">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1" data-testid="back-to-bills-btn">
        <Eye className="w-4 h-4" /> Back to bills
      </Button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-mono">{bill.bill_number}</CardTitle>
                <CardDescription>{projectName} | {formatDate(bill.bill_date)}</CardDescription>
              </div>
              <Badge className={`${billStatusColors[bill.status]} rounded-sm text-sm capitalize`}>{bill.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{bill.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                ['Type', bill.bill_type?.charAt(0).toUpperCase() + bill.bill_type?.slice(1)],
                ['GST Rate', `${bill.gst_rate}%`],
                ['Created', formatDate(bill.created_at)],
                ['Bill Date', formatDate(bill.bill_date)],
              ].map(([k, v]) => (
                <div key={k}><p className="text-xs text-muted-foreground">{k}</p><p className="font-medium">{v}</p></div>
              ))}
            </div>

            {/* Amount Breakdown */}
            <Card className="rounded-sm bg-muted/30">
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Base Amount</span><span className="font-mono font-semibold">{formatCurrency(bill.amount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">CGST ({bill.gst_rate / 2}%)</span><span className="font-mono">{formatCurrency(bill.gst_amount / 2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">SGST ({bill.gst_rate / 2}%)</span><span className="font-mono">{formatCurrency(bill.gst_amount / 2)}</span></div>
                <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Total Invoice Value</span><span className="font-mono">{formatCurrency(bill.total_amount)}</span></div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Actions Side */}
        <div className="space-y-3">
          <Card className="rounded-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm uppercase">Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {nextStatus && (
                <Button className="w-full rounded-sm action-btn-accent" onClick={() => onStatusChange(bill.id, nextStatus)} data-testid="bill-advance-status-btn">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  {bill.status === 'pending' ? 'Approve Bill' : 'Mark as Paid'}
                </Button>
              )}
              {bill.status === 'paid' && (
                <div className="text-center py-2"><CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" /><p className="text-sm font-medium text-emerald-600">Payment Complete</p></div>
              )}
              <Button variant="outline" className="w-full rounded-sm text-red-500 hover:text-red-700" onClick={() => onDelete(bill.id)} data-testid="delete-bill-btn">
                <Trash2 className="w-4 h-4 mr-1" /> Delete Bill
              </Button>
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card className="rounded-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm uppercase">Status Flow</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['pending', 'approved', 'paid'].map((s, i) => {
                  const isActive = s === bill.status;
                  const isPast = ['pending', 'approved', 'paid'].indexOf(bill.status) > i;
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isPast ? 'bg-emerald-500 text-white' : isActive ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {isPast ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </div>
                      <span className={`text-sm capitalize ${isActive ? 'font-bold' : isPast ? 'text-emerald-600' : 'text-muted-foreground'}`}>{s}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
