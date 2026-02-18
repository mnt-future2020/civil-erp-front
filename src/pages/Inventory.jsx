import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import {
  Package, Plus, Search, Edit2, Trash2, AlertTriangle,
  PackageX, TrendingUp, IndianRupee, RefreshCw, Layers, ArrowRightLeft, Loader2, Wrench
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { DeleteConfirmationDialog } from '../components/DeleteConfirmationDialog';


const DEFAULT_CATEGORIES = ['Steel', 'Cement', 'Aggregates', 'Sand', 'Bricks', 'Tiles', 'Paint', 'Plumbing', 'Electrical', 'Timber', 'Hardware', 'Glass', 'Waterproofing', 'Formwork'];
const EQUIPMENT_CATEGORIES = ['Machine', 'Vehicle', 'Power Tool', 'Hand Tool', 'Safety Equipment', 'Survey Instrument', 'Scaffolding', 'Other'];
const EQUIPMENT_STATUS_CONFIG = {
  available:    { label: 'Available',    className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  in_use:       { label: 'In Use',       className: 'bg-blue-100 text-blue-700 border-blue-200' },
  maintenance:  { label: 'Maintenance',  className: 'bg-amber-100 text-amber-700 border-amber-200' },
  retired:      { label: 'Retired',      className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

function loadCategories() {
  try {
    const saved = localStorage.getItem('inv_categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  } catch { return DEFAULT_CATEGORIES; }
}

function saveCategories(cats) {
  localStorage.setItem('inv_categories', JSON.stringify(cats));
}

function loadEquipmentCategories() {
  try {
    const saved = localStorage.getItem('equip_categories');
    return saved ? JSON.parse(saved) : EQUIPMENT_CATEGORIES;
  } catch { return EQUIPMENT_CATEGORIES; }
}

function saveEquipmentCategories(cats) {
  localStorage.setItem('equip_categories', JSON.stringify(cats));
}

const UNITS = ['MT', 'Kg', 'Bags', 'Nos', 'Sqft', 'Sqm', 'Rft', 'Rmt', 'Ltr', 'Cum', 'Sets', 'Rolls'];

const STATUS_CONFIG = {
  in_stock: { label: 'In Stock', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  low_stock: { label: 'Low Stock', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  out_of_stock: { label: 'Out of Stock', className: 'bg-red-100 text-red-700 border-red-200' },
};

const EMPTY_FORM = {
  item_type: 'material',
  project_id: '', item_name: '', category: 'Cement', unit: 'Bags',
  quantity: '', minimum_quantity: '', unit_price: '', gst_rate: 18,
  hsn_code: '', location: '', notes: '',
  serial_number: '', condition: 'good', purchase_date: '', equipment_status: 'available',
};

export default function Inventory() {
  const { api, hasPermission } = useAuth();

  // Data
  const [projects, setProjects] = useState([]);
  const [items, setItems] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [inventoryCategories, setInventoryCategories] = useState(loadCategories);
  const [newCatInput, setNewCatInput] = useState('');
  const [catToDelete, setCatToDelete] = useState(null);
  const [equipmentCategories, setEquipmentCategories] = useState(loadEquipmentCategories);
  const [newEquipCatInput, setNewEquipCatInput] = useState('');
  const [equipCatToDelete, setEquipCatToDelete] = useState(null);

  const addCategory = (name) => {
    const trimmed = name.trim();
    if (!trimmed || inventoryCategories.includes(trimmed)) return;
    const updated = [...inventoryCategories, trimmed];
    setInventoryCategories(updated);
    saveCategories(updated);
    setItemForm(f => ({ ...f, category: trimmed }));
    setNewCatInput('');
  };

  const deleteCategory = (cat) => {
    const updated = inventoryCategories.filter(c => c !== cat);
    setInventoryCategories(updated);
    saveCategories(updated);
    if (itemForm.category === cat) setItemForm(f => ({ ...f, category: updated[0] || '' }));
  };

  const addEquipmentCategory = (name) => {
    const trimmed = name.trim();
    if (!trimmed || equipmentCategories.includes(trimmed)) return;
    const updated = [...equipmentCategories, trimmed];
    setEquipmentCategories(updated);
    saveEquipmentCategories(updated);
    setItemForm(f => ({ ...f, category: trimmed }));
    setNewEquipCatInput('');
  };

  const deleteEquipmentCategory = (cat) => {
    const updated = equipmentCategories.filter(c => c !== cat);
    setEquipmentCategories(updated);
    saveEquipmentCategories(updated);
    if (itemForm.category === cat) setItemForm(f => ({ ...f, category: updated[0] || '' }));
  };

  // Filters
  const [inventoryTab, setInventoryTab] = useState('material'); // 'material' | 'equipment'
  const [selectedProject, setSelectedProject] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialogs
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isQtyDialogOpen, setIsQtyDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Forms
  const [itemForm, setItemForm] = useState(EMPTY_FORM);
  const [qtyForm, setQtyForm] = useState({ quantity: '', operation: 'add', notes: '' });
  const [transferForm, setTransferForm] = useState({ to_project_id: '', to_item_id: '__new__', quantity: '', notes: '' });
  const [transferLoading, setTransferLoading] = useState(false);
  const [destItems, setDestItems] = useState([]);
  const [destItemsLoading, setDestItemsLoading] = useState(false);

  // ── Data Fetch ────────────────────────────────────────────

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    fetchItems();
    fetchDashboard();
  }, [selectedProject]);

  const fetchMeta = async () => {
    try {
      const pRes = await api.get('/projects?limit=1000');
      setProjects(pRes.data.data);
    } catch {
      toast.error('Failed to load project data');
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedProject !== 'all') params.project_id = selectedProject;
      const res = await api.get('/inventory', { params });
      setItems(res.data);
    } catch {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const params = {};
      if (selectedProject !== 'all') params.project_id = selectedProject;
      const res = await api.get('/inventory/dashboard', { params });
      setDashboard(res.data);
    } catch { }
  };

  // ── Filtered Items ────────────────────────────────────────

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesType = (item.item_type || 'material') === inventoryTab;
      const matchesSearch = !searchQuery ||
        item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const itemStatus = (item.item_type === 'equipment') ? item.equipment_status : item.status;
      const matchesStatus = statusFilter === 'all' || itemStatus === statusFilter;
      return matchesType && matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, inventoryTab, searchQuery, categoryFilter, statusFilter]);

  // ── CRUD ─────────────────────────────────────────────────

  const openCreateDialog = () => {
    setSelectedItem(null);
    const isEquip = inventoryTab === 'equipment';
    setItemForm({
      ...EMPTY_FORM,
      item_type: inventoryTab,
      category: isEquip ? (equipmentCategories[0] || 'Machine') : (inventoryCategories[0] || 'Cement'),
      unit: isEquip ? '' : 'Bags',
      project_id: selectedProject !== 'all' ? selectedProject : '',
    });
    setIsItemDialogOpen(true);
  };

  const openEditDialog = (item) => {
    setSelectedItem(item);
    setItemForm({
      item_type: item.item_type || 'material',
      project_id: item.project_id || '',
      item_name: item.item_name || '',
      category: item.category || 'Cement',
      unit: item.unit || 'Bags',
      quantity: item.quantity ?? '',
      minimum_quantity: item.minimum_quantity ?? '',
      unit_price: item.unit_price ?? '',
      gst_rate: item.gst_rate ?? 18,
      hsn_code: item.hsn_code || '',
      serial_number: item.serial_number || '',
      condition: item.condition || 'good',
      purchase_date: item.purchase_date || '',
      equipment_status: item.equipment_status || 'available',
      location: item.location || '',
      notes: item.notes || '',
    });
    setIsItemDialogOpen(true);
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    if (!itemForm.project_id) { toast.error('Please select a project'); return; }
    setFormLoading(true);
    try {
      const payload = {
        ...itemForm,
        quantity: parseFloat(itemForm.quantity) || 0,
        minimum_quantity: parseFloat(itemForm.minimum_quantity) || 0,
        unit_price: parseFloat(itemForm.unit_price) || 0,
      };
      if (selectedItem) {
        await api.put(`/inventory/${selectedItem.id}`, payload);
        toast.success('Item updated');
      } else {
        await api.post('/inventory', payload);
        toast.success('Item added to inventory');
      }
      setIsItemDialogOpen(false);
      fetchItems();
      fetchDashboard();
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(Array.isArray(d) ? d.map(e => e.msg).join(', ') : (d || 'Failed to save item'));
    } finally {
      setFormLoading(false);
    }
  };

  const openQtyDialog = (item) => {
    setSelectedItem(item);
    setQtyForm({ quantity: '', operation: 'add', notes: '' });
    setIsQtyDialogOpen(true);
  };

  const openTransferDialog = (item) => {
    setSelectedItem(item);
    setTransferForm({ to_project_id: '', to_item_id: '__new__', quantity: '', notes: '' });
    setDestItems([]);
    setIsTransferDialogOpen(true);
  };

  const handleTransferProjectChange = async (projectId) => {
    setTransferForm(f => ({ ...f, to_project_id: projectId, to_item_id: '__new__' }));
    setDestItemsLoading(true);
    try {
      const res = await api.get('/inventory', { params: { project_id: projectId } });
      setDestItems(res.data);
    } catch { setDestItems([]); }
    finally { setDestItemsLoading(false); }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferForm.to_project_id) { toast.error('Select a destination project'); return; }
    if (!transferForm.quantity || parseFloat(transferForm.quantity) <= 0) { toast.error('Enter a valid quantity'); return; }
    setTransferLoading(true);
    try {
      const res = await api.post('/inventory/transfer', {
        from_item_id: selectedItem.id,
        to_project_id: transferForm.to_project_id,
        to_item_id: transferForm.to_item_id !== '__new__' ? transferForm.to_item_id : null,
        quantity: parseFloat(transferForm.quantity),
        notes: transferForm.notes,
      });
      toast.success(res.data.message);
      setIsTransferDialogOpen(false);
      fetchItems();
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Transfer failed');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleQtySubmit = async (e) => {
    e.preventDefault();
    if (!qtyForm.quantity) { toast.error('Enter a quantity'); return; }
    setFormLoading(true);
    try {
      await api.patch(`/inventory/${selectedItem.id}/quantity`, {
        quantity: parseFloat(qtyForm.quantity),
        operation: qtyForm.operation,
        notes: qtyForm.notes,
      });
      toast.success('Stock updated');
      setIsQtyDialogOpen(false);
      fetchItems();
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update stock');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    setFormLoading(true);
    try {
      await api.delete(`/inventory/${selectedItem.id}`);
      toast.success('Item deleted');
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      fetchItems();
      fetchDashboard();
    } catch {
      toast.error('Failed to delete item');
    } finally {
      setFormLoading(false);
    }
  };

  const getProjectName = (id) => projects.find(p => p.id === id)?.name || '—';

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-500" />
            Inventory
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track site materials and stock levels per project</p>
        </div>
        {hasPermission('inventory', 'create') && (
          <Button onClick={openCreateDialog} className="gap-2 bg-accent hover:bg-accent/90 text-white border-accent">
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        )}
      </div>

      {/* Project Selector */}
      {/* Project Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Layers className="w-4 h-4" />
          Filter by Project:
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      {dashboard && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Items</p>
                  <p className="text-2xl font-bold mt-1">{dashboard.total_items}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Value</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(dashboard.total_value)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <IndianRupee className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Low Stock</p>
                  <p className="text-2xl font-bold mt-1 text-amber-600">{dashboard.low_stock_count}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Out of Stock</p>
                  <p className="text-2xl font-bold mt-1 text-red-600">{dashboard.out_of_stock_count}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <PackageX className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Material / Equipment Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setInventoryTab('material'); setCategoryFilter('all'); setStatusFilter('all'); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium border transition-colors ${inventoryTab === 'material' ? 'bg-accent text-white border-accent' : 'bg-background border-border hover:bg-muted'}`}
        >
          <Package className="w-4 h-4" />
          Materials ({items.filter(i => (i.item_type || 'material') === 'material').length})
        </button>
        <button
          onClick={() => { setInventoryTab('equipment'); setCategoryFilter('all'); setStatusFilter('all'); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium border transition-colors ${inventoryTab === 'equipment' ? 'bg-accent text-white border-accent' : 'bg-background border-border hover:bg-muted'}`}
        >
          <Wrench className="w-4 h-4" />
          Equipment ({items.filter(i => i.item_type === 'equipment').length})
        </button>
      </div>

      {/* Filters + Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search item, category, location…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Category filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {inventoryCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {inventoryTab === 'material' ? <>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </> : <>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </>}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading inventory…
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Package className="w-10 h-10 opacity-30" />
              <p className="text-sm">No items found.{hasPermission('inventory', 'create') && ' Click "Add Item" to get started.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Location</TableHead>
                    {inventoryTab === 'material' ? <>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Min Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead>HSN</TableHead>
                    </> : <>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead>Serial No</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Purchase Date</TableHead>
                    </>}
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map(item => {
                    const isEquipment = item.item_type === 'equipment';
                    const sc = isEquipment
                      ? (EQUIPMENT_STATUS_CONFIG[item.equipment_status] || EQUIPMENT_STATUS_CONFIG.available)
                      : (STATUS_CONFIG[item.status] || STATUS_CONFIG.in_stock);
                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                          {getProjectName(item.project_id)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.location || '—'}</TableCell>
                        {isEquipment ? <>
                          <TableCell className="text-right font-semibold">{item.quantity ?? '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">{item.serial_number || '—'}</TableCell>
                          <TableCell><Badge variant="outline" className={`text-xs capitalize ${item.condition === 'good' ? 'text-emerald-700' : item.condition === 'fair' ? 'text-amber-700' : 'text-red-700'}`}>{item.condition || '—'}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.purchase_date || '—'}</TableCell>
                        </> : <>
                          <TableCell className="text-right font-semibold">
                            {item.quantity} <span className="text-xs text-muted-foreground">{item.unit}</span>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {item.minimum_quantity} {item.unit}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(item.unit_price)}/{item.unit}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.total_value)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.hsn_code || '—'}</TableCell>
                        </>}
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${sc.className}`}>
                            {sc.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {hasPermission('inventory', 'edit') && (
                              <>
                                <Button
                                  size="icon" variant="ghost"
                                  className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  title="Adjust Stock"
                                  onClick={() => openQtyDialog(item)}
                                >
                                  <TrendingUp className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon" variant="ghost"
                                  className="h-7 w-7 text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                                  title="Edit"
                                  onClick={() => openEditDialog(item)}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon" variant="ghost"
                                  className="h-7 w-7 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                                  title="Transfer to another project"
                                  onClick={() => openTransferDialog(item)}
                                  disabled={item.quantity <= 0}
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                            {hasPermission('inventory', 'delete') && (
                              <Button
                                size="icon" variant="ghost"
                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Delete"
                                onClick={() => { setSelectedItem(item); setIsDeleteDialogOpen(true); }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add / Edit Item Dialog ─────────────────────────── */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem ? 'Edit Inventory Item' : 'Add Inventory Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleItemSubmit} className="space-y-4 pt-2">

            {/* Type Toggle */}
            {!selectedItem && (
              <div className="flex rounded-sm border overflow-hidden">
                <button type="button"
                  onClick={() => setItemForm(f => ({ ...f, item_type: 'material', category: 'Cement', unit: 'Bags' }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${itemForm.item_type === 'material' ? 'bg-accent text-white' : 'bg-background text-foreground hover:bg-muted'}`}>
                  <Package className="w-4 h-4" /> Material
                </button>
                <button type="button"
                  onClick={() => setItemForm(f => ({ ...f, item_type: 'equipment', category: 'Machine', unit: '' }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${itemForm.item_type === 'equipment' ? 'bg-accent text-white' : 'bg-background text-foreground hover:bg-muted'}`}>
                  <Wrench className="w-4 h-4" /> Equipment
                </button>
              </div>
            )}

            {/* Project */}
            <div className="space-y-1.5">
              <Label className="text-xs">Project *</Label>
              <Select
                value={itemForm.project_id}
                onValueChange={v => setItemForm(f => ({ ...f, project_id: v }))}
                required
              >
                <SelectTrigger className="rounded-sm">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {p.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Item Name */}
            <div className="space-y-1.5">
              <Label className="text-xs">Item Name *</Label>
              <Input
                placeholder="e.g. TMT Steel Bar 12mm"
                value={itemForm.item_name}
                onChange={e => setItemForm(f => ({ ...f, item_name: e.target.value }))}
                required className="rounded-sm"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs">Category *</Label>
              {itemForm.item_type === 'equipment' ? (
                <>
                  <Select value={itemForm.category} onValueChange={v => setItemForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-48 overflow-y-auto">
                      {equipmentCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1 mt-1">
                    <input className="flex-1 text-xs px-2 py-1.5 border rounded-sm outline-none focus:ring-1 focus:ring-ring" placeholder="Add new category..." value={newEquipCatInput} onChange={e => setNewEquipCatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEquipmentCategory(newEquipCatInput); } }} />
                    <button type="button" className="px-2 py-1 text-xs bg-accent text-white rounded-sm hover:bg-accent/80 shrink-0" onClick={() => addEquipmentCategory(newEquipCatInput)}>Add</button>
                  </div>
                </>
              ) : (
                <>
                  <Select value={itemForm.category} onValueChange={v => setItemForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-48 overflow-y-auto">
                      {inventoryCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1 mt-1">
                    <input className="flex-1 text-xs px-2 py-1.5 border rounded-sm outline-none focus:ring-1 focus:ring-ring" placeholder="Add new category..." value={newCatInput} onChange={e => setNewCatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory(newCatInput); } }} />
                    <button type="button" className="px-2 py-1 text-xs bg-accent text-white rounded-sm hover:bg-accent/80 shrink-0" onClick={() => addCategory(newCatInput)}>Add</button>
                  </div>
                </>
              )}
            </div>

            {itemForm.item_type === 'material' ? (
              <>
                {/* Unit + Quantity + Min Qty */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Unit *</Label>
                    <Select value={itemForm.unit} onValueChange={v => setItemForm(f => ({ ...f, unit: v }))}>
                      <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Current Quantity</Label>
                    <Input type="number" step="any" min="0" placeholder="0" value={itemForm.quantity} onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))} className="rounded-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Min Qty (Reorder)</Label>
                    <Input type="number" step="any" min="0" placeholder="0" value={itemForm.minimum_quantity} onChange={e => setItemForm(f => ({ ...f, minimum_quantity: e.target.value }))} className="rounded-sm" />
                  </div>
                </div>
                {/* Unit Price + GST + HSN */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Unit Price (₹)</Label>
                    <Input type="number" step="any" min="0" placeholder="0.00" value={itemForm.unit_price} onChange={e => setItemForm(f => ({ ...f, unit_price: e.target.value }))} className="rounded-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">GST Rate (%)</Label>
                    <Select value={String(itemForm.gst_rate)} onValueChange={v => setItemForm(f => ({ ...f, gst_rate: +v }))}>
                      <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[0, 5, 12, 18, 28].map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">HSN Code</Label>
                    <Input placeholder="e.g. 7214" value={itemForm.hsn_code} onChange={e => setItemForm(f => ({ ...f, hsn_code: e.target.value }))} className="rounded-sm" />
                  </div>
                </div>
                {itemForm.quantity && itemForm.unit_price && (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-sm border text-sm">
                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                    <span className="text-muted-foreground">Total Value:</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency((parseFloat(itemForm.quantity) || 0) * (parseFloat(itemForm.unit_price) || 0))}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Equipment-specific fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Serial Number</Label>
                    <Input placeholder="e.g. JD-2024-001" value={itemForm.serial_number} onChange={e => setItemForm(f => ({ ...f, serial_number: e.target.value }))} className="rounded-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Count / Quantity</Label>
                    <Input type="number" step="1" min="1" placeholder="1" value={itemForm.quantity} onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))} className="rounded-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Condition</Label>
                    <Select value={itemForm.condition} onValueChange={v => setItemForm(f => ({ ...f, condition: v }))}>
                      <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select value={itemForm.equipment_status} onValueChange={v => setItemForm(f => ({ ...f, equipment_status: v }))}>
                      <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="in_use">In Use</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Purchase Date</Label>
                    <Input type="date" value={itemForm.purchase_date} onChange={e => setItemForm(f => ({ ...f, purchase_date: e.target.value }))} className="rounded-sm" />
                  </div>
                </div>
              </>
            )}

            {/* Location */}
            <div className="space-y-1.5">
              <Label className="text-xs">{itemForm.item_type === 'equipment' ? 'Current Location' : 'Storage Location'}</Label>
              <Input placeholder="e.g. Yard A, Block 2" value={itemForm.location} onChange={e => setItemForm(f => ({ ...f, location: e.target.value }))} className="rounded-sm" />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea placeholder={itemForm.item_type === 'equipment' ? 'Any notes about this equipment…' : 'Any additional notes about this material…'} value={itemForm.notes} onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="rounded-sm resize-none" />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsItemDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={formLoading} className="bg-accent hover:bg-accent/90 text-white">
                {formLoading ? 'Saving…' : selectedItem ? 'Update Item' : 'Add Item'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Stock Adjust Dialog ────────────────────────────── */}
      <Dialog open={isQtyDialogOpen} onOpenChange={setIsQtyDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Stock — {selectedItem?.item_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleQtySubmit} className="space-y-4 pt-2">
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-sm">
              {['add', 'subtract', 'set'].map(op => (
                <button
                  key={op} type="button"
                  onClick={() => setQtyForm(f => ({ ...f, operation: op }))}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-sm capitalize transition-colors ${qtyForm.operation === op ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {op === 'add' ? '+ Add' : op === 'subtract' ? '− Remove' : '= Set'}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                {qtyForm.operation === 'add' ? 'Quantity to Add' : qtyForm.operation === 'subtract' ? 'Quantity to Remove' : 'Set Exact Quantity'}
                <span className="ml-1 text-muted-foreground">({selectedItem?.unit})</span>
              </Label>
              <Input
                type="number" step="any" min="0" placeholder="0"
                value={qtyForm.quantity}
                onChange={e => setQtyForm(f => ({ ...f, quantity: e.target.value }))}
                required className="rounded-sm"
              />
              {selectedItem && (
                <p className="text-xs text-muted-foreground">
                  Current stock: <strong>{selectedItem.quantity} {selectedItem.unit}</strong>
                  {qtyForm.quantity && (
                    <span className="ml-2 text-blue-600">→ {
                      qtyForm.operation === 'add'
                        ? (selectedItem.quantity + parseFloat(qtyForm.quantity || 0)).toFixed(2)
                        : qtyForm.operation === 'subtract'
                          ? Math.max(0, selectedItem.quantity - parseFloat(qtyForm.quantity || 0)).toFixed(2)
                          : parseFloat(qtyForm.quantity || 0).toFixed(2)
                    } {selectedItem.unit}</span>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Reason / Notes</Label>
              <Input
                placeholder="e.g. Received from supplier, Used in floor slab"
                value={qtyForm.notes}
                onChange={e => setQtyForm(f => ({ ...f, notes: e.target.value }))}
                className="rounded-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsQtyDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? 'Updating…' : 'Update Stock'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Transfer Dialog ───────────────────────────────── */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-violet-600" />
              Transfer Material
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransferSubmit} className="space-y-4 pt-2">
            {/* Source info */}
            <div className="rounded-sm bg-slate-50 dark:bg-slate-800 p-3 text-sm space-y-1">
              <p className="text-xs text-muted-foreground uppercase font-medium">From</p>
              <p className="font-semibold">{selectedItem?.item_name}</p>
              <p className="text-muted-foreground">{projects.find(p => p.id === selectedItem?.project_id)?.name || '—'}</p>
              <p className="text-xs">Available: <span className="font-semibold text-foreground">{selectedItem?.quantity} {selectedItem?.unit}</span></p>
            </div>

            {/* Destination project */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Destination Project *</label>
              <Select
                value={transferForm.to_project_id}
                onValueChange={handleTransferProjectChange}
                required
              >
                <SelectTrigger className="rounded-sm">
                  <SelectValue placeholder="Select project…" />
                </SelectTrigger>
                <SelectContent>
                  {projects
                    .filter(p => p.id !== selectedItem?.project_id)
                    .map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Destination item (shown after project is selected) */}
            {transferForm.to_project_id && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Add to Existing Item <span className="text-muted-foreground font-normal">(leave blank to create new)</span></label>
                {destItemsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading items…
                  </div>
                ) : (
                  <Select
                    value={transferForm.to_item_id}
                    onValueChange={v => setTransferForm(f => ({ ...f, to_item_id: v }))}
                  >
                    <SelectTrigger className="rounded-sm">
                      <SelectValue placeholder="— Add as new item —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__new__">— Add as new item —</SelectItem>
                      {destItems.filter(d => d?.id).map(d => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.item_name}
                          <span className="ml-2 text-xs text-muted-foreground">{d.quantity} {d.unit}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Quantity to Transfer * <span className="text-muted-foreground">({selectedItem?.unit})</span></label>
              <Input
                type="number" step="any" min="0.01" max={selectedItem?.quantity}
                placeholder="0"
                value={transferForm.quantity}
                onChange={e => setTransferForm(f => ({ ...f, quantity: e.target.value }))}
                required className="rounded-sm"
              />
              {transferForm.quantity && selectedItem && (
                <p className="text-xs text-muted-foreground">
                  Remaining after transfer: <span className="font-semibold text-foreground">{Math.max(0, selectedItem.quantity - parseFloat(transferForm.quantity || 0)).toFixed(2)} {selectedItem.unit}</span>
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Notes</label>
              <Input
                placeholder="Reason for transfer (optional)"
                value={transferForm.notes}
                onChange={e => setTransferForm(f => ({ ...f, notes: e.target.value }))}
                className="rounded-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" className="rounded-sm" onClick={() => setIsTransferDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="rounded-sm bg-violet-600 hover:bg-violet-700 text-white" disabled={transferLoading}>
                {transferLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ArrowRightLeft className="w-4 h-4 mr-1" />}
                Transfer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ─────────────────────────── */}
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        isDeleting={formLoading}
        title={`Delete "${selectedItem?.item_name || 'Item'}"?`}
        description="This will permanently delete this inventory item. This action cannot be undone."
      />

      {/* ── Delete Category Confirm ───────────────────────── */}
      <DeleteConfirmationDialog
        open={!!catToDelete}
        onOpenChange={v => { if (!v) setCatToDelete(null); }}
        onConfirm={() => { deleteCategory(catToDelete); setCatToDelete(null); }}
        title={`Delete category "${catToDelete}"?`}
        description="This will remove the category from the list. Existing items with this category will not be affected."
      />

      {/* ── Delete Equipment Category Confirm ────────────── */}
      <DeleteConfirmationDialog
        open={!!equipCatToDelete}
        onOpenChange={v => { if (!v) setEquipCatToDelete(null); }}
        onConfirm={() => { deleteEquipmentCategory(equipCatToDelete); setEquipCatToDelete(null); }}
        title={`Delete category "${equipCatToDelete}"?`}
        description="This will remove the category from the list. Existing items with this category will not be affected."
      />
    </div>
  );
}
