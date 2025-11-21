"""
Módulo para manejar la conexión con la base de datos Supabase
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv
import logging

# Cargar variables de entorno
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

logger = logging.getLogger(__name__)

def get_db_connection():
    """
    Crea y retorna una conexión a la base de datos Supabase
    
    Returns:
        connection: Objeto de conexión psycopg2 o None si falla
    """
    try:
        # Obtener la URL de la base de datos
        database_url = os.getenv('DATABASE_URL')
        
        if not database_url:
            logger.error("DATABASE_URL no está configurada en el archivo .env")
            return None
        
        # Conectar a la base de datos
        connection = psycopg2.connect(
            database_url,
            cursor_factory=RealDictCursor
        )
        
        return connection
        
    except Exception as e:
        logger.error(f"Error al conectar a la base de datos: {e}")
        return None

def test_connection():
    """
    Prueba la conexión a la base de datos
    
    Returns:
        bool: True si la conexión es exitosa, False en caso contrario
    """
    try:
        connection = get_db_connection()
        
        if connection is None:
            return False
        
        cursor = connection.cursor()
        cursor.execute("SELECT NOW();")
        result = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        logger.info(f"Conexión exitosa. Hora del servidor: {result['now']}")
        return True
        
    except Exception as e:
        logger.error(f"Error al probar la conexión: {e}")
        return False

def execute_query(query, params=None, fetch_one=False, fetch_all=False):
    """
    Ejecuta una consulta SQL en la base de datos
    
    Args:
        query (str): Consulta SQL a ejecutar
        params (tuple): Parámetros para la consulta
        fetch_one (bool): Si True, retorna un solo resultado
        fetch_all (bool): Si True, retorna todos los resultados
    
    Returns:
        result: Resultado de la consulta o None si falla
    """
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        
        if connection is None:
            return None
        
        cursor = connection.cursor()
        cursor.execute(query, params)
        
        if fetch_one:
            result = cursor.fetchone()
        elif fetch_all:
            result = cursor.fetchall()
        else:
            connection.commit()
            result = cursor.rowcount
        
        return result
        
    except Exception as e:
        logger.error(f"Error al ejecutar consulta: {e}")
        if connection:
            connection.rollback()
        return None
        
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
