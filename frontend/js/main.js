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
    console.log(`Bienvenido, ${user.first_name} ${user.last_name}`);
    
    // Renderizar Sidebar
    renderSidebar(user);
}

/* SIDEBAR FUNCTIONS */
function renderSidebar(user) {
    const role = user.role !== undefined ? parseInt(user.role) : 2; // Default to User if undefined
    
    // 1. Render User Card
    renderSidebarUserCard(user, role);
    
    // 2. Render Menu Items based on Role
    renderSidebarMenu(role);
}

function renderSidebarUserCard(user, role) {
    if (!DOM.sidebarUserCard) return;
    
    let roleName = 'User';
    let badgeClass = 'badge-user';
    
    if (role === 0) {
        roleName = 'Admin';
        badgeClass = 'badge-admin';
    } else if (role === 1) {
        roleName = 'Supervisor';
        badgeClass = 'badge-supervisor';
    }
    
    DOM.sidebarUserCard.innerHTML = `
        <div class="sidebar-user-avatar">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
        </div>
        <div class="sidebar-user-name">
            ${user.first_name} ${user.last_name}
        </div>
        <div class="role-badge ${badgeClass}">
            ${roleName}
        </div>
    `;
}

function renderSidebarMenu(role) {
    if (!DOM.sidebarNav) return;
    
    let menuHTML = '';
    
    // COMMON ITEMS (All roles usually have these, but priority varies)
    const myRecordings = `<a href="#" class="nav-item">
        <span class="nav-item-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
        </span>
        My Recordings
    </a>`;
    
    const newRecording = `<a href="#" class="nav-item active" onclick="toggleSidebar()"> <!-- Current Page -->
        <span class="nav-item-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
        </span>
        New Recording
    </a>`;
    
    const myAccount = `<a href="#" class="nav-item">
        <span class="nav-item-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
        </span>
        My Account
    </a>`;
    
    // BUILD MENU BASED ON ROLE
    
    if (role === 2) { // USUARIO GENERAL
        menuHTML += myRecordings;
        menuHTML += newRecording;
        
        menuHTML += `<div class="nav-group-title">Teams</div>`;
        menuHTML += `<a href="#" class="nav-item">
            <span class="nav-item-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
            </span>
            My Teams
        </a>`;
         // Sub-items could be dynamically loaded here
        menuHTML += `<a href="#" class="nav-item nav-sub-item">
             └─ Design Team
        </a>`;
        
        menuHTML += `<div class="nav-group-title">Account</div>`;
        menuHTML += myAccount;
        
    } else if (role === 1) { // SUPERVISOR
        menuHTML += myRecordings;
        menuHTML += newRecording;
        
        menuHTML += `<div class="nav-group-title">Team Management</div>`;
        menuHTML += `<a href="#" class="nav-item">
            <span class="nav-item-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
            </span>
            My Teams
        </a>`;
        menuHTML += `<a href="#" class="nav-item">
            <span class="nav-item-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"></path>
                </svg>
            </span>
            Team Recordings
        </a>`;
        
        menuHTML += `<div class="nav-group-title">Account</div>`;
        menuHTML += myAccount;
        
    } else if (role === 0) { // ADMIN
        menuHTML += myRecordings;
        menuHTML += newRecording;
        
        menuHTML += `<div class="nav-group-title">Administration</div>`;
        menuHTML += `<a href="#" class="nav-item">
            <span class="nav-item-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
            </span>
            All Recordings
        </a>`;
        menuHTML += `<a href="#" class="nav-item">
            <span class="nav-item-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
            </span>
            Users
        </a>`;
        menuHTML += `<a href="#" class="nav-item">
            <span class="nav-item-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
            </span>
            Teams
        </a>`;
        menuHTML += `<a href="#" class="nav-item">
            <span class="nav-item-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
            </span>
            Settings
        </a>`;
        
        menuHTML += `<div class="nav-group-title">Account</div>`;
        menuHTML += myAccount;
    }
    
    DOM.sidebarNav.innerHTML = menuHTML;
}

function toggleSidebar() {
    if (!DOM.appSidebar || !DOM.sidebarOverlay) {
        return;
    }
    
    const isOpen = DOM.appSidebar.classList.contains('open');
    
    if (isOpen) {
        // Cerrar sidebar
        DOM.appSidebar.classList.remove('open');
        DOM.sidebarOverlay.classList.remove('visible');
        DOM.sidebarOverlay.classList.add('hidden');
    } else {
        // Abrir sidebar
        DOM.appSidebar.classList.add('open');
        DOM.sidebarOverlay.classList.remove('hidden');
        DOM.sidebarOverlay.classList.add('visible');
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
    
    // Resetear todos los campos de contraseña a tipo password (ocultar)
    const passwordInputs = DOM.changePasswordModal.querySelectorAll('input[type="password"], input[type="text"]');
    passwordInputs.forEach(input => {
        if (input.id === 'currentPassword' || input.id === 'newPassword' || input.id === 'confirmPassword') {
            input.type = 'password';
        }
    });
    
    // Resetear los iconos de toggle
    const toggleButtons = DOM.changePasswordModal.querySelectorAll('.btn-toggle-password');
    toggleButtons.forEach(button => {
        const iconHide = button.querySelector('.icon-hide');
        const iconShow = button.querySelector('.icon-show');
        iconHide.classList.remove('hidden');
        iconShow.classList.add('hidden');
        button.title = 'Show password';
    });
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
    statusInterval: null // Intervalo para mensajes de carga
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
    
    // Sidebar
    appSidebar: document.getElementById('appSidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
    sidebarNav: document.getElementById('sidebarNav'),
    sidebarUserCard: document.getElementById('sidebarUserCard'),
    
    // Chat
    chatFooterStatic: document.getElementById('chatFooterStatic'),
    chatInput: document.getElementById('chatInput'),
    sendChatBtn: document.getElementById('sendChatBtn'),
    chatMessagesContainer: document.getElementById('chatMessagesContainer')
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
        
        // Obtener el idioma seleccionado
        const selectedLanguage = DOM.languageSelect ? DOM.languageSelect.value : 'en';
        
        const processData = {
            file_id: fileId,
            language: selectedLanguage
        };
        
        // Mostrar Skeleton Loader en lugar del spinner en botón
        DOM.processBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                 <path d="M10 3V17M10 17L15 12M10 17L5 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Processing...
        `;
        
        // Limpiar cualquier contenido previo y mostrar solo el skeleton
        DOM.summaryViewer.innerHTML = `
            <div id="loadingSkeleton" class="skeleton-loader" style="display: flex;">
                <div class="skeleton-line title"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
                <div id="loadingStatusText" class="loading-status">Processing audio...</div>
            </div>
        `;
        
        // Actualizar referencias del DOM
        DOM.loadingSkeleton = document.getElementById('loadingSkeleton');
        DOM.loadingStatusText = document.getElementById('loadingStatusText');
        
        // Iniciar rotación de textos de estado
        const statusMessages = [
            "Analyzing audio...",
            "Processing voices...",
            "Transcribing dialogues...",
            "Analyzing conversations...",
            "Identifying speakers...",
            "Extracting key points...",
            "Identifying insights...",
            "Structuring content...",
            "Generating summary..."
        ];
        let msgIndex = 0;
        if (DOM.loadingStatusText) DOM.loadingStatusText.textContent = statusMessages[0];
        
        // Guardar intervalo en AppState para poder limpiarlo globalmente si es necesario
        if (AppState.statusInterval) clearInterval(AppState.statusInterval);
        
        AppState.statusInterval = setInterval(() => {
            if (DOM.loadingStatusText && DOM.loadingSkeleton.style.display !== 'none') {
                msgIndex = (msgIndex + 1) % statusMessages.length;
                DOM.loadingStatusText.textContent = statusMessages[msgIndex];
            }
        }, 15000); 
        
        const processResponse = await fetch('http://localhost:5000/api/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(processData)
        });
        
        if (AppState.statusInterval) {
             clearInterval(AppState.statusInterval);
             AppState.statusInterval = null;
        }
        
        if (!processResponse.ok) {
            const error = await processResponse.json();
            throw new Error(error.error || 'Failed to process audio');
        }
        
        const result = await processResponse.json();
        
        console.log('Processing completed:', result);
        
        displaySummary(result); // Mostrar el resultado
        
        // Habilitar el chat
        DOM.chatInput.disabled = false;
        DOM.sendChatBtn.disabled = false;
        
    } catch (error) {
        console.error('Error processing audio:', error);
        showError('Error: ' + error.message);
        
        // En caso de error, mostrar placeholder
        DOM.summaryViewer.innerHTML = `
            <div class="summary-placeholder" id="summaryPlaceholder" style="display: flex;">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <line x1="10" y1="9" x2="8" y2="9"></line>
                </svg>
                <h3>Ready to summarize</h3>
                <p>Upload an audio file or start recording to generate insights.</p>
                <span class="placeholder-hint">Your summary will appear here</span>
            </div>
        `;
        
        // Actualizar referencia del DOM
        DOM.summaryPlaceholder = document.getElementById('summaryPlaceholder');
        
    } finally {
        if (AppState.statusInterval) {
             clearInterval(AppState.statusInterval);
             AppState.statusInterval = null;
        }
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
    if (DOM.recordBtn) {
        DOM.recordBtn.addEventListener('click', handleRecordButtonClick);
    }
    
    // Modal de selección de tipo de grabación
    if (DOM.closeRecordTypeModalBtn) {
        DOM.closeRecordTypeModalBtn.addEventListener('click', closeRecordTypeModal);
    }
    
    // Cerrar modal al hacer click fuera
    if (DOM.recordTypeModal) {
        DOM.recordTypeModal.addEventListener('click', (e) => {
            if (e.target === DOM.recordTypeModal) {
                closeRecordTypeModal();
            }
        });
    }
    
    // Manejar selección de tipo de grabación
    document.querySelectorAll('.record-type-option').forEach(button => {
        button.addEventListener('click', () => {
            const type = button.getAttribute('data-type');
            closeRecordTypeModal();
            startRecording(type);
        });
    });
    
    // Click en el botón de seleccionar archivo
    if (DOM.selectFileBtn && DOM.fileInput) {
        DOM.selectFileBtn.addEventListener('click', () => {
            DOM.fileInput.click();
        });
    }
    
    // Cambio en el input de archivo
    if (DOM.fileInput) {
        DOM.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleAudioFile(file);
            }
        });
    }
    
    // Drag and Drop en el upload box
    if (DOM.uploadBox) {
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
    }
    
    if (DOM.processBtn) {
        DOM.processBtn.addEventListener('click', processAudio);
    }
    
    // Botón de eliminar audio
    if (DOM.removeAudioBtn) {
        DOM.removeAudioBtn.addEventListener('click', clearCurrentAudio);
    }
    
    // Modales de error
    if (DOM.closeModalBtn) {
        DOM.closeModalBtn.addEventListener('click', closeErrorModal);
    }
    
    if (DOM.closeErrorBtn) {
        DOM.closeErrorBtn.addEventListener('click', closeErrorModal);
    }
    
    // Click fuera del modal para cerrar
    if (DOM.errorModal) {
        DOM.errorModal.addEventListener('click', (e) => {
            if (e.target === DOM.errorModal) {
                closeErrorModal();
            }
        });
    }
    
    if (DOM.sendChatBtn) {
        DOM.sendChatBtn.addEventListener('click', handleChatMessage);
    }
    
    if (DOM.chatInput) {
        DOM.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleChatMessage();
            }
        });
    }
    
    // User Menu (verificar que existan los elementos)
    if (DOM.btnUserMenu) {
        DOM.btnUserMenu.addEventListener('click', toggleUserMenu);
    }
    
    if (DOM.btnLogout) {
        DOM.btnLogout.addEventListener('click', logout);
    }
    
    if (DOM.btnChangePassword) {
        DOM.btnChangePassword.addEventListener('click', openChangePasswordModal);
    }
    
    // Change Password Modal
    if (DOM.closeChangePasswordModalBtn) {
        DOM.closeChangePasswordModalBtn.addEventListener('click', closeChangePasswordModal);
    }
    
    if (DOM.cancelChangePasswordBtn) {
        DOM.cancelChangePasswordBtn.addEventListener('click', closeChangePasswordModal);
    }
    
    if (DOM.submitChangePasswordBtn) {
        DOM.submitChangePasswordBtn.addEventListener('click', handleChangePassword);
    }
    
    // Toggle password visibility en Change Password Modal
    if (DOM.changePasswordModal) {
        const passwordToggleButtons = DOM.changePasswordModal.querySelectorAll('.btn-toggle-password');
        passwordToggleButtons.forEach(button => {
            button.addEventListener('click', function() {
                const targetId = this.getAttribute('data-target');
                const passwordInput = document.getElementById(targetId);
                const iconHide = this.querySelector('.icon-hide');
                const iconShow = this.querySelector('.icon-show');
                
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    iconHide.classList.add('hidden');
                    iconShow.classList.remove('hidden');
                    this.title = 'Hide password';
                } else {
                    passwordInput.type = 'password';
                    iconHide.classList.remove('hidden');
                    iconShow.classList.add('hidden');
                    this.title = 'Show password';
                }
            });
        });
        
        // Cerrar modal al hacer click fuera
        DOM.changePasswordModal.addEventListener('click', (e) => {
            if (e.target === DOM.changePasswordModal) {
                closeChangePasswordModal();
            }
        });
    }
    
    // Cerrar el menú de usuario al hacer click fuera
    if (DOM.userDropdown) {
        document.addEventListener('click', (e) => {
            if (!DOM.userDropdown.classList.contains('hidden')) {
                if (!e.target.closest('.user-menu-section')) {
                    closeUserMenu();
                }
            }
        });
    }
    
    // Sidebar Toggles
    if (DOM.sidebarToggleBtn) {
        DOM.sidebarToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleSidebar();
        });
    }
    
    if (DOM.sidebarOverlay) {
        DOM.sidebarOverlay.addEventListener('click', toggleSidebar);
    }
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
    // Ocultar el placeholder y el skeleton
    if (DOM.summaryPlaceholder) {
        DOM.summaryPlaceholder.style.display = 'none';
    }
    if (DOM.loadingSkeleton) {
        DOM.loadingSkeleton.style.display = 'none';
    }
    
    // Limpiar contenedor previo (manteniendo skeleton y placeholder si están dentro, pero mejor recrear)
    // Nota: summaryViewer contiene placeholder y skeleton. Si hacemos innerHTML = '', los borramos.
    // Mejor estrategia: Ocultar hijos directos y añadir el nuevo contenido, o limpiar y re-agregar.
    // Dado que createSummaryTabs crea toda la estructura, podemos limpiar.
    // PERO debemos asegurarnos de que si limpiamos, perdemos las referencias a DOM.loadingSkeleton.
    // Solución: Crear un contenedor específico para el contenido dinámico o volver a inyectar el skeleton si se limpia.
    
    // Limpiamos todo y manejamos la visibilidad con clases
    DOM.summaryViewer.innerHTML = '';
    
    // Re-agregar placeholder y skeleton ocultos para uso futuro (reset)
    DOM.summaryViewer.innerHTML = `
        <div class="summary-placeholder" id="summaryPlaceholder" style="display: none;">
             <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <line x1="10" y1="9" x2="8" y2="9"></line>
            </svg>
            <h3>Ready to summarize</h3>
            <p>Upload an audio file or start recording to generate insights.</p>
            <span class="placeholder-hint">Your summary will appear here</span>
        </div>
        <div id="loadingSkeleton" class="skeleton-loader" style="display: none;">
            <div class="skeleton-line title"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
            <div id="loadingStatusText" class="loading-status">Transcribing audio...</div>
        </div>
    `;
    
    // Actualizar referencias del DOM
    DOM.summaryPlaceholder = document.getElementById('summaryPlaceholder');
    DOM.loadingSkeleton = document.getElementById('loadingSkeleton');
    DOM.loadingStatusText = document.getElementById('loadingStatusText');
    
    AppState.lastResult = result; // Guardar el resultado en el estado global (incluye transcripción para el chat)
    
    const speechmaticsSummary = result.speechmatics_summary || null;
    
    // Resumen de Speechmatics
    let speechmaticsSummaryHTML = '';
    if (speechmaticsSummary && speechmaticsSummary.content) {
        const content = speechmaticsSummary.content.replace(/\n/g, '<br>');
        speechmaticsSummaryHTML = `
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
                    ${speechmaticsSummaryHTML}
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
    
    // Re-inicializar referencias DOM para asegurar que estén disponibles
    DOM.appSidebar = document.getElementById('appSidebar');
    DOM.sidebarOverlay = document.getElementById('sidebarOverlay');
    DOM.sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    DOM.sidebarNav = document.getElementById('sidebarNav');
    DOM.sidebarUserCard = document.getElementById('sidebarUserCard');
    
    // Inicializar event listeners
    initializeEventListeners();
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
window.toggleSidebar = toggleSidebar;
