"""
Servicio de generación de resúmenes
Adaptado de generar_resumen.py para uso como servicio
"""

from datetime import datetime
from collections import Counter
import logging
import os

logger = logging.getLogger(__name__)


def generar_resumen_basico(texto):
    """
    Genera un resumen básico con estadísticas del texto transcrito
    
    Args:
        texto (str): Texto de la transcripción
    
    Returns:
        dict: Resumen con estadísticas y palabras clave
    """
    if not texto:
        return {
            'fecha': datetime.now().strftime('%Y-%m-%d %H:%M'),
            'estadisticas': {
                'total_palabras': 0,
                'total_oraciones': 0,
                'palabras_promedio_oracion': 0
            },
            'palabras_clave': [],
            'temas_principales': []
        }
    
    palabras = texto.split()
    oraciones = texto.split('.')
    
    # Palabras más comunes (excluir palabras vacías básicas)
    palabras_vacias = {
        'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 
        'se', 'no', 'haber', 'por', 'con', 'su', 'para', 'como',
        'estar', 'tener', 'le', 'lo', 'todo', 'pero', 'más', 'hacer',
        'del', 'al', 'los', 'las', 'una', 'unos', 'unas', 'este',
        'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
        'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were'
    }
    
    palabras_filtradas = [
        p.lower().strip('.,!?;:()[]{}""\'') 
        for p in palabras 
        if p.lower().strip('.,!?;:()[]{}""\'') not in palabras_vacias and len(p) > 3
    ]
    
    palabras_frecuentes = Counter(palabras_filtradas).most_common(15)
    
    resumen = {
        'fecha': datetime.now().strftime('%Y-%m-%d %H:%M'),
        'estadisticas': {
            'total_palabras': len(palabras),
            'total_oraciones': len([o for o in oraciones if o.strip()]),
            'palabras_promedio_oracion': round(len(palabras) / max(len([o for o in oraciones if o.strip()]), 1), 1)
        },
        'palabras_clave': [palabra for palabra, _ in palabras_frecuentes[:10]],
        'temas_principales': [
            {'palabra': palabra, 'frecuencia': freq} 
            for palabra, freq in palabras_frecuentes[:5]
        ]
    }
    
    return resumen


def extraer_informacion_hablantes(json_transcripcion):
    """
    Extrae información sobre los hablantes de la transcripción JSON completa
    
    Args:
        json_transcripcion (dict): JSON completo de Speechmatics
    
    Returns:
        dict: Información de cada hablante
    """
    resultados = json_transcripcion.get('results', [])
    
    hablantes = {}
    hablante_actual = None
    palabras_hablante = []
    
    for item in resultados:
        if item['type'] == 'word':
            if 'speaker' in item:
                nuevo_hablante = item['speaker']
                
                if hablante_actual and nuevo_hablante != hablante_actual:
                    if hablante_actual not in hablantes:
                        hablantes[hablante_actual] = {
                            'palabras': 0,
                            'intervenciones': 0,
                            'texto_completo': []
                        }
                    hablantes[hablante_actual]['palabras'] += len(palabras_hablante)
                    hablantes[hablante_actual]['intervenciones'] += 1
                    hablantes[hablante_actual]['texto_completo'].append(' '.join(palabras_hablante))
                    palabras_hablante = []
                
                hablante_actual = nuevo_hablante
            
            palabras_hablante.append(item['alternatives'][0]['content'])
    
    # Guardar el último hablante
    if hablante_actual:
        if hablante_actual not in hablantes:
            hablantes[hablante_actual] = {
                'palabras': 0, 
                'intervenciones': 0,
                'texto_completo': []
            }
        hablantes[hablante_actual]['palabras'] += len(palabras_hablante)
        hablantes[hablante_actual]['intervenciones'] += 1
        hablantes[hablante_actual]['texto_completo'].append(' '.join(palabras_hablante))
    
    # Calcular promedios y limpiar datos
    for hablante_id, info in hablantes.items():
        if info['intervenciones'] > 0:
            info['promedio_palabras_intervencion'] = round(
                info['palabras'] / info['intervenciones'], 1
            )
        del info['texto_completo']
    
    return hablantes

def generar_resumen_completo(texto_transcrito, json_transcripcion):
    """
    Genera un resumen completo combinando estadísticas, hablantes y contenido
    
    Args:
        texto_transcrito (str): Texto limpio de la transcripción
        json_transcripcion (dict): JSON completo de Speechmatics con metadatos
    
    Returns:
        dict: Resumen completo con todas las secciones
    """
    logger.info("Generando resumen completo...")
    
    # Generar resumen básico con estadísticas
    resumen_basico = generar_resumen_basico(texto_transcrito)
    
    # Extraer información de hablantes
    hablantes = extraer_informacion_hablantes(json_transcripcion)
    
    # Obtener metadatos del audio
    metadata = json_transcripcion.get('metadata', {})
    duracion_segundos = metadata.get('duration', 0)
    
    # Combinar todo
    resumen_completo = {
        'resumen_basico': {
            'fecha': resumen_basico['fecha'],
            'estadisticas': {
                **resumen_basico['estadisticas'],
                'duracion_audio': round(duracion_segundos, 2),
                'duracion_minutos': round(duracion_segundos / 60, 1)
            },
            'palabras_clave': resumen_basico['palabras_clave'],
            'temas_principales': resumen_basico['temas_principales']
        },
        'hablantes': hablantes,
        'texto_completo': texto_transcrito
    }
    
    logger.info("Resumen generado exitosamente")
    
    return resumen_completo


# CONFIGURACIÓN DE GEMINI
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
    logger.info("Gemini SDK importado correctamente")
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
            logger.info(f"Configurando Gemini con modelo: {model_name}")
            genai.configure(api_key=api_key)
            _gemini_cache['api_key'] = api_key
            _gemini_cache['model_name'] = model_name
            _gemini_cache['model'] = genai.GenerativeModel(model_name)
        except Exception as e:
            logger.error(f"Error configurando Gemini: {str(e)}")
            return None
    
    return _gemini_cache['model']

# INTEGRACIÓN
def generar_resumen_con_gemini(texto, api_key=None):
    """ Genera un resumen inteligente usando Gemini """
    if not api_key:
        logger.warning("No se proporcionó API key de Gemini")
        return None
    
    if not GEMINI_AVAILABLE:
        logger.error("google-generativeai no está instalado. Instala con: pip install google-generativeai")
        return None
    
    # Obtener modelo desde caché
    model = _get_gemini_model(api_key)
    if not model:
        logger.error("No se pudo obtener el modelo de Gemini")
        return None
    
    try:
        prompt = f"""Eres un asistente experto en análisis de reuniones legales y profesionales.

Analiza la siguiente transcripción y genera un resumen estructurado en formato JSON con estas secciones:

1. **resumen_ejecutivo**: Un párrafo conciso con lo más importante
2. **temas_principales**: Array de los temas clave discutidos
3. **decisiones_tomadas**: Array de decisiones importantes (si las hay)
4. **tareas_asignadas**: Array de tareas o acciones pendientes (si las hay)
5. **proximos_pasos**: Array de siguientes acciones a realizar
6. **puntos_destacados**: Array de puntos más relevantes

Transcripción:
{texto}

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional."""

        response = model.generate_content(prompt)
        
        # Intentar parsear la respuesta como JSON
        import json
        try:
            # Limpiar la respuesta por si tiene markdown
            response_text = response.text.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            resumen_json = json.loads(response_text.strip())

            return resumen_json
        except json.JSONDecodeError:
            # Si no es JSON válido, devolver como texto plano

            return {
                'resumen_ejecutivo': response.text,
                'temas_principales': [],
                'decisiones_tomadas': [],
                'tareas_asignadas': [],
                'proximos_pasos': [],
                'puntos_destacados': []
            }
    
    except Exception as e:
        logger.error(f"Error al generar resumen con Gemini: {str(e)}")
        return None


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