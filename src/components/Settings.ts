import { ApiService } from '../services/api';
import type { AuthSession } from '../types';

export class SettingsComponent {
  static async render(container: HTMLElement, session: AuthSession) {
    container.innerHTML = '<div class="text-center text-muted">Loading settings...</div>';

    try {
      const settings = await ApiService.fetchSettings(session.estate_id);

      container.innerHTML = `
        <div class="d-flex justify-between align-center mb-6">
          <div>
            <h3 style="font-size: 1.1rem;">Estate Configuration</h3>
            <p class="text-muted" style="font-size: 0.9rem;">Manage dynamic values for PDFs and signatures.</p>
          </div>
        </div>

        <form id="settingsForm" class="card" style="max-width: 800px;">
          <h4 class="mb-4" style="color: var(--primary);">Official Signatories</h4>
          <div class="d-flex gap-4" style="flex-wrap: wrap;">
            <div class="form-group flex-1">
              <label class="form-label">Estate Manager Name</label>
              <input type="text" id="mgrName" class="form-control" value="${settings?.manager_name || ''}" required>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Will appear dynamically on receipts & invoices.</div>
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Treasurer / Accountant Name</label>
              <input type="text" id="trsName" class="form-control" value="${settings?.treasurer_name || ''}" required>
            </div>
          </div>

          <h4 class="mb-4 mt-6" style="color: var(--primary);">Bank Details</h4>
          <div class="form-group">
            <label class="form-label">Bank Name</label>
            <input type="text" id="bankName" class="form-control" value="${settings?.bank_name || ''}" required>
          </div>
          <div class="d-flex gap-4" style="flex-wrap: wrap;">
            <div class="form-group flex-1">
              <label class="form-label">Account Name</label>
              <input type="text" id="accName" class="form-control" value="${settings?.bank_account_name || ''}" required>
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Account Number</label>
              <input type="text" id="accNumber" class="form-control" value="${settings?.bank_account_number || ''}" required>
            </div>
          </div>

          <div class="mt-6 pt-4" style="border-top: 1px solid var(--border);">
            <button type="submit" id="saveSettingsBtn" class="btn btn-primary">
              <i data-lucide="save"></i> Save Configuration
            </button>
          </div>
        </form>
      `;

      const { createIcons, Save } = await import('lucide');
      createIcons({ icons: { Save } });

      document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('saveSettingsBtn') as HTMLButtonElement;
        const originalText = btn.innerHTML;
        btn.textContent = 'Saving...';
        btn.disabled = true;

        try {
          const payload = {
            manager_name: (document.getElementById('mgrName') as HTMLInputElement).value,
            treasurer_name: (document.getElementById('trsName') as HTMLInputElement).value,
            bank_name: (document.getElementById('bankName') as HTMLInputElement).value,
            bank_account_name: (document.getElementById('accName') as HTMLInputElement).value,
            bank_account_number: (document.getElementById('accNumber') as HTMLInputElement).value,
          };

          await ApiService.updateSettings(session.estate_id, payload);
          await ApiService.logAudit(session.estate_id, 'UPDATE_SETTINGS', 'Updated Estate Configuration');
          
          btn.innerHTML = '<i data-lucide="check"></i> Saved successfully';
          setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
        } catch (err) {
          alert('Failed to save settings');
          btn.innerHTML = originalText;
          btn.disabled = false;
        }
      });

    } catch (e) {
      container.innerHTML = `<div class="card text-danger">${e}</div>`;
    }
  }
}
