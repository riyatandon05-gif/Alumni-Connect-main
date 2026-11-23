document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('studentEventsPreview');
  if (!grid) return;
  try {
    const events = (await (await fetch('http://localhost:3000/api/events')).json()).events || [];
    grid.innerHTML = events.slice(0, 2).map((event, index) => {
      const date = new Date(event.date);
      return `<a class="feature-event-card" href="events.html"><img src="${escapeHtml(event.image)}" alt="${escapeHtml(event.title)}" /><div class="feature-event-content"><div class="feature-event-date"><strong>${date.toLocaleDateString(undefined,{day:'2-digit'})}</strong><span>${date.toLocaleDateString(undefined,{month:'short'})}</span></div><div><span>${index === 0 ? 'Networking' : 'Career'}</span><h3>${escapeHtml(event.title)}</h3><p>📍 ${escapeHtml(event.location)}</p></div><b>→</b></div></a>`;
    }).join('');
  } catch { grid.innerHTML = '<p>Events are temporarily unavailable.</p>'; }
  function escapeHtml(value) { const span = document.createElement('span'); span.textContent = value ?? ''; return span.innerHTML; }
});
