import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  IndianRupee, 
  ShoppingCart, 
  Users, 
  FileText, 
  Bot, 
  Settings,
  Building2,
  X,
  LogOut,
  BarChart3,
  Receipt
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

const navItems = [
  { 
    path: '/dashboard', 
    icon: LayoutDashboard, 
    label: 'Dashboard',
    roles: ['admin', 'site_engineer', 'finance', 'procurement']
  },
  { 
    path: '/projects', 
    icon: FolderKanban, 
    label: 'Projects',
    roles: ['admin', 'site_engineer', 'finance', 'procurement']
  },
  { 
    path: '/financial', 
    icon: IndianRupee, 
    label: 'Financial',
    roles: ['admin', 'finance']
  },
  { 
    path: '/procurement', 
    icon: ShoppingCart, 
    label: 'Procurement',
    roles: ['admin', 'procurement']
  },
  { 
    path: '/hrms', 
    icon: Users, 
    label: 'HRMS',
    roles: ['admin']
  },
  { 
    path: '/compliance', 
    icon: FileText, 
    label: 'Compliance',
    roles: ['admin', 'finance']
  },
  { 
    path: '/einvoicing', 
    icon: Receipt, 
    label: 'E-Invoicing',
    roles: ['admin', 'finance']
  },
  { 
    path: '/reports', 
    icon: BarChart3, 
    label: 'Reports',
    roles: ['admin', 'site_engineer', 'finance', 'procurement']
  },
  { 
    path: '/ai-assistant', 
    icon: Bot, 
    label: 'AI Assistant',
    roles: ['admin', 'site_engineer', 'finance', 'procurement']
  },
  { 
    path: '/settings', 
    icon: Settings, 
    label: 'Settings',
    roles: ['admin']
  },
];

export const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed top-0 left-0 h-screen w-64 bg-slate-900 text-slate-100 z-50",
          "transform transition-transform duration-300 ease-in-out",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-amber-500 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">CIVIL ERP</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Construction Management</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-1 rounded-sm hover:bg-slate-800"
            data-testid="sidebar-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="py-4 flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    className={cn(
                      "sidebar-item",
                      isActive && "active"
                    )}
                  >
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-slate-700 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-sm bg-slate-700 flex items-center justify-center text-sm font-semibold">
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={logout}
            data-testid="logout-btn"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
