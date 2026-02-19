import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, Download, ChevronLeft, ChevronRight, LogIn, LogOut,
  Plus, Edit3, Trash2, Eye, Clock, User, Shield, Monitor, Smartphone, Tablet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';

const ACTION_CONFIG = {
  LOGIN:  { label: 'Login',  color: 'bg-blue-100 text-blue-700',    icon: LogIn },
  LOGOUT: { label: 'Logout', color: 'bg-slate-100 text-slate-600',  icon: LogOut },
  CREATE: { label: 'Create', color: 'bg-emerald-100 text-emerald-700', icon: Plus },
  UPDATE: { label: 'Update', color: 'bg-amber-100 text-amber-700',  icon: Edit3 },
  DELETE: { label: 'Delete', color: 'bg-red-100 text-red-700',      icon: Trash2 },
  VIEW:   { label: 'View',   color: 'bg-slate-100 text-slate-600',  icon: Eye },
};

const MODULES = [
  { value: 'auth', label: 'Login' },
  { value: 'projects', label: 'Projects' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'financial', label: 'Financial' },
  { value: 'hrms', label: 'HRMS' },
  { value: 'contractors', label: 'Contractors' },
  { value: 'documents', label: 'Documents' },
  { value: 'rbac', label: 'Roles & Access' },
];

const DEVICE_ICONS = {
  Desktop: Monitor,
  Mobile: Smartphone,
  Tablet: Tablet,
};

export default function AuditLogs() {
  const { api } = useAuth();
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0, limit: 25 });
  const [loading, setLoading] = useState(true);
  const [perPage, setPerPage] = useState(25);

  // Filters
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLogs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: perPage });
      if (moduleFilter && moduleFilter !== 'all') params.append('module', moduleFilter);
      if (actionFilter && actionFilter !== 'all') params.append('action', actionFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(res.data.data);
      setMeta({ page: res.data.page, pages: res.data.pages, total: res.data.total, limit: res.data.limit });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [api, moduleFilter, actionFilter, dateFrom, dateTo, search, perPage]);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  const formatTimestamp = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) +
      ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  };

  const exportCSV = () => {
    if (!logs.length) return;
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Module', 'Resource', 'Description', 'IP Address', 'Device', 'OS', 'Browser'];
    const rows = logs.map(l => [
      formatTimestamp(l.timestamp), l.user_name, l.user_role, l.action,
      l.module, l.resource, `"${(l.description || '').replace(/"/g, '""')}"`, l.ip_address || '-',
      l.device?.device || '-', l.device?.os || '-', l.device?.browser || '-'
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6" />Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track all user actions across the system</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-sm gap-1" onClick={exportCSV} disabled={!logs.length}>
          <Download className="w-4 h-4" />Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="rounded-sm">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search descriptions..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 rounded-sm"
              />
            </div>
            <Select value={moduleFilter} onValueChange={v => setModuleFilter(v)}>
              <SelectTrigger className="w-[150px] rounded-sm"><SelectValue placeholder="Module" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {MODULES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={v => setActionFilter(v)}>
              <SelectTrigger className="w-[130px] rounded-sm"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {Object.entries(ACTION_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[150px] rounded-sm" placeholder="From" />
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[150px] rounded-sm" placeholder="To" />
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(ACTION_CONFIG).map(([key, cfg]) => {
          const count = logs.filter(l => l.action === key).length;
          const Icon = cfg.icon;
          return (
            <Card key={key} className="rounded-sm">
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${cfg.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{cfg.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card className="rounded-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase text-muted-foreground">
            Activity Log — {meta.total} entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Clock className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Shield className="w-10 h-10 opacity-30" />
              <p className="text-sm">No audit logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Timestamp</TableHead>
                    <TableHead className="w-[130px]">User</TableHead>
                    <TableHead className="w-[90px]">Action</TableHead>
                    <TableHead className="w-[110px]">Module</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[110px]">IP Address</TableHead>
                    <TableHead className="w-[140px]">Device</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.VIEW;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(log.timestamp)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium leading-none">{log.user_name}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{log.user_role}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${cfg.color} rounded-sm text-[10px] font-semibold`}>{cfg.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs capitalize">{log.module === 'auth' ? 'Login' : log.module}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">/ {log.resource}</span>
                        </TableCell>
                        <TableCell className="text-sm max-w-[300px] truncate">{log.description}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{log.ip_address || '-'}</TableCell>
                        <TableCell>
                          {log.device ? (() => {
                            const DevIcon = DEVICE_ICONS[log.device.device] || Monitor;
                            return (
                              <div className="flex items-center gap-1.5">
                                <DevIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                <div>
                                  <p className="text-xs font-medium leading-none">{log.device.os}</p>
                                  <p className="text-[10px] text-muted-foreground">{log.device.browser} · {log.device.device}</p>
                                </div>
                              </div>
                            );
                          })() : <span className="text-xs text-muted-foreground">-</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rows per page</span>
              <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); }}>
                <SelectTrigger className="w-[70px] h-8 rounded-sm text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground ml-2">{meta.total} total entries</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-sm h-8 w-8 p-0" disabled={meta.page === 1} onClick={() => fetchLogs(meta.page - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Page {meta.page} of {meta.pages}</span>
              <Button variant="outline" size="sm" className="rounded-sm h-8 w-8 p-0" disabled={meta.page >= meta.pages} onClick={() => fetchLogs(meta.page + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
