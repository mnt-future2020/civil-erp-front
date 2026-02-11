import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Ban,
  QrCode,
  Download,
  ArrowLeft,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '../lib/utils';
import { Link } from 'react-router-dom';

const einvoiceStatusConfig = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700', icon: FileText },
  irn_generated: { label: 'IRN Generated', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  auth_failed: { label: 'Auth Failed', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  submission_failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

const initialFormState = {
  document_number: '',
  document_date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  document_type: 'INV',
  supply_type: 'B2B',
  seller_gstin: '',
  seller_legal_name: '',
  seller_trade_name: '',
  seller_address: '',
  seller_location: '',
  seller_pincode: '',
  seller_state_code: '33',
  buyer_gstin: '',
  buyer_legal_name: '',
  buyer_trade_name: '',
  buyer_address: '',
  buyer_location: '',
  buyer_pincode: '',
  buyer_state_code: '33',
  buyer_pos: '33',
  payment_mode: 'CREDIT',
  items: [{
    sl_no: 1,
    item_description: '',
    hsn_code: '',
    quantity: 1,
    unit: 'NOS',
    unit_price: 0,
    discount: 0,
    taxable_value: 0,
    gst_rate: 18,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    cess_amount: 0,
    total_item_value: 0
  }],
  total_taxable_value: 0,
  total_cgst: 0,
  total_sgst: 0,
  total_igst: 0,
  total_cess: 0,
  total_discount: 0,
  other_charges: 0,
  round_off: 0,
  total_invoice_value: 0
};

function StatusBadge({ status }) {
  const cfg = einvoiceStatusConfig[status] || einvoiceStatusConfig.draft;
  const Icon = cfg.icon;
  return (
    <Badge className={`${cfg.color} gap-1 font-medium rounded-sm`} data-testid={`status-badge-${status}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

export default function EInvoicing() {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [activeTab, setActiveTab] = useState('list');
  const [cancelDialogId, setCancelDialogId] = useState(null);
  const [cancelReason, setCancelReason] = useState('Data entry error');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [invRes, statsRes] = await Promise.all([
        api.get('/einvoice'),
        api.get('/einvoice-stats')
      ]);
      setInvoices(invRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load e-invoice data');
    } finally {
      setLoading(false);
    }
  };

  const recalcItem = (item) => {
    const taxable = (item.quantity * item.unit_price) - item.discount;
    const isInter = form.seller_state_code !== form.buyer_state_code;
    const cgst = isInter ? 0 : +(taxable * item.gst_rate / 200).toFixed(2);
    const sgst = isInter ? 0 : +(taxable * item.gst_rate / 200).toFixed(2);
    const igst = isInter ? +(taxable * item.gst_rate / 100).toFixed(2) : 0;
    return {
      ...item,
      taxable_value: +taxable.toFixed(2),
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: igst,
      total_item_value: +(taxable + cgst + sgst + igst + item.cess_amount).toFixed(2)
    };
  };

  const recalcTotals = (items) => {
    const taxable = items.reduce((s, i) => s + i.taxable_value, 0);
    const cgst = items.reduce((s, i) => s + i.cgst_amount, 0);
    const sgst = items.reduce((s, i) => s + i.sgst_amount, 0);
    const igst = items.reduce((s, i) => s + i.igst_amount, 0);
    const cess = items.reduce((s, i) => s + i.cess_amount, 0);
    return {
      total_taxable_value: +taxable.toFixed(2),
      total_cgst: +cgst.toFixed(2),
      total_sgst: +sgst.toFixed(2),
      total_igst: +igst.toFixed(2),
      total_cess: +cess.toFixed(2),
      total_invoice_value: +(taxable + cgst + sgst + igst + cess).toFixed(2)
    };
  };

  const updateItem = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    newItems[index] = recalcItem(newItems[index]);
    const totals = recalcTotals(newItems);
    setForm(f => ({ ...f, items: newItems, ...totals }));
  };

  const addItem = () => {
    setForm(f => ({
      ...f,
      items: [...f.items, {
        sl_no: f.items.length + 1, item_description: '', hsn_code: '',
        quantity: 1, unit: 'NOS', unit_price: 0, discount: 0, taxable_value: 0,
        gst_rate: 18, cgst_amount: 0, sgst_amount: 0, igst_amount: 0,
        cess_amount: 0, total_item_value: 0
      }]
    }));
  };

  const removeItem = (index) => {
    if (form.items.length <= 1) return;
    const newItems = form.items.filter((_, i) => i !== index).map((item, i) => ({ ...item, sl_no: i + 1 }));
    const totals = recalcTotals(newItems);
    setForm(f => ({ ...f, items: newItems, ...totals }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.document_number || !form.seller_gstin || !form.buyer_gstin || !form.items[0]?.item_description) {
      toast.error('Please fill all required fields');
      return;
    }
    setFormLoading(true);
    try {
      const res = await api.post('/einvoice/generate', form);
      if (res.data.status === 'irn_generated') {
        toast.success('E-Invoice generated successfully! IRN created.');
      } else if (res.data.status === 'auth_failed') {
        toast.warning('E-Invoice saved but NIC authentication failed. Check GST credentials.');
      } else {
        toast.info(`E-Invoice saved with status: ${res.data.status}`);
      }
      setIsCreateOpen(false);
      setForm(initialFormState);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate e-invoice');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelDialogId) return;
    try {
      await api.post(`/einvoice/${cancelDialogId}/cancel?reason=${encodeURIComponent(cancelReason)}`);
      toast.success('E-Invoice cancelled');
      setCancelDialogId(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel');
    }
  };

  const viewInvoice = async (id) => {
    try {
      const res = await api.get(`/einvoice/${id}`);
      setSelectedInvoice(res.data);
      setActiveTab('detail');
    } catch {
      toast.error('Failed to load invoice details');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="einvoice-loading">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="einvoicing-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">GST E-Invoicing</h1>
          <p className="page-subtitle">Generate & manage e-invoices via NIC Portal</p>
        </div>
        <Button
          onClick={() => { setForm(initialFormState); setIsCreateOpen(true); }}
          className="action-btn action-btn-accent"
          data-testid="create-einvoice-btn"
        >
          <Plus className="w-4 h-4" />
          New E-Invoice
        </Button>
      </div>

      {/* Credentials Warning */}
      {stats && !stats.credentials_configured && (
        <Card className="rounded-sm border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-900/10" data-testid="credentials-warning">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-800">Test Mode Active</p>
                <p className="text-sm text-amber-700">NIC credentials not configured. E-Invoices will be generated in test/simulation mode.</p>
              </div>
            </div>
            <Link to="/settings">
              <Button variant="outline" size="sm" className="rounded-sm gap-1" data-testid="go-to-settings-btn">
                <Settings className="w-4 h-4" /> Configure
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total E-Invoices', value: stats?.total || 0, color: 'blue' },
          { label: 'IRN Generated', value: stats?.irn_generated || 0, color: 'emerald' },
          { label: 'Cancelled', value: stats?.cancelled || 0, color: 'red' },
          { label: 'Failed', value: stats?.failed || 0, color: 'amber' },
          { label: 'Total Value', value: formatCurrency(stats?.total_value || 0), color: 'purple' },
        ].map((s) => (
          <Card key={s.label} className="kpi-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">{s.label}</p>
              <p className={`text-xl font-bold text-${s.color}-600`} data-testid={`stat-${s.label.toLowerCase().replace(/ /g,'-')}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      {activeTab === 'detail' && selectedInvoice ? (
        <InvoiceDetail invoice={selectedInvoice} onBack={() => setActiveTab('list')} />
      ) : (
        <Card className="rounded-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doc No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>IRN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <QrCode className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No e-invoices yet. Create your first e-invoice.</p>
                  </TableCell>
                </TableRow>
              ) : invoices.map((inv) => (
                <TableRow key={inv.id} data-testid={`einvoice-row-${inv.id}`}>
                  <TableCell className="font-mono text-sm font-medium">{inv.document_number}</TableCell>
                  <TableCell className="text-sm">{inv.document_date}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{inv.buyer_legal_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{inv.buyer_gstin}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(inv.total_invoice_value)}</TableCell>
                  <TableCell>
                    {inv.irn ? (
                      <span className="font-mono text-xs text-emerald-600">{inv.irn.substring(0, 16)}...</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell><StatusBadge status={inv.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => viewInvoice(inv.id)} data-testid={`view-einvoice-${inv.id}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {inv.status === 'irn_generated' && (
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => setCancelDialogId(inv.id)} data-testid={`cancel-einvoice-${inv.id}`}>
                          <Ban className="w-4 h-4" />
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

      {/* Cancel Dialog */}
      <Dialog open={!!cancelDialogId} onOpenChange={(open) => { if (!open) setCancelDialogId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel E-Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">This action will cancel the IRN with NIC portal. This cannot be undone.</p>
            <div className="space-y-2">
              <Label>Reason for Cancellation</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Data entry error">Data entry error</SelectItem>
                  <SelectItem value="Order cancelled">Order cancelled</SelectItem>
                  <SelectItem value="Duplicate entry">Duplicate entry</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelDialogId(null)} className="rounded-sm">Keep Invoice</Button>
              <Button variant="destructive" onClick={handleCancel} className="rounded-sm" data-testid="confirm-cancel-btn">Cancel Invoice</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create E-Invoice Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase">Generate E-Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 mt-2">
            {/* Document Details */}
            <div>
              <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Document Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Document No *</Label>
                  <Input value={form.document_number} onChange={e => setForm(f => ({...f, document_number: e.target.value}))} placeholder="INV/2026/001" required className="rounded-sm font-mono text-sm" data-testid="einv-doc-number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date (DD/MM/YYYY) *</Label>
                  <Input value={form.document_date} onChange={e => setForm(f => ({...f, document_date: e.target.value}))} placeholder="09/02/2026" required className="rounded-sm text-sm" data-testid="einv-doc-date" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={form.document_type} onValueChange={v => setForm(f => ({...f, document_type: v}))}>
                    <SelectTrigger className="rounded-sm text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INV">Invoice</SelectItem>
                      <SelectItem value="CRN">Credit Note</SelectItem>
                      <SelectItem value="DBN">Debit Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Supply Type</Label>
                  <Select value={form.supply_type} onValueChange={v => setForm(f => ({...f, supply_type: v}))}>
                    <SelectTrigger className="rounded-sm text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="B2B">B2B</SelectItem>
                      <SelectItem value="B2C">B2C</SelectItem>
                      <SelectItem value="SEZWP">SEZ With Payment</SelectItem>
                      <SelectItem value="SEZWOP">SEZ Without Payment</SelectItem>
                      <SelectItem value="EXPWP">Export With Payment</SelectItem>
                      <SelectItem value="EXPWOP">Export Without Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Seller & Buyer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Seller Details</h3>
                <div className="space-y-2">
                  <Input value={form.seller_gstin} onChange={e => setForm(f => ({...f, seller_gstin: e.target.value.toUpperCase()}))} placeholder="GSTIN *" required className="rounded-sm font-mono text-sm" data-testid="einv-seller-gstin" />
                  <Input value={form.seller_legal_name} onChange={e => setForm(f => ({...f, seller_legal_name: e.target.value}))} placeholder="Legal Name *" required className="rounded-sm text-sm" data-testid="einv-seller-name" />
                  <Input value={form.seller_address} onChange={e => setForm(f => ({...f, seller_address: e.target.value}))} placeholder="Address *" required className="rounded-sm text-sm" />
                  <div className="grid grid-cols-3 gap-2">
                    <Input value={form.seller_location} onChange={e => setForm(f => ({...f, seller_location: e.target.value}))} placeholder="City *" required className="rounded-sm text-sm" />
                    <Input value={form.seller_pincode} onChange={e => setForm(f => ({...f, seller_pincode: e.target.value}))} placeholder="Pincode *" required className="rounded-sm font-mono text-sm" />
                    <Input value={form.seller_state_code} onChange={e => setForm(f => ({...f, seller_state_code: e.target.value}))} placeholder="State Code" className="rounded-sm font-mono text-sm" />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Buyer Details</h3>
                <div className="space-y-2">
                  <Input value={form.buyer_gstin} onChange={e => setForm(f => ({...f, buyer_gstin: e.target.value.toUpperCase()}))} placeholder="GSTIN *" required className="rounded-sm font-mono text-sm" data-testid="einv-buyer-gstin" />
                  <Input value={form.buyer_legal_name} onChange={e => setForm(f => ({...f, buyer_legal_name: e.target.value}))} placeholder="Legal Name *" required className="rounded-sm text-sm" data-testid="einv-buyer-name" />
                  <Input value={form.buyer_address} onChange={e => setForm(f => ({...f, buyer_address: e.target.value}))} placeholder="Address *" required className="rounded-sm text-sm" />
                  <div className="grid grid-cols-3 gap-2">
                    <Input value={form.buyer_location} onChange={e => setForm(f => ({...f, buyer_location: e.target.value}))} placeholder="City *" required className="rounded-sm text-sm" />
                    <Input value={form.buyer_pincode} onChange={e => setForm(f => ({...f, buyer_pincode: e.target.value}))} placeholder="Pincode *" required className="rounded-sm font-mono text-sm" />
                    <Input value={form.buyer_state_code} onChange={e => setForm(f => ({...f, buyer_state_code: e.target.value}))} placeholder="State Code" className="rounded-sm font-mono text-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold uppercase text-muted-foreground">Line Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="rounded-sm text-xs" data-testid="add-item-btn">
                  <Plus className="w-3 h-3 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {form.items.map((item, idx) => (
                  <div key={idx} className="p-3 border rounded-sm bg-muted/30 space-y-2" data-testid={`item-row-${idx}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Item #{item.sl_no}</span>
                      {form.items.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" className="text-red-500 h-6 text-xs" onClick={() => removeItem(idx)}>Remove</Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <Input value={item.item_description} onChange={e => updateItem(idx, 'item_description', e.target.value)} placeholder="Description *" required className="rounded-sm text-sm col-span-2" data-testid={`item-desc-${idx}`} />
                      <Input value={item.hsn_code} onChange={e => updateItem(idx, 'hsn_code', e.target.value)} placeholder="HSN Code *" required className="rounded-sm font-mono text-sm" data-testid={`item-hsn-${idx}`} />
                      <Select value={item.unit} onValueChange={v => updateItem(idx, 'unit', v)}>
                        <SelectTrigger className="rounded-sm text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['NOS','SQM','SQF','MTR','KGS','LTR','CUM','BAG','BOX','SET'].map(u => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      <div className="space-y-0.5">
                        <Label className="text-[10px]">Qty</Label>
                        <Input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', +e.target.value)} className="rounded-sm text-sm" min="0" />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px]">Unit Price</Label>
                        <Input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', +e.target.value)} className="rounded-sm text-sm" min="0" data-testid={`item-price-${idx}`} />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px]">GST %</Label>
                        <Select value={String(item.gst_rate)} onValueChange={v => updateItem(idx, 'gst_rate', +v)}>
                          <SelectTrigger className="rounded-sm text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[0, 5, 12, 18, 28].map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px]">Taxable</Label>
                        <Input value={item.taxable_value.toFixed(2)} readOnly className="rounded-sm text-sm bg-muted" />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px]">CGST+SGST</Label>
                        <Input value={(item.cgst_amount + item.sgst_amount).toFixed(2)} readOnly className="rounded-sm text-sm bg-muted" />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px]">Total</Label>
                        <Input value={item.total_item_value.toFixed(2)} readOnly className="rounded-sm text-sm bg-muted font-semibold" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-80 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Taxable Value</span><span className="font-mono">{formatCurrency(form.total_taxable_value)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span className="font-mono">{formatCurrency(form.total_cgst)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span className="font-mono">{formatCurrency(form.total_sgst)}</span></div>
                {form.total_igst > 0 && <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span className="font-mono">{formatCurrency(form.total_igst)}</span></div>}
                <div className="flex justify-between border-t pt-1.5 font-bold text-base"><span>Invoice Total</span><span className="font-mono">{formatCurrency(form.total_invoice_value)}</span></div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-sm">Cancel</Button>
              <Button type="submit" className="action-btn-accent rounded-sm" disabled={formLoading} data-testid="submit-einvoice-btn">
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <FileText className="w-4 h-4 mr-1" />}
                Generate E-Invoice
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvoiceDetail({ invoice, onBack }) {
  return (
    <div className="space-y-4" data-testid="invoice-detail-view">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1" data-testid="back-to-list-btn">
        <ArrowLeft className="w-4 h-4" /> Back to list
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Info */}
        <Card className="rounded-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold font-mono">{invoice.document_number}</CardTitle>
                <CardDescription>{invoice.document_date}</CardDescription>
              </div>
              <StatusBadge status={invoice.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Seller</p>
                <p className="font-medium">{invoice.seller_legal_name}</p>
                <p className="text-sm font-mono text-muted-foreground">{invoice.seller_gstin}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Buyer</p>
                <p className="font-medium">{invoice.buyer_legal_name}</p>
                <p className="text-sm font-mono text-muted-foreground">{invoice.buyer_gstin}</p>
              </div>
            </div>

            {/* Items Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs">HSN</TableHead>
                  <TableHead className="text-xs text-right">Qty</TableHead>
                  <TableHead className="text-xs text-right">Rate</TableHead>
                  <TableHead className="text-xs text-right">GST</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoice.items || []).map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{item.sl_no}</TableCell>
                    <TableCell className="text-sm">{item.item_description}</TableCell>
                    <TableCell className="text-sm font-mono">{item.hsn_code}</TableCell>
                    <TableCell className="text-sm text-right">{item.quantity} {item.unit}</TableCell>
                    <TableCell className="text-sm text-right">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-sm text-right">{item.gst_rate}%</TableCell>
                    <TableCell className="text-sm text-right font-semibold">{formatCurrency(item.total_item_value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end">
              <div className="w-72 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Taxable</span><span className="font-mono">{formatCurrency(invoice.total_taxable_value)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span className="font-mono">{formatCurrency(invoice.total_cgst)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span className="font-mono">{formatCurrency(invoice.total_sgst)}</span></div>
                {invoice.total_igst > 0 && <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span className="font-mono">{formatCurrency(invoice.total_igst)}</span></div>}
                <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span className="font-mono">{formatCurrency(invoice.total_invoice_value)}</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* IRN & QR Side Panel */}
        <div className="space-y-4">
          {invoice.irn && (
            <Card className="rounded-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase">IRN Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">IRN</p>
                  <p className="font-mono text-xs break-all" data-testid="irn-value">{invoice.irn}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ack No</p>
                  <p className="font-mono" data-testid="ack-number">{invoice.ack_number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ack Date</p>
                  <p>{invoice.ack_date}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {invoice.qr_code_image && (
            <Card className="rounded-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase flex items-center gap-1"><QrCode className="w-4 h-4" /> QR Code</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <img
                  src={`data:image/png;base64,${invoice.qr_code_image}`}
                  alt="E-Invoice QR Code"
                  className="w-48 h-48"
                  data-testid="qr-code-image"
                />
              </CardContent>
            </Card>
          )}

          {invoice.error_details && (
            <Card className="rounded-sm border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase text-red-600 mb-1">Error Details</p>
                <p className="text-sm text-red-700">{invoice.error_details}</p>
              </CardContent>
            </Card>
          )}

          {invoice.nic_response?.mode === 'test' && (
            <Card className="rounded-sm border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase text-amber-600 mb-1">Test Mode</p>
                <p className="text-sm text-amber-700">{invoice.nic_response.message}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
