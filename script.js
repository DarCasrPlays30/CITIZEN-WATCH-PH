// --- DATABASE SETUP ---
const DB_KEY = 'cwph_database';

function initDB() {
    if (!localStorage.getItem(DB_KEY)) {
        localStorage.setItem(DB_KEY, JSON.stringify([])); 
    }
}
initDB();

// --- 1. UNIQUE ID GENERATOR ---
function generateUniqueId() {
    const year = new Date().getFullYear();
    return `CWPH-${year}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

// --- 2. REPORT SUBMISSION (report.html) ---
function submitReport(event) {
    event.preventDefault();
    const caseId = generateUniqueId();
    const typeSelect = document.getElementById('incidentType');
    
    const newReport = {
        id: caseId,
        type: typeSelect.options[typeSelect.selectedIndex].text,
        location: document.getElementById('location').value,
        description: document.getElementById('description') ? document.getElementById('description').value : "",
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: "new",
        isDeceased: (typeSelect.value === 'deceased' || typeSelect.options[typeSelect.selectedIndex].text.includes("Ghost"))
    };

    const reports = JSON.parse(localStorage.getItem(DB_KEY));
    reports.unshift(newReport); 
    localStorage.setItem(DB_KEY, JSON.stringify(reports));

    document.getElementById('reportForm').classList.add('hidden');
    document.getElementById('generatedCaseId').innerText = caseId;
    document.getElementById('successMessage').classList.remove('hidden');
}

// --- 3. CITIZEN TRACKING (track.html) ---
function trackCase() {
    const inputId = document.getElementById('trackingId').value.trim().toUpperCase();
    if (inputId === "") return alert("Please enter a Tracking ID.");
    
    const foundReport = JSON.parse(localStorage.getItem(DB_KEY) || "[]").find(r => r.id === inputId);
    const resultDiv = document.getElementById('trackingResult'), badge = document.getElementById('statusBadge'), description = document.getElementById('statusDescription');
    resultDiv.classList.remove('hidden');

    if (foundReport) {
        if (foundReport.status === 'new') { badge.innerText = "Received / Awaiting Triage"; badge.style.backgroundColor = "#fee2e2"; badge.style.color = "#991b1b"; description.innerText = "Your report has been logged."; } 
        else if (foundReport.status === 'investigating') { badge.innerText = "Under Investigation"; badge.style.backgroundColor = "#fef3c7"; badge.style.color = "#92400e"; description.innerText = "The LGU is verifying details."; } 
        else if (foundReport.status === 'resolved') { badge.innerText = "Resolved / Case Closed"; badge.style.backgroundColor = "#d1fae5"; badge.style.color = "#065f46"; description.innerText = "Case resolved by agency."; }
    } else {
        badge.innerText = "Not Found"; badge.style.backgroundColor = "#e2e8f0"; badge.style.color = "#475569"; description.innerText = "No report matches that ID.";
    }
}

// --- 4. ADMIN LOGIN ---
function attemptLogin() {
    const user = document.getElementById('adminUser').value;
    const pass = document.getElementById('adminPass').value;
    if (user === 'admin' && pass === 'admin123') {
        sessionStorage.setItem('cwph_admin_session', 'active');
        window.location.reload();
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
}
function adminLogout() {
    sessionStorage.removeItem('cwph_admin_session');
    window.location.reload();
}
function verifySession() {
    const loginScreen = document.getElementById('adminLoginScreen'), dashboardLayout = document.getElementById('adminDashboardLayout');
    if (loginScreen && dashboardLayout) {
        if (sessionStorage.getItem('cwph_admin_session') === 'active') {
            loginScreen.classList.add('hidden');
            dashboardLayout.classList.remove('hidden');
            loadAdminDashboard();
        } else {
            loginScreen.classList.remove('hidden');
            dashboardLayout.classList.add('hidden');
        }
    }
}

// --- 5. ADMIN DASHBOARD & CHARTS ---
function loadAdminDashboard() {
    const tableBody = document.getElementById('adminTableBody');
    if (!tableBody) return; 

    const reports = JSON.parse(localStorage.getItem(DB_KEY));
    tableBody.innerHTML = ''; 
    let active = 0, pending = 0, critical = 0, resolved = 0;

    reports.forEach(report => {
        if (report.status !== 'resolved') active++;
        if (report.status === 'new') pending++;
        if (report.isDeceased || report.type.includes("Procurement")) critical++;
        if (report.status === 'resolved') resolved++;

        let statusHtml = report.status === 'new' ? `<span style="background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem;">New</span>` : report.status === 'investigating' ? `<span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem;">Investigating</span>` : `<span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem;">Resolved</span>`;
        let btnHtml = report.status === 'new' ? `<button onclick="changeStatus('${report.id}', 'investigating', event)" style="background: #f97316; color: white; border: none; padding: 6px; border-radius: 4px; cursor: pointer;">Review</button>` : report.status === 'investigating' ? `<button onclick="changeStatus('${report.id}', 'resolved', event)" style="background: white; border: 1px solid #10b981; color: #10b981; padding: 6px; border-radius: 4px; cursor: pointer;">Resolve</button>` : `<button disabled style="opacity: 0.5;">Archived</button>`;

        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = () => openModal(report.id);
        tr.innerHTML = `<td><strong>${report.id}</strong></td><td>${report.date}</td><td>${report.location}</td><td>${report.type}</td><td>${statusHtml}</td><td>${btnHtml}</td>`;
        tableBody.appendChild(tr);
    });

    document.getElementById('kpi-active').innerText = active;
    document.getElementById('kpi-pending').innerText = pending;
    document.getElementById('kpi-critical').innerText = critical;
    document.getElementById('kpi-resolution').innerText = (reports.length > 0 ? Math.round((resolved / reports.length) * 100) : 0) + '%';
    updateChart(reports);
}

function changeStatus(id, newStatus, event) {
    event.stopPropagation(); 
    const reports = JSON.parse(localStorage.getItem(DB_KEY));
    const idx = reports.findIndex(r => r.id === id);
    if (idx > -1) {
        reports[idx].status = newStatus;
        localStorage.setItem(DB_KEY, JSON.stringify(reports));
        loadAdminDashboard();
        if(!document.getElementById('reportsView').classList.contains('hidden')) loadDatabaseView();
    }
}

let analyticsChart = null;
function updateChart(reports) {
    const ctx = document.getElementById('anomalyChart');
    if(!ctx) return;
    const counts = {}; reports.forEach(r => counts[r.type] = (counts[r.type] || 0) + 1);
    if (analyticsChart) analyticsChart.destroy();
    if (reports.length === 0) return;
    analyticsChart = new Chart(ctx, { type: 'doughnut', data: { labels: Object.keys(counts), datasets: [{ data: Object.values(counts), backgroundColor: ['#3b82f6', '#ef4444', '#f97316', '#10b981', '#6366f1'] }] }});
}

function openModal(id) {
    const r = JSON.parse(localStorage.getItem(DB_KEY)).find(r => r.id === id);
    if(r) { document.getElementById('modal-id').innerText = r.id; document.getElementById('modal-type').innerText = r.type; document.getElementById('modal-location').innerText = r.location; document.getElementById('modal-date').innerText = r.date; document.getElementById('modal-description').innerText = r.description; document.getElementById('caseModal').style.display = 'flex'; }
}
function closeModal() { document.getElementById('caseModal').style.display = 'none'; }
function switchView(target, link) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.sidebar-nav a.nav-item').forEach(l => l.classList.remove('active'));
    document.getElementById(target).classList.remove('hidden'); link.classList.add('active');
    if (target === 'reportsView') loadDatabaseView();
}

// --- 6. FULL DATABASE EXPORT ---
function loadDatabaseView() {
    const reports = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
    const body = document.getElementById('databaseTableBody');
    body.innerHTML = '';
    reports.forEach(r => {
        let st = r.status === 'new' ? 'New' : r.status === 'investigating' ? 'Under Investigation' : 'Resolved';
        body.innerHTML += `<tr><td>${r.id}</td><td>${r.date}</td><td>${r.type}</td><td>${r.location}</td><td>${st}</td></tr>`;
    });
}
function filterDatabase() {
    const search = document.getElementById('dbSearch').value.toUpperCase(), status = document.getElementById('dbStatusFilter').value;
    const filtered = JSON.parse(localStorage.getItem(DB_KEY) || "[]").filter(r => r.id.includes(search) && (status === 'all' || r.status === status));
    const body = document.getElementById('databaseTableBody'); body.innerHTML = '';
    filtered.forEach(r => body.innerHTML += `<tr><td>${r.id}</td><td>${r.date}</td><td>${r.type}</td><td>${r.location}</td><td>${r.status}</td></tr>`);
}
function exportToCSV() {
    const reports = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
    if (reports.length === 0) return alert("No data.");
    let csv = "data:text/csv;charset=utf-8,ID,Date,Type,Location,Status,Description\n";
    reports.forEach(r => csv += `"${r.id}","${r.date}","${r.type}","${r.location}","${r.status}","${r.description.replace(/"/g, '""')}"\n`);
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csv)); link.setAttribute("download", `DataExport.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

// --- 7. HOME PAGE LIVE STATS (BULLETPROOF) ---
function loadHomeStats() {
    if (!document.getElementById('stat-total')) return; 
    const reports = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
    let total = reports.length, resolved = 0, flagged = 0;
    reports.forEach(r => { if (r.status === 'resolved') resolved++; if (r.isDeceased || r.type.includes("Procurement") || r.type.includes("Ghost")) flagged++; });
    
    document.getElementById('stat-total').setAttribute('data-target', total);
    document.getElementById('stat-resolved').setAttribute('data-target', resolved);
    document.getElementById('stat-flagged').setAttribute('data-target', flagged);
    document.getElementById('stat-rate').setAttribute('data-target', total > 0 ? Math.round((resolved / total) * 100) : 0);

    const counters = document.querySelectorAll('.stat-number');
    counters.forEach(counter => {
        const target = +counter.getAttribute('data-target');
        if (target === 0) { counter.innerText = "0"; return; }
        let currentCount = 0; const increment = Math.max(1, Math.ceil(target / 30)); 
        const updateCount = () => {
            currentCount += increment;
            if (currentCount < target) { counter.innerText = currentCount; setTimeout(updateCount, 40); } 
            else { counter.innerText = target; }
        }; updateCount();
    });
}

// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', () => {
    verifySession(); 
    loadHomeStats(); 
});