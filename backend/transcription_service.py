"""
Servicio de transcripción de audio usando Speechmatics API
Adaptado de ejemplo_speechmatics.py para uso como servicio
"""

from speechmatics.models import ConnectionSettings
from speechmatics.batch_client import BatchClient
from httpx import HTTPStatusError
import logging
import json

logger = logging.getLogger(__name__)

def transcribir_audio_service(archivo_audio, api_key, idioma, enable_summarization=True):
    """
    Transcribe un archivo de audio usando Speechmatics API (modo batch)
    
    Args:
        archivo_audio (str): Ruta al archivo de audio (mp3, wav, m4a, etc.)
        api_key (str): Tu clave API de Speechmatics
        idioma (str): Código del idioma ('es', 'en', etc.)
        enable_summarization (bool): Habilitar resumen automático de Speechmatics
    
    Returns:
        dict: Diccionario con la transcripción, resumen y metadatos, o None si hay error
    """
    
    # Configurar la conexión
    settings = ConnectionSettings(
        url="https://asr.api.speechmatics.com/v2",
        auth_token=api_key,
    )
    
    # Configuración de la transcripción
    # Documentación diarization: https://docs.speechmatics.com/features/speaker-diarization
    config = {
        "type": "transcription",
        "transcription_config": {
            "language": idioma,
            "operating_point": "enhanced",  # Mayor precisión
            "diarization": "speaker",  # Identificar diferentes hablantes
            "enable_entities": True,  # Detectar nombres, lugares, etc.
        }
    }
    
    # Agregar summarization si está habilitado
    # Documentación: https://docs.speechmatics.com/features/summarization
    if enable_summarization:
        config["summarization_config"] = {
            "content_type": "auto",  # auto, informative, conversational
            "summary_length": "detailed",  # brief, detailed
            "summary_type": "bullets"  # bullets, paragraphs
        }
    
    try:
        # Abrir el cliente usando context manager
        with BatchClient(settings) as client:
            try:
                # Enviar el trabajo de transcripción
                job_id = client.submit_job(
                    audio=archivo_audio,
                    transcription_config=config,
                )
                
                # Esperar a que se complete y obtener el resultado en formato JSON
                # Nota: En producción, se recomienda configurar notificaciones en lugar de polling
                # Documentación: https://docs.speechmatics.com/speech-to-text/batch/notifications
                transcript = client.wait_for_completion(job_id, transcription_format="json-v2")
                
                return transcript
                
            except HTTPStatusError as e:
                if e.response.status_code == 401:
                    logger.error("API key inválida - Verifica tu SPEECHMATICS_API_KEY")
                    return None
                elif e.response.status_code == 400:
                    error_detail = e.response.json().get("detail", "Error desconocido")
                    logger.error(f"Error en la solicitud: {error_detail}")
                    return None
                else:
                    logger.error(f"Error HTTP {e.response.status_code}: {str(e)}")
                    raise e
                    
    except FileNotFoundError:
        logger.error(f"No se encontró el archivo '{archivo_audio}'")
        return None
    except Exception as e:
        logger.error(f"Error inesperado en transcripción: {str(e)}")
        return None


def extraer_resumen_speechmatics(resultado):
    """
    Extrae el resumen generado por Speechmatics (si está disponible)
    
    Args:
        resultado (dict): Resultado JSON de Speechmatics
    
    Returns:
        dict: Resumen de Speechmatics o None si no está disponible
    """
    if not resultado:
        return None
    
    # El resumen de Speechmatics viene en la sección 'summary'
    summary = resultado.get('summary', {})
    
    if not summary:
        return None
    
    return {
        'content': summary.get('content', ''),
        'summary_type': summary.get('summary_type', 'bullets'),
        'summary_length': summary.get('summary_length', 'detailed')
    }


def procesar_transcripcion_para_texto(resultado):
    """
    Procesa el resultado de la transcripción y lo convierte en texto plano
    
    Args:
        resultado (dict): Resultado JSON de Speechmatics
    
    Returns:
        str: Texto completo de la transcripción con hablantes identificados
    """
    
    if not resultado:
        return ""
    
    # Extraer el texto completo
    resultados = resultado.get('results', [])
    
    texto_completo = ""
    hablante_actual = None
    
    for resultado_item in resultados:
        if resultado_item['type'] == 'word':
            # El speaker está dentro de alternatives[0] en el formato json-v2
            alternative = resultado_item.get('alternatives', [{}])[0]
            
            # Cambio de hablante
            if 'speaker' in alternative:
                hablante = alternative['speaker']
                if hablante != hablante_actual:
                    hablante_actual = hablante
                    texto_completo += f"\n\n[SPEAKER_{hablante}]"
            
            # Añadir palabra
            texto_completo += alternative.get('content', '')
            
            # Añadir espacio si es necesario
            if resultado_item.get('is_eos', False):
                texto_completo += ". "
            else:
                texto_completo += " "
    
    return texto_completo.strip()


def procesar_transcripcion_estructurada(resultado):
    """
    Procesa el resultado de la transcripción y lo convierte en una estructura de diálogos
    
    Args:
        resultado (dict): Resultado JSON de Speechmatics
    
    Returns:
        list: Lista de diálogos con información de hablante y texto
    """
    
    if not resultado:
        return []
    
    # Extraer el texto completo
    resultados = resultado.get('results', [])
    
    dialogos = []
    hablante_actual = None
    texto_actual = ""
    
    for resultado_item in resultados:
        if resultado_item['type'] == 'word':
            # El speaker está dentro de alternatives[0] en el formato json-v2
            alternative = resultado_item.get('alternatives', [{}])[0]
            
            # Cambio de hablante
            if 'speaker' in alternative:
                hablante = alternative['speaker']
                
                if hablante != hablante_actual:
                    # Guardar el diálogo anterior si existe
                    if hablante_actual is not None and texto_actual.strip():
                        dialogos.append({
                            'speaker': hablante_actual,
                            'text': texto_actual.strip()
                        })
                    
                    # Iniciar nuevo diálogo
                    hablante_actual = hablante
                    texto_actual = ""
            
            # Añadir palabra
            texto_actual += alternative.get('content', '')
            
            # Añadir espacio si es necesario
            if resultado_item.get('is_eos', False):
                texto_actual += ". "
            else:
                texto_actual += " "
    
    # Guardar el último diálogo
    if hablante_actual is not None and texto_actual.strip():
        dialogos.append({
            'speaker': hablante_actual,
            'text': texto_actual.strip()
        })
    
    return dialogos

