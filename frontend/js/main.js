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
    recordingTimer: null,
    recordingType: null, // 'microphone', 'system', 'both'
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
    languageSelect: document.getElementById('languageSelect'),
    
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
    recordTypeModal: document.getElementById('recordTypeModal'),
    closeRecordTypeModalBtn: document.getElementById('closeRecordTypeModalBtn'),
    
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

        displayAudioInQueue(audioFile, duration); // Mostrar el archivo en la cola
        DOM.documentsQueue.classList.remove('hidden'); // Mostrar la sección de cola

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

        displayAudioInQueue(audioFile, duration);

        DOM.documentsQueue.classList.remove('hidden');

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
        
        // Obtener el idioma seleccionado
        const selectedLanguage = DOM.languageSelect ? DOM.languageSelect.value : 'en';
        
        const processData = {
            file_id: fileId,
            language: selectedLanguage
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
    
    // Resumen inteligente de IA
    /* let aiSummaryHTML = '';
    if (aiSummary) {
        aiSummaryHTML = `
            <div class="summary-section ai-summary-section">
                <h3>AI-Generated Summary (Gemini)</h3>
                
                ${aiSummary.resumen_ejecutivo ? `
                    <div class="ai-executive-summary">
                        <h4>Executive Summary</h4>
                        <p>${aiSummary.resumen_ejecutivo}</p>
                    </div>
                ` : ''}
                
                ${aiSummary.temas_principales && aiSummary.temas_principales.length > 0 ? `
                    <div class="ai-topics">
                        <h4>Main Topics</h4>
                        <ul>
                            ${aiSummary.temas_principales.map(tema => `<li>${tema}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${aiSummary.decisiones_tomadas && aiSummary.decisiones_tomadas.length > 0 ? `
                    <div class="ai-decisions">
                        <h4>Decisions Made</h4>
                        <ul>
                            ${aiSummary.decisiones_tomadas.map(decision => `<li>${decision}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${aiSummary.tareas_asignadas && aiSummary.tareas_asignadas.length > 0 ? `
                    <div class="ai-tasks">
                        <h4>Assigned Tasks</h4>
                        <ul>
                            ${aiSummary.tareas_asignadas.map(tarea => `<li>${tarea}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${aiSummary.proximos_pasos && aiSummary.proximos_pasos.length > 0 ? `
                    <div class="ai-next-steps">
                        <h4>Next Steps</h4>
                        <ul>
                            ${aiSummary.proximos_pasos.map(paso => `<li>${paso}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    } */
    
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
    DOM.sendChatBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"></circle>
        </svg>
        ${isEdit ? 'Editing...' : 'Thinking...'}
    `;
    
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
