import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Toaster } from '../ui/sonner';

export const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="main-content lg:ml-64">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="page-container animate-fade-in">
          {children}
        </main>
      </div>

      <Toaster position="top-right" richColors />
      
      {/* Noise overlay for texture */}
      <div className="noise-overlay" aria-hidden="true" />
    </div>
  );
};

export default Layout;
