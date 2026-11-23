document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(location.search);
  const id = Number(params.get('id')) || 1;
  try {
    const response = await fetch('http://localhost:3000/api/jobs');
    const jobs = (await response.json()).jobs || [];
    const job = jobs.find(item => Number(item.id) === id) || jobs[0];
    if (job) {
      document.getElementById('detailTitle').textContent = job.title;
      document.getElementById('detailCompany').textContent = `${job.company_name || job.recruiter_name} · ${job.location || 'Flexible'}`;
      document.getElementById('detailDescription').textContent = job.description || 'This is a verified opportunity from a trusted partner.';
      document.getElementById('detailCompanySide').textContent = job.company_name || job.recruiter_name;
      document.getElementById('detailLocation').textContent = job.location || 'Flexible';
      document.getElementById('detailType').textContent = job.job_type || 'Full-time';
      document.getElementById('detailTypeSide').textContent = job.job_type || 'Full-time';
    }
  } catch {}
  document.getElementById('applyJob').addEventListener('click', async event => {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch {}
    if (user?.role !== 'Student') { event.currentTarget.textContent = 'Students only'; event.currentTarget.disabled = true; return; }
    try {
      const response = await fetch('http://localhost:3000/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` }, body: JSON.stringify({ job_id: id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not submit application');
      event.currentTarget.textContent = 'Application sent ✓'; event.currentTarget.disabled = true;
    } catch (error) { event.currentTarget.textContent = error.message; }
  });
  document.querySelector('.save-detail').addEventListener('click', async event => {
    try {
      const response = await fetch('http://localhost:3000/api/saved-jobs/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` }, body: JSON.stringify({ job_id: id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save job');
      event.currentTarget.textContent = data.saved ? '♥ Opportunity saved' : '♡ Save opportunity';
    } catch (error) { event.currentTarget.textContent = error.message; }
  });
});
