// Carica i tipi di manutenzione all'avvio
document.addEventListener('DOMContentLoaded', loadMaintenanceTypes);

async function loadMaintenanceTypes() {
    try {
        const response = await fetch('/api/maintenance-types');
        const types = await response.json();
        displayMaintenanceTypes(types);
    } catch (error) {
        console.error('Errore nel caricamento dei tipi:', error);
        alert('Errore nel caricamento dei tipi di manutenzione');
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
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(typeName)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Errore nel salvataggio');
        }

        input.value = '';
        await loadMaintenanceTypes();
    } catch (error) {
        console.error('Errore:', error);
        alert(error.message);
    }
}

async function deleteMaintenanceType(typeName) {
    if (!confirm(`Sei sicuro di voler eliminare "${typeName}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/maintenance-types/${encodeURIComponent(typeName)}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Errore nell\'eliminazione');
        }

        await loadMaintenanceTypes();
    } catch (error) {
        console.error('Errore:', error);
        alert(error.message);
    }
}

function openEditTypeModal(typeName) {
    document.getElementById('old-type-name').value = typeName;
    document.getElementById('edit-type-name').value = typeName;
    document.getElementById('edit-type-modal').classList.remove('hidden');
}

function closeEditTypeModal() {
    document.getElementById('edit-type-modal').classList.add('hidden');
}

async function saveMaintenanceType() {
    const oldType = document.getElementById('old-type-name').value;
    const newType = document.getElementById('edit-type-name').value.trim();

    if (!newType) {
        alert('Inserisci un nome valido');
        return;
    }

    try {
        const response = await fetch(`/api/maintenance-types/${encodeURIComponent(oldType)}?new_type=${encodeURIComponent(newType)}`, {
            method: 'PUT',
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Errore nel salvataggio');
        }

        closeEditTypeModal();
        await loadMaintenanceTypes();
    } catch (error) {
        console.error('Errore:', error);
        alert(error.message);
    }
}