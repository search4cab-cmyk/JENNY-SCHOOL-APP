import { ApiService } from '../services/api';
import type { AuthSession } from '../types';

export class UsersComponent {
  static async render(container: HTMLElement, session: AuthSession) {
    container.innerHTML = '<div class="text-center text-muted">Loading user management...</div>';

    try {
      const users = await ApiService.fetchUsers(session.estate_id);

      const tableRows = users.map(u => {
        const profile = u.profiles;
        const isSelf = u.user_id === session.user.id;
        
        return `
          <tr>
            <td>
              <div style="font-weight: 600;">${profile?.full_name || 'No Name'}</div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">${profile?.email}</div>
            </td>
            <td>
              <select class="form-control role-select" data-id="${u.user_id}" style="width: auto; padding: 6px 12px;" ${isSelf ? 'disabled' : ''}>
                <option value="SUPER_ADMIN" ${u.role === 'SUPER_ADMIN' ? 'selected' : ''}>Super Admin</option>
                <option value="ESTATE_MANAGER" ${u.role === 'ESTATE_MANAGER' ? 'selected' : ''}>Estate Manager</option>
                <option value="ACCOUNT_OFFICER" ${u.role === 'ACCOUNT_OFFICER' ? 'selected' : ''}>Treasurer / Accountant</option>
                <option value="VIEW_ONLY" ${u.role === 'VIEW_ONLY' ? 'selected' : ''}>View Only</option>
                <option value="DEACTIVATED" ${u.role === 'DEACTIVATED' ? 'selected' : ''}>Deactivated (Suspended)</option>
              </select>
            </td>
            <td>${new Date(profile?.created_at).toLocaleDateString()}</td>
            <td>
              ${u.role === 'DEACTIVATED' 
                ? '<span class="badge badge-danger">Suspended</span>' 
                : '<span class="badge badge-success">Active</span>'}
            </td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <div class="d-flex justify-between align-center mb-6">
          <div>
            <h3 style="font-size: 1.1rem;">User Management</h3>
            <p class="text-muted" style="font-size: 0.9rem;">Assign strict RBAC roles or deactivate users.</p>
          </div>
          <button class="btn btn-primary" onclick="alert('To add users securely, have them sign up on the login page. Once registered, they appear here for you to assign an administrative role.')">
            <i data-lucide="user-plus"></i> Invite User
          </button>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>User Details</th>
                <th>Access Role</th>
                <th>Joined Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      `;

      const { createIcons, UserPlus } = await import('lucide');
      createIcons({ icons: { UserPlus } });

      // Handle Role Change
      document.querySelectorAll('.role-select').forEach(select => {
        select.addEventListener('change', async (e) => {
          const target = e.target as HTMLSelectElement;
          const userId = target.getAttribute('data-id')!;
          const newRole = target.value;
          
          target.disabled = true;
          try {
            await ApiService.updateUserRole(userId, session.estate_id, newRole);
            await ApiService.logAudit(session.estate_id, 'CHANGE_ROLE', `Changed User ${userId} to ${newRole}`);
            window.location.reload();
          } catch (err) {
            alert('Failed to update role');
            target.disabled = false;
          }
        });
      });

    } catch (e) {
      container.innerHTML = `<div class="card text-danger">${e}</div>`;
    }
  }
}
