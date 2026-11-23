document.addEventListener('DOMContentLoaded', () => {
  const API = 'http://localhost:3000/api';

  async function get(path) {
    const response = await fetch(API + path);
    if (!response.ok) throw new Error('Unable to load data');
    return response.json();
  }

  function escapeHtml(value) {
    const element = document.createElement('span');
    element.textContent = value ?? '';
    return element.innerHTML;
  }

  function addDirectory() {
    if (document.querySelector('.student-feature-section')) return;
    const profileSection = document.querySelector('#profile');
    if (!profileSection) return;
    const directory = document.createElement('section');
    directory.className = 'section platform-directory';
    directory.innerHTML = '<h2>Community Directory</h2><div class="cards directory-grid"><p>Loading community...</p></div>';
    profileSection.insertAdjacentElement('beforebegin', directory);

    get('/directory?role=Alumni').then(({ users }) => {
      const grid = directory.querySelector('.directory-grid');
      grid.innerHTML = users.slice(0, 4).map(user => `
        <article class="directory-card">
          <img src="${escapeHtml(user.avatar)}" alt="${escapeHtml(user.name)}" />
          <div><h3>${escapeHtml(user.name)}</h3><p>${escapeHtml(user.company_name || user.institute || user.role)}</p><span>${escapeHtml(user.role)} · ${escapeHtml(user.graduation_year || 'Verified member')}</span></div>
          <button type="button" class="connect-btn">Connect</button>
        </article>`).join('');
      grid.querySelectorAll('.connect-btn').forEach(button => button.addEventListener('click', () => {
        button.textContent = 'Connected ✓'; button.disabled = true;
      }));
    }).catch(() => {});
  }

  function addEvents() {
    if (document.querySelector('.student-feature-section')) return;
    const profileSection = document.querySelector('#profile');
    if (!profileSection) return;
    const events = document.createElement('section');
    events.className = 'section platform-events';
    events.innerHTML = '<h2>Featured Events</h2><div class="cards event-grid"><p>Loading events...</p></div>';
    profileSection.insertAdjacentElement('beforebegin', events);

    get('/events').then(({ events: items }) => {
      const grid = events.querySelector('.event-grid');
      grid.innerHTML = items.map(item => `
        <article class="event-card">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" />
          <div class="event-body">
            <div class="event-date"><strong>${new Date(item.date).toLocaleDateString(undefined, { day: '2-digit' })}</strong><span>${new Date(item.date).toLocaleDateString(undefined, { month: 'short' })}</span></div>
            <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p>
            <span class="event-location">📍 ${escapeHtml(item.location)}</span>
            <button type="button" class="event-register">Register</button>
          </div>
        </article>`).join('');
      grid.querySelectorAll('.event-register').forEach(button => button.addEventListener('click', () => {
        button.textContent = 'Registered ✓'; button.disabled = true;
      }));
    }).catch(() => {});
  }

  function addJobs() {
    const jobsSection = document.querySelector('#jobs, #opportunities');
    if (!jobsSection) return;
    const grid = jobsSection.querySelector('.cards');
    if (!grid) return;
    get('/jobs').then(({ jobs }) => {
      grid.innerHTML = jobs.map(job => `
        <article class="job-card">
          <span class="job-type">${escapeHtml(job.job_type)}</span>
          <h3>${escapeHtml(job.title)}</h3><p>${escapeHtml(job.company_name || job.recruiter_name)}</p>
          <span class="job-location">📍 ${escapeHtml(job.location)}</span>
          <button type="button" class="job-action">View Opportunity</button>
        </article>`).join('');
    }).catch(() => {});
  }

  function addChat() {
    const widget = document.createElement('div');
    widget.className = 'community-chat';
    widget.innerHTML = `
      <button type="button" class="chat-toggle" aria-label="Open community chat">💬 <span>Community</span></button>
      <aside class="chat-panel" aria-label="Global community chat">
        <header><div><strong>Global Community</strong><small><span></span> Alumni & students online</small></div><button type="button" class="chat-close">×</button></header>
        <div class="chat-messages"></div>
        <form class="chat-form"><input name="message" placeholder="Type a message..." autocomplete="off" required /><button type="submit">➤</button></form>
      </aside>`;
    document.body.appendChild(widget);

    const panel = widget.querySelector('.chat-panel');
    const toggle = widget.querySelector('.chat-toggle');
    const close = widget.querySelector('.chat-close');
    const messages = widget.querySelector('.chat-messages');

    toggle.addEventListener('click', () => panel.classList.add('open'));
    close.addEventListener('click', () => panel.classList.remove('open'));

    async function loadMessages() {
      try {
        const { messages: items } = await get('/chat/messages');
        messages.innerHTML = items.map(item => `
          <div class="chat-message" title="${escapeHtml(new Date(item.created_at).toLocaleString())}"><img src="${escapeHtml(item.avatar || 'https://i.pravatar.cc/80?img=5')}" alt="" /><div><strong>${escapeHtml(item.sender_name)} <small>${escapeHtml(item.sender_role)}</small></strong><p>${escapeHtml(item.message)}</p><time>${escapeHtml(new Date(item.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}))}</time></div></div>`).join('');
        messages.scrollTop = messages.scrollHeight;
      } catch (error) { messages.innerHTML = '<p class="chat-empty">Chat is unavailable.</p>'; }
    }

    widget.querySelector('.chat-form').addEventListener('submit', async event => {
      event.preventDefault();
      const input = event.currentTarget.elements.message;
      const sender = JSON.parse(localStorage.getItem('currentUser') || 'null');
      try {
        await fetch(API + '/chat/messages', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: input.value, sender_id: sender?.id })
        });
        input.value = ''; await loadMessages();
      } catch (error) { /* Keep existing UI responsive. */ }
    });

    loadMessages();
    setInterval(loadMessages, 8000);
  }

  addDirectory();
  addEvents();
  addJobs();
  addChat();
});
