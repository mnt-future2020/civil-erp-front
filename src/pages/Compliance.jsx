import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  IndianRupee, 
  Building2, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Loader2,
  Receipt,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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

export default function Compliance() {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [gstReturns, setGstReturns] = useState([]);
  const [reraProjects, setReraProjects] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isGstDialogOpen, setIsGstDialogOpen] = useState(false);
  const [isReraDialogOpen, setIsReraDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [gstForm, setGstForm] = useState({
    return_type: 'GSTR-3B',
    period: new Date().toISOString().slice(0, 7),
    total_outward_supplies: '',
    total_inward_supplies: '',
    cgst: '',
    sgst: '',
    igst: '0',
    itc_claimed: ''
  });

  const [reraForm, setReraForm] = useState({
    project_id: '',
    rera_number: '',
    registration_date: '',
    validity_date: '',
    escrow_bank: '',
    escrow_account: '',
    total_units: '',
    sold_units: '0'
  });

  const fetchData = useCallback(async () => {
    try {
      const [gstRes, reraRes, projectsRes] = await Promise.all([
        api.get('/gst-returns'),
        api.get('/rera-projects'),
        api.get('/projects')
      ]);
      setGstReturns(gstRes.data);
      setReraProjects(reraRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Failed to fetch compliance data:', error);
      toast.error('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGstSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post('/gst-returns', {
        ...gstForm,
        total_outward_supplies: parseFloat(gstForm.total_outward_supplies),
        total_inward_supplies: parseFloat(gstForm.total_inward_supplies),
        cgst: parseFloat(gstForm.cgst),
        sgst: parseFloat(gstForm.sgst),
        igst: parseFloat(gstForm.igst),
        itc_claimed: parseFloat(gstForm.itc_claimed)
      });
      toast.success('GST return created successfully');
      setIsGstDialogOpen(false);
      setGstForm({
        return_type: 'GSTR-3B',
        period: new Date().toISOString().slice(0, 7),
        total_outward_supplies: '',
        total_inward_supplies: '',
        cgst: '',
        sgst: '',
        igst: '0',
        itc_claimed: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create GST return');
    } finally {
      setFormLoading(false);
    }
  };

  const handleReraSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.post('/rera-projects', {
        ...reraForm,
        total_units: parseInt(reraForm.total_units),
        sold_units: parseInt(reraForm.sold_units)
      });
      toast.success('RERA project registered successfully');
      setIsReraDialogOpen(false);
      setReraForm({
        project_id: '',
        rera_number: '',
        registration_date: '',
        validity_date: '',
        escrow_bank: '',
        escrow_account: '',
        total_units: '',
        sold_units: '0'
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to register RERA project');
    } finally {
      setFormLoading(false);
    }
  };

  const totalGstPayable = gstReturns.reduce((sum, g) => sum + g.tax_payable, 0);
  const totalItc = gstReturns.reduce((sum, g) => sum + g.itc_claimed, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="compliance-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Compliance</h1>
          <p className="page-subtitle">GST Returns & RERA Compliance - Tamil Nadu</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="kpi-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-sm bg-blue-100 dark:bg-blue-900/30">
                <Receipt className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">GST Returns Filed</p>
                <p className="text-xl font-bold">{gstReturns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card warning">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-sm bg-amber-100 dark:bg-amber-900/30">
                <IndianRupee className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Tax Payable</p>
                <p className="text-xl font-bold">{formatCurrency(totalGstPayable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card success">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-sm bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">ITC Claimed</p>
                <p className="text-xl font-bold">{formatCurrency(totalItc)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-sm bg-purple-100 dark:bg-purple-900/30">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">RERA Projects</p>
                <p className="text-xl font-bold">{reraProjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Banner */}
      <Card className="rounded-sm border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-900/10">
        <CardContent className="p-4 flex items-center gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-400">GSTR-3B Due Soon</p>
            <p className="text-sm text-amber-700 dark:text-amber-500">File your January 2026 GSTR-3B before 20th February 2026 to avoid penalties.</p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="gst" className="space-y-4">
        <TabsList className="rounded-sm">
          <TabsTrigger value="gst" className="rounded-sm" data-testid="gst-tab">GST Returns</TabsTrigger>
          <TabsTrigger value="rera" className="rounded-sm" data-testid="rera-tab">RERA Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="gst" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isGstDialogOpen} onOpenChange={setIsGstDialogOpen}>
              <DialogTrigger asChild>
                <Button className="action-btn action-btn-accent" data-testid="create-gst-btn">
                  <Plus className="w-4 h-4" />
                  New GST Return
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold uppercase">Create GST Return</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleGstSubmit} className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Return Type *</Label>
                      <Select 
                        value={gstForm.return_type} 
                        onValueChange={(v) => setGstForm({...gstForm, return_type: v})}
                      >
                        <SelectTrigger className="rounded-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GSTR-1">GSTR-1</SelectItem>
                          <SelectItem value="GSTR-3B">GSTR-3B</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Period *</Label>
                      <Input
                        type="month"
                        value={gstForm.period}
                        onChange={(e) => setGstForm({...gstForm, period: e.target.value})}
                        required
                        className="rounded-sm"
                        data-testid="gst-period-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Outward Supplies *</Label>
                      <Input
                        type="number"
                        value={gstForm.total_outward_supplies}
                        onChange={(e) => setGstForm({...gstForm, total_outward_supplies: e.target.value})}
                        placeholder="1000000"
                        required
                        className="rounded-sm"
                        data-testid="gst-outward-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Inward Supplies *</Label>
                      <Input
                        type="number"
                        value={gstForm.total_inward_supplies}
                        onChange={(e) => setGstForm({...gstForm, total_inward_supplies: e.target.value})}
                        placeholder="500000"
                        required
                        className="rounded-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>CGST *</Label>
                      <Input
                        type="number"
                        value={gstForm.cgst}
                        onChange={(e) => setGstForm({...gstForm, cgst: e.target.value})}
                        placeholder="90000"
                        required
                        className="rounded-sm"
                        data-testid="gst-cgst-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SGST *</Label>
                      <Input
                        type="number"
                        value={gstForm.sgst}
                        onChange={(e) => setGstForm({...gstForm, sgst: e.target.value})}
                        placeholder="90000"
                        required
                        className="rounded-sm"
                        data-testid="gst-sgst-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>IGST</Label>
                      <Input
                        type="number"
                        value={gstForm.igst}
                        onChange={(e) => setGstForm({...gstForm, igst: e.target.value})}
                        placeholder="0"
                        className="rounded-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>ITC Claimed *</Label>
                    <Input
                      type="number"
                      value={gstForm.itc_claimed}
                      onChange={(e) => setGstForm({...gstForm, itc_claimed: e.target.value})}
                      placeholder="45000"
                      required
                      className="rounded-sm"
                      data-testid="gst-itc-input"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsGstDialogOpen(false)} className="rounded-sm">
                      Cancel
                    </Button>
                    <Button type="submit" className="action-btn-accent rounded-sm" disabled={formLoading} data-testid="submit-gst-btn">
                      {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Return'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="rounded-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Outward</TableHead>
                  <TableHead className="text-right">CGST + SGST</TableHead>
                  <TableHead className="text-right">ITC</TableHead>
                  <TableHead className="text-right">Tax Payable</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gstReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No GST returns found. Create your first return.
                    </TableCell>
                  </TableRow>
                ) : (
                  gstReturns.map((gst) => (
                    <TableRow key={gst.id}>
                      <TableCell className="font-mono text-sm">{gst.return_type}</TableCell>
                      <TableCell>{gst.period}</TableCell>
                      <TableCell className="text-right">{formatCurrency(gst.total_outward_supplies)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(gst.cgst + gst.sgst)}</TableCell>
                      <TableCell className="text-right text-emerald-600">{formatCurrency(gst.itc_claimed)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(gst.tax_payable)}</TableCell>
                      <TableCell>
                        <Badge className={`status-badge ${getStatusColor(gst.status)}`}>
                          {gst.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="rera" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isReraDialogOpen} onOpenChange={setIsReraDialogOpen}>
              <DialogTrigger asChild>
                <Button className="action-btn action-btn-accent" data-testid="create-rera-btn">
                  <Plus className="w-4 h-4" />
                  Register RERA Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold uppercase">Register RERA Project</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleReraSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Project *</Label>
                    <Select 
                      value={reraForm.project_id} 
                      onValueChange={(v) => setReraForm({...reraForm, project_id: v})}
                    >
                      <SelectTrigger className="rounded-sm" data-testid="rera-project-select">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>RERA Number *</Label>
                    <Input
                      value={reraForm.rera_number}
                      onChange={(e) => setReraForm({...reraForm, rera_number: e.target.value})}
                      placeholder="TN/01/Building/2026/001"
                      required
                      className="rounded-sm font-mono"
                      data-testid="rera-number-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Registration Date *</Label>
                      <Input
                        type="date"
                        value={reraForm.registration_date}
                        onChange={(e) => setReraForm({...reraForm, registration_date: e.target.value})}
                        required
                        className="rounded-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Validity Date *</Label>
                      <Input
                        type="date"
                        value={reraForm.validity_date}
                        onChange={(e) => setReraForm({...reraForm, validity_date: e.target.value})}
                        required
                        className="rounded-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Escrow Bank *</Label>
                      <Input
                        value={reraForm.escrow_bank}
                        onChange={(e) => setReraForm({...reraForm, escrow_bank: e.target.value})}
                        placeholder="State Bank of India"
                        required
                        className="rounded-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Escrow Account *</Label>
                      <Input
                        value={reraForm.escrow_account}
                        onChange={(e) => setReraForm({...reraForm, escrow_account: e.target.value})}
                        placeholder="1234567890"
                        required
                        className="rounded-sm font-mono"
                        data-testid="rera-escrow-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Total Units *</Label>
                      <Input
                        type="number"
                        value={reraForm.total_units}
                        onChange={(e) => setReraForm({...reraForm, total_units: e.target.value})}
                        placeholder="100"
                        required
                        className="rounded-sm"
                        data-testid="rera-units-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sold Units</Label>
                      <Input
                        type="number"
                        value={reraForm.sold_units}
                        onChange={(e) => setReraForm({...reraForm, sold_units: e.target.value})}
                        placeholder="0"
                        className="rounded-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsReraDialogOpen(false)} className="rounded-sm">
                      Cancel
                    </Button>
                    <Button type="submit" className="action-btn-accent rounded-sm" disabled={formLoading} data-testid="submit-rera-btn">
                      {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {reraProjects.length === 0 ? (
            <Card className="rounded-sm">
              <CardContent className="empty-state py-12">
                <Building2 className="empty-state-icon" />
                <p className="empty-state-title">No RERA projects registered</p>
                <p className="empty-state-description">Register your projects with RERA Tamil Nadu to ensure compliance</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reraProjects.map((rera) => {
                const project = projects.find(p => p.id === rera.project_id);
                const salesProgress = rera.total_units > 0 ? (rera.sold_units / rera.total_units) * 100 : 0;
                return (
                  <Card key={rera.id} className="rounded-sm" data-testid={`rera-card-${rera.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg font-bold">{project?.name || 'Unknown Project'}</CardTitle>
                          <p className="font-mono text-sm text-muted-foreground mt-1">{rera.rera_number}</p>
                        </div>
                        <Badge className={`status-badge ${getStatusColor(rera.compliance_status)}`}>
                          {rera.compliance_status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Registered</p>
                          <p className="font-medium">{formatDate(rera.registration_date)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Valid Until</p>
                          <p className="font-medium">{formatDate(rera.validity_date)}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sales Progress</span>
                          <span className="font-medium">{rera.sold_units} / {rera.total_units} units</span>
                        </div>
                        <Progress value={salesProgress} className="h-2" />
                      </div>

                      <div className="pt-2 border-t text-sm">
                        <p className="text-muted-foreground mb-1">Escrow Account</p>
                        <p className="font-mono">{rera.escrow_bank} - {rera.escrow_account}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
