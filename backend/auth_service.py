"""
Servicio de autenticación de usuarios con Supabase
"""

import hashlib
import logging
from database import execute_query

logger = logging.getLogger(__name__)

def hash_password(password):
    """
    Genera un hash SHA-256 de la contraseña
    
    Args:
        password (str): Contraseña en texto plano
        
    Returns:
        str: Hash de la contraseña
    """
    return hashlib.sha256(password.encode()).hexdigest()

def authenticate_user(email, password):
    """
    Autentica un usuario verificando sus credenciales en la base de datos
    
    Args:
        email (str): Email del usuario
        password (str): Contraseña del usuario
        
    Returns:
        dict: Información del usuario si la autenticación es exitosa, None en caso contrario
    """
    try:
        # Normalizar el email a minúsculas
        email = email.lower().strip()
        
        # Hashear la contraseña ingresada
        password_hash = hash_password(password)
        
        # Buscar el usuario en la base de datos (case-insensitive para email)
        query = """
            SELECT id, first_name, last_name, email, role, created_at
            FROM users
            WHERE LOWER(email) = %s AND password = %s
        """
        
        user = execute_query(query, (email, password_hash), fetch_one=True)
        
        if user:
            logger.info(f"Usuario autenticado: {email}")
            return dict(user)
        else:
            logger.warning(f"Credenciales inválidas para: {email}")
            return None
            
    except Exception as e:
        logger.error(f"Error al autenticar usuario: {e}")
        return None

def get_user_by_id(user_id):
    """
    Obtiene la información de un usuario por su ID
    
    Args:
        user_id (int): ID del usuario
        
    Returns:
        dict: Información del usuario o None si no existe
    """
    try:
        query = """
            SELECT id, first_name, last_name, email, role, created_at
            FROM users
            WHERE id = %s
        """
        
        user = execute_query(query, (user_id,), fetch_one=True)
        
        if user:
            return dict(user)
        else:
            return None
            
    except Exception as e:
        logger.error(f"Error al obtener usuario: {e}")
        return None

def get_user_by_email(email):
    """
    Obtiene la información de un usuario por su email
    
    Args:
        email (str): Email del usuario
        
    Returns:
        dict: Información del usuario o None si no existe
    """
    try:
        # Normalizar el email a minúsculas
        email = email.lower().strip()
        
        query = """
            SELECT id, first_name, last_name, email, role, created_at
            FROM users
            WHERE LOWER(email) = %s
        """
        
        user = execute_query(query, (email,), fetch_one=True)
        
        if user:
            return dict(user)
        else:
            return None
            
    except Exception as e:
        logger.error(f"Error al obtener usuario: {e}")
        return None

def create_user(first_name, last_name, email, password, role=1):
    """
    Crea un nuevo usuario en la base de datos
    
    Args:
        first_name (str): Nombre del usuario
        last_name (str): Apellido del usuario
        email (str): Email del usuario
        password (str): Contraseña del usuario
        role (int): Rol del usuario (por defecto 1)
        
    Returns:
        dict: Información del usuario creado o None si falla
    """
    try:
        # Normalizar el email a minúsculas
        email = email.lower().strip()
        
        # Verificar si el usuario ya existe
        existing_user = get_user_by_email(email)
        if existing_user:
            logger.warning(f"Usuario ya existe: {email}")
            return None
        
        # Hashear la contraseña
        password_hash = hash_password(password)
        
        # Insertar el nuevo usuario
        query = """
            INSERT INTO users (first_name, last_name, email, password, role)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, first_name, last_name, email, role, created_at
        """
        
        user = execute_query(
            query,
            (first_name, last_name, email, password_hash, role),
            fetch_one=True
        )
        
        if user:
            logger.info(f"Usuario creado: {email}")
            return dict(user)
        else:
            return None
            
    except Exception as e:
        logger.error(f"Error al crear usuario: {e}")
        return None

def change_password(email, current_password, new_password):
    """
    Cambia la contraseña de un usuario
    
    Args:
        email (str): Email del usuario
        current_password (str): Contraseña actual
        new_password (str): Nueva contraseña
        
    Returns:
        bool: True si se cambió correctamente, False en caso contrario
    """
    try:
        # Normalizar el email
        email = email.lower().strip()
        
        # Verificar que la contraseña actual es correcta
        user = authenticate_user(email, current_password)
        if not user:
            logger.warning(f"Contraseña actual incorrecta para: {email}")
            return False
        
        # Hashear la nueva contraseña
        new_password_hash = hash_password(new_password)
        
        # Actualizar la contraseña
        query = """
            UPDATE users 
            SET password = %s
            WHERE LOWER(email) = %s
        """
        
        rows_affected = execute_query(query, (new_password_hash, email))
        
        if rows_affected and rows_affected > 0:
            logger.info(f"Contraseña actualizada para: {email}")
            return True
        else:
            logger.error(f"No se pudo actualizar contraseña para: {email}")
            return False
            
    except Exception as e:
        logger.error(f"Error al cambiar contraseña: {e}")
        return False

