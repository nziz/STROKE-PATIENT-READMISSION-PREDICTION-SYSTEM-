// =============================================
// STATE
// =============================================
let token = localStorage.getItem("maternal_token") || null;
let currentUser = null;
let latestReportId = null;
let allAlerts = [];
let allHistory = [];
let historySort = "date";
let ussdActive = false;
let ussdSessionId = "";
let ussdPath = [];
const ussdPhone = "+250781234567";

// =============================================
// INIT
// =============================================
document.addEventListener("DOMContentLoaded", () => {
    updateSimClock();
    setInterval(updateSimClock, 30000);

    const saved = localStorage.getItem("maternal_user");
    if (token && saved) {
        try {
            currentUser = JSON.parse(saved);
            // Refresh user from server to ensure header reflects latest bio.
            // If refresh fails, clear expired session and stay on auth.
            refreshCurrentUser().then(() => showDashboard(currentUser)).catch(() => logout());
        } catch (e) {
            logout();
        }
    } else {
        showSection("auth-section");
    }

    // File drag/drop
    const dropZone = document.getElementById("file-drop-zone");
    if (dropZone) {
        dropZone.addEventListener("drop", handleFileDrop);
        dropZone.addEventListener("dragover", e => e.preventDefault());
    }

    // Check mobile on resize
    handleResize();
    window.addEventListener("resize", handleResize);
});

function handleResize() {
    const isMobile = window.innerWidth <= 1024;
    const fab = document.getElementById("ussd-fab-btn");
    if (fab) fab.style.display = currentUser ? (isMobile ? "flex" : "none") : "none";
}

function updateSimClock() {
    const el = document.getElementById("sim-clock");
    if (el) {
        const now = new Date();
        el.textContent = now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0");
    }
}

function normalizePhone(phone) {
    if (!phone || typeof phone !== 'string') return '';
    const digits = phone.trim().replace(/\s+/g, '');
    if (/^\+2507\d{8}$/.test(digits)) return '0' + digits.slice(4);
    if (/^2507\d{8}$/.test(digits)) return '0' + digits.slice(3);
    if (/^07\d{8}$/.test(digits)) return digits;
    return digits;
}

function isValidPhone(phone) {
    return /^07\d{8}$/.test(normalizePhone(phone));
}

// =============================================
// TOAST
// =============================================
function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    const icon = document.getElementById("toast-icon");
    const msgEl = document.getElementById("toast-message");

    msgEl.innerText = message;
    icon.className = isError ? "fa-solid fa-circle-xmark" : "fa-solid fa-circle-check";
    toast.className = `toast ${isError ? "toast-error" : "toast-success"} show`;

    setTimeout(() => { toast.classList.remove("show"); }, 4000);
}

// =============================================
// VIEW NAVIGATION
// =============================================
function showSection(sectionId) {
    document.querySelectorAll(".portal-section").forEach(s => {
        s.classList.remove("active");
        s.style.display = "none";
    });
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add("active");
        target.style.display = "flex";
    }
    const aside = document.getElementById("ussd-simulator-panel");
    if (aside) {
        aside.style.display = sectionId === "auth-section" ? "none" : "block";
    }
}

function showDashboard(user) {
    document.getElementById("header-user-info").style.display = "flex";
    document.getElementById("user-display-name").innerText = user.fullname;
    const rolePill = document.getElementById("user-display-role-pill");
    rolePill.innerText = user.role;
    rolePill.style.background = user.role === "HIGH" ? "var(--danger-bg)" : "var(--primary-glow)";

    const isMobile = window.innerWidth <= 1024;
    const fab = document.getElementById("ussd-fab-btn");
    if (fab) fab.style.display = isMobile ? "flex" : "none";

    if (user.role === "PATIENT") {
        showSection("patient-section");
        loadPatientHistory();
        // Open form by default on patient screen
        const icon = document.getElementById("patient-form-toggle-icon");
        if (icon) icon.classList.add("rotated");
        const body = document.getElementById("patient-form-body");
        if (body) body.style.display = "grid";
    } else {
        showSection("nurse-section");
        loadNurseAlerts();
        loadNurseStats();
        if (user.role === "NURSE" || user.role === "ADMIN") {
            loadPatientRecords();
        }
    }
    const aside = document.getElementById("ussd-simulator-panel");
    if (aside) aside.style.display = "block";
}

// =============================================
// COLLAPSIBLE SECTIONS
// =============================================
function toggleSection(bodyId, iconId) {
    const body = document.getElementById(bodyId);
    const icon = document.getElementById(iconId);
    if (!body) return;
    const isVisible = body.style.display !== "none" && body.style.display !== "";
    body.style.display = isVisible ? "none" : (bodyId === "patient-form-body" ? "grid" : "block");
    if (icon) icon.classList.toggle("rotated", !isVisible);
}

// =============================================
// MOBILE MENU
// =============================================
function toggleMobileMenu() {
    const menu = document.getElementById("mobile-menu-dropdown");
    if (!menu) return;
    menu.style.display = menu.style.display === "none" ? "flex" : "none";
}

document.addEventListener("click", (e) => {
    const menu = document.getElementById("mobile-menu-dropdown");
    const btn = document.getElementById("mobile-menu-btn");
    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
        menu.style.display = "none";
    }
});

// =============================================
// USSD PANEL TOGGLE (Mobile)
// =============================================
function toggleUSSDPanel() {
    const panel = document.getElementById("ussd-simulator-panel");
    if (!panel) return;
    panel.classList.toggle("open");
    const menu = document.getElementById("mobile-menu-dropdown");
    if (menu) menu.style.display = "none";
}

// =============================================
// AUTH
// =============================================
function togglePatientRegFields() {
    const role = document.getElementById("reg-role").value;
    const extra = document.getElementById("patient-extra-fields");
    extra.style.display = role === "PATIENT" ? "block" : "none";
    const ageInput = document.getElementById("reg-age");
    if (role === "PATIENT") {
        ageInput.setAttribute("required", "required");
    } else {
        ageInput.removeAttribute("required");
    }
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const loginBtn = document.getElementById("toggle-login");
    const regBtn = document.getElementById("toggle-register");

    if (tab === "login") {
        loginForm.style.display = "block";
        registerForm.style.display = "none";
        loginBtn.classList.add("active");
        regBtn.classList.remove("active");
    } else {
        loginForm.style.display = "none";
        registerForm.style.display = "block";
        loginBtn.classList.remove("active");
        regBtn.classList.add("active");
        togglePatientRegFields();
    }
}

function togglePasswordVisibility(fieldId) {
    const input = document.getElementById(fieldId);
    const icon = document.getElementById(`${fieldId}-eye`);
    if (input.type === "password") {
        input.type = "text";
        icon.className = "fa-solid fa-eye-slash";
    } else {
        input.type = "password";
        icon.className = "fa-solid fa-eye";
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById("login-btn");
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';

    const formData = new FormData();
    formData.append("username", document.getElementById("login-username").value.trim());
    formData.append("password", document.getElementById("login-password").value);

    try {
        const response = await fetch("/api/auth/login", { method: "POST", body: formData });
        if (!response.ok) {
            let err;
            try {
                err = await response.json();
            } catch (parseError) {
                err = { detail: await response.text() };
            }
            throw new Error(err.detail || "Login failed");
        }
        const data = await response.json();
        token = data.access_token;
        currentUser = data.user;
        localStorage.setItem("maternal_token", token);
        localStorage.setItem("maternal_refresh_token", data.refresh_token || "");
        localStorage.setItem("maternal_user", JSON.stringify(currentUser));
        showToast(`Welcome, ${currentUser.fullname}!`);
        showDashboard(currentUser);
        document.getElementById("login-form").reset();
    } catch (err) {
        showToast(err.message, true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Login <i class="fa-solid fa-arrow-right-to-bracket"></i>';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById("register-btn");
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';

    const role = document.getElementById("reg-role").value;
    const rawPhone = document.getElementById("reg-phone").value.trim();
    const normalizedPhone = normalizePhone(rawPhone);
    if (!isValidPhone(rawPhone)) {
        showToast("Phone must be +25078xxxxxxx or 078xxxxxxx", true);
        btn.disabled = false;
        btn.innerHTML = 'Create Account <i class="fa-solid fa-user-plus"></i>';
        return;
    }

    const emergencyRaw = document.getElementById("reg-emergency").value.trim();
    let normalizedEmergency = "";
    if (emergencyRaw) {
        normalizedEmergency = normalizePhone(emergencyRaw);
        if (!isValidPhone(normalizedEmergency)) {
            showToast("Emergency contact must be +25078xxxxxxx or 078xxxxxxx", true);
            btn.disabled = false;
            btn.innerHTML = 'Create Account <i class="fa-solid fa-user-plus"></i>';
            return;
        }
    }

    const formData = new FormData();
    formData.append("username", document.getElementById("reg-username").value.trim());
    formData.append("password", document.getElementById("reg-password").value);
    formData.append("role", role);
    formData.append("fullname", document.getElementById("reg-fullname").value.trim());
    formData.append("phone", normalizedPhone);
    formData.append("district", document.getElementById("reg-district").value.trim());
    formData.append("sector", document.getElementById("reg-sector").value.trim());
    formData.append("village", document.getElementById("reg-village").value.trim());
    formData.append("cell", document.getElementById("reg-cell").value.trim());
    if (normalizedEmergency) {
        formData.append("emergency_contact", normalizedEmergency);
    }

    if (role === "PATIENT") {
        const age = document.getElementById("reg-age").value;
        if (!age) { showToast("Age is required for patients.", true); btn.disabled = false; btn.innerHTML = 'Create Account <i class="fa-solid fa-user-plus"></i>'; return; }
        formData.append("age", age);
        formData.append("blood_group", document.getElementById("reg-blood").value);
    }

    try {
        const response = await fetch("/api/auth/register", { method: "POST", body: formData });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Registration failed");
        }
        showToast("Account created! Please login.");
        switchAuthTab("login");
        document.getElementById("register-form").reset();
        document.getElementById("patient-extra-fields").style.display = "block";
    } catch (err) {
        showToast(err.message, true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Create Account <i class="fa-solid fa-user-plus"></i>';
    }
}

function logout() {
    token = null; currentUser = null; allAlerts = []; allHistory = [];
    localStorage.removeItem("maternal_token");
    localStorage.removeItem("maternal_refresh_token");
    localStorage.removeItem("maternal_user");
    const header = document.getElementById("header-user-info");
    if (header) header.style.display = "none";
    const fab = document.getElementById("ussd-fab-btn");
    if (fab) fab.style.display = "none";
    const aside = document.getElementById("ussd-simulator-panel");
    if (aside) aside.style.display = "none";
    showSection("auth-section");
    showToast("Logged out successfully");
}

async function refreshCurrentUser() {
    if (!token) return;

    async function fetchProfile() {
        const res = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Not authenticated');
        return await res.json();
    }

    async function refreshToken() {
        const refreshToken = localStorage.getItem('maternal_refresh_token');
        if (!refreshToken) throw new Error('Refresh token missing');
        const form = new FormData();
        form.append('refresh_token', refreshToken);
        const res = await fetch('/api/auth/refresh', { method: 'POST', body: form });
        if (!res.ok) throw new Error('Refresh failed');
        const data = await res.json();
        token = data.access_token;
        localStorage.setItem('maternal_token', token);
    }

    try {
        const data = await fetchProfile();
        currentUser = data;
    } catch (err) {
        try {
            await refreshToken();
            const data = await fetchProfile();
            currentUser = data;
        } catch (refreshErr) {
            console.warn('Refresh user failed', refreshErr);
            throw refreshErr;
        }
    }

    localStorage.setItem('maternal_user', JSON.stringify(currentUser));
    const nameEl = document.getElementById('user-display-name'); if (nameEl) nameEl.innerText = currentUser.fullname || currentUser.username || '';
    const rolePill = document.getElementById('user-display-role-pill'); if (rolePill) rolePill.innerText = currentUser.role;
    return currentUser;
}

// =============================================
// FILE UPLOAD HANDLING
// =============================================
const ALLOWED_EXTS = ["pdf", "png", "jpg", "jpeg", "mp3", "wav", "txt", "csv"];
const TYPE_ICONS = {
    "pdf": "fa-file-pdf",
    "png": "fa-file-image", "jpg": "fa-file-image", "jpeg": "fa-file-image",
    "mp3": "fa-file-audio", "wav": "fa-file-audio",
    "txt": "fa-file-lines", "csv": "fa-file-csv"
};

function getFileExt(name) { return name.split(".").pop().toLowerCase(); }
function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) renderFilePreview(file);
}

function handleFileDrop(event) {
    event.preventDefault();
    document.getElementById("file-drop-zone").classList.remove("drag-over");
    const file = event.dataTransfer.files[0];
    if (file) {
        const fileInput = document.getElementById("sym-file");
        if (fileInput && typeof DataTransfer !== 'undefined') {
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
        }
        renderFilePreview(file);
    }
}

function renderFilePreview(file) {
    const ext = getFileExt(file.name);
    if (!ALLOWED_EXTS.includes(ext)) {
        showToast(`Format .${ext} is not allowed. Use: PDF, PNG, JPG, MP3, TXT, CSV`, true);
        clearFile();
        return;
    }

    const placeholder = document.getElementById("file-upload-placeholder");
    const preview = document.getElementById("file-upload-preview");
    const clearBtn = document.getElementById("clear-file-btn");
    const iconClass = TYPE_ICONS[ext] || "fa-file";

    let previewHTML = `<div class="file-preview-item">
        <i class="fa-solid ${iconClass}" style="color:var(--primary);font-size:1.8rem;"></i>
        <div>
            <div class="file-name">${file.name}</div>
            <div class="file-size">${formatBytes(file.size)}</div>
        </div>
    </div>`;

    if (["png","jpg","jpeg"].includes(ext)) {
        const objectUrl = URL.createObjectURL(file);
        previewHTML += `<img src="${objectUrl}" class="file-preview-thumb mt-1">`;
    }

    placeholder.style.display = "none";
    preview.innerHTML = previewHTML;
    preview.style.display = "block";
    clearBtn.style.display = "inline-flex";
}

function clearFile() {
    const fileInput = document.getElementById("sym-file");
    if (fileInput) fileInput.value = "";
    document.getElementById("file-upload-placeholder").style.display = "block";
    document.getElementById("file-upload-preview").innerHTML = "";
    document.getElementById("file-upload-preview").style.display = "none";
    document.getElementById("clear-file-btn").style.display = "none";
}

// =============================================
// PATIENT OPERATIONS
// =============================================
function calculateGestationalWeeks() {
    const lmpVal = document.getElementById("sym-lmp").value;
    const badge = document.getElementById("gest-weeks-badge");
    if (!lmpVal) { badge.style.display = "none"; return; }
    const diffDays = Math.ceil((new Date() - new Date(lmpVal)) / 86400000);
    const weeks = Math.floor(diffDays / 7);
    badge.innerText = `Gestational Age: ${weeks} Weeks`;
    badge.style.display = "inline-block";
}

function switchRecommTab(lang) {
    document.getElementById("recomm-en").classList.toggle("active", lang === "en");
    document.getElementById("recomm-rw").classList.toggle("active", lang === "rw");
    document.getElementById("tab-en").classList.toggle("active", lang === "en");
    document.getElementById("tab-rw").classList.toggle("active", lang === "rw");
}

async function handleSymptomSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById("submit-report-btn");
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

    const formData = new FormData();
    const weight = document.getElementById("sym-weight").value;
    const sys = document.getElementById("sym-systolic").value;
    const dia = document.getElementById("sym-diastolic").value;
    if (weight) formData.append("weight", weight);
    if (sys) formData.append("systolic_bp", sys);
    if (dia) formData.append("diastolic_bp", dia);
    formData.append("bleeding", document.getElementById("sym-bleeding").checked);
    formData.append("fever", document.getElementById("sym-fever").checked);
    formData.append("headache", document.getElementById("sym-headache").checked);
    formData.append("swelling", document.getElementById("sym-swelling").checked);
    formData.append("abdominal_pain", document.getElementById("sym-abdominal").checked);
    formData.append("reduced_fetal_movement", !document.getElementById("sym-fetal").checked);
    formData.append("notes", document.getElementById("sym-notes").value);
    const lmpVal = document.getElementById("sym-lmp").value;
    if (lmpVal) formData.append("lmp_date", lmpVal);
    const fileInput = document.getElementById("sym-file");
    if (fileInput.files[0]) formData.append("file", fileInput.files[0]);

    try {
        const res = await fetch("/api/reports/submit", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Submission failed"); }
        const data = await res.json();
        showToast("Health report submitted!");

        // Update triage gauge & recommendations
        const gauge = document.getElementById("patient-risk-gauge");
        gauge.className = `risk-indicator ${data.risk_level}`;
        document.getElementById("patient-risk-txt").innerText = `${data.risk_level} RISK`;
        document.getElementById("recomm-en").innerHTML = `<p class="recomm-text">${data.eval_details.recommendation_en}</p>`;
        document.getElementById("recomm-rw").innerHTML = `<p class="recomm-text">${data.eval_details.recommendation_rw}</p>`;

        latestReportId = data.report_id;
        document.getElementById("latest-report-download").style.display = "block";
        document.getElementById("sym-notes").value = "";
        clearFile();
        loadPatientHistory();
    } catch (err) {
        showToast(err.message, true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Submit Health Report <i class="fa-solid fa-paper-plane"></i>';
    }
}

async function loadPatientHistory() {
    try {
        const res = await fetch("/api/reports/history", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Could not load history");
        allHistory = await res.json();
        renderHistory(allHistory);
        if (allHistory.length > 0) {
            latestReportId = allHistory[0].id;
            document.getElementById("latest-report-download").style.display = "block";
        }
    } catch (err) { showToast(err.message, true); }
}

function sortHistory(by) {
    historySort = by;
    document.querySelectorAll(".sort-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(`sort-${by}`).classList.add("active");
    applyHistorySort();
}

function applyHistorySort() {
    const sorted = [...allHistory];
    if (historySort === "date") {
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (historySort === "risk") {
        const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        sorted.sort((a, b) => rank[a.risk_level] - rank[b.risk_level]);
    }
    renderHistory(sorted);
}

function filterHistory() {
    const q = document.getElementById("history-search").value.toLowerCase();
    const filtered = allHistory.filter(r =>
        r.risk_level.toLowerCase().includes(q) ||
        r.created_at.toLowerCase().includes(q) ||
        (r.notes && r.notes.toLowerCase().includes(q))
    );
    renderHistory(filtered);
}

function renderHistory(reports) {
    const tbody = document.getElementById("history-rows");
    if (!reports.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No health records submitted yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = reports.map(r => {
        const dateStr = new Date(r.created_at).toLocaleDateString();
        const bp = (r.systolic_bp && r.diastolic_bp) ? `${r.systolic_bp}/${r.diastolic_bp}` : "—";
        const wt = r.weight ? `${r.weight} kg` : "—";
        const flags = [];
        if (r.bleeding) flags.push("Bleeding");
        if (r.fever) flags.push("Fever");
        if (r.headache) flags.push("Headache");
        if (r.swelling) flags.push("Swelling");
        if (r.abdominal_pain) flags.push("Pain");
        if (r.reduced_fetal_movement) flags.push("Fetal");
        const sympStr = flags.length
            ? flags.map(f => `<span class="badge badge-danger">${f}</span>`).join(" ")
            : '<span class="badge badge-success">None</span>';
        const riskClass = r.risk_level === "HIGH" ? "danger" : r.risk_level === "MEDIUM" ? "warning" : "success";
        const attachCol = r.attachment_path
            ? `<i class="fa-solid fa-paperclip attachment-icon" title="${r.attachment_filename}" onclick="previewAttachmentStandalone('${r.attachment_path}','${r.attachment_type}','${r.attachment_filename}')"></i>`
            : `<span class="text-muted">—</span>`;
        return `<tr>
            <td>${dateStr}</td>
            <td><b>${bp}</b> mmHg<br><small>${wt}</small></td>
            <td>${sympStr}</td>
            <td><span class="badge badge-${riskClass}">${r.risk_level}</span></td>
            <td>${attachCol}</td>
            <td><a href="#" class="btn-download-report" onclick="executeAuthenticatedDownload(event, ${r.id})">📄 Download</a></td>
        </tr>`;
    }).join("");
}

// =============================================
// PDF DOWNLOAD
// =============================================
async function downloadPDF(reportId) {
    try {
        const res = await fetch(`/api/reports/${reportId}/pdf`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Could not download PDF");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `maternal_report_${reportId}.pdf`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        showToast("PDF downloaded successfully!");
    } catch (err) { showToast(err.message, true); }
}

function downloadLatestPDF() {
    if (latestReportId) downloadPDF(latestReportId);
}

// =============================================
// ATTACHMENT PREVIEW (standalone popup)
// =============================================
function previewAttachmentStandalone(path, type, filename) {
    // Open a simple browser popup for preview
    const win = window.open("", "_blank", "width=700,height=500,scrollbars=yes");
    let content = `<title>${filename}</title><style>body{background:#0f1218;color:#e0e0e0;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:14px;padding:20px;}img{max-width:100%;border-radius:8px;} audio{width:100%;}</style>`;
    if (type === "image") {
        win.document.write(content + `<img src="${path}" alt="${filename}"><p>${filename}</p>`);
    } else if (type === "audio") {
        win.document.write(content + `<h3>${filename}</h3><audio controls src="${path}"></audio>`);
    } else {
        win.document.write(content + `<p><a href="${path}" target="_blank" style="color:#00D4C0;font-size:1.1rem;">📎 Open ${filename}</a></p>`);
    }
}

// =============================================
// NURSE DASHBOARD
// =============================================
async function loadNurseAlerts() {
    try {
        const res = await fetch("/api/nurse/alerts", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to load alerts");
        allAlerts = await res.json();
        populateVillageFilter();
        renderAlerts(allAlerts);
    } catch (err) { showToast(err.message, true); }
}

function executeAuthenticatedDownload(event, reportId) {
    if (event && typeof event.preventDefault === "function") event.preventDefault();
    downloadPDF(reportId);
}

function triggerPanicPopupCard(patientName, location, alertId) {
    showToast(`CRITICAL EMERGENCY: ${patientName} at ${location}`, true);
}

function synchronizeDashboardLedger() {
    const authenticatedUserToken = token;
    if (!authenticatedUserToken) return;

    fetch('/api/dashboard/alerts', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${authenticatedUserToken}`,
            'Accept': 'application/json'
        }
    })
    .then(res => {
        if (!res.ok) throw new Error("Dashboard synchronization connection dropped.");
        return res.json();
    })
    .then(alerts => {
        const container = document.getElementById("triage-grid-rows") || document.getElementById("nurse-alert-rows");
        if (!container) return;

        container.innerHTML = "";
        if (alerts.length === 0) {
            const noDataHtml = container.id === "nurse-alert-rows"
                ? `<tr><td colspan="8" style="text-align:center; color:#94a3b8">No active maternal alerts found in the ledger database.</td></tr>`
                : `<tr><td colspan="5" style="text-align:center; color:#94a3b8">No active maternal alerts found in the ledger database.</td></tr>`;
            container.innerHTML = noDataHtml;
            return;
        }

        alerts.forEach(alert => {
            const tr = document.createElement("tr");
            if (alert.status === "CRITICAL_EMERGENCY") {
                tr.style.background = "#fff5f5";
                if (typeof triggerPanicPopupCard === "function") {
                    triggerPanicPopupCard(alert.patient_name, alert.location, alert.id);
                }
            }

            if (container.id === "nurse-alert-rows") {
                tr.innerHTML = `
                    <td>${statusBadge(alert.status)}</td>
                    <td><strong>${alert.patient_name}</strong><br><small style="color:#64748b">${alert.phone}</small></td>
                    <td>${alert.location}</td>
                    <td>${alert.gestational_weeks || '—'}w</td>
                    <td><span class="badge badge-high">${alert.risk_level}</span></td>
                    <td><span class="badge badge-danger">${alert.risk_level}</span></td>
                    <td><span class="text-muted">—</span></td>
                    <td><a href="#" onclick="executeAuthenticatedDownload(event, ${alert.report_id})" class="btn-download-report">📄 Download Medical PDF</a></td>
                `;
            } else {
                tr.innerHTML = `
                    <td><strong>${alert.patient_name}</strong><br><small style="color:#64748b">${alert.phone}</small></td>
                    <td>${alert.location}</td>
                    <td><span class="badge badge-high">${alert.risk_level}</span></td>
                    <td><span style="font-weight:600; color:${alert.status === 'CRITICAL_EMERGENCY' ? '#ef4444':'#64748b'}">${alert.status}</span></td>
                    <td><a href="#" onclick="executeAuthenticatedDownload(event, ${alert.report_id})" class="btn-download-report">📄 Download Medical PDF</a></td>
                `;
            }
            container.appendChild(tr);
        });
    })
    .catch(err => console.warn("Sync warning: Logging authorization clearance sync delay...", err));
}

async function loadNurseStats() {
    try {
        const res = await fetch("/api/stats", { headers: { "Authorization": `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const s = await res.json();
        document.getElementById("stat-total-val").innerText = s.total_alerts;
        document.getElementById("stat-high-val").innerText = s.high_risk_pending;
        document.getElementById("stat-med-val").innerText = s.medium_risk_pending;
        document.getElementById("stat-resolved-val").innerText = s.resolved_alerts;
    } catch { /* silent */ }
}

async function loadPatientRecords() {
    try {
        const res = await fetch("/api/patients", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Could not load patient records");
        const patients = await res.json();
        renderPatientRecords(patients);
    } catch (err) {
        showToast(err.message, true);
    }
}

function renderPatientRecords(patients) {
    const tbody = document.getElementById("patient-record-rows");
    if (!tbody) return;
    if (!patients || !patients.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No patient records available.</td></tr>`;
        return;
    }
    tbody.innerHTML = patients.map(patient => {
        const age = patient.age ? `${patient.age}` : "—";
        const village = patient.village || "—";
        return `<tr>
            <td>${patient.fullname}</td>
            <td>${patient.phone}</td>
            <td>${village}</td>
            <td>${age}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deletePatientRecord(${patient.id}, '${patient.fullname.replace(/'/g, "&#39;")}')">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>
            </td>
        </tr>`;
    }).join("");
}

async function deletePatientRecord(userId, fullname) {
    if (!confirm(`Delete patient record for ${fullname}? This cannot be undone.`)) return;
    try {
        const res = await fetch(`/api/users/${userId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Could not delete patient record");
        showToast(data.message || "Patient record deleted");
        loadPatientRecords();
        loadNurseAlerts();
    } catch (err) {
        showToast(err.message, true);
    }
}

function populateVillageFilter() {
    const villages = [...new Set(allAlerts.map(a => a.patient.village).filter(Boolean))];
    const sel = document.getElementById("filter-village");
    const current = sel.value;
    sel.innerHTML = '<option value="ALL">All Villages</option>';
    villages.forEach(v => sel.innerHTML += `<option value="${v}"${current===v?" selected":""}>${v}</option>`);
}

function applyFilters() {
    const search = (document.getElementById("nurse-search")?.value || "").toLowerCase();
    const village = document.getElementById("filter-village").value;
    const risk = document.getElementById("filter-risk").value;
    const status = document.getElementById("filter-status").value;
    const sortBy = document.getElementById("sort-alerts").value;

    let filtered = allAlerts.filter(a => {
        const matchSearch = !search ||
            a.patient.name.toLowerCase().includes(search) ||
            a.patient.phone.includes(search);
        const matchVillage = village === "ALL" || a.patient.village === village;
        const matchRisk = risk === "ALL" || a.risk_level === risk;
        const matchStatus = status === "ALL" || a.status === status;
        return matchSearch && matchVillage && matchRisk && matchStatus;
    });

    // Sort
    const riskRank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const statusRank = { PENDING: 0, CONTACTED: 1, REFERRED: 2, RESOLVED: 3 };
    filtered.sort((a, b) => {
        if (sortBy === "risk") return riskRank[a.risk_level] - riskRank[b.risk_level] || statusRank[a.status] - statusRank[b.status];
        if (sortBy === "date") return new Date(b.updated_at) - new Date(a.updated_at);
        if (sortBy === "name") return a.patient.name.localeCompare(b.patient.name);
        if (sortBy === "village") return (a.patient.village||"").localeCompare(b.patient.village||"");
        return 0;
    });

    renderAlerts(filtered);
}

function resetFilters() {
    document.getElementById("nurse-search").value = "";
    document.getElementById("filter-village").value = "ALL";
    document.getElementById("filter-risk").value = "ALL";
    document.getElementById("filter-status").value = "ALL";
    document.getElementById("sort-alerts").value = "risk";
    renderAlerts(allAlerts);
}

function riskBadge(level) {
    const cls = level === "HIGH" ? "danger" : level === "MEDIUM" ? "warning" : "success";
    return `<span class="badge badge-${cls}">${level}</span>`;
}
function statusBadge(status) {
    const map = { PENDING: "danger", CONTACTED: "info", REFERRED: "warning", RESOLVED: "success" };
    return `<span class="badge badge-${map[status]||"secondary"}">${status}</span>`;
}
function symptomBadges(symptoms) {
    const flags = [];
    if (symptoms.bleeding) flags.push("Bleeding");
    if (symptoms.fever) flags.push("Fever");
    if (symptoms.headache) flags.push("Headache");
    if (symptoms.swelling) flags.push("Swelling");
    if (symptoms.abdominal_pain) flags.push("Pain");
    if (symptoms.reduced_fetal_movement) flags.push("Fetal⚠");
    return flags.length ? flags.map(f => `<span class="badge badge-danger">${f}</span>`).join(" ") : '<span class="badge badge-success">None</span>';
}

function renderAlerts(alerts) {
    // Desktop table
    const tbody = document.getElementById("nurse-alert-rows");
    // Mobile cards
    const mobileContainer = document.getElementById("alert-cards-mobile");

    if (!alerts.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No alerts match your filters.</td></tr>`;
        mobileContainer.innerHTML = `<p class="text-center text-muted mt-3">No alerts match your filters.</p>`;
        return;
    }

    const canAction = currentUser && (currentUser.role === "NURSE" || currentUser.role === "ADMIN");

    // Desktop table rows
    tbody.innerHTML = alerts.map(a => {
        const attachCol = a.symptoms.attachment_path
            ? `<i class="fa-solid fa-paperclip attachment-icon" title="${a.symptoms.attachment_filename}" onclick="previewAttachmentStandalone('${a.symptoms.attachment_path}','${a.symptoms.attachment_type}','${a.symptoms.attachment_filename}')"></i>`
            : `<span class="text-muted">—</span>`;

        const actionBtn = canAction
            ? `<button class="btn btn-primary btn-sm" onclick='openActionModal(${JSON.stringify(a).replace(/'/g,"&#39;")})'>
                <i class="fa-solid fa-pen-to-square"></i> Action</button>`
            : `<button class="btn btn-secondary btn-sm" onclick="downloadPDF(${a.report_id})">
                <i class="fa-solid fa-file-pdf"></i> PDF</button>`;

        return `<tr>
            <td>${statusBadge(a.status)}</td>
            <td><b>${a.patient.name}</b><br><small class="text-muted">${a.patient.phone}</small></td>
            <td>${a.patient.village || "—"}</td>
            <td>${a.patient.gestational_weeks}w</td>
            <td>${riskBadge(a.risk_level)}</td>
            <td>${symptomBadges(a.symptoms)}<br><small>BP: ${a.symptoms.bp} | Wt: ${a.symptoms.weight ? a.symptoms.weight+"kg" : "—"}</small></td>
            <td>${attachCol}</td>
            <td>${actionBtn} <a href="#" class="btn-download-report" onclick="executeAuthenticatedDownload(event, ${a.report_id})">📄 Download</a></td>
        </tr>`;
    }).join("");

    // Mobile cards
    mobileContainer.innerHTML = alerts.map(a => {
        const riskClass = a.risk_level.toLowerCase();
        const canAction = currentUser && (currentUser.role === "NURSE" || currentUser.role === "ADMIN");
        const actionBtn = canAction
            ? `<button class="btn btn-primary btn-sm" onclick='openActionModal(${JSON.stringify(a).replace(/'/g,"&#39;")})'>
                <i class="fa-solid fa-pen-to-square"></i> Update</button>`
            : `<button class="btn btn-secondary btn-sm" onclick="downloadPDF(${a.report_id})">
                <i class="fa-solid fa-file-pdf"></i> PDF</button>`;
        return `<div class="alert-card-item risk-${riskClass}">
            <div class="alert-card-header">
                <div>
                    <div class="alert-card-name">${a.patient.name}</div>
                    ${riskBadge(a.risk_level)} ${statusBadge(a.status)}
                </div>
                <span style="font-size:0.75rem;color:var(--text-muted)">${a.patient.gestational_weeks}w</span>
            </div>
            <div class="alert-card-meta">
                <span><i class="fa-solid fa-map-pin"></i> ${a.patient.village||"—"}</span>
                <span><i class="fa-solid fa-phone"></i> ${a.patient.phone}</span>
                <span><i class="fa-solid fa-gauge"></i> BP: ${a.symptoms.bp}</span>
            </div>
            <div style="font-size:0.78rem;">${symptomBadges(a.symptoms)}</div>
            <div class="alert-card-actions">${actionBtn}
                <a href="#" class="btn-download-report" onclick="executeAuthenticatedDownload(event, ${a.report_id})">
                    <i class="fa-solid fa-file-pdf"></i> Download</a>
            </div>
        </div>`;
    }).join("");
}

// =============================================
// NURSE MODAL
// =============================================
function openActionModal(alertObj) {
    const modal = document.getElementById("nurse-action-modal");
    document.getElementById("modal-alert-id").value = alertObj.id;
    document.getElementById("modal-title").innerText = `Case Action: ${alertObj.patient.name}`;
    document.getElementById("modal-patient-details").innerText = `Age: ${alertObj.patient.age} | Village: ${alertObj.patient.village} | ${alertObj.patient.gestational_weeks} weeks pregnant`;
    document.getElementById("modal-status").value = alertObj.status;
    document.getElementById("modal-notes").value = alertObj.nurse_notes || "";

    // Symptoms list
    const ul = document.getElementById("modal-symptoms-grid");
    const items = [
        ["Bleeding", alertObj.symptoms.bleeding],
        ["Fever", alertObj.symptoms.fever],
        ["Headache", alertObj.symptoms.headache],
        ["Swelling", alertObj.symptoms.swelling],
        ["Abdominal Pain", alertObj.symptoms.abdominal_pain],
        ["Fetal Movement ↓", alertObj.symptoms.reduced_fetal_movement]
    ];
    ul.innerHTML = items.map(([label, active]) => `
        <li>${active
            ? '<i class="fa-solid fa-circle-exclamation text-danger"></i>'
            : '<i class="fa-solid fa-circle-check text-success"></i>'}
            <b>${label}:</b> ${active ? "YES" : "NO"}</li>
    `).join("");

    // Attachment preview
    const attachBlock = document.getElementById("modal-attachment-block");
    const attachContent = document.getElementById("modal-attachment-content");
    if (alertObj.symptoms.attachment_path) {
        const path = alertObj.symptoms.attachment_path;
        const type = alertObj.symptoms.attachment_type;
        const fname = alertObj.symptoms.attachment_filename;

        let html = "";
        if (type === "image") {
            html = `<img src="${path}" class="attachment-img-preview" alt="${fname}">`;
        } else if (type === "audio") {
            html = `<p style="font-size:0.8rem;margin-bottom:6px;">${fname}</p><audio class="attachment-audio-player" controls src="${path}"></audio>`;
        } else {
            html = `<a href="${path}" target="_blank" class="attachment-file-link"><i class="fa-solid fa-external-link"></i> Open ${fname}</a>`;
        }

        attachContent.innerHTML = html;
        attachBlock.style.display = "block";
    } else {
        attachBlock.style.display = "none";
    }

    modal.classList.add("open");
}

function closeModal() {
    document.getElementById("nurse-action-modal").classList.remove("open");
}

async function submitAlertAction(e) {
    e.preventDefault();
    const alertId = document.getElementById("modal-alert-id").value;
    const formData = new FormData();
    formData.append("status", document.getElementById("modal-status").value);
    formData.append("notes", document.getElementById("modal-notes").value);

    try {
        const res = await fetch(`/api/nurse/alerts/${alertId}/action`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });
        if (!res.ok) throw new Error("Could not update alert");
        showToast("Alert updated successfully!");
        closeModal();
        loadNurseAlerts();
        loadNurseStats();
    } catch (err) { showToast(err.message, true); }
}

// Close modal clicking outside
window.onclick = e => {
    const modal = document.getElementById("nurse-action-modal");
    if (e.target === modal) closeModal();
};

// =============================================
// USSD PHONE SIMULATOR
// =============================================
function pressKey(key) {
    if (!ussdActive) return;
    const input = document.getElementById("ussd-key-input");
    if (input) input.value += key;
}

function clearKeypad() {
    const input = document.getElementById("ussd-key-input");
    if (input) input.value = input.value.slice(0, -1);
}

function dialUSSD() {
    if (ussdActive) return;
    ussdActive = true;
    ussdSessionId = "sim_" + Math.random().toString(36).substring(2, 11);
    ussdPath = [];

    document.getElementById("ussd-input-box").style.display = "block";
    document.getElementById("ussd-key-input").value = "";
    document.getElementById("ussd-key-input").focus();
    document.getElementById("ussd-dial-btn").style.display = "none";
    document.getElementById("ussd-cancel-btn").style.display = "inline-block";
    document.getElementById("ussd-send-btn").style.display = "inline-block";
    document.getElementById("ussd-screen-text").innerText = "Connecting...";

    triggerUSSDAPI("");
}

function cancelUSSD() {
    ussdActive = false; ussdSessionId = ""; ussdPath = [];
    document.getElementById("ussd-screen-text").innerHTML = "Connection ended.\n\nDial again:\n<span class='ussd-highlight'>*222#</span>";
    document.getElementById("ussd-input-box").style.display = "none";
    document.getElementById("ussd-dial-btn").style.display = "inline-block";
    document.getElementById("ussd-cancel-btn").style.display = "none";
    document.getElementById("ussd-send-btn").style.display = "none";
}

// =============================================
// PROFILE MODAL & OTP
// =============================================
function openProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (!modal) return;
    const user = currentUser || JSON.parse(localStorage.getItem('maternal_user') || 'null');
    if (!user) return showToast('Not signed in', true);
    document.getElementById('profile-user-id').value = user.id;
    document.getElementById('profile-fullname').value = user.fullname || '';
    document.getElementById('profile-district').value = user.district || '';
    document.getElementById('profile-sector').value = user.sector || '';
    document.getElementById('profile-village').value = user.village || '';
    document.getElementById('profile-cell').value = user.cell || '';
    document.getElementById('profile-age').value = user.age || '';
    document.getElementById('profile-blood').value = user.blood_group || '';
    document.getElementById('profile-emergency').value = user.emergency_contact || '';

    // show OTP button only for patients (patients require OTP to update)
    document.getElementById('btn-generate-otp').style.display = user.role === 'PATIENT' ? 'inline-block' : 'none';
    document.getElementById('otp-section').style.display = 'none';
    modal.style.display = 'flex';
}

function closeProfileModal() {
    document.getElementById('profile-modal').style.display = 'none';
}

async function generateProfileOTP() {
    const user = currentUser || JSON.parse(localStorage.getItem('maternal_user') || 'null');
    if (!user) return showToast('Not signed in', true);
    try {
        const form = new FormData(); form.append('phone', user.phone);
        const res = await fetch('/api/auth/generate_otp', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Could not generate OTP');
        showToast('OTP generated. Check your phone (or response).');
        // Show OTP input for dev (if returned)
        if (data.otp) {
            document.getElementById('otp-section').style.display = 'block';
            document.getElementById('profile-otp').value = data.otp;
        } else {
            document.getElementById('otp-section').style.display = 'block';
        }
    } catch (err) { showToast(err.message, true); }
}

async function submitProfileUpdate(e) {
    e.preventDefault();
    // Always update current signed-in user only (prevent changing other users)
    const user = currentUser || JSON.parse(localStorage.getItem('maternal_user') || 'null');
    if (!user) return showToast('Not signed in', true);
    const id = user.id;
    const form = new FormData();
    form.append('fullname', document.getElementById('profile-fullname').value);
    form.append('district', document.getElementById('profile-district').value);
    form.append('sector', document.getElementById('profile-sector').value);
    form.append('village', document.getElementById('profile-village').value);
    form.append('cell', document.getElementById('profile-cell').value);
    const age = document.getElementById('profile-age').value; if (age) form.append('age', age);
    const blood = document.getElementById('profile-blood').value; if (blood) form.append('blood_group', blood);
    const emer = document.getElementById('profile-emergency').value; if (emer) form.append('emergency_contact', emer);
    const otp = document.getElementById('profile-otp').value; if (otp) form.append('otp', otp);
    try {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`/api/users/${id}/bio`, { method: 'PUT', headers: headers, body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Could not update profile');
        showToast('Profile updated');
        closeProfileModal();
        // refresh local user
        const profileUser = JSON.parse(localStorage.getItem('maternal_user') || 'null') || user;
        profileUser.fullname = document.getElementById('profile-fullname').value;
        profileUser.district = document.getElementById('profile-district').value;
        profileUser.sector = document.getElementById('profile-sector').value;
        profileUser.village = document.getElementById('profile-village').value;
        profileUser.cell = document.getElementById('profile-cell').value;
        profileUser.age = document.getElementById('profile-age').value || profileUser.age;
        profileUser.blood_group = document.getElementById('profile-blood').value || profileUser.blood_group;
        profileUser.emergency_contact = document.getElementById('profile-emergency').value || profileUser.emergency_contact;
        localStorage.setItem('maternal_user', JSON.stringify(profileUser));
        currentUser = profileUser;
        const nameEl = document.getElementById('user-display-name'); if (nameEl) nameEl.innerText = currentUser.fullname || currentUser.username || '';
    } catch (err) { showToast(err.message, true); }
}

// =============================================
// FORGOT / RESET PASSWORD FLOW
// =============================================
function openForgotModal() {
    const m = document.getElementById('forgot-modal'); if (!m) return;
    m.style.display = 'flex';
}
function closeForgotModal() { const m = document.getElementById('forgot-modal'); if (m) m.style.display = 'none'; }

async function requestResetOTP() {
    const id = document.getElementById('forgot-identifier').value.trim();
    if (!id) return showToast('Enter your registered username or phone', true);
    let identifier = id;
    if (isValidPhone(id) || /^\+2507\d{8}$/.test(id) || /^2507\d{8}$/.test(id)) {
        if (!isValidPhone(id)) return showToast('Phone must be +25078xxxxxxx or 078xxxxxxx', true);
        identifier = normalizePhone(id);
    }
    try {
        const form = new FormData(); form.append('identifier', identifier);
        const res = await fetch('/api/auth/forgot_password', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Could not generate reset OTP');
        showToast('OTP sent (check SMS or response)');
        if (data.otp) document.getElementById('forgot-otp').value = data.otp;
    } catch (err) { showToast(err.message, true); }
}

async function submitPasswordReset(e) {
    e.preventDefault();
    const id = document.getElementById('forgot-identifier').value.trim();
    const otp = document.getElementById('forgot-otp').value.trim();
    const pw = document.getElementById('forgot-new').value;
    if (!id || !otp || !pw) return showToast('Identifier, OTP and new password are required', true);
    let identifier = id;
    if (isValidPhone(id) || /^\+2507\d{8}$/.test(id) || /^2507\d{8}$/.test(id)) {
        identifier = normalizePhone(id);
    }
    try {
        const form = new FormData(); form.append('identifier', identifier); form.append('otp', otp); form.append('new_password', pw);
        const res = await fetch('/api/auth/reset_password', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Could not reset password');
        showToast('Password reset. Please login with your new password.');
        closeForgotModal();
    } catch (err) { showToast(err.message, true); }
}

// =============================================
// THEME SWITCHER
// =============================================
function toggleTheme() {
    const current = localStorage.getItem('theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.body.classList.toggle('dark-theme', next === 'dark');
    localStorage.setItem('theme', next);
    const btn = document.getElementById('theme-toggle-btn'); if (btn) btn.innerText = next === 'dark' ? 'Light' : 'Dark';
}

// restore theme and button text
document.addEventListener('DOMContentLoaded', () => {
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') document.body.classList.add('dark-theme');
    const btn = document.getElementById('theme-toggle-btn'); if (btn) btn.innerText = theme === 'dark' ? 'Light' : 'Dark';
});

function sendUSSD() {
    if (!ussdActive) return;
    const choice = document.getElementById("ussd-key-input").value.trim();
    if (!choice) return;
    ussdPath.push(choice);
    document.getElementById("ussd-key-input").value = "";
    document.getElementById("ussd-screen-text").innerText = "Sending...";
    triggerUSSDAPI(ussdPath.join("*"));
}

async function triggerUSSDAPI(textString) {
    const formData = new FormData();
    formData.append("sessionId", ussdSessionId);
    formData.append("phone_number", ussdPhone);
    formData.append("text", textString);

    try {
        const res = await fetch("/api/ussd", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Network error");
        const output = await res.text();

        if (output.startsWith("CON ")) {
            document.getElementById("ussd-screen-text").innerText = output.substring(4);
            document.getElementById("ussd-key-input").focus();
        } else if (output.startsWith("END ")) {
            document.getElementById("ussd-screen-text").innerText = output.substring(4);
            document.getElementById("ussd-input-box").style.display = "none";
            document.getElementById("ussd-cancel-btn").style.display = "none";
            document.getElementById("ussd-send-btn").style.display = "none";
            ussdActive = false;

            setTimeout(cancelUSSD, 7000);

            if (currentUser && currentUser.role !== "PATIENT") {
                showToast("USSD report submitted – refreshing alerts...");
                setTimeout(() => { loadNurseAlerts(); loadNurseStats(); }, 1000);
            }
        } else {
            document.getElementById("ussd-screen-text").innerText = output;
        }
    } catch {
        document.getElementById("ussd-screen-text").innerText = "Connection lost.\nTry again.";
        setTimeout(cancelUSSD, 3000);
    }
}
