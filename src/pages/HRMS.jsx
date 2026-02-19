import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Users, Calendar, IndianRupee, Clock, Loader2,
  UserPlus, ClipboardCheck, Banknote, Eye, Edit3, Trash2,
  ArrowLeft, Phone, Mail, MapPin, Filter, CheckCircle2, XCircle,
  BarChart3, Building2, AlertTriangle, Shield, HardHat, Briefcase, X
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
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { formatCurrency, formatDate, getInitials, MODULE_LABELS, PERMISSION_LABELS } from '../lib/utils';
import { DeleteConfirmationDialog } from '../components/DeleteConfirmationDialog';

const attStatusColors = { present: 'bg-emerald-100 text-emerald-700', absent: 'bg-red-100 text-red-700', half_day: 'bg-amber-100 text-amber-700', leave: 'bg-blue-100 text-blue-700' };
const payStatusColors = { pending: 'bg-amber-100 text-amber-700', processed: 'bg-blue-100 text-blue-700', paid: 'bg-emerald-100 text-emerald-700' };
const payStatusFlow = { pending: 'processed', processed: 'paid' };

export default function HRMS() {
  const { api, user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [projects, setProjects] = useState([]);
  const [roles, setRoles] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeDetail, setEmployeeDetail] = useState(null);

  const [laborCategories, setLaborCategories] = useState([]);
  const [laborEntries, setLaborEntries] = useState([]);
  const [isLaborDialogOpen, setIsLaborDialogOpen] = useState(false);
  const [editingLabor, setEditingLabor] = useState(null);
  const [laborProjectFilter, setLaborProjectFilter] = useState('all');
  const [newCatName, setNewCatName] = useState('');
  const [catLoading, setCatLoading] = useState(false);
  const emptyLaborForm = { project_id: '', category_id: '', day_rate: '', notes: '' };
  const [laborForm, setLaborForm] = useState(emptyLaborForm);

  // Contractor state
  const [contractors, setContractors] = useState([]);
  const [isContractorDialogOpen, setIsContractorDialogOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState(null);
  const [contractorStatusFilter, setContractorStatusFilter] = useState('all');
  const CONTRACTOR_ROLES_DEFAULT = ['Mason', 'Bar Bender', 'Carpenter', 'Painter', 'Plumber', 'Electrician', 'Welder', 'Helper', 'Supervisor', 'Tiler'];
  const emptyContractorForm = {
    name: '', contractor_code: '', phone: '', email: '', address: '', city: '', gstin: '',
    project_id: '', trade: '', contract_value: '',
    start_date: '', end_date: '', status: 'active', roles: [], notes: ''
  };
  const [contractorForm, setContractorForm] = useState(emptyContractorForm);
  const [newRoleName, setNewRoleName] = useState('');
  const [deleteCatDialogOpen, setDeleteCatDialogOpen] = useState(false);
  const [catToDelete, setCatToDelete] = useState(null);
  const [isDeletingCat, setIsDeletingCat] = useState(false);

  const emptyEmpForm = { name: '', employee_code: '', email: '', password: '', role: '', designation: '', department: '', phone: '', date_of_joining: '', basic_salary: '', hra: '0', pf_number: '', esi_number: '', bank_account: '', bank_name: '', ifsc: '' };
  const [employeeForm, setEmployeeForm] = useState(emptyEmpForm);
  const [attendanceForm, setAttendanceForm] = useState({ employee_id: '', project_id: '', date: new Date().toISOString().slice(0, 10), check_in: '09:00', check_out: '18:00', status: 'present', overtime_hours: '0' });
  const [payrollForm, setPayrollForm] = useState({ employee_id: '', month: new Date().toISOString().slice(0, 7), basic_salary: '', hra: '0', overtime_pay: '0', other_allowances: '0', pf_deduction: '0', esi_deduction: '0', tds: '0', other_deductions: '0' });

  // Delete States
  const [deleteLaborDialogOpen, setDeleteLaborDialogOpen] = useState(false);
  const [laborToDelete, setLaborToDelete] = useState(null);
  const [isDeletingLabor, setIsDeletingLabor] = useState(false);


  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [eRes, aRes, pRes, prRes, rRes, dRes, lcRes, lRes, cRes] = await Promise.all([
        api.get('/employees'), api.get('/attendance'), api.get('/payroll'),
        api.get('/projects?limit=1000'), api.get('/roles'), api.get('/hrms/dashboard'),
        api.get('/labor-categories'), api.get('/labor'), api.get('/contractors')
      ]);
      setEmployees(eRes.data); setAttendance(aRes.data); setPayrolls(pRes.data);
      setProjects(prRes.data.data); setRoles(rRes.data); setDashboard(dRes.data);
      setLaborCategories(lcRes.data); setLaborEntries(lRes.data); setContractors(cRes.data);
    } catch { toast.error('Failed to load HRMS data'); }
    finally { setLoading(false); }
  };

  // Employee
  const handleEmployeeSubmit = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      const payload = { ...employeeForm, basic_salary: parseFloat(employeeForm.basic_salary), hra: parseFloat(employeeForm.hra) };
      // Remove password field if empty (for edit mode - password is optional when updating)
      if (editingEmployee && !payload.password) {
        delete payload.password;
      }
      if (editingEmployee) { await api.put(`/employees/${editingEmployee.id}`, payload); toast.success('Employee updated'); }
      else { await api.post('/employees', payload); toast.success('Employee added'); }
      setIsEmployeeDialogOpen(false); setEditingEmployee(null); setEmployeeForm(emptyEmpForm); fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); } finally { setFormLoading(false); }
  };
  const editEmployee = (emp) => {
    setEditingEmployee(emp);
    setEmployeeForm({
      name: emp.name, employee_code: emp.employee_code, email: emp.email,
      password: '', // Don't populate password when editing
      role: emp.role, designation: emp.designation, department: emp.department,
      phone: emp.phone, date_of_joining: emp.date_of_joining,
      basic_salary: String(emp.basic_salary), hra: String(emp.hra || 0),
      pf_number: emp.pf_number || '', esi_number: emp.esi_number || '',
      bank_account: emp.bank_account || '', bank_name: emp.bank_name || '', ifsc: emp.ifsc || ''
    });
    setIsEmployeeDialogOpen(true);
  };
  const deactivateEmployee = async (eid) => { try { await api.patch(`/employees/${eid}/deactivate`); toast.success('Employee deactivated'); setEmployeeDetail(null); fetchData(); } catch { toast.error('Failed'); } };
  const viewEmployeeDetail = async (eid) => { try { const res = await api.get(`/employees/${eid}/detail`); setEmployeeDetail(res.data); } catch { toast.error('Failed'); } };

  // Contractor
  const handleContractorSubmit = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      const payload = {
        ...contractorForm,
        contract_value: parseFloat(contractorForm.contract_value) || 0,
      };
      if (editingContractor) {
        await api.patch(`/contractors/${editingContractor.id}`, payload);
        toast.success('Contractor updated');
      } else {
        await api.post('/contractors', payload);
        toast.success('Contractor added');
      }
      setIsContractorDialogOpen(false); setEditingContractor(null); setContractorForm(emptyContractorForm); fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); } finally { setFormLoading(false); }
  };
  const editContractor = (c) => { setEditingContractor(c); setContractorForm({ ...c, contract_value: String(c.contract_value) }); setIsContractorDialogOpen(true); };
  const deleteContractor = async (id) => { try { await api.delete(`/contractors/${id}`); toast.success('Deleted'); fetchData(); } catch { toast.error('Failed'); } };
  const addContractorRoleByName = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (contractorForm.roles.find(r => r.category.toLowerCase() === trimmed.toLowerCase())) return;
    setContractorForm(f => ({ ...f, roles: [...f.roles, { category: trimmed }] }));
    setNewRoleName('');
  };
  const removeContractorRole = (idx) => setContractorForm(f => ({ ...f, roles: f.roles.filter((_, i) => i !== idx) }));

  const filteredContractors = useMemo(() => contractors.filter(c => contractorStatusFilter === 'all' || c.status === contractorStatusFilter), [contractors, contractorStatusFilter]);

  // Attendance
  const handleAttendanceSubmit = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try { await api.post('/attendance', { ...attendanceForm, overtime_hours: parseFloat(attendanceForm.overtime_hours) }); toast.success('Attendance marked'); setIsAttendanceDialogOpen(false); fetchData(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed'); } finally { setFormLoading(false); }
  };

  // Payroll
  const handlePayrollSubmit = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      const p = payrollForm;
      await api.post('/payroll', { ...p, basic_salary: +p.basic_salary, hra: +p.hra, overtime_pay: +p.overtime_pay, other_allowances: +p.other_allowances, pf_deduction: +p.pf_deduction, esi_deduction: +p.esi_deduction, tds: +p.tds, other_deductions: +p.other_deductions });
      toast.success('Payroll processed'); setIsPayrollDialogOpen(false); fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); } finally { setFormLoading(false); }
  };
  const handlePayrollStatus = async (pid, status) => { try { await api.patch(`/payroll/${pid}/status`, { status }); toast.success(`Payroll ${status}`); fetchData(); } catch { toast.error('Failed'); } };

  // Labor
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setCatLoading(true);
    try {
      const res = await api.post('/labor-categories', { name: newCatName.trim() });
      setLaborCategories(prev => [...prev, res.data]);
      setLaborForm(f => ({ ...f, category_id: res.data.id }));
      setNewCatName('');
      toast.success('Category added');
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    finally { setCatLoading(false); }
  };

  const handleDeleteCategory = async () => {
    if (!catToDelete) return;
    setIsDeletingCat(true);
    try {
      await api.delete(`/labor-categories/${catToDelete.id}`);
      setLaborCategories(prev => prev.filter(x => x.id !== catToDelete.id));
      if (laborForm.category_id === catToDelete.id) setLaborForm(f => ({ ...f, category_id: '' }));
      toast.success('Category deleted');
      setDeleteCatDialogOpen(false);
    } catch { toast.error('Failed to delete category'); }
    finally { setIsDeletingCat(false); }
  };

  const handleLaborSubmit = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      const payload = { ...laborForm, day_rate: parseFloat(laborForm.day_rate) };
      if (editingLabor) {
        await api.put(`/labor/${editingLabor.id}`, payload);
        toast.success('Labor entry updated');
      } else {
        await api.post('/labor', payload);
        toast.success('Labor entry added');
      }
      setIsLaborDialogOpen(false); setEditingLabor(null); setLaborForm(emptyLaborForm);
      const lRes = await api.get('/labor');
      setLaborEntries(lRes.data);
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    finally { setFormLoading(false); }
  };

  const editLabor = (entry) => {
    setEditingLabor(entry);
    setLaborForm({ project_id: entry.project_id, category_id: entry.category_id, day_rate: String(entry.day_rate), notes: entry.notes || '' });
    setIsLaborDialogOpen(true);
  };

  const deleteLabor = async () => {
    if (!laborToDelete) return;
    setIsDeletingLabor(true);
    try {
      await api.delete(`/labor/${laborToDelete.id}`);
      toast.success('Deleted');
      setLaborEntries(prev => prev.filter(l => l.id !== laborToDelete.id));
      setDeleteLaborDialogOpen(false);
    } catch { toast.error('Failed'); }
    finally { setIsDeletingLabor(false); }
  };

  const filteredLabor = useMemo(() =>
    laborProjectFilter === 'all' ? laborEntries : laborEntries.filter(l => l.project_id === laborProjectFilter),
    [laborEntries, laborProjectFilter]
  );

  const departments = useMemo(() => [...new Set(employees.map(e => e.department))], [employees]);
  const filteredEmployees = useMemo(() => employees.filter(e => {
    if (deptFilter !== 'all' && e.department !== deptFilter) return false;
    if (searchQuery && !e.name.toLowerCase().includes(searchQuery.toLowerCase()) && !e.employee_code.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }), [employees, deptFilter, searchQuery]);

  const getEmpName = (eid) => employees.find(e => e.id === eid)?.name || '-';
  const getEmpCode = (eid) => employees.find(e => e.id === eid)?.employee_code || '';
  const ds = dashboard || {};

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6" data-testid="hrms-page">
      <div className="page-header"><div><h1 className="page-title">HRMS</h1><p className="page-subtitle">Employee management, attendance & payroll</p></div></div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Employees" value={ds.employees?.total || 0} icon={Users} color="blue" />
        <Kpi label="Present Today" value={ds.attendance?.present_today || 0} icon={CheckCircle2} color="emerald" />
        <Kpi label="Att. Rate" value={`${ds.attendance?.overall_rate || 0}%`} icon={ClipboardCheck} color="cyan" />
        <Kpi label="Total OT" value={`${ds.attendance?.total_overtime || 0}h`} icon={Clock} color="amber" />
        <Kpi label="Salary Budget" value={formatCurrency(ds.employees?.monthly_salary_budget || 0)} icon={IndianRupee} color="purple" />
        <Kpi label="Payroll Pending" value={ds.payroll?.pending || 0} icon={Banknote} color="slate" />
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList className="rounded-sm">
          <TabsTrigger value="employees" className="rounded-sm gap-1.5" data-testid="employees-tab"><Users className="w-4 h-4" />Employees ({employees.length})</TabsTrigger>
          <TabsTrigger value="contractor" className="rounded-sm gap-1.5"><Briefcase className="w-4 h-4" />Contractor ({contractors.length})</TabsTrigger>
          <TabsTrigger value="labor" className="rounded-sm gap-1.5"><HardHat className="w-4 h-4" />Labour ({laborEntries.length})</TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-sm gap-1.5" data-testid="payroll-tab"><Banknote className="w-4 h-4" />Payroll ({payrolls.length})</TabsTrigger>
        </TabsList>

        {/* ===== EMPLOYEES ===== */}
        <TabsContent value="employees" className="space-y-4">
          <Tabs defaultValue="list" className="space-y-4">
            <TabsList className="rounded-sm">
              <TabsTrigger value="list" className="rounded-sm gap-1.5"><Users className="w-4 h-4" />All ({employees.length})</TabsTrigger>
              <TabsTrigger value="attendance" className="rounded-sm gap-1.5" data-testid="attendance-tab"><ClipboardCheck className="w-4 h-4" />Attendance ({attendance.length})</TabsTrigger>
              {user?.role === 'admin' && (
                <TabsTrigger value="roles" className="rounded-sm gap-1.5" data-testid="roles-tab"><Shield className="w-4 h-4" />Roles ({roles.length})</TabsTrigger>
              )}
            </TabsList>

            {/* ---- Employee List ---- */}
            <TabsContent value="list" className="space-y-4">
              {employeeDetail ? (
                <EmployeeDetailView detail={employeeDetail} onBack={() => setEmployeeDetail(null)} onEdit={editEmployee} onDeactivate={deactivateEmployee} canEdit={hasPermission('hrms', 'edit')} canDelete={hasPermission('hrms', 'delete')} />
              ) : (
                <>
                  <div className="flex flex-wrap gap-3 justify-between">
                    <div className="flex gap-2 flex-1">
                      <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search employees..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 rounded-sm" data-testid="employee-search" /></div>
                      <Select value={deptFilter} onValueChange={setDeptFilter}><SelectTrigger className="w-44 rounded-sm text-sm" data-testid="dept-filter"><Filter className="w-4 h-4 mr-1" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Departments</SelectItem>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
                    </div>
                    {hasPermission('hrms', 'create') && (
                      <Button className="action-btn action-btn-accent" onClick={() => { setEditingEmployee(null); setEmployeeForm(emptyEmpForm); setIsEmployeeDialogOpen(true); }} data-testid="add-employee-btn"><UserPlus className="w-4 h-4" />Add Employee</Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredEmployees.length === 0 ? (
                      <Card className="col-span-full rounded-sm"><CardContent className="text-center py-12 text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No employees found</p></CardContent></Card>
                    ) : filteredEmployees.map(emp => (
                      <Card key={emp.id} className="rounded-sm card-hover cursor-pointer group" onClick={() => viewEmployeeDetail(emp.id)} data-testid={`employee-card-${emp.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="w-11 h-11"><AvatarFallback className="bg-accent text-accent-foreground text-sm">{getInitials(emp.name)}</AvatarFallback></Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{emp.name}</p>
                              <p className="text-xs text-muted-foreground">{emp.designation}</p>
                              <div className="flex items-center gap-2 mt-1"><Badge variant="outline" className="text-[10px] rounded-sm">{emp.department}</Badge><span className="text-[10px] font-mono text-muted-foreground">{emp.employee_code}</span></div>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-muted-foreground">Joined</span><p className="font-medium">{formatDate(emp.date_of_joining)}</p></div>
                            <div className="text-right"><span className="text-muted-foreground">Salary</span><p className="font-semibold">{formatCurrency(emp.basic_salary + (emp.hra || 0))}</p></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            {/* ---- Attendance ---- */}
            <TabsContent value="attendance" className="space-y-4">
              <div className="flex justify-end">
                {hasPermission('hrms', 'create') && (
                  <Button className="action-btn action-btn-accent" onClick={() => setIsAttendanceDialogOpen(true)} data-testid="mark-attendance-btn"><ClipboardCheck className="w-4 h-4" />Mark Attendance</Button>
                )}
              </div>
              <Card className="rounded-sm">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Employee</TableHead><TableHead>Date</TableHead><TableHead>Check In</TableHead><TableHead>Check Out</TableHead><TableHead>OT</TableHead><TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {attendance.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground"><ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No attendance records</p></TableCell></TableRow>
                    ) : attendance.slice(0, 50).map(a => (
                      <TableRow key={a.id} data-testid={`att-row-${a.id}`}>
                        <TableCell><div><p className="font-medium text-sm">{getEmpName(a.employee_id)}</p><p className="text-[10px] font-mono text-muted-foreground">{getEmpCode(a.employee_id)}</p></div></TableCell>
                        <TableCell className="text-sm">{formatDate(a.date)}</TableCell>
                        <TableCell className="text-sm font-mono">{a.check_in || '-'}</TableCell>
                        <TableCell className="text-sm font-mono">{a.check_out || '-'}</TableCell>
                        <TableCell className="text-sm">{a.overtime_hours > 0 ? `${a.overtime_hours}h` : '-'}</TableCell>
                        <TableCell><Badge className={`${attStatusColors[a.status]} text-xs rounded-sm capitalize`}>{a.status.replace('_', ' ')}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* ---- Roles ---- */}
            {user?.role === 'admin' && (
              <TabsContent value="roles" className="space-y-4">
                <RolesManager api={api} onRolesChange={fetchData} />
              </TabsContent>
            )}
          </Tabs>
        </TabsContent>

        {/* ===== CONTRACTOR ===== */}
        <TabsContent value="contractor" className="space-y-4">
          {/* Summary */}
          {contractors.length > 0 && (() => {
            const totalVal = contractors.reduce((s, c) => s + (c.contract_value || 0), 0);
            const active = contractors.filter(c => c.status === 'active').length;
            const completed = contractors.filter(c => c.status === 'completed').length;
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="rounded-sm"><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Total</p><p className="text-xl font-bold">{contractors.length}</p></CardContent></Card>
                <Card className="rounded-sm"><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Active</p><p className="text-xl font-bold text-emerald-600">{active}</p></CardContent></Card>
                <Card className="rounded-sm"><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Completed</p><p className="text-xl font-bold text-blue-600">{completed}</p></CardContent></Card>
                <Card className="rounded-sm"><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Total Value</p><p className="text-lg font-bold">{formatCurrency(totalVal)}</p></CardContent></Card>
              </div>
            );
          })()}

          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 justify-between">
            <Select value={contractorStatusFilter} onValueChange={setContractorStatusFilter}>
              <SelectTrigger className="w-44 rounded-sm text-sm"><Filter className="w-4 h-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {['active','completed','on_hold','terminated'].map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_',' ')}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasPermission('hrms', 'create') && (
              <Button className="action-btn action-btn-accent" onClick={() => { setEditingContractor(null); setContractorForm(emptyContractorForm); setIsContractorDialogOpen(true); }}>
                <Plus className="w-4 h-4" />Add Contractor
              </Button>
            )}
          </div>

          {/* Table */}
          <Card className="rounded-sm">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Contract Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredContractors.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No contractors found</p>
                  </TableCell></TableRow>
                ) : filteredContractors.map(c => {
                  const proj = projects.find(p => p.id === c.project_id);
                  const statusColors = { active: 'bg-emerald-100 text-emerald-700', completed: 'bg-blue-100 text-blue-700', on_hold: 'bg-amber-100 text-amber-700', terminated: 'bg-red-100 text-red-700' };
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{c.contractor_code}</TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{c.name}</p>
                        {c.phone && <p className="text-[10px] text-muted-foreground">{c.phone}</p>}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="rounded-sm text-xs capitalize">{c.trade || '-'}</Badge></TableCell>
                      <TableCell className="text-sm">{proj?.name || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(c.roles || []).slice(0, 3).map((r, i) => <Badge key={i} variant="secondary" className="rounded-sm text-[10px]">{r.category} ×{r.count}</Badge>)}
                          {(c.roles || []).length > 3 && <Badge variant="secondary" className="rounded-sm text-[10px]">+{c.roles.length - 3}</Badge>}
                          {(c.roles || []).length === 0 && <span className="text-muted-foreground text-xs">-</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">{formatCurrency(c.contract_value || 0)}</TableCell>
                      <TableCell><Badge className={`${statusColors[c.status] || ''} text-xs rounded-sm capitalize`}>{c.status?.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {hasPermission('hrms', 'edit') && <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => editContractor(c)}><Edit3 className="w-3.5 h-3.5" /></Button>}
                          {hasPermission('hrms', 'delete') && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => deleteContractor(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ===== PAYROLL ===== */}
        <TabsContent value="payroll" className="space-y-4">
          <div className="flex justify-end">
            {hasPermission('hrms', 'create') && (
              <Button className="action-btn action-btn-accent" onClick={() => setIsPayrollDialogOpen(true)} data-testid="create-payroll-btn"><Banknote className="w-4 h-4" />Process Payroll</Button>
            )}
          </div>
          <Card className="rounded-sm">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Employee</TableHead><TableHead>Month</TableHead><TableHead className="text-right">Gross</TableHead><TableHead className="text-right">Deductions</TableHead><TableHead className="text-right">Net Salary</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {payrolls.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground"><Banknote className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No payroll records</p></TableCell></TableRow>
                ) : payrolls.map(p => (
                  <TableRow key={p.id} data-testid={`payroll-row-${p.id}`}>
                    <TableCell><p className="font-medium text-sm">{getEmpName(p.employee_id)}</p></TableCell>
                    <TableCell className="text-sm">{p.month}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(p.gross_salary)}</TableCell>
                    <TableCell className="text-right text-sm text-red-600">{formatCurrency(p.total_deductions)}</TableCell>
                    <TableCell className="text-right text-sm font-bold">{formatCurrency(p.net_salary)}</TableCell>
                    <TableCell><Badge className={`${payStatusColors[p.status]} text-xs rounded-sm capitalize`}>{p.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {payStatusFlow[p.status] && hasPermission('hrms', 'edit') && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600" onClick={() => handlePayrollStatus(p.id, payStatusFlow[p.status])} data-testid={`advance-payroll-${p.id}`}>
                          {p.status === 'pending' ? 'Process' : 'Mark Paid'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ===== LABOR ===== */}
        <TabsContent value="labor" className="space-y-4">
          <div className="flex flex-wrap gap-3 justify-between">
            <Select value={laborProjectFilter} onValueChange={setLaborProjectFilter}>
              <SelectTrigger className="w-52 rounded-sm text-sm"><Filter className="w-4 h-4 mr-1" /><SelectValue placeholder="All Projects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasPermission('hrms', 'create') && (
              <Button className="action-btn action-btn-accent" onClick={() => { setEditingLabor(null); setLaborForm(emptyLaborForm); setIsLaborDialogOpen(true); }}>
                <Plus className="w-4 h-4" />Add Labor
              </Button>
            )}
          </div>

          {/* Summary cards */}
          {filteredLabor.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="rounded-sm"><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Total Entries</p><p className="text-xl font-bold">{filteredLabor.length}</p></CardContent></Card>
              <Card className="rounded-sm"><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Categories</p><p className="text-xl font-bold">{new Set(filteredLabor.map(l => l.category_id)).size}</p></CardContent></Card>
              <Card className="rounded-sm"><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Avg Day Rate</p><p className="text-xl font-bold">{formatCurrency(filteredLabor.reduce((s, l) => s + l.day_rate, 0) / filteredLabor.length)}</p></CardContent></Card>
              <Card className="rounded-sm"><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Projects</p><p className="text-xl font-bold">{new Set(filteredLabor.map(l => l.project_id)).size}</p></CardContent></Card>
            </div>
          )}

          <Card className="rounded-sm">
            <Table>
              <TableHeader><TableRow>
                <TableHead>#</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Category / Role</TableHead>
                <TableHead className="text-right">Day Rate (₹)</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredLabor.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    <HardHat className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No labor entries</p>
                  </TableCell></TableRow>
                ) : filteredLabor.map((entry, i) => {
                  const proj = projects.find(p => p.id === entry.project_id);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                      <TableCell><p className="font-medium text-sm">{proj?.name || '-'}</p><p className="text-[10px] font-mono text-muted-foreground">{proj?.code || ''}</p></TableCell>
                      <TableCell><Badge variant="outline" className="rounded-sm capitalize text-xs">{entry.category_name}</Badge></TableCell>
                      <TableCell className="text-right font-semibold text-sm">{formatCurrency(entry.day_rate)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.notes || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {hasPermission('hrms', 'edit') && <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => editLabor(entry)}><Edit3 className="w-3.5 h-3.5" /></Button>}
                          {hasPermission('hrms', 'delete') && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => { setLaborToDelete(entry); setDeleteLaborDialogOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Contractor Dialog */}
      <Dialog open={isContractorDialogOpen} onOpenChange={v => { setIsContractorDialogOpen(v); if (!v) { setEditingContractor(null); setContractorForm(emptyContractorForm); setNewRoleName(''); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-lg font-bold uppercase">{editingContractor ? 'Edit Contractor' : 'Add Contractor'}</DialogTitle></DialogHeader>
          <form onSubmit={handleContractorSubmit} className="space-y-4 mt-2">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Contractor Name *" value={contractorForm.name} onChange={v => setContractorForm(f => ({ ...f, name: v }))} />
              <Fld label="Contractor Code *" value={contractorForm.contractor_code} onChange={v => setContractorForm(f => ({ ...f, contractor_code: v }))} mono />
              <Fld label="Phone" value={contractorForm.phone} onChange={v => setContractorForm(f => ({ ...f, phone: v }))} />
              <Fld label="Email" value={contractorForm.email} onChange={v => setContractorForm(f => ({ ...f, email: v }))} />
              <Fld label="Address" value={contractorForm.address} onChange={v => setContractorForm(f => ({ ...f, address: v }))} />
              <Fld label="City" value={contractorForm.city} onChange={v => setContractorForm(f => ({ ...f, city: v }))} />
              <Fld label="GSTIN" value={contractorForm.gstin} onChange={v => setContractorForm(f => ({ ...f, gstin: v }))} mono />
              <div className="space-y-1.5">
                <Label className="text-xs">Trade / Specialization</Label>
                <Select value={contractorForm.trade} onValueChange={v => setContractorForm(f => ({ ...f, trade: v }))}>
                  <SelectTrigger className="rounded-sm text-sm"><SelectValue placeholder="Select trade" /></SelectTrigger>
                  <SelectContent>
                    {['Civil', 'Structural', 'MEP', 'Electrical', 'Plumbing', 'Painting', 'Flooring', 'Roofing', 'Interiors', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contract Details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Project</Label>
                <Select value={contractorForm.project_id} onValueChange={v => setContractorForm(f => ({ ...f, project_id: v }))}>
                  <SelectTrigger className="rounded-sm text-sm"><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={contractorForm.status} onValueChange={v => setContractorForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="rounded-sm text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{['active','completed','on_hold','terminated'].map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_',' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Fld label="Contract Value (₹) *" type="number" value={contractorForm.contract_value} onChange={v => setContractorForm(f => ({ ...f, contract_value: v }))} />
              <Fld label="Start Date" type="date" value={contractorForm.start_date} onChange={v => setContractorForm(f => ({ ...f, start_date: v }))} />
              <Fld label="End Date" type="date" value={contractorForm.end_date} onChange={v => setContractorForm(f => ({ ...f, end_date: v }))} />
            </div>

            {/* Roles Section */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide">Roles / Categories</Label>

              {/* Added roles list */}
              {contractorForm.roles.length > 0 && (
                <div className="space-y-1.5">
                  {contractorForm.roles.map((role, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-muted/40 rounded-sm px-3 py-1.5">
                      <span className="flex-1 text-sm font-medium">{role.category}</span>
                      <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-600" onClick={() => removeContractorRole(idx)}><X className="w-3 h-3" /></Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Select from existing */}
              <Select value="" onValueChange={v => { if (v) { addContractorRoleByName(v); } }}>
                <SelectTrigger className="rounded-sm text-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CONTRACTOR_ROLES_DEFAULT.filter(r => !contractorForm.roles.find(role => role.category === r)).map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Add new custom category */}
              <div className="flex gap-2">
                <Input
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addContractorRoleByName(newRoleName); } }}
                  placeholder="New category name (e.g. Mason)"
                  className="rounded-sm text-sm"
                />
                <Button type="button" variant="outline" className="rounded-sm shrink-0 px-3" onClick={() => addContractorRoleByName(newRoleName)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input value={contractorForm.notes} onChange={e => setContractorForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." className="rounded-sm text-sm" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="rounded-sm" onClick={() => setIsContractorDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="action-btn-accent rounded-sm" disabled={formLoading}>{formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingContractor ? 'Update' : 'Add Contractor'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Employee Dialog */}
      <Dialog open={isEmployeeDialogOpen} onOpenChange={v => { setIsEmployeeDialogOpen(v); if (!v) setEditingEmployee(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl font-bold uppercase">{editingEmployee ? 'Edit Employee' : 'Add Employee'}</DialogTitle></DialogHeader>
          <form onSubmit={handleEmployeeSubmit} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Full Name *" value={employeeForm.name} onChange={v => setEmployeeForm(f => ({ ...f, name: v }))} testId="employee-name-input" />
              <Fld label="Employee Code *" value={employeeForm.employee_code} onChange={v => setEmployeeForm(f => ({ ...f, employee_code: v }))} testId="employee-code-input" mono />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Email *" type="email" value={employeeForm.email} onChange={v => setEmployeeForm(f => ({ ...f, email: v }))} testId="employee-email-input" />
              <Fld label={editingEmployee ? "Password (leave blank to keep current)" : "Password *"} type="password" value={employeeForm.password} onChange={v => setEmployeeForm(f => ({ ...f, password: v }))} testId="employee-password-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Role *</label>
                <Select key={roles.length} value={employeeForm.role} onValueChange={v => setEmployeeForm(f => ({ ...f, role: v }))} required>
                  <SelectTrigger className="rounded-sm" data-testid="employee-role-select">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r.name} value={r.name}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Fld label="Phone *" value={employeeForm.phone} onChange={v => setEmployeeForm(f => ({ ...f, phone: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Designation *" value={employeeForm.designation} onChange={v => setEmployeeForm(f => ({ ...f, designation: v }))} />
              <Fld label="Department *" value={employeeForm.department} onChange={v => setEmployeeForm(f => ({ ...f, department: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Date of Joining *" type="date" value={employeeForm.date_of_joining} onChange={v => setEmployeeForm(f => ({ ...f, date_of_joining: v }))} />
              <Fld label="Basic Salary *" type="number" value={employeeForm.basic_salary} onChange={v => setEmployeeForm(f => ({ ...f, basic_salary: v }))} testId="employee-salary-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="HRA" type="number" value={employeeForm.hra} onChange={v => setEmployeeForm(f => ({ ...f, hra: v }))} />
              <Fld label="PF Number" value={employeeForm.pf_number} onChange={v => setEmployeeForm(f => ({ ...f, pf_number: v }))} mono />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="ESI Number" value={employeeForm.esi_number} onChange={v => setEmployeeForm(f => ({ ...f, esi_number: v }))} mono />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Fld label="Bank Account" value={employeeForm.bank_account} onChange={v => setEmployeeForm(f => ({ ...f, bank_account: v }))} mono />
              <Fld label="Bank Name" value={employeeForm.bank_name} onChange={v => setEmployeeForm(f => ({ ...f, bank_name: v }))} />
              <Fld label="IFSC" value={employeeForm.ifsc} onChange={v => setEmployeeForm(f => ({ ...f, ifsc: v }))} mono />
            </div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setIsEmployeeDialogOpen(false)} className="rounded-sm">Cancel</Button><Button type="submit" className="action-btn-accent rounded-sm" disabled={formLoading} data-testid="submit-employee-btn">{formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingEmployee ? 'Update' : 'Add Employee'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-lg font-bold uppercase">Mark Attendance</DialogTitle></DialogHeader>
          <form onSubmit={handleAttendanceSubmit} className="space-y-3 mt-2">
            <div className="space-y-1.5"><Label className="text-xs">Employee *</Label><Select value={attendanceForm.employee_id} onValueChange={v => setAttendanceForm(f => ({ ...f, employee_id: v }))}><SelectTrigger className="rounded-sm" data-testid="att-employee-select"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.employee_code})</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-xs">Project *</Label><Select value={attendanceForm.project_id} onValueChange={v => setAttendanceForm(f => ({ ...f, project_id: v }))}><SelectTrigger className="rounded-sm" data-testid="att-project-select"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Date *" type="date" value={attendanceForm.date} onChange={v => setAttendanceForm(f => ({ ...f, date: v }))} testId="att-date-input" />
              <div className="space-y-1.5"><Label className="text-xs">Status *</Label><Select value={attendanceForm.status} onValueChange={v => setAttendanceForm(f => ({ ...f, status: v }))}><SelectTrigger className="rounded-sm" data-testid="att-status-select"><SelectValue /></SelectTrigger><SelectContent>{['present', 'absent', 'half_day', 'leave'].map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Fld label="Check In" type="time" value={attendanceForm.check_in} onChange={v => setAttendanceForm(f => ({ ...f, check_in: v }))} />
              <Fld label="Check Out" type="time" value={attendanceForm.check_out} onChange={v => setAttendanceForm(f => ({ ...f, check_out: v }))} />
              <Fld label="OT Hours" type="number" value={attendanceForm.overtime_hours} onChange={v => setAttendanceForm(f => ({ ...f, overtime_hours: v }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setIsAttendanceDialogOpen(false)} className="rounded-sm">Cancel</Button><Button type="submit" className="action-btn-accent rounded-sm" disabled={formLoading} data-testid="submit-attendance-btn">{formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Labor Dialog */}
      <Dialog open={isLaborDialogOpen} onOpenChange={v => { setIsLaborDialogOpen(v); if (!v) { setEditingLabor(null); setNewCatName(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-lg font-bold uppercase">{editingLabor ? 'Edit Labor Entry' : 'Add Labor'}</DialogTitle></DialogHeader>
          <form onSubmit={handleLaborSubmit} className="space-y-4 mt-2">
            {/* Project */}
            <div className="space-y-1.5">
              <Label className="text-xs">Project *</Label>
              <Select value={laborForm.project_id} onValueChange={v => setLaborForm(f => ({ ...f, project_id: v }))} required>
                <SelectTrigger className="rounded-sm"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Category select + inline create */}
            <div className="space-y-2">
              <Label className="text-xs">Category / Role *</Label>
              <Select value={laborForm.category_id} onValueChange={v => setLaborForm(f => ({ ...f, category_id: v }))} required>
                <SelectTrigger className="rounded-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {laborCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {/* Inline new category */}
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="New category name (e.g. Mason)"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="rounded-sm text-sm h-8"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } }}
                />
                <Button type="button" variant="outline" size="sm" className="h-8 px-3 rounded-sm whitespace-nowrap" onClick={handleCreateCategory} disabled={catLoading || !newCatName.trim()}>
                  {catLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                </Button>
              </div>
              {laborCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {laborCategories.map(c => (
                    <Badge key={c.id} variant={laborForm.category_id === c.id ? 'default' : 'outline'} className="rounded-sm cursor-pointer text-xs flex items-center gap-1 pr-1" onClick={() => setLaborForm(f => ({ ...f, category_id: c.id }))}>
                      {c.name}
                      <span
                        className="ml-0.5 hover:text-red-500 transition-colors leading-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCatToDelete(c);
                          setDeleteCatDialogOpen(true);
                        }}
                      >×</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Day Rate */}
            <Fld label="Day Rate (₹) *" type="number" value={laborForm.day_rate} onChange={v => setLaborForm(f => ({ ...f, day_rate: v }))} />

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input value={laborForm.notes} onChange={e => setLaborForm(f => ({ ...f, notes: e.target.value }))} className="rounded-sm text-sm" placeholder="Optional notes" />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" className="rounded-sm" onClick={() => setIsLaborDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="action-btn-accent rounded-sm" disabled={formLoading || !laborForm.project_id || !laborForm.category_id}>
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingLabor ? 'Update' : 'Add Labor'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payroll Dialog */}
      <Dialog open={isPayrollDialogOpen} onOpenChange={setIsPayrollDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-lg font-bold uppercase">Process Payroll</DialogTitle></DialogHeader>
          <form onSubmit={handlePayrollSubmit} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Employee *</Label><Select value={payrollForm.employee_id} onValueChange={v => { const emp = employees.find(e => e.id === v); setPayrollForm(f => ({ ...f, employee_id: v, basic_salary: String(emp?.basic_salary || ''), hra: String(emp?.hra || 0) })); }}><SelectTrigger className="rounded-sm" data-testid="pay-employee-select"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
              <Fld label="Month *" type="month" value={payrollForm.month} onChange={v => setPayrollForm(f => ({ ...f, month: v }))} testId="pay-month-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Basic Salary *" type="number" value={payrollForm.basic_salary} onChange={v => setPayrollForm(f => ({ ...f, basic_salary: v }))} />
              <Fld label="HRA" type="number" value={payrollForm.hra} onChange={v => setPayrollForm(f => ({ ...f, hra: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Overtime Pay" type="number" value={payrollForm.overtime_pay} onChange={v => setPayrollForm(f => ({ ...f, overtime_pay: v }))} />
              <Fld label="Other Allowances" type="number" value={payrollForm.other_allowances} onChange={v => setPayrollForm(f => ({ ...f, other_allowances: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="PF Deduction" type="number" value={payrollForm.pf_deduction} onChange={v => setPayrollForm(f => ({ ...f, pf_deduction: v }))} />
              <Fld label="ESI Deduction" type="number" value={payrollForm.esi_deduction} onChange={v => setPayrollForm(f => ({ ...f, esi_deduction: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="TDS" type="number" value={payrollForm.tds} onChange={v => setPayrollForm(f => ({ ...f, tds: v }))} />
              <Fld label="Other Deductions" type="number" value={payrollForm.other_deductions} onChange={v => setPayrollForm(f => ({ ...f, other_deductions: v }))} />
            </div>
            {payrollForm.basic_salary && (
              <div className="p-3 bg-muted/50 rounded-sm text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Gross</span><span className="font-mono">{formatCurrency((+payrollForm.basic_salary || 0) + (+payrollForm.hra || 0) + (+payrollForm.overtime_pay || 0) + (+payrollForm.other_allowances || 0))}</span></div>
                <div className="flex justify-between text-red-600"><span>Deductions</span><span className="font-mono">{formatCurrency((+payrollForm.pf_deduction || 0) + (+payrollForm.esi_deduction || 0) + (+payrollForm.tds || 0) + (+payrollForm.other_deductions || 0))}</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Net Salary</span><span className="font-mono">{formatCurrency((+payrollForm.basic_salary || 0) + (+payrollForm.hra || 0) + (+payrollForm.overtime_pay || 0) + (+payrollForm.other_allowances || 0) - (+payrollForm.pf_deduction || 0) - (+payrollForm.esi_deduction || 0) - (+payrollForm.tds || 0) - (+payrollForm.other_deductions || 0))}</span></div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setIsPayrollDialogOpen(false)} className="rounded-sm">Cancel</Button><Button type="submit" className="action-btn-accent rounded-sm" disabled={formLoading} data-testid="submit-payroll-btn">{formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Process'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
      <DeleteConfirmationDialog
        open={deleteCatDialogOpen}
        onOpenChange={setDeleteCatDialogOpen}
        onConfirm={handleDeleteCategory}
        isDeleting={isDeletingCat}
        title={`Delete "${catToDelete?.name}"?`}
        description="This will permanently delete this labor category. This action cannot be undone."
      />

      <DeleteConfirmationDialog
        open={deleteLaborDialogOpen}
        onOpenChange={setDeleteLaborDialogOpen}
        onConfirm={deleteLabor}
        isDeleting={isDeletingLabor}
        title="Delete Labor Entry?"
        description="This will permanently delete this labor entry record."
      />

    </div>
  );
}

function Kpi({ label, value, icon: Icon, color }) {
  return <Card className="kpi-card"><CardContent className="p-3 flex items-center gap-2.5"><div className={`p-1.5 rounded-sm bg-${color}-100`}><Icon className={`w-4 h-4 text-${color}-600`} /></div><div><p className="text-[10px] text-muted-foreground uppercase leading-tight">{label}</p><p className="text-base font-bold leading-tight">{value}</p></div></CardContent></Card>;
}

function Fld({ label, value, onChange, type = 'text', testId, mono, disabled }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label><Input type={type} value={value || ''} onChange={e => onChange(e.target.value)} className={`rounded-sm text-sm ${mono ? 'font-mono' : ''}`} required={label.includes('*')} data-testid={testId} disabled={disabled} /></div>;
}

function RolesManager({ api, onRolesChange }) {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [deleteRoleDialogOpen, setDeleteRoleDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [isDeletingRole, setIsDeletingRole] = useState(false);

  const emptyPermissions = () => {
    const perms = {};
    Object.keys(MODULE_LABELS).forEach(m => { perms[m] = { view: false, create: false, edit: false, delete: false }; });
    return perms;
  };
  const [roleForm, setRoleForm] = useState({ name: '', label: '', description: '', permissions: emptyPermissions() });

  useEffect(() => { fetchRolesAndUsers(); }, []);

  const fetchRolesAndUsers = async () => {
    try {
      const [rRes, uRes] = await Promise.all([api.get('/roles'), api.get('/users')]);
      setRoles(rRes.data);
      setUsers(uRes.data);
    } catch { toast.error('Failed to load roles'); }
    finally { setLoading(false); }
  };

  const openCreateDialog = () => {
    setEditingRole(null);
    setRoleForm({ name: '', label: '', description: '', permissions: emptyPermissions() });
    setIsRoleDialogOpen(true);
  };

  const openEditDialog = (role) => {
    setEditingRole(role);
    const perms = emptyPermissions();
    if (role.permissions) {
      Object.entries(role.permissions).forEach(([mod, p]) => { if (perms[mod]) perms[mod] = { ...perms[mod], ...p }; });
    }
    setRoleForm({ name: role.name, label: role.label, description: role.description || '', permissions: perms });
    setIsRoleDialogOpen(true);
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, { label: roleForm.label, description: roleForm.description, permissions: roleForm.permissions });
        toast.success('Role updated');
      } else {
        await api.post('/roles', roleForm);
        toast.success('Role created');
      }
      setIsRoleDialogOpen(false);
      await fetchRolesAndUsers();
      await onRolesChange?.();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setFormLoading(false); }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    setIsDeletingRole(true);
    try {
      await api.delete(`/roles/${roleToDelete.id}`);
      toast.success('Role deleted');
      await fetchRolesAndUsers();
      await onRolesChange?.();
      setDeleteRoleDialogOpen(false);
    }
    catch (err) { toast.error(err.response?.data?.detail || 'Failed to delete'); }
    finally { setIsDeletingRole(false); }
  };

  const handleAssignRole = async (userId, newRole) => {
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      toast.success('Role updated');
      fetchRolesAndUsers();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to update role'); }
  };

  const togglePermission = (mod, action) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [mod]: { ...prev.permissions[mod], [action]: !prev.permissions[mod][action] }
      }
    }));
  };

  const setAllPermissions = (value) => {
    const perms = {};
    Object.keys(MODULE_LABELS).forEach(m => { perms[m] = { view: value, create: value, edit: value, delete: value }; });
    setRoleForm(f => ({ ...f, permissions: perms }));
  };

  const setViewOnly = () => {
    const perms = {};
    Object.keys(MODULE_LABELS).forEach(m => { perms[m] = { view: true, create: false, edit: false, delete: false }; });
    setRoleForm(f => ({ ...f, permissions: perms }));
  };

  if (loading) return <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Roles & Permissions</h3>
          <p className="text-sm text-muted-foreground">Manage roles and configure module-level permissions</p>
        </div>
        <Button className="action-btn action-btn-accent" onClick={openCreateDialog} data-testid="create-role-btn"><Plus className="w-4 h-4" />Create Role</Button>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {roles.map(role => (
          <Card key={role.id} className="rounded-sm" data-testid={`role-card-${role.name}`}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{role.label}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{role.description || 'No description'}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="text-[10px] rounded-sm font-mono">{role.name}</Badge>
                    {role.is_system && <Badge className="text-[10px] rounded-sm bg-blue-100 text-blue-700">System</Badge>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditDialog(role)} disabled={role.name === 'admin'} data-testid={`edit-role-${role.name}`}>
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                  {!role.is_system && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => { setRoleToDelete(role); setDeleteRoleDialogOpen(true); }} data-testid={`delete-role-${role.name}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              {/* Permission summary */}
              <div className="mt-3 pt-3 border-t flex flex-wrap gap-1">
                {Object.entries(role.permissions || {}).filter(([, perms]) => perms.view).map(([mod]) => (
                  <Badge key={mod} variant="outline" className="text-[10px] rounded-sm">{MODULE_LABELS[mod] || mod}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{users.filter(u => u.role === role.name).length} user(s)</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Role Assignment */}
      <Card className="rounded-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">User Role Assignment</CardTitle>
          <CardDescription>Change the role assigned to each user</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Current Role</TableHead>
              <TableHead>Assign Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                <TableCell className="font-medium text-sm">{u.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                <TableCell className="text-sm">{u.department || '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="rounded-sm text-xs">{roles.find(r => r.name === u.role)?.label || u.role}</Badge>
                </TableCell>
                <TableCell>
                  <Select value={u.role} onValueChange={(val) => handleAssignRole(u.id, val)} disabled={u.role === 'admin' && users.filter(x => x.role === 'admin').length <= 1}>
                    <SelectTrigger className="w-44 rounded-sm text-xs" data-testid={`assign-role-${u.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(r => <SelectItem key={r.name} value={r.name}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <DeleteConfirmationDialog
        open={deleteRoleDialogOpen}
        onOpenChange={setDeleteRoleDialogOpen}
        onConfirm={handleDeleteRole}
        isDeleting={isDeletingRole}
        title={`Delete Role "${roleToDelete?.label}"?`}
        description="This will permanently delete this role. Users assigned to this role may lose access."
      />

      {/* Create/Edit Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={v => { setIsRoleDialogOpen(v); if (!v) setEditingRole(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase">{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRoleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Role Name (slug) *" value={roleForm.name} onChange={v => setRoleForm(f => ({ ...f, name: v.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') }))} testId="role-name-input" mono disabled={!!editingRole} />
              <Fld label="Display Label *" value={roleForm.label} onChange={v => setRoleForm(f => ({ ...f, label: v }))} testId="role-label-input" />
            </div>
            <Fld label="Description" value={roleForm.description} onChange={v => setRoleForm(f => ({ ...f, description: v }))} testId="role-desc-input" />

            {/* Permission Matrix */}
            <div>
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Module Permissions</Label>
              <div className="border rounded-sm mt-2 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-40">Module</TableHead>
                      {Object.values(PERMISSION_LABELS).map(p => (
                        <TableHead key={p} className="text-center w-20">{p}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(MODULE_LABELS).map(([moduleKey, moduleLabel]) => (
                      <TableRow key={moduleKey}>
                        <TableCell className="font-medium text-sm">{moduleLabel}</TableCell>
                        {Object.keys(PERMISSION_LABELS).map(action => (
                          <TableCell key={action} className="text-center">
                            <Checkbox
                              checked={roleForm.permissions[moduleKey]?.[action] || false}
                              onCheckedChange={() => togglePermission(moduleKey, action)}
                              data-testid={`perm-${moduleKey}-${action}`}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex gap-2 mt-2">
                <Button type="button" variant="outline" size="sm" className="text-xs rounded-sm" onClick={() => setAllPermissions(true)}>Select All</Button>
                <Button type="button" variant="outline" size="sm" className="text-xs rounded-sm" onClick={() => setAllPermissions(false)}>Clear All</Button>
                <Button type="button" variant="outline" size="sm" className="text-xs rounded-sm" onClick={setViewOnly}>View Only</Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsRoleDialogOpen(false)} className="rounded-sm">Cancel</Button>
              <Button type="submit" className="action-btn-accent rounded-sm" disabled={formLoading} data-testid="submit-role-btn">
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingRole ? 'Update Role' : 'Create Role'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div >
  );
}

function EmployeeDetailView({ detail, onBack, onEdit, onDeactivate, canEdit, canDelete }) {
  const { employee: emp, attendance: att, payrolls: pays, stats } = detail;
  return (
    <div className="space-y-4" data-testid="employee-detail-view">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1" data-testid="back-to-employees-btn"><ArrowLeft className="w-4 h-4" />Back</Button>
        <div className="flex gap-2">
          {canEdit && <Button variant="outline" size="sm" className="rounded-sm gap-1" onClick={() => onEdit(emp)} data-testid="edit-employee-btn"><Edit3 className="w-4 h-4" />Edit</Button>}
          {canDelete && <Button variant="outline" size="sm" className="rounded-sm gap-1 text-red-500" onClick={() => onDeactivate(emp.id)} data-testid="deactivate-employee-btn"><XCircle className="w-4 h-4" />Deactivate</Button>}
        </div>
      </div>
      {/* Profile + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-sm lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-start gap-4 mb-4">
              <Avatar className="w-16 h-16"><AvatarFallback className="bg-accent text-accent-foreground text-xl">{getInitials(emp.name)}</AvatarFallback></Avatar>
              <div>
                <h2 className="text-xl font-bold">{emp.name}</h2>
                <p className="text-sm text-muted-foreground">{emp.designation} | {emp.department}</p>
                <Badge variant="outline" className="mt-1 font-mono text-xs rounded-sm">{emp.employee_code}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {[['Phone', emp.phone, Phone], ['Email', emp.email, Mail], ['Joined', formatDate(emp.date_of_joining), Calendar], ['Basic Salary', formatCurrency(emp.basic_salary), IndianRupee], ['HRA', formatCurrency(emp.hra || 0), IndianRupee], ['CTC', formatCurrency(emp.basic_salary + (emp.hra || 0)), IndianRupee]].map(([k, v, Icon]) => (
                <div key={k} className="flex items-start gap-2"><Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-xs text-muted-foreground">{k}</p><p className="font-medium">{v}</p></div></div>
              ))}
            </div>
            {(emp.pf_number || emp.esi_number || emp.bank_account) && (
              <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
                {emp.pf_number && <div><p className="text-xs text-muted-foreground">PF Number</p><p className="font-mono text-xs">{emp.pf_number}</p></div>}
                {emp.esi_number && <div><p className="text-xs text-muted-foreground">ESI Number</p><p className="font-mono text-xs">{emp.esi_number}</p></div>}
                {emp.bank_account && <div><p className="text-xs text-muted-foreground">Bank</p><p className="text-xs">{emp.bank_name} - <span className="font-mono">{emp.bank_account}</span></p></div>}
              </div>
            )}
          </CardContent>
        </Card>
        <div className="space-y-3">
          <Card className="rounded-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Attendance Rate</p><p className="text-2xl font-bold">{stats.attendance_rate}%</p><Progress value={stats.attendance_rate} className="h-1.5 mt-1" /><p className="text-xs text-muted-foreground mt-1">{stats.present} present / {stats.total_attendance} total</p></CardContent></Card>
          <Card className="rounded-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Overtime</p><p className="text-2xl font-bold">{stats.total_overtime}h</p></CardContent></Card>
          <Card className="rounded-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Total Paid</p><p className="text-2xl font-bold">{formatCurrency(stats.total_paid)}</p><p className="text-xs text-muted-foreground">{stats.total_payrolls} payslips</p></CardContent></Card>
        </div>
      </div>

      {/* Attendance History */}
      {att.length > 0 && (
        <Card className="rounded-sm"><CardHeader className="pb-2"><CardTitle className="text-base">Recent Attendance</CardTitle></CardHeader>
          <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Check In</TableHead><TableHead>Check Out</TableHead><TableHead>OT</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{att.slice(0, 15).map(a => (
              <TableRow key={a.id}><TableCell className="text-sm">{formatDate(a.date)}</TableCell><TableCell className="text-sm font-mono">{a.check_in || '-'}</TableCell><TableCell className="text-sm font-mono">{a.check_out || '-'}</TableCell><TableCell className="text-sm">{a.overtime_hours > 0 ? `${a.overtime_hours}h` : '-'}</TableCell><TableCell><Badge className={`${attStatusColors[a.status]} text-xs rounded-sm capitalize`}>{a.status.replace('_', ' ')}</Badge></TableCell></TableRow>
            ))}</TableBody></Table></Card>
      )}

      {/* Payroll History */}
      {pays.length > 0 && (
        <Card className="rounded-sm"><CardHeader className="pb-2"><CardTitle className="text-base">Payroll History</CardTitle></CardHeader>
          <Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Gross</TableHead><TableHead className="text-right">Deductions</TableHead><TableHead className="text-right">Net</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{pays.map(p => (
              <TableRow key={p.id}><TableCell className="text-sm">{p.month}</TableCell><TableCell className="text-right text-sm">{formatCurrency(p.gross_salary)}</TableCell><TableCell className="text-right text-sm text-red-600">{formatCurrency(p.total_deductions)}</TableCell><TableCell className="text-right text-sm font-bold">{formatCurrency(p.net_salary)}</TableCell><TableCell><Badge className={`${payStatusColors[p.status]} text-xs rounded-sm capitalize`}>{p.status}</Badge></TableCell></TableRow>
            ))}</TableBody></Table></Card>
      )}
    </div>
  );
}
