import logging
import os
logger = logging.getLogger(__name__)

# Importar proveedor de IA
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    OpenAI = None
    logger.warning("openai no está instalado")

# Configuración de modelo por defecto
DEFAULT_OPENAI_MODEL = os.environ.get('OPENAI_MODEL')
DEFAULT_OPENAI_TEMPERATURE = float(os.environ.get('OPENAI_TEMPERATURE'))

# Caché de cliente configurado
_openai_client_cache = {'api_key': None, 'client': None}


def _get_openai_client(api_key):
    """
    Obtiene el cliente de OpenAI configurado, usa caché si es posible
    
    Args:
        api_key (str): API key de OpenAI
        
    Returns:
        OpenAI: Cliente configurado o None si hay error
    """
    if not OPENAI_AVAILABLE:
        logger.error("openai no está instalado")
        return None
    
    if _openai_client_cache['api_key'] != api_key or _openai_client_cache['client'] is None:
        try:
            client = OpenAI(api_key=api_key)
            _openai_client_cache['api_key'] = api_key
            _openai_client_cache['client'] = client
            logger.info("Cliente OpenAI configurado")
        except Exception as e:
            logger.error(f"Error configurando OpenAI: {str(e)}")
            return None
    
    return _openai_client_cache['client']


def generate_with_openai(prompt, model_name=None, api_key=None, system_prompt=None):
    """
    Genera texto usando OpenAI
    
    Args:
        prompt (str): Prompt del usuario (XML con reglas y transcripción)
        system_prompt (str): Prompt principal XML (SystemPrompt.xml)
        model_name (str): Nombre del modelo
        api_key (str): API key de OpenAI
        
    Returns:
        str: Texto generado o mensaje de error
    """
    if not api_key:
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            return "Error: OPENAI_API_KEY no configurada"
    
    client = _get_openai_client(api_key)
    if not client:
        return "Error: No se pudo configurar OpenAI"
    
    try:
        model_name = model_name or DEFAULT_OPENAI_MODEL
        
        # Preparar argumentos para la llamada
        messages = []
        if system_prompt and system_prompt.strip():
            messages.append({"role": "system", "content": system_prompt.strip()})
        else:
            messages.append({"role": "system", "content": "You are an expert assistant for analyzing and summarizing meeting transcriptions."})
        messages.append({"role": "user", "content": prompt})

        completion_args = {
            "model": model_name,
            "messages": messages,
            "temperature": DEFAULT_OPENAI_TEMPERATURE
        }

        response = client.chat.completions.create(**completion_args)
        
        return response.choices[0].message.content
    
    except Exception as e:
        logger.error(f"Error en generación con OpenAI: {str(e)}")
        return f"Error: {str(e)}"