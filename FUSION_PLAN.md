# Plan de Fusión - AgentsVersion → Versión Actual

## Objetivo
Integrar la funcionalidad de agentes personalizados de AgentsVersion en la versión actual con frontend mejorado.

## ✅ Estado de Compatibilidad
**COMPATIBLE** - Las versiones son compatibles, los cambios son aditivos.

---

## 📋 Checklist de Fusión

### Fase 1: Preparación de Base de Datos
- [ ] Ejecutar el schema SQL de AgentsVersion para crear tabla `agents`
- [ ] Verificar conexión y que la tabla se creó correctamente

### Fase 2: Backend - Integración de Servicios
- [ ] Copiar carpeta `backend/agents/` completa desde AgentsVersion
  - [ ] agents_service.py
  - [ ] gemini_service.py
  - [ ] openai_service.py
  - [ ] SystemPrompt.xml
  
- [ ] Actualizar `backend/summary_service.py`
  - [ ] Agregar función `generar_resumen_con_agente()`

- [ ] Actualizar `requirements.txt` si es necesario
  - Verificar dependencias de OpenAI

### Fase 3: Backend - Actualización de API
- [ ] Actualizar `app.py`:
  - [ ] Agregar imports de agents_service
  - [ ] Agregar función `serialize_agent()`
  - [ ] Agregar endpoints de agentes (6 rutas nuevas)
  - [ ] Actualizar `/api/process` para soportar agent_id (opcional)

### Fase 4: Frontend - Preparación para Agentes
- [ ] Crear página de gestión de agentes (futuro)
- [ ] Agregar opción en sidebar para "My Agents" (cuando esté listo)

### Fase 5: Testing
- [ ] Probar creación de agente vía API
- [ ] Probar procesamiento con agente
- [ ] Verificar que el flujo normal (sin agentes) sigue funcionando
- [ ] Probar con diferentes roles de usuario

---

## 🔧 Archivos a Modificar

### Copiar sin cambios:
```
AgentsVersion/backend/agents/ → backend/agents/
  ├── agents_service.py
  ├── gemini_service.py
  ├── openai_service.py
  └── SystemPrompt.xml

AgentsVersion/backend/schema.sql → MERGE en database o crear migración
```

### Archivos a actualizar (MERGE):

#### 1. `app.py`
**Líneas a agregar después de los imports existentes:**
```python
# Agregar después de línea 31 (después de imports de database)
from agents.agents_service import (create_agent, get_agent_by_id, get_agents_by_user, 
                           update_agent, delete_agent, hard_delete_agent)
```

**Líneas a agregar antes de ENDPOINTS:**
```python
def serialize_agent(agent):
    """Convierte campos datetime de un agente a cadenas ISO 8601."""
    if not agent:
        return agent
    agent_dict = dict(agent)
    for field in ('created_at', 'updated_at'):
        value = agent_dict.get(field)
        if value and hasattr(value, 'isoformat'):
            agent_dict[field] = value.isoformat()
    return agent_dict
```

**Endpoints a agregar (copiar de AgentsVersion/app.py líneas 595-920)**

#### 2. `backend/summary_service.py`
**Función a agregar al final:**
```python
def generar_resumen_con_agente(transcription, agent_config, gemini_api_key=None, openai_api_key=None):
    """
    Genera un resumen usando un agente personalizado
    """
    try:
        from agents.agents_service import generate_with_agent
        
        return generate_with_agent(
            agent_config=agent_config,
            transcription=transcription,
            gemini_api_key=gemini_api_key,
            openai_api_key=openai_api_key
        )
    
    except ImportError:
        logger.error("agents.agents_service no está disponible")
        return "Error: Servicio de agentes no disponible"
    except Exception as e:
        logger.error(f"Error al generar resumen con agente: {str(e)}")
        return f"Error: {str(e)}"
```

#### 3. `requirements.txt`
**Dependencia a agregar (si no existe):**
```
openai>=1.0.0
```

---

## 🚀 Orden de Ejecución Recomendado

1. **Commit actual** (guardar trabajo en curso)
2. **Crear rama** `feature/agents-integration`
3. **Ejecutar SQL** para crear tabla agents
4. **Copiar carpeta agents**
5. **Actualizar app.py** (imports y endpoints)
6. **Actualizar summary_service.py**
7. **Actualizar requirements.txt** e instalar dependencias
8. **Testing básico** con Postman/curl
9. **Commit** de cambios
10. **Merge a main** cuando esté probado

---

## 🧪 Tests de Verificación

### Test 1: Crear Agente
```bash
curl -X POST http://localhost:5000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "name": "Resumen Ejecutivo",
    "description": "Genera resúmenes ejecutivos concisos",
    "provider": "gemini",
    "prompt_template": "Genera un resumen ejecutivo enfocado en decisiones y acciones"
  }'
```

### Test 2: Listar Agentes
```bash
curl "http://localhost:5000/api/agents?user_id=1"
```

### Test 3: Procesar con Agente
```bash
curl -X POST http://localhost:5000/api/process-with-agent \
  -H "Content-Type: application/json" \
  -d '{
    "file_id": "tu_archivo_id",
    "agent_id": 1,
    "user_id": 1,
    "language": "es"
  }'
```

---

## ⚠️ Consideraciones Importantes

1. **API Keys**: Asegúrate de tener configuradas:
   - `GEMINI_API_KEY` en `backend/.env`
   - `OPENAI_API_KEY` (opcional, solo si usarás OpenAI)

2. **Base de Datos**: Ejecuta el schema SQL en tu Supabase/PostgreSQL

3. **Retrocompatibilidad**: El endpoint `/api/process` original sigue funcionando sin cambios

4. **Frontend**: Los nuevos endpoints de agentes están listos pero necesitarás crear la UI para gestionarlos

5. **Permisos**: Considera integrar con `permission_service.py` si necesitas controlar acceso a agentes

---

## 📝 Notas de Implementación

- La carpeta `agents/` usa imports relativos, asegúrate de mantener la estructura
- `SystemPrompt.xml` es el prompt base que se combina con las reglas del usuario
- Los agentes soportan tanto Gemini como OpenAI
- El `model_name` es opcional, usa valores por defecto de ENV si no se especifica

---

## 🎨 Frontend Futuro (Para después de fusión)

Cuando quieras crear la página de gestión de agentes:

1. Crear `frontend/agents.html`
2. Crear `frontend/js/agents.js`
3. Agregar enlace en el sidebar (ya tienes la estructura lista)
4. Implementar CRUD UI con las llamadas a los endpoints

---

## ✅ Resultado Esperado

Después de la fusión tendrás:

✅ Frontend mejorado con sidebar y autenticación visual
✅ Sistema de agentes personalizados completamente funcional
✅ APIs para CRUD de agentes
✅ Soporte para múltiples proveedores de IA (Gemini/OpenAI)
✅ Prompts estructurados en XML
✅ Sistema de roles y permisos preparado
✅ Base de datos con tabla de agentes

**Todo manteniendo retrocompatibilidad con el flujo existente**


