const API_BASE_URL = 'http://localhost:3000/api';

// Show/hide forms
document.getElementById('showRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    hideMessages();
});

document.getElementById('showLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
    hideMessages();
});

// Show student ID field when student role is selected
document.getElementById('regRole')?.addEventListener('change', (e) => {
    const studentIdGroup = document.getElementById('studentIdGroup');
    if (e.target.value === 'student') {
        studentIdGroup.style.display = 'block';
        document.getElementById('regStudentId').required = true;
    } else {
        studentIdGroup.style.display = 'none';
        document.getElementById('regStudentId').required = false;
    }
});

// Login form handler
document.getElementById('loginFormElement')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Redirect based on role
            if (data.user.role === 'admin') {
                window.location.href = '/admin';
            } else {
                window.location.href = '/student';
            }
        } else {
            showError(data.error || 'Login failed');
        }
    } catch (error) {
        showError('Network error. Please try again.');
        console.error('Login error:', error);
    }
});

// Register form handler
document.getElementById('registerFormElement')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();

    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    const studentId = document.getElementById('regStudentId').value;

    const userData = {
        name,
        email,
        password,
        role
    };

    if (role === 'student' && studentId) {
        userData.studentId = studentId;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok) {
            showSuccess('Registration successful! Logging in...');
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            setTimeout(() => {
                if (data.user.role === 'admin') {
                    window.location.href = '/admin';
                } else {
                    window.location.href = '/student';
                }
            }, 1000);
        } else {
            showError(data.error || 'Registration failed');
        }
    } catch (error) {
        showError('Network error. Please try again.');
        console.error('Registration error:', error);
    }
});

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.classList.remove('hidden');
}

function hideMessages() {
    document.getElementById('errorMessage')?.classList.add('hidden');
    document.getElementById('successMessage')?.classList.add('hidden');
}

