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
import warnings
 
logger = logging.getLogger(__name__)

# Suprimir warnings específicos de soundcard sobre discontinuidad de datos
warnings.filterwarnings('ignore', category=sc.SoundcardRuntimeWarning, 
                       message='data discontinuity in recording')
 
SAMPLE_RATE = 48000  # [Hz]. sampling rate.
BLOCKSIZE = 2048  # Tamaño del buffer interno (mayor = más tolerante a interrupciones)
 
# Estado global de grabación
recording_state = {
    'active': False,
    'system_thread': None,
    'mic_thread': None,
    'system_data': [],
    'mic_data': [],
    'file_id': None,
    'start_time': None,
    'type': None  # 'microphone', 'system', 'both'
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
        # Usar blocksize más grande para evitar discontinuidades
        with sc.get_microphone(id=str(default_speaker.name), include_loopback=True).recorder(
            samplerate=SAMPLE_RATE, 
            blocksize=BLOCKSIZE
        ) as mic:
            data = mic.record(numframes=SAMPLE_RATE * duracion_segundos)
           
            # Guardar como mono (canal único)
            sf.write(file=output_path, data=data[:, 0], samplerate=SAMPLE_RATE)
       
        logger.info(f"Audio del sistema grabado exitosamente: {output_path}")
        return output_path
       
    except Exception as e:
        logger.error(f"Error al grabar audio del sistema: {str(e)}")
        return None
 
def _grabar_sistema_thread():
    """
    Función interna que graba audio del sistema (loopback) continuamente en un thread
    """
    try:
        logger.info("Iniciando thread de grabación del sistema...")
       
        # Obtener el dispositivo de audio del sistema (loopback)
        default_speaker = sc.default_speaker()
       
        if default_speaker is None:
            logger.error("No se encontró un dispositivo de salida de audio predeterminado")
            recording_state['active'] = False
            return
       
        # Grabar en chunks de 1 segundo con buffer más grande
        with sc.get_microphone(id=str(default_speaker.name), include_loopback=True).recorder(
            samplerate=SAMPLE_RATE,
            blocksize=BLOCKSIZE
        ) as mic:
            while recording_state['active']:
                # Grabar 1 segundo de audio
                chunk = mic.record(numframes=SAMPLE_RATE)
               
                # Guardar el chunk en la lista (solo canal mono)
                if chunk.shape[1] > 0:
                    recording_state['system_data'].append(chunk[:, 0])
       
        logger.info("Thread de grabación del sistema detenido")
       
    except Exception as e:
        logger.error(f"Error en thread de grabación del sistema: {str(e)}")
        recording_state['active'] = False
 
 
def _grabar_microfono_thread():
    """
    Función interna que graba audio del micrófono continuamente en un thread
    """
    try:
        logger.info("Iniciando thread de grabación del micrófono...")
       
        # Obtener el micrófono predeterminado
        default_mic = sc.default_microphone()
       
        if default_mic is None:
            logger.error("No se encontró un micrófono predeterminado")
            return
       
        # Grabar en chunks de 1 segundo con buffer más grande
        with default_mic.recorder(samplerate=SAMPLE_RATE, blocksize=BLOCKSIZE) as mic:
            while recording_state['active']:
                # Grabar 1 segundo de audio
                chunk = mic.record(numframes=SAMPLE_RATE)
               
                # Guardar el chunk en la lista (solo canal mono)
                if len(chunk.shape) > 1 and chunk.shape[1] > 0:
                    recording_state['mic_data'].append(chunk[:, 0])
                else:
                    recording_state['mic_data'].append(chunk)
       
        logger.info("Thread de grabación del micrófono detenido")
       
    except Exception as e:
        logger.error(f"Error en thread de grabación del micrófono: {str(e)}")
 
 
def iniciar_grabacion_sistema(output_dir='uploads', recording_type='both'):
    """
    Inicia la grabación continua del audio según el tipo especificado
   
    Args:
        output_dir (str): Directorio donde guardar el archivo
        recording_type (str): Tipo de grabación - 'microphone', 'system', o 'both'
   
    Returns:
        dict: Información sobre la grabación iniciada, o None si hay error
    """
    try:
        # Verificar si ya hay una grabación activa
        if recording_state['active']:
            logger.warning("Ya hay una grabación activa")
            return None
       
        # Generar nombre único para el archivo
        unique_name = f"recording_{uuid.uuid4().hex[:8]}.wav"
       
        # Asegurar que el directorio existe
        os.makedirs(output_dir, exist_ok=True)
       
        # Reiniciar el estado
        recording_state['active'] = True
        recording_state['system_data'] = []
        recording_state['mic_data'] = []
        recording_state['file_id'] = unique_name
        recording_state['start_time'] = None
        recording_state['type'] = recording_type
       
        # Iniciar threads según el tipo de grabación
        if recording_type in ['system', 'both']:
            recording_state['system_thread'] = threading.Thread(
                target=_grabar_sistema_thread,
                daemon=True
            )
            recording_state['system_thread'].start()
            logger.info("Thread de grabación del sistema iniciado")
       
        if recording_type in ['microphone', 'both']:
            recording_state['mic_thread'] = threading.Thread(
                target=_grabar_microfono_thread,
                daemon=True
            )
            recording_state['mic_thread'].start()
            logger.info("Thread de grabación del micrófono iniciado")
       
        logger.info(f"Grabación continua iniciada (tipo: {recording_type}): {unique_name}")
       
        return {
            'file_id': unique_name,
            'status': 'recording',
            'type': recording_type
        }
       
    except Exception as e:
        logger.error(f"Error al iniciar grabación: {str(e)}")
        recording_state['active'] = False
        return None
 
 
def _mezclar_audios(system_data, mic_data, system_volume=0.6, mic_volume=0.4):
    """
    Mezcla dos arrays de audio con volúmenes ajustables
   
    Args:
        system_data (numpy.array): Array con datos del sistema
        mic_data (numpy.array): Array con datos del micrófono
        system_volume (float): Volumen del sistema (0.0 a 1.0)
        mic_volume (float): Volumen del micrófono (0.0 a 1.0)
   
    Returns:
        numpy.array: Audio mezclado
    """
    # Igualar longitudes tomando la menor
    min_length = min(len(system_data), len(mic_data))
   
    if min_length == 0:
        # Si uno está vacío, devolver el otro
        if len(system_data) > 0:
            logger.warning("No hay datos del micrófono, usando solo audio del sistema")
            return system_data
        elif len(mic_data) > 0:
            logger.warning("No hay datos del sistema, usando solo audio del micrófono")
            return mic_data
        else:
            return np.array([])
   
    # Truncar al tamaño mínimo
    system_truncated = system_data[:min_length]
    mic_truncated = mic_data[:min_length]
   
    # Mezclar con los volúmenes especificados
    mixed = (system_truncated * system_volume) + (mic_truncated * mic_volume)
   
    # Normalizar para evitar clipping
    max_val = np.abs(mixed).max()
    if max_val > 1.0:
        mixed = mixed / max_val
   
    logger.info(f"Audio mezclado: {min_length} muestras ({min_length/SAMPLE_RATE:.2f}s), sistema={system_volume}, mic={mic_volume}")
   
    return mixed
 
 
def detener_grabacion_sistema(output_dir='uploads', system_volume=0.6, mic_volume=0.4):
    """
    Detiene la grabación del audio (sistema, micrófono o ambos) y guarda el archivo
   
    Args:
        output_dir (str): Directorio donde guardar el archivo
        system_volume (float): Volumen del audio del sistema (0.0 a 1.0)
        mic_volume (float): Volumen del micrófono (0.0 a 1.0)
   
    Returns:
        dict: Información sobre el archivo grabado, o None si hay error
    """
    try:
        # Permitir finalizar aunque el flag 'active' sea False si hay datos acumulados
        if not recording_state['active']:
            logger.warning("No hay grabación activa, intentando finalizar con datos acumulados")
       
        recording_type = recording_state.get('type', 'both')
        logger.info(f"Deteniendo grabación (tipo: {recording_type})...")
       
        # Detener la grabación (si seguía activa)
        recording_state['active'] = False
       
        # Esperar a que los threads terminen
        if recording_state['system_thread'] and recording_state['system_thread'].is_alive():
            recording_state['system_thread'].join(timeout=2)
       
        if recording_state['mic_thread'] and recording_state['mic_thread'].is_alive():
            recording_state['mic_thread'].join(timeout=2)
       
        # Concatenar todos los chunks de cada fuente
        system_audio = np.concatenate(recording_state['system_data']) if recording_state['system_data'] else np.array([])
        mic_audio = np.concatenate(recording_state['mic_data']) if recording_state['mic_data'] else np.array([])
       
        # Verificar que hay datos grabados
        if len(system_audio) == 0 and len(mic_audio) == 0:
            logger.error("No se grabaron datos de audio")
            return None
       
        # Procesar audio según el tipo de grabación
        if recording_type == 'system':
            final_audio = system_audio
            logger.info(f"Audio del sistema procesado: {len(final_audio)} muestras")
        elif recording_type == 'microphone':
            final_audio = mic_audio
            logger.info(f"Audio del micrófono procesado: {len(final_audio)} muestras")
        else:  # 'both'
            final_audio = _mezclar_audios(system_audio, mic_audio, system_volume, mic_volume)
            if len(final_audio) == 0:
                logger.error("Error al mezclar los audios")
                return None
       
        # Guardar el archivo
        output_path = os.path.join(output_dir, recording_state['file_id'])
        sf.write(file=output_path, data=final_audio, samplerate=SAMPLE_RATE)
       
        # Obtener información del archivo
        file_size = os.path.getsize(output_path)
        duration = len(final_audio) / SAMPLE_RATE
       
        logger.info(f"Audio guardado exitosamente: {output_path} ({duration:.2f} segundos)")
       
        result = {
            'file_id': recording_state['file_id'],
            'filename': recording_state['file_id'],
            'size': file_size,
            'duration': duration,
            'status': 'completed',
            'type': recording_type,
            'system_chunks': len(recording_state['system_data']),
            'mic_chunks': len(recording_state['mic_data'])
        }
       
        # Limpiar el estado
        recording_state['system_data'] = []
        recording_state['mic_data'] = []
        recording_state['file_id'] = None
        recording_state['system_thread'] = None
        recording_state['mic_thread'] = None
        recording_state['type'] = None
       
        return result
       
    except Exception as e:
        logger.error(f"Error al detener grabación: {str(e)}")
        recording_state['active'] = False
        recording_state['system_data'] = []
        recording_state['mic_data'] = []
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
        dict: Diccionario con disponibilidad de sistema y micrófono
    """
    try:
        import soundcard
        default_speaker = sc.default_speaker()
        default_mic = sc.default_microphone()
       
        return {
            'sistema': default_speaker is not None,
            'microfono': default_mic is not None,
            'ambos': default_speaker is not None and default_mic is not None
        }
    except Exception as e:
        logger.warning(f"Error al verificar disponibilidad de audio: {str(e)}")
        return {
            'sistema': False,
            'microfono': False,
            'ambos': False
        }