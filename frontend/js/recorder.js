/* AUDIO RECORDER MODULE */

class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
        this.isRecording = false;
    }

    async startRecording() {
        try {
            // Solicitar acceso al micrófono
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true
                } 
            });

            // Crear MediaRecorder
            const options = {
                mimeType: 'audio/webm;codecs=opus',
                audioBitsPerSecond: 128000
            };

            // Verificar si el formato es soportado
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                // Fallback a formato por defecto
                this.mediaRecorder = new MediaRecorder(this.stream);
            } else {
                this.mediaRecorder = new MediaRecorder(this.stream, options);
            }

            this.audioChunks = [];

            // Evento cuando hay datos disponibles
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            // Iniciar grabación
            this.mediaRecorder.start();
            this.isRecording = true;

            console.log('Recording started');
            return true;

        } catch (error) {
            console.error('Error starting recording:', error);
            throw new Error('Could not access microphone. Please ensure you have granted microphone permissions.');
        }
    }

    stopRecording() {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder || !this.isRecording) {
                reject(new Error('No recording in progress'));
                return;
            }

            this.mediaRecorder.onstop = () => {
                // Crear blob de audio
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                
                // Detener el stream
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                    this.stream = null;
                }

                this.isRecording = false;
                console.log('Recording stopped');
                
                resolve(audioBlob);
            };

            this.mediaRecorder.stop();
        });
    }

    cancelRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
            this.audioChunks = [];
            this.isRecording = false;
        }
    }

    getRecordingState() {
        return this.isRecording;
    }
}

// Exportar para uso global
window.AudioRecorder = AudioRecorder;

