document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('opportunityGrid');
  const count = document.getElementById('jobCount');
  const search = document.getElementById('jobSearch');
  const type = document.getElementById('jobType');
  const location = document.getElementById('jobLocation');

  let jobs = [];
  try {
    const response = await fetch('http://localhost:3000/api/jobs');
    jobs = (await response.json()).jobs || [];
  } catch { jobs = []; }

  const icons = ['<svg viewBox="0 0 24 24"><path d="M4 20V8l8-5 8 5v12M8 20v-7h8v7M9 9h6"/></svg>', '<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h8M8 13h5"/></svg>', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/></svg>'];

  function render() {
    const term = search.value.trim().toLowerCase();
    const filtered = jobs.filter(job => {
      const haystack = `${job.title} ${job.company_name || ''} ${job.location || ''}`.toLowerCase();
      return (!term || haystack.includes(term)) && (!type.value || job.job_type === type.value) && (!location.value || (job.location || '').includes(location.value));
    });
    count.textContent = filtered.length;
    grid.innerHTML = filtered.length ? filtered.map((job, index) => `
      <article class="opportunity-card">
        <div class="opportunity-cover cover-${index % 3}"><div class="opportunity-icon">${icons[index % 3]}</div><span class="match-pill">${92 - index * 3}% match</span></div>
        <div class="opportunity-content"><div class="company-row"><div class="company-mark">${(job.company_name || job.recruiter_name || 'C').charAt(0)}</div><div><span>Posted recently</span><h3>${escapeHtml(job.title)}</h3></div></div>
          <p>${escapeHtml(job.company_name || job.recruiter_name || 'Partner company')} · ${escapeHtml(job.location || 'Flexible')}</p>
          <div class="tag-row"><span>${escapeHtml(job.job_type || 'Full-time')}</span><span>Campus hiring</span><span>Verified</span></div>
          <div class="opportunity-footer"><div><small>Apply by</small><strong>${index === 0 ? 'Dec 28' : 'Jan 04'}</strong></div><button type="button" class="save-job" aria-label="Save job">♡</button><button type="button" class="view-job">View details</button></div>
        </div>
      </article>`).join('') : '<div class="empty-state"><span>⌕</span><h3>No opportunities found</h3><p>Try removing a filter or using a broader search.</p></div>';

    grid.querySelectorAll('.save-job').forEach((button, index) => button.addEventListener('click', async () => {
      const token = localStorage.getItem('authToken');
      try {
        const response = await fetch('http://localhost:3000/api/saved-jobs/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ job_id: filtered[index].id }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not save job');
        button.textContent = data.saved ? '♥' : '♡'; button.classList.toggle('saved', data.saved);
      } catch (error) { button.title = error.message; }
    }));
    grid.querySelectorAll('.view-job').forEach((button, index) => button.addEventListener('click', () => { const job = filtered[index]; window.location.href = `opportunity-detail.html?id=${job.id}`; }));
  }
  function escapeHtml(value) { const span = document.createElement('span'); span.textContent = value ?? ''; return span.innerHTML; }

  [search, type, location].forEach(control => control.addEventListener('input', render));
  document.getElementById('clearFilters').addEventListener('click', () => { search.value = ''; type.value = ''; location.value = ''; render(); });
  render();
});
