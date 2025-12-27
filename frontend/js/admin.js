const API_BASE_URL = 'http://localhost:3000/api';

let currentUser = null;
let currentEventId = null;
let allStudents = [];
let selectedWinners = [];

// Check authentication on page load
window.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDashboard();
    loadEvents();
    loadStudentsForCoins();
    
    // Attach form submit handler
    const createEventForm = document.getElementById('createEventForm');
    if (createEventForm) {
        createEventForm.addEventListener('submit', createEvent);
    }
});

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    if (!token || !user || user.role !== 'admin') {
        window.location.href = '/';
        return;
    }

    currentUser = user;
    document.getElementById('adminName').textContent = user.name;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
}

// Dashboard Stats
async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('totalStudents').textContent = data.stats.totalStudents;
            document.getElementById('totalEvents').textContent = data.stats.totalEvents;
            document.getElementById('upcomingEvents').textContent = data.stats.upcomingEvents;
            document.getElementById('coinsDistributed').textContent = data.stats.totalCoinsDistributed;
        }
    } catch (error) {
        console.error('Load dashboard error:', error);
    }
}

// Events
async function loadEvents() {
    try {
        const response = await fetch(`${API_BASE_URL}/events`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            displayEvents(data.events);
        }
    } catch (error) {
        console.error('Load events error:', error);
    }
}

function displayEvents(events) {
    const container = document.getElementById('eventsList');
    
    if (events.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No events found. Create your first event!</p></div>';
        return;
    }

    container.innerHTML = events.map(event => {
        const date = new Date(event.date).toLocaleString();
        const isPast = new Date(event.date) < new Date();
        const isFull = event.currentRegistrations >= event.maxParticipants;
        
        return `
            <div class="event-card">
                <h3>${event.name}</h3>
                <p>${event.description}</p>
                <div class="event-meta">
                    <span>📅 ${date}</span>
                    <span>📍 ${event.location}</span>
                </div>
                <div class="event-meta">
                    <span>👥 ${event.currentRegistrations}/${event.maxParticipants}</span>
                    <span>🏆 ${event.coinsAllocated} coins</span>
                    <span>🥇 ${event.numberOfWinners} winner(s)</span>
                </div>
                <div class="event-footer">
                    <span class="badge ${event.status === 'completed' ? 'badge-success' : isPast ? 'badge-warning' : 'badge-primary'}">
                        ${event.status === 'completed' ? 'Completed' : isPast ? 'Past' : 'Upcoming'}
                    </span>
                    <div>
                        <button class="btn btn-primary btn-small" onclick="viewRegistrations('${event._id}', '${event.name}')">
                            View Registrations
                        </button>
                        ${event.status !== 'completed' && event.currentRegistrations > 0 ? `
                            <button class="btn btn-success btn-small" onclick="openWinnersModal('${event._id}', '${event.name}', ${event.numberOfWinners})">
                                Declare Winners
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Create Event
function openCreateEventModal() {
    document.getElementById('createEventModal').classList.add('active');
}

function closeCreateEventModal() {
    document.getElementById('createEventModal').classList.remove('active');
    document.getElementById('createEventForm').reset();
}

async function createEvent(e) {
    if (e) e.preventDefault();
    console.log('Create event function called');

    // Get form elements
    const nameEl = document.getElementById('eventName');
    const descEl = document.getElementById('eventDescription');
    const dateEl = document.getElementById('eventDate');
    const locationEl = document.getElementById('eventLocation');
    const maxParticipantsEl = document.getElementById('eventMaxParticipants');
    const coinsEl = document.getElementById('eventCoins');
    const winnersEl = document.getElementById('eventWinners');

    // Validate form elements exist
    if (!nameEl || !descEl || !dateEl || !locationEl || !maxParticipantsEl || !coinsEl || !winnersEl) {
        alert('Error: Form elements not found. Please refresh the page.');
        console.error('Missing form elements');
        return;
    }

    // Get and validate values
    const name = nameEl.value.trim();
    const description = descEl.value.trim();
    const date = dateEl.value;
    const location = locationEl.value.trim();
    const maxParticipants = parseInt(maxParticipantsEl.value);
    const coinsAllocated = parseInt(coinsEl.value);
    const numberOfWinners = parseInt(winnersEl.value);

    console.log('Form data:', { name, description, date, location, maxParticipants, coinsAllocated, numberOfWinners });

    // Validate all fields
    if (!name || !description || !date || !location) {
        alert('Please fill in all text fields (Name, Description, Date, Location)');
        return;
    }

    if (isNaN(maxParticipants) || maxParticipants < 1) {
        alert('Max Participants must be a number greater than 0');
        maxParticipantsEl.focus();
        return;
    }

    if (isNaN(coinsAllocated) || coinsAllocated < 0) {
        alert('Coins Allocated must be a number (0 or greater)');
        coinsEl.focus();
        return;
    }

    if (isNaN(numberOfWinners) || numberOfWinners < 1) {
        alert('Number of Winners must be a number greater than 0');
        winnersEl.focus();
        return;
    }

    const eventData = {
        name,
        description,
        date,
        location,
        maxParticipants,
        coinsAllocated,
        numberOfWinners
    };

    // Disable submit button to prevent double submission
    const submitBtn = document.querySelector('#createEventForm button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';
    }

    try {
        console.log('Sending request to:', `${API_BASE_URL}/events`);
        const headers = getAuthHeaders();
        console.log('Headers:', headers);
        
        const response = await fetch(`${API_BASE_URL}/events`, {
            method: 'POST',
            headers: {
                ...headers,
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(eventData)
        });

        console.log('Response status:', response.status, response.statusText);
        
        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            const text = await response.text();
            console.error('Failed to parse JSON response:', text);
            alert('Server returned an invalid response. Please try again.');
            return;
        }
        
        console.log('Response data:', data);

        if (response.ok) {
            alert('Event created successfully!');
            closeCreateEventModal();
            loadEvents();
            loadDashboard();
        } else {
            alert(data.error || 'Failed to create event');
            console.error('Create event error:', data);
        }
    } catch (error) {
        alert('Network error. Please try again. Check console for details.');
        console.error('Create event error:', error);
    } finally {
        // Re-enable submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    }
}

// View Registrations
async function viewRegistrations(eventId, eventName) {
    currentEventId = eventId;
    document.getElementById('registrationsModalTitle').textContent = `Registrations - ${eventName}`;
    document.getElementById('registrationsModal').classList.add('active');

    try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}/registrations`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            displayRegistrations(data.registrations);
        }
    } catch (error) {
        console.error('Load registrations error:', error);
    }
}

function displayRegistrations(registrations) {
    const container = document.getElementById('registrationsList');
    
    if (registrations.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No registrations yet.</p></div>';
        return;
    }

    container.innerHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Student ID</th>
                        <th>Email</th>
                        <th>Coins</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${registrations.map(reg => `
                        <tr>
                            <td>${reg.student.name}</td>
                            <td>${reg.student.studentId || 'N/A'}</td>
                            <td>${reg.student.email}</td>
                            <td>${reg.student.coins}</td>
                            <td><span class="badge ${reg.status === 'winner' ? 'badge-success' : 'badge-primary'}">${reg.status}</span></td>
                            <td>
                                <button class="btn btn-danger btn-small" onclick="removeStudent('${reg.student._id}')">
                                    Remove
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function closeRegistrationsModal() {
    document.getElementById('registrationsModal').classList.remove('active');
}

async function removeStudent(studentId) {
    if (!confirm('Are you sure you want to remove this student from the event?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/events/${currentEventId}/registrations/${studentId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            alert('Student removed successfully');
            viewRegistrations(currentEventId, 'Event');
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to remove student');
        }
    } catch (error) {
        alert('Network error. Please try again.');
        console.error('Remove student error:', error);
    }
}

// Declare Winners
async function openWinnersModal(eventId, eventName, maxWinners) {
    currentEventId = eventId;
    selectedWinners = [];
    document.getElementById('winnersModal').classList.add('active');

    try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}/registrations`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            displayWinnersSelection(data.registrations, maxWinners);
        }
    } catch (error) {
        console.error('Load registrations error:', error);
    }
}

function displayWinnersSelection(registrations, maxWinners) {
    const container = document.getElementById('winnersList');
    
    container.innerHTML = `
        <p>Select up to <strong>${maxWinners}</strong> winner(s):</p>
        <div class="table-container mt-20">
            <table>
                <thead>
                    <tr>
                        <th>Select</th>
                        <th>Name</th>
                        <th>Student ID</th>
                        <th>Email</th>
                        <th>Current Coins</th>
                    </tr>
                </thead>
                <tbody>
                    ${registrations.map(reg => `
                        <tr>
                            <td>
                                <input type="checkbox" value="${reg.student._id}" 
                                    onchange="toggleWinner('${reg.student._id}', this.checked, ${maxWinners})">
                            </td>
                            <td>${reg.student.name}</td>
                            <td>${reg.student.studentId || 'N/A'}</td>
                            <td>${reg.student.email}</td>
                            <td>${reg.student.coins}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function toggleWinner(studentId, isChecked, maxWinners) {
    if (isChecked) {
        if (selectedWinners.length >= maxWinners) {
            alert(`You can only select ${maxWinners} winner(s)`);
            event.target.checked = false;
            return;
        }
        selectedWinners.push(studentId);
    } else {
        selectedWinners = selectedWinners.filter(id => id !== studentId);
    }
}

function closeWinnersModal() {
    document.getElementById('winnersModal').classList.remove('active');
    selectedWinners = [];
}

async function declareWinners() {
    if (selectedWinners.length === 0) {
        alert('Please select at least one winner');
        return;
    }

    if (!confirm(`Declare ${selectedWinners.length} winner(s) and allocate coins?`)) return;

    try {
        const response = await fetch(`${API_BASE_URL}/events/${currentEventId}/winners`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ winnerIds: selectedWinners })
        });

        if (response.ok) {
            alert('Winners declared and coins allocated successfully!');
            closeWinnersModal();
            loadEvents();
            loadDashboard();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to declare winners');
        }
    } catch (error) {
        alert('Network error. Please try again.');
        console.error('Declare winners error:', error);
    }
}

// Students Search
async function searchStudents() {
    const search = document.getElementById('studentSearch').value;
    const minEvents = document.getElementById('minEvents').value;
    const maxEvents = document.getElementById('maxEvents').value;
    const minCoins = document.getElementById('minCoins').value;
    const maxCoins = document.getElementById('maxCoins').value;

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (minEvents) params.append('minEvents', minEvents);
    if (maxEvents) params.append('maxEvents', maxEvents);
    if (minCoins) params.append('minCoins', minCoins);
    if (maxCoins) params.append('maxCoins', maxCoins);

    try {
        const response = await fetch(`${API_BASE_URL}/admin/students/search?${params}`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            displayStudents(data.students);
        }
    } catch (error) {
        console.error('Search students error:', error);
    }
}

function displayStudents(students) {
    const container = document.getElementById('studentsList');
    
    if (students.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No students found.</p></div>';
        return;
    }

    container.innerHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Student ID</th>
                        <th>Email</th>
                        <th>Events Participated</th>
                        <th>Total Coins</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${students.map(student => `
                        <tr>
                            <td>${student.name}</td>
                            <td>${student.studentId || 'N/A'}</td>
                            <td>${student.email}</td>
                            <td>${student.eventsParticipated || 0}</td>
                            <td>${student.coins || 0}</td>
                            <td>
                                <button class="btn btn-primary btn-small" onclick="viewStudentDetails('${student._id}')">
                                    View Details
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function viewStudentDetails(studentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/students/${studentId}`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            alert(`Student Details:\n\nName: ${data.student.name}\nStudent ID: ${data.student.studentId || 'N/A'}\nEmail: ${data.student.email}\nEvents Participated: ${data.student.eventsParticipated}\nTotal Coins: ${data.student.coins}\n\nRegistrations: ${data.registrations.length}\nCoin History Entries: ${data.coinHistory.length}`);
        }
    } catch (error) {
        console.error('View student details error:', error);
    }
}

// Coin Management
async function loadStudentsForCoins() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/students`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            allStudents = data.students;
            const select = document.getElementById('coinStudentSelect');
            select.innerHTML = '<option value="">Select Student</option>' + 
                data.students.map(s => `<option value="${s._id}">${s.name} (${s.studentId || s.email}) - ${s.coins} coins</option>`).join('');
        }
    } catch (error) {
        console.error('Load students error:', error);
    }
}

async function manageCoins(e) {
    e.preventDefault();

    const studentId = document.getElementById('coinStudentSelect').value;
    const amount = parseInt(document.getElementById('coinAmount').value);
    const type = document.getElementById('coinType').value;
    const reason = document.getElementById('coinReason').value;

    try {
        const response = await fetch(`${API_BASE_URL}/coins/manage`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ studentId, amount, type, reason })
        });

        if (response.ok) {
            alert('Coins updated successfully!');
            document.getElementById('coinManagementForm').reset();
            loadStudentsForCoins();
            loadDashboard();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to update coins');
        }
    } catch (error) {
        alert('Network error. Please try again.');
        console.error('Manage coins error:', error);
    }
}

// Tabs
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    
    if (tabName === 'events') {
        document.getElementById('eventsTab').classList.remove('hidden');
        loadEvents();
    } else if (tabName === 'students') {
        document.getElementById('studentsTab').classList.remove('hidden');
        searchStudents();
    } else if (tabName === 'coins') {
        document.getElementById('coinsTab').classList.remove('hidden');
        loadStudentsForCoins();
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.classList.remove('active');
        }
    });
};

// Make functions globally accessible for inline onclick handlers
window.openCreateEventModal = openCreateEventModal;
window.closeCreateEventModal = closeCreateEventModal;
window.viewRegistrations = viewRegistrations;
window.removeStudent = removeStudent;
window.openWinnersModal = openWinnersModal;
window.declareWinners = declareWinners;
window.searchStudents = searchStudents;
window.viewStudentDetails = viewStudentDetails;
window.manageCoins = manageCoins;
window.showTab = showTab;
window.logout = logout;

