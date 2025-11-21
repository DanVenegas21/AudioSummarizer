/* AGENTS MANAGEMENT SCRIPT */

// Estado del módulo de agentes
const AgentsState = {
    agents: [],
    currentAgent: null,
    isEditing: false,
    agentToDelete: null
};

// Elementos del DOM específicos de la página de agentes
const AgentsDOM = {
    agentsTableContainer: document.getElementById('agentsTableContainer'),
    loadingPlaceholder: document.getElementById('loadingPlaceholder'),
    createAgentBtn: document.getElementById('createAgentBtn'),
    agentModal: document.getElementById('agentModal'),
    agentModalTitle: document.getElementById('agentModalTitle'),
    closeAgentModalBtn: document.getElementById('closeAgentModalBtn'),
    cancelAgentBtn: document.getElementById('cancelAgentBtn'),
    saveAgentBtn: document.getElementById('saveAgentBtn'),
    agentForm: document.getElementById('agentForm'),
    agentName: document.getElementById('agentName'),
    agentDescription: document.getElementById('agentDescription'),
    agentProvider: document.getElementById('agentProvider'),
    agentModel: document.getElementById('agentModel'),
    agentPrompt: document.getElementById('agentPrompt'),
    deleteConfirmModal: document.getElementById('deleteConfirmModal'),
    closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    deleteAgentName: document.getElementById('deleteAgentName'),
    errorModal: document.getElementById('errorModal'),
    errorMessage: document.getElementById('errorMessage'),
    closeErrorModalBtn: document.getElementById('closeErrorModalBtn'),
    closeErrorBtn: document.getElementById('closeErrorBtn')
};

// Verificar autenticación y permisos
function checkAgentsPermission() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        window.location.href = './login.html';
        return false;
    }
    
    // Solo administradores (role = 0) pueden acceder
    if (user.role !== 0) {
        showError('Access denied. Only administrators can manage agents.');
        setTimeout(() => {
            window.location.href = './index.html';
        }, 2000);
        return false;
    }
    
    return true;
}

// Cargar agentes del usuario
async function loadAgents() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        
        if (!user || !user.id) {
            throw new Error('User not found in session');
        }
        
        // Mostrar loading y limpiar tabla actual
        if (AgentsDOM.loadingPlaceholder) {
            AgentsDOM.loadingPlaceholder.style.display = 'block';
        }
        
        if (AgentsDOM.agentsTableContainer) {
            AgentsDOM.agentsTableContainer.innerHTML = '';
            AgentsDOM.agentsTableContainer.style.display = 'none';
        }
        
        const response = await fetch(`http://localhost:5000/api/agents?user_id=${user.id}&only_active=false`);
        
        if (!response.ok) {
            throw new Error('Failed to load agents');
        }
        
        const data = await response.json();
        
        console.log('Agents loaded:', data);
        
        if (data.success) {
            AgentsState.agents = data.agents || [];
            console.log('Total agents:', AgentsState.agents.length);
            displayAgentsTable(AgentsState.agents);
        } else {
            throw new Error(data.error || 'Failed to load agents');
        }
        
    } catch (error) {
        console.error('Error loading agents:', error);
        showError('Failed to load agents: ' + error.message);
        displayEmptyState();
    } finally {
        // Ocultar loading y mostrar tabla
        if (AgentsDOM.loadingPlaceholder) {
            AgentsDOM.loadingPlaceholder.style.display = 'none';
        }
        
        if (AgentsDOM.agentsTableContainer) {
            AgentsDOM.agentsTableContainer.style.display = 'block';
        }
    }
}

// Mostrar tabla de agentes
function displayAgentsTable(agents) {
    console.log('Displaying agents table, count:', agents.length);
    
    if (!AgentsDOM.agentsTableContainer) {
        console.error('agentsTableContainer not found');
        return;
    }
    
    if (!agents || agents.length === 0) {
        console.log('No agents to display, showing empty state');
        displayEmptyState();
        return;
    }
    
    // Asegurar que el container esté visible
    AgentsDOM.agentsTableContainer.style.display = 'block';
    
    const tableHTML = `
        <table class="agents-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Provider</th>
                    <th>Model</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${agents.map(agent => `
                    <tr class="${agent.is_active ? '' : 'inactive'}">
                        <td>
                            <div class="agent-name-cell">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                    <path d="M2 17l10 5 10-5"></path>
                                    <path d="M2 12l10 5 10-5"></path>
                                </svg>
                                <strong>${escapeHtml(agent.name)}</strong>
                            </div>
                        </td>
                        <td>
                            <span class="provider-badge provider-${agent.provider.toLowerCase()}">
                                ${agent.provider.toUpperCase()}
                            </span>
                        </td>
                        <td>${escapeHtml(agent.model_name || 'Default')}</td>
                        <td class="description-cell">${escapeHtml(agent.description || 'No description')}</td>
                        <td>
                            <span class="status-badge ${agent.is_active ? 'status-active' : 'status-inactive'}">
                                ${agent.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-icon btn-icon-primary" onclick="editAgent(${agent.id})" title="Edit">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button class="btn-icon btn-icon-danger" onclick="confirmDeleteAgent(${agent.id}, '${escapeHtml(agent.name)}')" title="Delete">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    AgentsDOM.agentsTableContainer.innerHTML = tableHTML;
}

// Mostrar estado vacío
function displayEmptyState() {
    console.log('Displaying empty state');
    
    if (!AgentsDOM.agentsTableContainer) return;
    
    AgentsDOM.agentsTableContainer.innerHTML = `
        <div class="empty-state">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
            </svg>
            <h3>No Agents Yet</h3>
            <p>Create your first AI agent to get started with custom summarization</p>
            <button class="btn btn-primary" onclick="openCreateAgentModal()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Create New Agent
            </button>
        </div>
    `;
    
    // Asegurar que el container esté visible
    AgentsDOM.agentsTableContainer.style.display = 'block';
}

// Abrir modal para crear nuevo agente
function openCreateAgentModal() {
    AgentsState.isEditing = false;
    AgentsState.currentAgent = null;
    
    AgentsDOM.agentModalTitle.textContent = 'Create New Agent';
    AgentsDOM.agentForm.reset();
    AgentsDOM.agentModal.classList.remove('hidden');
}

// Editar agente existente
async function editAgent(agentId) {
    try {
        const agent = AgentsState.agents.find(a => a.id === agentId);
        
        if (!agent) {
            showError('Agent not found');
            return;
        }
        
        AgentsState.isEditing = true;
        AgentsState.currentAgent = agent;
        
        // Rellenar el formulario
        AgentsDOM.agentName.value = agent.name;
        AgentsDOM.agentDescription.value = agent.description || '';
        AgentsDOM.agentProvider.value = agent.provider;
        AgentsDOM.agentModel.value = agent.model_name || '';
        AgentsDOM.agentPrompt.value = agent.prompt_template;
        
        AgentsDOM.agentModalTitle.textContent = 'Edit Agent';
        AgentsDOM.agentModal.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error editing agent:', error);
        showError('Failed to load agent details');
    }
}

// Guardar agente (crear o actualizar)
async function saveAgent() {
    try {
        // Validar formulario
        if (!AgentsDOM.agentForm.checkValidity()) {
            AgentsDOM.agentForm.reportValidity();
            return;
        }
        
        const user = JSON.parse(localStorage.getItem('user'));
        
        const agentData = {
            user_id: user.id,
            name: AgentsDOM.agentName.value.trim(),
            description: AgentsDOM.agentDescription.value.trim(),
            provider: AgentsDOM.agentProvider.value,
            model_name: AgentsDOM.agentModel.value.trim() || null,
            prompt_template: AgentsDOM.agentPrompt.value.trim()
        };
        
        // Deshabilitar botón durante el guardado
        AgentsDOM.saveAgentBtn.disabled = true;
        AgentsDOM.saveAgentBtn.textContent = 'Saving...';
        
        let response;
        
        if (AgentsState.isEditing && AgentsState.currentAgent) {
            // Actualizar agente existente
            response = await fetch(`http://localhost:5000/api/agents/${AgentsState.currentAgent.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(agentData)
            });
        } else {
            // Crear nuevo agente
            response = await fetch('http://localhost:5000/api/agents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(agentData)
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save agent');
        }
        
        const data = await response.json();
        
        console.log('Save agent response:', data);
        
        if (data.success) {
            closeAgentModal();
            
            // Recargar lista con un pequeño delay para asegurar que la DB se actualizó
            setTimeout(() => {
                loadAgents();
            }, 100);
            
            showSuccessMessage(AgentsState.isEditing ? 'Agent updated successfully' : 'Agent created successfully');
        } else {
            throw new Error(data.error || 'Failed to save agent');
        }
        
    } catch (error) {
        console.error('Error saving agent:', error);
        showError('Failed to save agent: ' + error.message);
    } finally {
        AgentsDOM.saveAgentBtn.disabled = false;
        AgentsDOM.saveAgentBtn.textContent = 'Save Agent';
    }
}

// Confirmar eliminación de agente
function confirmDeleteAgent(agentId, agentName) {
    AgentsState.agentToDelete = agentId;
    AgentsDOM.deleteAgentName.textContent = agentName;
    AgentsDOM.deleteConfirmModal.classList.remove('hidden');
}

// Eliminar agente
async function deleteAgent() {
    try {
        if (!AgentsState.agentToDelete) return;
        
        const user = JSON.parse(localStorage.getItem('user'));
        
        // Deshabilitar botón
        AgentsDOM.confirmDeleteBtn.disabled = true;
        AgentsDOM.confirmDeleteBtn.textContent = 'Deleting...';
        
        const response = await fetch(`http://localhost:5000/api/agents/${AgentsState.agentToDelete}?user_id=${user.id}&hard=true`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete agent');
        }
        
        const data = await response.json();
        
        if (data.success) {
            closeDeleteModal();
            loadAgents(); // Recargar lista
            showSuccessMessage('Agent deleted successfully');
        }
        
    } catch (error) {
        console.error('Error deleting agent:', error);
        showError('Failed to delete agent: ' + error.message);
    } finally {
        AgentsDOM.confirmDeleteBtn.disabled = false;
        AgentsDOM.confirmDeleteBtn.textContent = 'Delete';
    }
}

// Cerrar modal de agente
function closeAgentModal() {
    AgentsDOM.agentModal.classList.add('hidden');
    AgentsDOM.agentForm.reset();
    AgentsState.isEditing = false;
    AgentsState.currentAgent = null;
}

// Cerrar modal de confirmación de eliminación
function closeDeleteModal() {
    AgentsDOM.deleteConfirmModal.classList.add('hidden');
    AgentsState.agentToDelete = null;
}

// Mostrar error
function showError(message) {
    AgentsDOM.errorMessage.textContent = message;
    AgentsDOM.errorModal.classList.remove('hidden');
}

// Cerrar modal de error
function closeErrorModal() {
    AgentsDOM.errorModal.classList.add('hidden');
}

// Mostrar mensaje de éxito
function showSuccessMessage(message) {
    AgentsDOM.errorMessage.textContent = message;
    AgentsDOM.errorModal.querySelector('h3').textContent = 'Success';
    AgentsDOM.errorModal.classList.remove('hidden');
    
    setTimeout(() => {
        AgentsDOM.errorModal.querySelector('h3').textContent = 'Error';
    }, 3000);
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Inicializar event listeners
function initAgentsEventListeners() {
    // Botones del modal de agente
    if (AgentsDOM.createAgentBtn) {
        AgentsDOM.createAgentBtn.addEventListener('click', openCreateAgentModal);
    }
    
    if (AgentsDOM.closeAgentModalBtn) {
        AgentsDOM.closeAgentModalBtn.addEventListener('click', closeAgentModal);
    }
    
    if (AgentsDOM.cancelAgentBtn) {
        AgentsDOM.cancelAgentBtn.addEventListener('click', closeAgentModal);
    }
    
    if (AgentsDOM.saveAgentBtn) {
        AgentsDOM.saveAgentBtn.addEventListener('click', saveAgent);
    }
    
    // Cerrar modal al hacer click fuera
    if (AgentsDOM.agentModal) {
        AgentsDOM.agentModal.addEventListener('click', (e) => {
            if (e.target === AgentsDOM.agentModal) {
                closeAgentModal();
            }
        });
    }
    
    // Botones del modal de confirmación de eliminación
    if (AgentsDOM.closeDeleteModalBtn) {
        AgentsDOM.closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
    }
    
    if (AgentsDOM.cancelDeleteBtn) {
        AgentsDOM.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    }
    
    if (AgentsDOM.confirmDeleteBtn) {
        AgentsDOM.confirmDeleteBtn.addEventListener('click', deleteAgent);
    }
    
    // Cerrar modal al hacer click fuera
    if (AgentsDOM.deleteConfirmModal) {
        AgentsDOM.deleteConfirmModal.addEventListener('click', (e) => {
            if (e.target === AgentsDOM.deleteConfirmModal) {
                closeDeleteModal();
            }
        });
    }
    
    // Botones del modal de error
    if (AgentsDOM.closeErrorModalBtn) {
        AgentsDOM.closeErrorModalBtn.addEventListener('click', closeErrorModal);
    }
    
    if (AgentsDOM.closeErrorBtn) {
        AgentsDOM.closeErrorBtn.addEventListener('click', closeErrorModal);
    }
    
    // Cerrar modal al hacer click fuera
    if (AgentsDOM.errorModal) {
        AgentsDOM.errorModal.addEventListener('click', (e) => {
            if (e.target === AgentsDOM.errorModal) {
                closeErrorModal();
            }
        });
    }
}

// Inicializar página de agentes
function initAgentsPage() {
    console.log('Agents page initialized');
    
    // Verificar permisos
    if (!checkAgentsPermission()) {
        return;
    }
    
    // Inicializar event listeners
    initAgentsEventListeners();
    
    // Cargar agentes
    loadAgents();
}

// Hacer funciones globales para uso en HTML
window.openCreateAgentModal = openCreateAgentModal;
window.editAgent = editAgent;
window.confirmDeleteAgent = confirmDeleteAgent;

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAgentsPage);
} else {
    initAgentsPage();
}

