"""
Servicio de procesamiento de video para extraer audio
Usa moviepy para extraer la pista de audio de archivos de video
"""

import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

try:
    from moviepy.editor import VideoFileClip
    MOVIEPY_AVAILABLE = True
except ImportError:
    MOVIEPY_AVAILABLE = False
    logger.warning("moviepy no está instalado. Funciones de video deshabilitadas.")


def extraer_audio_de_video(video_path, output_path=None, audio_format='mp3'):
    """
    Extrae el audio de un archivo de video y lo guarda como archivo de audio
    
    Args:
        video_path (str): Ruta al archivo de video
        output_path (str): Ruta donde guardar el audio extraído (opcional)
        audio_format (str): Formato del audio de salida ('mp3', 'wav', etc.)
    
    Returns:
        str: Ruta al archivo de audio extraído, o None si hay error
    """
    
    if not MOVIEPY_AVAILABLE:
        logger.error("moviepy no está instalado. Instala con: pip install moviepy")
        return None
    
    try:
        # Verificar que el archivo existe
        if not os.path.exists(video_path):
            logger.error(f"Archivo de video no encontrado: {video_path}")
            return None
        
        # Generar ruta de salida si no se proporciona
        if output_path is None:
            video_dir = os.path.dirname(video_path)
            video_name = Path(video_path).stem
            output_path = os.path.join(video_dir, f"{video_name}.{audio_format}")
        
        logger.info(f"Extrayendo audio de {video_path}")
        
        # Cargar el video
        video = VideoFileClip(video_path)
        
        # Verificar que el video tiene audio
        if video.audio is None:
            logger.error(f"El video no contiene pista de audio: {video_path}")
            video.close()
            return None
        
        # Extraer el audio
        audio = video.audio
        
        # Guardar el audio
        audio.write_audiofile(
            output_path,
            codec='libmp3lame' if audio_format == 'mp3' else None,
            logger=None  # Silenciar logs de moviepy
        )
        
        # Cerrar los recursos
        audio.close()
        video.close()
        
        logger.info(f"Audio extraído exitosamente: {output_path}")
        return output_path
        
    except Exception as e:
        logger.error(f"Error al extraer audio del video: {str(e)}")
        return None


def es_archivo_video(filename):
    """
    Verifica si un archivo es un video basándose en su extensión
    
    Args:
        filename (str): Nombre del archivo
    
    Returns:
        bool: True si es un video, False si no
    """
    extensiones_video = {
        'mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'webm', 
        'mpeg', 'mpg', '3gp', 'm4v', 'ts'
    }
    
    if '.' not in filename:
        return False
    
    extension = filename.rsplit('.', 1)[1].lower()
    return extension in extensiones_video


def obtener_info_video(video_path):
    """
    Obtiene información básica del video
    
    Args:
        video_path (str): Ruta al archivo de video
    
    Returns:
        dict: Información del video (duración, fps, resolución, etc.)
    """
    
    if not MOVIEPY_AVAILABLE:
        logger.error("moviepy no está instalado")
        return None
    
    try:
        video = VideoFileClip(video_path)
        
        info = {
            'duration': video.duration,
            'fps': video.fps,
            'size': video.size,
            'has_audio': video.audio is not None
        }
        
        video.close()
        
        return info
        
    except Exception as e:
        logger.error(f"Error al obtener información del video: {str(e)}")
        return None


