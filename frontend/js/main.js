/* AUDIO SUMMARIZER - MAIN SCRIPT */
// Estado global de la aplicación
const AppState = {
    currentAudioFile: null,
    audioURL: null,
    isProcessing: false,
    lastResult: null,
    audioRecorder: null,
    isRecording: false,
    recordingStartTime: null,
};

// Elementos del DOM
const DOM = {
    // Upload Section
    uploadBox: document.getElementById('uploadBox'),
    fileInput: document.getElementById('fileInput'),
    selectFileBtn: document.getElementById('selectFileBtn'),
    recordBtn: document.getElementById('recordBtn'),
    documentsQueue: document.getElementById('documentsQueue'),
    queueList: document.getElementById('queueList'),
    processAllBtn: document.getElementById('processAllBtn'),
    
    // Preview Section
    previewSection: document.getElementById('previewSection'),
    documentsViewer: document.getElementById('documentsViewer'),
    documentsTabs: document.getElementById('documentsTabs'),
    tabsHeader: document.getElementById('tabsHeader'),
    
    // Modals
    errorModal: document.getElementById('errorModal'),
    errorMessage: document.getElementById('errorMessage'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    closeErrorBtn: document.getElementById('closeErrorBtn'),
    
    // Chat Footer Estático
    chatFooterStatic: document.getElementById('chatFooterStatic'),
    chatInput: document.getElementById('chatInput'),
    sendChatBtn: document.getElementById('sendChatBtn')
};

/* UTILIDADES */
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
        showError('Invalid file type. Please select an audio or video file (MP3, WAV, M4A, MP4, AVI, MOV, MKV, etc.).');
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
    
    // Mostrar el archivo en la cola
    displayAudioInQueue(file, duration);
    
    // Mostrar la sección de cola
    DOM.documentsQueue.classList.remove('hidden');
}

/* Muestra el archivo de audio en la cola */
function displayAudioInQueue(file, duration) {
    DOM.queueList.innerHTML = ''; // Limpiar la lista
    
    // Crear elemento de audio
    const audioItem = document.createElement('div');
    audioItem.className = 'queue-item';
    audioItem.innerHTML = `
        <div class="queue-item-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
            </svg>
        </div>
        <div class="queue-item-info">
            <h4 class="queue-item-name">${file.name}</h4>
            <div class="queue-item-meta">
                <span class="queue-item-size">${formatFileSize(file.size)}</span>
                <span class="queue-item-separator">•</span>
                <span class="queue-item-duration">${formatDuration(duration)}</span>
            </div>
            <div class="audio-player-container">
                <audio controls class="audio-player">
                    <source src="${AppState.audioURL}" type="${file.type}">
                    Your browser does not support the audio element.
                </audio>
            </div>
        </div>
        <button class="btn-close btn-remove-item" title="Remove file">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    
    // Agregar evento para eliminar
    const removeBtn = audioItem.querySelector('.btn-close');
    removeBtn.addEventListener('click', () => clearCurrentAudio());
    
    DOM.queueList.appendChild(audioItem);
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
    DOM.queueList.innerHTML = '';
    DOM.documentsQueue.classList.add('hidden');
    
    DOM.fileInput.value = ''; // Reset input
}

/* FUNCIONES DE GRABACIÓN */
/* Inicia la grabación de audio */
async function startRecording() {
    try {
        // Si ya hay un archivo cargado, limpiar
        if (AppState.currentAudioFile) {
            clearCurrentAudio();
        }

        // Crear el recorder si no existe
        if (!AppState.audioRecorder) {
            AppState.audioRecorder = new AudioRecorder();
        }

        // Iniciar grabación
        await AppState.audioRecorder.startRecording();
        AppState.isRecording = true;
        AppState.recordingStartTime = Date.now();

        // Actualizar UI del botón
        DOM.recordBtn.classList.add('recording');
        DOM.recordBtn.title = 'Stop Recording';
        
        // Cambiar ícono a cuadrado de detener
        DOM.recordBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" ry="2"/>
            </svg>
        `;
        
        // Deshabilitar otros controles durante la grabación
        DOM.selectFileBtn.disabled = true;
        DOM.fileInput.disabled = true;

        updateRecordingTimer(); // Mostrar indicador de tiempo de grabación

    } catch (error) {
        console.error('Error starting recording:', error);
        showError(error.message);
        AppState.isRecording = false;
        
        // Restaurar el botón en caso de error
        DOM.recordBtn.classList.remove('recording');
        DOM.recordBtn.title = 'Record Audio';
        DOM.selectFileBtn.disabled = false;
        DOM.fileInput.disabled = false;
    }
}

/* Detiene la grabación de audio */
async function stopRecording() {
    try {
        if (!AppState.audioRecorder || !AppState.isRecording) {
            return;
        }

        // Detener el timer
        if (AppState.recordingTimer) {
            clearInterval(AppState.recordingTimer);
            AppState.recordingTimer = null;
        }

        // Detener grabación y obtener el blob
        const audioBlob = await AppState.audioRecorder.stopRecording();
        AppState.isRecording = false;

        // Convertir blob a File
        const fileName = `recording_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
        const audioFile = new File([audioBlob], fileName, { type: 'audio/webm' });

        // Guardar el archivo en el estado
        AppState.currentAudioFile = audioFile;
        AppState.audioURL = URL.createObjectURL(audioFile);

        const duration = (Date.now() - AppState.recordingStartTime) / 1000; // Calcular duración de la grabación

        displayAudioInQueue(audioFile, duration); // Mostrar el archivo en la cola

        DOM.documentsQueue.classList.remove('hidden'); // Mostrar la sección de cola

        // Restaurar UI del botón
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

    } catch (error) {
        console.error('Error stopping recording:', error);
        showError('Error stopping recording: ' + error.message);
        AppState.isRecording = false;
        
        // Asegurar que el botón se restaure en caso de error
        DOM.recordBtn.classList.remove('recording');
        DOM.recordBtn.title = 'Record Audio';
        DOM.recordBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
        `;
        DOM.selectFileBtn.disabled = false;
        DOM.fileInput.disabled = false;
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

/* Maneja el click en el botón de grabar */
function handleRecordButtonClick() {
    if (AppState.isRecording) {
        stopRecording();
    } else {
        startRecording();
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
    DOM.processAllBtn.disabled = true;
    DOM.processAllBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
        </svg>
        Processing...
    `;
    
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
        
        const processData = {
            file_id: fileId,
            language: 'en'
        };
        
        DOM.processAllBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
            </svg>
            Transcribing... (this may take a few minutes)
        `;
        
        const processResponse = await fetch('http://localhost:5000/api/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(processData)
        });
        
        if (!processResponse.ok) {
            const error = await processResponse.json();
            throw new Error(error.error || 'Failed to process audio');
        }
        
        const result = await processResponse.json();
        
        console.log('Processing completed:', result);
        
        displaySummary(result); // Mostrar el resultado
        
        DOM.previewSection.classList.remove('hidden'); // Sección de preview
        
        DOM.chatFooterStatic.classList.remove('hidden'); // Chat footer estático
        
        DOM.previewSection.scrollIntoView({ behavior: 'smooth' }); // Scroll hacia los resultados
        
    } catch (error) {
        console.error('Error processing audio:', error);
        showError('Error: ' + error.message);
    } finally {
        AppState.isProcessing = false;
        DOM.processAllBtn.disabled = false;
        DOM.processAllBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 3V17M10 17L15 12M10 17L5 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Process Audio File
        `;
    }
}

/* EVENT LISTENERS */
/* Inicializa todos los event listeners */
function initializeEventListeners() {
    DOM.recordBtn.addEventListener('click', handleRecordButtonClick); // Click en el botón de grabar
    
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
    
    DOM.processAllBtn.addEventListener('click', processAudio); // Botón de procesar
    
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
}

/* Formatea la transcripción con identificación visual de hablantes */
function formatTranscriptionWithSpeakers(result) {
    if (!result.dialogues || result.dialogues.length === 0) {
        // Fallback al formato antiguo si no hay diálogos estructurados
        return result.transcription ? result.transcription.replace(/\n/g, '<br>') : 'No transcription available';
    }
    
    // Colores para diferentes hablantes
    const speakerColors = [
        '#3B82F6', // Azul
        '#10B981', // Verde
        '#F59E0B', // Naranja
        '#EF4444', // Rojo
        '#8B5CF6', // Púrpura
        '#EC4899', // Rosa
        '#14B8A6', // Turquesa
        '#F97316', // Naranja oscuro
    ];
    
    let html = '<div class="dialogues-container">';
    
    result.dialogues.forEach((dialogue, index) => {
        const speakerId = dialogue.speaker;
        const colorIndex = (speakerId.charCodeAt(0) - 65) % speakerColors.length; // A=0, B=1, etc.
        const color = speakerColors[colorIndex];
        
        html += `
            <div class="dialogue-block" data-speaker="${speakerId}">
                <div class="speaker-label" style="background-color: ${color}20; border-left: 4px solid ${color};">
                    <span class="speaker-name" style="color: ${color};">Speaker ${speakerId}</span>
                </div>
                <div class="speaker-text">
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
    // Limpiar contenedor previo
    DOM.documentsViewer.innerHTML = '';
    DOM.tabsHeader.innerHTML = '';
    
    AppState.lastResult = result; // Guardar el resultado en el estado global (incluye transcripción para el chat)
    
    // Crear panel de resumen
    const panel = document.createElement('div');
    panel.className = 'document-panel active';
    
    const summary = result.summary; // Construir HTML del resumen
    const speechmaticsSummary = result.speechmatics_summary || null;
    
    // Resumen de Speechmatics
    let speechmaticsSummaryHTML = '';
    if (speechmaticsSummary && speechmaticsSummary.content) {
        const content = speechmaticsSummary.content.replace(/\n/g, '<br>');
        speechmaticsSummaryHTML = `
            <div class="summary-section speechmatics-summary-section">
                <h3>Audio Summary (Speechmatics)</h3>
                <div class="speechmatics-summary-content">
                    ${content}
                </div>
            </div>
        `;
    }
    
    panel.innerHTML = `
        <div class="summary-container">
            <div class="summary-header">
                <h2>Summary</h2>
            </div>
            
            ${speechmaticsSummaryHTML}
            
            <div class="summary-section">
                <div class="transcription-toggle">
                    <button class="transcription-toggle-btn" id="toggleTranscription">
                        <svg class="toggle-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span>Show Full Transcription</span>
                    </button>
                </div>
                <div class="transcription-text hidden" id="transcriptionContent">
                    ${formatTranscriptionWithSpeakers(result)}
                </div>
            </div>
        </div>
    `;
    
    DOM.documentsViewer.appendChild(panel);
    
    // Agregar event listener para el toggle de transcripción
    const toggleBtn = document.getElementById('toggleTranscription');
    const transcriptionContent = document.getElementById('transcriptionContent');
    
    if (toggleBtn && transcriptionContent) {
        toggleBtn.addEventListener('click', () => {
            transcriptionContent.classList.toggle('hidden');
            const isHidden = transcriptionContent.classList.contains('hidden');
            const icon = toggleBtn.querySelector('.toggle-icon');
            const text = toggleBtn.querySelector('span');
            
            if (isHidden) {
                icon.style.transform = 'rotate(0deg)';
                text.textContent = 'Show Full Transcription';
            } else {
                icon.style.transform = 'rotate(180deg)';
                text.textContent = 'Hide Full Transcription';
            }
        });
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
    
    // Deshabilitar input y botón mientras se procesa
    DOM.chatInput.disabled = true;
    DOM.sendChatBtn.disabled = true;
    const originalBtnText = DOM.sendChatBtn.innerHTML;
    DOM.sendChatBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"></circle>
        </svg>
        Thinking...
    `;
    
    // Crear elemento de mensaje del usuario
    const userMessage = createChatMessage(message, 'user');
    appendChatMessage(userMessage);

    DOM.chatInput.value = ''; // Limpiar input
    
    try {
        // Enviar mensaje al backend
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
    // Si no existe un contenedor de mensajes, crearlo
    let messagesContainer = document.querySelector('.chat-messages-container');
    
    if (!messagesContainer) {
        messagesContainer = document.createElement('div');
        messagesContainer.className = 'chat-messages-container';
        
        // Insertar antes del chat footer
        DOM.chatFooterStatic.insertBefore(
            messagesContainer,
            DOM.chatFooterStatic.firstChild
        );
    }
    
    messagesContainer.appendChild(messageElement);

    messageElement.scrollIntoView({ behavior: 'smooth', block: 'end' });// Scroll al último mensaje
}

/* Convierte markdown básico a HTML */
function markdownToHtml(text) {
    return text
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')// Italic
        .replace(/\n/g, '<br>')// Line breaks
        // Lists
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
}

/* INICIALIZACIÓN */
/* Inicializa la aplicación */
function initApp() {
    console.log('Audio Summarizer initialized');
    
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
