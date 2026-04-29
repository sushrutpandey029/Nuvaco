// Sidebar toggle for mobile
(function () {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('mainSidebar');
  const overlay = document.getElementById('sidebarOverlay');

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (toggle) toggle.addEventListener('click', openSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);

  // Close on nav link click (mobile)
  if (sidebar) {
    sidebar.querySelectorAll('.sidebar-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (window.innerWidth < 768) closeSidebar();
      });
    });
  }
})();
