import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Building2, Phone, Mail, MapPin, FileText, Truck, Loader2,
  Star, Eye, Edit3, Trash2, ArrowLeft, CheckCircle2, Clock, Package,
  Filter, IndianRupee, BarChart3, XCircle, ArrowUpRight, ShoppingCart
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
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { formatCurrency, formatDate, getStatusColor } from '../lib/utils';

const poStatusFlow = { pending: 'approved', approved: 'delivered', delivered: 'closed' };
const poStatusColors = {
  pending: 'bg-amber-100 text-amber-700', approved: 'bg-blue-100 text-blue-700',
  delivered: 'bg-purple-100 text-purple-700', closed: 'bg-emerald-100 text-emerald-700'
};
const poStatusLabels = { pending: 'Pending', approved: 'Approved', delivered: 'Delivered', closed: 'Closed' };

export default function Procurement() {
  const { api, user } = useAuth();
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

  const [vendorForm, setVendorForm] = useState({ name: '', gstin: '', pan: '', address: '', city: '', state: 'Tamil Nadu', pincode: '', contact_person: '', phone: '', email: '', category: 'material' });
  const [poForm, setPoForm] = useState({ project_id: '', vendor_id: '', po_date: '', delivery_date: '', terms: '', items: [{ description: '', unit: 'MT', quantity: '', rate: '' }] });
  const [grnForm, setGrnForm] = useState({ po_id: '', grn_date: new Date().toISOString().slice(0, 10), items: [], notes: '' });

  const canEdit = ['admin', 'procurement'].includes(user?.role);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [vRes, poRes, grnRes, pRes, dRes] = await Promise.all([
        api.get('/vendors'), api.get('/purchase-orders'), api.get('/grn'),
        api.get('/projects'), api.get('/procurement/dashboard')
      ]);
      setVendors(vRes.data); setPurchaseOrders(poRes.data); setGrns(grnRes.data);
      setProjects(pRes.data); setDashboard(dRes.data);
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
      const items = poForm.items.map(i => ({ ...i, quantity: parseFloat(i.quantity), rate: parseFloat(i.rate) }));
      await api.post('/purchase-orders', { ...poForm, items });
      toast.success('PO created'); setIsPODialogOpen(false);
      setPoForm({ project_id: '', vendor_id: '', po_date: '', delivery_date: '', terms: '', items: [{ description: '', unit: 'MT', quantity: '', rate: '' }] });
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); } finally { setFormLoading(false); }
  };
  const addPOItem = () => setPoForm(f => ({ ...f, items: [...f.items, { description: '', unit: 'MT', quantity: '', rate: '' }] }));
  const updatePOItem = (i, field, val) => { const items = [...poForm.items]; items[i] = { ...items[i], [field]: val }; setPoForm(f => ({ ...f, items })); };
  const removePOItem = (i) => { if (poForm.items.length > 1) setPoForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) })); };
  const handlePOStatus = async (poId, status) => { try { await api.patch(`/purchase-orders/${poId}/status`, { status }); toast.success(`PO ${status}`); fetchData(); if (poDetail) viewPODetail(poId); } catch { toast.error('Failed'); } };
  const viewPODetail = async (poId) => { try { const res = await api.get(`/purchase-orders/${poId}`); setPoDetail(res.data); } catch { toast.error('Failed'); } };
  const deletePO = async (poId) => { try { await api.delete(`/purchase-orders/${poId}`); toast.success('PO deleted'); setPoDetail(null); fetchData(); } catch { toast.error('Failed'); } };

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
            <VendorDetailView detail={vendorDetail} onBack={() => setVendorDetail(null)} onEdit={editVendor} onRate={rateVendor} onDeactivate={deactivateVendor} onViewPO={viewPODetail} canEdit={canEdit} />
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
                      {['material', 'labor', 'equipment', 'subcontractor'].map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {canEdit && (
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
            <PODetailView detail={poDetail} vendors={vendors} projects={projects} onBack={() => setPoDetail(null)} onStatusChange={handlePOStatus} onDelete={deletePO} onCreateGRN={openGrnDialog} canEdit={canEdit} />
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
                {canEdit && <Button className="action-btn action-btn-accent" onClick={() => setIsPODialogOpen(true)} data-testid="create-po-btn"><Plus className="w-4 h-4" />New PO</Button>}
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
                            {canEdit && poStatusFlow[po.status] && (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600" onClick={() => handlePOStatus(po.id, poStatusFlow[po.status])} data-testid={`advance-po-${po.id}`}>
                                {po.status === 'pending' ? 'Approve' : po.status === 'approved' ? 'Deliver' : 'Close'}
                              </Button>
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
          <div className="text-sm text-muted-foreground mb-2">{grns.length} goods receipt notes</div>
          <Card className="rounded-sm">
            <Table>
              <TableHeader><TableRow>
                <TableHead>GRN No.</TableHead><TableHead>Date</TableHead><TableHead>PO</TableHead><TableHead>Items</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {grns.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground"><Package className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No GRNs yet</p></TableCell></TableRow>
                ) : grns.map(g => {
                  const po = purchaseOrders.find(p => p.id === g.po_id);
                  return (
                    <TableRow key={g.id} data-testid={`grn-row-${g.id}`}>
                      <TableCell className="font-mono text-sm font-medium">{g.grn_number}</TableCell>
                      <TableCell className="text-sm">{formatDate(g.grn_date)}</TableCell>
                      <TableCell className="text-sm font-mono">{po?.po_number || g.po_id.slice(0, 8)}</TableCell>
                      <TableCell className="text-sm">{(g.items || []).length} items</TableCell>
                      <TableCell><Badge className="bg-emerald-100 text-emerald-700 text-xs rounded-sm">{g.status}</Badge></TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{g.notes || '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Vendor Dialog */}
      <Dialog open={isVendorDialogOpen} onOpenChange={(v) => { setIsVendorDialogOpen(v); if (!v) setSelectedVendor(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl font-bold uppercase">{selectedVendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle></DialogHeader>
          <form onSubmit={handleVendorSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">Vendor Name *</Label><Input value={vendorForm.name} onChange={e => setVendorForm(f => ({...f, name: e.target.value}))} required className="rounded-sm" data-testid="vendor-name-input" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Category *</Label><Select value={vendorForm.category} onValueChange={v => setVendorForm(f => ({...f, category: v}))}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger><SelectContent>{['material','labor','equipment','subcontractor'].map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">GSTIN</Label><Input value={vendorForm.gstin} onChange={e => setVendorForm(f => ({...f, gstin: e.target.value}))} className="rounded-sm font-mono" data-testid="vendor-gstin-input" /></div>
              <div className="space-y-1.5"><Label className="text-xs">PAN</Label><Input value={vendorForm.pan} onChange={e => setVendorForm(f => ({...f, pan: e.target.value}))} className="rounded-sm font-mono" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Address *</Label><Input value={vendorForm.address} onChange={e => setVendorForm(f => ({...f, address: e.target.value}))} required className="rounded-sm" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">City *</Label><Input value={vendorForm.city} onChange={e => setVendorForm(f => ({...f, city: e.target.value}))} required className="rounded-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">State</Label><Input value={vendorForm.state} onChange={e => setVendorForm(f => ({...f, state: e.target.value}))} className="rounded-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Pincode *</Label><Input value={vendorForm.pincode} onChange={e => setVendorForm(f => ({...f, pincode: e.target.value}))} required className="rounded-sm" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Contact Person *</Label><Input value={vendorForm.contact_person} onChange={e => setVendorForm(f => ({...f, contact_person: e.target.value}))} required className="rounded-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Phone *</Label><Input value={vendorForm.phone} onChange={e => setVendorForm(f => ({...f, phone: e.target.value}))} required className="rounded-sm" data-testid="vendor-phone-input" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Email *</Label><Input type="email" value={vendorForm.email} onChange={e => setVendorForm(f => ({...f, email: e.target.value}))} required className="rounded-sm" data-testid="vendor-email-input" /></div>
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
              <div className="space-y-1.5"><Label className="text-xs">Project *</Label><Select value={poForm.project_id} onValueChange={v => setPoForm(f => ({...f, project_id: v}))}><SelectTrigger className="rounded-sm" data-testid="po-project-select"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Vendor *</Label><Select value={poForm.vendor_id} onValueChange={v => setPoForm(f => ({...f, vendor_id: v}))}><SelectTrigger className="rounded-sm" data-testid="po-vendor-select"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">PO Date *</Label><Input type="date" value={poForm.po_date} onChange={e => setPoForm(f => ({...f, po_date: e.target.value}))} required className="rounded-sm" data-testid="po-date-input" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Delivery Date *</Label><Input type="date" value={poForm.delivery_date} onChange={e => setPoForm(f => ({...f, delivery_date: e.target.value}))} required className="rounded-sm" /></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label className="text-xs">Items</Label><Button type="button" variant="outline" size="sm" onClick={addPOItem} className="rounded-sm text-xs"><Plus className="w-3 h-3 mr-1" />Add Item</Button></div>
              {poForm.items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <Input className="col-span-5 rounded-sm text-sm" placeholder="Description *" value={item.description} onChange={e => updatePOItem(i, 'description', e.target.value)} required data-testid={`po-item-desc-${i}`} />
                  <Input className="col-span-2 rounded-sm text-sm" placeholder="Unit" value={item.unit} onChange={e => updatePOItem(i, 'unit', e.target.value)} />
                  <Input className="col-span-2 rounded-sm text-sm" type="number" placeholder="Qty *" value={item.quantity} onChange={e => updatePOItem(i, 'quantity', e.target.value)} required />
                  <Input className="col-span-2 rounded-sm text-sm" type="number" placeholder="Rate *" value={item.rate} onChange={e => updatePOItem(i, 'rate', e.target.value)} required />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removePOItem(i)} disabled={poForm.items.length === 1} className="col-span-1 text-red-400 h-9"><XCircle className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
            {poForm.items[0]?.quantity && poForm.items[0]?.rate && (
              <div className="text-right text-sm"><span className="text-muted-foreground">Subtotal: </span><span className="font-mono font-semibold">{formatCurrency(poForm.items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.rate) || 0), 0))}</span></div>
            )}
            <div className="space-y-1.5"><Label className="text-xs">Terms & Conditions</Label><Textarea value={poForm.terms} onChange={e => setPoForm(f => ({...f, terms: e.target.value}))} placeholder="Payment terms, delivery conditions..." className="rounded-sm text-sm" rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setIsPODialogOpen(false)} className="rounded-sm">Cancel</Button><Button type="submit" className="action-btn-accent rounded-sm" disabled={formLoading} data-testid="submit-po-btn">{formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create PO'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* GRN Dialog */}
      <Dialog open={isGrnDialogOpen} onOpenChange={setIsGrnDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-lg font-bold uppercase">Create GRN</DialogTitle></DialogHeader>
          <form onSubmit={handleGrnSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5"><Label className="text-xs">GRN Date *</Label><Input type="date" value={grnForm.grn_date} onChange={e => setGrnForm(f => ({...f, grn_date: e.target.value}))} required className="rounded-sm" data-testid="grn-date-input" /></div>
            <div className="space-y-2">
              <Label className="text-xs">Received Quantities</Label>
              {grnForm.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-muted/30 rounded-sm">
                  <div className="flex-1"><p className="text-sm font-medium">{item.description}</p><p className="text-xs text-muted-foreground">Ordered: {item.ordered}</p></div>
                  <Input type="number" placeholder="Qty" value={item.received_quantity} onChange={e => { const items = [...grnForm.items]; items[i] = { ...items[i], received_quantity: e.target.value }; setGrnForm(f => ({ ...f, items })); }} className="w-24 rounded-sm text-sm" data-testid={`grn-qty-${i}`} />
                </div>
              ))}
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Input value={grnForm.notes} onChange={e => setGrnForm(f => ({...f, notes: e.target.value}))} placeholder="Delivery notes..." className="rounded-sm text-sm" data-testid="grn-notes-input" /></div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setIsGrnDialogOpen(false)} className="rounded-sm">Cancel</Button><Button type="submit" className="action-btn-accent rounded-sm" disabled={formLoading} data-testid="submit-grn-btn">{formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create GRN'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
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
            {canEdit && <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <button key={s} onClick={() => { setRating(s); onRate(vendor.id, s); }} data-testid={`star-${s}`}><Star className={`w-5 h-5 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} /></button>)}</div>}
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

function PODetailView({ detail, vendors, projects, onBack, onStatusChange, onDelete, onCreateGRN, canEdit }) {
  const { po, vendor, project, grns: poGrns, matching } = detail;
  const nextStatus = poStatusFlow[po.status];
  return (
    <div className="space-y-4" data-testid="po-detail-view">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1" data-testid="back-to-pos-btn"><ArrowLeft className="w-4 h-4" />Back</Button>
        {canEdit && <div className="flex gap-2">
          {nextStatus && <Button size="sm" className="action-btn-accent rounded-sm" onClick={() => onStatusChange(po.id, nextStatus)} data-testid="advance-po-status-btn">{po.status === 'pending' ? 'Approve' : po.status === 'approved' ? 'Mark Delivered' : 'Close PO'}</Button>}
          {['pending', 'approved'].includes(po.status) && <Button size="sm" variant="outline" className="rounded-sm gap-1" onClick={() => onCreateGRN(po)} data-testid="create-grn-btn"><Package className="w-4 h-4" />Create GRN</Button>}
          <Button size="sm" variant="outline" className="rounded-sm text-red-500" onClick={() => onDelete(po.id)} data-testid="delete-po-btn"><Trash2 className="w-4 h-4" /></Button>
        </div>}
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
              <div className="flex justify-between"><span className="text-muted-foreground">GST (18%)</span><span className="font-mono">{formatCurrency(po.gst_amount)}</span></div>
              <div className="flex justify-between font-bold border-t pt-1 text-base"><span>Total</span><span className="font-mono">{formatCurrency(po.total)}</span></div>
            </div></div>
            {po.terms && <div className="text-sm"><p className="text-xs text-muted-foreground uppercase mb-1">Terms</p><p>{po.terms}</p></div>}
          </CardContent>
        </Card>

        {/* 3-Way Matching */}
        <div className="space-y-3">
          <Card className="rounded-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm uppercase">3-Way Matching (PO ↔ GRN)</CardTitle></CardHeader>
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
