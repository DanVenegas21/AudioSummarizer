/* AUDIO SUMMARIZER - MAIN SCRIPT */

// Verificar autenticación al cargar la página
function checkAuthentication() {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    const user = localStorage.getItem('user');
    
    if (!isAuthenticated || !user) {
        // Redirigir al login si no está autenticado
        window.location.href = './login.html';
        return false;
    }
    
    try {
        const userData = JSON.parse(user);
        console.log('Usuario autenticado:', userData.email);
        
        // Mostrar información del usuario en la interfaz si es necesario
        displayUserInfo(userData);
        
        return true;
    } catch (error) {
        console.error('Error al verificar autenticación:', error);
        localStorage.clear();
        window.location.href = './login.html';
        return false;
    }
}

// Mostrar información del usuario en la interfaz
function displayUserInfo(user) {
    // Mostrar el nombre del usuario en el header
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = `${user.first_name} ${user.last_name}`;
    }
    
    // Poblar información del usuario en el sidebar
    populateSidebarUserInfo(user);
    
    // Crear menú de navegación del sidebar
    createSidebarNav(user);
    
    console.log(`Bienvenido, ${user.first_name} ${user.last_name}`);
}

// Poblar información del usuario en el sidebar
function populateSidebarUserInfo(user) {
    if (!DOM.sidebarUserCard) return;
    
    const roleNames = {
        0: { name: 'Admin', class: 'badge-admin' },
        1: { name: 'Supervisor', class: 'badge-supervisor' },
        2: { name: 'User', class: 'badge-user' }
    };
    
    const role = roleNames[user.role] || roleNames[2];
    const initials = `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    
    DOM.sidebarUserCard.innerHTML = `
        <div class="sidebar-user-avatar">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
        </div>
        <div class="sidebar-user-name">${user.first_name} ${user.last_name}</div>
        <span class="role-badge ${role.class}">
            ${role.name}
        </span>
    `;
}

// Cargar agentes disponibles para el usuario
async function loadUserAgents() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;
        
        const response = await fetch(`http://localhost:5000/api/agents?user_id=${user.id}&only_active=true`);
        
        if (!response.ok) {
            throw new Error('Failed to load agents');
        }
        
        const data = await response.json();
        
        if (data.success && data.agents) {
            AppState.availableAgents = data.agents;
            populateAgentSelector(data.agents);
        }
        
    } catch (error) {
        console.error('Error loading agents:', error);
        DOM.agentSelect.innerHTML = '<option value="">No agents available</option>';
        DOM.agentDescription.textContent = 'Could not load agents';
    }
}

// Poblar el selector de agentes
function populateAgentSelector(agents) {
    if (!DOM.agentSelect) return;
    
    DOM.agentSelect.innerHTML = '';
    
    if (agents.length === 0) {
        DOM.agentSelect.innerHTML = '<option value="">No agents available</option>';
        DOM.agentDescription.textContent = 'No AI agents configured. Contact your administrator.';
        return;
    }
    
    // Agregar opción por defecto
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select an AI Agent';
    DOM.agentSelect.appendChild(defaultOption);
    
    // Agregar agentes
    agents.forEach(agent => {
        const option = document.createElement('option');
        option.value = agent.id;
        option.textContent = `${agent.name} (${agent.provider.toUpperCase()} - ${agent.model_name || 'Default'})`;
        option.dataset.description = agent.description || 'No description available';
        option.dataset.provider = agent.provider;
        option.dataset.model = agent.model_name || 'Default';
        DOM.agentSelect.appendChild(option);
    });
    
    // Actualizar descripción inicial
    updateAgentDescription();
}

// Actualizar descripción del agente seleccionado
function updateAgentDescription() {
    if (!DOM.agentSelect || !DOM.agentDescription) return;
    
    const selectedOption = DOM.agentSelect.options[DOM.agentSelect.selectedIndex];
    
    if (!selectedOption || !selectedOption.value) {
        DOM.agentDescription.textContent = 'Select an agent to see details';
        AppState.selectedAgent = null;
        return;
    }
    
    const agentId = parseInt(selectedOption.value);
    const agent = AppState.availableAgents.find(a => a.id === agentId);
    
    if (agent) {
        AppState.selectedAgent = agent;
        const description = agent.description || 'No description available';
        const model = agent.model_name || 'Default model';
        const provider = agent.provider.toUpperCase();
        
        DOM.agentDescription.innerHTML = `
            <strong>${agent.name}</strong><br>
            <span style="color: var(--primary-color);">${provider} - ${model}</span><br>
            ${description}
        `;
    }
}

// Crear menú de navegación del sidebar
function createSidebarNav(user) {
    if (!DOM.sidebarNav) return;
    
    const menuItems = [];
    
    // SECCIÓN PRINCIPAL - Común para todos los roles
    
    // My Recordings - Prioridad 1
    menuItems.push({
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>',
        label: 'My Recordings',
        active: false,
        href: '#',
        action: () => console.log('Navigate to My Recordings')
    });
    
    // New Recording - Prioridad 1 (página actual)
    menuItems.push({
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3" fill="currentColor"></circle></svg>',
        label: 'New Recording',
        active: true,
        href: './index.html',
        action: () => window.location.href = './index.html'
    });
    
    // ADMIN (role = 0) - Acceso total
    if (user.role === 0) {
        // All Recordings
        menuItems.push({
            icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
            label: 'All Recordings',
            active: false,
            href: '#',
            action: () => console.log('Navigate to All Recordings')
        });
        
        // My Agents
        menuItems.push({
            icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>',
            label: 'My Agents',
            active: false,
            href: './agents.html',
            action: () => window.location.href = './agents.html'
        });
        
        menuItems.push({ groupTitle: 'Administration' });
        
        // Users
        menuItems.push({
            icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
            label: 'Users',
            active: false,
            href: '#',
            action: () => console.log('Navigate to Users')
        });
        
        // Teams
        menuItems.push({
            icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
            label: 'Teams',
            active: false,
            href: '#',
            action: () => console.log('Navigate to Teams')
        });
        
        // Settings
        menuItems.push({
            icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6m5.66-14.66l-4.24 4.24m0 6l-4.24 4.24M23 12h-6m-6 0H1m19.66 5.66l-4.24-4.24m0-6l-4.24-4.24"></path></svg>',
            label: 'Settings',
            active: false,
            href: '#',
            action: () => console.log('Navigate to Settings')
        });
    }
    
    // SUPERVISOR (role = 1) - Gestión de equipos
    else if (user.role === 1) {
        menuItems.push({ groupTitle: 'Teams' });
        
        // My Teams
        menuItems.push({
            icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
            label: 'My Teams',
            active: false,
            href: '#',
            action: () => console.log('Navigate to My Teams')
        });
        
        // Team Recordings
        menuItems.push({
            icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
            label: 'Team Recordings',
            active: false,
            href: '#',
            action: () => console.log('Navigate to Team Recordings')
        });
    }
    
    // USUARIO GENERAL (role = 2) - Acceso básico
    else if (user.role === 2) {
        menuItems.push({ groupTitle: 'Teams' });
        
        // My Teams
        menuItems.push({
            icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
            label: 'My Teams',
            active: false,
            href: '#',
            action: () => console.log('Navigate to My Teams')
        });
    }
    
    // SECCIÓN MY ACCOUNT - Común para todos los roles
    menuItems.push({ groupTitle: 'My Account' });
    
    menuItems.push({
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
        label: 'Change Password',
        active: false,
        href: '#',
        action: openChangePasswordModal
    });
    
    menuItems.push({
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>',
        label: 'Logout',
        active: false,
        href: '#',
        action: logout
    });
    
    // Generar HTML del menú
    let navHTML = '';
    menuItems.forEach(item => {
        if (item.groupTitle) {
            navHTML += `<div class="nav-group-title">${item.groupTitle}</div>`;
        } else {
            navHTML += `
                <a href="${item.href || '#'}" class="nav-item ${item.active ? 'active' : ''}" data-action="${item.label}">
                    <span class="nav-item-icon">${item.icon}</span>
                    <span>${item.label}</span>
                </a>
            `;
        }
    });
    
    DOM.sidebarNav.innerHTML = navHTML;
    
    // Agregar event listeners a los items del menú
    DOM.sidebarNav.querySelectorAll('.nav-item').forEach((item, index) => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const action = menuItems.filter(m => !m.groupTitle)[index].action;
            if (action) action();
            closeSidebar();
        });
    });
}

// Funciones para manejar el sidebar
function toggleSidebar() {
    if (DOM.sidebar && DOM.sidebarOverlay) {
        DOM.sidebar.classList.toggle('open');
        
        if (DOM.sidebar.classList.contains('open')) {
            DOM.sidebarOverlay.classList.remove('hidden');
            setTimeout(() => {
                DOM.sidebarOverlay.classList.add('visible');
            }, 10);
        } else {
            DOM.sidebarOverlay.classList.remove('visible');
            setTimeout(() => {
                DOM.sidebarOverlay.classList.add('hidden');
            }, 300);
        }
    }
}

function closeSidebar() {
    if (DOM.sidebar && DOM.sidebarOverlay) {
        DOM.sidebar.classList.remove('open');
        DOM.sidebarOverlay.classList.remove('visible');
        setTimeout(() => {
            DOM.sidebarOverlay.classList.add('hidden');
        }, 300);
    }
}

// Función para cerrar sesión
function logout() {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    window.location.href = './login.html';
}

// Toggle del menú de usuario
function toggleUserMenu(e) {
    e.stopPropagation();
    DOM.userDropdown.classList.toggle('hidden');
}

// Cerrar menú de usuario
function closeUserMenu() {
    DOM.userDropdown.classList.add('hidden');
}

// Abrir modal de cambio de contraseña
function openChangePasswordModal() {
    closeUserMenu();
    DOM.changePasswordModal.classList.remove('hidden');
    DOM.changePasswordForm.reset();
}

// Cerrar modal de cambio de contraseña
function closeChangePasswordModal() {
    DOM.changePasswordModal.classList.add('hidden');
    DOM.changePasswordForm.reset();
}

// Manejar cambio de contraseña
async function handleChangePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
        showError('Please fill in all fields');
        return;
    }
    
    if (newPassword.length < 4) {
        showError('New password must be at least 4 characters long');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showError('New passwords do not match');
        return;
    }
    
    // Obtener el usuario actual
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        showError('User not found');
        return;
    }
    
    // Deshabilitar el botón durante el proceso
    const submitBtn = DOM.submitChangePasswordBtn;
    const originalBtnContent = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg class="btn-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
        </svg>
        Changing...
    `;
    
    try {
        const response = await fetch('/api/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: user.email,
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to change password');
        }
        
        // Cerrar el modal y mostrar mensaje de éxito
        closeChangePasswordModal();
        showSuccessMessage('Password changed successfully');
        
    } catch (error) {
        console.error('Change password error:', error);
        
        // Mostrar mensaje de error específico
        if (error.message.includes('Current password is incorrect')) {
            showError('Current password is incorrect');
        } else if (error.message.includes('at least 4 characters')) {
            showError('New password must be at least 4 characters long');
        } else {
            showError('An error occurred while changing password');
        }
        
        // Restaurar el botón
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnContent;
    }
}

// Función para mostrar mensaje de éxito
function showSuccessMessage(message) {
    // Reutilizar el modal de error para mensajes de éxito
    DOM.errorMessage.textContent = message;
    DOM.errorModal.querySelector('h3').textContent = 'Success';
    DOM.errorModal.classList.remove('hidden');
    
    // Restaurar el título después de cerrar
    setTimeout(() => {
        DOM.errorModal.querySelector('h3').textContent = 'Error';
    }, 3000);
}

// Estado global de la aplicación
const AppState = {
    currentAudioFile: null,
    audioURL: null,
    isProcessing: false,
    lastResult: null,
    audioRecorder: null,
    isRecording: false,
    recordingStartTime: null,
    recordingTimer: null,
    recordingType: null, // 'microphone', 'system', 'both'
    availableAgents: [], // Lista de agentes disponibles
    selectedAgent: null, // Agente seleccionado
};

// Elementos del DOM
const DOM = {
    // Upload Section
    uploadBox: document.getElementById('uploadBox'),
    fileInput: document.getElementById('fileInput'),
    selectFileBtn: document.getElementById('selectFileBtn'),
    recordBtn: document.getElementById('recordBtn'),
    audioPreview: document.getElementById('audioPreview'),
    previewContainer: document.getElementById('previewContainer'),
    processBtn: document.getElementById('processBtn'),
    languageSelect: document.getElementById('languageSelect'),
    agentSelect: document.getElementById('agentSelect'),
    agentDescription: document.getElementById('agentDescription'),
    removeAudioBtn: document.getElementById('removeAudioBtn'),
    
    // Preview Section
    summaryViewer: document.getElementById('summaryViewer'),
    summaryPlaceholder: document.getElementById('summaryPlaceholder'),
    loadingSkeleton: document.getElementById('loadingSkeleton'),
    loadingStatusText: document.getElementById('loadingStatusText'),
    
    // Modals
    errorModal: document.getElementById('errorModal'),
    errorMessage: document.getElementById('errorMessage'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    closeErrorBtn: document.getElementById('closeErrorBtn'),
    recordTypeModal: document.getElementById('recordTypeModal'),
    closeRecordTypeModalBtn: document.getElementById('closeRecordTypeModalBtn'),
    
    // User Menu
    btnUserMenu: document.getElementById('btnUserMenu'),
    userDropdown: document.getElementById('userDropdown'),
    btnChangePassword: document.getElementById('btnChangePassword'),
    btnLogout: document.getElementById('btnLogout'),
    changePasswordModal: document.getElementById('changePasswordModal'),
    closeChangePasswordModalBtn: document.getElementById('closeChangePasswordModalBtn'),
    cancelChangePasswordBtn: document.getElementById('cancelChangePasswordBtn'),
    submitChangePasswordBtn: document.getElementById('submitChangePasswordBtn'),
    changePasswordForm: document.getElementById('changePasswordForm'),
    
    // Chat
    chatFooterStatic: document.getElementById('chatFooterStatic'),
    chatInput: document.getElementById('chatInput'),
    sendChatBtn: document.getElementById('sendChatBtn'),
    chatMessagesContainer: document.getElementById('chatMessagesContainer'),
    
    // Sidebar
    sidebar: document.getElementById('appSidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
    sidebarUserCard: document.getElementById('sidebarUserCard'),
    sidebarNav: document.getElementById('sidebarNav')
};

/* UTILIDADES */
/* Genera HTML de spinner con texto */
function createSpinnerHTML(text) {
    return `
        <svg class="btn-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
        </svg>
        ${text}
    `;
}

/* Skeleton Loader Functions */
function showLoadingSkeleton(initialMessage = 'Preparing...') {
    if (DOM.summaryPlaceholder) {
        DOM.summaryPlaceholder.style.display = 'none';
    }
    if (DOM.loadingSkeleton) {
        DOM.loadingSkeleton.style.display = 'flex';
    }
    if (DOM.loadingStatusText) {
        DOM.loadingStatusText.textContent = initialMessage;
    }
}

function updateLoadingMessage(message) {
    if (DOM.loadingStatusText) {
        // Fade out
        DOM.loadingStatusText.style.opacity = '0';
        DOM.loadingStatusText.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            DOM.loadingStatusText.textContent = message;
            // Fade in
            DOM.loadingStatusText.style.opacity = '1';
            DOM.loadingStatusText.style.transform = 'translateY(0)';
        }, 300);
    }
}

function hideLoadingSkeleton() {
    if (DOM.loadingSkeleton) {
        DOM.loadingSkeleton.style.display = 'none';
    }
}

/* Formatea el tamaño del archivo en formato legible */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/* Formatea la duración en formato mm:ss */
function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/* Valida si el archivo es de audio o video */
function isValidAudioFile(file) {
    const validTypes = [
        // Tipos de audio
        'audio/mpeg',       // .mp3
        'audio/wav',        // .wav
        'audio/wave',       // .wav
        'audio/x-wav',      // .wav
        'audio/mp4',        // .m4a
        'audio/x-m4a',      // .m4a
        'audio/ogg',        // .ogg
        'audio/flac',       // .flac
        'audio/x-flac',     // .flac
        'audio/aac',        // .aac
        'audio/x-ms-wma',   // .wma
        'audio/webm',       // .webm
        // Tipos de video
        'video/mp4',        // .mp4
        'video/x-msvideo',  // .avi
        'video/quicktime',  // .mov
        'video/x-matroska', // .mkv
        'video/x-flv',      // .flv
        'video/x-ms-wmv',   // .wmv
        'video/webm',       // .webm
        'video/mpeg',       // .mpeg
        'video/3gpp',       // .3gp
        'video/mp2t'        // .ts
    ];
    
    const validExtensions = [
        '.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.wma', '.webm', // Audio
        '.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.mpeg', '.mpg', '.3gp', '.m4v', '.ts' // Video
    ];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    return validTypes.includes(file.type) || validExtensions.includes(fileExtension);
}

/* Muestra un mensaje de error */
function showError(message) {
    DOM.errorMessage.textContent = message;
    DOM.errorModal.classList.remove('hidden');
}

/* Cierra el modal de error */
function closeErrorModal() {
    DOM.errorModal.classList.add('hidden');
}

/* Obtiene la duración del archivo de audio */
function getAudioDuration(file) {
    return new Promise((resolve) => {
        const audio = new Audio();
        audio.preload = 'metadata';
        
        audio.onloadedmetadata = () => {
            URL.revokeObjectURL(audio.src);
            resolve(audio.duration);
        };
        
        audio.onerror = () => {
            resolve(null);
        };
        
        audio.src = URL.createObjectURL(file);
    });
}

/* MANEJO DE ARCHIVOS DE AUDIO Y VIDEO */
/* Procesa el archivo de audio o video seleccionado */
async function handleAudioFile(file) {
    // Validar tipo de archivo
    if (!isValidAudioFile(file)) {
        showError('Invalid file type. Please select an audio or video file (Supported: MP3, WAV, M4A, OGG, FLAC, AAC, WEBM, MP4, AVI, MOV, MKV, etc.).');
        return;
    }
    
    // Validar tamaño (máximo 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
        showError('File is too large. Maximum size is 100MB.');
        return;
    }
    
    // Si ya hay un archivo cargado, limpiar
    if (AppState.currentAudioFile) {
        clearCurrentAudio();
    }
    
    // Guardar el archivo en el estado
    AppState.currentAudioFile = file;
    AppState.audioURL = URL.createObjectURL(file);
    
    // Obtener duración del audio
    const duration = await getAudioDuration(file);
    
    // Mostrar el archivo en preview
    displayAudioPreview(file, duration);
    
    // Mostrar la sección de preview
    DOM.audioPreview.classList.remove('hidden');
}

/* Muestra el archivo de audio en preview */
function displayAudioPreview(file, duration) {
    DOM.previewContainer.innerHTML = '';
    
    // Crear elemento de audio simplificado
    const audioItem = document.createElement('div');
    audioItem.className = 'audio-preview-wrapper';
    audioItem.innerHTML = `
        <div class="audio-player-container">
            <audio controls class="audio-player">
                <source src="${AppState.audioURL}" type="${file.type}">
                Your browser does not support the audio element.
            </audio>
        </div>
    `;
    
    DOM.previewContainer.appendChild(audioItem);
}

/* Limpia el audio actual */
function clearCurrentAudio() {
    // Revocar URL del objeto
    if (AppState.audioURL) {
        URL.revokeObjectURL(AppState.audioURL);
        AppState.audioURL = null;
    }
    
    AppState.currentAudioFile = null; // Limpiar estado
    
    // Limpiar UI
    DOM.previewContainer.innerHTML = '';
    DOM.audioPreview.classList.add('hidden');
    
    DOM.fileInput.value = ''; // Reset input
}

/* FUNCIONES DE GRABACIÓN */
/* Inicia la grabación de audio según el tipo seleccionado */
async function startRecording(recordingType) {
    try {
        // Si ya hay un archivo cargado, limpiar
        if (AppState.currentAudioFile) {
            clearCurrentAudio();
        }

        AppState.recordingType = recordingType;
        AppState.isRecording = true;
        AppState.recordingStartTime = Date.now();

        // Actualizar UI del botón
        DOM.recordBtn.classList.add('recording');
        DOM.recordBtn.title = 'Click to stop recording';
        
        // Cambiar ícono a cuadrado de detener
        DOM.recordBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" ry="2"/>
            </svg>
        `;
        
        // Deshabilitar otros controles durante la grabación
        DOM.selectFileBtn.disabled = true;
        DOM.fileInput.disabled = true;

        if (recordingType === 'microphone') {
            // Grabación solo del micrófono
            if (!AppState.audioRecorder) {
                AppState.audioRecorder = new AudioRecorder();
            }
            await AppState.audioRecorder.startRecording();
            
        } else if (recordingType === 'system' || recordingType === 'both') {
            // Grabación del sistema o ambos (se maneja en el backend)
            const response = await fetch('http://localhost:5000/api/start-system-recording', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: recordingType
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to start recording');
            }

            const data = await response.json();
            console.log('Recording started:', data);
        }

        updateRecordingTimer(); // Mostrar indicador de tiempo de grabación

    } catch (error) {
        console.error('Error starting recording:', error);
        showError(error.message || 'Error starting recording');
        AppState.isRecording = false;
        AppState.recordingType = null;
        
        // Restaurar el botón en caso de error
        restoreRecordButton();
    }
}

/* Detiene la grabación de audio */
async function stopRecording() {
    try {
        if (!AppState.isRecording) {
            return;
        }

        // Detener el timer
        if (AppState.recordingTimer) {
            clearInterval(AppState.recordingTimer);
            AppState.recordingTimer = null;
        }

        let audioFile, duration;

        if (AppState.recordingType === 'microphone') {
            // Detener grabación del micrófono
            if (!AppState.audioRecorder) {
                throw new Error('No audio recorder found');
            }
            
            const audioBlob = await AppState.audioRecorder.stopRecording();
            
            // Convertir blob a File
            const fileName = `recording_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
            audioFile = new File([audioBlob], fileName, { type: 'audio/webm' });
            duration = (Date.now() - AppState.recordingStartTime) / 1000;
            
        } else if (AppState.recordingType === 'system' || AppState.recordingType === 'both') {
            // Detener grabación del sistema o ambos
            const response = await fetch('http://localhost:5000/api/stop-system-recording', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to stop recording');
            }

            const recordData = await response.json();
            console.log('Recording stopped:', recordData);

            // Descargar el archivo grabado
            const fileResponse = await fetch(`http://localhost:5000/uploads/${recordData.file_id}`);
            const blob = await fileResponse.blob();
            
            const fileName = recordData.filename || `recording_${new Date().toISOString().replace(/[:.]/g, '-')}.wav`;
            audioFile = new File([blob], fileName, { type: 'audio/wav' });
            duration = recordData.duration || (Date.now() - AppState.recordingStartTime) / 1000;
        }

        AppState.isRecording = false;

        // Guardar el archivo en el estado
        AppState.currentAudioFile = audioFile;
        AppState.audioURL = URL.createObjectURL(audioFile);

        displayAudioPreview(audioFile, duration); // Mostrar el archivo en preview
        DOM.audioPreview.classList.remove('hidden'); // Mostrar la sección de preview

        // Restaurar UI del botón
        restoreRecordButton();

    } catch (error) {
        console.error('Error stopping recording:', error);
        showError('Error stopping recording: ' + error.message);
        AppState.isRecording = false;
        AppState.recordingType = null;
        
        // Asegurar que el botón se restaure en caso de error
        restoreRecordButton();
    }
}

/* Restaura el botón de grabación a su estado normal */
function restoreRecordButton() {
    DOM.recordBtn.classList.remove('recording');
    DOM.recordBtn.title = 'Record Audio';
    
    // Restaurar ícono de micrófono
    DOM.recordBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
    `;

    // Rehabilitar otros controles
    DOM.selectFileBtn.disabled = false;
    DOM.fileInput.disabled = false;
    
    // Detener el timer si existe
    if (AppState.recordingTimer) {
        clearInterval(AppState.recordingTimer);
        AppState.recordingTimer = null;
    }
}

/* Actualiza el timer de grabación */
function updateRecordingTimer() {
    AppState.recordingTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - AppState.recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Actualizar el título del botón con el tiempo
        DOM.recordBtn.title = `Recording... ${timeStr}`;
    }, 1000);
}

/* Muestra el modal de selección de tipo de grabación */
function showRecordTypeModal() {
    DOM.recordTypeModal.classList.remove('hidden');
}

/* Cierra el modal de selección de tipo de grabación */
function closeRecordTypeModal() {
    DOM.recordTypeModal.classList.add('hidden');
}

/* Maneja el click en el botón de grabar */
function handleRecordButtonClick() {
    if (AppState.isRecording) {
        // Si está grabando, detener según el tipo
        stopRecording();
    } else {
        // Si no está grabando, mostrar modal de selección
        showRecordTypeModal();
    }
}

/* FUNCIONES DE GRABACIÓN DE AUDIO DEL SISTEMA */
/* Inicia la grabación de audio del sistema */
async function startSystemRecording() {
    try {
        // Si ya hay un archivo cargado, limpiar
        if (AppState.currentAudioFile) {
            clearCurrentAudio();
        }

        AppState.isRecordingSystem = true;
        AppState.systemRecordingStartTime = Date.now();

        // Actualizar UI del botón
        DOM.recordSystemBtn.classList.add('recording');
        DOM.recordSystemBtn.title = 'Click to stop recording';
        
        // Cambiar ícono a cuadrado de detener
        DOM.recordSystemBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" ry="2"/>
            </svg>
        `;
        
        // Deshabilitar otros controles durante la grabación
        DOM.selectFileBtn.disabled = true;
        DOM.fileInput.disabled = true;
        DOM.recordBtn.disabled = true;

        // Iniciar el contador de tiempo
        updateSystemRecordingTimer();

        // Iniciar grabación en el backend (no bloquea)
        const response = await fetch('http://localhost:5000/api/start-system-recording', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to start system audio recording');
        }

        const data = await response.json();
        
        console.log('System audio recording started:', data);

    } catch (error) {
        console.error('Error starting system audio recording:', error);
        showError(error.message || 'Error starting system audio recording. Make sure your system supports audio loopback.');
        AppState.isRecordingSystem = false;
        
        // Restaurar el botón en caso de error
        restoreSystemRecordButton();
    }
}

/* Detiene la grabación de audio del sistema */
async function stopSystemRecording() {
    try {
        // Llamar al endpoint para detener la grabación
        const response = await fetch('http://localhost:5000/api/stop-system-recording', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to stop system audio recording');
        }

        const recordData = await response.json();
        
        console.log('System audio recording stopped:', recordData);

        AppState.isRecordingSystem = false;

        // Crear un File object desde el archivo grabado
        const fileResponse = await fetch(`http://localhost:5000/uploads/${recordData.file_id}`);
        const blob = await fileResponse.blob();
        
        const fileName = recordData.filename || `system_recording_${new Date().toISOString().replace(/[:.]/g, '-')}.wav`;
        const audioFile = new File([blob], fileName, { type: 'audio/wav' });

        // Guardar el archivo en el estado
        AppState.currentAudioFile = audioFile;
        AppState.audioURL = URL.createObjectURL(audioFile);

        const duration = recordData.duration || (Date.now() - AppState.systemRecordingStartTime) / 1000;

        displayAudioPreview(audioFile, duration);

        DOM.audioPreview.classList.remove('hidden');

        // Restaurar UI del botón
        restoreSystemRecordButton();

    } catch (error) {
        console.error('Error stopping system recording:', error);
        showError('Error stopping system audio recording: ' + error.message);
        AppState.isRecordingSystem = false;
        
        // Asegurar que el botón se restaure en caso de error
        restoreSystemRecordButton();
    }
}

/* Restaura el botón de grabación del sistema a su estado normal */
function restoreSystemRecordButton() {
    DOM.recordSystemBtn.classList.remove('recording');
    DOM.recordSystemBtn.title = 'Record System Audio (What\'s Playing)';
    
    // Restaurar ícono de música
    DOM.recordSystemBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
        </svg>
    `;

    // Rehabilitar otros controles
    DOM.selectFileBtn.disabled = false;
    DOM.fileInput.disabled = false;
    DOM.recordBtn.disabled = false;
    
    // Detener el timer si existe
    if (AppState.systemRecordingTimer) {
        clearInterval(AppState.systemRecordingTimer);
        AppState.systemRecordingTimer = null;
    }
}

/* Actualiza el timer de grabación del sistema */
function updateSystemRecordingTimer() {
    AppState.systemRecordingTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - AppState.systemRecordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Actualizar el título del botón con el tiempo transcurrido
        DOM.recordSystemBtn.title = `Recording... ${timeStr} - Click to stop`;
    }, 1000);
}

/* Maneja el click en el botón de grabar audio del sistema */
function handleSystemRecordButtonClick() {
    if (AppState.isRecordingSystem) {
        // Detener la grabación
        stopSystemRecording();
    } else {
        // Iniciar la grabación
        startSystemRecording();
    }
}

/* Procesa el audio/video (envía al backend) */
async function processAudio() {
    if (!AppState.currentAudioFile) {
        showError('No audio or video file selected.');
        return;
    }
    
    if (AppState.isProcessing) {
        return;
    }
    
    AppState.isProcessing = true;
    DOM.processBtn.disabled = true;
    DOM.processBtn.innerHTML = createSpinnerHTML('Processing...');
    
    // Mostrar skeleton loader con mensaje inicial
    showLoadingSkeleton('Uploading audio file...');
    
    try {
        // Subir el archivo
        const formData = new FormData();
        formData.append('audio', AppState.currentAudioFile);
        
        const uploadResponse = await fetch('http://localhost:5000/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!uploadResponse.ok) {
            const error = await uploadResponse.json();
            throw new Error(error.error || 'Failed to upload file');
        }
        
        const uploadData = await uploadResponse.json();
        const fileId = uploadData.file_id;
        
        console.log('File uploaded successfully:', fileId);
        
        // Cambiar mensaje: Transcribiendo
        updateLoadingMessage('Transcribing audio...');
        
        // Obtener el idioma seleccionado
        const selectedLanguage = DOM.languageSelect ? DOM.languageSelect.value : 'en';
        
        // Obtener el usuario actual
        const user = JSON.parse(localStorage.getItem('user'));
        
        // Determinar si usar un agente o el proceso estándar
        const useAgent = AppState.selectedAgent !== null;
        
        let processData;
        let endpoint;
        
        if (useAgent) {
            // Usar el endpoint de agentes
            endpoint = 'http://localhost:5000/api/process-with-agent';
            processData = {
                file_id: fileId,
                language: selectedLanguage,
                agent_id: AppState.selectedAgent.id,
                user_id: user.id
            };
            updateLoadingMessage(`Processing with ${AppState.selectedAgent.name}...`);
        } else {
            // Usar el endpoint estándar
            endpoint = 'http://localhost:5000/api/process';
            processData = {
                file_id: fileId,
                language: selectedLanguage
            };
        }
        
        // Simular progreso con mensajes cambiantes durante la transcripción
        const messageTimeout1 = setTimeout(() => {
            updateLoadingMessage('Analyzing dialogues...');
        }, 15000);
        
        const messageTimeout2 = setTimeout(() => {
            updateLoadingMessage('Generating summary...');
        }, 15000);
        
        const processResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(processData)
        });
        
        // Limpiar timeouts si la respuesta llega antes
        clearTimeout(messageTimeout1);
        clearTimeout(messageTimeout2);
        
        if (!processResponse.ok) {
            const error = await processResponse.json();
            throw new Error(error.error || 'Failed to process audio');
        }
        
        // Último mensaje antes de mostrar resultado
        updateLoadingMessage('Finalizing summary...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const result = await processResponse.json();
        
        console.log('Processing completed:', result);
        
        // Ocultar skeleton loader
        hideLoadingSkeleton();
        
        // Mostrar el resultado
        displaySummary(result);
        
        // Habilitar el chat
        DOM.chatInput.disabled = false;
        DOM.sendChatBtn.disabled = false;
        
    } catch (error) {
        console.error('Error processing audio:', error);
        
        // Ocultar skeleton loader en caso de error
        hideLoadingSkeleton();
        
        // Mostrar placeholder de nuevo
        if (DOM.summaryPlaceholder) {
            DOM.summaryPlaceholder.style.display = 'flex';
        }
        
        showError('Error: ' + error.message);
    } finally {
        AppState.isProcessing = false;
        DOM.processBtn.disabled = false;
        DOM.processBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3V17M10 17L15 12M10 17L5 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Summarize
        `;
    }
}

/* EVENT LISTENERS */
/* Inicializa todos los event listeners */
function initializeEventListeners() {
    // Sidebar events
    if (DOM.sidebarToggleBtn) {
        DOM.sidebarToggleBtn.addEventListener('click', toggleSidebar);
    }
    
    if (DOM.sidebarOverlay) {
        DOM.sidebarOverlay.addEventListener('click', closeSidebar);
    }
    
    DOM.recordBtn.addEventListener('click', handleRecordButtonClick); // Click en el botón de grabar
    
    // Modal de selección de tipo de grabación
    DOM.closeRecordTypeModalBtn.addEventListener('click', closeRecordTypeModal);
    
    // Cerrar modal al hacer click fuera
    DOM.recordTypeModal.addEventListener('click', (e) => {
        if (e.target === DOM.recordTypeModal) {
            closeRecordTypeModal();
        }
    });
    
    // Manejar selección de tipo de grabación
    document.querySelectorAll('.record-type-option').forEach(button => {
        button.addEventListener('click', () => {
            const type = button.getAttribute('data-type');
            closeRecordTypeModal();
            startRecording(type);
        });
    });
    
    // Click en el botón de seleccionar archivo
    DOM.selectFileBtn.addEventListener('click', () => {
        DOM.fileInput.click();
    });
    
    // Cambio en el input de archivo
    DOM.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleAudioFile(file);
        }
    });
    
    // Cambio en el selector de agentes
    if (DOM.agentSelect) {
        DOM.agentSelect.addEventListener('change', updateAgentDescription);
    }
    
    // Drag and Drop en el upload box
    DOM.uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        DOM.uploadBox.classList.add('drag-over');
    });
    
    DOM.uploadBox.addEventListener('dragleave', () => {
        DOM.uploadBox.classList.remove('drag-over');
    });
    
    DOM.uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        DOM.uploadBox.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (file) {
            handleAudioFile(file);
        }
    });
    
    DOM.processBtn.addEventListener('click', processAudio); // Botón de procesar
    
    // Botón de eliminar audio
    DOM.removeAudioBtn.addEventListener('click', clearCurrentAudio);
    
    // Modales de error
    DOM.closeModalBtn.addEventListener('click', closeErrorModal);
    DOM.closeErrorBtn.addEventListener('click', closeErrorModal);
    
    // Click fuera del modal para cerrar
    DOM.errorModal.addEventListener('click', (e) => {
        if (e.target === DOM.errorModal) {
            closeErrorModal();
        }
    });
    
    DOM.sendChatBtn.addEventListener('click', handleChatMessage); // Chat Footer Estático
    
    DOM.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleChatMessage();
        }
    });
    
    // User Menu
    DOM.btnUserMenu.addEventListener('click', toggleUserMenu);
    DOM.btnLogout.addEventListener('click', logout);
    DOM.btnChangePassword.addEventListener('click', openChangePasswordModal);
    
    // Change Password Modal
    DOM.closeChangePasswordModalBtn.addEventListener('click', closeChangePasswordModal);
    DOM.cancelChangePasswordBtn.addEventListener('click', closeChangePasswordModal);
    DOM.submitChangePasswordBtn.addEventListener('click', handleChangePassword);
    
    // Cerrar modal al hacer click fuera
    DOM.changePasswordModal.addEventListener('click', (e) => {
        if (e.target === DOM.changePasswordModal) {
            closeChangePasswordModal();
        }
    });
    
    // Toggle de visibilidad de contraseñas en el modal de cambio de contraseña
    document.querySelectorAll('.btn-toggle-password').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const iconHide = this.querySelector('.icon-hide');
            const iconShow = this.querySelector('.icon-show');
            
            if (input.type === 'password') {
                input.type = 'text';
                iconHide.classList.add('hidden');
                iconShow.classList.remove('hidden');
                this.title = 'Hide password';
            } else {
                input.type = 'password';
                iconHide.classList.remove('hidden');
                iconShow.classList.add('hidden');
                this.title = 'Show password';
            }
        });
    });
    
    // Cerrar el menú de usuario al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!DOM.userDropdown.classList.contains('hidden')) {
            if (!e.target.closest('.user-menu-section')) {
                closeUserMenu();
            }
        }
    });
}

/* Formatea la transcripción con identificación visual de hablantes */
function formatTranscriptionWithSpeakers(result) {
    if (!result.dialogues || result.dialogues.length === 0) {
        // Fallback al formato antiguo si no hay diálogos estructurados
        return result.transcription ? result.transcription.replace(/\n/g, '<br>') : 'No transcription available';
    }
    
    // Color uniforme para todos los hablantes (mismo que speechmatics-summary-content)
    const borderColor = '#08324A';
    
    let html = '<div class="dialogues-container">';
    
    result.dialogues.forEach((dialogue, index) => {
        const speakerId = dialogue.speaker;
        
        html += `
            <div class="dialogue-block" data-speaker="${speakerId}">
                <div class="speaker-text" style="border-left: 4px solid ${borderColor};">
                    ${dialogue.text}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

/* Muestra el resumen en la UI */
function displaySummary(result) {
    // Ocultar el skeleton loader si está visible
    hideLoadingSkeleton();
    
    // Ocultar el placeholder
    if (DOM.summaryPlaceholder) {
        DOM.summaryPlaceholder.style.display = 'none';
    }
    
    // Limpiar contenedor previo
    DOM.summaryViewer.innerHTML = '';
    
    AppState.lastResult = result; // Guardar el resultado en el estado global (incluye transcripción para el chat)
    
    const speechmaticsSummary = result.speechmatics_summary || null;
    const agentSummary = result.agent_summary || null;
    
    // Resumen del Agente (prioritario si existe)
    let summaryHTML = '';
    if (agentSummary) {
        const content = agentSummary.replace(/\n/g, '<br>');
        const agentInfo = result.agent_used || {};
        summaryHTML = `
            <div class="summary-section agent-summary-section">
                <div class="summary-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="M2 17l10 5 10-5"></path>
                        <path d="M2 12l10 5 10-5"></path>
                    </svg>
                    Generated by ${agentInfo.name || 'AI Agent'} (${agentInfo.provider || 'AI'})
                </div>
                <div class="speechmatics-summary-content">
                    ${content}
                </div>
            </div>
        `;
    }
    // Resumen de Speechmatics (si no hay agente)
    else if (speechmaticsSummary && speechmaticsSummary.content) {
        const content = speechmaticsSummary.content.replace(/\n/g, '<br>');
        summaryHTML = `
            <div class="summary-section speechmatics-summary-section">
                <div class="speechmatics-summary-content">
                    ${content}
                </div>
            </div>
        `;
    }
    
    // Crear estructura de pestañas
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'content-tabs';
    tabsContainer.innerHTML = `
        <div class="tabs-navigation">
            <button class="tab-btn active" data-tab="summary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Summary
            </button>
            <button class="tab-btn" data-tab="transcription">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Transcription
            </button>
        </div>
        <div class="tabs-content">
            <div class="tab-panel active" id="summaryTab">
                <div class="summary-container">
                    ${summaryHTML}
                </div>
            </div>
            <div class="tab-panel" id="transcriptionTab">
                <div class="transcription-container">
                    <div class="transcription-text">
                        ${formatTranscriptionWithSpeakers(result)}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    DOM.summaryViewer.appendChild(tabsContainer);
    
    // Agregar event listeners para las pestañas
    const tabButtons = tabsContainer.querySelectorAll('.tab-btn');
    const tabPanels = tabsContainer.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remover clase active de todos los botones y paneles
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));
            
            // Agregar clase active al botón clickeado
            button.classList.add('active');
            
            // Mostrar el panel correspondiente
            const targetPanel = targetTab === 'summary' ? 
                document.getElementById('summaryTab') : 
                document.getElementById('transcriptionTab');
            
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });
}

/* Detecta si el mensaje del usuario es una instrucción de edición del resumen */
function isEditInstruction(message) {
    const editKeywords = [
        // Palabras relacionadas con edición y cambios
        'edit', 'change', 'modify', 'update', 'rewrite', 'revise', 'improve',
        'edita', 'cambia', 'modifica', 'actualiza', 'reescribe', 'revisa', 'mejora',
        
        // Palabras relacionadas con formato y longitud
        'shorter', 'longer', 'brief', 'detailed', 'summarize', 'expand',
        'más corto', 'más largo', 'breve', 'detallado', 'resume', 'resumir', 'amplía', 'ampliar',
        
        // Palabras relacionadas con estructura
        'bullet', 'points', 'list', 'organize', 'structure', 'format',
        'viñetas', 'puntos', 'lista', 'organiza', 'organizar', 'estructura', 'formato',
        
        // Instrucciones directas
        'make it', 'hazlo', 'haz que', 'conviértelo', 'ponlo',
        
        // Referencias al resumen
        'the summary', 'this summary', 'el resumen', 'este resumen',
        
        // Instrucciones de transformación
        'translate', 'traduce', 'traducir', 'in spanish', 'in english', 'en español', 'en inglés',
        'highlight', 'focus on', 'emphasize', 'destaca', 'enfócate', 'enfatiza',
        'remove', 'add', 'include', 'exclude', 'elimina', 'agrega', 'añade', 'incluye', 'excluye',
        
        // Instrucciones de contenido específico
        'extract', 'extrae', 'show only', 'muestra solo', 'only show',
        'action items', 'decisions', 'next steps', 'tareas', 'decisiones', 'próximos pasos'
    ];
    
    const lowerMessage = message.toLowerCase();
    
    // Verificar si contiene alguna palabra clave de edición
    return editKeywords.some(keyword => lowerMessage.includes(keyword));
}

/* Obtiene el resumen actual de la UI */
function getCurrentSummary() {
    const summarySection = document.querySelector('.speechmatics-summary-content');
    if (summarySection) {
        return summarySection.textContent || summarySection.innerText;
    }
    // Si no hay resumen de Speechmatics, retornar un mensaje por defecto
    return "No summary available yet.";
}

/* Actualiza el resumen en la UI con el nuevo contenido editado */
function updateSummaryInUI(newSummary) {
    const summarySection = document.querySelector('.speechmatics-summary-content');
    
    if (summarySection) {
        // Agregar animación de actualización
        summarySection.style.transition = 'opacity 0.3s ease';
        summarySection.style.opacity = '0.3';
        
        setTimeout(() => {
            // Convertir markdown a HTML
            summarySection.innerHTML = markdownToHtml(newSummary);
            summarySection.style.opacity = '1';
            
            // Remover indicador previo si existe
            const existingIndicator = summarySection.parentElement.querySelector('.summary-edited-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            
            // Agregar el nuevo indicador
            summarySection.parentElement.insertBefore(indicator, summarySection);
            
            // Hacer scroll al resumen actualizado
            summarySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }
}

/* Maneja el envío de mensajes del chat */
async function handleChatMessage() {
    const message = DOM.chatInput.value.trim();
    
    if (!message) return;
    
    // Verificar que hay una transcripción cargada
    if (!AppState.lastResult || !AppState.lastResult.transcription) {
        showError('Please process an audio file first before using the chat.');
        return;
    }
    
    // Detectar si es una instrucción de edición
    const isEdit = isEditInstruction(message);
    
    // Deshabilitar input y botón mientras se procesa
    DOM.chatInput.disabled = true;
    DOM.sendChatBtn.disabled = true;
    const originalBtnText = DOM.sendChatBtn.innerHTML;
    DOM.sendChatBtn.innerHTML = createSpinnerHTML(isEdit ? 'Editing...' : 'Thinking...');
    
    // Crear elemento de mensaje del usuario
    const userMessage = createChatMessage(message, 'user');
    appendChatMessage(userMessage);

    DOM.chatInput.value = ''; // Limpiar input
    
    try {
        if (isEdit) {
            // Es una instrucción de edición - llamar al endpoint de edición
            const currentSummary = getCurrentSummary();
            
            const response = await fetch('http://localhost:5000/api/edit-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    instruction: message,
                    current_summary: currentSummary,
                    context: AppState.lastResult.transcription
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error editing summary');
            }
            
            // Actualizar el resumen en la UI
            updateSummaryInUI(data.edited_summary);
            
            // Mostrar confirmación en el chat
            const confirmMessage = createChatMessage(
                'I have updated the summary based on your instruction. You can see the changes above.',
                'assistant'
            );
            appendChatMessage(confirmMessage);
            
        } else {
            // Es una pregunta normal - usar el chat estándar
            const response = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    context: AppState.lastResult.transcription
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error al procesar mensaje');
            }
            
            // Mostrar respuesta de la IA
            const aiMessage = createChatMessage(data.response, 'assistant');
            appendChatMessage(aiMessage);
        }
        
    } catch (error) {
        console.error('Error en chat:', error);
        const errorMessage = createChatMessage(
            `Sorry, I encountered an error: ${error.message}. Please make sure Gemini API key is configured.`,
            'assistant'
        );
        appendChatMessage(errorMessage);
    } finally {
        // Rehabilitar input y botón
        DOM.chatInput.disabled = false;
        DOM.sendChatBtn.disabled = false;
        DOM.sendChatBtn.innerHTML = originalBtnText;
        DOM.chatInput.focus();
    }
}

/* Crea un elemento de mensaje del chat */
function createChatMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message chat-message-${sender}`;
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = `chat-bubble chat-bubble-${sender}`;
    
    // Convertir markdown a HTML para mensajes del asistente
    if (sender === 'assistant') {
        bubbleDiv.innerHTML = markdownToHtml(text);
    } else {
        bubbleDiv.textContent = text;
    }
    
    messageDiv.appendChild(bubbleDiv);
    return messageDiv;
}

/* Agrega un mensaje al contenedor de chat */
function appendChatMessage(messageElement) {
    // Usar el contenedor existente del chat
    const messagesContainer = DOM.chatMessagesContainer;
    
    if (messagesContainer) {
        messagesContainer.appendChild(messageElement);
        // Scroll al último mensaje
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
}

/* Convierte markdown básico a HTML */
function markdownToHtml(text) {
    if (!text) return '';
    
    // Procesar línea por línea para manejar listas correctamente
    const lines = text.split('\n');
    const output = [];
    let inList = false;
    let listType = null; // 'ul' o 'ol'
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Detectar listas con viñetas (* o -)
        const bulletMatch = line.match(/^[\*\-]\s+(.+)$/);
        // Detectar listas numeradas (1. 2. etc.)
        const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
        
        if (bulletMatch) {
            // Es un item de lista con viñetas
            if (!inList || listType !== 'ul') {
                if (inList) output.push(`</${listType}>`);
                output.push('<ul>');
                inList = true;
                listType = 'ul';
            }
            output.push(`<li>${processInlineMarkdown(bulletMatch[1])}</li>`);
        } else if (numberedMatch) {
            // Es un item de lista numerada
            if (!inList || listType !== 'ol') {
                if (inList) output.push(`</${listType}>`);
                output.push('<ol>');
                inList = true;
                listType = 'ol';
            }
            output.push(`<li>${processInlineMarkdown(numberedMatch[1])}</li>`);
        } else {
            // No es un item de lista
            if (inList) {
                output.push(`</${listType}>`);
                inList = false;
                listType = null;
            }
            
            // Procesar headers
            if (line.startsWith('### ')) {
                output.push(`<h3>${processInlineMarkdown(line.substring(4))}</h3>`);
            } else if (line.startsWith('## ')) {
                output.push(`<h2>${processInlineMarkdown(line.substring(3))}</h2>`);
            } else if (line.startsWith('# ')) {
                output.push(`<h1>${processInlineMarkdown(line.substring(2))}</h1>`);
            } else if (line.trim() === '') {
                // Línea vacía - agregar espacio entre párrafos
                output.push('<br>');
            } else {
                // Línea normal
                output.push(processInlineMarkdown(line));
                // Agregar <br> solo si la siguiente línea no está vacía y no es parte de una lista
                if (i < lines.length - 1 && lines[i + 1].trim() !== '' && 
                    !lines[i + 1].match(/^[\*\-]\s+/) && !lines[i + 1].match(/^\d+\.\s+/)) {
                    output.push('<br>');
                }
            }
        }
    }
    
    // Cerrar lista si quedó abierta
    if (inList) {
        output.push(`</${listType}>`);
    }
    
    return output.join('');
}

/* Procesa formato inline de markdown (bold, italic, etc.) */
function processInlineMarkdown(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.+?)\*/g, '<em>$1</em>') // Italic (solo si no es bold)
        .replace(/__(.+?)__/g, '<strong>$1</strong>') // Bold alternativo
        .replace(/_(.+?)_/g, '<em>$1</em>'); // Italic alternativo
}

/* INICIALIZACIÓN */
/* Inicializa la aplicación */
function initApp() {
    console.log('Audio Summarizer initialized');
    
    // Verificar autenticación primero
    if (!checkAuthentication()) {
        return; // Si no está autenticado, se redirige al login
    }
    
    // Inicializar event listeners
    initializeEventListeners();
    
    // Cargar agentes disponibles
    loadUserAgents();
}

// Iniciar la aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Hacer disponible globalmente para debugging y extensiones
window.AppState = AppState;
window.handleAudioFile = handleAudioFile;
window.processAudio = processAudio;
window.clearCurrentAudio = clearCurrentAudio;
