"""
Servicio de grabación de audio del sistema (loopback)
Permite capturar el audio que está reproduciendo el sistema
"""

import soundcard as sc
import soundfile as sf
import os
import uuid
import logging
import threading
import numpy as np

logger = logging.getLogger(__name__)

SAMPLE_RATE = 48000  # [Hz]. sampling rate.

# Estado global de grabación
recording_state = {
    'active': False,
    'thread': None,
    'data': [],
    'file_id': None,
    'start_time': None
}

def grabar_audio_sistema(duracion_segundos=30, output_dir='uploads'):
    """
    Graba el audio del sistema (lo que está sonando en la computadora)
    
    Args:
        duracion_segundos (int): Duración de la grabación en segundos
        output_dir (str): Directorio donde guardar el archivo
    
    Returns:
        str: Ruta al archivo de audio grabado, o None si hay error
    """
    try:
        # Generar nombre único para el archivo
        unique_name = f"system_audio_{uuid.uuid4().hex[:8]}.wav"
        output_path = os.path.join(output_dir, unique_name)
        
        # Asegurar que el directorio existe
        os.makedirs(output_dir, exist_ok=True)
        
        logger.info(f"Iniciando grabación del audio del sistema por {duracion_segundos} segundos...")
        
        # Obtener el dispositivo de audio del sistema (loopback)
        default_speaker = sc.default_speaker()
        
        if default_speaker is None:
            logger.error("No se encontró un dispositivo de salida de audio predeterminado")
            return None
        
        # Grabar audio con loopback desde el altavoz predeterminado
        with sc.get_microphone(id=str(default_speaker.name), include_loopback=True).recorder(samplerate=SAMPLE_RATE) as mic:
            data = mic.record(numframes=SAMPLE_RATE * duracion_segundos)
            
            # Guardar como mono (canal único)
            sf.write(file=output_path, data=data[:, 0], samplerate=SAMPLE_RATE)
        
        logger.info(f"Audio del sistema grabado exitosamente: {output_path}")
        return output_path
        
    except Exception as e:
        logger.error(f"Error al grabar audio del sistema: {str(e)}")
        return None


def _grabar_continuo_thread(output_dir):
    """
    Función interna que graba audio continuamente en un thread
    """
    try:
        logger.info("Iniciando thread de grabación continua del sistema...")
        
        # Obtener el dispositivo de audio del sistema (loopback)
        default_speaker = sc.default_speaker()
        
        if default_speaker is None:
            logger.error("No se encontró un dispositivo de salida de audio predeterminado")
            recording_state['active'] = False
            return
        
        # Grabar en chunks de 1 segundo
        with sc.get_microphone(id=str(default_speaker.name), include_loopback=True).recorder(samplerate=SAMPLE_RATE) as mic:
            while recording_state['active']:
                # Grabar 1 segundo de audio
                chunk = mic.record(numframes=SAMPLE_RATE)
                
                # Guardar el chunk en la lista (solo canal mono)
                if chunk.shape[1] > 0:
                    recording_state['data'].append(chunk[:, 0])
        
        logger.info("Thread de grabación detenido")
        
    except Exception as e:
        logger.error(f"Error en thread de grabación: {str(e)}")
        recording_state['active'] = False


def iniciar_grabacion_sistema(output_dir='uploads'):
    """
    Inicia la grabación continua del audio del sistema
    
    Args:
        output_dir (str): Directorio donde guardar el archivo
    
    Returns:
        dict: Información sobre la grabación iniciada, o None si hay error
    """
    try:
        # Verificar si ya hay una grabación activa
        if recording_state['active']:
            logger.warning("Ya hay una grabación activa")
            return None
        
        # Generar nombre único para el archivo
        unique_name = f"system_audio_{uuid.uuid4().hex[:8]}.wav"
        
        # Asegurar que el directorio existe
        os.makedirs(output_dir, exist_ok=True)
        
        # Reiniciar el estado
        recording_state['active'] = True
        recording_state['data'] = []
        recording_state['file_id'] = unique_name
        recording_state['start_time'] = None
        
        # Iniciar el thread de grabación
        recording_state['thread'] = threading.Thread(
            target=_grabar_continuo_thread,
            args=(output_dir,),
            daemon=True
        )
        recording_state['thread'].start()
        
        logger.info(f"Grabación continua iniciada: {unique_name}")
        
        return {
            'file_id': unique_name,
            'status': 'recording'
        }
        
    except Exception as e:
        logger.error(f"Error al iniciar grabación del sistema: {str(e)}")
        recording_state['active'] = False
        return None


def detener_grabacion_sistema(output_dir='uploads'):
    """
    Detiene la grabación del audio del sistema y guarda el archivo
    
    Args:
        output_dir (str): Directorio donde guardar el archivo
    
    Returns:
        dict: Información sobre el archivo grabado, o None si hay error
    """
    try:
        # Verificar si hay una grabación activa
        if not recording_state['active']:
            logger.warning("No hay grabación activa")
            return None
        
        logger.info("Deteniendo grabación del sistema...")
        
        # Detener la grabación
        recording_state['active'] = False
        
        # Esperar a que el thread termine
        if recording_state['thread'] and recording_state['thread'].is_alive():
            recording_state['thread'].join(timeout=2)
        
        # Verificar que hay datos grabados
        if not recording_state['data'] or len(recording_state['data']) == 0:
            logger.error("No se grabaron datos de audio")
            return None
        
        # Concatenar todos los chunks
        audio_data = np.concatenate(recording_state['data'])
        
        # Guardar el archivo
        output_path = os.path.join(output_dir, recording_state['file_id'])
        sf.write(file=output_path, data=audio_data, samplerate=SAMPLE_RATE)
        
        # Obtener información del archivo
        file_size = os.path.getsize(output_path)
        duration = len(audio_data) / SAMPLE_RATE
        
        logger.info(f"Audio del sistema grabado exitosamente: {output_path} ({duration:.2f} segundos)")
        
        result = {
            'file_id': recording_state['file_id'],
            'filename': recording_state['file_id'],
            'size': file_size,
            'duration': duration,
            'status': 'completed'
        }
        
        # Limpiar el estado
        recording_state['data'] = []
        recording_state['file_id'] = None
        recording_state['thread'] = None
        
        return result
        
    except Exception as e:
        logger.error(f"Error al detener grabación del sistema: {str(e)}")
        recording_state['active'] = False
        recording_state['data'] = []
        return None


def esta_grabando_sistema():
    """
    Verifica si hay una grabación de audio del sistema en curso
    
    Returns:
        bool: True si está grabando, False si no
    """
    return recording_state['active']


def esta_disponible_grabacion_sistema():
    """
    Verifica si la grabación de audio del sistema está disponible
    
    Returns:
        bool: True si está disponible, False si no
    """
    try:
        import soundcard
        default_speaker = sc.default_speaker()
        return default_speaker is not None
    except Exception as e:
        logger.warning(f"Grabación de audio del sistema no disponible: {str(e)}")
        return False