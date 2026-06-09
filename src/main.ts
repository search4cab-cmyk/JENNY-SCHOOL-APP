import './styles/variables.css';
import './styles/layout.css';
import './styles/components.css';

import { createIcons, LayoutDashboard, Users, CreditCard, FileBarChart, Settings, ShieldAlert, Menu, X, LogOut } from 'lucide';
import { ApiService } from './services/api';
import { AuthComponent } from './components/Auth';
import { DashboardComponent } from './components/Dashboard';
import { LandlordsComponent } from './components/Landlords';
import { PaymentsComponent } from './components/Payments';
import { ReportsComponent } from './components/Reports';
import { UsersComponent } from './components/Users';
import { SettingsComponent } from './components/Settings';
import { AuditLogsComponent } from './components/AuditLogs';
import { hasPermission } from './utils/permissions';
import { supabase } from './services/supabase';

async function initApp() {
  const appElement = document.querySelector<HTMLDivElement>('#app')!;
  const currentSession = await ApiService.getCurrentSession();

  if (!currentSession) {
    AuthComponent.render(appElement);
    return;
  }

  // Define sidebar links dynamically based on RBAC
  const navLinks: { id: string, label: string, icon: string, permission?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { id: 'landlords', label: 'Landlords', icon: 'users', permission: 'viewLandlords' },
    { id: 'payments', label: 'Payments', icon: 'credit-card', permission: 'viewPayments' },
    { id: 'reports', label: 'Reports', icon: 'file-bar-chart', permission: 'viewReports' },
    { id: 'users', label: 'User Management', icon: 'shield-alert', permission: 'manageUsers' },
    { id: 'settings', label: 'Settings', icon: 'settings', permission: 'manageSettings' },
    { id: 'audit', label: 'Audit Logs', icon: 'file-bar-chart', permission: 'viewAuditLogs' }
  ];

  const allowedLinks = navLinks.filter(link => !link.permission || hasPermission(currentSession, link.permission as any));

  appElement.innerHTML = `
    <div class="app-container">
      <div class="sidebar-overlay" id="sidebarOverlay"></div>
      
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="logo-container">
            <div style="width: 32px; height: 32px; background: var(--primary); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;">
              <i data-lucide="shield-alert"></i>
            </div>
            <span>Estate Secure</span>
          </div>
        </div>
        <nav class="nav-menu">
          ${allowedLinks.map(link => `
            <a href="#${link.id}" class="nav-item" data-route="${link.id}">
              <i data-lucide="${link.icon}"></i>
              ${link.label}
            </a>
          `).join('')}
          <div style="flex-grow: 1;"></div>
          <button id="logoutBtn" class="nav-item" style="border: none; background: none; width: 100%; text-align: left; cursor: pointer;">
            <i data-lucide="log-out"></i>
            Logout
          </button>
        </nav>
      </aside>

      <main class="main-content">
        <header class="top-header">
          <div class="d-flex align-center gap-4">
            <button class="mobile-toggle" id="mobileToggle">
              <i data-lucide="menu"></i>
            </button>
            <h2 id="pageTitle" style="font-size: 1.25rem; font-weight: 600;">Dashboard</h2>
          </div>
          
          <div class="header-right">
            <span class="badge badge-primary d-sm-none">${currentSession.role.replace('_', ' ')}</span>
            <div class="user-profile">
              <div class="avatar">${(currentSession.user.full_name || currentSession.user.email)?.charAt(0).toUpperCase() || 'U'}</div>
              <span style="font-weight: 500; font-size: 0.9rem;" class="d-sm-none">${currentSession.user.full_name || currentSession.user.email}</span>
            </div>
          </div>
        </header>

        <div class="page-content" id="pageContent">
          <!-- Content injected here -->
        </div>
      </main>
    </div>
  `;

  createIcons({
    icons: { LayoutDashboard, Users, CreditCard, FileBarChart, Settings, ShieldAlert, Menu, X, LogOut }
  });

  // Mobile Sidebar Logic
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const toggleBtn = document.getElementById('mobileToggle');

  const closeSidebar = () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('open');
  };

  toggleBtn?.addEventListener('click', () => {
    sidebar?.classList.add('open');
    overlay?.classList.add('open');
  });

  overlay?.addEventListener('click', closeSidebar);

  // Logout Logic
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.hash = '';
    window.location.reload();
  });

  // Routing Logic
  const pageContent = document.getElementById('pageContent')!;
  const pageTitle = document.getElementById('pageTitle')!;

  const renderAccessDenied = () => {
    pageContent.innerHTML = `
      <div class="card text-center py-6">
        <i data-lucide="shield-alert" style="width: 48px; height: 48px; color: var(--danger); margin-bottom: 16px;"></i>
        <h2 style="color: var(--danger);">Access Denied</h2>
        <p class="text-muted mt-2">You do not have permission to view this module.</p>
      </div>
    `;
    createIcons({ icons: { ShieldAlert } });
  };

  const handleRoute = async () => {
    const hash = window.location.hash.slice(1) || 'dashboard';
    
    // Close sidebar on mobile navigation
    closeSidebar();

    // Update active nav state
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('data-route') === hash) el.classList.add('active');
      else el.classList.remove('active');
    });

    const routeMap: Record<string, string> = {
      dashboard: 'Dashboard', landlords: 'Landlords', payments: 'Payments', 
      reports: 'Reports', users: 'User Management', settings: 'Settings', audit: 'Audit Logs'
    };
    pageTitle.textContent = routeMap[hash] || 'Dashboard';

    try {
      switch (hash) {
        case 'dashboard':
          await DashboardComponent.render(pageContent, currentSession);
          break;
        case 'landlords':
          if (!hasPermission(currentSession, 'viewLandlords')) return renderAccessDenied();
          await LandlordsComponent.render(pageContent, currentSession);
          break;
        case 'payments':
          if (!hasPermission(currentSession, 'viewPayments')) return renderAccessDenied();
          await PaymentsComponent.render(pageContent, currentSession);
          break;
        case 'reports':
          if (!hasPermission(currentSession, 'viewReports')) return renderAccessDenied();
          await ReportsComponent.render(pageContent, currentSession);
          break;
        case 'users':
          if (!hasPermission(currentSession, 'manageUsers')) return renderAccessDenied();
          await UsersComponent.render(pageContent, currentSession);
          break;
        case 'settings':
          if (!hasPermission(currentSession, 'manageSettings')) return renderAccessDenied();
          await SettingsComponent.render(pageContent, currentSession);
          break;
        case 'audit':
          if (!hasPermission(currentSession, 'viewAuditLogs')) return renderAccessDenied();
          await AuditLogsComponent.render(pageContent, currentSession);
          break;
        default:
          await DashboardComponent.render(pageContent, currentSession);
      }
    } catch (e) {
      console.error(e);
      pageContent.innerHTML = `<div class="card text-danger">Failed to load module.</div>`;
    }
  };

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

initApp();
