# 🔧 Configuration Guide

## API Keys Setup

Este proyecto utiliza dos servicios principales:

### 1. **Speechmatics API** (Transcripción)
- **Propósito**: Transcripción precisa de audio con diarización de hablantes
- **Obtén tu API key**: https://portal.speechmatics.com/
- **Costo**: Pago por uso (aproximadamente $0.10 por minuto de audio)
- **Características**: 50+ idiomas, diarización, alta precisión

### 2. **Google Gemini API** (Resumen y Chat)
- **Propósito**: Generación de resúmenes inteligentes y chat interactivo
- **Obtén tu API key**: https://makersuite.google.com/app/apikey
- **Costo**: Tier gratuito generoso disponible
- **Características**: Análisis contextual, resúmenes estructurados, chat conversacional

## Configuración de Variables de Entorno

### Opción 1: Archivo .env (Recomendado)

Crea un archivo `.env` en la carpeta `backend/` con el siguiente contenido:

```bash
# API Keys
SPEECHMATICS_API_KEY=tu_speechmatics_api_key_aqui
GEMINI_API_KEY=tu_gemini_api_key_aqui

# Server Config (Optional)
PORT=5000
DEBUG=True
```

### Opción 2: Variables de Sistema

#### Windows (PowerShell):
```powershell
$env:SPEECHMATICS_API_KEY="tu_speechmatics_api_key"
$env:GEMINI_API_KEY="tu_gemini_api_key"
```

#### Windows (CMD):
```cmd
set SPEECHMATICS_API_KEY=tu_speechmatics_api_key
set GEMINI_API_KEY=tu_gemini_api_key
```

#### macOS/Linux:
```bash
export SPEECHMATICS_API_KEY="tu_speechmatics_api_key"
export GEMINI_API_KEY="tu_gemini_api_key"
```

## Verificación de Configuración

Al iniciar el servidor, verás un reporte de configuración:

```
============================================================
🔑 CONFIGURACIÓN DE API KEYS
============================================================
✅ SPEECHMATICS_API_KEY configurada correctamente
✅ GEMINI_API_KEY configurada correctamente
============================================================
```

Si alguna API key falta, verás advertencias:
```
⚠️  GEMINI_API_KEY no está configurada
   Las funciones de IA (resumen inteligente y chat) no estarán disponibles
   Obtén tu API key en: https://makersuite.google.com/app/apikey
```

## Arquitectura del Sistema

```
┌─────────────┐
│   Audio     │
│   File      │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│   SPEECHMATICS      │  ← Transcripción precisa
│   - ASR Engine      │     con diarización
│   - Speaker ID      │
└──────┬──────────────┘
       │
       ▼
   [Transcripción]
       │
       ├──────────────────────────┐
       │                          │
       ▼                          ▼
┌─────────────────┐    ┌─────────────────────┐
│ Resumen Básico  │    │   GEMINI 2.0        │
│ - Estadísticas  │    │ - Resumen IA        │
│ - Hablantes     │    │ - Análisis          │
└─────────────────┘    └──────┬──────────────┘
       │                       │
       └───────┬───────────────┘
               ▼
       ┌──────────────┐
       │   Frontend   │
       │   + Chat     │ ← Chat con Gemini
       └──────────────┘
```

## Solución de Problemas

### Error: "SPEECHMATICS_API_KEY no está configurada"
- Verifica que el archivo `.env` existe en `backend/`
- Verifica que el archivo no tiene errores de sintaxis
- Asegúrate de reiniciar el servidor después de modificar `.env`

### Error: "google-generativeai no está instalado"
```bash
pip install google-generativeai==0.8.3
```

### Error: "Transcription failed"
- Verifica que tu API key de Speechmatics es válida
- Asegúrate de tener créditos en tu cuenta
- Verifica que el formato de audio es compatible (MP3, WAV, FLAC, etc.)

### Error en Chat: "Gemini API key is required"
- Verifica que `GEMINI_API_KEY` está configurada
- Asegúrate de haber procesado un audio antes de usar el chat
- Verifica que la API key es válida en https://makersuite.google.com/

## Costos Estimados

### Escenario: Reunión de 30 minutos

**Speechmatics:**
- 30 minutos × $0.10/min = $3.00

**Gemini 2.0 Flash:**
- Resumen: ~2,000 tokens = $0.01 (aprox)
- Chat (5 preguntas): ~5,000 tokens = $0.02 (aprox)
- **Total Gemini**: $0.03

**Total por reunión**: ~$3.03

### Optimizaciones de Costos

1. **Usar solo transcripción básica**: Desactiva Gemini
2. **Procesar en batch**: Acumula varios audios
3. **Límite de longitud**: Limita la longitud máxima de audio

## Seguridad

⚠️ **IMPORTANTE**: Nunca compartas tus API keys públicamente

- No subas archivos `.env` a Git
- El archivo `.env` debe estar en `.gitignore` (ya configurado)
- Usa variables de entorno en producción
- Rota tus API keys periódicamente

## Preguntas Frecuentes

**P: ¿Puedo usar solo Speechmatics sin Gemini?**
R: Sí, el sistema funcionará pero sin resúmenes de IA ni chat interactivo.

**P: ¿Puedo usar otro servicio en lugar de Speechmatics?**
R: Técnicamente sí, pero perderías la diarización precisa de hablantes.

**P: ¿Gemini Live vs Gemini 2.0 Flash?**
R: Usamos Gemini 2.0 Flash porque es más económico y suficiente para procesamiento post-transcripción.

**P: ¿Qué datos se envían a las APIs?**
R: Solo el audio (Speechmatics) y el texto transcrito (Gemini). Ningún dato personal adicional.

