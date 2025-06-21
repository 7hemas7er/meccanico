
async function loadMaintenanceTypes() {
    try {
        const response = await fetch('/api/maintenance-types');
        const types = await response.json();

        // Aggiorna la lista dei tipi
        const list = document.getElementById('maintenance-types-list');
        list.innerHTML = `
            <ul class="divide-y divide-gray-200">
                ${types.map(type => `
                    <li class="py-2 flex justify-between items-center">
                        <span>${type}</span>
                        <div>
                            <button onclick="openEditTypeModal('${type}')"
                                class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded mr-2">
                                Modifica
                            </button>
                            <button onclick="deleteMaintenanceType('${type}')"
                                class="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded">
                                Elimina
                            </button>
                        </div>
                    </li>
                `).join('')}
            </ul>
        `;
    } catch (error) {
        console.error('Errore:', error);
    }
}

function displayMaintenanceTypes(types) {
    const list = document.getElementById('maintenance-types-list');
    list.innerHTML = types.map(type => `
        <div class="flex justify-between items-center p-2 border-b">
            <span>${type}</span>
            <div>
                <button onclick="openEditTypeModal('${type}')" 
                        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded mr-2">
                    Modifica
                </button>
                <button onclick="deleteMaintenanceType('${type}')"
                        class="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded">
                    Elimina
                </button>
            </div>
        </div>
    `).join('');
}

async function addMaintenanceType() {
    const input = document.getElementById('new-maintenance-type');
    const typeName = input.value.trim();

    if (!typeName) {
        alert('Inserisci un nome valido');
        return;
    }

    try {
        const response = await fetch('/api/maintenance-types', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(typeName)
        });

        if (!response.ok) throw new Error('Errore nel salvataggio');

        input.value = '';
        loadMaintenanceTypes();
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore durante il salvataggio');
    }
}


// Funzione per eliminare un tipo
async function deleteMaintenanceType(typeName) {
    if (!confirm(`Sei sicuro di voler eliminare il tipo "${typeName}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/maintenance-types/${typeName}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Errore durante l\'eliminazione');

        loadMaintenanceTypes();
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore durante l\'eliminazione');
    }
}

// Funzione per aprire il modal di modifica
function openEditTypeModal(typeName) {
    document.getElementById('edit-type-modal').classList.remove('hidden');
    document.getElementById('old-type-name').value = typeName;
    document.getElementById('edit-type-name').value = typeName;
}


// Funzione per chiudere il modal di modifica
function closeEditTypeModal() {
    document.getElementById('edit-type-modal').classList.add('hidden');
}

// Funzione per salvare le modifiche al tipo
async function saveMaintenanceType() {
    const oldName = document.getElementById('old-type-name').value;
    const newName = document.getElementById('edit-type-name').value.trim();

    if (!newName) {
        alert('Inserisci un nome valido');
        return;
    }

    try {
        const response = await fetch(`/api/maintenance-types/${oldName}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newName)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Errore durante l\'aggiornamento');
        }

        closeEditTypeModal();
        loadMaintenanceTypes();
    } catch (error) {
        console.error('Errore:', error);
        alert(error.message);
    }
}

// Admin permission check
async function checkAdminPermissions() {
    try {
        const response = await fetch('/api/user/role');
        const data = await response.json();
        const isAdmin = data.is_admin;
        
        // Mostra/nascondi elementi admin
        if (isAdmin) {
            document.getElementById('users-link').classList.remove('hidden');
        } else {
            // Nascondi link per non admin
            document.getElementById('settings-link').classList.add('hidden');
            document.getElementById('backup-link').classList.add('hidden');
        }
        
        return isAdmin;
    } catch (error) {
        console.error('Errore nel controllo permessi:', error);
        return false;
    }
}

// Carica i tipi all'avvio
document.addEventListener('DOMContentLoaded', function() {
    loadMaintenanceTypes();
    checkAdminPermissions();
});