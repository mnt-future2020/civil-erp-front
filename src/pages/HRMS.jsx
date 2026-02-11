import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Users, Calendar, IndianRupee, Clock, Loader2,
  UserPlus, ClipboardCheck, Banknote, Eye, Edit3, Trash2,
  ArrowLeft, Phone, Mail, MapPin, Filter, CheckCircle2, XCircle,
  BarChart3, Building2, AlertTriangle
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
import { toast } from 'sonner';
import { formatCurrency, formatDate, getInitials } from '../lib/utils';

const attStatusColors = { present: 'bg-emerald-100 text-emerald-700', absent: 'bg-red-100 text-red-700', half_day: 'bg-amber-100 text-amber-700', leave: 'bg-blue-100 text-blue-700' };
const payStatusColors = { pending: 'bg-amber-100 text-amber-700', processed: 'bg-blue-100 text-blue-700', paid: 'bg-emerald-100 text-emerald-700' };
const payStatusFlow = { pending: 'processed', processed: 'paid' };

export default function HRMS() {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [projects, setProjects] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeDetail, setEmployeeDetail] = useState(null);

  const emptyEmpForm = { name: '', employee_code: '', designation: '', department: '', phone: '', email: '', date_of_joining: '', basic_salary: '', hra: '0', pf_number: '', esi_number: '', bank_account: '', bank_name: '', ifsc: '' };
  const [employeeForm, setEmployeeForm] = useState(emptyEmpForm);
  const [attendanceForm, setAttendanceForm] = useState({ employee_id: '', project_id: '', date: new Date().toISOString().slice(0, 10), check_in: '09:00', check_out: '18:00', status: 'present', overtime_hours: '0' });
  const [payrollForm, setPayrollForm] = useState({ employee_id: '', month: new Date().toISOString().slice(0, 7), basic_salary: '', hra: '0', overtime_pay: '0', other_allowances: '0', pf_deduction: '0', esi_deduction: '0', tds: '0', other_deductions: '0' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [eRes, aRes, pRes, prRes, dRes] = await Promise.all([
        api.get('/employees'), api.get('/attendance'), api.get('/payroll'),
        api.get('/projects'), api.get('/hrms/dashboard')
      ]);
      setEmployees(eRes.data); setAttendance(aRes.data); setPayrolls(pRes.data);
      setProjects(prRes.data); setDashboard(dRes.data);
    } catch { toast.error('Failed to load HRMS data'); }
    finally { setLoading(false); }
  };

  // Employee
  const handleEmployeeSubmit = async (e) => {
    e.preventDefault(); setFormLoading(true);
    try {
      const payload = { ...employeeForm, basic_salary: parseFloat(employeeForm.basic_salary), hra: parseFloat(employeeForm.hra) };
      if (editingEmployee) { await api.put(`/employees/${editingEmployee.id}`, payload); toast.success('Employee updated'); }
      else { await api.post('/employees', payload); toast.success('Employee added'); }
      setIsEmployeeDialogOpen(false); setEditingEmployee(null); setEmployeeForm(emptyEmpForm); fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); } finally { setFormLoading(false); }
  };
  const editEmployee = (emp) => {
    setEditingEmployee(emp);
    setEmployeeForm({ name: emp.name, employee_code: emp.employee_code, designation: emp.designation, department: emp.department, phone: emp.phone, email: emp.email, date_of_joining: emp.date_of_joining, basic_salary: String(emp.basic_salary), hra: String(emp.hra || 0), pf_number: emp.pf_number || '', esi_number: emp.esi_number || '', bank_account: emp.bank_account || '', bank_name: emp.bank_name || '', ifsc: emp.ifsc || '' });
    setIsEmployeeDialogOpen(true);
  };
  const deactivateEmployee = async (eid) => { try { await api.patch(`/employees/${eid}/deactivate`); toast.success('Employee deactivated'); setEmployeeDetail(null); fetchData(); } catch { toast.error('Failed'); } };
  const viewEmployeeDetail = async (eid) => { try { const res = await api.get(`/employees/${eid}/detail`); setEmployeeDetail(res.data); } catch { toast.error('Failed'); } };

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
          <TabsTrigger value="attendance" className="rounded-sm gap-1.5" data-testid="attendance-tab"><ClipboardCheck className="w-4 h-4" />Attendance ({attendance.length})</TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-sm gap-1.5" data-testid="payroll-tab"><Banknote className="w-4 h-4" />Payroll ({payrolls.length})</TabsTrigger>
        </TabsList>

        {/* ===== EMPLOYEES ===== */}
        <TabsContent value="employees" className="space-y-4">
          {employeeDetail ? (
            <EmployeeDetailView detail={employeeDetail} onBack={() => setEmployeeDetail(null)} onEdit={editEmployee} onDeactivate={deactivateEmployee} />
          ) : (
            <>
              <div className="flex flex-wrap gap-3 justify-between">
                <div className="flex gap-2 flex-1">
                  <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search employees..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 rounded-sm" data-testid="employee-search" /></div>
                  <Select value={deptFilter} onValueChange={setDeptFilter}><SelectTrigger className="w-44 rounded-sm text-sm" data-testid="dept-filter"><Filter className="w-4 h-4 mr-1" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Departments</SelectItem>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
                </div>
                <Button className="action-btn action-btn-accent" onClick={() => { setEditingEmployee(null); setEmployeeForm(emptyEmpForm); setIsEmployeeDialogOpen(true); }} data-testid="add-employee-btn"><UserPlus className="w-4 h-4" />Add Employee</Button>
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

        {/* ===== ATTENDANCE ===== */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="flex justify-end">
            <Button className="action-btn action-btn-accent" onClick={() => setIsAttendanceDialogOpen(true)} data-testid="mark-attendance-btn"><ClipboardCheck className="w-4 h-4" />Mark Attendance</Button>
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

        {/* ===== PAYROLL ===== */}
        <TabsContent value="payroll" className="space-y-4">
          <div className="flex justify-end">
            <Button className="action-btn action-btn-accent" onClick={() => setIsPayrollDialogOpen(true)} data-testid="create-payroll-btn"><Banknote className="w-4 h-4" />Process Payroll</Button>
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
                      {payStatusFlow[p.status] && (
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
      </Tabs>

      {/* Employee Dialog */}
      <Dialog open={isEmployeeDialogOpen} onOpenChange={v => { setIsEmployeeDialogOpen(v); if (!v) setEditingEmployee(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl font-bold uppercase">{editingEmployee ? 'Edit Employee' : 'Add Employee'}</DialogTitle></DialogHeader>
          <form onSubmit={handleEmployeeSubmit} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Full Name *" value={employeeForm.name} onChange={v => setEmployeeForm(f => ({...f, name: v}))} testId="employee-name-input" />
              <Fld label="Employee Code *" value={employeeForm.employee_code} onChange={v => setEmployeeForm(f => ({...f, employee_code: v}))} testId="employee-code-input" mono />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Designation *" value={employeeForm.designation} onChange={v => setEmployeeForm(f => ({...f, designation: v}))} />
              <Fld label="Department *" value={employeeForm.department} onChange={v => setEmployeeForm(f => ({...f, department: v}))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Fld label="Phone *" value={employeeForm.phone} onChange={v => setEmployeeForm(f => ({...f, phone: v}))} />
              <Fld label="Email *" type="email" value={employeeForm.email} onChange={v => setEmployeeForm(f => ({...f, email: v}))} testId="employee-email-input" />
              <Fld label="Date of Joining *" type="date" value={employeeForm.date_of_joining} onChange={v => setEmployeeForm(f => ({...f, date_of_joining: v}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Basic Salary *" type="number" value={employeeForm.basic_salary} onChange={v => setEmployeeForm(f => ({...f, basic_salary: v}))} testId="employee-salary-input" />
              <Fld label="HRA" type="number" value={employeeForm.hra} onChange={v => setEmployeeForm(f => ({...f, hra: v}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="PF Number" value={employeeForm.pf_number} onChange={v => setEmployeeForm(f => ({...f, pf_number: v}))} mono />
              <Fld label="ESI Number" value={employeeForm.esi_number} onChange={v => setEmployeeForm(f => ({...f, esi_number: v}))} mono />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Fld label="Bank Account" value={employeeForm.bank_account} onChange={v => setEmployeeForm(f => ({...f, bank_account: v}))} mono />
              <Fld label="Bank Name" value={employeeForm.bank_name} onChange={v => setEmployeeForm(f => ({...f, bank_name: v}))} />
              <Fld label="IFSC" value={employeeForm.ifsc} onChange={v => setEmployeeForm(f => ({...f, ifsc: v}))} mono />
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
            <div className="space-y-1.5"><Label className="text-xs">Employee *</Label><Select value={attendanceForm.employee_id} onValueChange={v => setAttendanceForm(f => ({...f, employee_id: v}))}><SelectTrigger className="rounded-sm" data-testid="att-employee-select"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.employee_code})</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-xs">Project *</Label><Select value={attendanceForm.project_id} onValueChange={v => setAttendanceForm(f => ({...f, project_id: v}))}><SelectTrigger className="rounded-sm" data-testid="att-project-select"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Date *" type="date" value={attendanceForm.date} onChange={v => setAttendanceForm(f => ({...f, date: v}))} testId="att-date-input" />
              <div className="space-y-1.5"><Label className="text-xs">Status *</Label><Select value={attendanceForm.status} onValueChange={v => setAttendanceForm(f => ({...f, status: v}))}><SelectTrigger className="rounded-sm" data-testid="att-status-select"><SelectValue /></SelectTrigger><SelectContent>{['present','absent','half_day','leave'].map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_',' ')}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Fld label="Check In" type="time" value={attendanceForm.check_in} onChange={v => setAttendanceForm(f => ({...f, check_in: v}))} />
              <Fld label="Check Out" type="time" value={attendanceForm.check_out} onChange={v => setAttendanceForm(f => ({...f, check_out: v}))} />
              <Fld label="OT Hours" type="number" value={attendanceForm.overtime_hours} onChange={v => setAttendanceForm(f => ({...f, overtime_hours: v}))} />
            </div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setIsAttendanceDialogOpen(false)} className="rounded-sm">Cancel</Button><Button type="submit" className="action-btn-accent rounded-sm" disabled={formLoading} data-testid="submit-attendance-btn">{formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payroll Dialog */}
      <Dialog open={isPayrollDialogOpen} onOpenChange={setIsPayrollDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-lg font-bold uppercase">Process Payroll</DialogTitle></DialogHeader>
          <form onSubmit={handlePayrollSubmit} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Employee *</Label><Select value={payrollForm.employee_id} onValueChange={v => { const emp = employees.find(e => e.id === v); setPayrollForm(f => ({...f, employee_id: v, basic_salary: String(emp?.basic_salary || ''), hra: String(emp?.hra || 0)})); }}><SelectTrigger className="rounded-sm" data-testid="pay-employee-select"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
              <Fld label="Month *" type="month" value={payrollForm.month} onChange={v => setPayrollForm(f => ({...f, month: v}))} testId="pay-month-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Basic Salary *" type="number" value={payrollForm.basic_salary} onChange={v => setPayrollForm(f => ({...f, basic_salary: v}))} />
              <Fld label="HRA" type="number" value={payrollForm.hra} onChange={v => setPayrollForm(f => ({...f, hra: v}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Overtime Pay" type="number" value={payrollForm.overtime_pay} onChange={v => setPayrollForm(f => ({...f, overtime_pay: v}))} />
              <Fld label="Other Allowances" type="number" value={payrollForm.other_allowances} onChange={v => setPayrollForm(f => ({...f, other_allowances: v}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="PF Deduction" type="number" value={payrollForm.pf_deduction} onChange={v => setPayrollForm(f => ({...f, pf_deduction: v}))} />
              <Fld label="ESI Deduction" type="number" value={payrollForm.esi_deduction} onChange={v => setPayrollForm(f => ({...f, esi_deduction: v}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="TDS" type="number" value={payrollForm.tds} onChange={v => setPayrollForm(f => ({...f, tds: v}))} />
              <Fld label="Other Deductions" type="number" value={payrollForm.other_deductions} onChange={v => setPayrollForm(f => ({...f, other_deductions: v}))} />
            </div>
            {payrollForm.basic_salary && (
              <div className="p-3 bg-muted/50 rounded-sm text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Gross</span><span className="font-mono">{formatCurrency((+payrollForm.basic_salary||0)+(+payrollForm.hra||0)+(+payrollForm.overtime_pay||0)+(+payrollForm.other_allowances||0))}</span></div>
                <div className="flex justify-between text-red-600"><span>Deductions</span><span className="font-mono">{formatCurrency((+payrollForm.pf_deduction||0)+(+payrollForm.esi_deduction||0)+(+payrollForm.tds||0)+(+payrollForm.other_deductions||0))}</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Net Salary</span><span className="font-mono">{formatCurrency((+payrollForm.basic_salary||0)+(+payrollForm.hra||0)+(+payrollForm.overtime_pay||0)+(+payrollForm.other_allowances||0)-(+payrollForm.pf_deduction||0)-(+payrollForm.esi_deduction||0)-(+payrollForm.tds||0)-(+payrollForm.other_deductions||0))}</span></div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setIsPayrollDialogOpen(false)} className="rounded-sm">Cancel</Button><Button type="submit" className="action-btn-accent rounded-sm" disabled={formLoading} data-testid="submit-payroll-btn">{formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Process'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, color }) {
  return <Card className="kpi-card"><CardContent className="p-3 flex items-center gap-2.5"><div className={`p-1.5 rounded-sm bg-${color}-100`}><Icon className={`w-4 h-4 text-${color}-600`} /></div><div><p className="text-[10px] text-muted-foreground uppercase leading-tight">{label}</p><p className="text-base font-bold leading-tight">{value}</p></div></CardContent></Card>;
}

function Fld({ label, value, onChange, type = 'text', testId, mono }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label><Input type={type} value={value || ''} onChange={e => onChange(e.target.value)} className={`rounded-sm text-sm ${mono ? 'font-mono' : ''}`} required={label.includes('*')} data-testid={testId} /></div>;
}

function EmployeeDetailView({ detail, onBack, onEdit, onDeactivate }) {
  const { employee: emp, attendance: att, payrolls: pays, stats } = detail;
  return (
    <div className="space-y-4" data-testid="employee-detail-view">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1" data-testid="back-to-employees-btn"><ArrowLeft className="w-4 h-4" />Back</Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-sm gap-1" onClick={() => onEdit(emp)} data-testid="edit-employee-btn"><Edit3 className="w-4 h-4" />Edit</Button>
          <Button variant="outline" size="sm" className="rounded-sm gap-1 text-red-500" onClick={() => onDeactivate(emp.id)} data-testid="deactivate-employee-btn"><XCircle className="w-4 h-4" />Deactivate</Button>
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
              <TableRow key={a.id}><TableCell className="text-sm">{formatDate(a.date)}</TableCell><TableCell className="text-sm font-mono">{a.check_in || '-'}</TableCell><TableCell className="text-sm font-mono">{a.check_out || '-'}</TableCell><TableCell className="text-sm">{a.overtime_hours > 0 ? `${a.overtime_hours}h` : '-'}</TableCell><TableCell><Badge className={`${attStatusColors[a.status]} text-xs rounded-sm capitalize`}>{a.status.replace('_',' ')}</Badge></TableCell></TableRow>
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
