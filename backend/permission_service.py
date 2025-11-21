"""
Servicio para verificar permisos por rol
Roles: 0=Admin, 1=Supervisor, 2=Usuario General
"""

import logging
from database import execute_query
from team_service import get_team_ids_by_supervisor, is_user_in_team

logger = logging.getLogger(__name__)

# Definición de roles
ROLE_ADMIN = 0
ROLE_SUPERVISOR = 1
ROLE_USER = 2

# ==================== VERIFICACIÓN DE ROLES ====================

def is_admin(user_role):
    """Verifica si el usuario es administrador"""
    return user_role == ROLE_ADMIN


def is_supervisor(user_role):
    """Verifica si el usuario es supervisor"""
    return user_role == ROLE_SUPERVISOR


def is_user(user_role):
    """Verifica si el usuario es usuario general"""
    return user_role == ROLE_USER


def has_role_or_higher(user_role, required_role):
    """
    Verifica si el usuario tiene el rol requerido o superior
    (números menores = roles superiores: 0=Admin > 1=Supervisor > 2=User)
    
    Args:
        user_role (int): Rol del usuario
        required_role (int): Rol requerido
        
    Returns:
        bool: True si tiene el rol o superior
    """
    return user_role <= required_role


# ==================== PERMISOS DE GRABACIONES ====================

def can_access_recording(user_id, user_role, recording_id):
    """
    Verifica si un usuario puede acceder a una grabación
    
    Args:
        user_id (int): ID del usuario
        user_role (int): Rol del usuario (0, 1, o 2)
        recording_id (int): ID de la grabación
        
    Returns:
        bool: True si puede acceder
    """
    try:
        # Admin puede acceder a todo
        if is_admin(user_role):
            return True
        
        # Obtener la grabación
        query = "SELECT user_id FROM recordings WHERE id = %s"
        recording = execute_query(query, (recording_id,), fetch_one=True)
        
        if not recording:
            return False
        
        # Si es el propietario
        if recording['user_id'] == user_id:
            return True
        
        # Si es supervisor, verificar si el dueño está en sus equipos
        if is_supervisor(user_role):
            return is_user_in_supervisor_teams(user_id, recording['user_id'])
        
        # Usuario general solo puede ver sus propias grabaciones
        return False
        
    except Exception as e:
        logger.error(f"Error al verificar acceso a grabación {recording_id}: {e}")
        return False


def can_delete_recording(user_id, user_role, recording_id):
    """
    Verifica si un usuario puede eliminar una grabación
    
    Args:
        user_id (int): ID del usuario
        user_role (int): Rol del usuario
        recording_id (int): ID de la grabación
        
    Returns:
        bool: True si puede eliminar
    """
    # Mismas reglas que acceso
    return can_access_recording(user_id, user_role, recording_id)


def can_upload_recording(user_role):
    """
    Verifica si un usuario puede subir grabaciones
    
    Args:
        user_role (int): Rol del usuario
        
    Returns:
        bool: True si puede subir (TODOS los roles pueden)
    """
    return user_role in [ROLE_ADMIN, ROLE_SUPERVISOR, ROLE_USER]


# ==================== PERMISOS DE EQUIPOS ====================

def can_create_team(user_role):
    """
    Verifica si un usuario puede crear equipos
    
    Args:
        user_role (int): Rol del usuario
        
    Returns:
        bool: True si puede crear equipos (Admin y Supervisor)
    """
    return is_admin(user_role) or is_supervisor(user_role)


def can_manage_team(user_id, user_role, team_id):
    """
    Verifica si un usuario puede gestionar un equipo
    (agregar/remover miembros, editar)
    
    Args:
        user_id (int): ID del usuario
        user_role (int): Rol del usuario
        team_id (int): ID del equipo
        
    Returns:
        bool: True si puede gestionar
    """
    try:
        # Admin puede gestionar todos los equipos
        if is_admin(user_role):
            return True
        
        # Supervisor solo puede gestionar sus propios equipos
        if is_supervisor(user_role):
            query = "SELECT supervisor_id FROM teams WHERE id = %s"
            team = execute_query(query, (team_id,), fetch_one=True)
            return team and team['supervisor_id'] == user_id
        
        # Usuario general no puede gestionar equipos
        return False
        
    except Exception as e:
        logger.error(f"Error al verificar gestión de equipo {team_id}: {e}")
        return False


def can_delete_team(user_id, user_role, team_id):
    """
    Verifica si un usuario puede eliminar un equipo
    
    Args:
        user_id (int): ID del usuario
        user_role (int): Rol del usuario
        team_id (int): ID del equipo
        
    Returns:
        bool: True si puede eliminar
    """
    # Mismas reglas que gestionar
    return can_manage_team(user_id, user_role, team_id)


def can_add_user_to_team(user_id, user_role, team_id):
    """
    Verifica si un usuario puede agregar miembros a un equipo
    
    Args:
        user_id (int): ID del usuario
        user_role (int): Rol del usuario
        team_id (int): ID del equipo
        
    Returns:
        bool: True si puede agregar miembros
    """
    return can_manage_team(user_id, user_role, team_id)


def can_remove_user_from_team(user_id, user_role, team_id):
    """
    Verifica si un usuario puede remover miembros de un equipo
    
    Args:
        user_id (int): ID del usuario
        user_role (int): Rol del usuario
        team_id (int): ID del equipo
        
    Returns:
        bool: True si puede remover miembros
    """
    return can_manage_team(user_id, user_role, team_id)


# ==================== PERMISOS DE USUARIOS ====================

def can_create_user(user_role):
    """
    Verifica si un usuario puede crear nuevos usuarios
    
    Args:
        user_role (int): Rol del usuario
        
    Returns:
        bool: True si puede crear usuarios (solo Admin)
    """
    return is_admin(user_role)


def can_edit_user(user_id, user_role, target_user_id):
    """
    Verifica si un usuario puede editar información de otro usuario
    
    Args:
        user_id (int): ID del usuario que quiere editar
        user_role (int): Rol del usuario
        target_user_id (int): ID del usuario a editar
        
    Returns:
        bool: True si puede editar
    """
    # Admin puede editar a cualquiera
    if is_admin(user_role):
        return True
    
    # Usuario puede editar su propia información básica
    return user_id == target_user_id


def can_delete_user(user_role):
    """
    Verifica si un usuario puede eliminar usuarios
    
    Args:
        user_role (int): Rol del usuario
        
    Returns:
        bool: True si puede eliminar usuarios (solo Admin)
    """
    return is_admin(user_role)


def can_change_user_role(user_role):
    """
    Verifica si un usuario puede cambiar roles de otros usuarios
    
    Args:
        user_role (int): Rol del usuario
        
    Returns:
        bool: True si puede cambiar roles (solo Admin)
    """
    return is_admin(user_role)


# ==================== UTILIDADES ====================

def is_user_in_supervisor_teams(supervisor_id, user_id):
    """
    Verifica si un usuario está en algún equipo supervisado por alguien
    
    Args:
        supervisor_id (int): ID del supervisor
        user_id (int): ID del usuario a verificar
        
    Returns:
        bool: True si el usuario está en algún equipo del supervisor
    """
    try:
        query = """
            SELECT EXISTS(
                SELECT 1
                FROM team_members tm
                JOIN teams t ON tm.team_id = t.id
                WHERE t.supervisor_id = %s
                AND tm.user_id = %s
            ) as is_in_team
        """
        result = execute_query(query, (supervisor_id, user_id), fetch_one=True)
        return result['is_in_team'] if result else False
        
    except Exception as e:
        logger.error(f"Error al verificar usuario en equipos: {e}")
        return False


def get_accessible_recording_ids(user_id, user_role):
    """
    Obtiene los IDs de todas las grabaciones accesibles por un usuario
    
    Args:
        user_id (int): ID del usuario
        user_role (int): Rol del usuario
        
    Returns:
        list: Lista de IDs de grabaciones accesibles
    """
    try:
        # Admin puede acceder a todas
        if is_admin(user_role):
            query = "SELECT id FROM recordings"
            results = execute_query(query, fetch_all=True)
            return [r['id'] for r in results] if results else []
        
        # Supervisor: sus grabaciones + grabaciones de sus equipos
        if is_supervisor(user_role):
            query = """
                SELECT DISTINCT r.id
                FROM recordings r
                WHERE r.user_id = %s
                OR r.user_id IN (
                    SELECT tm.user_id
                    FROM team_members tm
                    JOIN teams t ON tm.team_id = t.id
                    WHERE t.supervisor_id = %s
                )
            """
            results = execute_query(query, (user_id, user_id), fetch_all=True)
            return [r['id'] for r in results] if results else []
        
        # Usuario general: solo sus grabaciones
        query = "SELECT id FROM recordings WHERE user_id = %s"
        results = execute_query(query, (user_id,), fetch_all=True)
        return [r['id'] for r in results] if results else []
        
    except Exception as e:
        logger.error(f"Error al obtener IDs accesibles: {e}")
        return []


def filter_accessible_recordings(user_id, user_role, recording_ids):
    """
    Filtra una lista de IDs de grabaciones dejando solo las accesibles
    
    Args:
        user_id (int): ID del usuario
        user_role (int): Rol del usuario
        recording_ids (list): Lista de IDs a filtrar
        
    Returns:
        list: Lista filtrada de IDs accesibles
    """
    if not recording_ids:
        return []
    
    accessible_ids = get_accessible_recording_ids(user_id, user_role)
    return [rid for rid in recording_ids if rid in accessible_ids]


def get_user_permissions_summary(user_role):
    """
    Obtiene un resumen de permisos para un rol
    
    Args:
        user_role (int): Rol del usuario
        
    Returns:
        dict: Diccionario con permisos booleanos
    """
    return {
        'role': user_role,
        'role_name': {0: 'Admin', 1: 'Supervisor', 2: 'User'}.get(user_role, 'Unknown'),
        'can_upload_recordings': True,
        'can_view_all_recordings': is_admin(user_role),
        'can_view_team_recordings': is_admin(user_role) or is_supervisor(user_role),
        'can_create_teams': is_admin(user_role) or is_supervisor(user_role),
        'can_manage_own_teams': is_admin(user_role) or is_supervisor(user_role),
        'can_manage_all_teams': is_admin(user_role),
        'can_create_users': is_admin(user_role),
        'can_edit_all_users': is_admin(user_role),
        'can_delete_users': is_admin(user_role),
        'can_change_roles': is_admin(user_role),
    }


# ==================== DECORADORES PARA ENDPOINTS ====================

def require_role(min_role):
    """
    Decorador para verificar rol mínimo
    Uso: @require_role(ROLE_SUPERVISOR)
    """
    def decorator(func):
        def wrapper(current_user, *args, **kwargs):
            if not has_role_or_higher(current_user['role'], min_role):
                raise PermissionError(f"Requiere rol {min_role} o superior")
            return func(current_user, *args, **kwargs)
        return wrapper
    return decorator


def require_admin(func):
    """Decorador para verificar que sea Admin"""
    def wrapper(current_user, *args, **kwargs):
        if not is_admin(current_user['role']):
            raise PermissionError("Requiere rol de Administrador")
        return func(current_user, *args, **kwargs)
    return wrapper



