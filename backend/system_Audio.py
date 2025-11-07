"""
Servicio de grabación de audio del sistema (loopback)
Permite capturar el audio que está reproduciendo el sistema
"""

import soundcard as sc
import soundfile as sf
import os
import uuid
import logging

logger = logging.getLogger(__name__)

SAMPLE_RATE = 48000  # [Hz]. sampling rate.

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