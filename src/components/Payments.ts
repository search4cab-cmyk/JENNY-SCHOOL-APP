import { ApiService } from '../services/api';
import type { AuthSession } from '../types';
import { calculateArrears } from '../utils/arrears';
import { PdfGenerator } from '../services/PdfGenerator';

export class PaymentsComponent {
  static async render(container: HTMLElement, session: AuthSession) {
    container.innerHTML = '<div class="text-center text-muted">Loading payments grid...</div>';

    try {
      const currentYear = new Date().getFullYear().toString();
      const landlords = await ApiService.fetchLandlords(session.estate_id);
      const payments = await ApiService.fetchPayments(session.estate_id, currentYear);

      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const canEdit = ['SUPER_ADMIN', 'ESTATE_MANAGER', 'ACCOUNT_OFFICER'].includes(session.role);

      const getPaymentValue = (lId: string, m: string) => {
        const p = payments.find(pay => pay.landlord_id === lId && pay.payment_month.toLowerCase() === m);
        return p ? p.amount_paid : 0;
      };

      let tableRows = landlords.map(l => {
        const arrears = calculateArrears(l, payments, currentYear);
        
        let monthCells = months.map(m => {
          const amount = getPaymentValue(l.id, m);
          let statusClass = '';
          if (amount >= l.monthly_levy) statusClass = 'background: var(--success-light);';
          else if (amount > 0) statusClass = 'background: var(--warning-light);';

          return `
            <td class="payment-cell" style="${statusClass}">
              <input type="number" 
                class="payment-input" 
                value="${amount || ''}" 
                placeholder="-"
                data-id="${l.id}" 
                data-month="${m}"
                ${!canEdit ? 'disabled' : ''}
              >
            </td>
          `;
        }).join('');

        return `
          <tr>
            <td style="font-weight: 600; min-width: 250px;">
              ${l.landlord_name}<br>
              <span class="text-muted" style="font-size: 0.8rem; font-weight: 400;">${l.compound_name}</span>
              <div class="mt-4 d-flex gap-2">
                <button class="btn btn-outline py-1 px-2" style="font-size: 0.75rem;" onclick="window.appGenerateReceipt('${l.id}')">
                  Receipt
                </button>
                <button class="btn ${arrears.hasArrears ? 'btn-danger' : 'btn-outline'} py-1 px-2" style="font-size: 0.75rem;" ${!arrears.hasArrears ? 'disabled' : ''} onclick="window.appGenerateInvoice('${l.id}')">
                  Invoice
                </button>
              </div>
            </td>
            ${monthCells}
            <td class="text-right" style="font-weight: 600; color: var(--success); background: var(--bg-main);">
              ₦${arrears.totalPaid.toLocaleString()}
            </td>
            <td class="text-right" style="font-weight: 600; color: ${arrears.hasArrears ? 'var(--danger)' : 'var(--text-main)'}; background: var(--bg-main);">
              ₦${arrears.totalOutstanding.toLocaleString()}<br>
              <span style="font-size: 0.7rem; font-weight: 400; color: var(--text-muted);">Up to current month</span>
            </td>
          </tr>
        `;
      }).join('');

      if (landlords.length === 0) {
        tableRows = `<tr><td colspan="15" class="text-center py-4 text-muted">No landlords found.</td></tr>`;
      }

      container.innerHTML = `
        <div class="d-flex justify-between align-center mb-6">
          <div>
            <h3 style="font-size: 1.1rem;">Payment Ledger (${currentYear})</h3>
            <p class="text-muted" style="font-size: 0.9rem;">Arrears strictly calculated up to current month. Future months excluded.</p>
          </div>
          <div style="position: relative; width: 300px;">
            <i data-lucide="search" style="position: absolute; left: 12px; top: 12px; color: var(--text-muted); width: 18px; height: 18px;"></i>
            <input type="text" id="searchPayments" class="form-control" style="padding-left: 40px;" placeholder="Search names...">
          </div>
        </div>

        <div class="table-container" style="max-height: calc(100vh - 250px); overflow-y: auto;">
          <table style="font-size: 0.9rem;">
            <thead style="position: sticky; top: 0; z-index: 10;">
              <tr>
                <th style="min-width: 250px;">Resident & Actions</th>
                ${months.map(m => `<th class="text-center">${m.toUpperCase()}</th>`).join('')}
                <th class="text-right">Total Paid</th>
                <th class="text-right">Current Arrears</th>
              </tr>
            </thead>
            <tbody id="paymentsTableBody">
              ${tableRows}
            </tbody>
          </table>
        </div>
      `;

      const { createIcons, Search } = await import('lucide');
      createIcons({ icons: { Search } });

      // Search
      document.getElementById('searchPayments')?.addEventListener('input', (e) => {
        const val = (e.target as HTMLInputElement).value.toLowerCase();
        const rows = document.querySelectorAll('#paymentsTableBody tr');
        rows.forEach(row => {
          const nameCell = row.querySelector('td')?.textContent?.toLowerCase() || '';
          (row as HTMLElement).style.display = nameCell.includes(val) ? '' : 'none';
        });
      });

      // Auto-save logic
      if (canEdit) {
        document.querySelectorAll('.payment-input').forEach(input => {
          input.addEventListener('change', async (e) => {
            const target = e.target as HTMLInputElement;
            const id = target.getAttribute('data-id')!;
            const month = target.getAttribute('data-month')!;
            const val = parseFloat(target.value) || 0;
            
            target.style.opacity = '0.5';
            try {
              await ApiService.updatePayment(id, month, currentYear, val);
              window.location.reload(); // Reload to refresh the complex strict calculations instantly
            } catch (err) {
              alert('Failed to save payment.');
              target.style.opacity = '1';
            }
          });
        });
      }

      // Attach PDF generators to window
      (window as any).appGenerateReceipt = async (landlordId: string) => {
        const landlord = landlords.find(l => l.id === landlordId);
        if (!landlord) return;
        
        const settings = await ApiService.fetchSettings(session.estate_id);
        const lPayments = payments.filter(p => p.landlord_id === landlord.id);
        const arrears = calculateArrears(landlord, payments, currentYear);
        
        // Generate a random transaction ID
        const txId = 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        const receiptNo = 'RCPT-' + Date.now().toString().slice(-6);

        const receiptData = {
          receiptNumber: receiptNo,
          transactionId: txId,
          paymentDate: new Date().toLocaleDateString(),
          landlordName: landlord.landlord_name,
          compoundName: landlord.compound_name,
          phoneNumber: landlord.phone_number,
          monthlyLevy: landlord.monthly_levy,
          periodCovered: `Year ${currentYear}`,
          amountPaid: arrears.totalPaid,
          paymentMonths: lPayments,
          outstandingMonths: arrears.outstandingMonths,
          totalOutstanding: arrears.totalOutstanding,
          settings
        };

        try {
          await ApiService.saveReceipt({
            receipt_number: receiptNo,
            transaction_id: txId,
            landlord_id: landlord.id,
            payment_ids: lPayments.map(p => p.id),
            total_amount: arrears.totalPaid,
            generated_by: session.user.id
          });
          await ApiService.logAudit(session.estate_id, 'GENERATE_RECEIPT', `Receipt ${receiptNo} for ${landlord.landlord_name}`);
        } catch (e) {
          console.warn("Failed to save receipt to DB. Generating PDF anyway...", e);
        }

        await PdfGenerator.createReceipt(receiptData);
      };

      (window as any).appGenerateInvoice = async (landlordId: string) => {
        const landlord = landlords.find(l => l.id === landlordId);
        if (!landlord) return;
        const settings = await ApiService.fetchSettings(session.estate_id);
        const arrears = calculateArrears(landlord, payments, currentYear);
        
        const invoiceData = {
          landlordName: landlord.landlord_name,
          compoundName: landlord.compound_name,
          phoneNumber: landlord.phone_number,
          outstandingMonths: arrears.outstandingMonths,
          totalOutstanding: arrears.totalOutstanding,
          settings
        };
        
        await ApiService.logAudit(session.estate_id, 'GENERATE_INVOICE', `Invoice for ${landlord.landlord_name}`);
        await PdfGenerator.createInvoice(invoiceData);
      };

    } catch (e) {
      container.innerHTML = `<div class="card"><h3 style="color:var(--danger)">Error</h3><p>${e}</p></div>`;
    }
  }
}
