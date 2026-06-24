import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AIOrb } from '../agents/AIOrb';
import './AppShell.css';

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="app-main">
        <TopBar onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="app-content">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
      <AIOrb />
    </div>
  );
}
