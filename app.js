/* ============================================================
   BIZOPS DASHBOARD — app.js
   All module logic, localStorage CRUD, charts, role gating
   ============================================================ */

'use strict';

// ── Auth Module ─────────────────────────────────────────────
const Auth = {
  mode: 'login', // 'login' or 'register'

  // Simple hash for localStorage (not cryptographically secure — fine for local-only app)
  _hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(36);
  },

  init() {
    const session = this._getSession();
    if (session) {
      this._showDashboard(session);
    } else {
      this._showLogin();
    }
  },

  _getSession() {
    try {
      const s = JSON.parse(localStorage.getItem('biz_auth_session'));
      if (s && s.email && s.loggedIn) return s;
    } catch {}
    return null;
  },

  _getUsers() {
    try {
      return JSON.parse(localStorage.getItem('biz_auth_users')) || [];
    } catch { return []; }
  },

  _saveUsers(users) {
    localStorage.setItem('biz_auth_users', JSON.stringify(users));
  },

  _showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    setTimeout(() => {
      const emailInput = document.getElementById('login-email');
      if (emailInput) emailInput.focus();
    }, 300);
  },

  _showDashboard(session) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
  },

  toggleMode() {
    this.mode = this.mode === 'login' ? 'register' : 'login';
    const isRegister = this.mode === 'register';

    document.getElementById('login-heading').textContent = isRegister ? 'Create account' : 'Welcome back';
    document.getElementById('login-subheading').textContent = isRegister ? 'Set up your operations center' : 'Sign in to your operations center';
    document.getElementById('login-btn-text').textContent = isRegister ? 'Create Account' : 'Sign In';
    document.getElementById('login-toggle-label').textContent = isRegister ? 'Already have an account?' : "Don't have an account?";
    document.getElementById('login-toggle-btn').textContent = isRegister ? 'Sign in' : 'Create one';
    document.getElementById('login-name-field').style.display = isRegister ? '' : 'none';
    document.getElementById('login-error').textContent = '';

    // Adjust autocomplete hint
    document.getElementById('login-password').autocomplete = isRegister ? 'new-password' : 'current-password';
  },

  togglePasswordVisibility() {
    const pwInput = document.getElementById('login-password');
    const eyeBtn = document.getElementById('login-eye-btn');
    if (pwInput.type === 'password') {
      pwInput.type = 'text';
      eyeBtn.textContent = '🙈';
      eyeBtn.title = 'Hide password';
    } else {
      pwInput.type = 'password';
      eyeBtn.textContent = '👁️';
      eyeBtn.title = 'Show password';
    }
  },

  handleSubmit(e) {
    e.preventDefault();
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';

    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const name = document.getElementById('login-name')?.value.trim() || '';

    if (!email || !password) {
      errorEl.textContent = 'Please fill in all fields.';
      return;
    }

    // Show spinner
    document.getElementById('login-btn-text').style.display = 'none';
    document.getElementById('login-btn-spinner').style.display = '';
    document.getElementById('login-submit-btn').disabled = true;

    // Simulate slight delay for polish
    setTimeout(() => {
      if (this.mode === 'register') {
        this._register(email, password, name, errorEl);
      } else {
        this._login(email, password, errorEl);
      }
      // Reset spinner
      document.getElementById('login-btn-text').style.display = '';
      document.getElementById('login-btn-spinner').style.display = 'none';
      document.getElementById('login-submit-btn').disabled = false;
    }, 600);
  },

  _register(email, password, name, errorEl) {
    if (password.length < 4) {
      errorEl.textContent = 'Password must be at least 4 characters.';
      return;
    }
    const users = this._getUsers();
    if (users.find(u => u.email === email)) {
      errorEl.textContent = 'An account with this email already exists.';
      return;
    }
    const user = {
      id: Date.now().toString(36),
      email,
      name: name || email.split('@')[0],
      passwordHash: this._hash(password),
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    this._saveUsers(users);

    // Auto-login after registration
    const session = { email: user.email, name: user.name, loggedIn: true, loginAt: new Date().toISOString() };
    localStorage.setItem('biz_auth_session', JSON.stringify(session));
    this._showDashboard(session);

    // Initialize the app after showing dashboard
    if (typeof App !== 'undefined' && App.init) App.init();
  },

  _login(email, password, errorEl) {
    const users = this._getUsers();
    const user = users.find(u => u.email === email);
    if (!user) {
      errorEl.textContent = 'No account found with this email.';
      return;
    }
    if (user.passwordHash !== this._hash(password)) {
      errorEl.textContent = 'Incorrect password. Please try again.';
      return;
    }
    const session = { email: user.email, name: user.name, loggedIn: true, loginAt: new Date().toISOString() };
    localStorage.setItem('biz_auth_session', JSON.stringify(session));
    this._showDashboard(session);

    // Initialize the app after showing dashboard
    if (typeof App !== 'undefined' && App.init) App.init();
  },

  logout() {
    if (!confirm('Sign out of BizOps Dashboard?')) return;
    localStorage.removeItem('biz_auth_session');
    this._showLogin();
    // Reset form
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-name').value = '';
    document.getElementById('login-error').textContent = '';
    this.mode = 'login';
    this.toggleMode(); // Reset to login mode visuals
    this.toggleMode(); // Toggle back (sets to login)
  },

  getCurrentUser() {
    const session = this._getSession();
    return session ? { email: session.email, name: session.name } : null;
  },
};

// ── Utilities ───────────────────────────────────────────────
const $ = id => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toISOString().slice(0, 10);
const fmt$ = n => isNaN(+n) ? '$0.00' : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const daysUntil = d => Math.floor((new Date(d + 'T12:00:00') - new Date()) / 86400000);

function store(key, val) { localStorage.setItem('biz_' + key, JSON.stringify(val)); }
function load(key, def) { try { return JSON.parse(localStorage.getItem('biz_' + key)) ?? def; } catch { return def; } }

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = (type === 'success' ? '✅' : '❌') + ' ' + msg;
  $('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ── Panel & Navigation ──────────────────────────────────────
const PANELS = {
  profile:    { title: 'Business Profile',    sub: 'Legal entity · Brand assets · Contacts' },
  ar:         { title: 'Accounts Receivable', sub: 'Client invoices · Payment tracking · LTV' },
  ap:         { title: 'Accounts Payable',    sub: 'Vendor bills · Subscriptions · Expenses' },
  assets:     { title: 'Assets & HR',         sub: 'Equipment · Licenses · Payroll · Personnel' },
  compliance: { title: 'Compliance Calendar', sub: 'Regulatory filings · Tax deadlines · Insurance' },
  kpi:        { title: 'KPI Dashboard',       sub: 'Revenue · MRR · Burn rate · Profit margin' },
  calendar:   { title: 'Calendar',            sub: 'Meetings · Parties met with · Schedules' },
};

function switchPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const panel = $('panel-' + name);
  const nav   = $('nav-' + name);
  if (panel) panel.classList.add('active');
  if (nav)   nav.classList.add('active');
  $('topbar-title').textContent    = PANELS[name]?.title || '';
  $('topbar-subtitle').textContent = PANELS[name]?.sub   || '';
  App.currentPanel = name;
  if (name === 'kpi') App.KPI.initCharts();
  App.refreshBadges();
}

// ── Role Gating ─────────────────────────────────────────────
function applyRole(role) {
  const isAdmin = role === 'admin';
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });
  $('role-badge-display').textContent = isAdmin ? 'ADMIN' : 'MANAGER';
  $('role-badge-display').className   = 'role-badge ' + role;
  $('role-admin').classList.toggle('active', isAdmin);
  $('role-manager').classList.toggle('active', !isAdmin);
  // If manager tries to view HR sub-tab, redirect to equipment
  if (!isAdmin && App.Assets?.currentTab === 'hr') App.Assets.switchTab('equipment');
}

// ── Main App Object ─────────────────────────────────────────
const App = {
  role: load('role', 'manager'),
  currentPanel: 'profile',

  init() {
    // Nav clicks
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => switchPanel(el.dataset.panel));
    });
    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
    });
    applyRole(this.role);
    this.Profile.load();
    this.AR.render();
    this.AP.render();
    this.Assets.render();
    this.Compliance.render();
    this.Calendar.render();
    this.KPI.load();
    this.refreshBadges();
    
    // Initialize Projects
    this.populateProjectDropdowns();
    this.renderProjectsList();
    
    switchPanel('profile');

    // PIN input auto-advance & keyboard nav
    const pinDigits = [0,1,2,3].map(i => $('pin-' + i));
    pinDigits.forEach((inp, i) => {
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/[^0-9]/g, '');
        if (inp.value && i < 3) pinDigits[i + 1].focus();
      });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !inp.value && i > 0) {
          pinDigits[i - 1].focus();
          pinDigits[i - 1].value = '';
        }
        if (e.key === 'Enter') App.verifyAdminPin();
      });
      inp.addEventListener('paste', e => {
        e.preventDefault();
        const paste = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 4);
        paste.split('').forEach((ch, j) => { if (pinDigits[j]) pinDigits[j].value = ch; });
        if (paste.length >= 4) pinDigits[3].focus();
        else if (pinDigits[paste.length]) pinDigits[paste.length].focus();
      });
    });
  },

  setRole(role) {
    this.role = role;
    store('role', role);
    applyRole(role);
    this.refreshBadges();
  },

  // ── Admin PIN Gate ──────────────────────────────────────
  promptAdminPin() {
    // Already admin? Skip.
    if (this.role === 'admin') return;
    [0,1,2,3].forEach(i => { $('pin-' + i).value = ''; });
    $('pin-error').textContent = '';
    $('modal-admin-pin').classList.add('open');
    setTimeout(() => $('pin-0').focus(), 120);
  },

  verifyAdminPin() {
    const entered = [0,1,2,3].map(i => $('pin-' + i).value).join('');
    const stored  = load('admin_pin', '0000');
    if (entered.length < 4) {
      $('pin-error').textContent = 'Please enter all 4 digits.';
      this._shakePin();
      return;
    }
    if (entered === stored) {
      this.closeModal('modal-admin-pin');
      this.setRole('admin');
      toast('Admin access granted. \u{1F513}');
    } else {
      $('pin-error').textContent = 'Incorrect PIN. Try again.';
      this._shakePin();
      [0,1,2,3].forEach(i => { $('pin-' + i).value = ''; });
      setTimeout(() => $('pin-0').focus(), 200);
    }
  },

  _shakePin() {
    const row = $('pin-input-row');
    row.classList.remove('shake');
    void row.offsetWidth; // reflow
    row.classList.add('shake');
  },

  changeAdminPin() {
    const current = $('admin-current-pin').value.trim();
    const newPin  = $('admin-new-pin').value.trim();
    const stored  = load('admin_pin', '0000');
    if (current !== stored) { toast('Current PIN is incorrect.', 'error'); return; }
    if (!/^\d{4}$/.test(newPin)) { toast('New PIN must be exactly 4 digits.', 'error'); return; }
    if (newPin === current) { toast('New PIN must be different from current PIN.', 'error'); return; }
    store('admin_pin', newPin);
    $('admin-current-pin').value = '';
    $('admin-new-pin').value = '';
    toast('Admin PIN updated successfully. \u{1F510}');
  },

  openAddModal() {
    const map = { profile: () => App.openProfileModal(), ar: () => App.AR.openModal(), ap: () => App.AP.openModal(), assets: () => App.Assets.openModal(), compliance: () => App.Compliance.openModal(), kpi: () => App.KPI.saveSnapshot(), calendar: () => App.Calendar.openModal() };
    (map[this.currentPanel] || (() => {}))();
  },

  openProfileModal() { this.Profile.openModal(); },

  closeModal(id) { $(id)?.classList.remove('open'); },

  refreshBadges() {
    // AR overdue badge
    const arOverdue = load('ar', []).filter(r => r.status === 'Overdue').length;
    const arBadge = $('ar-badge');
    arBadge.textContent = arOverdue;
    arBadge.style.display = arOverdue ? '' : 'none';
    // AP overdue badge
    const apOverdue = load('ap', []).filter(r => r.status === 'Overdue').length;
    const apBadge = $('ap-badge');
    apBadge.textContent = apOverdue;
    apBadge.style.display = apOverdue ? '' : 'none';
    // Compliance urgent badge
    const compUrgent = load('compliance', []).filter(r => r.status === 'pending' && daysUntil(r.due) <= 30).length;
    const compBadge = $('comp-badge');
    compBadge.textContent = compUrgent;
    compBadge.style.display = compUrgent ? '' : 'none';
  },

  // ── Projects / Sub-Businesses ─────────────────────────────
  getProjects() { return load('projects', []); },
  addProject() {
    const input = $('new-project-name');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return;
    const projects = this.getProjects();
    if (projects.some(p => p.toLowerCase() === name.toLowerCase())) {
      toast('Project already exists.', 'error'); return;
    }
    projects.push(name);
    store('projects', projects);
    input.value = '';
    toast('Project added.');
    this.populateProjectDropdowns();
    this.renderProjectsList();
  },
  removeProject(name) {
    if (!confirm(`Remove project "${name}"? Items assigned to it will remain but won't be filterable.`)) return;
    const projects = this.getProjects().filter(p => p !== name);
    store('projects', projects);
    this.populateProjectDropdowns();
    this.renderProjectsList();
  },
  renderProjectsList() {
    const container = $('profile-projects-list');
    if (!container) return;
    const projects = this.getProjects();
    if (projects.length === 0) {
      container.innerHTML = '<span style="color:var(--text-muted);font-size:12px">No projects defined.</span>';
      return;
    }
    container.innerHTML = projects.map(p => `
      <div class="badge badge-blue" style="display:flex;align-items:center;gap:6px;padding:4px 8px;font-size:12px;background:rgba(59,130,246,0.1)">
        ${p}
        <button onclick="App.removeProject('${p.replace(/'/g, "\\'")}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:10px;padding:0">&times;</button>
      </div>
    `).join('');
  },
  populateProjectDropdowns() {
    const projects = this.getProjects();
    const optionsHtml = '<option value="">General / Unassigned</option>' + 
                         projects.map(p => `<option value="${p}">${p}</option>`).join('');
    document.querySelectorAll('.project-dropdown').forEach(select => {
      const currentVal = select.value;
      select.innerHTML = optionsHtml;
      if (currentVal && projects.includes(currentVal)) select.value = currentVal;
    });

    const filterOptionsHtml = '<option value="">All Projects</option><option value="unassigned">General / Unassigned</option>' + 
                               projects.map(p => `<option value="${p}">${p}</option>`).join('');
    document.querySelectorAll('.project-filter').forEach(select => {
      if (select.id === 'kpi-project-select') {
        const currentVal = select.value;
        select.innerHTML = '<option value="">Overview (All / Global)</option>' + 
                           projects.map(p => `<option value="${p}">${p}</option>`).join('');
        if (currentVal && projects.includes(currentVal)) select.value = currentVal;
        return;
      }
      const currentVal = select.value;
      select.innerHTML = filterOptionsHtml;
      if (currentVal && [...projects, 'unassigned'].includes(currentVal)) select.value = currentVal;
    });
  },

  // ── Business Profile ──────────────────────────────────────
  Profile: {
    data: {},
    load() {
      this.data = load('profile', {});
      this.render();
    },
    openModal() {
      const d = this.data;
      $('p-name').value    = d.name    || '';
      $('p-entity').value  = d.entity  || 'LLC';
      $('p-industry').value= d.industry|| '';
      $('p-year').value    = d.year    || '';
      $('p-ein').value     = d.ein     || '';
      $('p-state').value   = d.state   || '';
      $('p-phone').value   = d.phone   || '';
      $('p-email').value   = d.email   || '';
      $('p-address').value = d.address || '';
      $('p-website').value = d.website || '';
      $('p-colors').value  = d.colors  || '';
      $('p-tagline').value = d.tagline || '';
      $('p-bank').value    = d.bank    || '';
      $('p-acct').value    = d.acct    || '';
      $('modal-profile').classList.add('open');
    },
    render() {
      const d = this.data;
      $('profile-name').textContent = d.name || 'My Company LLC';
      $('profile-type').textContent = [d.entity, d.industry].filter(Boolean).join(' · ') || 'LLC · —';
      $('profile-ein-badge').textContent   = 'EIN: ' + (d.ein   || '—');
      $('profile-state-badge').textContent = 'State: ' + (d.state || '—');
      $('profile-year-badge').textContent  = 'Est. ' + (d.year  || '—');

      $('profile-contacts-view').innerHTML = d.phone || d.email || d.address || d.website ? `
        <div style="display:flex;flex-direction:column;gap:10px">
          ${d.phone   ? `<div class="flex-center gap-8"><span style="color:var(--text-muted);font-size:12px;width:60px">Phone</span><span>${d.phone}</span></div>` : ''}
          ${d.email   ? `<div class="flex-center gap-8"><span style="color:var(--text-muted);font-size:12px;width:60px">Email</span><a href="mailto:${d.email}" style="color:var(--accent-light)">${d.email}</a></div>` : ''}
          ${d.address ? `<div class="flex-center gap-8"><span style="color:var(--text-muted);font-size:12px;width:60px">Address</span><span>${d.address}</span></div>` : ''}
          ${d.website ? `<div class="flex-center gap-8"><span style="color:var(--text-muted);font-size:12px;width:60px">Website</span><a href="${d.website}" target="_blank" style="color:var(--accent-light)">${d.website}</a></div>` : ''}
        </div>` : '<div class="empty-state" style="padding:30px 0"><div class="empty-desc">No contact info saved.</div></div>';

      $('profile-brand-view').innerHTML = d.tagline || d.colors ? `
        <div style="display:flex;flex-direction:column;gap:12px">
          ${d.tagline ? `<p style="color:var(--text-secondary);font-style:italic">"${d.tagline}"</p>` : ''}
          ${d.colors  ? `<div><div class="form-label">Brand Colors</div><div style="display:flex;gap:8px;flex-wrap:wrap">${d.colors.split(',').map(c => `<div style="width:32px;height:32px;border-radius:6px;background:${c.trim()};border:1px solid var(--border)" title="${c.trim()}"></div>`).join('')}</div></div>` : ''}
        </div>` : '<div class="empty-state" style="padding:30px 0"><div class="empty-desc">No brand info saved.</div></div>';

      $('profile-bank-view').innerHTML = (d.bank || d.acct) ? `
        <div style="display:flex;flex-direction:column;gap:10px">
          ${d.bank ? `<div class="flex-center gap-8"><span style="color:var(--text-muted);font-size:12px;width:80px">Bank</span><span>${d.bank}</span></div>` : ''}
          ${d.acct ? `<div class="flex-center gap-8"><span style="color:var(--text-muted);font-size:12px;width:80px">Account</span><span>••••${d.acct}</span></div>` : ''}
        </div>` : '<div class="empty-state" style="padding:30px 0"><div class="empty-desc">No banking info saved.</div></div>';
    },
  },

  // ── Accounts Receivable ───────────────────────────────────
  AR: {
    editId: null,
    openModal(id) {
      this.editId = id || null;
      $('ar-modal-title').textContent = id ? '✏️ Edit Invoice' : '💰 New Invoice';
      if (id) {
        const rec = load('ar', []).find(r => r.id === id);
        if (rec) {
          $('ar-client').value    = rec.client;
          $('ar-inv-num').value   = rec.invNum;
          $('ar-amount').value    = rec.amount;
          $('ar-status').value    = rec.status;
          $('ar-issue-date').value= rec.issueDate;
          $('ar-due-date').value  = rec.dueDate;
          $('ar-notes').value     = rec.notes;
          $('ar-project').value   = rec.project || '';
        }
      } else {
        ['ar-client','ar-inv-num','ar-amount','ar-notes'].forEach(i => $(i).value = '');
        $('ar-status').value     = 'Draft';
        $('ar-issue-date').value = today();
        $('ar-due-date').value   = '';
        $('ar-project').value    = '';
        // Auto-generate invoice number
        const recs = load('ar', []);
        $('ar-inv-num').value = 'INV-' + String(recs.length + 1).padStart(3, '0');
      }
      $('ar-edit-id').value = id || '';
      $('modal-ar').classList.add('open');
    },
    save() {
      const client = $('ar-client').value.trim();
      const amount = $('ar-amount').value;
      if (!client || !amount) { toast('Client name and amount are required.', 'error'); return; }
      const recs = load('ar', []);
      const rec = {
        id: this.editId || uid(),
        client, invNum: $('ar-inv-num').value.trim(),
        amount: parseFloat(amount),
        status: $('ar-status').value,
        issueDate: $('ar-issue-date').value,
        dueDate: $('ar-due-date').value,
        notes: $('ar-notes').value.trim(),
        project: $('ar-project').value,
      };
      if (this.editId) {
        const idx = recs.findIndex(r => r.id === this.editId);
        if (idx > -1) recs[idx] = rec;
      } else { recs.push(rec); }
      store('ar', recs);
      App.closeModal('modal-ar');
      this.render();
      App.refreshBadges();
      toast(this.editId ? 'Invoice updated.' : 'Invoice created.');
      this.editId = null;
    },
    delete(id) {
      if (!confirm('Delete this invoice?')) return;
      store('ar', load('ar', []).filter(r => r.id !== id));
      this.render(); App.refreshBadges(); toast('Invoice deleted.');
    },
    flagOverdue() {
      const recs = load('ar', []).map(r => {
        if (r.status !== 'Paid' && r.dueDate && daysUntil(r.dueDate) < 0) r.status = 'Overdue';
        return r;
      });
      store('ar', recs); this.render(); App.refreshBadges();
      toast('Overdue invoices flagged.');
    },
    render() {
      let recs = load('ar', []);
      const search = ($('ar-search')?.value || '').toLowerCase();
      const filterStatus = $('ar-filter-status')?.value || '';
      const filterProject = $('ar-filter-project')?.value || '';
      const filterClient = $('ar-filter-client')?.value || '';
      const filterMonth = $('ar-filter-month')?.value || '';

      if (search) recs = recs.filter(r => r.client.toLowerCase().includes(search) || r.invNum.toLowerCase().includes(search));
      if (filterStatus) recs = recs.filter(r => r.status === filterStatus);
      if (filterProject === 'unassigned') recs = recs.filter(r => !r.project);
      else if (filterProject) recs = recs.filter(r => r.project === filterProject);
      if (filterClient) recs = recs.filter(r => r.client === filterClient);
      if (filterMonth) recs = recs.filter(r => (r.issueDate && r.issueDate.startsWith(filterMonth)) || (r.dueDate && r.dueDate.startsWith(filterMonth)));

      // Stats
      const all = load('ar', []);

      // Populate Client dropdown
      const clientsList = [...new Set(all.map(r => r.client).filter(Boolean))].sort();
      const clientSelect = $('ar-filter-client');
      if (clientSelect) {
        const currentClient = clientSelect.value;
        clientSelect.innerHTML = '<option value="">All Clients</option>' + clientsList.map(c => `<option value="${c}">${c}</option>`).join('');
        if (clientsList.includes(currentClient)) clientSelect.value = currentClient;
      }

      // Populate Month dropdown
      const arMonths = [...new Set(all.flatMap(r => [r.issueDate?.substring(0, 7), r.dueDate?.substring(0, 7)]).filter(Boolean))].sort().reverse();
      const arMonthSelect = $('ar-filter-month');
      if (arMonthSelect) {
        const currentMonth = arMonthSelect.value;
        arMonthSelect.innerHTML = '<option value="">All Months</option>' + arMonths.map(m => {
          const d = new Date(m + '-02');
          return `<option value="${m}">${d.toLocaleString('default', { month: 'short', year: 'numeric' })}</option>`;
        }).join('');
        if (arMonths.includes(currentMonth)) arMonthSelect.value = currentMonth;
      }

      const totalAR = all.reduce((s, r) => s + (r.status !== 'Paid' ? +r.amount : 0), 0);
      const totalPaid = all.reduce((s, r) => s + (r.status === 'Paid' ? +r.amount : 0), 0);
      const overdue = all.filter(r => r.status === 'Overdue').length;
      const clients = [...new Set(all.map(r => r.client))];
      $('ar-stats').innerHTML = `
        <div class="stat-card"><div class="stat-label">Outstanding</div><div class="stat-value">${fmt$(totalAR)}</div></div>
        <div class="stat-card"><div class="stat-label">Collected</div><div class="stat-value text-green">${fmt$(totalPaid)}</div></div>
        <div class="stat-card"><div class="stat-label">Overdue</div><div class="stat-value text-red">${overdue}</div></div>
        <div class="stat-card"><div class="stat-label">Clients</div><div class="stat-value">${clients.length}</div></div>`;

      const statusBadge = s => ({ Draft:'badge-gray', Sent:'badge-blue', Overdue:'badge-red', Paid:'badge-green' }[s] || 'badge-gray');
      $('ar-tbody').innerHTML = recs.length ? recs.map(r => `
        <tr>
          <td class="fw-700">${r.invNum || '—'}</td>
          <td>${r.client}</td>
          <td class="fw-700">${fmt$(r.amount)}</td>
          <td class="td-muted">${fmtDate(r.issueDate)}</td>
          <td class="td-muted">${fmtDate(r.dueDate)}</td>
          <td><span class="badge ${statusBadge(r.status)}">${r.status}</span></td>
          <td>
            <div style="display:flex;gap:6px">
              <button class="btn-icon" title="Edit" onclick="App.AR.openModal('${r.id}')">✏️</button>
              <button class="btn-icon" title="Delete" onclick="App.AR.delete('${r.id}')">🗑️</button>
            </div>
          </td>
        </tr>`).join('') : `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">💰</div><div class="empty-title">No invoices yet</div><div class="empty-desc">Click "+ New Invoice" to get started.</div></div></td></tr>`;
    },
  },

  // ── Accounts Payable ──────────────────────────────────────
  AP: {
    editId: null,
    openModal(id) {
      this.editId = id || null;
      $('ap-modal-title').textContent = id ? '✏️ Edit Bill' : '📤 New Bill';
      if (id) {
        const rec = load('ap', []).find(r => r.id === id);
        if (rec) {
          $('ap-vendor').value    = rec.vendor;
          $('ap-amount').value    = rec.amount;
          $('ap-due').value       = rec.due;
          $('ap-cat').value       = rec.cat;
          $('ap-status').value    = rec.status;
          $('ap-recurring').value = rec.recurring || '';
          $('ap-desc').value      = rec.desc;
          $('ap-project').value   = rec.project || '';
        }
      } else {
        ['ap-vendor','ap-amount','ap-desc'].forEach(i => $(i).value = '');
        $('ap-due').value       = '';
        $('ap-cat').value       = 'OpEx';
        $('ap-status').value    = 'Pending';
        $('ap-recurring').value = '';
        $('ap-project').value   = '';
      }
      $('ap-edit-id').value = id || '';
      $('modal-ap').classList.add('open');
    },
    save() {
      const vendor = $('ap-vendor').value.trim();
      const amount = $('ap-amount').value;
      if (!vendor || !amount) { toast('Vendor name and amount are required.', 'error'); return; }
      const recs = load('ap', []);
      const rec = {
        id: this.editId || uid(),
        vendor, amount: parseFloat(amount),
        due: $('ap-due').value, cat: $('ap-cat').value,
        status: $('ap-status').value, recurring: $('ap-recurring').value,
        desc: $('ap-desc').value.trim(),
        project: $('ap-project').value,
      };
      if (this.editId) { const idx = recs.findIndex(r => r.id === this.editId); if (idx > -1) recs[idx] = rec; }
      else recs.push(rec);
      store('ap', recs); App.closeModal('modal-ap'); this.render(); App.refreshBadges();
      toast(this.editId ? 'Bill updated.' : 'Bill created.'); this.editId = null;
    },
    delete(id) {
      if (!confirm('Delete this bill?')) return;
      store('ap', load('ap', []).filter(r => r.id !== id)); this.render(); App.refreshBadges(); toast('Bill deleted.');
    },
    copy(id) {
      const rec = load('ap', []).find(r => r.id === id);
      if (!rec) return;
      this.editId = null;
      $('ap-modal-title').textContent = '📤 Copy Bill';
      $('ap-vendor').value    = rec.vendor;
      $('ap-amount').value    = rec.amount;
      $('ap-due').value       = rec.due;
      $('ap-cat').value       = rec.cat;
      $('ap-status').value    = rec.status;
      $('ap-recurring').value = rec.recurring || '';
      $('ap-desc').value      = rec.desc;
      $('ap-project').value   = rec.project || '';
      $('ap-edit-id').value   = '';
      $('modal-ap').classList.add('open');
    },
    render() {
      let recs = load('ap', []);
      const search = ($('ap-search')?.value || '').toLowerCase();
      const filterCat = $('ap-filter-cat')?.value || '';
      const filterStatus = $('ap-filter-status')?.value || '';
      const filterProj = $('ap-filter-project')?.value || '';
      const filterVendor = $('ap-filter-vendor')?.value || '';
      const filterMonth = $('ap-filter-month')?.value || '';

      if (search) recs = recs.filter(r => r.vendor.toLowerCase().includes(search));
      if (filterCat) recs = recs.filter(r => r.cat === filterCat);
      if (filterStatus) recs = recs.filter(r => r.status === filterStatus);
      if (filterProj === 'unassigned') recs = recs.filter(r => !r.project);
      else if (filterProj) recs = recs.filter(r => r.project === filterProj);
      if (filterVendor) recs = recs.filter(r => r.vendor === filterVendor);
      if (filterMonth) recs = recs.filter(r => r.due && r.due.startsWith(filterMonth));

      const sort = $('ap-sort')?.value || '';
      if (sort === 'recent') recs.sort((a, b) => new Date(b.due || 0) - new Date(a.due || 0));
      else if (sort === 'oldest') recs.sort((a, b) => new Date(a.due || 0) - new Date(b.due || 0));
      else if (sort === 'expensive') recs.sort((a, b) => b.amount - a.amount);
      else if (sort === 'least-expensive') recs.sort((a, b) => a.amount - b.amount);

      const all = load('ap', []);

      // Populate Vendor dropdown
      const vendorsList = [...new Set(all.map(r => r.vendor).filter(Boolean))].sort();
      const vendorSelect = $('ap-filter-vendor');
      if (vendorSelect) {
        const currentVendor = vendorSelect.value;
        vendorSelect.innerHTML = '<option value="">All Vendors</option>' + vendorsList.map(v => `<option value="${v}">${v}</option>`).join('');
        if (vendorsList.includes(currentVendor)) vendorSelect.value = currentVendor;
      }

      // Populate Month dropdown
      const apMonths = [...new Set(all.map(r => r.due?.substring(0, 7)).filter(Boolean))].sort().reverse();
      const apMonthSelect = $('ap-filter-month');
      if (apMonthSelect) {
        const currentMonth = apMonthSelect.value;
        apMonthSelect.innerHTML = '<option value="">All Months</option>' + apMonths.map(m => {
          const d = new Date(m + '-02');
          return `<option value="${m}">${d.toLocaleString('default', { month: 'short', year: 'numeric' })}</option>`;
        }).join('');
        if (apMonths.includes(currentMonth)) apMonthSelect.value = currentMonth;
      }

      const totalDue   = all.filter(r => r.status !== 'Paid').reduce((s, r) => s + +r.amount, 0);
      const totalPaid  = all.filter(r => r.status === 'Paid').reduce((s, r) => s + +r.amount, 0);
      const overdue    = all.filter(r => r.status === 'Overdue').length;
      const subs       = all.filter(r => r.recurring).length;
      $('ap-stats').innerHTML = `
        <div class="stat-card"><div class="stat-label">Total Due</div><div class="stat-value">${fmt$(totalDue)}</div></div>
        <div class="stat-card"><div class="stat-label">Paid Out</div><div class="stat-value text-green">${fmt$(totalPaid)}</div></div>
        <div class="stat-card"><div class="stat-label">Overdue Bills</div><div class="stat-value text-red">${overdue}</div></div>
        <div class="stat-card"><div class="stat-label">Recurring</div><div class="stat-value">${subs}</div></div>`;

      const catBadge = c => ({ OpEx:'badge-blue', Subscription:'badge-purple', 'Tax-Deductible':'badge-green', CapEx:'badge-yellow', Other:'badge-gray' }[c] || 'badge-gray');
      const statusBadge = s => ({ Pending:'badge-yellow', Paid:'badge-green', Overdue:'badge-red' }[s] || 'badge-gray');

      $('ap-tbody').innerHTML = recs.length ? recs.map(r => {
        const days = r.due ? daysUntil(r.due) : null;
        const countdown = days !== null && r.status !== 'Paid' ? `<span class="badge ${days < 0 ? 'badge-red' : days <= 7 ? 'badge-yellow' : 'badge-gray'}" style="margin-left:6px;font-size:10px">${days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}</span>` : '';
        return `<tr>
          <td class="fw-700">${r.vendor}${r.recurring ? ` <span class="badge badge-purple" style="font-size:10px">🔁 ${r.recurring}</span>` : ''}${r.project ? ` <span class="badge badge-blue" style="font-size:10px;margin-left:6px">${r.project}</span>` : ''}</td>
          <td class="td-muted">${r.desc || '—'}</td>
          <td class="fw-700">${fmt$(r.amount)}</td>
          <td>${fmtDate(r.due)}${countdown}</td>
          <td><span class="badge ${catBadge(r.cat)}">${r.cat}</span></td>
          <td><span class="badge ${statusBadge(r.status)}">${r.status}</span></td>
          <td><div style="display:flex;gap:6px">
            <button class="btn-icon" title="Copy" onclick="App.AP.copy('${r.id}')">📄</button>
            <button class="btn-icon" title="Edit" onclick="App.AP.openModal('${r.id}')">✏️</button>
            <button class="btn-icon" title="Delete" onclick="App.AP.delete('${r.id}')">🗑️</button>
          </div></td>
        </tr>`;
      }).join('') : `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📤</div><div class="empty-title">No bills yet</div><div class="empty-desc">Click "+ New Bill" to add a vendor bill.</div></div></td></tr>`;
    },
  },

  // ── Assets & HR ──────────────────────────────────────────
  Assets: {
    currentTab: 'equipment',
    editId: null,
    switchTab(tab) {
      if (tab === 'hr' && App.role !== 'admin') { toast('HR access is Admin only.', 'error'); return; }
      this.currentTab = tab;
      ['equipment','licenses','hr'].forEach(t => {
        $('assets-' + t).style.display = t === tab ? '' : 'none';
        const btn = $('assets-tab-btn-' + t.slice(0,2) + (t === 'equipment' ? 'q' : t === 'licenses' ? 'c' : 'r'));
        if (btn) { btn.style.borderColor = t === tab ? 'var(--accent)' : ''; btn.style.color = t === tab ? 'var(--accent-light)' : ''; }
      });
      // Fix button refs
      const btnEq  = $('assets-tab-btn-eq');
      const btnLic = $('assets-tab-btn-lic');
      const btnHr  = $('assets-tab-btn-hr');
      [btnEq, btnLic, btnHr].forEach(b => { if (b) { b.style.borderColor = ''; b.style.color = ''; } });
      const activeBtn = { equipment: btnEq, licenses: btnLic, hr: btnHr }[tab];
      if (activeBtn) { activeBtn.style.borderColor = 'var(--accent)'; activeBtn.style.color = 'var(--accent-light)'; }
    },
    openModal(id) {
      this.editId = id || null;
      $('asset-type').value = this.currentTab === 'hr' ? 'hr' : this.currentTab === 'licenses' ? 'license' : 'equipment';
      this.toggleForm();
      if (!id) {
        ['eq-name','eq-serial','eq-assigned','eq-value','lic-name','lic-key','lic-assigned','lic-cost','hr-name','hr-role','hr-salary','hr-emergency'].forEach(i => { if ($(i)) $(i).value = ''; });
        $('eq-date').value = today();
        $('eq-status').value = 'Active';
        $('lic-status').value = 'Active';
        if ($('eq-project')) $('eq-project').value = '';
        if ($('lic-project')) $('lic-project').value = '';
        if ($('hr-project')) $('hr-project').value = '';
      } else {
        const type = this.currentTab;
        const rec = load(type === 'licenses' ? 'assets_lic' : type === 'hr' ? 'assets_hr' : 'assets_eq', []).find(r => r.id === id);
        if (rec && type === 'equipment') {
          $('eq-name').value = rec.name; $('eq-cat').value = rec.cat; $('eq-serial').value = rec.serial;
          $('eq-assigned').value = rec.assigned; $('eq-date').value = rec.date; $('eq-value').value = rec.value; $('eq-status').value = rec.status;
          $('eq-project').value = rec.project || '';
        } else if (rec && type === 'licenses') {
          $('lic-name').value = rec.name; $('lic-key').value = rec.key; $('lic-assigned').value = rec.assigned;
          $('lic-cost').value = rec.cost; $('lic-renewal').value = rec.renewal; $('lic-status').value = rec.status;
          $('lic-project').value = rec.project || '';
        } else if (rec && type === 'hr') {
          $('hr-name').value = rec.name; $('hr-role').value = rec.role; $('hr-start').value = rec.start;
          $('hr-salary').value = rec.salary; $('hr-pay-sched').value = rec.paySchedule; $('hr-emergency').value = rec.emergency;
          $('hr-project').value = rec.project || '';
        }
      }
      $('assets-edit-id').value = id || '';
      $('modal-assets').classList.add('open');
    },
    toggleForm() {
      const t = $('asset-type').value;
      $('form-equipment').style.display = t === 'equipment' ? '' : 'none';
      $('form-license').style.display   = t === 'license'   ? '' : 'none';
      $('form-hr').style.display        = t === 'hr'        ? '' : 'none';
    },
    save() {
      const t = $('asset-type').value;
      const id = this.editId || uid();
      let recs, rec, key;
      if (t === 'equipment') {
        const name = $('eq-name').value.trim();
        if (!name) { toast('Asset name is required.', 'error'); return; }
        key = 'assets_eq';
        rec = { id, name, cat: $('eq-cat').value, serial: $('eq-serial').value.trim(), assigned: $('eq-assigned').value.trim(), date: $('eq-date').value, value: $('eq-value').value, status: $('eq-status').value, project: $('eq-project').value };
      } else if (t === 'license') {
        const name = $('lic-name').value.trim();
        if (!name) { toast('Software name is required.', 'error'); return; }
        key = 'assets_lic';
        rec = { id, name, key: $('lic-key').value.trim(), assigned: $('lic-assigned').value.trim(), cost: $('lic-cost').value, renewal: $('lic-renewal').value, status: $('lic-status').value, project: $('lic-project').value };
      } else {
        if (App.role !== 'admin') { toast('HR access is Admin only.', 'error'); return; }
        const name = $('hr-name').value.trim();
        if (!name) { toast('Employee name is required.', 'error'); return; }
        key = 'assets_hr';
        rec = { id, name, role: $('hr-role').value.trim(), start: $('hr-start').value, salary: $('hr-salary').value, paySchedule: $('hr-pay-sched').value, emergency: $('hr-emergency').value.trim(), project: $('hr-project').value };
      }
      recs = load(key, []);
      if (this.editId) { const idx = recs.findIndex(r => r.id === this.editId); if (idx > -1) recs[idx] = rec; }
      else recs.push(rec);
      store(key, recs);
      App.closeModal('modal-assets');
      this.render();
      toast(this.editId ? 'Asset updated.' : 'Asset added.'); this.editId = null;
    },
    delete(id, key) {
      if (!confirm('Delete this record?')) return;
      store(key, load(key, []).filter(r => r.id !== id)); this.render(); toast('Record deleted.');
    },
    render() {
      let eq  = load('assets_eq', []);
      let lic = load('assets_lic', []);
      let hr  = load('assets_hr', []);

      const filterProj = $('assets-filter-project')?.value || '';
      if (filterProj === 'unassigned') {
        eq = eq.filter(r => !r.project);
        lic = lic.filter(r => !r.project);
        hr = hr.filter(r => !r.project);
      } else if (filterProj) {
        eq = eq.filter(r => r.project === filterProj);
        lic = lic.filter(r => r.project === filterProj);
        hr = hr.filter(r => r.project === filterProj);
      }

      const statusBadge = s => ({ Active:'badge-green', 'In Repair':'badge-yellow', Retired:'badge-gray', Lost:'badge-red', Expired:'badge-red', Cancelled:'badge-red' }[s] || 'badge-gray');

      $('eq-tbody').innerHTML = eq.length ? eq.map(r => `<tr>
        <td class="fw-700">${r.name}${r.project ? ` <span class="badge badge-blue" style="font-size:10px;margin-left:6px">${r.project}</span>` : ''}</td><td><span class="badge badge-blue">${r.cat}</span></td>
        <td class="td-muted">${r.serial||'—'}</td><td>${r.assigned||'—'}</td>
        <td class="td-muted">${fmtDate(r.date)}</td><td>${r.value ? fmt$(r.value) : '—'}</td>
        <td><span class="badge ${statusBadge(r.status)}">${r.status}</span></td>
        <td><div style="display:flex;gap:6px"><button class="btn-icon" onclick="App.Assets.openModal('${r.id}')">✏️</button><button class="btn-icon" onclick="App.Assets.delete('${r.id}','assets_eq')">🗑️</button></div></td>
      </tr>`).join('') : `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🖥️</div><div class="empty-title">No equipment logged</div><div class="empty-desc">Add your first asset.</div></div></td></tr>`;

      $('lic-tbody').innerHTML = lic.length ? lic.map(r => {
        const days = r.renewal ? daysUntil(r.renewal) : null;
        return `<tr>
          <td class="fw-700">${r.name}${r.project ? ` <span class="badge badge-blue" style="font-size:10px;margin-left:6px">${r.project}</span>` : ''}</td>
          <td class="td-muted" style="font-family:monospace">${r.key ? r.key.replace(/./g, (c,i) => i < r.key.length-4 ? '•' : c) : '—'}</td>
          <td>${r.assigned||'—'}</td>
          <td>${fmtDate(r.renewal)}${days !== null ? `<span class="badge ${days<0?'badge-red':days<=30?'badge-yellow':'badge-gray'}" style="margin-left:6px;font-size:10px">${days<0?`${Math.abs(days)}d ago`:`${days}d`}</span>` : ''}</td>
          <td>${r.cost ? fmt$(r.cost)+'/yr' : '—'}</td>
          <td><span class="badge ${statusBadge(r.status)}">${r.status}</span></td>
          <td><div style="display:flex;gap:6px"><button class="btn-icon" onclick="App.Assets.openModal('${r.id}')">✏️</button><button class="btn-icon" onclick="App.Assets.delete('${r.id}','assets_lic')">🗑️</button></div></td>
        </tr>`;
      }).join('') : `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🔑</div><div class="empty-title">No licenses tracked</div><div class="empty-desc">Add your first software license.</div></div></td></tr>`;

      $('hr-tbody').innerHTML = hr.length ? hr.map(r => `<tr>
        <td class="fw-700">${r.name}${r.project ? ` <span class="badge badge-blue" style="font-size:10px;margin-left:6px">${r.project}</span>` : ''}</td><td class="td-muted">${r.role||'—'}</td>
        <td class="td-muted">${fmtDate(r.start)}</td><td>${r.salary ? fmt$(r.salary)+'/yr' : '—'}</td>
        <td><span class="badge badge-blue">${r.paySchedule||'—'}</span></td>
        <td class="td-muted">${r.emergency||'—'}</td>
        <td><div style="display:flex;gap:6px"><button class="btn-icon" onclick="App.Assets.openModal('${r.id}')">✏️</button><button class="btn-icon" onclick="App.Assets.delete('${r.id}','assets_hr')">🗑️</button></div></td>
      </tr>`).join('') : `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">👤</div><div class="empty-title">No personnel records</div><div class="empty-desc">Add your first employee.</div></div></td></tr>`;
    },
  },

  // ── Compliance Calendar ───────────────────────────────────
  Compliance: {
    editId: null,
    openModal(id) {
      this.editId = id || null;
      $('comp-modal-title').textContent = id ? '✏️ Edit Item' : '📅 Add Compliance Item';
      if (id) {
        const rec = load('compliance', []).find(r => r.id === id);
        if (rec) {
          $('comp-name').value   = rec.name;
          $('comp-type').value   = rec.type;
          $('comp-due').value    = rec.due;
          $('comp-status').value = rec.status;
          $('comp-notes').value  = rec.notes;
          $('comp-project').value = rec.project || '';
        }
      } else {
        ['comp-name','comp-notes'].forEach(i => $(i).value = '');
        $('comp-due').value    = '';
        $('comp-type').value   = 'Tax Filing';
        $('comp-status').value = 'pending';
        $('comp-project').value = '';
      }
      $('comp-edit-id').value = id || '';
      $('modal-compliance').classList.add('open');
    },
    save() {
      const name = $('comp-name').value.trim();
      const due  = $('comp-due').value;
      if (!name || !due) { toast('Name and due date are required.', 'error'); return; }
      const recs = load('compliance', []);
      const rec  = { id: this.editId || uid(), name, type: $('comp-type').value, due, status: $('comp-status').value, notes: $('comp-notes').value.trim(), project: $('comp-project').value };
      if (this.editId) { const idx = recs.findIndex(r => r.id === this.editId); if (idx > -1) recs[idx] = rec; }
      else recs.push(rec);
      store('compliance', recs); App.closeModal('modal-compliance'); this.render(); App.refreshBadges();
      toast(this.editId ? 'Item updated.' : 'Deadline added.'); this.editId = null;
    },
    markDone(id) {
      const recs = load('compliance', []).map(r => r.id === id ? { ...r, status: 'done' } : r);
      store('compliance', recs); this.render(); App.refreshBadges(); toast('Marked as completed. ✅');
    },
    delete(id) {
      if (!confirm('Delete this compliance item?')) return;
      store('compliance', load('compliance', []).filter(r => r.id !== id)); this.render(); App.refreshBadges(); toast('Item deleted.');
    },
    render() {
      let recs = load('compliance', []).sort((a, b) => new Date(a.due) - new Date(b.due));
      const filter = $('comp-filter')?.value || '';
      const filterProj = $('comp-filter-project')?.value || '';

      if (filterProj === 'unassigned') recs = recs.filter(r => !r.project);
      else if (filterProj) recs = recs.filter(r => r.project === filterProj);

      const overdue  = recs.filter(r => r.status !== 'done' && daysUntil(r.due) < 0).length;
      const upcoming = recs.filter(r => r.status !== 'done' && daysUntil(r.due) >= 0 && daysUntil(r.due) <= 30).length;
      const done     = recs.filter(r => r.status === 'done').length;
      $('comp-stats').innerHTML = `
        <div class="stat-card"><div class="stat-label">Total Items</div><div class="stat-value">${recs.length}</div></div>
        <div class="stat-card"><div class="stat-label">Overdue</div><div class="stat-value text-red">${overdue}</div></div>
        <div class="stat-card"><div class="stat-label">Due in 30 Days</div><div class="stat-value text-yellow">${upcoming}</div></div>
        <div class="stat-card"><div class="stat-label">Completed</div><div class="stat-value text-green">${done}</div></div>`;

      if (filter === 'overdue')  recs = recs.filter(r => r.status !== 'done' && daysUntil(r.due) < 0);
      if (filter === 'upcoming') recs = recs.filter(r => r.status !== 'done' && daysUntil(r.due) >= 0 && daysUntil(r.due) <= 30);
      if (filter === 'ok')       recs = recs.filter(r => r.status !== 'done' && daysUntil(r.due) > 30);
      if (filter === 'done')     recs = recs.filter(r => r.status === 'done');

      if (!recs.length) {
        $('compliance-list').innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">No items</div><div class="empty-desc">No compliance deadlines match your filter.</div></div>`;
        return;
      }

      $('compliance-list').innerHTML = recs.map(r => {
        const days = daysUntil(r.due);
        const isDone   = r.status === 'done';
        const dotClass = isDone ? 'dot-gray' : days < 0 ? 'dot-red' : days <= 30 ? 'dot-yellow' : 'dot-green';
        const badge    = isDone ? '<span class="badge badge-green">✅ Done</span>'
                       : days < 0 ? `<span class="badge badge-red">⚠️ ${Math.abs(days)}d overdue</span>`
                       : days <= 30 ? `<span class="badge badge-yellow">⏰ ${days}d left</span>`
                       : `<span class="badge badge-green">✅ ${days}d away</span>`;
        return `<div class="timeline-item">
          <div class="timeline-dot ${dotClass}"></div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <strong>${r.name}${r.project ? ` <span class="badge badge-blue" style="font-size:10px;margin-left:6px">${r.project}</span>` : ''}</strong>
              <span class="badge badge-gray" style="font-size:10px">${r.type}</span>
              ${badge}
            </div>
            <div class="text-sm text-muted" style="margin-top:4px">Due: ${fmtDate(r.due)}${r.notes ? ' · ' + r.notes : ''}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;align-items:center">
            ${!isDone ? `<button class="btn btn-sm btn-secondary" onclick="App.Compliance.markDone('${r.id}')">✔ Done</button>` : ''}
            <button class="btn-icon" onclick="App.Compliance.openModal('${r.id}')">✏️</button>
            <button class="btn-icon" onclick="App.Compliance.delete('${r.id}')">🗑️</button>
          </div>
        </div>`;
      }).join('');
    },
  },


  // ── KPI Dashboard ─────────────────────────────────────────
  KPI: {
    charts: {},
    load() {
      const p = $('kpi-project-select')?.value || '';
      const map = load('kpi_current_map', { '': load('kpi_current', {}) });
      const cur = map[p] || { revenue: '', mrr: '', expenses: '', burn: '' };
      $('kpi-revenue').value  = cur.revenue !== undefined ? cur.revenue : '';
      $('kpi-mrr').value       = cur.mrr !== undefined ? cur.mrr : '';
      $('kpi-expenses').value  = cur.expenses !== undefined ? cur.expenses : '';
      $('kpi-burn').value       = cur.burn !== undefined ? cur.burn : '';
      this.updateLive();
    },
    updateLive() {
      const p = $('kpi-project-select')?.value || '';
      const rev  = parseFloat($('kpi-revenue').value)  || 0;
      const mrr  = parseFloat($('kpi-mrr').value)       || 0;
      const exp  = parseFloat($('kpi-expenses').value)  || 0;
      const burn = parseFloat($('kpi-burn').value)       || 0;
      const net  = rev - exp;
      const margin = rev > 0 ? ((net / rev) * 100).toFixed(1) : 0;
      
      const map = load('kpi_current_map', { '': load('kpi_current', {}) });
      map[p] = { revenue: rev, mrr, expenses: exp, burn };
      store('kpi_current_map', map);
      $('kpi-stats').innerHTML = `
        <div class="stat-card"><div class="stat-label">Net Profit</div><div class="stat-value ${net>=0?'text-green':'text-red'}">${fmt$(net)}</div></div>
        <div class="stat-card"><div class="stat-label">Profit Margin</div><div class="stat-value ${net>=0?'text-green':'text-red'}">${margin}%</div></div>
        <div class="stat-card"><div class="stat-label">Runway (mo.)</div><div class="stat-value">${burn > 0 ? (load('kpi_cash_reserve', 0) > 0 ? Math.floor(load('kpi_cash_reserve',0)/burn) : '—') : '∞'}</div></div>
        <div class="stat-card"><div class="stat-label">MRR</div><div class="stat-value text-green">${fmt$(mrr)}</div></div>`;
      this.updateCharts();
    },
    saveSnapshot() {
      const rev  = parseFloat($('kpi-revenue').value)  || 0;
      const mrr  = parseFloat($('kpi-mrr').value)       || 0;
      const exp  = parseFloat($('kpi-expenses').value)  || 0;
      const burn = parseFloat($('kpi-burn').value)       || 0;
      const p = $('kpi-project-select')?.value || '';
      const history = load('kpi_history', []);
      const month = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' });
      history.push({ project: p, month, revenue: rev, mrr, expenses: exp, burn, net: rev - exp, margin: rev > 0 ? +((rev-exp)/rev*100).toFixed(1) : 0, ts: Date.now() });
      store('kpi_history', history);
      this.renderHistory(); this.updateCharts();
      toast('Monthly snapshot saved! 📸');
    },
    renderHistory() {
      const p = $('kpi-project-select')?.value || '';
      let history = load('kpi_history', []).reverse();
      history = history.filter(r => (r.project || '') === p);

      $('kpi-history-tbody').innerHTML = history.length ? history.map((r) => `<tr>
        <td class="fw-700">${r.month}</td>
        <td>${fmt$(r.revenue)}</td><td class="text-green">${fmt$(r.mrr)}</td>
        <td>${fmt$(r.expenses)}</td><td class="text-red">${fmt$(r.burn)}</td>
        <td class="${r.net>=0?'text-green':'text-red'} fw-700">${fmt$(r.net)}</td>
        <td><span class="badge ${r.margin>=0?'badge-green':'badge-red'}">${r.margin}%</span></td>
        <td><button class="btn-icon" onclick="App.KPI.deleteSnap(${r.ts})">🗑️</button></td>
      </tr>`).join('') : `<tr><td colspan="8"><div class="empty-state" style="padding:20px"><div class="empty-desc">No snapshots yet. Save this month to begin tracking trends.</div></div></td></tr>`;
    },
    deleteSnap(ts) {
      if (!confirm('Delete this snapshot?')) return;
      let h = load('kpi_history', []);
      h = h.filter(r => r.ts !== ts);
      store('kpi_history', h);
      this.renderHistory(); this.updateCharts(); toast('Snapshot deleted.');
    },
    initCharts() {
      this.renderHistory();
      const ctx1 = $('chart-revenue')?.getContext('2d');
      const ctx2 = $('chart-burn')?.getContext('2d');
      if (!ctx1 || !ctx2) return;
      const chartDefaults = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } } },
        scales: { x: { ticks: { color: '#475569' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#475569', callback: v => '$' + v.toLocaleString() }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true } },
      };
      if (this.charts.revenue) { this.charts.revenue.destroy(); }
      if (this.charts.burn)    { this.charts.burn.destroy(); }
      this.charts.revenue = new Chart(ctx1, { type: 'line', data: this.getRevenueData(), options: { ...chartDefaults, elements: { line: { tension: 0.4, borderWidth: 2 }, point: { radius: 4, hoverRadius: 6 } } } });
      this.charts.burn    = new Chart(ctx2, { type: 'bar',  data: this.getBurnData(),    options: { ...chartDefaults, borderRadius: 6 } });
    },
    getRevenueData() {
      const p = $('kpi-project-select')?.value || '';
      let h = load('kpi_history', []);
      h = h.filter(r => (r.project || '') === p).slice(-12);
      return {
        labels: h.map(r => r.month),
        datasets: [
          { label: 'Revenue', data: h.map(r => r.revenue), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.15)', fill: true },
          { label: 'MRR',     data: h.map(r => r.mrr),     borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.10)', fill: true },
        ],
      };
    },
    getBurnData() {
      const p = $('kpi-project-select')?.value || '';
      let h = load('kpi_history', []);
      h = h.filter(r => (r.project || '') === p).slice(-12);
      return {
        labels: h.map(r => r.month),
        datasets: [
          { label: 'Burn Rate', data: h.map(r => r.burn), backgroundColor: 'rgba(239,68,68,0.7)' },
          { label: 'Net Profit', data: h.map(r => r.net), backgroundColor: h.map(r => r.net >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.4)') },
        ],
      };
    },
    updateCharts() {
      if (this.charts.revenue) { this.charts.revenue.data = this.getRevenueData(); this.charts.revenue.update(); }
      if (this.charts.burn)    { this.charts.burn.data    = this.getBurnData();    this.charts.burn.update(); }
    },
  },

  // ── Calendar ──────────────────────────────────────────────
  Calendar: {
    editId: null,
    openModal(id) {
      this.editId = id || null;
      $('calendar-modal-title').textContent = id ? '✏️ Edit Meeting' : '📆 New Meeting';
      if (id) {
        const rec = load('calendar', []).find(r => r.id === id);
        if (rec) {
          $('cal-title').value    = rec.title || '';
          $('cal-datetime').value = rec.datetime || '';
          $('cal-parties').value  = rec.parties || '';
          $('cal-company').value  = rec.company || '';
          $('cal-status').value   = rec.status || 'Scheduled';
          $('cal-project').value  = rec.project || '';
          $('cal-notes').value    = rec.notes || '';
        }
      } else {
        ['cal-title','cal-datetime','cal-parties','cal-company','cal-notes'].forEach(i => $(i).value = '');
        $('cal-status').value     = 'Scheduled';
        $('cal-project').value    = '';
        
        // Auto-fill time to current time rounded to next hour
        const now = new Date();
        now.setHours(now.getHours() + 1, 0, 0, 0);
        const tzoffset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now - tzoffset)).toISOString().slice(0, 16);
        $('cal-datetime').value = localISOTime;
      }
      $('cal-edit-id').value = id || '';
      $('modal-calendar').classList.add('open');
    },
    save() {
      const title = $('cal-title').value.trim();
      const datetime = $('cal-datetime').value;
      if (!title || !datetime) { toast('Meeting Title and Date & Time are required.', 'error'); return; }
      
      const recs = load('calendar', []);
      const rec = {
        id: this.editId || uid(),
        title, datetime,
        parties: $('cal-parties').value.trim(),
        company: $('cal-company').value.trim(),
        status: $('cal-status').value,
        project: $('cal-project').value,
        notes: $('cal-notes').value.trim(),
      };
      
      if (this.editId) {
        const idx = recs.findIndex(r => r.id === this.editId);
        if (idx > -1) recs[idx] = rec;
      } else {
        recs.push(rec);
      }
      
      store('calendar', recs);
      App.closeModal('modal-calendar');
      this.render();
      toast(this.editId ? 'Meeting updated.' : 'Meeting scheduled.');
      this.editId = null;
    },
    delete(id) {
      if (!confirm('Delete this meeting?')) return;
      store('calendar', load('calendar', []).filter(r => r.id !== id));
      this.render();
      toast('Meeting deleted.');
    },
    render() {
      let recs = load('calendar', []);
      const search = ($('calendar-search')?.value || '').toLowerCase();
      const filterProject = $('calendar-filter-project')?.value || '';
      const filterStatus = $('calendar-filter-status')?.value || '';
      
      if (search) {
        recs = recs.filter(r => 
          (r.title && r.title.toLowerCase().includes(search)) || 
          (r.parties && r.parties.toLowerCase().includes(search)) || 
          (r.company && r.company.toLowerCase().includes(search))
        );
      }
      if (filterProject === 'unassigned') recs = recs.filter(r => !r.project);
      else if (filterProject) recs = recs.filter(r => r.project === filterProject);
      if (filterStatus) recs = recs.filter(r => r.status === filterStatus);

      // Sort by datetime, upcoming first, then past
      recs.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

      const statusBadge = s => ({ Scheduled:'badge-blue', Completed:'badge-green', Cancelled:'badge-gray' }[s] || 'badge-gray');
      
      const formatDateTime = dt => {
        if (!dt) return '—';
        const d = new Date(dt);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + 
               d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      };

      $('calendar-tbody').innerHTML = recs.length ? recs.map(r => {
        return `<tr>
          <td class="fw-700">${r.title}${r.project ? ` <span class="badge badge-blue" style="font-size:10px;margin-left:6px">${r.project}</span>` : ''}</td>
          <td>${formatDateTime(r.datetime)}</td>
          <td>${r.parties || '—'}</td>
          <td>${r.company || '—'}</td>
          <td><span class="badge ${statusBadge(r.status)}">${r.status}</span></td>
          <td>
            <div style="display:flex;gap:6px">
              <button class="btn-icon" title="Edit" onclick="App.Calendar.openModal('${r.id}')">✏️</button>
              <button class="btn-icon" title="Delete" onclick="App.Calendar.delete('${r.id}')">🗑️</button>
            </div>
          </td>
        </tr>`;
      }).join('') : `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📆</div><div class="empty-title">No meetings found</div><div class="empty-desc">Click "+ Add Meeting" to schedule one.</div></div></td></tr>`;
    },
  },
};

// ── Boot ────────────────────────────────────────────────────
App.saveProfile = function() {
  const data = {
    name: $('p-name').value.trim(),     entity:   $('p-entity').value,
    industry:$('p-industry').value.trim(), year: $('p-year').value,
    ein:  $('p-ein').value.trim(),      state:    $('p-state').value.trim(),
    phone:$('p-phone').value.trim(),    email:    $('p-email').value.trim(),
    address:$('p-address').value.trim(), website: $('p-website').value.trim(),
    colors:$('p-colors').value.trim(),  tagline:  $('p-tagline').value.trim(),
    bank: $('p-bank').value.trim(),     acct:     $('p-acct').value.trim(),
  };
  if (!data.name) { toast('Company name is required.', 'error'); return; }
  store('profile', data);
  App.Profile.data = data;
  App.Profile.render();
  App.closeModal('modal-profile');
  toast('Profile saved.');
};

document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  // Only boot dashboard if already logged in
  if (Auth._getSession()) {
    App.init();
  }
});
