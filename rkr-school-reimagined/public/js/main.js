// Header Scroll Effect
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Mobile Menu Toggle
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const icon = menuToggle.querySelector('i');
        if (navLinks.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });
}

// Toast Notification System
const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 9999;
        animation: slideIn 0.3s ease forwards;
    `;
    toast.innerText = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// Add toast animations to head
const style = document.createElement('style');
style.innerHTML = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(style);

// Form Handling
const handleForm = (formId, url, redirectUrl) => {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (response.ok) {
                showToast(result.message);
                if (redirectUrl) {
                    setTimeout(() => window.location.href = redirectUrl, 1000);
                }
            } else {
                showToast(result.message, 'danger');
            }
        } catch (err) {
            showToast('Something went wrong. Please try again.', 'danger');
        }
    });
};

// Register/Login Forms (custom login handler for role-based redirect)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(loginForm).entries());
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (response.ok) {
                showToast(result.message);
                setTimeout(() => {
                    window.location.href = result.role === 'admin' ? '/admin' : '/status';
                }, 800);
            } else {
                showToast(result.message, 'danger');
            }
        } catch (err) {
            showToast('Something went wrong. Please try again.', 'danger');
        }
    });
}

handleForm('registerForm', '/api/auth/register', '/');
handleForm('admissionForm', '/api/admission/submit', '/');

// Admin Actions
const updateStatus = async (id, status) => {
    try {
        // Use the new RESTful endpoints
        const endpoint = status === 'Approved' ? `/api/admission/approve/${id}` : `/api/admission/reject/${id}`;
        
        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (response.ok) {
            showToast(result.message);
            setTimeout(() => window.location.reload(), 500);
        } else {
            showToast(result.message, 'danger');
        }
    } catch (err) {
        showToast('Error updating status', 'danger');
    }
};

const deleteRecord = async (id) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
        const response = await fetch(`/api/admission/delete/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (response.ok) {
            showToast(result.message);
            setTimeout(() => window.location.reload(), 500);
        } else {
            showToast(result.message, 'danger');
        }
    } catch (err) {
        showToast('Error deleting record', 'danger');
    }
};

// Expose admin actions for inline onclick handlers in EJS templates
window.updateStatus = updateStatus;
window.deleteRecord = deleteRecord;
