const BASE_URL = 'http://localhost:8080';
function getToken() {
  return localStorage.getItem('nh_token') || '';
}
function setToken(token) {
  localStorage.setItem('nh_token', token);

}
function clearToken() {
  localStorage.removeItem('nh_token');
}
function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: 'Bearer ' + token })
  };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(BASE_URL + path, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {})
    }
  });

  if (res.status === 401) {
    clearToken();
    showAuthSection();
    showToast('Session expired. Please log in again.', 'error');
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    let errMsg = '';
    try {
      const data = await res.json();
      errMsg = data.message || JSON.stringify(data);
    } catch {
      errMsg = await res.text();
    }
    throw new Error(errMsg || `HTTP ${res.status}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
function switchAuth(type) {
  const loginPanel  = document.getElementById('login-panel');
  const signupPanel = document.getElementById('signup-panel');

  if (!loginPanel || !signupPanel) return;

  if (type === 'signup') {
    loginPanel.classList.add('hidden');
    signupPanel.classList.remove('hidden');
  } else {
    loginPanel.classList.remove('hidden');
    signupPanel.classList.add('hidden');
  }
}
let currentTheme = localStorage.getItem('nh_theme') || 'dark';
document.documentElement.setAttribute('data-theme', currentTheme);

function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  localStorage.setItem('nh_theme', currentTheme);
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = currentTheme === 'dark' ? '◑' : '◐';
  showToast(`Switched to ${currentTheme} mode`, 'info');
  reRenderCharts();
}
function showToast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] || '•'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 350);
  }, 3000);
}

// ── STATE ─────────────────────────────────────────────────────
const state = {
  jobs: [],           // from JobController
  applications: [],   // from ApplicationController
  resumes: [],        // from ResumeController
  filter: 'all',
  search: '',
  currentUser: null
};

// ═══════════════════════════════════════════════════════════════
// AUTH  →  AuthController
// POST /api/auth/register
// POST /api/auth/login
// POST /api/auth/logout
// GET  /api/auth/me
// ═══════════════════════════════════════════════════════════════

async function login(email, password) {
  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    // Spring Boot typically returns { token, user } or { accessToken, user }
    const token = data.token || data.accessToken || data.jwt || '';
    if (token) setToken(token);

    state.currentUser = data.user || data;
    showToast('Logged in successfully!', 'success');
    showAppSection();
    initApp();
  } catch (err) {
    showToast('Login failed: ' + err.message, 'error');
  }
}

async function register(name, email, password) {
  try {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const token = data.token || data.accessToken || data.jwt || '';
    if (token) setToken(token);

    state.currentUser = data.user || data;
    showToast('Account created!', 'success');
    showAppSection();
    initApp();
  } catch (err) {
    showToast('Registration failed: ' + err.message, 'error');
  }
}

async function logout() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch (_) {
    // logout best-effort
  } finally {
    clearToken();
    state.currentUser = null;
    state.jobs = [];
    state.applications = [];
    showAuthSection();
    showToast('Logged out.', 'info');
  }
}

async function fetchCurrentUser() {
  try {
    state.currentUser = await apiFetch('/api/auth/me');
    const nameEl = document.getElementById('user-name');
    if (nameEl && state.currentUser)
      nameEl.textContent = state.currentUser.name || state.currentUser.email || 'User';
  } catch (_) {
    // not fatal
  }
}
function showAuthSection() {
  const auth = document.getElementById('auth-overlay');
  const app  = document.getElementById('app');
  if (auth) auth.classList.remove('hidden');
  if (app)  app.classList.add('hidden');
}
function showAppSection() {
  const auth = document.getElementById('auth-overlay');
  const app  = document.getElementById('app');
  if (auth) auth.classList.add('hidden');
  if (app)  app.classList.remove('hidden');
}
function handleLoginSubmit(e) {
  if (e) e.preventDefault();
  const email = document.getElementById('login-email')?.value.trim();
  // FIX 2: Corrected ID from 'login-password' to 'login-pass' (matching index.html)
  const password = document.getElementById('login-pass')?.value.trim();
  if (!email || !password) { showToast('Email and password required', 'error'); return; }
  login(email, password);
}

function handleRegisterSubmit(e) {
  if (e) e.preventDefault();
  const name     = document.getElementById('reg-name')?.value.trim();
  const email    = document.getElementById('reg-email')?.value.trim();
  const password = document.getElementById('reg-password')?.value.trim();
  if (!name || !email || !password) { showToast('All fields required', 'error'); return; }
  register(name, email, password);
}
async function fetchJobs() {
  try {
    const data = await apiFetch('/api/jobs');
    state.jobs = Array.isArray(data) ? data : (data.content || data.jobs || []);
    renderJobs();
    updateStats();
    updateSidebarCounts();
    reRenderCharts();
  } catch (err) {
    showToast('Failed to load jobs: ' + err.message, 'error');
  }
}

async function createJob(jobData) {
  try {
    const newJob = await apiFetch('/api/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData)
    });
    state.jobs.unshift(newJob);
    renderJobs();
    updateStats();
    updateSidebarCounts();
    reRenderCharts();
    showToast('Job added!', 'success');
    return newJob;
  } catch (err) {
    showToast('Failed to add job: ' + err.message, 'error');
    return null;
  }
}

async function updateJob(id, jobData) {
  try {
    const updated = await apiFetch(`/api/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(jobData)
    });
    const idx = state.jobs.findIndex(j => j.id === id);
    if (idx !== -1) state.jobs[idx] = updated;
    renderJobs();
    updateStats();
    updateSidebarCounts();
    reRenderCharts();
    showToast('Job updated!', 'success');
    return updated;
  } catch (err) {
    showToast('Failed to update job: ' + err.message, 'error');
    return null;
  }
}

async function deleteJob(id) {
  try {
    await apiFetch(`/api/jobs/${id}`, { method: 'DELETE' });
    state.jobs = state.jobs.filter(j => j.id !== id);
    renderJobs();
    updateStats();
    updateSidebarCounts();
    reRenderCharts();
    showToast('Job removed.', 'info');
  } catch (err) {
    showToast('Failed to delete job: ' + err.message, 'error');
  }
}

async function fetchJobById(id) {
  try {
    return await apiFetch(`/api/jobs/${id}`);
  } catch (err) {
    showToast('Failed to fetch job: ' + err.message, 'error');
    return null;
  }
}
async function fetchApplications() {
  try {
    const data = await apiFetch('/api/applications');
    state.applications = Array.isArray(data) ? data : (data.content || data.applications || []);
    renderApplications();
  } catch (err) {
    showToast('Failed to load applications: ' + err.message, 'error');
  }
}

async function createApplication(appData) {
  try {
    const newApp = await apiFetch('/api/applications', {
      method: 'POST',
      body: JSON.stringify(appData)
    });
    state.applications.unshift(newApp);
    renderApplications();
    showToast('Application saved!', 'success');
    return newApp;
  } catch (err) {
    showToast('Failed to save application: ' + err.message, 'error');
    return null;
  }
}

async function updateApplication(id, appData) {
  try {
    const updated = await apiFetch(`/api/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(appData)
    });
    const idx = state.applications.findIndex(a => a.id === id);
    if (idx !== -1) state.applications[idx] = updated;
    renderApplications();
    showToast('Application updated!', 'success');
    return updated;
  } catch (err) {
    showToast('Failed to update application: ' + err.message, 'error');
    return null;
  }
}

async function deleteApplication(id) {
  try {
    await apiFetch(`/api/applications/${id}`, { method: 'DELETE' });
    state.applications = state.applications.filter(a => a.id !== id);
    renderApplications();
    showToast('Application removed.', 'info');
  } catch (err) {
    showToast('Failed to delete application: ' + err.message, 'error');
  }
}

async function fetchApplicationsByJob(jobId) {
  try {
    const data = await apiFetch(`/api/applications/job/${jobId}`);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    showToast('Failed to load applications for job: ' + err.message, 'error');
    return [];
  }
}
async function aiAnalyze(prompt) {
  return await apiFetch('/api/ai/analyze', {
    method: 'POST',
    body: JSON.stringify({ prompt })
  });
}

async function aiGenerateCoverLetter(jobTitle, company, userBackground) {
  return await apiFetch('/api/ai/cover-letter', {
    method: 'POST',
    body: JSON.stringify({ jobTitle, company, userBackground })
  });
}

async function aiInterviewTips(jobTitle, company) {
  return await apiFetch('/api/ai/interview-tips', {
    method: 'POST',
    body: JSON.stringify({ jobTitle, company })
  });
}

async function aiSkillGap(jobDescription, userSkills) {
  return await apiFetch('/api/ai/skill-gap', {
    method: 'POST',
    body: JSON.stringify({ jobDescription, userSkills })
  });
}

async function aiResumeReview(resumeText) {
  return await apiFetch('/api/ai/resume-review', {
    method: 'POST',
    body: JSON.stringify({ resumeText })
  });
}

// ── AI PANEL TRIGGER (wires to UI buttons) ───────────────────
async function triggerAI(type) {
  const output = document.getElementById('ai-output');
  if (!output) return;

  output.classList.add('visible');
  output.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span> Generating…';

  try {
    let result = '';
    const selectedJob = state.jobs[0]; // use most recent job as context if available

    if (type === 'coverLetter') {
      const data = await aiGenerateCoverLetter(
        selectedJob?.role || 'Software Engineer',
        selectedJob?.company || 'the company',
        'Experienced developer with strong problem-solving skills'
      );
      result = data?.content || data?.coverLetter || data?.result || JSON.stringify(data);

    } else if (type === 'tips') {
      const data = await aiInterviewTips(
        selectedJob?.role || 'Software Engineer',
        selectedJob?.company || 'the company'
      );
      result = data?.content || data?.tips || data?.result || JSON.stringify(data);

    } else if (type === 'skillGap') {
      const data = await aiSkillGap(
        selectedJob?.description || selectedJob?.notes || 'Full stack development role',
        'Java, Spring Boot, React, SQL'
      );
      result = data?.content || data?.skillGap || data?.result || JSON.stringify(data);

    } else if (type === 'resumeReview') {
      const data = await aiResumeReview(
        'Paste resume text here for review'
      );
      result = data?.content || data?.review || data?.result || JSON.stringify(data);

    } else {
      // overview / general
      const stats = `${state.jobs.length} total jobs tracked, ${state.jobs.filter(j => j.status === 'Interview').length} in interview, ${state.jobs.filter(j => j.status === 'Offer').length} offers received.`;
      const data = await aiAnalyze(
        `Analyze this job search: ${stats} Give 3 insights and 2 actionable tips.`
      );
      result = data?.content || data?.analysis || data?.result || JSON.stringify(data);
    }

    output.textContent = result;
  } catch (err) {
    output.textContent = 'AI request failed: ' + err.message;
  }
}
async function fetchResumes() {
  try {
    const data = await apiFetch('/api/resumes');
    state.resumes = Array.isArray(data) ? data : (data.resumes || []);
    renderResumeList();
  } catch (err) {
    showToast('Failed to load resumes: ' + err.message, 'error');
  }
}

async function uploadResume(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(BASE_URL + '/api/resumes/upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + getToken() },
      body: formData
      // NOTE: Do NOT set Content-Type manually — browser sets multipart boundary
    });

    if (!res.ok) throw new Error('Upload failed: ' + res.status);
    const uploaded = await res.json();
    state.resumes.unshift(uploaded);
    renderResumeList();
    showToast('Resume uploaded!', 'success');
    return uploaded;
  } catch (err) {
    showToast('Resume upload failed: ' + err.message, 'error');
    return null;
  }
}

async function analyzeResume(resumeId) {
  try {
    showToast('Analyzing resume…', 'info');
    const result = await apiFetch(`/api/resumes/${resumeId}/analyze`, { method: 'POST' });
    const output = document.getElementById('ai-output');
    if (output) {
      output.classList.add('visible');
      output.textContent = result?.analysis || result?.content || JSON.stringify(result);
    }
    showToast('Analysis complete!', 'success');
    return result;
  } catch (err) {
    showToast('Resume analysis failed: ' + err.message, 'error');
    return null;
  }
}

async function extractSkills(resumeId) {
  try {
    const result = await apiFetch(`/api/resumes/${resumeId}/skills`, { method: 'POST' });
    showToast('Skills extracted!', 'success');
    return result;
  } catch (err) {
    showToast('Skill extraction failed: ' + err.message, 'error');
    return null;
  }
}

async function deleteResume(resumeId) {
  try {
    await apiFetch(`/api/resumes/${resumeId}`, { method: 'DELETE' });
    state.resumes = state.resumes.filter(r => r.id !== resumeId);
    renderResumeList();
    showToast('Resume deleted.', 'info');
  } catch (err) {
    showToast('Failed to delete resume: ' + err.message, 'error');
  }
}
function renderJobs() {
  const grid = document.getElementById('jobs-grid');
  if (!grid) return;

  const filtered = state.jobs.filter(j => {
    const matchFilter = state.filter === 'all' || j.status === state.filter;
    const matchSearch =
      !state.search ||
      (j.company || '').toLowerCase().includes(state.search) ||
      (j.role || j.title || '').toLowerCase().includes(state.search);
    return matchFilter && matchSearch;
  });

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state">No applications found.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(j => {
    const role    = j.role || j.title || j.jobTitle || 'Unknown Role';
    const company = j.company || j.companyName || 'Unknown Company';
    const status  = j.status || 'Applied';
    const date    = j.date || j.appliedDate || j.createdAt || '';
    const salary  = j.salary || j.salaryRange || '';
    const notes   = j.notes || j.description || '';

    return `
    <div class="job-card" data-status="${esc(status)}" onclick="showJobDetail(${j.id})">
      <div class="job-company">${esc(company)}</div>
      <div class="job-role">${esc(role)}</div>
      ${salary ? `<div class="job-salary">${esc(salary)}</div>` : ''}
      <div class="job-footer">
        <span class="badge badge-${esc(status)}">${esc(status)}</span>
        <span class="job-date">${formatDate(date)}</span>
      </div>
      ${notes ? `<div class="job-notes">${esc(String(notes).substring(0, 100))}${notes.length > 100 ? '…' : ''}</div>` : ''}
      <div class="job-actions" onclick="event.stopPropagation()">
        <select class="status-select" onchange="handleStatusChange(${j.id}, this.value)">
          ${['Applied', 'Interview', 'Offer', 'Rejected', 'Ghosted']
            .map(s => `<option${s === status ? ' selected' : ''}>${s}</option>`)
            .join('')}
        </select>
        <button class="job-action-btn" onclick="openEditJobModal(${j.id})">Edit</button>
        <button class="job-action-btn danger" onclick="confirmDeleteJob(${j.id})">Delete</button>
        ${j.url ? `<button class="job-action-btn" onclick="openLink('${esc(j.url)}')">Link ↗</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function handleStatusChange(id, newStatus) {
  const j = state.jobs.find(x => x.id === id);
  if (!j) return;
  await updateJob(id, { ...j, status: newStatus });
}

function showJobDetail(id) {
  const j = state.jobs.find(x => x.id === id);
  if (!j) return;
  showToast(`${j.company || j.companyName} — ${j.role || j.title}`, 'info');
}

function confirmDeleteJob(id) {
  const j = state.jobs.find(x => x.id === id);
  if (!j) return;
  if (confirm(`Delete application to ${j.company || j.companyName}?`)) {
    deleteJob(id);
  }
}
function renderApplications() {
  const container = document.getElementById('applications-list');
  if (!container) return;

  if (!state.applications.length) {
    container.innerHTML = '<div class="empty-state">No applications yet.</div>';
    return;
  }

  container.innerHTML = state.applications.map(a => `
    <div class="application-item">
      <span>${esc(a.jobTitle || a.job?.title || 'N/A')}</span>
      <span>${esc(a.status || '')}</span>
      <span>${formatDate(a.appliedDate || a.createdAt || '')}</span>
      <button onclick="deleteApplication(${a.id})">Remove</button>
    </div>
  `).join('');
}
function renderResumeList() {
  const container = document.getElementById('resume-list');
  if (!container) return;

  if (!state.resumes.length) {
    container.innerHTML = '<div class="empty-state">No resumes uploaded.</div>';
    return;
  }

  container.innerHTML = state.resumes.map(r => `
    <div class="resume-item">
      <span>${esc(r.fileName || r.name || 'Resume')}</span>
      <span class="job-date">${formatDate(r.uploadedAt || r.createdAt || '')}</span>
      <div class="job-actions">
        <button class="job-action-btn" onclick="analyzeResume(${r.id})">Analyze</button>
        <button class="job-action-btn" onclick="extractSkills(${r.id})">Skills</button>
        <button class="job-action-btn danger" onclick="deleteResume(${r.id})">Delete</button>
      </div>
    </div>
  `).join('');
}
let _editingJobId = null;

function openJobModal() {
  _editingJobId = null;
  const title = document.getElementById('modal-title');
  if (title) title.textContent = 'Add Application';
  _clearJobForm();
  const dateEl = document.getElementById('m-date');
  if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
  document.getElementById('job-modal')?.classList.remove('hidden');
}

async function openEditJobModal(id) {
  const j = state.jobs.find(x => x.id === id) || await fetchJobById(id);
  if (!j) return;
  _editingJobId = id;
  const title = document.getElementById('modal-title');
  if (title) title.textContent = 'Edit Application';

  _setField('m-company',  j.company || j.companyName || '');
  _setField('m-role',     j.role || j.title || j.jobTitle || '');
  _setField('m-url',      j.url || j.jobUrl || '');
  _setField('m-status',   j.status || 'Applied');
  _setField('m-date',     (j.date || j.appliedDate || '').split('T')[0] || new Date().toISOString().split('T')[0]);
  _setField('m-salary',   j.salary || j.salaryRange || '');
  _setField('m-location', j.location || '');
  _setField('m-notes',    j.notes || j.description || '');

  document.getElementById('job-modal')?.classList.remove('hidden');
}

function closeJobModal() {
  document.getElementById('job-modal')?.classList.add('hidden');
  _clearJobForm();
  _editingJobId = null;
}

async function saveJob() {
  const company = document.getElementById('m-company')?.value.trim();
  const role    = document.getElementById('m-role')?.value.trim();

  if (!company || !role) {
    showToast('Company and role are required', 'error');
    return;
  }

  // Map to field names your Spring Boot Job model likely expects
  const jobData = {
    company:     company,
    companyName: company,       // include both for compatibility
    role:        role,
    title:       role,
    jobTitle:    role,
    status:      document.getElementById('m-status')?.value || 'Applied',
    date:        document.getElementById('m-date')?.value || '',
    appliedDate: document.getElementById('m-date')?.value || '',
    url:         document.getElementById('m-url')?.value.trim() || '',
    jobUrl:      document.getElementById('m-url')?.value.trim() || '',
    salary:      document.getElementById('m-salary')?.value.trim() || '',
    salaryRange: document.getElementById('m-salary')?.value.trim() || '',
    location:    document.getElementById('m-location')?.value.trim() || '',
    notes:       document.getElementById('m-notes')?.value.trim() || '',
    description: document.getElementById('m-notes')?.value.trim() || ''
  };

  let result;
  if (_editingJobId) {
    result = await updateJob(_editingJobId, jobData);
  } else {
    result = await createJob(jobData);
  }

  if (result) closeJobModal();
}

// ── FORM UTILITIES ────────────────────────────────────────────
function _setField(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function _clearJobForm() {
  ['m-company', 'm-role', 'm-url', 'm-notes', 'm-salary', 'm-location'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  _setField('m-status', 'Applied');
}
function handleResumeUpload(inputEl) {
  const file = inputEl?.files?.[0];
  if (!file) return;
  if (!file.name.match(/\.(pdf|doc|docx)$/i)) {
    showToast('Only PDF, DOC, DOCX files are allowed', 'error');
    return;
  }
  uploadResume(file);
}
function updateStats() {
  const j        = state.jobs;
  const total    = j.length;
  const interview = j.filter(x => x.status === 'Interview').length;
  const offer    = j.filter(x => x.status === 'Offer').length;
  const rejected = j.filter(x => x.status === 'Rejected').length;

  _setTextContent('s-total',     total);
  _setTextContent('s-interview', interview);
  _setTextContent('s-offer',     offer);
  _setTextContent('s-rejected',  rejected);

  const rate = total ? Math.round((interview + offer) / total * 100) : 0;
  _setTextContent('s-rate', rate + '% rate');
}

function updateSidebarCounts() {
  const counts = { Applied: 0, Interview: 0, Offer: 0, Rejected: 0, Ghosted: 0 };
  state.jobs.forEach(j => { if (counts[j.status] !== undefined) counts[j.status]++; });

  _setTextContent('cnt-all', state.jobs.length);
  Object.keys(counts).forEach(k => _setTextContent('cnt-' + k, counts[k]));
}

function _setTextContent(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ── CHARTS ────────────────────────────────────────────────────
let _chartInstance = null;

function reRenderCharts() {
  const canvas = document.getElementById('statusChart') || document.getElementById('pieChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const statuses = ['Applied', 'Interview', 'Offer', 'Rejected', 'Ghosted'];
  const counts   = statuses.map(s => state.jobs.filter(j => j.status === s).length);
  const colors   = ['#6c8bff', '#fbbf24', '#34d399', '#f87171', '#8890aa'];

  if (_chartInstance) _chartInstance.destroy();

  _chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: statuses,
      datasets: [{
        data: counts,
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: c => ' ' + c.label + ': ' + c.raw }
        }
      }
    }
  });

  // update custom legend
  const legend = document.getElementById('chart-legend');
  if (legend) {
    legend.innerHTML = statuses
      .map((l, i) => `<span style="display:flex;align-items:center;gap:5px">
        <span style="width:9px;height:9px;border-radius:2px;background:${colors[i]};flex-shrink:0"></span>
        ${l} ${counts[i]}
      </span>`)
      .join('');
  }
}
function handleSearch(value) {
  state.search = value.toLowerCase().trim();
  renderJobs();
}

function setFilter(filter, el) {
  state.filter = filter;
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  if (el) el.classList.add('active');

  const labels = {
    all: 'All Applications', Applied: 'Applied', Interview: 'Interview Stage',
    Offer: 'Offers', Rejected: 'Rejected', Ghosted: 'Ghosted'
  };
  _setTextContent('view-label', labels[filter] || filter);
  renderJobs();
}

// ── ALIAS for backwards compat with sidebar onclick="setView(...)" ──
function setView(filter, el) { setFilter(filter, el); }
function openLink(url) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('collapsed');
}

function toggleNotif() {
  const dropdown = document.getElementById('notif-dropdown');
  if (dropdown) dropdown.classList.toggle('hidden');
}
function toggleProfile() {
  showToast('Profile settings coming soon', 'info');
}

function togglePass(btn) {
  const input = btn?.previousElementSibling;
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁' : '🙈';
}
function navigate(el) {
  const page = el?.dataset?.page;
  if (!page) return;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');

  const labels = {
    dashboard: 'Dashboard',
    tracker:   'Job Tracker',
    resume:    'Resume AI',
    analytics: 'Analytics'
  };
  _setTextContent('topbar-title', labels[page] || page);
  if (page === 'tracker') {
    const addBtn = document.querySelector('#page-tracker .btn-primary');
    if (addBtn && !addBtn.onclick) addBtn.onclick = openJobModal;
  }
}
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (_) {
    return d;
  }
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeJobModal();
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('search-input')?.focus();
  }
});
async function initApp() {
  await fetchCurrentUser();
  try {
    await fetchJobs();
  } catch (_) {
      state.jobs = (window.APP_JOBS && Array.isArray(window.APP_JOBS)) ? window.APP_JOBS : [];
    renderJobs();
    updateStats();
    updateSidebarCounts();
    reRenderCharts();
  }
  try { await fetchApplications(); } catch (_) {}
  try { await fetchResumes(); } catch (_) {}
 document.querySelectorAll('.counter[data-target]').forEach(el => {
    const target = parseInt(el.getAttribute('data-target')) || 0;
    let current = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current;
      if (current >= target) clearInterval(timer);
    }, 30);
  });
}
(function bootstrap() {
  if (getToken()) {
    showAppSection();
    initApp();
  } else {
    showAuthSection();
  }
})();