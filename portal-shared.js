document.addEventListener('DOMContentLoaded', () => {
  const API = 'http://localhost:3000/api';
  const token = () => localStorage.getItem('authToken');
  let user;
  try { user = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { user = null; }

  async function authRequest(path, options = {}) {
    const headers = { ...(options.headers || {}), Authorization: `Bearer ${token()}` };
    if (!(options.body instanceof FormData) && options.body) headers['Content-Type'] = 'application/json';
    const response = await fetch(API + path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  const role = user?.role;
  const overviewMap = { Alumni: 'alumni.html', Student: 'student.html', Recruiter: 'recruiter.html', Institute: 'institute.html' };
  const overview = overviewMap[role] || 'student.html';

  const navbar = document.querySelector('.navbar');
  if (navbar) {
    const logo = navbar.querySelector('.logo');
    if (logo) {
      const logos = { Alumni: 'Alumni Connect', Student: 'Student Portal', Recruiter: 'Recruiter Portal', Institute: 'Institute Panel' };
      logo.textContent = logos[role] || logo.textContent;
    }
    const nav = navbar.querySelector('nav');
    if (nav) nav.innerHTML = `<ul>
      <li><a href="${overview}" class="active">Overview</a></li>
      <li><a href="opportunities.html">Opportunities</a></li>
      <li><a href="mentorship.html">Mentorship</a></li>
      <li><a href="events.html">Events</a></li>
      <li><div class="profile-dropdown"><button class="profile-dropbtn" type="button">Profile <span>⌄</span></button><div class="profile-dropdown-content"><a href="modify-profile.html">Update profile</a><a href="view-profile.html">View profile</a></div></div></li>
      <li><a href="#" id="logoutBtn">Logout</a></li>
    </ul>`;

    const profileButton = nav.querySelector('.profile-dropbtn');
    const profileDropdown = nav.querySelector('.profile-dropdown');
    profileButton?.addEventListener('click', event => { event.stopPropagation(); profileDropdown.classList.toggle('open'); });
    document.addEventListener('click', event => { if (!profileDropdown?.contains(event.target)) profileDropdown?.classList.remove('open'); });
  }

  document.querySelectorAll('#logoutBtn').forEach(button => button.addEventListener('click', event => {
    event.preventDefault(); localStorage.removeItem('authToken'); localStorage.removeItem('currentUser'); window.location.href = 'index.html';
  }));

  if (user) {
    document.querySelectorAll('#profile .profile-card').forEach(card => {
      card.innerHTML = `<p><strong>Name:</strong> ${escapeHtml(user.name)}</p><p><strong>Role:</strong> ${escapeHtml(user.role)}</p><p><strong>Email:</strong> ${escapeHtml(user.email)}</p>`;
    });
  }

  if (role === 'Recruiter') {
    const profile = document.querySelector('#profile');
    if (profile) {
      const panel = document.createElement('div'); panel.className = 'role-extra recruiter-post';
      panel.innerHTML = `<h2>Post a job</h2><form><input name="title" placeholder="Job title" required /><input name="location" placeholder="Location" /><select name="job_type"><option>Internship</option><option>Full-time</option><option>Contract</option></select><textarea name="description" placeholder="Describe the role" required></textarea><button type="submit">Publish opportunity</button></form>`;
      profile.before(panel);
      panel.querySelector('form').addEventListener('submit', async event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try { await authRequest('/jobs', { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) }); event.currentTarget.reset(); alert('Job published successfully'); }
        catch (error) { alert(error.message); }
      });
    }
  }

  if (role === 'Alumni') {
    const profile = document.querySelector('#profile');
    if (profile) {
      const panel = document.createElement('div'); panel.className = 'role-extra';
      panel.innerHTML = '<h2>Mentee requests</h2><div id="menteeRequests" class="mentee-grid"></div>'; profile.before(panel);
      authRequest('/mentorship').then(({ requests }) => {
        const grid = panel.querySelector('#menteeRequests');
        grid.innerHTML = (requests || []).map(request => `<article><span class="availability-dot"></span><div><strong>${escapeHtml(request.student_name || 'Student')}</strong><p>${escapeHtml(request.topic)} — ${escapeHtml(request.message || '')}</p></div><button type="button" data-id="${request.id}" ${request.status === 'accepted' ? 'disabled' : ''}>${request.status === 'accepted' ? 'Accepted' : 'Accept'}</button></article>`).join('');
        grid.querySelectorAll('button').forEach(button => button.addEventListener('click', async () => {
          try { await authRequest(`/mentorship/${button.dataset.id}/accept`, { method: 'PATCH' }); button.textContent = 'Accepted'; button.disabled = true; } catch (error) { alert(error.message); }
        }));
      }).catch(() => {});
    }
  }

  function escapeHtml(value) { const span = document.createElement('span'); span.textContent = value ?? ''; return span.innerHTML; }
});
