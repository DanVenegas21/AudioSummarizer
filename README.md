# Audio Summarizer

Sistema completo para transcribir, resumir y analizar audio/video usando Speechmatics AI y Google Gemini.

## Características

- **Transcripción de Audio/Video**: Utiliza Speechmatics API para transcripción precisa con identificación de hablantes
- **Múltiples Fuentes de Audio**:
  - Subir archivos de audio (MP3, WAV, M4A, OGG, FLAC, AAC, WEBM)
  - Subir archivos de video (MP4, AVI, MOV, MKV, etc.) - extrae el audio automáticamente
  - Grabar desde micrófono
  - Grabar audio del sistema (loopback)
  - Grabar micrófono + audio del sistema simultáneamente
- **Resúmenes Inteligentes**: Genera resúmenes usando Speechmatics Summary
- **Chat Inteligente**: Pregunta sobre el contenido de la transcripción usando Google Gemini AI
- **Identificación de Hablantes**: Detecta y distingue automáticamente entre diferentes hablantes
- **Interfaz Web Moderna**: UI responsive y fácil de usar

## Requisitos Previos

- Python 3.8 o superior
- Node.js (opcional, solo para desarrollo frontend)
- API Key de Speechmatics
- API Key de Google Gemini (para funcionalidad de chat)

### Dependencias del Sistema

#### Windows
```bash
# Instalar Python desde python.org
# Instalar Visual C++ Build Tools (para soundcard)
```

#### Linux/Ubuntu
```bash
sudo apt update
sudo apt install python3 python3-pip portaudio19-dev
```

#### macOS
```bash
brew install python portaudio
```

## Instalación

### 1. Clonar el repositorio
```bash
cd AudioSummary
```

### 2. Crear entorno virtual (recomendado)
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 3. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 4. Configurar variables de entorno

Crea un archivo `backend/.env` con tus API keys:

```env
# API de Speechmatics (requerida)
SPEECHMATICS_API_KEY=tu_api_key_de_speechmatics

# API de Google Gemini (requerida para chat)
GEMINI_API_KEY=tu_api_key_de_gemini

# Configuración del servidor (opcional)
PORT=5000
DEBUG=True
```

### 5. Verificar instalación
```bash
python -c "import soundcard; print('soundcard OK')"
python -c "import moviepy.editor; print('moviepy OK')"
```

## Uso

### Iniciar el servidor

```bash
python app.py
```

El servidor estará disponible en:
- **Frontend**: http://localhost:5000/frontend
- **API**: http://localhost:5000/api

### Usar la aplicación web

1. Abre http://localhost:5000/frontend en tu navegador
2. Elige una de las siguientes opciones:
   - **Subir archivo**: Arrastra o selecciona un archivo de audio/video
   - **Grabar audio**: Haz clic en el botón de grabación y elige:
     - Solo micrófono
     - Solo audio del sistema
     - Micrófono + audio del sistema
3. Selecciona el idioma de transcripción
4. Haz clic en "Generate Summary"
5. Espera a que se procese (puede tomar algunos minutos)
6. Revisa la transcripción y el resumen
7. Usa el chat para hacer preguntas sobre el contenido

## Estructura del Proyecto

```
AudioSummary/
├── app.py                      # Servidor Flask principal
├── requirements.txt            # Dependencias Python
├── backend/
│   ├── transcription_service.py  # Servicio de transcripción (Speechmatics)
│   ├── summary_service.py        # Servicio de resumen y chat (Gemini)
│   ├── video_service.py          # Extracción de audio de video
│   └── system_Audio.py           # Grabación de audio del sistema
├── frontend/
│   ├── index.html              # Interfaz web
│   ├── styles.css              # Estilos
│   └── js/
│       ├── main.js            # Lógica principal
│       └── recorder.js        # Grabación de audio del navegador
└── uploads/                   # Archivos temporales (auto-limpiado)
```

## API Endpoints

### `POST /api/upload`
Sube un archivo de audio o video.

**Body**: FormData con campo `audio`

**Response**:
```json
{
  "success": true,
  "file_id": "abc123.mp3",
  "filename": "recording.mp3",
  "size": 1234567
}
```

### `POST /api/process`
Procesa un archivo (transcribe y resume).

**Body**:
```json
{
  "file_id": "abc123.mp3",
  "language": "en"
}
```

**Response**:
```json
{
  "success": true,
  "transcription": "Texto completo...",
  "dialogues": [{"speaker": "A", "text": "..."}],
  "summary": "Resumen básico...",
  "speechmatics_summary": {"content": "Resumen de Speechmatics..."}
}
```

### `POST /api/start-system-recording`
Inicia grabación continua de audio.

**Body**:
```json
{
  "type": "microphone" | "system" | "both"
}
```

### `POST /api/stop-system-recording`
Detiene grabación y devuelve el archivo.

### `POST /api/chat`
Chat con IA sobre la transcripción.

**Body**:
```json
{
  "message": "¿De qué trata esta conversación?",
  "context": "Transcripción completa..."
}
```

## Solución de Problemas

### Error: "No se encontró un dispositivo de audio"
- **Windows**: Verifica que el dispositivo de audio esté habilitado en Configuración de sonido
- **Linux**: Instala `pulseaudio` o `pipewire`
- **macOS**: Otorga permisos de micrófono a Terminal/Python

### Error: "Failed to extract audio from video"
- Verifica que `moviepy` esté instalado correctamente
- Asegúrate de que el video tenga pista de audio
- Intenta con un formato de video diferente

### Error: "Speechmatics API key is required"
- Verifica que el archivo `backend/.env` existe
- Confirma que `SPEECHMATICS_API_KEY` esté configurada correctamente
- Reinicia el servidor después de configurar

### La grabación del sistema no funciona
- **Windows**: Necesitas un driver de audio con soporte loopback (la mayoría lo tienen)
- **Linux**: Configura PulseAudio loopback module
- **macOS**: Puede requerir software adicional como BlackHole

## Características Técnicas

- **Framework**: Flask 3.0
- **Transcripción**: Speechmatics Python SDK
- **IA**: Google Gemini AI
- **Audio**: soundcard, soundfile
- **Video**: moviepy
- **Frontend**: Vanilla JavaScript (sin frameworks)

## Contribuir

Las contribuciones son bienvenidas. Por favor:
1. Haz fork del proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## Soporte

Para preguntas o problemas:
- Revisa la documentación en la carpeta del proyecto
- Verifica los logs del servidor
- Asegúrate de que todas las API keys estén configuradas correctamente

---

**Desarrollado por**: The Law Offices of Manuel Solis


