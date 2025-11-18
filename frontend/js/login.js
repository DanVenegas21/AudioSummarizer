/* LOGIN PAGE SCRIPT */

// Elementos del DOM
const DOM = {
    loginForm: document.getElementById('loginForm'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    togglePasswordBtn: document.getElementById('togglePassword'),
    errorModal: document.getElementById('errorModal'),
    errorMessage: document.getElementById('errorMessage'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    closeErrorBtn: document.getElementById('closeErrorBtn')
};

/* Muestra un mensaje de error */
function showError(message) {
    DOM.errorMessage.textContent = message;
    DOM.errorModal.classList.remove('hidden');
}

/* Cierra el modal de error */
function closeErrorModal() {
    DOM.errorModal.classList.add('hidden');
}

/* Toggle para mostrar/ocultar contraseña */
function togglePasswordVisibility() {
    const iconHide = DOM.togglePasswordBtn.querySelector('.icon-hide');
    const iconShow = DOM.togglePasswordBtn.querySelector('.icon-show');
    
    if (DOM.passwordInput.type === 'password') {
        DOM.passwordInput.type = 'text';
        iconHide.classList.add('hidden');
        iconShow.classList.remove('hidden');
        DOM.togglePasswordBtn.title = 'Hide password';
    } else {
        DOM.passwordInput.type = 'password';
        iconHide.classList.remove('hidden');
        iconShow.classList.add('hidden');
        DOM.togglePasswordBtn.title = 'Show password';
    }
}

/* Valida el formato de email */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/* Valida el formulario antes de enviar */
function validateForm(email, password) {
    if (!email || !password) {
        showError('Please fill in all fields.');
        return false;
    }
    
    if (email.includes('@') && !isValidEmail(email)) {
        showError('Please enter a valid email address.');
        return false;
    }
    
    if (password.length < 4) {
        showError('Password must be at least 4 characters long.');
        return false;
    }
    
    return true;
}

/* Maneja el envío del formulario */
async function handleLogin(e) {
    e.preventDefault();
    
    const email = DOM.emailInput.value.trim();
    const password = DOM.passwordInput.value;
    
    // Validar campos
    if (!validateForm(email, password)) {
        return;
    }
    
    // Deshabilitar el formulario durante el proceso
    const submitBtn = DOM.loginForm.querySelector('button[type="submit"]');
    const originalBtnContent = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg class="btn-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
        </svg>
        Signing in...
    `;
    
    try {
        // Llamar al API de autenticación
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Authentication failed');
        }
        
        // Guardar información del usuario en localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('isAuthenticated', 'true');
        
        console.log('Login successful:', data.user.email);
        
        // Redirigir a la página principal
        window.location.href = './index.html';
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Mostrar mensaje de error específico
        if (error.message.includes('Invalid credentials')) {
            showError('Invalid email or password. Please try again.');
        } else if (error.message.includes('required')) {
            showError('Please fill in all required fields.');
        } else {
            showError('An error occurred during login. Please try again.');
        }
        
        // Restaurar el botón
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnContent;
    }
}

/* Inicializa los event listeners */
function initializeEventListeners() {
    // Submit del formulario
    DOM.loginForm.addEventListener('submit', handleLogin);
    
    // Toggle de contraseña
    DOM.togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
    
    // Modales de error
    DOM.closeModalBtn.addEventListener('click', closeErrorModal);
    DOM.closeErrorBtn.addEventListener('click', closeErrorModal);
    
    // Click fuera del modal para cerrar
    DOM.errorModal.addEventListener('click', (e) => {
        if (e.target === DOM.errorModal) {
            closeErrorModal();
        }
    });
    
    // Presionar Enter en los campos
    DOM.emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            DOM.passwordInput.focus();
        }
    });
    
    // Animación de focus en los inputs
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });
    
    // Prevenir el pegado de espacios al inicio/final en el email
    DOM.emailInput.addEventListener('paste', (e) => {
        setTimeout(() => {
            DOM.emailInput.value = DOM.emailInput.value.trim();
        }, 10);
    });
}

/* Inicializa la aplicación */
function initApp() {
    console.log('Login page initialized');
    
    // Inicializar event listeners
    initializeEventListeners();
    
    // Focus automático en el primer campo
    DOM.emailInput.focus();
}

// Iniciar la aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
