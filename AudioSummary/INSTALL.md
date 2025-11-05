# 🔧 Guía de Instalación y Configuración

## Instalación Rápida (Windows)

### Opción 1: Usando el script automático

1. Haz doble clic en `start_server.bat`
2. El script verificará e instalará las dependencias automáticamente
3. Abre tu navegador en `http://localhost:5000/frontend`

### Opción 2: Manual

1. Abre PowerShell o CMD en la carpeta del proyecto (raíz)
2. Ejecuta:
```bash
pip install -r requirements.txt
python app.py
```
3. Abre tu navegador en `http://localhost:5000/frontend`

## Instalación Rápida (Linux/Mac)

### Opción 1: Usando el script automático

1. Dale permisos de ejecución al script:
```bash
chmod +x start_server.sh
```

2. Ejecuta el script:
```bash
./start_server.sh
```

3. Abre tu navegador en `http://localhost:5000/frontend`

### Opción 2: Manual

```bash
pip3 install -r requirements.txt
python3 app.py
```

Abre tu navegador en `http://localhost:5000/frontend`

## Configuración de API Key

### Método 1: Archivo .env (Recomendado)

1. En la carpeta `backend/`, crea un archivo llamado `.env`
2. Agrega tu API key:
```env
SPEECHMATICS_API_KEY=tu_api_key_aqui
```

### Método 2: Variable de entorno del sistema

**Windows:**
```bash
set SPEECHMATICS_API_KEY=tu_api_key_aqui
python app.py
```

**Linux/Mac:**
```bash
export SPEECHMATICS_API_KEY=tu_api_key_aqui
python3 app.py
```

### Método 3: Ingreso manual

Si no configuras la API key, la aplicación te la pedirá cada vez que proceses un audio.

## Obtener API Key de Speechmatics

1. Ve a [portal.speechmatics.com](https://portal.speechmatics.com/)
2. Crea una cuenta o inicia sesión
3. Ve a la sección "API Keys"
4. Copia tu API key
5. Pégala en el archivo `.env` o ingrésala cuando la aplicación lo solicite

**Nota:** Speechmatics ofrece créditos gratuitos para nuevas cuentas.

## Verificar Instalación

### 1. Verifica que Python esté instalado

```bash
python --version
# o
python3 --version
```

Debe mostrar Python 3.8 o superior.

### 2. Verifica las dependencias

```bash
cd backend
pip list
```

Deberías ver:
- Flask
- flask-cors
- httpx
- y otras dependencias

### 3. Prueba el servidor

```bash
python app.py
```

Deberías ver:
```
🚀 Iniciando servidor en http://localhost:5000
📁 Frontend disponible en http://localhost:5000/frontend
```

### 4. Prueba la API

Abre `http://localhost:5000/api/health` en tu navegador.

Deberías ver:
```json
{
  "status": "healthy",
  "message": "Server is running"
}
```

## Solución de Problemas Comunes

### Error: "python no se reconoce como un comando"

**Solución:** Instala Python desde [python.org](https://python.org) y asegúrate de marcar "Add Python to PATH" durante la instalación.

### Error: "pip no se reconoce como un comando"

**Solución:** Python viene con pip incluido. Si no funciona:

**Windows:**
```bash
python -m pip install -r requirements.txt
```

**Linux/Mac:**
```bash
python3 -m pip install -r requirements.txt
```

### Error: "ModuleNotFoundError: No module named 'flask'"

**Solución:** Las dependencias no están instaladas:
```bash
pip install -r requirements.txt
```

### Error: "Address already in use" / Puerto 5000 ocupado

**Solución:** Cambia el puerto en `backend/app.py` o usa variable de entorno:
```bash
PORT=8080 python app.py
```

### Error al procesar audio: "API key is required"

**Solución:** Configura tu API key usando cualquiera de los métodos descritos arriba.

### Error: "File too large. Maximum size is 100MB"

**Solución 1:** Reduce el tamaño del archivo de audio.

**Solución 2:** Aumenta el límite en `app.py`:
```python
app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024  # 200MB
```

## Requisitos del Sistema

- **Python:** 3.8 o superior
- **RAM:** Mínimo 2GB, recomendado 4GB
- **Espacio en disco:** ~500MB para la aplicación + espacio para archivos de audio
- **Conexión a Internet:** Requerida para usar la API de Speechmatics
- **Navegador:** Chrome, Firefox, Safari o Edge (versiones recientes)

## Configuración Avanzada

### Cambiar el idioma por defecto

Edita `frontend/js/main.js`, línea ~260:
```javascript
const processData = {
    file_id: fileId,
    language: 'en'  // 'es' para español, 'en' para inglés, etc.
};
```

### Habilitar modo de producción

En el archivo `.env`:
```env
DEBUG=False
```

### Configurar múltiples workers (producción)

Usa Gunicorn en lugar del servidor de desarrollo de Flask:

1. Instala Gunicorn:
```bash
pip install gunicorn
```

2. Ejecuta:
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## Siguientes Pasos

Una vez instalado y funcionando:

1. Lee el [README.md](README.md) para conocer todas las funcionalidades
2. Sube tu primer archivo de audio
3. Explora las opciones de personalización
4. Considera integrar servicios de IA adicionales (Gemini, OpenAI, Claude)

## ¿Necesitas Ayuda?

Si tienes problemas con la instalación:

1. Revisa esta guía completa
2. Verifica los mensajes de error en la consola
3. Busca el error específico en Google
4. Abre un issue en el repositorio del proyecto

---

**¡Listo para comenzar!** 🚀

