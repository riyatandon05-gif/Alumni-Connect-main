document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('mentorDirectory');
  let alumni = [];
  try { alumni = (await (await fetch('http://localhost:3000/api/directory?role=Alumni')).json()).users || []; } catch { alumni = []; }
  const topics = ['Engineering · Interview prep', 'Product · Career strategy', 'Design · Portfolio review', 'Career · Leadership'];
  const companies = ['Microsoft', 'Google', 'Amazon', 'Adobe'];
  grid.innerHTML = alumni.length ? alumni.map((mentor, i) => `
    <article class="mentor-card"><div class="mentor-cover"><span class="availability"><i></i> Available</span><button class="mentor-save" type="button" aria-label="Save mentor">♡</button></div>
      <div class="mentor-profile"><img src="${escapeHtml(mentor.avatar)}" alt="${escapeHtml(mentor.name)}" /><div><h3>${escapeHtml(mentor.name)}</h3><p>${companies[i % companies.length]} · ${escapeHtml(mentor.graduation_year || 'Alumni')}</p></div></div>
      <div class="mentor-details"><span class="mentor-topic">${topics[i % topics.length]}</span><p>Mentors students through practical sessions, portfolio reviews and real career guidance.</p><div class="mentor-meta"><span>⭐ 4.9</span><span>🕘 30 min</span><span>💬 18 sessions</span></div></div>
      <button class="request-mentor" type="button">Request mentorship</button></article>`).join('') : '<div class="empty-state"><h3>No mentors available</h3></div>';
  grid.querySelectorAll('.mentor-save').forEach(button => button.addEventListener('click', () => { button.textContent = button.textContent === '♡' ? '♥' : '♡'; }));
  grid.querySelectorAll('.request-mentor').forEach((button, index) => button.addEventListener('click', async () => {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch {}
    if (user?.role !== 'Student') { button.textContent = 'Students only'; button.disabled = true; return; }
    const token = localStorage.getItem('authToken');
    const mentor = alumni[index];
    try {
      const response = await fetch('http://localhost:3000/api/mentorship', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ topic: topics[index % topics.length], message: 'I would like to request mentorship.', alumni_id: mentor.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not send request');
      button.textContent = 'Request sent ✓'; button.disabled = true;
    } catch (error) { button.textContent = error.message; }
  }));
  function escapeHtml(value) { const span = document.createElement('span'); span.textContent = value ?? ''; return span.innerHTML; }
});
