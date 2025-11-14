"""
Servicio de generación de resúmenes
Adaptado de generar_resumen.py para uso como servicio
"""

from datetime import datetime
import logging
import os

logger = logging.getLogger(__name__)

def generar_resumen_basico(texto):
    """
    Genera un resumen básico del texto transcrito
    
    Args:
        texto (str): Texto de la transcripción
    
    Returns:
        dict: Resumen básico con fecha
    """
    return {
        'fecha': datetime.now().strftime('%Y-%m-%d %H:%M')
    }


def extraer_informacion_hablantes(json_transcripcion):
    """
    Extrae información sobre los hablantes de la transcripción JSON completa
    
    Args:
        json_transcripcion (dict): JSON completo de Speechmatics
    
    Returns:
        dict: Información de cada hablante (vacío ya que no se necesitan estadísticas)
    """
    return {}

def generar_resumen_completo(texto_transcrito, json_transcripcion):
    """
    Genera un resumen completo
    
    Args:
        texto_transcrito (str): Texto limpio de la transcripción
        json_transcripcion (dict): JSON completo de Speechmatics con metadatos
    
    Returns:
        dict: Resumen completo
    """
    # Generar resumen básico
    resumen_basico = generar_resumen_basico(texto_transcrito)
    
    # Combinar todo
    resumen_completo = {
        'resumen_basico': {
            'fecha': resumen_basico['fecha']
        },
        'texto_completo': texto_transcrito
    }
    
    return resumen_completo


# CONFIGURACIÓN DE GEMINI
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None
    logger.warning("google-generativeai no está instalado. Funciones de IA deshabilitadas.")

# Caché del modelo configurado
_gemini_cache = {
    'api_key': None,
    'model_name': None,
    'model': None
}

def _get_gemini_model(api_key):
    """
    Obtiene el modelo de Gemini desde caché o lo configura si es necesario.
    Solo reconfigura si cambia la API key o el nombre del modelo.
    
    Args:
        api_key (str): API key de Gemini
    
    Returns:
        GenerativeModel: Modelo configurado o None si hay error
    """
    if not GEMINI_AVAILABLE:
        return None
    
    model_name = os.environ.get('GEMINI_MODEL')
    
    if (_gemini_cache['api_key'] != api_key or 
        _gemini_cache['model_name'] != model_name or 
        _gemini_cache['model'] is None):
        
        try:
            genai.configure(api_key=api_key)
            _gemini_cache['api_key'] = api_key
            _gemini_cache['model_name'] = model_name
            _gemini_cache['model'] = genai.GenerativeModel(model_name)
        except Exception as e:
            logger.error(f"Error configurando Gemini: {str(e)}")
            return None
    
    return _gemini_cache['model']

def editar_resumen_con_gemini(instruccion, resumen_actual, contexto_transcripcion, api_key=None):
    """
    Edita o regenera el resumen basándose en las instrucciones del usuario
    
    Args:
        instruccion (str): Instrucción de edición del usuario
        resumen_actual (str): Resumen actual que se desea editar
        contexto_transcripcion (str): Texto de la transcripción completa
        api_key (str): API key de Google AI Studio
    
    Returns:
        str: Nuevo resumen editado según las instrucciones
    """
    if not api_key:
        logger.warning("No se proporcionó API key de Gemini para editar resumen")
        return "Error: API key no configurada"
    
    if not GEMINI_AVAILABLE:
        logger.error("google-generativeai no está instalado")
        return "Error: Gemini no está disponible"
    
    # Obtener modelo desde caché
    model = _get_gemini_model(api_key)
    if not model:
        return "Error: No se pudo configurar Gemini"
    
    try:
        # Construir prompt específico para edición
        prompt = f"""You are an expert assistant that helps edit and improve summaries of meeting transcriptions.

ORIGINAL TRANSCRIPTION:
{contexto_transcripcion[:8000]}

CURRENT SUMMARY:
{resumen_actual}

USER INSTRUCTION:
{instruccion}

TASK:
Edit the current summary based on the user's instruction. You have access to the original transcription to add or verify information if needed.

GUIDELINES:
- Follow the user's instruction precisely
- Maintain professional and clear language
- Use markdown format for structure (bullet points, bold, etc.)
- Do not use emojis
- If the instruction requires information not in the transcription, indicate that clearly
- Return ONLY the edited summary text, without any preamble or explanation

EDITED SUMMARY:"""

        response = model.generate_content(prompt)
        return response.text
    
    except Exception as e:
        logger.error(f"Error al editar resumen con Gemini: {str(e)}")
        return f"Error al editar el resumen: {str(e)}"


def chat_con_gemini(mensaje, contexto_transcripcion, api_key=None, historial_chat=None):
    """
    Maneja conversaciones sobre la transcripción usando Gemini
    
    Args:
        mensaje (str): Mensaje del usuario
        contexto_transcripcion (str): Texto de la transcripción completa
        api_key (str): API key de Google AI Studio
        historial_chat (list): Historial previo de mensajes (opcional)
    
    Returns:
        str: Respuesta de Gemini
    """
    if not api_key:
        logger.warning("No se proporcionó API key de Gemini para chat")
        return "Error: API key no configurada"
    
    if not GEMINI_AVAILABLE:
        logger.error("google-generativeai no está instalado")
        return "Error: Gemini no está disponible"
    
    # Obtener modelo desde caché
    model = _get_gemini_model(api_key)
    if not model:
        return "Error: No se pudo configurar Gemini"
    
    try:
        # Build the prompt with context
        prompt = f"""You are an expert assistant who helps analyze and answer questions about meeting transcriptions.

TRANSCRIPTION CONTEXT:
{contexto_transcripcion[:8000]}  # Limit context to avoid exceeding limits

INSTRUCTIONS:
- Respond in a clear, concise, and professional manner
- Base your answers on the transcription content
- If the question cannot be answered with the available information, indicate so
- Use markdown format to structure long responses
- Be specific and cite relevant parts when appropriate
- Do not use emojis, use bullet points instead if necessary

USER QUESTION:
{mensaje}

Answer:"""

        response = model.generate_content(prompt)
        return response.text
    
    except Exception as e:
        logger.error(f"Error en chat con Gemini: {str(e)}")
        return f"Lo siento, ocurrió un error al procesar tu pregunta: {str(e)}"
