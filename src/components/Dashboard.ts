import Chart from 'chart.js/auto';
import { ApiService } from '../services/api';
import type { AuthSession } from '../types';
import { calculateArrears } from '../utils/arrears';

export class DashboardComponent {
  static async render(container: HTMLElement, session: AuthSession) {
    container.innerHTML = '<div class="text-center text-muted">Loading metrics...</div>';

    try {
      const landlords = await ApiService.fetchLandlords(session.estate_id);
      const currentYear = new Date().getFullYear().toString();
      const payments = await ApiService.fetchPayments(session.estate_id, currentYear);

      let totalExpected = 0;
      let totalCollected = 0;
      let defaultersCount = 0;

      const monthlyCollections = new Array(12).fill(0);
      const monthsMap: Record<string, number> = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };

      landlords.forEach(l => {
        const arrears = calculateArrears(l, payments, currentYear);
        totalExpected += arrears.totalExpected;
        totalCollected += arrears.totalPaid;
        if (arrears.hasArrears) defaultersCount++;

        const lPayments = payments.filter(p => p.landlord_id === l.id);
        lPayments.forEach(p => {
          const idx = monthsMap[p.payment_month.toLowerCase()];
          if (idx !== undefined) monthlyCollections[idx] += p.amount_paid;
        });
      });

      const outstanding = Math.max(0, totalExpected - totalCollected);
      const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

      const formatCurrency = (val: number) => '₦' + val.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

      container.innerHTML = `
        <div class="kpi-grid">
          <div class="card kpi-card">
            <div class="kpi-header">
              <span>Total Landlords</span>
              <div class="kpi-icon"><i data-lucide="users"></i></div>
            </div>
            <div class="kpi-value">${landlords.length}</div>
          </div>
          
          <div class="card kpi-card">
            <div class="kpi-header">
              <span>Collection Rate (YTD)</span>
              <div class="kpi-icon" style="background: var(--success-light); color: var(--success);"><i data-lucide="trending-up"></i></div>
            </div>
            <div class="kpi-value">${collectionRate}%</div>
            <div style="font-size: 0.8rem; color: var(--success); font-weight: 500;">Excludes future months</div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-header">
              <span>Total Collected</span>
              <div class="kpi-icon" style="background: var(--primary-light); color: var(--primary);"><i data-lucide="check-circle"></i></div>
            </div>
            <div class="kpi-value" style="color: var(--primary);">${formatCurrency(totalCollected)}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Out of ${formatCurrency(totalExpected)} due</div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-header">
              <span>Outstanding Arrears</span>
              <div class="kpi-icon" style="background: var(--danger-light); color: var(--danger);"><i data-lucide="alert-circle"></i></div>
            </div>
            <div class="kpi-value" style="color: var(--danger);">${formatCurrency(outstanding)}</div>
            <div style="font-size: 0.8rem; color: var(--danger); font-weight: 500;">${defaultersCount} Landlords owing</div>
          </div>
        </div>

        <div class="card mt-4">
          <h3 style="margin-bottom: 24px; font-size: 1.1rem;">Monthly Collections (${currentYear})</h3>
          <div style="height: 300px; width: 100%;">
            <canvas id="collectionChart"></canvas>
          </div>
        </div>
      `;

      const { createIcons, Users, TrendingUp, CheckCircle, AlertCircle } = await import('lucide');
      createIcons({ icons: { Users, TrendingUp, CheckCircle, AlertCircle } });

      const ctx = document.getElementById('collectionChart') as HTMLCanvasElement;
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: [{
            label: 'Amount Collected (₦)',
            data: monthlyCollections,
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            borderWidth: 2,
            pointBackgroundColor: '#4f46e5',
            pointRadius: 4,
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: (val) => '₦' + val.toLocaleString() } },
            x: { grid: { display: false } }
          }
        }
      });

    } catch (e) {
      container.innerHTML = `<div class="card"><h3 style="color:var(--danger)">Error loading dashboard</h3><p>${e}</p></div>`;
    }
  }
}
