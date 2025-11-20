"""
Servicio de agentes personalizados para generación de resúmenes con IA
Soporta: Gemini y OpenAI
"""

import logging
import os
from database import execute_query

# Importar servicios específicos de proveedores
from .gemini_service import generate_with_gemini
from .openai_service import generate_with_openai

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_PATH = os.path.join(os.path.dirname(__file__), "SystemPrompt.xml")
_SYSTEM_PROMPT_CACHE = None


def _get_system_prompt():
    """
    Lee y cachea el prompt principal desde SystemPrompt.xml
    Returns:
        str: Contenido del prompt del sistema (puede ser cadena vacía si falla)
    """
    global _SYSTEM_PROMPT_CACHE

    if _SYSTEM_PROMPT_CACHE is None:
        try:
            with open(SYSTEM_PROMPT_PATH, "r", encoding="utf-8") as prompt_file:
                _SYSTEM_PROMPT_CACHE = prompt_file.read().strip()
        except FileNotFoundError:
            logger.error("SystemPrompt.xml no encontrado en %s", SYSTEM_PROMPT_PATH)
            _SYSTEM_PROMPT_CACHE = ""
        except Exception as exc:
            logger.error("Error leyendo SystemPrompt.xml: %s", exc)
            _SYSTEM_PROMPT_CACHE = ""

    return _SYSTEM_PROMPT_CACHE

def generate_with_agent(agent_config, transcription, gemini_api_key=None, openai_api_key=None):
    """
    Genera resumen usando un agente personalizado
    
    Args:
        agent_config (dict): Configuración del agente (de la base de datos)
        transcription (str): Texto de la transcripción
        gemini_api_key (str): API key de Gemini (opcional)
        openai_api_key (str): API key de OpenAI (opcional)
        
    Returns:
        str: Resumen generado por el agente
    """
    try:
        provider = agent_config.get('provider', '').lower()
        # El prompt_template aquí son las "Reglas del Usuario"
        user_rules = (agent_config.get('prompt_template', '')).strip()
        model_name = agent_config.get('model_name')
        if not user_rules:
            user_rules = "<rule>No se proporcionaron instrucciones personalizadas.</rule>"

        system_prompt = _get_system_prompt()

        # Construir el Prompt Estructurado en XML (solo para la sección del usuario)
        user_prompt = f"""
<user_rules>
{user_rules}
</user_rules>

<transcription>
{transcription}
</transcription>
""".strip()
        
        # Generar según el proveedor
        if provider == 'gemini':
            return generate_with_gemini(
                prompt=user_prompt,
                system_prompt=system_prompt,
                model_name=model_name,
                api_key=gemini_api_key
            )
        
        elif provider == 'openai':
            return generate_with_openai(
                prompt=user_prompt,
                system_prompt=system_prompt,
                model_name=model_name,
                api_key=openai_api_key
            )
        
        else:
            return f"Error: Proveedor '{provider}' no soportado"
    
    except Exception as e:
        logger.error(f"Error generando con agente: {str(e)}")
        return f"Error: {str(e)}"


# CRUD de Agentes en Base de Datos
def create_agent(user_id, name, description, provider, prompt_template, 
                model_name=None):
    """
    Crea un nuevo agente personalizado
    
    Args:
        user_id (int): ID del usuario propietario
        name (str): Nombre del agente
        description (str): Descripción del agente
        provider (str): Proveedor de IA ('gemini' o 'openai')
        prompt_template (str): Reglas personalizadas del usuario (texto/Markdown)
        model_name (str): Nombre del modelo específico (opcional)
        
    Returns:
        dict: Agente creado o None si falla
    """
    try:
        # Validar proveedor
        if provider.lower() not in ['gemini', 'openai']:
            logger.error(f"Proveedor inválido: {provider}")
            return None
        if not prompt_template.strip():
            logger.warning("El template está vacío")
        
        query = """
            INSERT INTO agents (user_id, name, description, provider, prompt_template, 
                              model_name)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, user_id, name, description, provider, prompt_template, 
                     model_name, is_active, created_at, updated_at
        """
        
        agent = execute_query(
            query,
            (user_id, name, description, provider.lower(), prompt_template, model_name),
            fetch_one=True
        )
        
        if agent:
            logger.info(f"Agente creado: {name} (ID: {agent['id']})")
            return dict(agent)
        else:
            return None
    
    except Exception as e:
        logger.error(f"Error al crear agente: {str(e)}")
        return None


def get_agent_by_id(agent_id, user_id=None):
    """
    Obtiene un agente por su ID
    
    Args:
        agent_id (int): ID del agente
        user_id (int): ID del usuario (opcional, para verificar propiedad)
        
    Returns:
        dict: Agente o None si no existe
    """
    try:
        if user_id:
            query = """
                SELECT id, user_id, name, description, provider, prompt_template,
                       model_name, is_active, created_at, updated_at
                FROM agents
                WHERE id = %s AND user_id = %s
            """
            agent = execute_query(query, (agent_id, user_id), fetch_one=True)
        else:
            query = """
                SELECT id, user_id, name, description, provider, prompt_template,
                       model_name, is_active, created_at, updated_at
                FROM agents
                WHERE id = %s
            """
            agent = execute_query(query, (agent_id,), fetch_one=True)
        
        if agent:
            return dict(agent)
        else:
            return None
    
    except Exception as e:
        logger.error(f"Error al obtener agente: {str(e)}")
        return None


def get_agents_by_user(user_id, only_active=True):
    """
    Obtiene todos los agentes de un usuario
    
    Args:
        user_id (int): ID del usuario
        only_active (bool): Si True, solo devuelve agentes activos
        
    Returns:
        list: Lista de agentes
    """
    try:
        if only_active:
            query = """
                SELECT id, user_id, name, description, provider, prompt_template,
                       model_name, is_active, created_at, updated_at
                FROM agents
                WHERE user_id = %s AND is_active = TRUE
                ORDER BY created_at DESC
            """
        else:
            query = """
                SELECT id, user_id, name, description, provider, prompt_template,
                       model_name, is_active, created_at, updated_at
                FROM agents
                WHERE user_id = %s
                ORDER BY created_at DESC
            """
        
        agents = execute_query(query, (user_id,), fetch_all=True)
        
        if agents:
            return [dict(agent) for agent in agents]
        else:
            return []
    
    except Exception as e:
        logger.error(f"Error al obtener agentes del usuario: {str(e)}")
        return []


def update_agent(agent_id, user_id, **kwargs):
    """
    Actualiza un agente existente
    
    Args:
        agent_id (int): ID del agente
        user_id (int): ID del usuario (para verificar propiedad)
        **kwargs: Campos a actualizar (name, description, prompt_template, etc.)
        
    Returns:
        dict: Agente actualizado o None si falla
    """
    try:
        # Verificar que el agente pertenece al usuario
        agent = get_agent_by_id(agent_id, user_id)
        if not agent:
            logger.error(f"Agente {agent_id} no encontrado o no pertenece al usuario {user_id}")
            return None
        
        # Construir query dinámica
        allowed_fields = ['name', 'description', 'provider', 'prompt_template', 
                         'model_name', 'is_active']
        
        updates = []
        values = []
        
        for field, value in kwargs.items():
            if field in allowed_fields:
                updates.append(f"{field} = %s")
                values.append(value)
        
        if not updates:
            logger.warning("No hay campos para actualizar")
            return agent
        
        values.extend([agent_id, user_id])
        
        query = f"""
            UPDATE agents
            SET {', '.join(updates)}
            WHERE id = %s AND user_id = %s
            RETURNING id, user_id, name, description, provider, prompt_template,
                     model_name, is_active, created_at, updated_at
        """
        
        updated_agent = execute_query(query, tuple(values), fetch_one=True)
        
        if updated_agent:
            logger.info(f"Agente actualizado: {agent_id}")
            return dict(updated_agent)
        else:
            return None
    
    except Exception as e:
        logger.error(f"Error al actualizar agente: {str(e)}")
        return None


def delete_agent(agent_id, user_id):
    """
    Elimina un agente (soft delete - marca como inactivo)
    
    Args:
        agent_id (int): ID del agente
        user_id (int): ID del usuario (para verificar propiedad)
        
    Returns:
        bool: True si se eliminó correctamente, False si no
    """
    try:
        query = """
            UPDATE agents
            SET is_active = FALSE
            WHERE id = %s AND user_id = %s
        """
        
        rows_affected = execute_query(query, (agent_id, user_id))
        
        if rows_affected and rows_affected > 0:
            logger.info(f"Agente eliminado: {agent_id}")
            return True
        else:
            logger.error(f"No se pudo eliminar agente {agent_id}")
            return False
    
    except Exception as e:
        logger.error(f"Error al eliminar agente: {str(e)}")
        return False


def hard_delete_agent(agent_id, user_id):
    """
    Elimina permanentemente un agente de la base de datos
    
    Args:
        agent_id (int): ID del agente
        user_id (int): ID del usuario (para verificar propiedad)
        
    Returns:
        bool: True si se eliminó correctamente, False si no
    """
    try:
        query = """
            DELETE FROM agents
            WHERE id = %s AND user_id = %s
        """
        
        rows_affected = execute_query(query, (agent_id, user_id))
        
        if rows_affected and rows_affected > 0:
            logger.info(f"Agente eliminado permanentemente: {agent_id}")
            return True
        else:
            logger.error(f"No se pudo eliminar agente {agent_id}")
            return False
    
    except Exception as e:
        logger.error(f"Error al eliminar agente permanentemente: {str(e)}")
        return False
