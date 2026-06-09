import type { AuthSession, UserRole } from '../types';

export interface Permissions {
  manageUsers: boolean;
  manageSettings: boolean;
  viewAuditLogs: boolean;
  
  manageLandlords: boolean;
  viewLandlords: boolean;
  
  managePayments: boolean;
  viewPayments: boolean;
  
  generateReports: boolean;
  viewReports: boolean;
  
  generateReceipts: boolean;
  generateInvoices: boolean;
  generateStatements: boolean;
}

export function getPermissions(role: UserRole): Permissions {
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isManager = role === 'ESTATE_MANAGER';
  const isTreasurer = role === 'ACCOUNT_OFFICER';

  return {
    manageUsers: isSuperAdmin,
    manageSettings: isSuperAdmin,
    viewAuditLogs: isSuperAdmin,
    
    manageLandlords: isSuperAdmin || isManager,
    viewLandlords: true, // Everyone can view
    
    managePayments: isSuperAdmin || isManager || isTreasurer,
    viewPayments: isSuperAdmin || isManager || isTreasurer,
    
    generateReports: isSuperAdmin || isManager || isTreasurer,
    viewReports: true, // Everyone can view reports
    
    generateReceipts: isSuperAdmin || isManager || isTreasurer,
    generateInvoices: isSuperAdmin || isManager || isTreasurer,
    generateStatements: isSuperAdmin || isManager || isTreasurer
  };
}

export function hasPermission(session: AuthSession | null, permission: keyof Permissions): boolean {
  if (!session) return false;
  const perms = getPermissions(session.role);
  return perms[permission] === true;
}
