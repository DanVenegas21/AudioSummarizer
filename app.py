"""
Servidor Flask para Audio Summarizer
Este servidor proporciona una API REST para transcribir y resumir archivos de audio
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from pathlib import Path
import uuid
from werkzeug.utils import secure_filename
import logging

# Cargar variables de entorno desde backend/.env
try:
    from dotenv import load_dotenv
    backend_env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
    if os.path.exists(backend_env_path):
        load_dotenv(backend_env_path)
except ImportError:
    pass

# Importar las funciones de los scripts existentes desde backend/
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from transcription_service import transcribir_audio_service, procesar_transcripcion_para_texto, extraer_resumen_speechmatics
from summary_service import generar_resumen_completo, generar_resumen_con_gemini, chat_con_gemini

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Silenciar logs
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)  # Solo mostrar errores

# Inicializar Flask
app = Flask(__name__)
CORS(app)  # Permitir CORS para el frontend

# Configuración
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB máximo
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['ALLOWED_EXTENSIONS'] = {
    'mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'wma'
}

# Crear carpeta de uploads si no existe
Path(app.config['UPLOAD_FOLDER']).mkdir(exist_ok=True)

# UTILIDADES
def allowed_file(filename):
    """Verifica si el archivo tiene una extensión permitida"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def generate_unique_filename(original_filename):
    """Genera un nombre de archivo único"""
    ext = original_filename.rsplit('.', 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    return unique_name

# ENDPOINTS
@app.route('/')
def index():
    """Endpoint raíz - información de la API"""
    return jsonify({
        'name': 'Audio Summarizer API',
        'version': '1.0.0',
        'endpoints': {
            'upload': '/api/upload',
            'process': '/api/process',
            'health': '/api/health'
        }
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Endpoint para verificar que el servidor está funcionando"""
    return jsonify({
        'status': 'healthy',
        'message': 'Server is running'
    })

@app.route('/api/upload', methods=['POST'])
def upload_audio():
    """
    Endpoint para subir archivos de audio
    
    Espera:
        - archivo de audio en el campo 'audio'
    
    Retorna:
        - file_id: ID único del archivo
        - filename: nombre original del archivo
        - size: tamaño del archivo
    """
    try:
        # Verificar que se envió un archivo
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        file = request.files['audio']
        
        # Verificar que se seleccionó un archivo
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Verificar extensión
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Allowed types: ' + ', '.join(app.config['ALLOWED_EXTENSIONS'])}), 400
        
        # Guardar archivo con nombre único
        original_filename = secure_filename(file.filename)
        unique_filename = generate_unique_filename(original_filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        file.save(file_path)
        
        # Obtener tamaño del archivo
        file_size = os.path.getsize(file_path)
        
        logger.info(f"Archivo subido: {original_filename} -> {unique_filename}")
        
        return jsonify({
            'success': True,
            'file_id': unique_filename,
            'filename': original_filename,
            'size': file_size
        }), 200
        
    except Exception as e:
        logger.error(f"Error al subir archivo: {str(e)}")
        return jsonify({'error': f'Error uploading file: {str(e)}'}), 500

@app.route('/api/process', methods=['POST'])
def process_audio():
    """
    Endpoint para procesar un archivo de audio (transcribir y resumir)
    
    Espera:
        - file_id: ID del archivo previamente subido
        - language: código del idioma (opcional, por defecto 'es')
        - api_key: API key de Speechmatics (opcional si está configurada)
    
    Retorna:
        - transcription: texto transcrito completo
        - summary: resumen básico
        - speechmatics_summary: resumen generado por Speechmatics (si disponible)
    """
    try:
        data = request.get_json()
        
        if not data or 'file_id' not in data:
            return jsonify({'error': 'file_id is required'}), 400
        
        file_id = data['file_id']
        language = data.get('language', 'es')
        api_key = data.get('api_key', os.environ.get('SPEECHMATICS_API_KEY'))
        
        # Verificar que existe el archivo
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_id)
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404
        
        # Verificar API key
        if not api_key:
            return jsonify({'error': 'Speechmatics API key is required'}), 400
        
        # Transcribir con Speechmatics
        resultado_transcripcion = transcribir_audio_service(
            archivo_audio=file_path,
            api_key=api_key,
            idioma=language
        )
        
        if not resultado_transcripcion:
            return jsonify({'error': 'Transcription failed'}), 500
        
        # Procesar transcripción para obtener texto limpio
        texto_transcrito = procesar_transcripcion_para_texto(resultado_transcripcion)
        
        # Extraer resumen de Speechmatics (si está disponible)
        resumen_speechmatics = extraer_resumen_speechmatics(resultado_transcripcion)
        
        # Generar resumen básico con estadísticas
        resumen = generar_resumen_completo(texto_transcrito, resultado_transcripcion)
        
        # Generar resumen con IA (Gemini)
        # resumen_ia = None
        # gemini_api_key = data.get('gemini_api_key', os.environ.get('GEMINI_API_KEY'))
        
        # if gemini_api_key:
        #     resumen_ia = generar_resumen_con_gemini(texto_transcrito, gemini_api_key)
        # else:
        #     logger.warning("GEMINI_API_KEY no configurada, saltando resumen con IA")
        
        os.remove(file_path) # Limpiar el archivo subido
        response_data = {
            'success': True,
            'transcription': texto_transcrito,
            'summary': resumen['resumen_basico']
        }
        
        # Agregar resumen de Speechmatics si está disponible
        if resumen_speechmatics:
            response_data['speechmatics_summary'] = resumen_speechmatics
            logger.info("Resumen de Speechmatics incluido en la respuesta")
        
        # # Agregar resumen de IA (Gemini) si está disponible
        # if resumen_ia:
        #     response_data['ai_summary'] = resumen_ia
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error al procesar audio: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error processing audio: {str(e)}'}), 500

@app.route('/api/chat', methods=['POST'])
def chat_with_ai():
    """
    Endpoint para chat con IA (Gemini) sobre la transcripción
    
    Espera:
        - message: mensaje del usuario
        - context: contexto de la transcripción (requerido)
        - gemini_api_key: API key de Gemini (opcional si está en variables de entorno)
    
    Retorna:
        - response: respuesta de Gemini
        - success: true/false
    """
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({'error': 'message is required'}), 400
        
        if 'context' not in data or not data['context']:
            return jsonify({'error': 'context (transcription) is required'}), 400
        
        message = data['message']
        context = data['context']
        gemini_api_key = data.get('gemini_api_key', os.environ.get('GEMINI_API_KEY'))
        
        if not gemini_api_key:
            return jsonify({
                'error': 'Gemini API key is required. Please configure GEMINI_API_KEY environment variable or provide it in the request.'
            }), 400
        
        logger.info(f"Procesando pregunta de chat: {message[:100]}...")
        
        # Llamar a Gemini para procesar la pregunta
        respuesta = chat_con_gemini(
            mensaje=message,
            contexto_transcripcion=context,
            api_key=gemini_api_key
        )
        
        if respuesta.startswith("Error:"):
            return jsonify({
                'success': False,
                'error': respuesta
            }), 500
        
        return jsonify({
            'success': True,
            'response': respuesta
        }), 200
        
    except Exception as e:
        logger.error(f"Error en chat: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error in chat: {str(e)}'}), 500

# SERVIR ARCHIVOS ESTÁTICOS DEL FRONTEND
@app.route('/<path:path>')
def serve_frontend(path):
    """Sirve archivos estáticos del frontend"""
    frontend_path = os.path.join(os.path.dirname(__file__), 'frontend')
    return send_from_directory(frontend_path, path)


@app.route('/frontend')
@app.route('/frontend/')
def serve_index():
    """Sirve el index.html del frontend"""
    frontend_path = os.path.join(os.path.dirname(__file__), 'frontend')
    return send_from_directory(frontend_path, 'index.html')

# MANEJO DE ERRORES
@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({'error': 'File too large. Maximum size is 100MB'}), 413

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# EJECUTAR SERVIDOR
if __name__ == '__main__':
    # Verificar configuración de API keys
    speechmatics_key = os.environ.get('SPEECHMATICS_API_KEY')
    gemini_key = os.environ.get('GEMINI_API_KEY')

    if not speechmatics_key:
        logger.warning("SPEECHMATICS_API_KEY no está configurada")
    
    if not gemini_key:
        logger.warning("GEMINI_API_KEY no está configurada")
    # Ejecutar servidor
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('DEBUG', 'True').lower() == 'true'

    logger.info(f"Frontend disponible en http://localhost:{port}/frontend")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug_mode
    )
