import { ApiService } from '../services/api';
import type { AuthSession } from '../types';

export class AuditLogsComponent {
  static async render(container: HTMLElement, session: AuthSession) {
    container.innerHTML = '<div class="text-center text-muted">Loading audit logs...</div>';

    try {
      const logs = await ApiService.fetchAuditLogs(session.estate_id);

      const tableRows = logs.map(log => {
        const dateObj = new Date(log.timestamp);
        const dateStr = dateObj.toLocaleDateString();
        const timeStr = dateObj.toLocaleTimeString();

        return `
          <tr>
            <td style="font-weight: 500;">${log.user_name}</td>
            <td><span class="badge badge-primary" style="background: var(--bg-main); color: var(--primary); border: 1px solid var(--border);">${log.action}</span></td>
            <td>${log.affected_record || '-'}</td>
            <td style="color: var(--text-muted); font-size: 0.85rem;">${dateStr} <br> ${timeStr}</td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <div class="d-flex justify-between align-center mb-6">
          <div>
            <h3 style="font-size: 1.1rem;">System Audit Logs</h3>
            <p class="text-muted" style="font-size: 0.9rem;">Permanent, uneditable tracking of all system activity.</p>
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>User / Official</th>
                <th>Action Type</th>
                <th>Details & Affected Record</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${logs.length > 0 ? tableRows : '<tr><td colspan="4" class="text-center py-4 text-muted">No audit logs found.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div class="card text-danger">${e}</div>`;
    }
  }
}
