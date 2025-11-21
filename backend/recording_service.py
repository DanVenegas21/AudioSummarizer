"""
Servicio para operaciones CRUD de grabaciones (recordings)
"""

import os
import logging
from database import execute_query

logger = logging.getLogger(__name__)

# ==================== CREATE ====================

def create_recording(user_id, filename, original_filename, file_path, 
                     file_size, duration=None, mimetype=None, status='uploaded'):
    """
    Crea un nuevo registro de grabación en la base de datos
    
    Args:
        user_id (int): ID del usuario que subió el archivo
        filename (str): Nombre único generado (UUID)
        original_filename (str): Nombre original del archivo
        file_path (str): Ruta completa del archivo
        file_size (int): Tamaño en bytes
        duration (float): Duración en segundos (opcional)
        mimetype (str): Tipo MIME del archivo (opcional)
        status (str): Estado inicial ('uploaded', 'processing', etc.)
        
    Returns:
        int: ID de la grabación creada o None si falla
    """
    try:
        query = """
            INSERT INTO recordings 
            (user_id, filename, original_filename, file_path, file_size, 
             duration, mimetype, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        result = execute_query(
            query,
            (user_id, filename, original_filename, file_path, file_size, 
             duration, mimetype, status),
            fetch_one=True
        )
        
        if result:
            logger.info(f"Grabación creada: ID={result['id']}, usuario={user_id}")
            return result['id']
        return None
        
    except Exception as e:
        logger.error(f"Error al crear grabación: {e}")
        return None


# ==================== READ ====================

def get_recording_by_id(recording_id):
    """
    Obtiene una grabación por su ID
    
    Args:
        recording_id (int): ID de la grabación
        
    Returns:
        dict: Datos de la grabación o None
    """
    try:
        query = """
            SELECT r.*, 
                   u.first_name, u.last_name, u.email,
                   CASE WHEN t.id IS NOT NULL THEN true ELSE false END as has_transcription,
                   CASE WHEN s.id IS NOT NULL THEN true ELSE false END as has_summary
            FROM recordings r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN transcriptions t ON r.id = t.recording_id
            LEFT JOIN summaries s ON r.id = s.recording_id
            WHERE r.id = %s
        """
        result = execute_query(query, (recording_id,), fetch_one=True)
        
        if result:
            return dict(result)
        return None
        
    except Exception as e:
        logger.error(f"Error al obtener grabación {recording_id}: {e}")
        return None


def get_user_recordings(user_id, limit=100, offset=0, status=None):
    """
    Obtiene todas las grabaciones de un usuario
    
    Args:
        user_id (int): ID del usuario
        limit (int): Máximo de resultados
        offset (int): Desplazamiento para paginación
        status (str): Filtrar por estado (opcional)
        
    Returns:
        list: Lista de grabaciones
    """
    try:
        if status:
            query = """
                SELECT r.*, 
                       CASE WHEN t.id IS NOT NULL THEN true ELSE false END as has_transcription,
                       CASE WHEN s.id IS NOT NULL THEN true ELSE false END as has_summary
                FROM recordings r
                LEFT JOIN transcriptions t ON r.id = t.recording_id
                LEFT JOIN summaries s ON r.id = s.recording_id
                WHERE r.user_id = %s AND r.status = %s
                ORDER BY r.upload_date DESC
                LIMIT %s OFFSET %s
            """
            params = (user_id, status, limit, offset)
        else:
            query = """
                SELECT r.*, 
                       CASE WHEN t.id IS NOT NULL THEN true ELSE false END as has_transcription,
                       CASE WHEN s.id IS NOT NULL THEN true ELSE false END as has_summary
                FROM recordings r
                LEFT JOIN transcriptions t ON r.id = t.recording_id
                LEFT JOIN summaries s ON r.id = s.recording_id
                WHERE r.user_id = %s
                ORDER BY r.upload_date DESC
                LIMIT %s OFFSET %s
            """
            params = (user_id, limit, offset)
        
        results = execute_query(query, params, fetch_all=True)
        return [dict(r) for r in results] if results else []
        
    except Exception as e:
        logger.error(f"Error al obtener grabaciones del usuario {user_id}: {e}")
        return []


def get_supervisor_recordings(supervisor_id, limit=100, offset=0):
    """
    Obtiene grabaciones accesibles por un supervisor:
    - Sus propias grabaciones
    - Grabaciones de miembros de sus equipos
    
    Args:
        supervisor_id (int): ID del supervisor
        limit (int): Máximo de resultados
        offset (int): Desplazamiento
        
    Returns:
        list: Lista de grabaciones accesibles
    """
    try:
        query = """
            SELECT DISTINCT r.*, 
                   u.first_name, u.last_name, u.email,
                   CASE WHEN t.id IS NOT NULL THEN true ELSE false END as has_transcription,
                   CASE WHEN s.id IS NOT NULL THEN true ELSE false END as has_summary
            FROM recordings r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN transcriptions t ON r.id = t.recording_id
            LEFT JOIN summaries s ON r.id = s.recording_id
            WHERE 
                r.user_id = %s
                OR r.user_id IN (
                    SELECT tm.user_id
                    FROM team_members tm
                    JOIN teams te ON tm.team_id = te.id
                    WHERE te.supervisor_id = %s
                )
            ORDER BY r.upload_date DESC
            LIMIT %s OFFSET %s
        """
        results = execute_query(
            query, 
            (supervisor_id, supervisor_id, limit, offset),
            fetch_all=True
        )
        return [dict(r) for r in results] if results else []
        
    except Exception as e:
        logger.error(f"Error al obtener grabaciones del supervisor {supervisor_id}: {e}")
        return []


def get_all_recordings(limit=100, offset=0):
    """
    Obtiene todas las grabaciones (solo Admin)
    
    Args:
        limit (int): Máximo de resultados
        offset (int): Desplazamiento
        
    Returns:
        list: Lista de todas las grabaciones
    """
    try:
        query = """
            SELECT r.*, 
                   u.first_name, u.last_name, u.email,
                   CASE WHEN t.id IS NOT NULL THEN true ELSE false END as has_transcription,
                   CASE WHEN s.id IS NOT NULL THEN true ELSE false END as has_summary
            FROM recordings r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN transcriptions t ON r.id = t.recording_id
            LEFT JOIN summaries s ON r.id = s.recording_id
            ORDER BY r.upload_date DESC
            LIMIT %s OFFSET %s
        """
        results = execute_query(query, (limit, offset), fetch_all=True)
        return [dict(r) for r in results] if results else []
        
    except Exception as e:
        logger.error(f"Error al obtener todas las grabaciones: {e}")
        return []


# ==================== UPDATE ====================

def update_recording_status(recording_id, status):
    """
    Actualiza el estado de una grabación
    
    Args:
        recording_id (int): ID de la grabación
        status (str): Nuevo estado
        
    Returns:
        bool: True si se actualizó correctamente
    """
    try:
        query = """
            UPDATE recordings 
            SET status = %s
            WHERE id = %s
        """
        rows = execute_query(query, (status, recording_id))
        
        if rows and rows > 0:
            logger.info(f"Grabación {recording_id} actualizada a estado: {status}")
            return True
        return False
        
    except Exception as e:
        logger.error(f"Error al actualizar estado de grabación {recording_id}: {e}")
        return False


def update_recording_duration(recording_id, duration):
    """
    Actualiza la duración de una grabación
    
    Args:
        recording_id (int): ID de la grabación
        duration (float): Duración en segundos
        
    Returns:
        bool: True si se actualizó correctamente
    """
    try:
        query = """
            UPDATE recordings 
            SET duration = %s
            WHERE id = %s
        """
        rows = execute_query(query, (duration, recording_id))
        return rows and rows > 0
        
    except Exception as e:
        logger.error(f"Error al actualizar duración de grabación {recording_id}: {e}")
        return False


# ==================== DELETE ====================

def delete_recording(recording_id):
    """
    Elimina una grabación de la base de datos
    NOTA: Esto también eliminará automáticamente (CASCADE):
    - transcriptions
    - summaries
    - pinecone_vectors
    
    Args:
        recording_id (int): ID de la grabación
        
    Returns:
        bool: True si se eliminó correctamente
    """
    try:
        query = "DELETE FROM recordings WHERE id = %s"
        rows = execute_query(query, (recording_id,))
        
        if rows and rows > 0:
            logger.info(f"Grabación {recording_id} eliminada de la base de datos")
            return True
        return False
        
    except Exception as e:
        logger.error(f"Error al eliminar grabación {recording_id}: {e}")
        return False


def delete_recording_file(file_path):
    """
    Elimina el archivo físico de una grabación
    
    Args:
        file_path (str): Ruta del archivo
        
    Returns:
        bool: True si se eliminó correctamente
    """
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Archivo eliminado: {file_path}")
            return True
        return False
        
    except Exception as e:
        logger.error(f"Error al eliminar archivo {file_path}: {e}")
        return False


# ==================== UTILIDADES ====================

def count_user_recordings(user_id):
    """
    Cuenta el total de grabaciones de un usuario
    
    Args:
        user_id (int): ID del usuario
        
    Returns:
        int: Número de grabaciones
    """
    try:
        query = "SELECT COUNT(*) as count FROM recordings WHERE user_id = %s"
        result = execute_query(query, (user_id,), fetch_one=True)
        return result['count'] if result else 0
        
    except Exception as e:
        logger.error(f"Error al contar grabaciones del usuario {user_id}: {e}")
        return 0


def get_recording_with_content(recording_id):
    """
    Obtiene una grabación con toda su información relacionada
    (transcripción y resumen)
    
    Args:
        recording_id (int): ID de la grabación
        
    Returns:
        dict: Grabación completa con transcripción y resumen
    """
    try:
        query = """
            SELECT 
                r.*,
                u.first_name, u.last_name, u.email,
                t.transcription_text, t.dialogues, t.language,
                s.summary, s.keywords
            FROM recordings r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN transcriptions t ON r.id = t.recording_id
            LEFT JOIN summaries s ON r.id = s.recording_id
            WHERE r.id = %s
        """
        result = execute_query(query, (recording_id,), fetch_one=True)
        return dict(result) if result else None
        
    except Exception as e:
        logger.error(f"Error al obtener grabación completa {recording_id}: {e}")
        return None



