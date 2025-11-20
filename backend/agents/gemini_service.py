import logging
import os

logger = logging.getLogger(__name__)

# Importar proveedor de IA
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None
    logger.warning("google-generativeai no está instalado")

# Configuración de modelo por defecto
DEFAULT_GEMINI_MODEL = os.environ.get('GEMINI_MODEL')
DEFAULT_GEMINI_TEMPERATURE = float(os.environ.get('GEMINI_TEMPERATURE'))

# Caché de cliente configurado
_gemini_client_cache = {'api_key': None, 'client': None}


def _get_gemini_client(api_key):
    """
    Obtiene el cliente de Gemini configurado, usa caché si es posible
    
    Args:
        api_key (str): API key de Gemini
        
    Returns:
        bool: True si se configuró correctamente, None si hay error
    """
    if not GEMINI_AVAILABLE:
        logger.error("google-generativeai no está instalado")
        return None
    
    if _gemini_client_cache['api_key'] != api_key or _gemini_client_cache['client'] is None:
        try:
            genai.configure(api_key=api_key)
            _gemini_client_cache['api_key'] = api_key
            _gemini_client_cache['client'] = True
            logger.info("Cliente Gemini configurado")
        except Exception as e:
            logger.error(f"Error configurando Gemini: {str(e)}")
            return None
    
    return True


def generate_with_gemini(prompt, model_name=None, api_key=None, system_prompt=None):
    """
    Genera texto usando Google Gemini con manejo robusto de errores
    
    Args:
        prompt (str): Prompt del usuario (XML con reglas y transcripción)
        system_prompt (str): Prompt principal XML (SystemPrompt.xml)
        model_name (str): Nombre del modelo
        api_key (str): API key de Gemini
        
    Returns:
        str: Texto generado o mensaje de error
    """
    if not api_key:
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            return "Error: GEMINI_API_KEY no configurada"
    
    client_ready = _get_gemini_client(api_key)
    if not client_ready:
        return "Error: No se pudo configurar Gemini"
    
    try:
        model_name = model_name or DEFAULT_GEMINI_MODEL
        model = genai.GenerativeModel(model_name)

        prompt_sections = []
        if system_prompt:
            prompt_sections.append(system_prompt.strip())
        if prompt:
            prompt_sections.append(prompt.strip())
        final_prompt = "\n\n".join(section for section in prompt_sections if section)

        generation_config = genai.types.GenerationConfig(
            temperature=DEFAULT_GEMINI_TEMPERATURE
        )

        response = model.generate_content(
            final_prompt,
            generation_config=generation_config
        )
        
        # Intentar obtener texto de forma segura
        try:
            return response.text
        except ValueError as e:
            # Si falla response.text (ej. finish_reason es MAX_TOKENS o SAFETY)
            # Intentar extraer texto parcial de los candidatos
            if response.candidates and response.candidates[0].content.parts:
                partial_text = ""
                for part in response.candidates[0].content.parts:
                    if part.text:
                        partial_text += part.text
                
                if partial_text:
                    logger.warning(f"Respuesta incompleta (posible MAX_TOKENS), devolviendo texto parcial. Longitud: {len(partial_text)}")
                    return partial_text + "\n\n[Nota: El resumen se cortó por límite de longitud]"
            
            # Si no hay partes de texto, revisar safety ratings
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                return f"Error: Bloqueado por seguridad ({response.prompt_feedback.block_reason})"
            
            logger.error(f"Error accediendo a response.text: {str(e)}")
            return f"Error al generar respuesta: {str(e)}"
    
    except Exception as e:
        logger.error(f"Error en generación con Gemini: {str(e)}")
        return f"Error: {str(e)}"