const API_BASE_URL = 'http://localhost:3000/api';

let currentUser = null;

// Check authentication on page load
window.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadProfile();
    loadUpcomingEvents();
    loadNotifications();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    if (!token || !user || user.role !== 'student') {
        window.location.href = '/';
        return;
    }

    currentUser = user;
    document.getElementById('studentName').textContent = user.name;
    updateCoinBadge(user.coins || 0);
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

function updateCoinBadge(coins) {
    document.getElementById('coinBadge').textContent = `💰 ${coins} Coins`;
    document.getElementById('totalCoins').textContent = coins;
}

// Load Profile
async function loadProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/students/profile`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            displayProfile(data);
        }
    } catch (error) {
        console.error('Load profile error:', error);
    }
}

function displayProfile(data) {
    updateCoinBadge(data.student.coins || 0);
    document.getElementById('eventsParticipated').textContent = data.student.eventsParticipated || 0;
    document.getElementById('totalRegistrations').textContent = data.registrations.length;

    // Profile info
    const profileInfo = document.getElementById('profileInfo');
    profileInfo.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Name</label>
                <input type="text" value="${data.student.name}" disabled style="background: var(--light-bg);">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" value="${data.student.email}" disabled style="background: var(--light-bg);">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Student ID</label>
                <input type="text" value="${data.student.studentId || 'N/A'}" disabled style="background: var(--light-bg);">
            </div>
            <div class="form-group">
                <label>Total Coins</label>
                <input type="text" value="${data.student.coins || 0}" disabled style="background: var(--light-bg);">
            </div>
        </div>
        <div class="form-group">
            <label>Events Participated</label>
            <input type="text" value="${data.student.eventsParticipated || 0}" disabled style="background: var(--light-bg);">
        </div>
    `;
}

// Load Upcoming Events
async function loadUpcomingEvents() {
    try {
        const response = await fetch(`${API_BASE_URL}/events/upcoming`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            displayEvents(data.events);
            updateUpcomingEventsCount(data.events);
        }
    } catch (error) {
        console.error('Load events error:', error);
    }
}

function displayEvents(events) {
    const container = document.getElementById('eventsList');
    
    if (events.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No upcoming events at the moment.</p></div>';
        return;
    }

    container.innerHTML = events.map(event => {
        const date = new Date(event.date).toLocaleString();
        const isFull = event.currentRegistrations >= event.maxParticipants;
        const isRegistered = event.isRegistered;
        
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
                    <span class="badge ${isFull ? 'badge-danger' : 'badge-primary'}">
                        ${isFull ? 'Full' : 'Available'}
                    </span>
                    ${isRegistered ? `
                        <button class="btn btn-danger btn-small" onclick="unregisterEvent('${event._id}')">
                            Unregister
                        </button>
                    ` : `
                        <button class="btn btn-success btn-small" 
                                onclick="registerEvent('${event._id}')" 
                                ${isFull ? 'disabled' : ''}>
                            Register
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function updateUpcomingEventsCount(events) {
    document.getElementById('myUpcomingEvents').textContent = events.length;
}

// Register for Event
async function registerEvent(eventId) {
    try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            alert('Successfully registered for the event!');
            loadUpcomingEvents();
            loadProfile();
            loadNotifications();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to register');
        }
    } catch (error) {
        alert('Network error. Please try again.');
        console.error('Register event error:', error);
    }
}

// Unregister from Event
async function unregisterEvent(eventId) {
    if (!confirm('Are you sure you want to unregister from this event?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            alert('Successfully unregistered from the event');
            loadUpcomingEvents();
            loadProfile();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to unregister');
        }
    } catch (error) {
        alert('Network error. Please try again.');
        console.error('Unregister event error:', error);
    }
}

// Load History
async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/students/history`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            displayHistory(data);
        }
    } catch (error) {
        console.error('Load history error:', error);
    }
}

function displayHistory(data) {
    // Registrations
    const registrationsContainer = document.getElementById('registrationsHistory');
    if (data.registrations.length === 0) {
        registrationsContainer.innerHTML = '<p class="empty-state">No event registrations yet.</p>';
    } else {
        registrationsContainer.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Event Name</th>
                        <th>Date</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Coins</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.registrations.map(reg => {
                        const event = reg.event;
                        const date = new Date(event.date).toLocaleString();
                        const isWinner = reg.status === 'winner';
                        const coins = isWinner && event.coinsAllocated ? Math.floor(event.coinsAllocated / event.numberOfWinners) : 0;
                        
                        return `
                            <tr>
                                <td>${event.name}</td>
                                <td>${date}</td>
                                <td>${event.location}</td>
                                <td><span class="badge ${reg.status === 'winner' ? 'badge-success' : reg.status === 'cancelled' ? 'badge-danger' : 'badge-primary'}">${reg.status}</span></td>
                                <td>${coins > 0 ? `+${coins}` : '-'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    // Coin History
    const coinHistoryContainer = document.getElementById('coinHistory');
    if (data.coinHistory.length === 0) {
        coinHistoryContainer.innerHTML = '<p class="empty-state">No coin history yet.</p>';
    } else {
        coinHistoryContainer.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Event</th>
                        <th>Amount</th>
                        <th>Type</th>
                        <th>Reason</th>
                        <th>Changed By</th>
                        <th>Previous Balance</th>
                        <th>New Balance</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.coinHistory.map(history => {
                        const date = new Date(history.createdAt).toLocaleString();
                        const amount = history.amount > 0 ? `+${history.amount}` : history.amount;
                        
                        return `
                            <tr>
                                <td>${date}</td>
                                <td>${history.event ? history.event.name : 'Manual'}</td>
                                <td><strong style="color: ${history.amount > 0 ? 'var(--success-color)' : 'var(--danger-color)'}">${amount}</strong></td>
                                <td><span class="badge ${history.type === 'event_win' ? 'badge-success' : history.type === 'manual_add' ? 'badge-primary' : 'badge-danger'}">${history.type.replace('_', ' ')}</span></td>
                                <td>${history.reason}</td>
                                <td>${history.changedBy ? history.changedBy.name : 'System'}</td>
                                <td>${history.previousBalance}</td>
                                <td><strong>${history.newBalance}</strong></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }
}

// Notifications
async function loadNotifications() {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            displayNotifications(data.notifications);
        }
    } catch (error) {
        console.error('Load notifications error:', error);
    }
}

function displayNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    
    if (notifications.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No notifications</p></div>';
        return;
    }

    container.innerHTML = notifications.map(notif => {
        const time = new Date(notif.createdAt).toLocaleString();
        return `
            <div class="notification-item ${notif.read ? '' : 'unread'}" onclick="markAsRead('${notif._id}')">
                <h4>${notif.title}</h4>
                <p>${notif.message}</p>
                <div class="time">${time}</div>
            </div>
        `;
    }).join('');
}

function toggleNotifications() {
    const panel = document.getElementById('notificationsPanel');
    panel.classList.toggle('active');
    if (panel.classList.contains('active')) {
        loadNotifications();
    }
}

async function markAsRead(notificationId) {
    try {
        await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        loadNotifications();
    } catch (error) {
        console.error('Mark as read error:', error);
    }
}

// Tabs
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    
    if (tabName === 'events') {
        document.getElementById('eventsTab').classList.remove('hidden');
        loadUpcomingEvents();
    } else if (tabName === 'history') {
        document.getElementById('historyTab').classList.remove('hidden');
        loadHistory();
    } else if (tabName === 'profile') {
        document.getElementById('profileTab').classList.remove('hidden');
        loadProfile();
    }
}

