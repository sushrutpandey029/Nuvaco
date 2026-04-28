// dashboard.js – Nuvoco Dashboard Charts

document.addEventListener('DOMContentLoaded', function () {
  const ctx = document.getElementById('dealersChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Month 1', 'Month 2', 'Month 3', 'Month 4'],
      datasets: [
        {
          label: 'Onboarded',
          data: [45, 95, 148, 65],
          backgroundColor: '#90caf9',
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Pic Uploaded',
          data: [40, 85, 158, 65],
          backgroundColor: '#1a5276',
          borderRadius: 6,
          borderSkipped: false,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1a2e',
          titleFont: { weight: '700' },
          bodyFont: { size: 13 },
          padding: 12,
          cornerRadius: 8,
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#6b7280', font: { size: 13 } }
        },
        y: {
          beginAtZero: true,
          max: 200,
          ticks: { stepSize: 50, color: '#6b7280', font: { size: 13 } },
          grid: {
            color: '#e5e7eb',
            borderDash: [6, 4]
          }
        }
      }
    }
  });
});
