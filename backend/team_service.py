"""
Servicio para operaciones CRUD de equipos (teams)
"""

import logging
from database import execute_query

logger = logging.getLogger(__name__)

# ==================== CREATE ====================

def create_team(name, supervisor_id, description=None):
    """
    Crea un nuevo equipo
    
    Args:
        name (str): Nombre del equipo
        supervisor_id (int): ID del supervisor
        description (str): Descripción del equipo (opcional)
        
    Returns:
        int: ID del equipo creado o None si falla
    """
    try:
        query = """
            INSERT INTO teams (name, supervisor_id, description)
            VALUES (%s, %s, %s)
            RETURNING id
        """
        result = execute_query(
            query,
            (name, supervisor_id, description),
            fetch_one=True
        )
        
        if result:
            logger.info(f"Equipo creado: ID={result['id']}, supervisor={supervisor_id}")
            return result['id']
        return None
        
    except Exception as e:
        logger.error(f"Error al crear equipo: {e}")
        return None


def add_user_to_team(team_id, user_id):
    """
    Agrega un usuario a un equipo
    
    Args:
        team_id (int): ID del equipo
        user_id (int): ID del usuario
        
    Returns:
        bool: True si se agregó correctamente
    """
    try:
        # Verificar que no exista ya
        check_query = """
            SELECT id FROM team_members 
            WHERE team_id = %s AND user_id = %s
        """
        existing = execute_query(check_query, (team_id, user_id), fetch_one=True)
        
        if existing:
            logger.warning(f"Usuario {user_id} ya está en el equipo {team_id}")
            return False
        
        query = """
            INSERT INTO team_members (team_id, user_id)
            VALUES (%s, %s)
            RETURNING id
        """
        result = execute_query(query, (team_id, user_id), fetch_one=True)
        
        if result:
            logger.info(f"Usuario {user_id} agregado al equipo {team_id}")
            return True
        return False
        
    except Exception as e:
        logger.error(f"Error al agregar usuario {user_id} al equipo {team_id}: {e}")
        return False


# ==================== READ ====================

def get_team_by_id(team_id):
    """
    Obtiene un equipo por su ID
    
    Args:
        team_id (int): ID del equipo
        
    Returns:
        dict: Datos del equipo o None
    """
    try:
        query = """
            SELECT t.*, 
                   u.first_name as supervisor_first_name,
                   u.last_name as supervisor_last_name,
                   u.email as supervisor_email,
                   COUNT(tm.id) as member_count
            FROM teams t
            JOIN users u ON t.supervisor_id = u.id
            LEFT JOIN team_members tm ON t.id = tm.team_id
            WHERE t.id = %s
            GROUP BY t.id, u.first_name, u.last_name, u.email
        """
        result = execute_query(query, (team_id,), fetch_one=True)
        return dict(result) if result else None
        
    except Exception as e:
        logger.error(f"Error al obtener equipo {team_id}: {e}")
        return None


def get_teams_by_supervisor(supervisor_id):
    """
    Obtiene todos los equipos de un supervisor
    
    Args:
        supervisor_id (int): ID del supervisor
        
    Returns:
        list: Lista de equipos
    """
    try:
        query = """
            SELECT t.*, 
                   COUNT(tm.id) as member_count
            FROM teams t
            LEFT JOIN team_members tm ON t.id = tm.team_id
            WHERE t.supervisor_id = %s
            GROUP BY t.id
            ORDER BY t.name
        """
        results = execute_query(query, (supervisor_id,), fetch_all=True)
        return [dict(r) for r in results] if results else []
        
    except Exception as e:
        logger.error(f"Error al obtener equipos del supervisor {supervisor_id}: {e}")
        return []


def get_all_teams():
    """
    Obtiene todos los equipos (solo Admin)
    
    Returns:
        list: Lista de todos los equipos
    """
    try:
        query = """
            SELECT t.*, 
                   u.first_name as supervisor_first_name,
                   u.last_name as supervisor_last_name,
                   COUNT(tm.id) as member_count
            FROM teams t
            JOIN users u ON t.supervisor_id = u.id
            LEFT JOIN team_members tm ON t.id = tm.team_id
            GROUP BY t.id, u.first_name, u.last_name
            ORDER BY t.name
        """
        results = execute_query(query, fetch_all=True)
        return [dict(r) for r in results] if results else []
        
    except Exception as e:
        logger.error(f"Error al obtener todos los equipos: {e}")
        return []


def get_team_members(team_id):
    """
    Obtiene todos los miembros de un equipo
    
    Args:
        team_id (int): ID del equipo
        
    Returns:
        list: Lista de miembros del equipo
    """
    try:
        query = """
            SELECT u.id, u.first_name, u.last_name, u.email, u.role,
                   tm.joined_at
            FROM team_members tm
            JOIN users u ON tm.user_id = u.id
            WHERE tm.team_id = %s
            ORDER BY tm.joined_at DESC
        """
        results = execute_query(query, (team_id,), fetch_all=True)
        return [dict(r) for r in results] if results else []
        
    except Exception as e:
        logger.error(f"Error al obtener miembros del equipo {team_id}: {e}")
        return []


def get_user_teams(user_id):
    """
    Obtiene todos los equipos donde está un usuario
    
    Args:
        user_id (int): ID del usuario
        
    Returns:
        list: Lista de equipos
    """
    try:
        query = """
            SELECT t.id, t.name, t.description, t.created_at,
                   u.first_name as supervisor_first_name,
                   u.last_name as supervisor_last_name,
                   tm.joined_at
            FROM team_members tm
            JOIN teams t ON tm.team_id = t.id
            JOIN users u ON t.supervisor_id = u.id
            WHERE tm.user_id = %s
            ORDER BY t.name
        """
        results = execute_query(query, (user_id,), fetch_all=True)
        return [dict(r) for r in results] if results else []
        
    except Exception as e:
        logger.error(f"Error al obtener equipos del usuario {user_id}: {e}")
        return []


def is_user_in_team(user_id, team_id):
    """
    Verifica si un usuario pertenece a un equipo
    
    Args:
        user_id (int): ID del usuario
        team_id (int): ID del equipo
        
    Returns:
        bool: True si el usuario está en el equipo
    """
    try:
        query = """
            SELECT EXISTS(
                SELECT 1 FROM team_members
                WHERE user_id = %s AND team_id = %s
            ) as is_member
        """
        result = execute_query(query, (user_id, team_id), fetch_one=True)
        return result['is_member'] if result else False
        
    except Exception as e:
        logger.error(f"Error al verificar membresía: {e}")
        return False


def get_team_ids_by_supervisor(supervisor_id):
    """
    Obtiene solo los IDs de equipos de un supervisor
    
    Args:
        supervisor_id (int): ID del supervisor
        
    Returns:
        list: Lista de IDs de equipos
    """
    try:
        query = "SELECT id FROM teams WHERE supervisor_id = %s"
        results = execute_query(query, (supervisor_id,), fetch_all=True)
        return [r['id'] for r in results] if results else []
        
    except Exception as e:
        logger.error(f"Error al obtener IDs de equipos: {e}")
        return []


# ==================== UPDATE ====================

def update_team(team_id, name=None, description=None, supervisor_id=None):
    """
    Actualiza información de un equipo
    
    Args:
        team_id (int): ID del equipo
        name (str): Nuevo nombre (opcional)
        description (str): Nueva descripción (opcional)
        supervisor_id (int): Nuevo supervisor (opcional)
        
    Returns:
        bool: True si se actualizó correctamente
    """
    try:
        updates = []
        params = []
        
        if name is not None:
            updates.append("name = %s")
            params.append(name)
        
        if description is not None:
            updates.append("description = %s")
            params.append(description)
        
        if supervisor_id is not None:
            updates.append("supervisor_id = %s")
            params.append(supervisor_id)
        
        if not updates:
            return False
        
        params.append(team_id)
        query = f"UPDATE teams SET {', '.join(updates)} WHERE id = %s"
        
        rows = execute_query(query, tuple(params))
        
        if rows and rows > 0:
            logger.info(f"Equipo {team_id} actualizado")
            return True
        return False
        
    except Exception as e:
        logger.error(f"Error al actualizar equipo {team_id}: {e}")
        return False


# ==================== DELETE ====================

def remove_user_from_team(team_id, user_id):
    """
    Remueve un usuario de un equipo
    
    Args:
        team_id (int): ID del equipo
        user_id (int): ID del usuario
        
    Returns:
        bool: True si se removió correctamente
    """
    try:
        query = """
            DELETE FROM team_members
            WHERE team_id = %s AND user_id = %s
        """
        rows = execute_query(query, (team_id, user_id))
        
        if rows and rows > 0:
            logger.info(f"Usuario {user_id} removido del equipo {team_id}")
            return True
        return False
        
    except Exception as e:
        logger.error(f"Error al remover usuario {user_id} del equipo {team_id}: {e}")
        return False


def delete_team(team_id):
    """
    Elimina un equipo
    NOTA: Esto también eliminará automáticamente (CASCADE):
    - team_members (todas las membresías)
    
    Args:
        team_id (int): ID del equipo
        
    Returns:
        bool: True si se eliminó correctamente
    """
    try:
        query = "DELETE FROM teams WHERE id = %s"
        rows = execute_query(query, (team_id,))
        
        if rows and rows > 0:
            logger.info(f"Equipo {team_id} eliminado")
            return True
        return False
        
    except Exception as e:
        logger.error(f"Error al eliminar equipo {team_id}: {e}")
        return False


# ==================== UTILIDADES ====================

def count_team_members(team_id):
    """
    Cuenta el número de miembros en un equipo
    
    Args:
        team_id (int): ID del equipo
        
    Returns:
        int: Número de miembros
    """
    try:
        query = "SELECT COUNT(*) as count FROM team_members WHERE team_id = %s"
        result = execute_query(query, (team_id,), fetch_one=True)
        return result['count'] if result else 0
        
    except Exception as e:
        logger.error(f"Error al contar miembros del equipo {team_id}: {e}")
        return 0


def get_available_users_for_team(team_id, search=None):
    """
    Obtiene usuarios que pueden ser agregados a un equipo
    (usuarios que NO están ya en el equipo)
    
    Args:
        team_id (int): ID del equipo
        search (str): Término de búsqueda (opcional)
        
    Returns:
        list: Lista de usuarios disponibles
    """
    try:
        if search:
            query = """
                SELECT u.id, u.first_name, u.last_name, u.email, u.role
                FROM users u
                WHERE u.id NOT IN (
                    SELECT user_id FROM team_members WHERE team_id = %s
                )
                AND (
                    LOWER(u.first_name) LIKE LOWER(%s) OR
                    LOWER(u.last_name) LIKE LOWER(%s) OR
                    LOWER(u.email) LIKE LOWER(%s)
                )
                ORDER BY u.first_name, u.last_name
                LIMIT 50
            """
            search_term = f"%{search}%"
            params = (team_id, search_term, search_term, search_term)
        else:
            query = """
                SELECT u.id, u.first_name, u.last_name, u.email, u.role
                FROM users u
                WHERE u.id NOT IN (
                    SELECT user_id FROM team_members WHERE team_id = %s
                )
                ORDER BY u.first_name, u.last_name
                LIMIT 50
            """
            params = (team_id,)
        
        results = execute_query(query, params, fetch_all=True)
        return [dict(r) for r in results] if results else []
        
    except Exception as e:
        logger.error(f"Error al obtener usuarios disponibles: {e}")
        return []



