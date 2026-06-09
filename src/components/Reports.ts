import { ApiService } from '../services/api';
import type { AuthSession } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { calculateArrears } from '../utils/arrears';

export class ReportsComponent {
  static async render(container: HTMLElement, session: AuthSession) {
    container.innerHTML = `
      <div class="kpi-grid">
        <div class="card">
          <div class="d-flex align-center gap-4 mb-4">
            <div class="kpi-icon" style="background: var(--danger-light); color: var(--danger);">
              <i data-lucide="file-text"></i>
            </div>
            <div>
              <h3 style="font-size: 1.1rem;">Full Ledger (PDF)</h3>
              <p class="text-muted" style="font-size: 0.85rem;">Export the strict arrears history</p>
            </div>
          </div>
          <button class="btn btn-outline w-100" id="exportPdfBtn">Generate PDF</button>
        </div>

        <div class="card">
          <div class="d-flex align-center gap-4 mb-4">
            <div class="kpi-icon" style="background: var(--success-light); color: var(--success);">
              <i data-lucide="table"></i>
            </div>
            <div>
              <h3 style="font-size: 1.1rem;">Excel Export</h3>
              <p class="text-muted" style="font-size: 0.85rem;">Raw data export for accounting</p>
            </div>
          </div>
          <button class="btn btn-outline w-100" id="exportExcelBtn">Download .xlsx</button>
        </div>
      </div>
    `;

    const { createIcons, FileText, Table } = await import('lucide');
    createIcons({ icons: { FileText, Table } });

    document.getElementById('exportPdfBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('exportPdfBtn') as HTMLButtonElement;
      btn.textContent = 'Generating...';
      try {
        await this.generatePDF(session);
      } catch (e) {
        alert('Failed to generate PDF');
      }
      btn.textContent = 'Generate PDF';
    });

    document.getElementById('exportExcelBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('exportExcelBtn') as HTMLButtonElement;
      btn.textContent = 'Exporting...';
      try {
        await this.generateExcel(session);
      } catch (e) {
        alert('Failed to generate Excel');
      }
      btn.textContent = 'Download .xlsx';
    });
  }

  static async generatePDF(session: AuthSession) {
    const currentYear = new Date().getFullYear().toString();
    const landlords = await ApiService.fetchLandlords(session.estate_id);
    const payments = await ApiService.fetchPayments(session.estate_id, currentYear);
    
    const doc = new jsPDF('landscape');
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    doc.setFontSize(16);
    doc.text(`Estate Security Levy Ledger - ${currentYear}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} (Arrears excluded for future months)`, 14, 28);

    const tableBody = landlords.map(l => {
      const arrears = calculateArrears(l, payments, currentYear);
      const rowData: any[] = [l.landlord_name, l.compound_name];
      
      months.forEach(m => {
        const p = payments.find(pay => pay.landlord_id === l.id && pay.payment_month.toLowerCase() === m);
        const amount = p ? p.amount_paid : 0;
        rowData.push(amount > 0 ? amount.toLocaleString() : '-');
      });

      rowData.push(arrears.totalPaid.toLocaleString());
      rowData.push(arrears.totalOutstanding.toLocaleString());
      return rowData;
    });

    autoTable(doc, {
      startY: 35,
      head: [['Resident', 'Compound', ...months.map(m => m.toUpperCase()), 'Total Paid', 'Current Arrears']],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`Security_Ledger_${currentYear}.pdf`);
  }

  static async generateExcel(session: AuthSession) {
    const currentYear = new Date().getFullYear().toString();
    const landlords = await ApiService.fetchLandlords(session.estate_id);
    const payments = await ApiService.fetchPayments(session.estate_id, currentYear);
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    const data = landlords.map(l => {
      const arrears = calculateArrears(l, payments, currentYear);
      const row: any = {
        'Resident Name': l.landlord_name,
        'Compound': l.compound_name,
        'Phone Number': l.phone_number || '',
        'Monthly Levy': l.monthly_levy
      };

      months.forEach(m => {
        const p = payments.find(pay => pay.landlord_id === l.id && pay.payment_month.toLowerCase() === m);
        const amount = p ? p.amount_paid : 0;
        row[m.toUpperCase()] = amount;
      });

      row['Total Paid'] = arrears.totalPaid;
      row['Current Arrears'] = arrears.totalOutstanding;
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger');
    XLSX.writeFile(workbook, `Security_Ledger_${currentYear}.xlsx`);
  }
}
