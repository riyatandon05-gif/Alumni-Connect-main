(() => {
  const API = 'http://localhost:3000/api';
  const token = () => localStorage.getItem('authToken');
  const headers = (json = true) => {
    const result = { Authorization: `Bearer ${token()}` };
    if (json) result['Content-Type'] = 'application/json';
    return result;
  };

  async function request(url, options = {}) {
    const response = await fetch(API + url, options);
    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function saveSession(data) {
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
  }

  document.addEventListener('DOMContentLoaded', () => {
    const loginFormContainer = document.getElementById('loginForm');
    const loginForm = loginFormContainer?.querySelector('form');

    loginForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const role = document.querySelector('.role-btn.active')?.dataset.role
        || window.selectedRole
        || document.getElementById('formTitle')?.textContent.replace(' Login', '');
      const email = loginForm.querySelector('input[type="email"]')?.value.trim();
      const password = loginForm.querySelector('input[type="password"]')?.value;
      if (!role || !email || !password) return alert('Please fill in all fields!');
      try {
        const data = await request('/auth/login', { method: 'POST', headers: headers(), body: JSON.stringify({ role, email, password }) });
        saveSession(data);
        alert(role + ' login successful! Redirecting...');
        window.location.href = role.toLowerCase() + '.html';
      } catch (error) { alert(error.message); }
    }, true);

    document.querySelectorAll('.role-btn').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.role-btn').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
        window.selectedRole = button.dataset.role;
      });
    });

    document.querySelectorAll('.signup-popup form').forEach(form => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const popup = form.closest('.signup-popup');
        const role = popup.id === 'signUpRecruiter' ? 'Recruiter'
          : popup.id === 'signUpAlumni' ? 'Alumni'
          : popup.id === 'signUpStudent' ? 'Student' : 'Institute';
        const values = {};
        form.querySelectorAll('input').forEach(input => {
          const key = input.type === 'email' ? 'email'
            : input.type === 'password' ? 'password'
            : input.placeholder === 'Full Name' ? 'name'
            : input.placeholder === 'Company Name' ? 'company_name'
            : input.placeholder === 'Institute Name' ? 'name'
            : input.placeholder === 'Graduation Year' ? 'graduation_year'
            : input.placeholder === 'Institute' ? 'institute' : 'name';
          values[key] = input.value.trim();
        });
        if (!values.name) {
          values.name = role === 'Recruiter' ? values.company_name : role === 'Institute' ? values.company_name : 'New User';
        }
        try {
          const data = await request('/auth/signup', { method: 'POST', headers: headers(), body: JSON.stringify({ role, ...values }) });
          saveSession(data);
          alert('Sign up successful! Please login.');
          popup.classList.add('hidden');
          loginFormContainer?.classList.remove('hidden');
          form.reset();
        } catch (error) { alert(error.message); }
      }, true);
    });

    const path = window.location.pathname;
    if (/\/(alumni|student|recruiter|institute|modify-profile|view-profile)\.html$/.test(path) && token()) {
      request('/auth/me').then(({ user }) => {
        localStorage.setItem('currentUser', JSON.stringify(user));
      }).catch(() => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
      });
    }
  });
})();
