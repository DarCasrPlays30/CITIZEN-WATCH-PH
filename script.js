// --- DATABASE SETUP ---
// We use a specific key to store our array of reports in the browser's memory
const DB_KEY = 'cwph_database';

// Initialize the database with some realistic mock data if it's empty
function initDB() {
    if (!localStorage.getItem(DB_KEY)) {
        const initialData = [
            { id: "CWPH-2026-8X9Y", date: "Mar 27, 2026", location: "Brgy. Tagburos Hall", type: "Deceased Beneficiary Claim", status: "new", isDeceased: true },
            { id: "CWPH-2026-3A4B", date: "Mar 25, 2026", location: "City Engineering Office", type: "Procurement Fraud", status: "investigating", isDeceased: false },
            { id: "CWPH-2026-1C2D", date: "Mar 18, 2026", location: "Traffic Management Unit", type: "Bribery / Extortion", status: "resolved", isDeceased: false }
        ];
        localStorage.setItem(DB_KEY, JSON.stringify(initialData));
    }
}
// Run initialization immediately
initDB();

// --- 1. UNIQUE ID GENERATOR ---
function generateUniqueId() {
    const year = new Date().getFullYear();
    // Generate a random 4-character alphanumeric string
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CWPH-${year}-${randomChars}`;
}

// --- 2. REPORT SUBMISSION (report.html) ---
function submitReport(event) {
    event.preventDefault();

    const caseId = generateUniqueId();
    const typeSelect = document.getElementById('incidentType');
    const incidentTypeValue = typeSelect.value;
    const incidentTypeText = typeSelect.options[typeSelect.selectedIndex].text;
    const locationValue = document.getElementById('location').value;
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Create the new report object
    const newReport = {
        id: caseId,
        type: incidentTypeText,
        location: locationValue,
        date: today,
        status: "new",
        isDeceased: (incidentTypeValue === 'deceased') // Automatically flag if deceased option chosen
    };

    // Get existing reports, add the new one to the top, and save back to memory
    const reports = JSON.parse(localStorage.getItem(DB_KEY));
    reports.unshift(newReport); 
    localStorage.setItem(DB_KEY, JSON.stringify(reports));

    // Update UI
    document.getElementById('reportForm').classList.add('hidden');
    document.getElementById('generatedCaseId').innerText = caseId;
    document.getElementById('successMessage').classList.remove('hidden');
}

// --- 3. ADMIN DASHBOARD LOGIC (admin.html) ---
function loadAdminDashboard() {
    const tableBody = document.getElementById('adminTableBody');
    if (!tableBody) return; // Stop if we aren't on the admin page

    const reports = JSON.parse(localStorage.getItem(DB_KEY));
    tableBody.innerHTML = ''; // Clear table

    // Loop through the database and create a row for each report
    reports.forEach(report => {
        const tr = document.createElement('tr');
        
        // Handle the LCR Deceased Flag visual
        let typeHtml = `<strong style="color: #0f172a;">${report.type}</strong>`;
        if (report.isDeceased) {
            tr.style.backgroundColor = "#fff1f2"; // Light red background
            typeHtml += `
                <div style="margin-top: 6px;">
                    <span style="display: inline-block; font-size: 0.7rem; font-weight: 600; background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 4px; border: 1px solid #f87171;">
                        ⚠️ LCR Flag: Citizen marked deceased
                    </span>
                </div>`;
        }

        // Handle Status Badges and Action Buttons dynamically
        let statusHtml = '';
        let buttonHtml = '';

        if (report.status === 'new') {
            statusHtml = `<span class="status-pill status-new" style="background-color: #fee2e2; color: #991b1b;">Awaiting Triage</span>`;
            buttonHtml = `<button class="btn-action" onclick="changeStatus('${report.id}', 'investigating')" style="background: #ef4444; color: white;">Start Investigation</button>`;
        } else if (report.status === 'investigating') {
            statusHtml = `<span class="status-pill status-progress" style="background-color: #fef3c7; color: #92400e;">Under Investigation</span>`;
            buttonHtml = `<button class="btn-action" onclick="changeStatus('${report.id}', 'resolved')" style="border-color: #2563eb; color: #2563eb;">Mark Resolved</button>`;
        } else if (report.status === 'resolved') {
            statusHtml = `<span class="status-pill status-resolved" style="background-color: #d1fae5; color: #065f46;">Case Closed</span>`;
            buttonHtml = `<button class="btn-action" disabled style="opacity: 0.5; cursor: not-allowed;">Archived</button>`;
        }

        tr.innerHTML = `
            <td><strong>${report.id}</strong></td>
            <td>${report.date}</td>
            <td>${report.location}</td>
            <td>${typeHtml}</td>
            <td>${statusHtml}</td>
            <td>${buttonHtml}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// Function triggered when an admin clicks an action button
function changeStatus(id, newStatus) {
    const reports = JSON.parse(localStorage.getItem(DB_KEY));
    // Find the specific report and update its status
    const reportIndex = reports.findIndex(r => r.id === id);
    if (reportIndex > -1) {
        reports[reportIndex].status = newStatus;
        localStorage.setItem(DB_KEY, JSON.stringify(reports));
        loadAdminDashboard(); // Refresh the table instantly
    }
}

// --- 4. CITIZEN TRACKING LOGIC (track.html) ---
function trackCase() {
    const inputId = document.getElementById('trackingId').value.trim().toUpperCase();
    const resultDiv = document.getElementById('trackingResult');
    const badge = document.getElementById('statusBadge');
    const description = document.getElementById('statusDescription');
    
    if (inputId === "") {
        alert("Please enter a valid Tracking ID.");
        return;
    }

    const reports = JSON.parse(localStorage.getItem(DB_KEY));
    const foundReport = reports.find(r => r.id === inputId);

    resultDiv.classList.remove('hidden');

    if (foundReport) {
        // Display the actual status from the database
        if (foundReport.status === 'new') {
            badge.innerText = "Received / Awaiting Triage";
            badge.style.backgroundColor = "#fee2e2"; badge.style.color = "#991b1b";
            description.innerText = "Your report has been securely logged and is awaiting assignment to a compliance officer.";
        } else if (foundReport.status === 'investigating') {
            badge.innerText = "Under Investigation";
            badge.style.backgroundColor = "#fef3c7"; badge.style.color = "#92400e";
            description.innerText = "The LGU is currently verifying the details and investigating the incident at " + foundReport.location + ".";
        } else if (foundReport.status === 'resolved') {
            badge.innerText = "Resolved / Case Closed";
            badge.style.backgroundColor = "#d1fae5"; badge.style.color = "#065f46";
            description.innerText = "This case has been successfully investigated and resolved by the appropriate agency.";
        }
    } else {
        // If ID doesn't exist in memory
        badge.innerText = "Record Not Found";
        badge.style.backgroundColor = "#e2e8f0"; badge.style.color = "#475569";
        description.innerText = "We could not find a report matching that ID. Please ensure you typed it correctly.";
    }
}

// --- 5. SIDEBAR NAVIGATION LOGIC (admin.html) ---
function switchView(targetViewId, clickedLink) {
    // 1. Hide all sections
    const allViews = document.querySelectorAll('.view-section');
    allViews.forEach(view => {
        view.style.display = 'none';
    });

    // 2. Remove the 'active' highlight from all sidebar links
    const allLinks = document.querySelectorAll('.nav-item');
    allLinks.forEach(link => {
        link.classList.remove('active');
    });

    // 3. Show the specific section the user clicked
    document.getElementById(targetViewId).style.display = 'block';

    // 4. Highlight the link they just clicked
    clickedLink.classList.add('active');
}
// Ensure the admin dashboard loads when the page opens
document.addEventListener('DOMContentLoaded', loadAdminDashboard);