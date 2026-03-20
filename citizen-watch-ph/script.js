/**
 * Handles the form submission on the Report page.
 * Prevents the page from reloading, generates a mock ID, and shows the success message.
 */
function submitReport(event) {
    // 1. Prevent form from submitting to a non-existent server
    event.preventDefault();

    // 2. Hide the form
    document.getElementById('reportForm').classList.add('hidden');

    // 3. Generate a random alphanumeric Case ID (e.g., CWPH-A8X3K)
    const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
    const caseId = `CWPH-${randomChars}`;

    // 4. Inject the Case ID into the DOM
    document.getElementById('generatedCaseId').innerText = caseId;

    // 5. Show the success confirmation message
    document.getElementById('successMessage').classList.remove('hidden');
    
    // Optional: Save to local storage to make the prototype feel real during a pitch
    localStorage.setItem('recentCaseId', caseId);
}

/**
 * Handles the tracking logic on the Track Case page.
 * Simulates looking up a case ID in a database.
 */
function trackCase() {
    const inputId = document.getElementById('trackingId').value.trim();
    const resultDiv = document.getElementById('trackingResult');
    const badge = document.getElementById('statusBadge');
    const description = document.getElementById('statusDescription');

    // Basic validation
    if (inputId === "") {
        alert("Please enter a valid Case ID.");
        return;
    }

    // Reveal the tracking result box
    resultDiv.classList.remove('hidden');

    // Simulate different statuses based on user input for presentation flexibility
    if (inputId === "TEST-DONE") {
        badge.innerText = "Resolved";
        badge.style.background = "var(--success)";
        description.innerText = "This case has been investigated and resolved by the designated agency.";
    } else {
        // Default "Under Review" state for all realistic queries
        badge.innerText = "Under Review";
        badge.style.background = "var(--warning)";
        description.innerText = "Your report has been received and is currently being reviewed by our verification team.";
    }
}

// Auto-fill the tracking input if a user just submitted a report (Prototype Magic)
document.addEventListener('DOMContentLoaded', () => {
    const trackingInput = document.getElementById('trackingId');
    const recentId = localStorage.getItem('recentCaseId');
    
    // If we are on the tracking page and there's an ID in memory, fill it in
    if (trackingInput && recentId) {
        trackingInput.value = recentId;
        // Clear it so it only happens once
        localStorage.removeItem('recentCaseId'); 
    }
});