"""
Servicio de transcripción de audio usando Speechmatics API
Adaptado de ejemplo_speechmatics.py para uso como servicio
"""

import httpx
import json
import time
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# URL base de la API de Speechmatics
API_URL = "https://asr.api.speechmatics.com/v2"


def transcribir_audio_service(archivo_audio, api_key, idioma='es'):
    """
    Transcribe un archivo de audio usando Speechmatics API (modo batch)
    
    Args:
        archivo_audio (str): Ruta al archivo de audio (mp3, wav, m4a, etc.)
        api_key (str): Tu clave API de Speechmatics
        idioma (str): Código del idioma ('es', 'en', etc.)
    
    Returns:
        dict: Diccionario con la transcripción y metadatos, o None si hay error
    """

    # Configuración de la transcripción
    config = {
        "type": "transcription",
        "transcription_config": {
            "language": idioma,
            "operating_point": "enhanced",  # Mayor precisión
            "diarization": "speaker",  # Identificar diferentes hablantes
            "enable_entities": True,  # Detectar nombres, lugares, etc.
        }
    }
    
    # Preparar archivos para enviar
    try:
        with open(archivo_audio, 'rb') as audio_file:
            files = {
                'data_file': (Path(archivo_audio).name, audio_file, 'audio/mpeg'),
                'config': (None, json.dumps(config), 'application/json')
            }
            
            headers = {
                'Authorization': f'Bearer {api_key}'
            }
            
            # Enviar petición a la API
            with httpx.Client(timeout=300.0) as client:  # Timeout de 5 minutos
                response = client.post(
                    f"{API_URL}/jobs",
                    headers=headers,
                    files=files
                )
            
            # Verificar respuesta
            if response.status_code == 201:
                resultado = response.json()
                job_id = resultado['id']
                logger.info(f"Audio enviado correctamente. Job ID: {job_id}")
                
                # Esperar a que se complete el procesamiento
                return esperar_resultado(job_id, api_key)
            else:
                logger.error(f"Error al enviar audio: {response.status_code}")
                logger.error(f"Detalle: {response.text}")
                return None
                
    except FileNotFoundError:
        logger.error(f"No se encontró el archivo '{archivo_audio}'")
        return None
    except Exception as e:
        logger.error(f"Error inesperado en transcripción: {str(e)}")
        return None


def esperar_resultado(job_id, api_key):
    """
    Espera a que la transcripción se complete y obtiene el resultado
    
    Args:
        job_id (str): ID del trabajo de transcripción
        api_key (str): Tu clave API
    
    Returns:
        dict: Transcripción completa, o None si hay error
    """
    
    headers = {
        'Authorization': f'Bearer {api_key}'
    }
    

    
    with httpx.Client() as client:
        max_attempts = 120  # Máximo 10 minutos (120 * 5 segundos)
        attempt = 0
        
        while attempt < max_attempts:
            # Consultar estado del trabajo
            response = client.get(
                f"{API_URL}/jobs/{job_id}",
                headers=headers
            )
            
            if response.status_code == 200:
                job_info = response.json()
                status = job_info['job']['status']
                
                if status == 'done':
                    
                    # Obtener la transcripción
                    transcript_response = client.get(
                        f"{API_URL}/jobs/{job_id}/transcript",
                        headers=headers
                    )
                    
                    if transcript_response.status_code == 200:
                        return transcript_response.json()
                    else:
                        logger.error(f"Error al obtener transcripción: {transcript_response.status_code}")
                        return None
                
                elif status == 'rejected':
                    logger.error("La transcripción fue rechazada")
                    return None
                
                else:
                    time.sleep(5)  # Esperar 5 segundos antes de volver a consultar
                    attempt += 1
            else:
                logger.error(f"Error al consultar estado: {response.status_code}")
                return None
        
        logger.error("Timeout: la transcripción tomó demasiado tiempo")
        return None


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
            # Cambio de hablante
            if 'speaker' in resultado_item:
                hablante = resultado_item['speaker']
                if hablante != hablante_actual:
                    hablante_actual = hablante
                    texto_completo += f"\n\nHablante {hablante}:\n"
            
            # Añadir palabra
            texto_completo += resultado_item['alternatives'][0]['content']
            
            # Añadir espacio si es necesario
            if resultado_item.get('is_eos', False):
                texto_completo += ". "
            else:
                texto_completo += " "
    
    return texto_completo.strip()