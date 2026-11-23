document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('eventsGrid');
  let events = [];
  try { events = (await (await fetch('http://localhost:3000/api/events')).json()).events || []; } catch { events = []; }
  const categories = ['networking', 'career', 'networking'];
  function render(filter = 'all') {
    const filtered = filter === 'all' ? events : events.filter((_, i) => categories[i % categories.length] === filter);
    grid.innerHTML = filtered.length ? filtered.map((event, i) => {
      const date = new Date(event.date);
      return `<article class="premium-event-card"><div class="premium-event-image"><img src="${escapeHtml(event.image)}" alt="${escapeHtml(event.title)}" /><span>${categories[i % categories.length]}</span><button type="button" class="event-save" aria-label="Save event">♡</button></div><div class="premium-event-content"><div class="event-date-block"><strong>${date.toLocaleDateString(undefined,{day:'2-digit'})}</strong><span>${date.toLocaleDateString(undefined,{month:'short'}).toUpperCase()}</span></div><div class="premium-event-info"><p class="event-kind">${categories[i % categories.length] === 'career' ? 'Career event' : 'Community meetup'}</p><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.description)}</p><div class="event-meta"><span>📍 ${escapeHtml(event.location)}</span><span>👥 ${120 + i * 44} attending</span></div></div><button type="button" class="event-register-premium">Register</button></div></article>`;
    }).join('') : '<div class="empty-state"><h3>No events found</h3></div>';
    grid.querySelectorAll('.event-save').forEach(button => button.addEventListener('click', () => { button.textContent = button.textContent === '♡' ? '♥' : '♡'; }));
    grid.querySelectorAll('.event-register-premium').forEach(button => button.addEventListener('click', () => { button.textContent = 'Registered ✓'; button.disabled = true; }));
  }
  document.querySelectorAll('.events-toolbar button').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.events-toolbar button').forEach(item => item.classList.remove('active')); button.classList.add('active'); render(button.dataset.filter); }));
  function escapeHtml(value) { const span = document.createElement('span'); span.textContent = value ?? ''; return span.innerHTML; }
  render();
});
