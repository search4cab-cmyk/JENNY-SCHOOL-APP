import { ApiService } from '../services/api';
import type { AuthSession } from '../types';

export class LandlordsComponent {
  static async render(container: HTMLElement, session: AuthSession) {
    container.innerHTML = '<div class="text-center text-muted">Loading landlords...</div>';

    try {
      const landlords = await ApiService.fetchLandlords(session.estate_id);

      const canEdit = ['SUPER_ADMIN', 'ESTATE_MANAGER', 'ACCOUNT_OFFICER'].includes(session.role);

      let tableRows = landlords.map(l => `
        <tr>
          <td>
            <div style="font-weight: 600;">${l.landlord_name}</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${l.compound_name}</div>
          </td>
          <td>${l.phone_number || 'N/A'}</td>
          <td style="font-weight: 500;">₦${l.monthly_levy.toLocaleString()}</td>
          <td><span class="badge ${l.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">${l.status}</span></td>
          ${canEdit ? `
          <td class="text-right">
            <button class="btn-icon text-primary" onclick="window.appEditLandlord('${l.id}', '${l.landlord_name.replace(/'/g, "\\'")}', '${l.phone_number || ''}', '${l.compound_name.replace(/'/g, "\\'")}', ${l.monthly_levy})">
              <i data-lucide="edit-2"></i>
            </button>
            <button class="btn-icon text-danger" onclick="window.appDeleteLandlord('${l.id}')">
              <i data-lucide="trash-2"></i>
            </button>
          </td>` : ''}
        </tr>
      `).join('');

      if (landlords.length === 0) {
        tableRows = `<tr><td colspan="${canEdit ? 5 : 4}" class="text-center py-4 text-muted">No landlords found. Add your first resident.</td></tr>`;
      }

      container.innerHTML = `
        <div class="d-flex justify-between align-center mb-6">
          <div style="position: relative; width: 300px;">
            <i data-lucide="search" style="position: absolute; left: 12px; top: 12px; color: var(--text-muted); width: 18px; height: 18px;"></i>
            <input type="text" id="searchLandlords" class="form-control" style="padding-left: 40px;" placeholder="Search names or compounds...">
          </div>
          ${canEdit ? `
            <button class="btn btn-primary" id="openAddModal">
              <i data-lucide="plus"></i> Add Resident
            </button>
          ` : ''}
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Resident Info</th>
                <th>Phone Number</th>
                <th>Monthly Levy</th>
                <th>Status</th>
                ${canEdit ? '<th class="text-right">Actions</th>' : ''}
              </tr>
            </thead>
            <tbody id="landlordsTableBody">
              ${tableRows}
            </tbody>
          </table>
        </div>

        <!-- Add Modal -->
        <div class="modal-overlay" id="addModal">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">Register New Resident</h3>
              <button class="modal-close" id="closeAddModal"><i data-lucide="x"></i></button>
            </div>
            <form id="addLandlordForm">
              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label">Full Name</label>
                  <input type="text" id="lName" class="form-control" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Phone Number</label>
                  <input type="text" id="lPhone" class="form-control">
                </div>
                <div class="d-flex gap-4">
                  <div class="form-group w-100">
                    <label class="form-label">Compound Name</label>
                    <input type="text" id="lCompound" class="form-control" required>
                  </div>
                  <div class="form-group w-100">
                    <label class="form-label">Monthly Levy (₦)</label>
                    <input type="number" id="lLevy" class="form-control" required>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline" id="cancelAddModal">Cancel</button>
                <button type="submit" class="btn btn-primary" id="saveLandlordBtn">Save Resident</button>
              </div>
            </form>
          </div>
        </div>
        <!-- Edit Modal -->
        <div class="modal-overlay" id="editModal">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">Edit Resident</h3>
              <button class="modal-close" id="closeEditModal"><i data-lucide="x"></i></button>
            </div>
            <form id="editLandlordForm">
              <input type="hidden" id="editId">
              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label">Full Name</label>
                  <input type="text" id="eName" class="form-control" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Phone Number</label>
                  <input type="text" id="ePhone" class="form-control">
                </div>
                <div class="d-flex gap-4">
                  <div class="form-group w-100">
                    <label class="form-label">Compound Name</label>
                    <input type="text" id="eCompound" class="form-control" required>
                  </div>
                  <div class="form-group w-100">
                    <label class="form-label">Monthly Levy (₦)</label>
                    <input type="number" id="eLevy" class="form-control" required>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline" id="cancelEditModal">Cancel</button>
                <button type="submit" class="btn btn-primary" id="updateLandlordBtn">Update Resident</button>
              </div>
            </form>
          </div>
        </div>
      `;

      // Icons
      const { createIcons, Search, Plus, Trash2, Edit2, X } = await import('lucide');
      createIcons({ icons: { Search, Plus, Trash2, Edit2, X } });

      // Search Logic
      document.getElementById('searchLandlords')?.addEventListener('input', (e) => {
        const val = (e.target as HTMLInputElement).value.toLowerCase();
        const rows = document.querySelectorAll('#landlordsTableBody tr');
        rows.forEach(row => {
          if (row.textContent?.toLowerCase().includes(val)) {
            (row as HTMLElement).style.display = '';
          } else {
            (row as HTMLElement).style.display = 'none';
          }
        });
      });

      if (canEdit) {
        // Modal Logic
        const modal = document.getElementById('addModal');
        const openBtn = document.getElementById('openAddModal');
        const closeBtns = [document.getElementById('closeAddModal'), document.getElementById('cancelAddModal')];

        const closeModal = () => modal?.classList.remove('active');
        
        openBtn?.addEventListener('click', () => modal?.classList.add('active'));
        closeBtns.forEach(b => b?.addEventListener('click', closeModal));

        // Form Submit
        document.getElementById('addLandlordForm')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('saveLandlordBtn') as HTMLButtonElement;
          btn.textContent = 'Saving...';
          btn.disabled = true;

          try {
            await ApiService.addLandlord({
              estate_id: session.estate_id,
              landlord_name: (document.getElementById('lName') as HTMLInputElement).value,
              phone_number: (document.getElementById('lPhone') as HTMLInputElement).value,
              compound_name: (document.getElementById('lCompound') as HTMLInputElement).value,
              monthly_levy: parseFloat((document.getElementById('lLevy') as HTMLInputElement).value),
              status: 'ACTIVE'
            } as any);

            window.location.reload(); 
          } catch (error) {
            alert('Failed to save landlord');
            console.error(error);
            btn.textContent = 'Save Resident';
            btn.disabled = false;
          }
        });

        // Edit Modal Logic
        const editModal = document.getElementById('editModal');
        const closeEditBtns = [document.getElementById('closeEditModal'), document.getElementById('cancelEditModal')];
        const closeEditModalFn = () => editModal?.classList.remove('active');
        closeEditBtns.forEach(b => b?.addEventListener('click', closeEditModalFn));

        (window as any).appEditLandlord = (id: string, name: string, phone: string, compound: string, levy: number) => {
          (document.getElementById('editId') as HTMLInputElement).value = id;
          (document.getElementById('eName') as HTMLInputElement).value = name;
          (document.getElementById('ePhone') as HTMLInputElement).value = phone;
          (document.getElementById('eCompound') as HTMLInputElement).value = compound;
          (document.getElementById('eLevy') as HTMLInputElement).value = levy.toString();
          editModal?.classList.add('active');
        };

        // Edit Form Submit
        document.getElementById('editLandlordForm')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('updateLandlordBtn') as HTMLButtonElement;
          btn.textContent = 'Updating...';
          btn.disabled = true;

          const id = (document.getElementById('editId') as HTMLInputElement).value;
          try {
            await ApiService.updateLandlord(id, {
              landlord_name: (document.getElementById('eName') as HTMLInputElement).value,
              phone_number: (document.getElementById('ePhone') as HTMLInputElement).value,
              compound_name: (document.getElementById('eCompound') as HTMLInputElement).value,
              monthly_levy: parseFloat((document.getElementById('eLevy') as HTMLInputElement).value),
            });

            window.location.reload(); 
          } catch (error) {
            alert('Failed to update resident');
            console.error(error);
            btn.textContent = 'Update Resident';
            btn.disabled = false;
          }
        });

        // Delete Logic attached to window
        (window as any).appDeleteLandlord = async (id: string) => {
          if (confirm('Are you sure you want to delete this resident? All payment history will be permanently lost.')) {
            try {
              await ApiService.deleteLandlord(id);
              window.location.reload();
            } catch (err) {
              alert('Failed to delete.');
            }
          }
        };
      }

    } catch (e) {
      container.innerHTML = `<div class="card"><h3 style="color:var(--danger)">Error</h3><p>${e}</p></div>`;
    }
  }
}
