document.addEventListener('DOMContentLoaded', () => {
  const API = 'http://localhost:3000/api';
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

  async function fetchJson(path) {
    const response = await fetch(API + path);
    if (!response.ok) throw new Error('Unable to load ' + path);
    return response.json();
  }

  function escapeHtml(value) {
    const span = document.createElement('span');
    span.textContent = value ?? '';
    return span.innerHTML;
  }

  function showToast(message, type = 'success') {
    let zone = document.querySelector('.toast-zone');
    if (!zone) {
      zone = document.createElement('div');
      zone.className = 'toast-zone';
      document.body.appendChild(zone);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '•'}</span><p>${escapeHtml(message)}</p>`;
    zone.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 250); }, 3200);
  }

  function addTopNavigation() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    if (!navbar.querySelector('.nav-actions')) {
      const actions = document.createElement('div');
      actions.className = 'nav-actions';
      actions.innerHTML = `
        <button class="nav-icon search-trigger" type="button" aria-label="Search site">${icon.search}</button>
        <button class="nav-icon notification-trigger" type="button" aria-label="View notifications">${icon.bell}<span class="notification-dot"></span></button>
        <button class="mobile-menu-trigger" type="button" aria-label="Toggle navigation">${icon.menu}</button>
        <img class="nav-avatar" src="${escapeHtml(currentUser?.avatar || 'https://i.pravatar.cc/100?img=5')}" alt="User profile" />`;
      navbar.appendChild(actions);

      actions.querySelector('.search-trigger').addEventListener('click', () => {
        document.querySelector('.notifications-popover')?.classList.remove('open');
        const search = document.querySelector('.global-search');
        search?.classList.add('open');
        search?.querySelector('input')?.focus();
      });
      actions.querySelector('.notification-trigger').addEventListener('click', event => {
        event.stopPropagation();
        document.querySelector('.notification-dot')?.remove();
        document.querySelector('.global-search')?.classList.remove('open');
        document.querySelector('.notifications-popover')?.classList.toggle('open');
      });
      actions.querySelector('.mobile-menu-trigger').addEventListener('click', () => {
        navbar.classList.toggle('menu-open');
        document.body.classList.toggle('nav-lock');
      });
      navbar.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => navbar.classList.remove('menu-open')));
    }

    const search = document.createElement('div');
    search.className = 'global-search';
    search.innerHTML = `<div class="search-shell"><button type="button" class="search-close" aria-label="Close search">×</button><span>⌕</span><input type="search" placeholder="Search people, jobs, events..." aria-label="Search" /><div class="search-results"><p>Start typing to search the community</p></div></div>`;
    document.body.appendChild(search);

    const input = search.querySelector('input');
    const results = search.querySelector('.search-results');
    search.querySelector('.search-close').addEventListener('click', () => search.classList.remove('open'));
    search.addEventListener('click', event => { if (event.target === search) search.classList.remove('open'); });
    input.addEventListener('input', async () => {
      const term = input.value.trim().toLowerCase();
      if (!term) { results.innerHTML = '<p>Start typing to search the community</p>'; return; }
      try {
        const [directory, events, jobs] = await Promise.all([
          fetchJson('/directory'), fetchJson('/events'), fetchJson('/jobs')
        ]);
        const matches = [];
        directory.users.filter(user => `${user.name} ${user.company_name || ''} ${user.role}`.toLowerCase().includes(term)).slice(0, 4).forEach(user => matches.push({ label: user.name, meta: user.company_name || user.role, icon: '◎' }));
        events.events.filter(event => `${event.title} ${event.location}`.toLowerCase().includes(term)).slice(0, 3).forEach(event => matches.push({ label: event.title, meta: event.location, icon: '◫' }));
        jobs.jobs.filter(job => `${job.title} ${job.company_name || ''}`.toLowerCase().includes(term)).slice(0, 4).forEach(job => matches.push({ label: job.title, meta: job.company_name || 'Job opportunity', icon: '▣' }));
        results.innerHTML = matches.length ? matches.map(match => `<button type="button" class="search-result"><span>${match.icon}</span><div><strong>${escapeHtml(match.label)}</strong><small>${escapeHtml(match.meta)}</small></div></button>`).join('') : '<p>No matching results</p>';
        results.querySelectorAll('.search-result').forEach(button => button.addEventListener('click', () => { search.classList.remove('open'); showToast(`Opening ${button.querySelector('strong').textContent}`); }));
      } catch { results.innerHTML = '<p>Search is temporarily unavailable</p>'; }
    });

    const notifications = document.createElement('div');
    notifications.className = 'notifications-popover';
    notifications.innerHTML = `<header><strong>Notifications</strong><button type="button">Mark all read</button></header><div class="notification-item"><span>◎</span><div><strong>New mentorship request</strong><small>2 minutes ago</small></div></div><div class="notification-item"><span>▣</span><div><strong>New job matching your profile</strong><small>1 hour ago</small></div></div><div class="notification-item"><span>◫</span><div><strong>Event registration confirmed</strong><small>Yesterday</small></div></div>`;
    navbar.appendChild(notifications);
    notifications.querySelector('header button').addEventListener('click', () => {
      notifications.querySelectorAll('.notification-item').forEach(item => item.classList.add('read')); showToast('Notifications marked as read');
    });
    document.addEventListener('click', event => {
      if (!notifications.contains(event.target) && !event.target.closest('.notification-trigger')) notifications.classList.remove('open');
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') notifications.classList.remove('open');
    });
  }

  async function addOverviewStats() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    let stats;
    try {
      const [directory, events, jobs] = await Promise.all([fetchJson('/directory'), fetchJson('/events'), fetchJson('/jobs')]);
      const alumni = directory.users.filter(user => user.role === 'Alumni').length;
      const students = directory.users.filter(user => user.role === 'Student').length;
      stats = [
        ['<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/></svg>', alumni, 'Alumni community'],
        ['<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h8M8 13h5"/></svg>', students, 'Active students'],
        ['<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="12" rx="2"/></svg>', jobs.jobs.length, 'Open opportunities'],
        ['<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/></svg>', events.events.length, 'Upcoming events'],
        ['<svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="3"/><circle cx="17" cy="10" r="2"/><path d="M2 20c1-4 3-6 6-6s5 2 6 6"/></svg>', 24, 'Mentorships']
      ];
    } catch {
      stats = [['🎓', '5K+', 'Alumni'], ['📚', '2K+', 'Students'], ['💼', '180', 'Open jobs'], ['📅', '12', 'Upcoming events'], ['🤝', '240', 'Mentorships']];
    }
    const overview = document.createElement('section');
    overview.className = 'section dashboard-overview';
    overview.innerHTML = `<div class="overview-heading"><div><span>Dashboard overview</span><h2>Welcome back${currentUser?.name ? ', ' + escapeHtml(currentUser.name.split(' ')[0]) : ''}</h2></div><button type="button" class="overview-action">View analytics →</button></div><div class="stat-grid"></div>`;
    hero.insertAdjacentElement('afterend', overview);
    overview.querySelector('.stat-grid').innerHTML = stats.map(([icon, value, label]) => `<article class="stat-card"><div class="stat-icon">${icon}</div><div><strong>${value}</strong><span>${label}</span></div><small>↗ 12%</small></article>`).join('');

    if (document.querySelector('.overview-quick-grid')) return;
    const quick = document.createElement('section');
    quick.className = 'section overview-quick-grid';
    quick.innerHTML = `
      <article class="quick-actions-card"><div class="quick-heading"><div><span>Quick actions</span><h2>Continue where you left off</h2></div></div>
        <div class="quick-action-row">
          <a href="opportunities.html"><span class="quick-action-icon"><svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M8 7V5h8v2M3 12h18"/></svg></span><div><strong>Explore roles</strong><small>2 curated matches</small></div><b>→</b></a>
          <a href="mentorship.html"><span class="quick-action-icon"><svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="3"/><circle cx="17" cy="10" r="2"/><path d="M2 20c1-4 3-6 6-6s5 2 6 6M15 15c3 0 5 1 6 4"/></svg></span><div><strong>Meet a mentor</strong><small>Request guidance</small></div><b>→</b></a>
          <a href="events.html"><span class="quick-action-icon"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg></span><div><strong>Browse events</strong><small>3 upcoming events</small></div><b>→</b></a>
        </div>
      </article>
      <article class="activity-card"><div class="quick-heading"><div><span>Recent activity</span><h2>Today</h2></div><button type="button">View all</button></div>
        <div class="activity-list"><div><span class="activity-icon violet">◎</span><div><strong>Profile viewed</strong><p>Two alumni viewed your profile</p></div><small>12m</small></div><div><span class="activity-icon green">✓</span><div><strong>Application saved</strong><p>Frontend Developer Intern</p></div><small>1h</small></div><div><span class="activity-icon amber">◫</span><div><strong>Event reminder</strong><p>Career Fair starts Friday</p></div><small>3h</small></div></div>
      </article>`;
    overview.insertAdjacentElement('afterend', quick);
  }

  function addDiscoveryFilters() {
    document.querySelectorAll('.platform-directory, .platform-events').forEach(section => {
      const cards = section.querySelector('.cards');
      if (!cards) return;
      const toolbar = document.createElement('div');
      toolbar.className = 'discovery-toolbar';
      toolbar.innerHTML = `<label><span>Search</span><input type="search" placeholder="Filter results..." /></label><label><span>Sort</span><select><option value="newest">Newest</option><option value="name">Name A–Z</option></select></label>`;
      cards.before(toolbar);

      const input = toolbar.querySelector('input');
      const select = toolbar.querySelector('select');
      const filterCards = () => {
        const term = input.value.trim().toLowerCase();
        const items = [...cards.children];
        items.forEach(card => { card.hidden = term && !card.textContent.toLowerCase().includes(term); });
        if (select.value === 'name') items.sort((a, b) => a.textContent.localeCompare(b.textContent)).forEach(card => cards.appendChild(card));
      };
      input.addEventListener('input', filterCards);
      select.addEventListener('change', filterCards);
    });

    document.querySelectorAll('.job-card').forEach(card => {
      card.setAttribute('tabindex', '0');
      card.querySelector('.job-action')?.addEventListener('click', () => showToast('Opening job details'));
    });
  }

  function enhanceProfile() {
    const profileCard = document.querySelector('#profile .profile-card');
    if (!profileCard) return;
    const actions = document.createElement('div');
    actions.className = 'profile-actions';
    actions.innerHTML = `<button type="button" class="profile-edit">Edit profile</button><button type="button" class="profile-share">Share profile</button>`;
    profileCard.appendChild(actions);
    actions.querySelector('.profile-edit').addEventListener('click', () => { window.location.href = 'modify-profile.html'; });
    actions.querySelector('.profile-share').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(window.location.href); showToast('Profile link copied'); }
      catch { showToast('Unable to copy profile link', 'warning'); }
    });
  }

  const icon = {
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg>',
    bell: '<svg class="bell-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9z"/><path d="M10 21h4"/><circle cx="12" cy="5" r="1"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
  };

  addTopNavigation();
  addOverviewStats();
  setTimeout(addDiscoveryFilters, 600);
  enhanceProfile();
});
