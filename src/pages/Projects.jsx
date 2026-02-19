import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  MapPin,
  Calendar,
  IndianRupee,
  Users,
  ChevronRight,
  Building2,
  Loader2,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatCurrency, formatDate, getStatusColor, projectStatusLabels } from '../lib/utils';

export default function Projects() {
  const navigate = useNavigate();
  const { api, user, hasPermission } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const searchDebounce = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    client_name: '',
    location: '',
    start_date: '',
    expected_end_date: '',
    budget: ''
  });

  useEffect(() => {
    fetchProjects(page, statusFilter, searchQuery);
  }, [page, statusFilter]);

  // Debounced search: reset to page 1 and fetch
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      fetchProjects(1, statusFilter, val);
    }, 400);
  };

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  const fetchProjects = async (pg = page, st = statusFilter, sq = searchQuery) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: 10 });
      if (st && st !== 'all') params.set('status', st);
      if (sq) params.set('search', sq);
      const response = await api.get(`/projects?${params.toString()}`);
      const { data, total: tot, pages } = response.data;
      setProjects(data);
      setTotal(tot);
      setTotalPages(pages);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const payload = {
        ...formData,
        budget: parseFloat(formData.budget)
      };

      await api.post('/projects', payload);
      toast.success('Project created successfully');
      setIsDialogOpen(false);
      setFormData({
        name: '',
        code: '',
        description: '',
        client_name: '',
        location: '',
        start_date: '',
        expected_end_date: '',
        budget: ''
      });
      setPage(1);
      fetchProjects(1, statusFilter, searchQuery);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create project');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="projects-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Manage all construction projects</p>
        </div>

        {hasPermission('projects', 'create') && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="action-btn action-btn-accent" data-testid="create-project-btn">
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold uppercase tracking-wide">Create New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Metro Station Phase 1"
                      required
                      className="rounded-sm"
                      data-testid="project-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Project Code *</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="PRJ-2026-001"
                      required
                      className="rounded-sm"
                      data-testid="project-code-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief project description"
                    className="rounded-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Client Name *</Label>
                    <Input
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      placeholder="CMRL Chennai"
                      required
                      className="rounded-sm"
                      data-testid="project-client-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location *</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Chennai, Tamil Nadu"
                      required
                      className="rounded-sm"
                      data-testid="project-location-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                      className="rounded-sm"
                      data-testid="project-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date *</Label>
                    <Input
                      type="date"
                      value={formData.expected_end_date}
                      onChange={(e) => setFormData({ ...formData, expected_end_date: e.target.value })}
                      required
                      className="rounded-sm"
                      data-testid="project-end-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Budget (INR) *</Label>
                    <Input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      placeholder="10000000"
                      required
                      className="rounded-sm"
                      data-testid="project-budget-input"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-sm">
                    Cancel
                  </Button>
                  <Button type="submit" className="action-btn-accent rounded-sm" disabled={formLoading} data-testid="submit-project-btn">
                    {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Project'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 rounded-sm"
            data-testid="projects-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-48 rounded-sm" data-testid="status-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card className="rounded-sm">
          <CardContent className="empty-state py-16">
            <Building2 className="empty-state-icon" />
            <p className="empty-state-title">No projects found</p>
            <p className="empty-state-description">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first project'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="rounded-sm card-hover cursor-pointer group"
              onClick={() => navigate(`/projects/${project.code}`)}
              data-testid={`project-card-${project.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-muted-foreground">{project.code}</p>
                    <CardTitle className="text-lg font-bold truncate mt-1">{project.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.code}`); }}>View Details</DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.code}?action=edit`); }}>Edit Project</DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.code}?tab=tasks&action=add-task`); }}>Add Task</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Badge className={`status-badge ${getStatusColor(project.status)}`}>
                  {projectStatusLabels[project.status] || project.status}
                </Badge>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span className="truncate">{project.client_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{project.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(project.start_date)} - {formatDate(project.expected_end_date)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">{project.progress_percentage || 0}%</span>
                  </div>
                  <Progress value={project.progress_percentage || 0} className="h-2" />
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Credit</p>
                    <p className="font-semibold text-sm">{formatCurrency(project.budget)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Debit</p>
                    <p className="font-semibold text-sm">{formatCurrency(project.actual_cost)}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total} projects
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </Button>
            <span className="text-sm font-medium px-2">
              Page {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
