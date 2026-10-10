
"use strict";
const BASE_URL = "";
function getToken() {
    return localStorage.getItem("nh_token") || "";
}

function setToken(token) {
    if (typeof token !== "string" || !token.trim()) {
        throw new Error("The server did not return an authentication token.");
    }

    localStorage.setItem("nh_token", token);
}

function clearToken() {
    localStorage.removeItem("nh_token");
}

function authHeaders(extraHeaders = {}) {
    const headers = {
        ...extraHeaders
    };

    if (getToken()) {
        headers.Authorization = "Bearer " + getToken();
    }

    return headers;
}

async function readResponse(response) {
    const text = await response.text();

    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

async function apiFetch(path, options = {}) {
    const headers = authHeaders(options.headers || {});

    if (
        options.body &&
        !(options.body instanceof FormData) &&
        !headers["Content-Type"]
    ) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(BASE_URL + path, {
        ...options,
        headers
    });

    const data = await readResponse(response);

    if (!response.ok) {
        const message =
            typeof data === "object" && data !== null
                ? data.message || data.error || JSON.stringify(data)
                : data || `HTTP ${response.status}`;

        // Don't clear the token on 403.
        // A 403 means forbidden, not necessarily an expired login.
        if (response.status === 401) {
            clearToken();
        }

        throw new Error(message);
    }

    return data;
}

function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");

    if (!container) {
        console.log(message);
        return;
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("out");
        setTimeout(() => toast.remove(), 350);
    }, 3000);
}
// LOGIN
async function login(email, password) {
    try {
        const data = await apiFetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email.trim(),
                password: password
            })
        });

        const token =
            data?.token ||
            data?.accessToken ||
            data?.jwt ||
            data?.access_token;

        if (!token) {
            console.error("Login response did not contain a token:", data);
            throw new Error(
                "Login response has no token. Check your backend login response."
            );
        }

        // Save the token before navigating.
        setToken(token);

        const message = document.getElementById("loginMessage");

        if (message) {
            message.textContent = "Login successful!";
            message.style.color = "green";
        }

        showToast("Login successful!", "success");

        // Navigate only after the token has been stored.
        window.location.replace("/dashboard");

    } catch (error) {
        console.error("Login error:", error);

        const message = document.getElementById("loginMessage");

        if (message) {
            message.textContent = error.message;
            message.style.color = "red";
        }

        showToast("Login failed: " + error.message, "error");
    }
}

// Supports login forms using either naming convention.
function handleLoginSubmit(event) {
    if (event) event.preventDefault();

    const email =
        document.getElementById("loginEmail")?.value ||
        document.getElementById("login-email")?.value ||
        "";

    const password =
        document.getElementById("loginPassword")?.value ||
        document.getElementById("login-pass")?.value ||
        document.getElementById("login-password")?.value ||
        "";

    if (!email.trim() || !password) {
        showToast("Enter your email and password.", "error");
        return;
    }

    login(email, password);
}

// REGISTRATION
async function register(name, email, password) {
    try {
        const data = await apiFetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name.trim(),
                email: email.trim(),
                password: password
            })
        });

        const message = document.getElementById("registerMessage");

        if (message) {
            message.textContent =
                "Account created. You can now log in.";
            message.style.color = "green";
        }

        showToast("Account created successfully!", "success");

        // Registration does not automatically log the user in.
        setTimeout(() => {
            const loginPanel = document.getElementById("login-panel");
            const signupPanel = document.getElementById("signup-panel");

            if (loginPanel && signupPanel) {
                switchAuth("login");
            } else {
                window.location.replace("/login");
            }
        }, 800);

    } catch (error) {
        console.error("Registration error:", error);

        const message = document.getElementById("registerMessage");

        if (message) {
            message.textContent = error.message;
            message.style.color = "red";
        }

        showToast("Registration failed: " + error.message, "error");
    }
}

function handleRegisterSubmit(event) {
    if (event) event.preventDefault();

    const name =
        document.getElementById("reg-name")?.value ||
        document.getElementById("name")?.value ||
        "";

    const email =
        document.getElementById("reg-email")?.value ||
        document.getElementById("email")?.value ||
        "";

    const password =
        document.getElementById("reg-password")?.value ||
        document.getElementById("password")?.value ||
        "";

    if (!name.trim() || !email.trim() || !password) {
        showToast("Please fill in all fields.", "error");
        return;
    }

    register(name, email, password);
}

function switchAuth(type) {
    const loginPanel = document.getElementById("login-panel");
    const signupPanel = document.getElementById("signup-panel");

    if (!loginPanel || !signupPanel) return;

    const showSignup = type === "signup";

    loginPanel.classList.toggle("hidden", showSignup);
    signupPanel.classList.toggle("hidden", !showSignup);
}
// LOGOUT
function logout() {

    clearToken();
    window.location.replace("/login");
}
// CURRENT USER
async function fetchCurrentUser() {
    try {
        const user = await apiFetch("/api/auth/me");

        const nameElement = document.getElementById("user-name");

        if (nameElement && user) {
            nameElement.textContent =
                user.name || user.email || "User";
        }

        return user;
    } catch (error) {
        console.error("Could not load current user:", error);
        return null;
    }
}

const state = {
    jobs: [],
    applications: [],
    filter: "all",
    search: ""
};

async function fetchJobs() {
    try {
        const data = await apiFetch("/api/jobs");

        state.jobs = Array.isArray(data)
            ? data
            : data?.content || data?.jobs || [];

       renderJobs();
       updateStats();
       updateApplicationStats();
       updateSidebarCounts();
       reRenderCharts();

        return state.jobs;
    } catch (error) {
        console.error("Failed to load jobs:", error);
        showToast("Could not load jobs: " + error.message, "error");
        throw error;
    }
}

async function createJob(jobData) {
    try {
        const job = await apiFetch("/api/jobs", {
            method: "POST",
            body: JSON.stringify(jobData)
        });

        state.jobs.unshift(job);
        renderJobs();
        updateStats();
        updateSidebarCounts();
        reRenderCharts();

        showToast("Job created!", "success");
        return job;
    } catch (error) {
        showToast("Could not create job: " + error.message, "error");
        return null;
    }
}

async function updateJob(id, jobData) {
    try {
        const job = await apiFetch(`/api/jobs/${id}`, {
            method: "PUT",
            body: JSON.stringify(jobData)
        });

        const index = state.jobs.findIndex(item => item.id === id);

        if (index !== -1) {
            state.jobs[index] = job;
        }

        renderJobs();
        updateStats();
        updateSidebarCounts();
        reRenderCharts();

        showToast("Job updated!", "success");
        return job;
    } catch (error) {
        showToast("Could not update job: " + error.message, "error");
        return null;
    }
}

async function deleteJob(id) {
    try {
        await apiFetch(`/api/jobs/${id}`, {
            method: "DELETE"
        });

        state.jobs = state.jobs.filter(job => job.id !== id);

        renderJobs();
        updateStats();
        updateSidebarCounts();
        reRenderCharts();

        showToast("Job deleted.", "success");
    } catch (error) {
        showToast("Could not delete job: " + error.message, "error");
    }
}

function renderJobs() {
    const tbody = document.getElementById("jobsTableBody");
    if (!tbody) return;

    const message = document.getElementById("jobsMessage");

    if (!state.jobs.length) {
        tbody.replaceChildren();

        if (message) {
            message.textContent = "No jobs yet. Click Add Job to create one.";
        }
        return;
    }

    if (message) {
        message.textContent = `${state.jobs.length} job(s) found.`;
    }

    tbody.innerHTML = state.jobs.map(job => `
        <tr>
            <td>${escapeHtml(job.title || "")}</td>
            <td>${escapeHtml(job.company || "")}</td>
            <td>${escapeHtml(job.location || "—")}</td>
            <td>${escapeHtml(job.jobType || "—")}</td>
            <td>
                <button type="button"
                    onclick="editJob(${Number(job.id)})">
                    Edit
                </button>

                <button type="button"
                    onclick="confirmDeleteJob(${Number(job.id)})">
                    Delete
                </button>
            </td>
        </tr>
    `).join("");
}


function confirmDeleteJob(id) {
    if (confirm("Are you sure you want to delete this job?")) {
        deleteJob(id);
    }
}

function openJobForm(job = null) {
    const form = document.getElementById("jobForm");
    if (!form) {
        showToast("Job form not found. Check dashboard.html.", "error");
        return;
    }

    form.reset();

    document.getElementById("jobId").value = job?.id ?? "";
    document.getElementById("jobTitle").value = job?.title ?? "";
    document.getElementById("jobCompany").value = job?.company ?? "";
    document.getElementById("jobLocation").value = job?.location ?? "";
    document.getElementById("jobType").value = job?.jobType ?? "";
    document.getElementById("jobDescription").value =
        job?.description ?? "";

    document.getElementById("jobFormTitle").textContent =
        job ? "Edit Job" : "Add Job";

    form.classList.remove("hidden");
}

function editJob(id) {
    const job = state.jobs.find(
        item => Number(item.id) === Number(id)
    );

    if (!job) {
        showToast("Job not found.", "error");
        return;
    }

    openJobForm(job);
}

// Add and edit job form controls
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("addJobButton")
        ?.addEventListener("click", () => openJobForm());

    document.getElementById("cancelJobButton")
        ?.addEventListener("click", () => {
            document.getElementById("jobForm")
                ?.classList.add("hidden");
        });

    document.getElementById("jobForm")
        ?.addEventListener("submit", async event => {
            event.preventDefault();

            const id = document.getElementById("jobId").value;

            const jobData = {
                title: document.getElementById("jobTitle").value.trim(),
                company: document.getElementById("jobCompany").value.trim(),
                location: document.getElementById("jobLocation").value.trim(),
                jobType: document.getElementById("jobType").value,
                description: document.getElementById("jobDescription").value.trim()
            };

            if (!jobData.title || !jobData.company) {
                showToast(
                    "Job title and company are required.",
                    "error"
                );
                return;
            }

            const submitButton = event.submitter;
            if (submitButton) submitButton.disabled = true;

            try {
                const savedJob = await apiFetch(
                    id ? `/api/jobs/${id}` : "/api/jobs",
                    {
                        method: id ? "PUT" : "POST",
                        body: JSON.stringify(jobData)
                    }
                );

                if (id) {
                    const index = state.jobs.findIndex(
                        job => Number(job.id) === Number(id)
                    );

                    if (index !== -1) {
                        state.jobs[index] = savedJob;
                    } else {
                        state.jobs.unshift(savedJob);
                    }
                } else {
                    state.jobs.unshift(savedJob);
                }

                renderJobs();
                updateStats();
                updateSidebarCounts();
                reRenderCharts();

                document.getElementById("jobForm")
                    .classList.add("hidden");
                document.getElementById("jobForm").reset();

                showToast(
                    id ? "Job updated successfully!" : "Job added successfully!",
                    "success"
                );
            } catch (error) {
                showToast("Could not save job: " + error.message, "error");
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        });

    document.getElementById("refreshJobs")
        ?.addEventListener("click", async () => {
            try {
                await fetchJobs();
                showToast("Jobs refreshed.", "success");
            } catch (error) {
                // fetchJobs already displays the error.
            }
        });
});

function handleSearch(value) {
    state.search = String(value || "").toLowerCase().trim();
    renderJobs();
}

function setFilter(filter, element) {
    state.filter = filter;

    document.querySelectorAll(".sidebar-item").forEach(item => {
        item.classList.remove("active");
    });

    if (element) element.classList.add("active");

    renderJobs();
}

function setView(filter, element) {
    setFilter(filter, element);
}


async function fetchApplications() {
    try {
        const data = await apiFetch("/api/applications");

        state.applications = Array.isArray(data)
            ? data
            : data?.content || data?.applications || [];

        renderApplications();
        updateApplicationStats();

        return state.applications;
    } catch (error) {
        console.error("Failed to load applications:", error);
        showToast("Could not load applications: " + error.message, "error");
        return [];
    }
}

function updateApplicationStats() {
setText("totalJobs", state.jobs.length);
    const applications = state.applications;

    const totalApplications = applications.length;

    const interviews = applications.filter(
        application =>
            String(application.status || "").toUpperCase() === "INTERVIEW"
    ).length;

    const rejected = applications.filter(
        application =>
            String(application.status || "").toUpperCase() === "REJECTED"
    ).length;

    setText("totalApplications", totalApplications);
    setText("totalInterviews", interviews);
    setText("totalRejected", rejected);
}
async function applyForJob(jobId) {
    try {
        const result = await apiFetch("/api/applications/apply", {
            method: "POST",
            body: JSON.stringify({
                jobId: jobId
            })
        });

        await fetchApplications();
        showToast("Application submitted!", "success");

        return result;
    } catch (error) {
        showToast("Could not apply: " + error.message, "error");
        return null;
    }
}

async function updateApplicationStatus(id, status) {
    try {
        await apiFetch(`/api/applications/${id}/status`, {
            method: "PUT",
            body: JSON.stringify({ status })
        });

        await fetchApplications();
        showToast("Application status updated.", "success");
    } catch (error) {
        showToast("Could not update status: " + error.message, "error");
    }
}

async function deleteApplication(id) {
    try {
        await apiFetch(`/api/applications/${id}`, {
            method: "DELETE"
        });

        state.applications = state.applications.filter(
            application => application.id !== id
        );

        renderApplications();
        showToast("Application removed.", "success");
    } catch (error) {
        showToast("Could not remove application: " + error.message, "error");
    }
}

function renderApplications() {
    const container = document.getElementById("applications-list");
    if (!container) return;

    if (!state.applications.length) {
        container.textContent = "No applications yet.";
        return;
    }

    container.innerHTML = state.applications.map(application => {
        const jobTitle =
            application.jobTitle ||
            application.job?.title ||
            application.job?.role ||
            "Job";

        return `
            <div class="application-item">
                <span>${escapeHtml(jobTitle)}</span>
                <span>${escapeHtml(application.status || "")}</span>
                <span>${escapeHtml(formatDate(
                    application.appliedDate || application.createdAt
                ))}</span>
                <button type="button"
                    onclick="deleteApplication(${Number(application.id)})">
                    Remove
                </button>
            </div>
        `;
    }).join("");
}
async function loadDashboardStats() {
    const totalJobsElement = document.getElementById("totalJobs");
    const totalApplicationsElement =
        document.getElementById("totalApplications");

    if (!totalJobsElement && !totalApplicationsElement) {
        console.warn(
            "Dashboard stats skipped: expected HTML elements were not found."
        );
        return;
    }

    console.log("Loading dashboard statistics...");
    console.log("JWT token present:", Boolean(getToken()));

    try {
        const stats = await apiFetch("/api/dashboard/stats");

        console.log("Dashboard stats received:", stats);

        setText("totalJobs", stats?.totalJobs ?? 0);
        setText("totalApplications", stats?.totalApplications ?? 0);
        setText("totalInterviews", stats?.interviews ?? 0);
        setText("totalOffers", stats?.offers ?? 0);
        setText("totalRejected", stats?.rejected ?? 0);

    } catch (error) {
        console.error(
            "Could not load dashboard stats:",
            error.message
        );
    }
}
function updateStats() {
    const jobs = state.jobs;

    const interviews = jobs.filter(
        job => normalizeStatus(job.status) === "interview"
    ).length;

    const offers = jobs.filter(
        job => normalizeStatus(job.status) === "offer"
    ).length;

    const rejected = jobs.filter(
        job => normalizeStatus(job.status) === "rejected"
    ).length;

    setText("s-total", jobs.length);
    setText("s-interview", interviews);
    setText("s-offer", offers);
    setText("s-rejected", rejected);

    const rate = jobs.length
        ? Math.round(((interviews + offers) / jobs.length) * 100)
        : 0;

    setText("s-rate", rate + "% rate");
}

function updateSidebarCounts() {
    const statuses = ["Applied", "Interview", "Offer", "Rejected", "Ghosted"];

    setText("cnt-all", state.jobs.length);

    statuses.forEach(status => {
        const count = state.jobs.filter(
            job => normalizeStatus(job.status) === normalizeStatus(status)
        ).length;

        setText("cnt-" + status, count);
    });
}
let chartInstance = null;

function reRenderCharts() {
    const canvas =
        document.getElementById("statusChart") ||
        document.getElementById("pieChart");

    if (!canvas || typeof Chart === "undefined") return;

    if (chartInstance) {
        chartInstance.destroy();
    }

    const statuses = ["Applied", "Interview", "Offer", "Rejected", "Ghosted"];

    const counts = statuses.map(status =>
        state.jobs.filter(
            job => normalizeStatus(job.status) === normalizeStatus(status)
        ).length
    );

    chartInstance = new Chart(canvas.getContext("2d"), {
        type: "doughnut",
        data: {
            labels: statuses,
            datasets: [{
                data: counts,
                backgroundColor: [
                    "#6c8bff",
                    "#fbbf24",
                    "#34d399",
                    "#f87171",
                    "#8890aa"
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%"
        }
    });
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = String(value);
    }
}

function normalizeStatus(value) {
    return String(value || "").trim().toLowerCase();
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

let currentTheme = localStorage.getItem("nh_theme") || "dark";

function applyTheme() {
    document.documentElement.setAttribute("data-theme", currentTheme);

    const button = document.getElementById("theme-btn");

    if (button) {
        button.textContent = currentTheme === "dark" ? "◑" : "◐";
    }
}

function toggleTheme() {
    currentTheme = currentTheme === "dark" ? "light" : "dark";

    localStorage.setItem("nh_theme", currentTheme);
    applyTheme();
    reRenderCharts();
}

function toggleSidebar() {
    document.getElementById("sidebar")?.classList.toggle("collapsed");
}

function toggleNotif() {
    document.getElementById("notif-dropdown")?.classList.toggle("hidden");
}

function toggleProfile() {
    showToast("Profile settings coming soon.", "info");
}

function togglePass(button) {
    const input = button?.previousElementSibling;
    if (!input) return;

    input.type = input.type === "password" ? "text" : "password";
}

function navigate(element) {
    const page = element?.dataset?.page;
    if (!page) return;

    document.querySelectorAll(".page").forEach(item => {
        item.classList.remove("active");
    });

    document.getElementById("page-" + page)?.classList.add("active");

    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });

    element.classList.add("active");

    const labels = {
        dashboard: "Dashboard",
        tracker: "Job Tracker",
        analytics: "Analytics"
    };

    setText("topbar-title", labels[page] || page);
}
async function initApp() {
    if (!getToken()) {
        window.location.replace("/login");
        return;
    }

    // Do not call fetchCurrentUser() until /api/auth/me exists.
    try {
        await fetchJobs();
    } catch (error) {
        console.error("Could not initialize jobs:", error);
    }

    await fetchApplications();
    await loadDashboardStats();
}

function showAuthSection() {
    document.getElementById("auth-overlay")?.classList.remove("hidden");
    document.getElementById("app")?.classList.add("hidden");
}

function showAppSection() {
    document.getElementById("auth-overlay")?.classList.add("hidden");
    document.getElementById("app")?.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
    applyTheme();

    // Attach exactly one submit handler to each form found on this page.
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", handleLoginSubmit);
    }

    const registerForm = document.getElementById("registerForm");

    if (registerForm) {
        registerForm.addEventListener("submit", handleRegisterSubmit);
    }

    const logoutButton = document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }

    // For the single-page layout with an authentication overlay.
    if (document.getElementById("auth-overlay")) {
        if (getToken()) {
            showAppSection();
            initApp();
        } else {
            showAuthSection();
        }
    } else if (
        document.getElementById("jobs-grid") ||
        document.getElementById("applications-list") ||
        document.getElementById("totalApplications")
    ) {
        // For separate dashboard pages.
        if (!getToken()) {
            window.location.replace("/login");
            return;
        }

        initApp();
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            document.getElementById("job-modal")?.classList.add("hidden");
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
            event.preventDefault();
            document.getElementById("search-input")?.focus();
        }
    });
});
