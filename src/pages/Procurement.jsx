import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Building2, Phone, Mail, MapPin, FileText, Truck, Loader2,
  Star, Eye, Edit3, Trash2, ArrowLeft, CheckCircle2, Clock, Package,
  Filter, IndianRupee, BarChart3, XCircle, ArrowUpRight, ShoppingCart, Download,
  ChevronDown, Check
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
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { formatCurrency, formatDate, getStatusColor } from '../lib/utils';
import { DeleteConfirmationDialog } from '../components/DeleteConfirmationDialog';


const poStatusColors = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  closed: 'bg-emerald-100 text-emerald-700'
};
const poStatusLabels = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  closed: 'Closed'
};

export default function Procurement() {
  const { api, user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [grns, setGrns] = useState([]);
  const [projects, setProjects] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [poStatusFilter, setPoStatusFilter] = useState('all');
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isPODialogOpen, setIsPODialogOpen] = useState(false);
  const [isGrnDialogOpen, setIsGrnDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [vendorDetail, setVendorDetail] = useState(null);
  const [poDetail, setPoDetail] = useState(null);
  const [grnDetail, setGrnDetail] = useState(null);

  const [vendorForm, setVendorForm] = useState({ name: '', gstin: '', pan: '', address: '', city: '', state: 'Tamil Nadu', pincode: '', contact_person: '', phone: '', email: '', category: 'material' });
  const [categoryOptions, setCategoryOptions] = useState(['material', 'labor', 'equipment', 'subcontractor']);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');
  const [poForm, setPoForm] = useState({ project_id: '', vendor_id: '', po_date: new Date().toISOString().slice(0, 10), delivery_date: '', terms: '', items: [{ description: '', unit: '', quantity: '', rate: '', gst_rate: 18 }] });
  const [grnForm, setGrnForm] = useState({ po_id: '', grn_date: new Date().toISOString().slice(0, 10), items: [], notes: '' });

  const [projectInventory, setProjectInventory] = useState([]);

  // Delete States
  const [deletePODialogOpen, setDeletePODialogOpen] = useState(false);
  const [poToDelete, setPoToDelete] = useState(null);
  const [isDeletingPO, setIsDeletingPO] = useState(false);

  const [poStatusLoading, setPoStatusLoading] = useState(null); // poId being updated


  useEffect(() => { fetchData(); }, []);

  // Fetch inventory items when project changes in PO form
  useEffect(() => {
    if (poForm.project_id) {
      api.get('/inventory', { params: { project_id: poForm.project_id } })
        .then(res => setProjectInventory(res.data))
        .catch(() => setProjectInventory([]));
    } else {
      setProjectInventory([]);
    }
  }, [poForm.project_id]);

  const fetchData = async () => {
    try {
      const [vRes, poRes, grnRes, pRes, dRes] = await Promise.all([
        api.get('/vendors'), api.get('/purchase-orders'), api.get('/grn'),
        api.get('/projects?limit=1000'), api.get('/procurement/dashboard')
      ]);
      setVendors(vRes.data); setPurchaseOrders(poRes.data); setGrns(grnRes.data);
      setProjects(pRes.data.data); setDashboard(dRes.data);
    } catch { toast.error('Failed to load procurement data'); }
    finally { setLoading(false); }
  };

  // Vendor CRUD
  const handleVendorSubmit = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      if (selectedVendor) { await api.put(`/vendors/${selectedVendor.id}`, vendorForm); toast.success('Vendor updated'); }
      else { await api.post('/vendors', vendorForm); toast.success('Vendor created'); }
      setIsVendorDialogOpen(false); setSelectedVendor(null); resetVendorForm(); fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); } finally { setFormLoading(false); }
  };
  const resetVendorForm = () => setVendorForm({ name: '', gstin: '', pan: '', address: '', city: '', state: 'Tamil Nadu', pincode: '', contact_person: '', phone: '', email: '', category: 'material' });
  const editVendor = (v) => { setSelectedVendor(v); setVendorForm({ name: v.name, gstin: v.gstin || '', pan: v.pan || '', address: v.address, city: v.city, state: v.state, pincode: v.pincode, contact_person: v.contact_person, phone: v.phone, email: v.email, category: v.category }); setIsVendorDialogOpen(true); };
  const rateVendor = async (vid, rating) => { try { await api.patch(`/vendors/${vid}/rating`, { rating }); toast.success('Rating updated'); fetchData(); } catch { toast.error('Failed'); } };
  const deactivateVendor = async (vid) => { try { await api.patch(`/vendors/${vid}/deactivate`); toast.success('Vendor deactivated'); setVendorDetail(null); fetchData(); } catch { toast.error('Failed'); } };
  const viewVendorDetail = async (vid) => { try { const res = await api.get(`/vendors/${vid}/detail`); setVendorDetail(res.data); } catch { toast.error('Failed'); } };

  // PO CRUD
  const handlePOSubmit = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      const items = poForm.items.map(i => ({ ...i, quantity: parseFloat(i.quantity), rate: parseFloat(i.rate) || 0, gst_rate: (i.gst_rate !== undefined && i.gst_rate !== null && i.gst_rate !== '') ? parseFloat(i.gst_rate) : 18 }));
      await api.post('/purchase-orders', { ...poForm, items });
      toast.success('PO created'); setIsPODialogOpen(false);
      setProjectInventory([]);
      setPoForm({ project_id: '', vendor_id: '', po_date: new Date().toISOString().slice(0, 10), delivery_date: '', terms: '', items: [{ description: '', unit: '', quantity: '', rate: '', gst_rate: 18 }] });
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); } finally { setFormLoading(false); }
  };
  const addPOItem = () => setPoForm(f => ({ ...f, items: [...f.items, { description: '', unit: '', quantity: '', rate: '', gst_rate: 18 }] }));
  const updatePOItem = (i, field, val) => { const items = [...poForm.items]; items[i] = { ...items[i], [field]: val }; setPoForm(f => ({ ...f, items })); };
  const removePOItem = (i) => { if (poForm.items.length > 1) setPoForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) })); };
  const selectPOInventoryItem = (rowIdx, itemName) => {
    const inv = projectInventory.find(i => i.item_name === itemName);
    const items = [...poForm.items];
    items[rowIdx] = { ...items[rowIdx], description: itemName, unit: inv?.unit || '', rate: inv?.unit_price || '', gst_rate: (inv?.gst_rate !== undefined && inv?.gst_rate !== null) ? inv.gst_rate : 18 };
    setPoForm(f => ({ ...f, items }));
  };
  const handlePOStatus = async (poId, status) => {
    setPoStatusLoading(poId);
    try {
      await api.patch(`/purchase-orders/${poId}/status`, { status });
      toast.success(`PO ${status}`);
      fetchData();
      if (poDetail) viewPODetail(poId);
    } catch { toast.error('Failed'); }
    finally { setPoStatusLoading(null); }
  };
  const viewPODetail = async (poId) => { try { const res = await api.get(`/purchase-orders/${poId}`); setPoDetail(res.data); } catch { toast.error('Failed'); } };
  const deletePO = async () => {
    if (!poToDelete) return;
    setIsDeletingPO(true);
    try {
      await api.delete(`/purchase-orders/${poToDelete}`);
      toast.success('PO deleted');
      setPoDetail(null);
      setDeletePODialogOpen(false);
      fetchData();
    } catch { toast.error('Failed'); }
    finally { setIsDeletingPO(false); }
  };
  const viewGrnDetail = async (grnId) => { try { const res = await api.get(`/grn/${grnId}`); setGrnDetail(res.data); } catch { toast.error('Failed to load GRN details'); } };

  // GRN
  const openGrnDialog = (po) => {
    const items = (po.items || []).map((item, i) => ({ po_item_index: i, received_quantity: '', remarks: '', description: item.description, ordered: item.quantity }));
    setGrnForm({ po_id: po.id, grn_date: new Date().toISOString().slice(0, 10), items, notes: '' });
    setIsGrnDialogOpen(true);
  };
  const handleGrnSubmit = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      const items = grnForm.items.map(i => ({ po_item_index: i.po_item_index, received_quantity: parseFloat(i.received_quantity) || 0, remarks: i.remarks }));
      await api.post('/grn', { po_id: grnForm.po_id, grn_date: grnForm.grn_date, items, notes: grnForm.notes });
      toast.success('GRN created'); setIsGrnDialogOpen(false); fetchData();
      if (poDetail) viewPODetail(grnForm.po_id);
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); } finally { setFormLoading(false); }
  };

  const filteredVendors = useMemo(() => vendors.filter(v => {
    if (categoryFilter !== 'all' && v.category !== categoryFilter) return false;
    if (searchQuery && !v.name.toLowerCase().includes(searchQuery.toLowerCase()) && !v.city.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }), [vendors, categoryFilter, searchQuery]);

  const filteredPOs = useMemo(() => purchaseOrders.filter(po => {
    if (poStatusFilter !== 'all' && po.status !== poStatusFilter) return false;
    return true;
  }), [purchaseOrders, poStatusFilter]);

  const getVendorName = (vid) => vendors.find(v => v.id === vid)?.name || '-';
  const getProjectName = (pid) => projects.find(p => p.id === pid)?.name || '-';
  const ds = dashboard || {};

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6" data-testid="procurement-page">
      <div className="page-header"><div><h1 className="page-title">Procurement</h1><p className="page-subtitle">Vendors, Purchase Orders & Goods Receipt</p></div></div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Vendors" value={ds.vendors?.total || 0} icon={Building2} color="blue" />
        <KpiCard label="Total POs" value={ds.purchase_orders?.total || 0} icon={ShoppingCart} color="purple" />
        <KpiCard label="PO Value" value={formatCurrency(ds.purchase_orders?.total_value || 0)} icon={IndianRupee} color="emerald" />
        <KpiCard label="Pending POs" value={ds.purchase_orders?.pending || 0} icon={Clock} color="amber" />
        <KpiCard label="GRNs" value={ds.grns?.total || 0} icon={Package} color="cyan" />
        <KpiCard label="Top Vendor" value={ds.top_vendor?.name || '-'} icon={Star} color="slate" small />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="vendors" className="space-y-4">
        <TabsList className="rounded-sm">
          <TabsTrigger value="vendors" className="rounded-sm gap-1.5" data-testid="vendors-tab"><Building2 className="w-4 h-4" />Vendors ({vendors.length})</TabsTrigger>
          <TabsTrigger value="purchase-orders" className="rounded-sm gap-1.5" data-testid="po-tab"><ShoppingCart className="w-4 h-4" />POs ({purchaseOrders.length})</TabsTrigger>
          <TabsTrigger value="grn" className="rounded-sm gap-1.5" data-testid="grn-tab"><Package className="w-4 h-4" />GRN ({grns.length})</TabsTrigger>
        </TabsList>

        {/* ===== VENDORS ===== */}
        <TabsContent value="vendors" className="space-y-4">
          {vendorDetail ? (
            <VendorDetailView detail={vendorDetail} onBack={() => setVendorDetail(null)} onEdit={editVendor} onRate={rateVendor} onDeactivate={deactivateVendor} onViewPO={viewPODetail} canEdit={hasPermission('procurement', 'edit')} />
          ) : (
            <>
              <div className="flex flex-wrap gap-3 justify-between">
                <div className="flex gap-2 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search vendors..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 rounded-sm" data-testid="vendor-search" />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40 rounded-sm text-sm" data-testid="vendor-category-filter"><Filter className="w-4 h-4 mr-1" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {[...new Set(vendors.map(v => v.category).filter(Boolean))].sort().map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {hasPermission('procurement', 'edit') && (
                  <Button className="action-btn action-btn-accent" onClick={() => { setSelectedVendor(null); resetVendorForm(); setIsVendorDialogOpen(true); }} data-testid="create-vendor-btn"><Plus className="w-4 h-4" />Add Vendor</Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredVendors.length === 0 ? (
                  <Card className="col-span-full rounded-sm"><CardContent className="text-center py-12 text-muted-foreground"><Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No vendors found</p></CardContent></Card>
                ) : filteredVendors.map(v => (
                  <Card key={v.id} className="rounded-sm card-hover cursor-pointer group" onClick={() => viewVendorDetail(v.id)} data-testid={`vendor-card-${v.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div><p className="font-semibold">{v.name}</p><Badge variant="outline" className="text-[10px] rounded-sm capitalize mt-1">{v.category}</Badge></div>
                        {v.rating > 0 && <div className="flex items-center gap-0.5 text-amber-500"><Star className="w-3.5 h-3.5 fill-current" /><span className="text-sm font-bold">{v.rating}</span></div>}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{v.city}, {v.state}</div>
                        <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{v.phone}</div>
                      </div>
                      {v.gstin && <p className="mt-2 pt-2 border-t text-xs font-mono text-muted-foreground">{v.gstin}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* ===== PURCHASE ORDERS ===== */}
        <TabsContent value="purchase-orders" className="space-y-4">
          {poDetail ? (
            <PODetailView
              detail={poDetail}
              vendors={vendors}
              projects={projects}
              onBack={() => setPoDetail(null)}
              onStatusChange={handlePOStatus}
              onDelete={(id) => { setPoToDelete(id); setDeletePODialogOpen(true); }}
              onCreateGRN={openGrnDialog}
              onPrint={() => printPO(poDetail)}
              canEdit={hasPermission('procurement', 'edit')}
              statusLoading={poStatusLoading}
            />
          ) : (
            <>
              <div className="flex justify-between items-center">
                <Select value={poStatusFilter} onValueChange={setPoStatusFilter}>
                  <SelectTrigger className="w-40 rounded-sm text-sm" data-testid="po-status-filter"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.entries(poStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                {hasPermission('procurement', 'edit') && <Button className="action-btn action-btn-accent" onClick={() => setIsPODialogOpen(true)} data-testid="create-po-btn"><Plus className="w-4 h-4" />New PO</Button>}
              </div>
              <Card className="rounded-sm">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>PO Number</TableHead><TableHead>Date</TableHead><TableHead>Vendor</TableHead><TableHead>Project</TableHead>
                    <TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredPOs.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No purchase orders</TableCell></TableRow>
                    ) : filteredPOs.map(po => (
                      <TableRow key={po.id} data-testid={`po-row-${po.id}`}>
                        <TableCell className="font-mono text-sm font-medium">{po.po_number}</TableCell>
                        <TableCell className="text-sm">{formatDate(po.po_date)}</TableCell>
                        <TableCell className="text-sm">{getVendorName(po.vendor_id)}</TableCell>
                        <TableCell className="text-sm max-w-[120px] truncate">{getProjectName(po.project_id)}</TableCell>
                        <TableCell className="text-right font-semibold text-sm">{formatCurrency(po.total)}</TableCell>
                        <TableCell><Badge className={`${poStatusColors[po.status]} text-xs rounded-sm`}>{poStatusLabels[po.status] || po.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => viewPODetail(po.id)} data-testid={`view-po-${po.id}`}><Eye className="w-3.5 h-3.5" /></Button>
                            {hasPermission('procurement', 'edit') && po.status === 'pending' && (
                              <>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600" onClick={() => handlePOStatus(po.id, 'approved')} disabled={poStatusLoading === po.id} data-testid={`approve-po-${po.id}`}>
                                  {poStatusLoading === po.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-600" onClick={() => handlePOStatus(po.id, 'rejected')} disabled={poStatusLoading === po.id} data-testid={`reject-po-${po.id}`}>
                                  {poStatusLoading === po.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reject'}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ===== GRN ===== */}
        <TabsContent value="grn" className="space-y-4">
          {grnDetail ? (
            <GRNDetailView detail={grnDetail} onBack={() => setGrnDetail(null)} onPrint={() => printGRN(grnDetail)} />
          ) : (
            <>
              <div className="text-sm text-muted-foreground">{grns.length} goods receipt notes — click a row to view details</div>
              <Card className="rounded-sm">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>GRN No.</TableHead><TableHead>Date</TableHead><TableHead>PO</TableHead><TableHead>Items</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {grns.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground"><Package className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No GRNs yet</p></TableCell></TableRow>
                    ) : grns.map(g => {
                      const po = purchaseOrders.find(p => p.id === g.po_id);
                      return (
                        <TableRow key={g.id} data-testid={`grn-row-${g.id}`} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30" onClick={() => viewGrnDetail(g.id)}>
                          <TableCell className="font-mono text-sm font-medium">{g.grn_number}</TableCell>
                          <TableCell className="text-sm">{formatDate(g.grn_date)}</TableCell>
                          <TableCell className="text-sm font-mono">{po?.po_number || g.po_id.slice(0, 8)}</TableCell>
                          <TableCell className="text-sm">{(g.items || []).length} items</TableCell>
                          <TableCell><Badge className="bg-emerald-100 text-emerald-700 text-xs rounded-sm">{g.status}</Badge></TableCell>
                          <TableCell className="text-sm max-w-[160px] truncate">{g.notes || '-'}</TableCell>
                          <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => viewGrnDetail(g.id)}><Eye className="w-3.5 h-3.5" /></Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Vendor Dialog */}
      <Dialog open={isVendorDialogOpen} onOpenChange={(v) => { setIsVendorDialogOpen(v); if (!v) setSelectedVendor(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl font-bold uppercase">{selectedVendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle></DialogHeader>
          <form onSubmit={handleVendorSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">Vendor Name *</Label><Input value={vendorForm.name} onChange={e => setVendorForm(f => ({ ...f, name: e.target.value }))} required className="rounded-sm" data-testid="vendor-name-input" /></div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category *</Label>
                <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="w-full rounded-sm justify-between font-normal capitalize h-9 px-3 text-sm">
                      {vendorForm.category || 'Select category...'}
                      <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                    <div className="max-h-48 overflow-y-auto">
                      {categoryOptions.map(c => (
                        <div key={c} className="flex items-center gap-1 px-2 py-1 group hover:bg-accent">
                          {editingCategory === c ? (
                            <>
                              <Input
                                autoFocus
                                value={editingCategoryValue}
                                onChange={e => setEditingCategoryValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = editingCategoryValue.trim().toLowerCase();
                                    if (!val) return;
                                    setCategoryOptions(prev => prev.map(x => x === c ? val : x));
                                    if (vendorForm.category === c) setVendorForm(f => ({ ...f, category: val }));
                                    setEditingCategory(null);
                                  }
                                  if (e.key === 'Escape') setEditingCategory(null);
                                }}
                                className="h-6 text-sm rounded-sm flex-1 px-1"
                                onClick={e => e.stopPropagation()}
                              />
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); const val = editingCategoryValue.trim().toLowerCase(); if (!val) return; setCategoryOptions(prev => prev.map(x => x === c ? val : x)); if (vendorForm.category === c) setVendorForm(f => ({ ...f, category: val })); setEditingCategory(null); }}
                                className="p-1 text-emerald-600 hover:text-emerald-700 shrink-0"
                              ><Check className="w-3.5 h-3.5" /></button>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); setEditingCategory(null); }}
                                className="p-1 text-muted-foreground hover:text-foreground shrink-0"
                              ><XCircle className="w-3.5 h-3.5" /></button>
                            </>
                          ) : (
                            <>
                              <div
                                onClick={() => { setVendorForm(f => ({ ...f, category: c })); setCategoryPopoverOpen(false); setEditingCategory(null); }}
                                className="flex items-center gap-2 flex-1 cursor-pointer py-1 text-sm capitalize"
                              >
                                <Check className={`w-4 h-4 shrink-0 ${vendorForm.category === c ? 'opacity-100' : 'opacity-0'}`} />
                                {c}
                              </div>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); setEditingCategory(c); setEditingCategoryValue(c); }}
                                className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 shrink-0"
                              ><Edit3 className="w-3.5 h-3.5" /></button>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); setCategoryOptions(prev => prev.filter(x => x !== c)); if (vendorForm.category === c) setVendorForm(f => ({ ...f, category: '' })); }}
                                className="p-1 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                              ><Trash2 className="w-3.5 h-3.5" /></button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="border-t p-2 flex gap-2">
                      <Input
                        value={newCategoryInput}
                        onChange={e => setNewCategoryInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = newCategoryInput.trim().toLowerCase();
                            if (!val) return;
                            if (!categoryOptions.includes(val)) setCategoryOptions(prev => [...prev, val]);
                            setVendorForm(f => ({ ...f, category: val }));
                            setNewCategoryInput('');
                            setCategoryPopoverOpen(false);
                          }
                        }}
                        placeholder="Add new category..."
                        className="rounded-sm h-8 text-sm"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="action-btn-accent rounded-sm h-8 shrink-0"
                        onClick={() => {
                          const val = newCategoryInput.trim().toLowerCase();
                          if (!val) return;
                          if (!categoryOptions.includes(val)) setCategoryOptions(prev => [...prev, val]);
                          setVendorForm(f => ({ ...f, category: val }));
                          setNewCategoryInput('');
                          setCategoryPopoverOpen(false);
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">GSTIN</Label><Input value={vendorForm.gstin} onChange={e => setVendorForm(f => ({ ...f, gstin: e.target.value }))} className="rounded-sm font-mono" data-testid="vendor-gstin-input" /></div>
              <div className="space-y-1.5"><Label className="text-xs">PAN</Label><Input value={vendorForm.pan} onChange={e => setVendorForm(f => ({ ...f, pan: e.target.value }))} className="rounded-sm font-mono" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Address *</Label><Input value={vendorForm.address} onChange={e => setVendorForm(f => ({ ...f, address: e.target.value }))} required className="rounded-sm" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">City *</Label><Input value={vendorForm.city} onChange={e => setVendorForm(f => ({ ...f, city: e.target.value }))} required className="rounded-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">State</Label><Input value={vendorForm.state} onChange={e => setVendorForm(f => ({ ...f, state: e.target.value }))} className="rounded-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Pincode *</Label><Input value={vendorForm.pincode} onChange={e => setVendorForm(f => ({ ...f, pincode: e.target.value }))} required className="rounded-sm" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Contact Person *</Label><Input value={vendorForm.contact_person} onChange={e => setVendorForm(f => ({ ...f, contact_person: e.target.value }))} required className="rounded-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Phone *</Label><Input value={vendorForm.phone} onChange={e => setVendorForm(f => ({ ...f, phone: e.target.value }))} required className="rounded-sm" data-testid="vendor-phone-input" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Email *</Label><Input type="email" value={vendorForm.email} onChange={e => setVendorForm(f => ({ ...f, email: e.target.value }))} required className="rounded-sm" data-testid="vendor-email-input" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setIsVendorDialogOpen(false)} className="rounded-sm">Cancel</Button><Button type="submit" className="action-btn-accent rounded-sm" disabled={formLoading} data-testid="submit-vendor-btn">{formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : selectedVendor ? 'Update' : 'Add Vendor'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* PO Dialog */}
      <Dialog open={isPODialogOpen} onOpenChange={setIsPODialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl font-bold uppercase">Create Purchase Order</DialogTitle></DialogHeader>
          <form onSubmit={handlePOSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">Project *</Label><Select value={poForm.project_id} onValueChange={v => setPoForm(f => ({ ...f, project_id: v }))}><SelectTrigger className="rounded-sm" data-testid="po-project-select"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Vendor *</Label><Select value={poForm.vendor_id} onValueChange={v => setPoForm(f => ({ ...f, vendor_id: v }))}><SelectTrigger className="rounded-sm" data-testid="po-vendor-select"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">PO Date *</Label><Input type="date" value={poForm.po_date} onChange={e => setPoForm(f => ({ ...f, po_date: e.target.value }))} required className="rounded-sm" data-testid="po-date-input" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Delivery Date *</Label><Input type="date" value={poForm.delivery_date} onChange={e => setPoForm(f => ({ ...f, delivery_date: e.target.value }))} required className="rounded-sm" /></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label className="text-xs">Items</Label><Button type="button" variant="outline" size="sm" onClick={addPOItem} className="rounded-sm text-xs"><Plus className="w-3 h-3 mr-1" />Add Item</Button></div>
              {poForm.items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <Select
                      value={item.description}
                      onValueChange={val => selectPOInventoryItem(i, val)}
                      disabled={!poForm.project_id}
                      required
                    >
                      <SelectTrigger className="rounded-sm text-sm h-9" data-testid={`po-item-desc-${i}`}>
                        <SelectValue placeholder={poForm.project_id ? (projectInventory.length ? 'Select item…' : 'No items — add in Inventory first') : 'Select project first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {projectInventory.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-muted-foreground">No inventory items for this project</div>
                        ) : projectInventory.map(inv => (
                          <SelectItem key={inv.id} value={inv.item_name}>
                            <span>{inv.item_name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{inv.unit} · {inv.category}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 h-9 flex items-center justify-center text-xs font-medium text-muted-foreground bg-slate-100 dark:bg-slate-800 rounded-sm px-1 truncate">
                    {item.unit || '—'}
                  </div>
                  <Input className="col-span-2 rounded-sm text-sm" type="number" min="0" placeholder="Qty *" value={item.quantity} onChange={e => updatePOItem(i, 'quantity', e.target.value)} required />
                  <Input className="col-span-2 rounded-sm text-sm" type="number" min="0" placeholder="Rate" value={item.rate} onChange={e => updatePOItem(i, 'rate', e.target.value)} />
                  <div className="col-span-2 relative">
                    <Input className="rounded-sm text-sm pr-6" type="number" min="0" max="100" step="0.01" placeholder="GST%" value={item.gst_rate} onChange={e => updatePOItem(i, 'gst_rate', e.target.value)} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removePOItem(i)} disabled={poForm.items.length === 1} className="col-span-1 text-red-400 h-9"><XCircle className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
            {poForm.items[0]?.quantity && (() => {
              const subtotal = poForm.items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.rate) || 0), 0);
              const gst = poForm.items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.rate) || 0) * ((i.gst_rate !== undefined && i.gst_rate !== null ? parseFloat(i.gst_rate) : 18) / 100), 0);
              return (
                <div className="text-right text-sm space-y-0.5">
                  <div><span className="text-muted-foreground">Subtotal: </span><span className="font-mono font-semibold">{formatCurrency(subtotal)}</span></div>
                  <div><span className="text-muted-foreground">GST: </span><span className="font-mono">{formatCurrency(gst)}</span></div>
                  <div className="font-bold text-base"><span className="text-muted-foreground">Total: </span><span className="font-mono">{formatCurrency(subtotal + gst)}</span></div>
                </div>
              );
            })()}
            <div className="space-y-1.5"><Label className="text-xs">Terms & Conditions</Label><Textarea value={poForm.terms} onChange={e => setPoForm(f => ({ ...f, terms: e.target.value }))} placeholder="Payment terms, delivery conditions..." className="rounded-sm text-sm" rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setIsPODialogOpen(false)} className="rounded-sm">Cancel</Button><Button type="submit" className="action-btn-accent rounded-sm" disabled={formLoading} data-testid="submit-po-btn">{formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create PO'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* GRN Dialog */}
      <Dialog open={isGrnDialogOpen} onOpenChange={setIsGrnDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-lg font-bold uppercase">Create GRN</DialogTitle></DialogHeader>
          <form onSubmit={handleGrnSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5"><Label className="text-xs">GRN Date *</Label><Input type="date" value={grnForm.grn_date} onChange={e => setGrnForm(f => ({ ...f, grn_date: e.target.value }))} required className="rounded-sm" data-testid="grn-date-input" /></div>
            <div className="space-y-2">
              <Label className="text-xs">Received Quantities</Label>
              {grnForm.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-muted/30 rounded-sm">
                  <div className="flex-1"><p className="text-sm font-medium">{item.description}</p><p className="text-xs text-muted-foreground">Ordered: {item.ordered}</p></div>
                  <Input type="number" placeholder="Qty" value={item.received_quantity} onChange={e => { const items = [...grnForm.items]; items[i] = { ...items[i], received_quantity: e.target.value }; setGrnForm(f => ({ ...f, items })); }} className="w-24 rounded-sm text-sm" data-testid={`grn-qty-${i}`} />
                </div>
              ))}
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Input value={grnForm.notes} onChange={e => setGrnForm(f => ({ ...f, notes: e.target.value }))} placeholder="Delivery notes..." className="rounded-sm text-sm" data-testid="grn-notes-input" /></div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setIsGrnDialogOpen(false)} className="rounded-sm">Cancel</Button><Button type="submit" className="action-btn-accent rounded-sm" disabled={formLoading} data-testid="submit-grn-btn">{formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create GRN'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={deletePODialogOpen}
        onOpenChange={setDeletePODialogOpen}
        onConfirm={deletePO}
        isDeleting={isDeletingPO}
        title="Delete Purchase Order?"
        description="This will permanently delete this purchase order. This action cannot be undone."
      />
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, small }) {
  return (
    <Card className="kpi-card"><CardContent className="p-3 flex items-center gap-2.5">
      <div className={`p-1.5 rounded-sm bg-${color}-100`}><Icon className={`w-4 h-4 text-${color}-600`} /></div>
      <div><p className="text-[10px] text-muted-foreground uppercase leading-tight">{label}</p><p className={`${small ? 'text-sm' : 'text-base'} font-bold leading-tight truncate max-w-[100px]`}>{value}</p></div>
    </CardContent></Card>
  );
}

function VendorDetailView({ detail, onBack, onEdit, onRate, onDeactivate, onViewPO, canEdit }) {
  const { vendor, purchase_orders: pos, stats } = detail;
  const [rating, setRating] = useState(vendor.rating || 0);
  return (
    <div className="space-y-4" data-testid="vendor-detail-view">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1" data-testid="back-to-vendors-btn"><ArrowLeft className="w-4 h-4" />Back</Button>
        {canEdit && <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-sm gap-1" onClick={() => onEdit(vendor)} data-testid="edit-vendor-btn"><Edit3 className="w-4 h-4" />Edit</Button>
          <Button variant="outline" size="sm" className="rounded-sm gap-1 text-red-500" onClick={() => onDeactivate(vendor.id)} data-testid="deactivate-vendor-btn"><XCircle className="w-4 h-4" />Deactivate</Button>
        </div>}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-sm lg:col-span-2">
          <CardHeader className="pb-3"><div className="flex items-start justify-between"><div><CardTitle className="text-lg">{vendor.name}</CardTitle><CardDescription><Badge variant="outline" className="capitalize rounded-sm">{vendor.category}</Badge></CardDescription></div>
            {canEdit && <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map(s => <button key={s} onClick={() => { setRating(s); onRate(vendor.id, s); }} data-testid={`star-${s}`}><Star className={`w-5 h-5 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} /></button>)}</div>}
          </div></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[['Contact', vendor.contact_person], ['Phone', vendor.phone], ['Email', vendor.email], ['Address', `${vendor.address}, ${vendor.city}, ${vendor.state} - ${vendor.pincode}`], ['GSTIN', vendor.gstin || '-'], ['PAN', vendor.pan || '-']].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b pb-2 last:border-0"><span className="text-muted-foreground">{k}</span><span className="font-medium text-right max-w-[60%]">{v}</span></div>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-3">
          <Card className="rounded-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Total POs</p><p className="text-2xl font-bold">{stats.total_pos}</p></CardContent></Card>
          <Card className="rounded-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Total PO Value</p><p className="text-2xl font-bold">{formatCurrency(stats.total_po_value)}</p></CardContent></Card>
          <Card className="rounded-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">GRNs Received</p><p className="text-2xl font-bold">{stats.total_grns}</p></CardContent></Card>
        </div>
      </div>
      {pos.length > 0 && (
        <Card className="rounded-sm"><CardHeader className="pb-2"><CardTitle className="text-base">Purchase Order History</CardTitle></CardHeader>
          <Table><TableHeader><TableRow><TableHead>PO No.</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead className="text-right">View</TableHead></TableRow></TableHeader>
            <TableBody>{pos.map(po => (
              <TableRow key={po.id}><TableCell className="font-mono text-sm">{po.po_number}</TableCell><TableCell className="text-sm">{formatDate(po.po_date)}</TableCell><TableCell className="text-right text-sm font-semibold">{formatCurrency(po.total)}</TableCell><TableCell><Badge className={`${poStatusColors[po.status]} text-xs rounded-sm`}>{poStatusLabels[po.status]}</Badge></TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onViewPO(po.id)}><Eye className="w-3.5 h-3.5" /></Button></TableCell></TableRow>
            ))}</TableBody></Table></Card>
      )}
    </div>
  );
}

function PODetailView({ detail, vendors, projects, onBack, onStatusChange, onDelete, onCreateGRN, onPrint, canEdit, statusLoading }) {
  const { po, vendor, project, grns: poGrns, matching } = detail;
  const isUpdating = statusLoading === po.id;
  return (
    <div className="space-y-4" data-testid="po-detail-view">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1" data-testid="back-to-pos-btn"><ArrowLeft className="w-4 h-4" />Back</Button>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="rounded-sm gap-1" onClick={onPrint}><Download className="w-4 h-4" />Download PDF</Button>
          {canEdit && <>
            {po.status === 'approved' && (
              <>
                <Button size="sm" variant="outline" className="rounded-sm gap-1" onClick={() => onCreateGRN(po)} data-testid="create-grn-btn"><Package className="w-4 h-4" />Create GRN</Button>
                <Button size="sm" className="action-btn-accent rounded-sm" onClick={() => onStatusChange(po.id, 'closed')} disabled={isUpdating} data-testid="close-po-btn">
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Close PO
                </Button>
              </>
            )}
            {po.status !== 'closed' && <Button size="sm" variant="outline" className="rounded-sm text-red-500" onClick={() => onDelete(po.id)} data-testid="delete-po-btn"><Trash2 className="w-4 h-4" /></Button>}
          </>}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-sm lg:col-span-2">
          <CardHeader className="pb-3"><div className="flex items-center justify-between"><div><CardTitle className="text-lg font-mono">{po.po_number}</CardTitle><CardDescription>{formatDate(po.po_date)} | Delivery: {formatDate(po.delivery_date)}</CardDescription></div><Badge className={`${poStatusColors[po.status]} rounded-sm text-sm`}>{poStatusLabels[po.status]}</Badge></div></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Vendor</p><p className="font-medium">{vendor?.name}</p><p className="text-xs text-muted-foreground font-mono">{vendor?.gstin}</p></div>
              <div><p className="text-xs text-muted-foreground">Project</p><p className="font-medium">{project?.name}</p></div>
            </div>
            <Table><TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Unit</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>{(po.items || []).map((item, i) => (
                <TableRow key={i}><TableCell className="text-sm">{item.description}</TableCell><TableCell className="text-sm">{item.unit}</TableCell><TableCell className="text-right text-sm">{item.quantity}</TableCell><TableCell className="text-right text-sm">{formatCurrency(item.rate)}</TableCell><TableCell className="text-right text-sm font-semibold">{formatCurrency(item.quantity * item.rate)}</TableCell></TableRow>
              ))}</TableBody></Table>
            <div className="flex justify-end"><div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{formatCurrency(po.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">GST {po.subtotal > 0 ? `(${+(po.gst_amount / po.subtotal * 100).toFixed(2)}%)` : ''}</span><span className="font-mono">{formatCurrency(po.gst_amount)}</span></div>
              <div className="flex justify-between font-bold border-t pt-1 text-base"><span>Total</span><span className="font-mono">{formatCurrency(po.total)}</span></div>
            </div></div>
            {po.terms && <div className="text-sm"><p className="text-xs text-muted-foreground uppercase mb-1">Terms</p><p>{po.terms}</p></div>}
          </CardContent>
        </Card>

        {/* 3-Way Matching */}
        <div className="space-y-3">
          <Card className="rounded-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm uppercase">(PO ↔ GRN)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {matching.map((m, i) => {
                const pct = m.ordered > 0 ? (m.received / m.ordered * 100) : 0;
                return (
                  <div key={i} className="space-y-1" data-testid={`match-item-${i}`}>
                    <div className="flex justify-between text-xs"><span className="font-medium truncate max-w-[140px]">{m.description}</span><Badge className={`text-[10px] rounded-sm ${m.status === 'complete' ? 'bg-emerald-100 text-emerald-700' : m.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>{m.status}</Badge></div>
                    <Progress value={Math.min(pct, 100)} className="h-1.5" />
                    <div className="flex justify-between text-[10px] text-muted-foreground"><span>Received: {m.received}/{m.ordered}</span><span>Pending: {m.pending}</span></div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          {poGrns.length > 0 && (
            <Card className="rounded-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm uppercase">GRN History</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {poGrns.map(g => (
                  <div key={g.id} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded-sm">
                    <div><p className="font-mono text-xs font-medium">{g.grn_number}</p><p className="text-xs text-muted-foreground">{formatDate(g.grn_date)}</p></div>
                    <Badge variant="outline" className="text-xs rounded-sm">{(g.items || []).length} items</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── GRN Detail View ───────────────────────────────────────
function GRNDetailView({ detail, onBack, onPrint }) {
  const { grn, po, vendor, project } = detail;
  return (
    <div className="space-y-4" data-testid="grn-detail-view">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1"><ArrowLeft className="w-4 h-4" />Back</Button>
        <Button size="sm" variant="outline" className="rounded-sm gap-1" onClick={onPrint}>
          <Download className="w-4 h-4" />Download PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main card */}
        <Card className="rounded-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-mono">{grn.grn_number}</CardTitle>
                <CardDescription>GRN Date: {formatDate(grn.grn_date)}</CardDescription>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 rounded-sm text-sm capitalize">{grn.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(grn.items || []).map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell className="text-sm">{item.unit}</TableCell>
                    <TableCell className="text-right text-sm">{item.ordered_quantity}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700">{item.received_quantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.remarks || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {grn.notes && (
              <div className="text-sm border-t pt-3">
                <p className="text-xs text-muted-foreground uppercase mb-1">Notes</p>
                <p>{grn.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right info card */}
        <div className="space-y-3">
          <Card className="rounded-sm">
            <CardContent className="p-4 space-y-3 text-sm">
              {[
                ['PO Reference', po?.po_number || '-'],
                ['Vendor', vendor?.name || '-'],
                ['Phone', vendor?.phone || '-'],
                ['Project', project?.name || '-'],
                ['Items Received', `${(grn.items || []).length} line item(s)`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b pb-2 last:border-0">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-right max-w-[55%] truncate">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Print / PDF helpers ───────────────────────────────────
function openPrintWindow(html) {
  const existing = document.getElementById('__print_frame__');
  if (existing) existing.remove();
  const iframe = document.createElement('iframe');
  iframe.id = '__print_frame__';
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
  document.body.appendChild(iframe);
  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 1000);
  }, 400);
}

// "2026-02-17" → "17/02/2026"
const fmtDate = d => {
  if (!d) return '-';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const BASE_STYLE = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:12px;color:#333;padding:24px}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #f59e0b;padding-bottom:12px;margin-bottom:20px}
  .co{font-size:18px;font-weight:bold;color:#1e293b}.sub{font-size:10px;color:#64748b;margin-top:2px}
  .dt h2{font-size:20px;font-weight:bold;color:#f59e0b;text-align:right}
  .dt .ref{font-family:monospace;font-size:13px;color:#475569;text-align:right}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px}
  .box{padding:9px;border:1px solid #e2e8f0;border-radius:4px}
  .box label{font-size:9px;text-transform:uppercase;color:#94a3b8;display:block;margin-bottom:3px}
  .box p{font-size:12px;font-weight:500}.box .mono{font-family:monospace;font-size:10px;color:#64748b}
  table{width:100%;border-collapse:collapse;margin-bottom:14px}
  thead tr{background:#f8fafc}
  th{text-align:left;padding:7px 8px;border:1px solid #e2e8f0;font-size:10px;text-transform:uppercase;color:#64748b}
  td{padding:6px 8px;border:1px solid #e2e8f0;font-size:12px}
  .r{text-align:right;font-family:monospace}
  .tot{width:260px;margin-left:auto}
  .tot td{border:none;padding:3px 8px}
  .grand td{font-weight:bold;font-size:14px;border-top:2px solid #333;padding-top:6px}
  .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600}
  .ba{background:#fef3c7;color:#92400e}.bb{background:#dbeafe;color:#1e40af}.bc{background:#d1fae5;color:#065f46}
  .ftr{margin-top:36px;border-top:1px solid #e2e8f0;padding-top:10px;font-size:10px;color:#94a3b8;text-align:center}
  @media print{body{padding:10px}}
`;

function printPO(detail) {
  const { po, vendor, project } = detail;
  const fmt = n => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const badgeCls = po.status === 'approved' ? 'bb' : po.status === 'closed' ? 'bc' : 'ba';
  const rows = (po.items || []).map((item, i) => `
    <tr>
      <td>${i + 1}</td><td>${item.description}</td><td>${item.unit}</td>
      <td class="r">${item.quantity}</td>
      <td class="r">₹${fmt(item.rate)}</td>
      <td class="r">₹${fmt(item.quantity * item.rate)}</td>
    </tr>`).join('');

  openPrintWindow(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${po.po_number}</title><style>${BASE_STYLE}</style></head><body>
    <div class="hdr">
      <div><div class="co">CIVIL ERP</div><div class="sub">Construction Management System</div></div>
      <div class="dt"><h2>PURCHASE ORDER</h2><div class="ref">${po.po_number}</div>
        <div style="text-align:right;margin-top:4px"><span class="badge ${badgeCls}">${(po.status || '').toUpperCase()}</span></div></div>
    </div>
    <div class="grid2">
      <div class="box"><label>Vendor</label><p>${vendor?.name || '-'}</p>${vendor?.gstin ? `<p class="mono">GSTIN: ${vendor.gstin}</p>` : ''}</div>
      <div class="box"><label>Project</label><p>${project?.name || '-'}</p>${project?.code ? `<p class="mono">${project.code}</p>` : ''}</div>
      <div class="box"><label>PO Date</label><p>${fmtDate(po.po_date)}</p></div>
      <div class="box"><label>Delivery Date</label><p>${fmtDate(po.delivery_date)}</p></div>
    </div>
    <table><thead><tr><th>#</th><th>Description</th><th>Unit</th><th class="r">Qty</th><th class="r">Rate (₹)</th><th class="r">Amount (₹)</th></tr></thead>
      <tbody>${rows}</tbody></table>
    <table class="tot">
      <tr><td>Subtotal</td><td class="r">₹${fmt(po.subtotal)}</td></tr>
      <tr><td>GST ${po.subtotal > 0 ? `(${+(po.gst_amount / po.subtotal * 100).toFixed(2)}%)` : ''}</td><td class="r">₹${fmt(po.gst_amount)}</td></tr>
      <tr class="grand"><td>Total</td><td class="r">₹${fmt(po.total)}</td></tr>
    </table>
    ${po.terms ? `<div style="margin-top:16px;padding:10px;border:1px solid #e2e8f0;border-radius:4px"><label style="font-size:9px;text-transform:uppercase;color:#94a3b8">Terms &amp; Conditions</label><p style="margin-top:4px">${po.terms}</p></div>` : ''}
    <div class="ftr">Generated from Civil ERP &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN')}</div>
  </body></html>`);
}

function printGRN(detail) {
  const { grn, po, vendor, project } = detail;
  const rows = (grn.items || []).map((item, i) => `
    <tr>
      <td>${i + 1}</td><td>${item.description}</td><td>${item.unit}</td>
      <td class="r">${item.ordered_quantity}</td>
      <td class="r" style="color:#059669;font-weight:600">${item.received_quantity}</td>
      <td>${item.remarks || '&#8212;'}</td>
    </tr>`).join('');

  openPrintWindow(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${grn.grn_number}</title><style>${BASE_STYLE}</style></head><body>
    <div class="hdr">
      <div><div class="co">CIVIL ERP</div><div class="sub">Construction Management System</div></div>
      <div class="dt"><h2>GOODS RECEIPT NOTE</h2><div class="ref">${grn.grn_number}</div>
        <div style="text-align:right;margin-top:4px"><span class="badge bc">RECEIVED</span></div></div>
    </div>
    <div class="grid2">
      <div class="box"><label>PO Reference</label><p>${po?.po_number || '-'}</p></div>
      <div class="box"><label>GRN Date</label><p>${fmtDate(grn.grn_date)}</p></div>
      <div class="box"><label>Vendor</label><p>${vendor?.name || '-'}</p>${vendor?.phone ? `<p class="mono">${vendor.phone}</p>` : ''}</div>
      <div class="box"><label>Project</label><p>${project?.name || '-'}</p></div>
    </div>
    <table><thead><tr><th>#</th><th>Description</th><th>Unit</th><th class="r">Ordered</th><th class="r">Received</th><th>Remarks</th></tr></thead>
      <tbody>${rows}</tbody></table>
    ${grn.notes ? `<div style="margin-top:16px;padding:10px;border:1px solid #e2e8f0;border-radius:4px"><label style="font-size:9px;text-transform:uppercase;color:#94a3b8">Notes</label><p style="margin-top:4px">${grn.notes}</p></div>` : ''}
    <div class="ftr">Generated from Civil ERP &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN')}</div>
  </body></html>`);
}
