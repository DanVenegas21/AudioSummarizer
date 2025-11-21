# Guía de Uso de Servicios Backend

## Estructura Creada

```
backend/
├── recording_service.py     # CRUD de grabaciones
├── team_service.py          # CRUD de equipos
└── permission_service.py    # Verificación de permisos
```

## 1. recording_service.py

### Crear una grabación
```python
from recording_service import create_recording

recording_id = create_recording(
    user_id=123,
    filename="9f64e150...fee.mp3",
    original_filename="Meeting_Jan_2025.mp3",
    file_path="/uploads/9f64e150...fee.mp3",
    file_size=2048576,
    duration=180.5,
    mimetype="audio/mpeg"
)
```

### Obtener grabaciones según rol
```python
from recording_service import (
    get_user_recordings,
    get_supervisor_recordings,
    get_all_recordings
)

# Usuario general: solo sus grabaciones
recordings = get_user_recordings(user_id=123, limit=50)

# Supervisor: sus grabaciones + equipos
recordings = get_supervisor_recordings(supervisor_id=456, limit=50)

# Admin: todas las grabaciones
recordings = get_all_recordings(limit=100)
```

### Eliminar grabación
```python
from recording_service import delete_recording, delete_recording_file

# Primero borrar archivo físico
recording = get_recording_by_id(recording_id)
delete_recording_file(recording['file_path'])

# Luego borrar de DB (CASCADE borra transcription y summary)
delete_recording(recording_id)
```

## 2. team_service.py

### Crear equipo
```python
from team_service import create_team, add_user_to_team

# Crear equipo
team_id = create_team(
    name="Marketing Team",
    supervisor_id=456,
    description="Team de Marketing"
)

# Agregar miembros
add_user_to_team(team_id=team_id, user_id=789)
add_user_to_team(team_id=team_id, user_id=101)
```

### Consultar equipos
```python
from team_service import (
    get_teams_by_supervisor,
    get_team_members,
    get_user_teams
)

# Equipos de un supervisor
teams = get_teams_by_supervisor(supervisor_id=456)

# Miembros de un equipo
members = get_team_members(team_id=10)

# Equipos donde está un usuario
user_teams = get_user_teams(user_id=789)
```

### Gestionar miembros
```python
from team_service import remove_user_from_team, get_available_users_for_team

# Remover usuario
remove_user_from_team(team_id=10, user_id=789)

# Ver usuarios disponibles para agregar
available = get_available_users_for_team(team_id=10, search="john")
```

## 3. permission_service.py

### Verificar acceso a grabaciones
```python
from permission_service import can_access_recording, can_delete_recording

# Verificar si puede ver una grabación
can_view = can_access_recording(
    user_id=123,
    user_role=2,  # Usuario general
    recording_id=999
)

if can_view:
    recording = get_recording_by_id(999)
else:
    return "No autorizado"
```

### Verificar permisos de equipos
```python
from permission_service import (
    can_create_team,
    can_manage_team,
    can_add_user_to_team
)

# ¿Puede crear equipos?
if can_create_team(user_role=1):  # Supervisor
    team_id = create_team(...)

# ¿Puede gestionar un equipo?
if can_manage_team(user_id=456, user_role=1, team_id=10):
    # Agregar miembros, editar, etc.
    pass
```

### Obtener resumen de permisos
```python
from permission_service import get_user_permissions_summary

permissions = get_user_permissions_summary(user_role=1)
# {
#     'role': 1,
#     'role_name': 'Supervisor',
#     'can_upload_recordings': True,
#     'can_view_all_recordings': False,
#     'can_view_team_recordings': True,
#     'can_create_teams': True,
#     ...
# }
```

## Ejemplo Completo: Endpoint de Upload

```python
# app.py
from recording_service import create_recording
from permission_service import can_upload_recording

@app.route('/api/upload', methods=['POST'])
def upload_audio():
    # Obtener usuario actual
    user = get_current_user()  # Tu función de auth
    
    # Verificar permisos
    if not can_upload_recording(user['role']):
        return jsonify({'error': 'No autorizado'}), 403
    
    # ... guardar archivo ...
    
    # Guardar en DB
    recording_id = create_recording(
        user_id=user['id'],
        filename=unique_filename,
        original_filename=original_filename,
        file_path=file_path,
        file_size=file_size,
        mimetype=file.content_type
    )
    
    return jsonify({
        'success': True,
        'recording_id': recording_id
    })
```

## Ejemplo Completo: Endpoint de Listar Grabaciones

```python
# app.py
from recording_service import (
    get_user_recordings,
    get_supervisor_recordings,
    get_all_recordings
)
from permission_service import ROLE_ADMIN, ROLE_SUPERVISOR

@app.route('/api/recordings', methods=['GET'])
def list_recordings():
    user = get_current_user()
    
    # Según el rol, obtener grabaciones apropiadas
    if user['role'] == ROLE_ADMIN:
        recordings = get_all_recordings(limit=100)
    elif user['role'] == ROLE_SUPERVISOR:
        recordings = get_supervisor_recordings(user['id'], limit=100)
    else:
        recordings = get_user_recordings(user['id'], limit=100)
    
    return jsonify({
        'success': True,
        'recordings': recordings
    })
```

## Ejemplo Completo: Endpoint de Eliminar Grabación

```python
# app.py
from recording_service import get_recording_by_id, delete_recording, delete_recording_file
from permission_service import can_delete_recording

@app.route('/api/recordings/<int:recording_id>', methods=['DELETE'])
def delete_recording_endpoint(recording_id):
    user = get_current_user()
    
    # Verificar permisos
    if not can_delete_recording(user['id'], user['role'], recording_id):
        return jsonify({'error': 'No autorizado'}), 403
    
    # Obtener info de la grabación
    recording = get_recording_by_id(recording_id)
    if not recording:
        return jsonify({'error': 'Grabación no encontrada'}), 404
    
    # Borrar archivo físico
    delete_recording_file(recording['file_path'])
    
    # Borrar de DB (CASCADE borra transcription, summary, pinecone_vectors)
    delete_recording(recording_id)
    
    return jsonify({'success': True})
```

## Ejemplo Completo: Endpoint de Gestión de Equipos

```python
# app.py
from team_service import create_team, add_user_to_team, get_teams_by_supervisor
from permission_service import can_create_team, can_add_user_to_team

@app.route('/api/teams', methods=['POST'])
def create_team_endpoint():
    user = get_current_user()
    data = request.get_json()
    
    # Verificar permisos
    if not can_create_team(user['role']):
        return jsonify({'error': 'No autorizado'}), 403
    
    # Crear equipo
    team_id = create_team(
        name=data['name'],
        supervisor_id=user['id'],  # El creador es el supervisor
        description=data.get('description')
    )
    
    return jsonify({
        'success': True,
        'team_id': team_id
    })

@app.route('/api/teams/<int:team_id>/members', methods=['POST'])
def add_member_to_team(team_id):
    user = get_current_user()
    data = request.get_json()
    
    # Verificar permisos
    if not can_add_user_to_team(user['id'], user['role'], team_id):
        return jsonify({'error': 'No autorizado'}), 403
    
    # Agregar usuario
    success = add_user_to_team(team_id, data['user_id'])
    
    return jsonify({'success': success})
```

## Notas Importantes

### Roles
- `0` = Admin (acceso total)
- `1` = Supervisor (equipos propios)
- `2` = Usuario General (solo sus datos)

### Función get_current_user()
Debes implementar esta función que obtenga el usuario autenticado desde la sesión/token:

```python
def get_current_user():
    """Obtiene el usuario actual de la sesión"""
    user_data = localStorage.getItem('user')  # En frontend
    # O desde session/JWT en backend
    return {
        'id': user['id'],
        'role': user['role'],
        'email': user['email']
    }
```

### CASCADE en Deletes
Al borrar una grabación, automáticamente se borran:
- `transcriptions`
- `summaries`
- `pinecone_vectors`

Al borrar un equipo, automáticamente se borran:
- `team_members` (todas las membresías)

### Fix del Schema
Recuerda ejecutar esto en Supabase:
```sql
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_team_id_key;
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_user_id_key;
ALTER TABLE team_members ADD CONSTRAINT unique_team_user UNIQUE(team_id, user_id);
```



