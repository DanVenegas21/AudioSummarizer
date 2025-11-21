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
from transcription_service import transcribir_audio_service, procesar_transcripcion_para_texto, extraer_resumen_speechmatics, procesar_transcripcion_estructurada
from summary_service import generar_resumen_completo, chat_con_gemini, editar_resumen_con_gemini, generar_resumen_con_agente
from video_service import extraer_audio_de_video, es_archivo_video, verificar_es_video_real
from system_Audio import esta_disponible_grabacion_sistema, iniciar_grabacion_sistema, detener_grabacion_sistema, esta_grabando_sistema
from auth_service import authenticate_user, get_user_by_id, change_password
from database import test_connection
from agents.agents_service import (create_agent, get_agent_by_id, get_agents_by_user, 
                           update_agent, delete_agent, hard_delete_agent)

# Configurar logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

# Silenciar logs de librerías externas y servicios
logging.getLogger('werkzeug').setLevel(logging.ERROR)
logging.getLogger('httpx').setLevel(logging.ERROR)
logging.getLogger('speechmatics').setLevel(logging.ERROR)
logging.getLogger('speechmatics.batch_client').setLevel(logging.ERROR)
logging.getLogger('transcription_service').setLevel(logging.ERROR)
logging.getLogger('summary_service').setLevel(logging.ERROR)

# Inicializar Flask
app = Flask(__name__)
CORS(app)  # Permitir CORS para el frontend

# Configuración
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB máximo
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['ALLOWED_EXTENSIONS'] = {
    # Formatos de audio
    'mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'wma', 'webm',
    # Formatos de video
    'mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'mpeg', 'mpg', '3gp', 'm4v', 'ts'
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

def serialize_agent(agent):
    """Convierte campos datetime de un agente a cadenas ISO 8601."""
    if not agent:
        return agent
    agent_dict = dict(agent)
    for field in ('created_at', 'updated_at'):
        value = agent_dict.get(field)
        if value and hasattr(value, 'isoformat'):
            agent_dict[field] = value.isoformat()
    return agent_dict

# ENDPOINTS
@app.route('/')
def index():
    """Sirve la página de login del frontend"""
    frontend_path = os.path.join(os.path.dirname(__file__), 'frontend')
    return send_from_directory(frontend_path, 'login.html')

@app.route('/api')
@app.route('/api/')
def api_info():
    """Endpoint con información de la API"""
    return jsonify({
        'name': 'Audio Summarizer API',
        'version': '1.0.0',
        'endpoints': {
            'upload': '/api/upload',
            'process': '/api/process',
            'health': '/api/health',
            'login': '/api/login'
        }
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Endpoint para verificar que el servidor está funcionando"""
    return jsonify({
        'status': 'healthy',
        'message': 'Server is running',
        'system_audio_available': esta_disponible_grabacion_sistema(),
        'system_audio_recording': esta_grabando_sistema(),
        'database_connected': test_connection()
    })

@app.route('/api/login', methods=['POST'])
def login():
    """
    Endpoint para autenticar usuarios
    
    Espera:
        - email: Email del usuario
        - password: Contraseña del usuario
    
    Retorna:
        - user: Información del usuario autenticado
        - success: true/false
    """
    try:
        data = request.get_json()
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password are required'}), 400
        
        email = data['email'].strip()
        password = data['password']
        
        # Validar que no estén vacíos
        if not email or not password:
            return jsonify({'error': 'Email and password cannot be empty'}), 400
        
        # Autenticar usuario
        user = authenticate_user(email, password)
        
        if user is None:
            return jsonify({
                'success': False,
                'error': 'Invalid credentials'
            }), 401
        
        # Convertir el objeto datetime a string para JSON
        if 'created_at' in user and user['created_at']:
            user['created_at'] = user['created_at'].isoformat()
        
        return jsonify({
            'success': True,
            'user': user
        }), 200
        
    except Exception as e:
        logger.error(f"Error en login: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error during login: {str(e)}'}), 500

@app.route('/api/change-password', methods=['POST'])
def change_user_password():
    """
    Endpoint para cambiar la contraseña del usuario
    
    Espera:
        - email: Email del usuario
        - current_password: Contraseña actual
        - new_password: Nueva contraseña
    
    Retorna:
        - success: true/false
    """
    try:
        data = request.get_json()
        
        if not data or 'email' not in data or 'current_password' not in data or 'new_password' not in data:
            return jsonify({'error': 'Email, current password and new password are required'}), 400
        
        email = data['email'].strip()
        current_password = data['current_password']
        new_password = data['new_password']
        
        # Validar que no estén vacíos
        if not email or not current_password or not new_password:
            return jsonify({'error': 'All fields are required'}), 400
        
        # Validar longitud de la nueva contraseña
        if len(new_password) < 4:
            return jsonify({'error': 'New password must be at least 4 characters long'}), 400
        
        # Cambiar contraseña
        success = change_password(email, current_password, new_password)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Current password is incorrect'
            }), 401
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error al cambiar contraseña: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error changing password: {str(e)}'}), 500

@app.route('/api/start-system-recording', methods=['POST'])
def start_system_recording():
    """
    Endpoint para iniciar la grabación continua del audio
    
    Espera:
        - type: tipo de grabación ('microphone', 'system', 'both')
    
    Retorna:
        - file_id: ID único del archivo que se está grabando
        - status: 'recording'
        - type: tipo de grabación
    """
    try:
        data = request.get_json() or {}
        recording_type = data.get('type', 'both')
        
        # Validar tipo de grabación
        if recording_type not in ['microphone', 'system', 'both']:
            return jsonify({'error': 'Invalid recording type. Must be microphone, system, or both'}), 400
        
        logger.info(f"Iniciando grabación continua (tipo: {recording_type})")
        
        # Iniciar grabación continua
        result = iniciar_grabacion_sistema(
            output_dir=app.config['UPLOAD_FOLDER'],
            recording_type=recording_type
        )
        
        if result is None:
            return jsonify({
                'error': 'Failed to start recording. Make sure your system supports the selected recording type and there is no active recording.'
            }), 500
        
        return jsonify({
            'success': True,
            'file_id': result['file_id'],
            'status': result['status'],
            'type': result['type'],
            'message': f'Recording started ({recording_type})'
        }), 200
        
    except Exception as e:
        logger.error(f"Error al iniciar grabación: {str(e)}")
        return jsonify({'error': f'Error starting recording: {str(e)}'}), 500


@app.route('/api/stop-system-recording', methods=['POST'])
def stop_system_recording():
    """
    Endpoint para detener la grabación del audio del sistema
    
    Retorna:
        - file_id: ID único del archivo grabado
        - filename: nombre del archivo
        - size: tamaño del archivo
        - duration: duración de la grabación
        - status: 'completed'
    """
    try:
        logger.info("Deteniendo grabación del audio del sistema")
        
        # Detener grabación
        result = detener_grabacion_sistema(output_dir=app.config['UPLOAD_FOLDER'])
        
        if result is None:
            return jsonify({
                'error': 'No active recording found or failed to stop recording.'
            }), 400
        
        return jsonify({
            'success': True,
            'file_id': result['file_id'],
            'filename': result['filename'],
            'size': result['size'],
            'duration': result['duration'],
            'status': result['status'],
            'message': 'System audio recording stopped and saved'
        }), 200
        
    except Exception as e:
        logger.error(f"Error al detener grabación del sistema: {str(e)}")
        return jsonify({'error': f'Error stopping system audio recording: {str(e)}'}), 500

@app.route('/api/upload', methods=['POST'])
def upload_audio():
    """
    Endpoint para subir archivos de audio o video
    Si es video, se extrae automáticamente el audio
    
    Espera:
        - archivo de audio o video en el campo 'audio'
    
    Retorna:
        - file_id: ID único del archivo
        - filename: nombre original del archivo
        - size: tamaño del archivo
        - is_video: indica si era un archivo de video (opcional)
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
        
        # Verificar si es un archivo de video (primero por extensión, luego por contenido)
        podria_ser_video = es_archivo_video(original_filename)
        is_video = False
        
        if podria_ser_video:
            # Verificar realmente si es un video inspeccionando el contenido
            is_video = verificar_es_video_real(file_path)
            if not is_video:
                logger.info(f"Archivo {original_filename} tiene extensión de video pero no contiene pista de video, tratando como audio")
        
        if is_video:
            logger.info(f"Archivo de video detectado: {original_filename}. Extrayendo audio...")
            
            # Extraer audio del video
            audio_path = extraer_audio_de_video(file_path)
            
            if audio_path is None:
                # Limpiar archivo de video
                os.remove(file_path)
                return jsonify({'error': 'Failed to extract audio from video. Make sure the video has an audio track.'}), 500
            
            # Reemplazar el archivo de video con el audio extraído
            os.remove(file_path)
            
            # Mover el audio extraído al nombre único original
            audio_ext = audio_path.rsplit('.', 1)[1].lower()
            unique_audio_filename = f"{uuid.uuid4().hex}.{audio_ext}"
            final_audio_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_audio_filename)
            os.rename(audio_path, final_audio_path)
            
            file_path = final_audio_path
            unique_filename = unique_audio_filename
        
        # Obtener tamaño del archivo
        file_size = os.path.getsize(file_path)
        
        response_data = {
            'success': True,
            'file_id': unique_filename,
            'filename': original_filename,
            'size': file_size
        }
        
        if is_video:
            response_data['is_video'] = True
            response_data['message'] = 'Audio extracted from video successfully'
        
        return jsonify(response_data), 200
        
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
        - transcription: texto transcrito completo (con marcadores de hablantes)
        - dialogues: array de diálogos estructurados por hablante [{speaker: str, text: str}]
        - summary: resumen básico
        - speechmatics_summary: resumen generado por Speechmatics (si disponible)
    """
    try:
        data = request.get_json()
        
        if not data or 'file_id' not in data:
            return jsonify({'error': 'file_id is required'}), 400
        
        file_id = data['file_id']
        language = data.get('language')
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
        
        # Procesar transcripción estructurada por hablantes
        dialogos = procesar_transcripcion_estructurada(resultado_transcripcion)
        
        # Extraer resumen de Speechmatics (si está disponible)
        resumen_speechmatics = extraer_resumen_speechmatics(resultado_transcripcion)
        
        # Generar resumen básico
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
            'dialogues': dialogos,
            'summary': resumen['resumen_basico']
        }
        
        # Agregar resumen de Speechmatics si está disponible
        if resumen_speechmatics:
            response_data['speechmatics_summary'] = resumen_speechmatics
        
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

@app.route('/api/edit-summary', methods=['POST'])
def edit_summary():
    """
    Endpoint para editar el resumen usando IA (Gemini)
    
    Espera:
        - instruction: instrucción de edición del usuario
        - current_summary: resumen actual que se desea editar
        - context: contexto de la transcripción (requerido)
        - gemini_api_key: API key de Gemini (opcional si está en variables de entorno)
    
    Retorna:
        - edited_summary: resumen editado
        - success: true/false
    """
    try:
        data = request.get_json()
        
        if not data or 'instruction' not in data:
            return jsonify({'error': 'instruction is required'}), 400
        
        if 'current_summary' not in data or not data['current_summary']:
            return jsonify({'error': 'current_summary is required'}), 400
        
        if 'context' not in data or not data['context']:
            return jsonify({'error': 'context (transcription) is required'}), 400
        
        instruction = data['instruction']
        current_summary = data['current_summary']
        context = data['context']
        gemini_api_key = data.get('gemini_api_key', os.environ.get('GEMINI_API_KEY'))
        
        if not gemini_api_key:
            return jsonify({
                'error': 'Gemini API key is required. Please configure GEMINI_API_KEY environment variable or provide it in the request.'
            }), 400
        
        # Llamar a Gemini para editar el resumen
        nuevo_resumen = editar_resumen_con_gemini(
            instruccion=instruction,
            resumen_actual=current_summary,
            contexto_transcripcion=context,
            api_key=gemini_api_key
        )
        
        if nuevo_resumen.startswith("Error:"):
            return jsonify({
                'success': False,
                'error': nuevo_resumen
            }), 500
        
        return jsonify({
            'success': True,
            'edited_summary': nuevo_resumen
        }), 200
        
    except Exception as e:
        logger.error(f"Error al editar resumen: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error editing summary: {str(e)}'}), 500

# ENDPOINTS DE AGENTES PERSONALIZADOS
@app.route('/api/agents', methods=['POST'])
def create_custom_agent():
    """
    Endpoint para crear un agente personalizado
    
    Espera:
        - user_id: ID del usuario propietario
        - name: Nombre del agente
        - description: Descripción del agente
        - provider: Proveedor de IA ('gemini' o 'openai')
        - prompt_template: Reglas o instrucciones personalizadas del usuario (texto/Markdown)
        - model_name: Nombre del modelo específico (opcional)
    
    Retorna:
        - agent: Información del agente creado
        - success: true/false
    """
    try:
        data = request.get_json()
        
        # Validar campos requeridos
        required_fields = ['user_id', 'name', 'provider', 'prompt_template']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        user_id = data['user_id']
        name = data['name']
        description = data.get('description', '')
        provider = data['provider']
        prompt_template = data['prompt_template']
        model_name = data.get('model_name')
        
        # Validar proveedor
        if provider.lower() not in ['gemini', 'openai']:
            return jsonify({'error': 'provider must be "gemini" or "openai"'}), 400
        
        # Crear agente
        agent = create_agent(
            user_id=user_id,
            name=name,
            description=description,
            provider=provider,
            prompt_template=prompt_template,
            model_name=model_name
        )
        
        if not agent:
            return jsonify({
                'success': False,
                'error': 'Failed to create agent'
            }), 500
        
        # Convertir datetime a string para JSON
        agent = serialize_agent(agent)
        
        return jsonify({
            'success': True,
            'agent': agent
        }), 201
        
    except ValueError as e:
        return jsonify({'error': f'Invalid value: {str(e)}'}), 400
    except Exception as e:
        logger.error(f"Error al crear agente: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error creating agent: {str(e)}'}), 500


@app.route('/api/agents', methods=['GET'])
def list_agents():
    """
    Endpoint para listar agentes de un usuario
    
    Parámetros de query:
        - user_id: ID del usuario (requerido)
        - only_active: Si es true, solo devuelve agentes activos (opcional, default true)
    
    Retorna:
        - agents: Lista de agentes
        - success: true/false
    """
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        user_id = int(user_id)
        only_active = request.args.get('only_active', 'true').lower() == 'true'
        
        agents = [
            serialize_agent(agent)
            for agent in get_agents_by_user(user_id, only_active=only_active)
        ]
        
        return jsonify({
            'success': True,
            'agents': agents
        }), 200
        
    except ValueError:
        return jsonify({'error': 'Invalid user_id'}), 400
    except Exception as e:
        logger.error(f"Error al listar agentes: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error listing agents: {str(e)}'}), 500


@app.route('/api/agents/<int:agent_id>', methods=['GET'])
def get_agent(agent_id):
    """
    Endpoint para obtener un agente por ID
    
    Parámetros de query:
        - user_id: ID del usuario (opcional, para verificar propiedad)
    
    Retorna:
        - agent: Información del agente
        - success: true/false
    """
    try:
        user_id = request.args.get('user_id')
        
        if user_id:
            user_id = int(user_id)
            agent = get_agent_by_id(agent_id, user_id=user_id)
        else:
            agent = get_agent_by_id(agent_id)
        
        if not agent:
            return jsonify({
                'success': False,
                'error': 'Agent not found'
            }), 404
        
        agent = serialize_agent(agent)
        
        return jsonify({
            'success': True,
            'agent': agent
        }), 200
        
    except ValueError:
        return jsonify({'error': 'Invalid user_id'}), 400
    except Exception as e:
        logger.error(f"Error al obtener agente: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error getting agent: {str(e)}'}), 500


@app.route('/api/agents/<int:agent_id>', methods=['PUT'])
def update_custom_agent(agent_id):
    """
    Endpoint para actualizar un agente existente
    
    Espera:
        - user_id: ID del usuario propietario (requerido)
        - Cualquier campo a actualizar (name, description, prompt_template, etc.)
    
    Retorna:
        - agent: Información del agente actualizado
        - success: true/false
    """
    try:
        data = request.get_json()
        
        if not data or 'user_id' not in data:
            return jsonify({'error': 'user_id is required'}), 400
        
        user_id = int(data['user_id'])
        
        # Preparar campos a actualizar
        update_fields = {}
        allowed_fields = ['name', 'description', 'provider', 'prompt_template', 
                         'model_name', 'is_active']
        
        for field in allowed_fields:
            if field in data:
                update_fields[field] = data[field]
        
        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400
        
        # Validar proveedor si se está actualizando
        if 'provider' in update_fields and update_fields['provider'].lower() not in ['gemini', 'openai']:
            return jsonify({'error': 'provider must be "gemini" or "openai"'}), 400
        
        # Actualizar agente
        agent = update_agent(agent_id, user_id, **update_fields)
        
        if not agent:
            return jsonify({
                'success': False,
                'error': 'Agent not found or update failed'
            }), 404
        
        agent = serialize_agent(agent)
        
        return jsonify({
            'success': True,
            'agent': agent
        }), 200
        
    except ValueError as e:
        return jsonify({'error': f'Invalid value: {str(e)}'}), 400
    except Exception as e:
        logger.error(f"Error al actualizar agente: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error updating agent: {str(e)}'}), 500


@app.route('/api/agents/<int:agent_id>', methods=['DELETE'])
def delete_custom_agent(agent_id):
    """
    Endpoint para eliminar un agente (soft delete)
    
    Parámetros de query:
        - user_id: ID del usuario propietario (requerido)
        - hard: Si es true, elimina permanentemente (opcional, default false)
    
    Retorna:
        - success: true/false
    """
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        user_id = int(user_id)
        hard = request.args.get('hard', 'false').lower() == 'true'
        
        if hard:
            success = hard_delete_agent(agent_id, user_id)
            message = 'Agent deleted permanently'
        else:
            success = delete_agent(agent_id, user_id)
            message = 'Agent deactivated'
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Agent not found or delete failed'
            }), 404
        
        return jsonify({
            'success': True,
            'message': message
        }), 200
        
    except ValueError:
        return jsonify({'error': 'Invalid user_id'}), 400
    except Exception as e:
        logger.error(f"Error al eliminar agente: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error deleting agent: {str(e)}'}), 500


@app.route('/api/process-with-agent', methods=['POST'])
def process_audio_with_agent():
    """
    Endpoint para procesar audio usando un agente personalizado
    
    Espera:
        - file_id: ID del archivo previamente subido
        - agent_config: Configuración completa del agente (para modo local)
             OR
        - agent_id: ID del agente a usar (para modo DB)
        - user_id: ID del usuario (para verificar propiedad del agente en modo DB)
        
        - language: código del idioma (opcional, por defecto 'es')
        - speechmatics_api_key: API key de Speechmatics (opcional)
        - gemini_api_key: API key de Gemini (opcional)
        - openai_api_key: API key de OpenAI (opcional)
    
    Retorna:
        - transcription: texto transcrito completo
        - dialogues: array de diálogos estructurados por hablante
        - summary: resumen básico
        - agent_summary: resumen generado por el agente personalizado
        - speechmatics_summary: resumen de Speechmatics (si disponible)
    """
    try:
        data = request.get_json()
        
        # Validar campos básicos
        if not data or 'file_id' not in data:
            return jsonify({'error': 'file_id is required'}), 400
        
        file_id = data['file_id']
        language = data.get('language')
        speechmatics_api_key = data.get('speechmatics_api_key', os.environ.get('SPEECHMATICS_API_KEY'))
        gemini_api_key = data.get('gemini_api_key', os.environ.get('GEMINI_API_KEY'))
        openai_api_key = data.get('openai_api_key', os.environ.get('OPENAI_API_KEY'))
        
        # Determinar el agente (Local vs DB)
        agent = None
        
        # CASO 1: Agente Local (enviado completo desde frontend)
        if 'agent_config' in data:
            logger.info("Usando configuración de agente local proporcionada en la petición")
            agent = data['agent_config']
            # Validar campos mínimos del agente local
            if 'provider' not in agent or 'prompt_template' not in agent:
                 return jsonify({'error': 'Invalid local agent config: provider and prompt_template are required'}), 400
                 
        # CASO 2: Agente de Base de Datos (búsqueda por ID)
        elif 'agent_id' in data and 'user_id' in data:
            agent_id = int(data['agent_id'])
            user_id = int(data['user_id'])
            agent = get_agent_by_id(agent_id, user_id=user_id)
            
            if not agent:
                return jsonify({'error': 'Agent not found in database'}), 404
            
            if not agent.get('is_active'):
                return jsonify({'error': 'Agent is not active'}), 400
        else:
            return jsonify({'error': 'Either agent_config OR (agent_id AND user_id) must be provided'}), 400
        
        
        # Verificar que existe el archivo
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], file_id)
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404
        
        # Verificar Speechmatics API key
        if not speechmatics_api_key:
            return jsonify({'error': 'Speechmatics API key is required'}), 400
            
        # Verificar que la API key del proveedor esté disponible
        provider = agent.get('provider', '').lower()
        if provider == 'gemini' and not gemini_api_key:
            return jsonify({'error': 'Gemini API key is required for this agent'}), 400
        elif provider == 'openai' and not openai_api_key:
            return jsonify({'error': 'OpenAI API key is required for this agent'}), 400
        
        # Transcribir con Speechmatics
        resultado_transcripcion = transcribir_audio_service(
            archivo_audio=file_path,
            api_key=speechmatics_api_key,
            idioma=language
        )
        
        if not resultado_transcripcion:
            return jsonify({'error': 'Transcription failed'}), 500
        
        # Procesar transcripción
        texto_transcrito = procesar_transcripcion_para_texto(resultado_transcripcion)
        dialogos = procesar_transcripcion_estructurada(resultado_transcripcion)
        resumen_speechmatics = extraer_resumen_speechmatics(resultado_transcripcion)
        
        # Generar resumen básico
        resumen = generar_resumen_completo(texto_transcrito, resultado_transcripcion)
        
        # Generar resumen con el agente personalizado
        resumen_agente = generar_resumen_con_agente(
            transcription=texto_transcrito,
            agent_config=agent,
            gemini_api_key=gemini_api_key,
            openai_api_key=openai_api_key
        )
        
        # Limpiar el archivo subido
        os.remove(file_path)
        
        response_data = {
            'success': True,
            'transcription': texto_transcrito,
            'dialogues': dialogos,
            'summary': resumen['resumen_basico'],
            'agent_summary': resumen_agente,
            'agent_used': {
                'id': agent.get('id', 'local'),
                'name': agent.get('name', 'Local Agent'),
                'provider': agent.get('provider')
            }
        }
        
        # Agregar resumen de Speechmatics si está disponible
        if resumen_speechmatics:
            response_data['speechmatics_summary'] = resumen_speechmatics
        
        return jsonify(response_data), 200
        
    except ValueError as e:
        return jsonify({'error': f'Invalid value: {str(e)}'}), 400
    except Exception as e:
        logger.error(f"Error al procesar audio con agente: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error processing audio with agent: {str(e)}'}), 500

# SERVIR ARCHIVOS DE UPLOADS
@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    """Sirve archivos de la carpeta uploads"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

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

    print(f"\n{'='*60}")
    print(f"  Audio Summarizer - Server Running")
    print(f"{'='*60}")
    print(f"  Frontend (Login):  http://localhost:{port}/")
    print(f"  App Principal:     http://localhost:{port}/index.html")
    print(f"  API Info:          http://localhost:{port}/api")
    print(f"{'='*60}\n")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug_mode
    )