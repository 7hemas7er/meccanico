// Check authentication on page load
document.addEventListener('DOMContentLoaded', function () {
    checkAuth();

    // Setup logout button
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Inizializza la pagina
    loadVehicles();
    loadMaintenanceTypes();

    // Aggiungi event listener per il change del select se il modal è aperto
    const activitySelect = document.getElementById('activity-name');
    if (activitySelect) {
        activitySelect.addEventListener('change', toggleCustomActivityField);
    }
});

// Auth check function
function checkAuth() {
    // We're using cookies now, so just check if we can access protected content
    fetch('/api/user', {
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                window.location.href = '/login';
            }
        })
        .catch(() => {
            window.location.href = '/login';
        });
}

// Logout function
function logout() {
    // Send request to remove the cookie
    fetch('/logout', {
        method: 'POST',
        credentials: 'include'
    }).then(() => {
        window.location.href = '/login';
    });
}

// Add credentials to fetch requests
const originalFetch = window.fetch;
window.fetch = function (url, options = {}) {
    // Always include credentials for cookies
    options.credentials = 'include';

    return originalFetch(url, options)
        .then(response => {
            // Redirect to login if unauthorized
            if (response.status === 401) {
                window.location.href = '/login';
            }
            return response;
        });
};

async function addVehicle() {
    const licensePlate = document.getElementById('license-plate').value;
    if (!licensePlate) {
        alert('Inserisci una targa valida');
        return;
    }

    try {
        const response = await fetch('/api/vehicle/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                license_plate: licensePlate,
                activities: []
            })
        });

        const data = await response.json();

        // Stampa direttamente il QR code senza mostrarlo
        printQRDirectly(data.qr_code);

        document.getElementById('license-plate').value = '';
        loadVehicles();

    } catch (error) {
        console.error('Errore:', error);
        alert('Errore durante la creazione del veicolo');
    }
}

// Funzione per caricare i tipi di manutenzione
async function loadMaintenanceTypes() {
    try {
        const response = await fetch('/api/maintenance-types');
        const types = await response.json();

        // Aggiorna il dropdown nel modal
        const select = document.getElementById('activity-name');
        select.innerHTML = types.map(type =>
            `<option value="${type}">${type}</option>`
        ).join('');

        // Aggiungi l'opzione "Altro" alla fine
        select.innerHTML += `<option value="altro">Altro (personalizzato)</option>`;

        // Aggiorna la lista dei tipi
        const list = document.getElementById('maintenance-types-list');
        if (list) {  // Check if the element exists (only on maintenance page)
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
        }
    } catch (error) {
        console.error('Errore:', error);
    }
}

// Funzione per aggiungere un nuovo tipo di manutenzione
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

// Funzione per mostrare/nascondere il campo di testo personalizzato
function toggleCustomActivityField() {
    const select = document.getElementById('activity-name');
    const customContainer = document.getElementById('custom-activity-container');

    if (select.value === 'altro') {
        customContainer.classList.remove('hidden');
    } else {
        customContainer.classList.add('hidden');
    }
}

// Funzione per aprire il modal di aggiunta
function openActivityModal(vehicleId) {
    document.getElementById('activity-modal').classList.remove('hidden');
    document.getElementById('current-vehicle-id').value = vehicleId;
    document.getElementById('activity-index').value = '';
    document.getElementById('activity-name').value = '';
    document.getElementById('activity-km').value = '';
    document.getElementById('activity-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('modal-title').textContent = 'Aggiungi Attività';
    document.getElementById('save-activity-btn').onclick = saveActivity;

    // Nascondi il campo personalizzato all'inizio
    document.getElementById('custom-activity-container').classList.add('hidden');
    document.getElementById('custom-activity').value = '';

    // Aggiungi event listener per il change del select
    document.getElementById('activity-name').addEventListener('change', toggleCustomActivityField);
}

function closeActivityModal() {
    document.getElementById('activity-modal').classList.add('hidden');
    document.getElementById('activity-name').value = '';
    document.getElementById('activity-km').value = '';
    document.getElementById('activity-date').value = '';
    document.getElementById('activity-index').value = '';
    document.getElementById('custom-activity').value = '';
    document.getElementById('custom-activity-container').classList.add('hidden');
}

async function saveActivity() {
    const vehicleId = document.getElementById('current-vehicle-id').value;
    let activity = document.getElementById('activity-name').value;
    const kilometers = parseInt(document.getElementById('activity-km').value);
    const date = document.getElementById('activity-date').value;

    // Se è selezionato "Altro", prendi il valore personalizzato
    if (activity === 'altro') {
        const customActivity = document.getElementById('custom-activity').value.trim();
        if (!customActivity) {
            alert('Inserisci un tipo di manutenzione personalizzato');
            return;
        }
        activity = customActivity;
    }

    if (!activity || !kilometers || !date) {
        alert('Compila tutti i campi');
        return;
    }

    try {
        // Prima recupera i dati del veicolo per controllare i km precedenti
        const vehicleResponse = await fetch(`/api/vehicle/${vehicleId}`);
        const vehicleData = await vehicleResponse.json();

        // Trova l'ultima attività dello stesso tipo
        const lastSameActivity = vehicleData.activities
            .filter(a => a.activity === activity)
            .sort((a, b) => b.kilometers - a.kilometers)[0];

        // Se esiste un'attività precedente dello stesso tipo e i km sono minori, chiedi conferma
        if (lastSameActivity && kilometers <= lastSameActivity.kilometers) {
            if (!confirm(`ATTENZIONE: I chilometri inseriti (${kilometers}km) sono minori o uguali all'ultima manutenzione dello stesso tipo (${lastSameActivity.kilometers}km).\n\nVuoi procedere comunque con l'inserimento?`)) {
                return;
            }
        }

        const response = await fetch(`/api/vehicle/${vehicleId}/activity`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                activity: activity,
                kilometers: kilometers,
                date: new Date(date).toISOString()
            })
        });

        if (!response.ok) throw new Error('Errore nel salvataggio');

        closeActivityModal();
        loadVehicles();
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore durante il salvataggio');
    }
}

// Funzione per filtrare i veicoli
function filterVehicles() {
    const searchTerm = document.getElementById('search-plate').value.toLowerCase();
    const rows = document.querySelectorAll('#vehicles-list table tbody tr');

    rows.forEach(row => {
        const licensePlate = row.querySelector('td:first-child').textContent.toLowerCase();
        if (licensePlate.includes(searchTerm)) {
            row.classList.remove('hidden');
        } else {
            row.classList.add('hidden');
        }
    });
}

// Aggiorna la funzione loadVehicles per includere il campo di ricerca
async function loadVehicles() {
    try {
        const response = await fetch('/api/vehicles/');
        const vehicles = await response.json();

        const list = document.getElementById('vehicles-list');
        list.innerHTML = `
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="search-plate">
                    Cerca targa
                </label>
                <input
                    class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                    id="search-plate"
                    type="text"
                    placeholder="Inserisci la targa da cercare..."
                    onkeyup="filterVehicles()">
            </div>
            <table class="min-w-full">
                <thead>
                    <tr>
                        <th class="px-4 py-2">Targa</th>
                        <th class="px-4 py-2">Ultimo Aggiornamento</th>
                        <th class="px-4 py-2">Attività</th>
                        <th class="px-4 py-2">Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${vehicles.map(vehicle => {
            // Sort activities by kilometers in descending order
            const sortedActivities = vehicle.activities.sort((a, b) => b.kilometers - a.kilometers);
            
            // Pre-calculate button properties
            const toggleButtonClass = vehicle.is_active 
                ? 'bg-gray-500 hover:bg-gray-700' 
                : 'bg-purple-500 hover:bg-purple-700';
            const toggleButtonText = vehicle.is_active ? 'Disattiva' : 'Attiva';
            const deleteButtonDisplay = vehicle.is_active ? 'none' : 'inline-block';
            const rowClass = vehicle.is_active ? '' : 'opacity-50 bg-gray-100';
            const statusBadge = vehicle.is_active 
                ? '<span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">Attivo</span>'
                : '<span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white dark:bg-red-600 dark:text-red-100">Disattivato</span>';

            return `
                        <tr class="${rowClass}">
                            <td class="border px-4 py-2">
                                ${vehicle.license_plate}
                                ${statusBadge}
                            </td>
                            <td class="border px-4 py-2">
                                ${new Date(vehicle.last_update).toLocaleDateString('it-IT')}
                            </td>
                            <td class="border px-4 py-2">
                                <ul class="list-none" id="activities-${vehicle.id}">
                                    ${sortedActivities.map((a, index) => `
                                        <li class="mb-2 flex items-center justify-between" id="activity-${vehicle.id}-${index}">
                                            <span>
                                                ${a.activity} a ${a.kilometers.toLocaleString()}km 
                                                (${new Date(a.date).toLocaleDateString('it-IT')})
                                            </span>
                                            <div class="space-x-2">
                                                <button onclick="editActivity('${vehicle.id}', ${index}, ${JSON.stringify(a).replace(/"/g, '&quot;')})"
                                                        class="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded">
                                                    Modifica
                                                </button>
                                                <button onclick="deleteActivity('${vehicle.id}', ${index})"
                                                        class="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded">
                                                    Elimina
                                                </button>
                                            </div>
                                        </li>
                                    `).join('')}
                                </ul>
                            </td>
                            <td class="border px-4 py-2">
                                <div class="flex flex-wrap gap-1">
                                    <button onclick="openActivityModal('${vehicle.id}')"
                                            class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-sm">
                                        Aggiungi Attività
                                    </button>
                                    <button onclick="regenerateQR('${vehicle.id}')"
                                            class="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-sm">
                                        Ristampa QR
                                    </button>
                                    <button onclick="editVehicle('${vehicle.id}', '${vehicle.license_plate}')"
                                            class="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded text-sm">
                                        Modifica
                                    </button>
                                    <button onclick="toggleVehicleActive('${vehicle.id}', ${vehicle.is_active})"
                                            class="${toggleButtonClass} text-white font-bold py-1 px-2 rounded text-sm">
                                        ${toggleButtonText}
                                    </button>
                                    <button onclick="deleteVehicle('${vehicle.id}', ${vehicle.is_active})"
                                            class="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm"
                                            style="display: ${deleteButtonDisplay}">
                                        Elimina
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nel caricamento dei veicoli');
    }
}

// Funzione per eliminare un'attività
async function deleteActivity(vehicleId, activityIndex) {
    if (!confirm('Sei sicuro di voler eliminare questa attività?')) {
        return;
    }

    try {
        const response = await fetch(`/api/vehicle/${vehicleId}/activity/${activityIndex}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Errore nell\'eliminazione');

        // Ricarica la lista dei veicoli
        loadVehicles();
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore durante l\'eliminazione dell\'attività');
    }
}

// Funzione per aprire il modal di modifica
function editActivity(vehicleId, activityIndex, activity) {
    document.getElementById('activity-modal').classList.remove('hidden');
    document.getElementById('current-vehicle-id').value = vehicleId;
    document.getElementById('activity-index').value = activityIndex;

    // Controlla se il tipo di attività esiste nel select
    const activitySelect = document.getElementById('activity-name');
    let activityExists = false;

    for (let i = 0; i < activitySelect.options.length; i++) {
        if (activitySelect.options[i].value === activity.activity) {
            activityExists = true;
            break;
        }
    }

    if (activityExists) {
        // Se esiste, selezionalo
        activitySelect.value = activity.activity;
        document.getElementById('custom-activity-container').classList.add('hidden');
    } else {
        // Se non esiste, seleziona "Altro" e mostra il campo personalizzato
        activitySelect.value = 'altro';
        document.getElementById('custom-activity-container').classList.remove('hidden');
        document.getElementById('custom-activity').value = activity.activity;
    }

    document.getElementById('activity-km').value = activity.kilometers;
    document.getElementById('activity-date').value = new Date(activity.date).toISOString().split('T')[0];
    document.getElementById('modal-title').textContent = 'Modifica Attività';
    document.getElementById('save-activity-btn').onclick = updateActivity;

    // Aggiungi event listener per il change del select
    document.getElementById('activity-name').addEventListener('change', toggleCustomActivityField);
}

// Funzione per aggiornare un'attività
async function updateActivity() {
    const vehicleId = document.getElementById('current-vehicle-id').value;
    const activityIndex = document.getElementById('activity-index').value;
    let activity = document.getElementById('activity-name').value;
    const kilometers = document.getElementById('activity-km').value;
    const date = document.getElementById('activity-date').value;

    // Se è selezionato "Altro", prendi il valore personalizzato
    if (activity === 'altro') {
        const customActivity = document.getElementById('custom-activity').value.trim();
        if (!customActivity) {
            alert('Inserisci un tipo di manutenzione personalizzato');
            return;
        }
        activity = customActivity;
    }

    if (!activity || !kilometers || !date) {
        alert('Compila tutti i campi');
        return;
    }

    try {
        const response = await fetch(`/api/vehicle/${vehicleId}/activity/${activityIndex}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                activity: activity,
                kilometers: parseInt(kilometers),
                date: new Date(date).toISOString()
            })
        });

        if (!response.ok) throw new Error('Errore nell\'aggiornamento');

        closeActivityModal();
        loadVehicles();
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore durante l\'aggiornamento dell\'attività');
    }
}

function printQRDirectly(qrCodeData) {
    // Crea un div temporaneo per la stampa
    const qrDisplay = document.createElement('div');
    qrDisplay.className = 'qr-code-container printing';
    qrDisplay.innerHTML = `<img src="${qrCodeData}" alt="QR Code">`;
    document.body.appendChild(qrDisplay);
    
    // Stampa
    window.print();
    
    // Rimuovi il div dopo la stampa
    setTimeout(() => {
        qrDisplay.remove();
    }, 100);
}

async function regenerateQR(vehicleId) {
    try {
        const response = await fetch(`/api/vehicle/${vehicleId}/qr`);
        const data = await response.json();

        // Aggiorna o crea il div per il QR code
        let qrDisplay = document.getElementById('qr-code-display');
        if (!qrDisplay) {
            qrDisplay = document.createElement('div');
            qrDisplay.id = 'qr-code-display';
            document.body.appendChild(qrDisplay);
        }

        // Imposta il contenuto
        qrDisplay.className = 'qr-code-container';
        qrDisplay.innerHTML = `
            <img id="qr-code" src="${data.qr_code}" alt="QR Code">
        `;

        // Aggiungi la classe per la stampa
        qrDisplay.classList.add('printing');

        // Stampa
        window.print();

        // Rimuovi la classe dopo la stampa e rimuovi il div temporaneo
        setTimeout(() => {
            qrDisplay.classList.remove('printing');
            qrDisplay.remove();
        }, 100);

    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nella generazione del QR code');
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

// Controlla permessi admin al caricamento
document.addEventListener('DOMContentLoaded', function() {
    checkAdminPermissions();
});

// Vehicle Management Functions
function editVehicle(vehicleId, currentLicensePlate) {
    const newLicensePlate = prompt('Modifica targa:', currentLicensePlate);
    
    if (newLicensePlate === null || newLicensePlate.trim() === '') {
        return; // User cancelled or entered empty string
    }
    
    if (newLicensePlate.trim() === currentLicensePlate) {
        alert('La targa non è stata modificata.');
        return;
    }
    
    updateVehicleLicensePlate(vehicleId, newLicensePlate.trim());
}

async function updateVehicleLicensePlate(vehicleId, newLicensePlate) {
    try {
        const response = await fetch(`/api/vehicle/${vehicleId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                license_plate: newLicensePlate
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 400 && data.detail === 'License plate already exists') {
                alert('Errore: La targa inserita è già in uso da un altro veicolo.');
            } else {
                throw new Error(data.detail || 'Errore durante l\'aggiornamento');
            }
            return;
        }

        alert('Targa aggiornata con successo!');
        loadVehicles(); // Reload the vehicles list
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore durante l\'aggiornamento della targa: ' + error.message);
    }
}

async function toggleVehicleActive(vehicleId, currentStatus) {
    const action = currentStatus ? 'disattivare' : 'attivare';
    
    if (!confirm(`Sei sicuro di voler ${action} questo veicolo?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/vehicle/${vehicleId}/toggle-active`, {
            method: 'PUT'
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Errore durante il cambio di stato');
        }

        const statusText = data.is_active ? 'attivato' : 'disattivato';
        alert(`Veicolo ${statusText} con successo!`);
        loadVehicles(); // Reload the vehicles list
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore durante il cambio di stato: ' + error.message);
    }
}

async function deleteVehicle(vehicleId, isActive) {
    if (isActive) {
        alert('Non è possibile eliminare un veicolo attivo. Disattivalo prima.');
        return;
    }
    
    // Check if user is admin
    const userRole = await checkAdminPermissions();
    if (!userRole) {
        alert('Solo gli amministratori possono eliminare i veicoli.');
        return;
    }
    
    if (!confirm('ATTENZIONE: Questa azione eliminerà il veicolo e TUTTE le sue manutenzioni in modo permanente.\n\nSei sicuro di voler continuare?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/vehicle/${vehicleId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 403) {
                alert('Accesso negato: Solo gli amministratori possono eliminare i veicoli.');
            } else if (response.status === 400) {
                alert('Errore: Non è possibile eliminare un veicolo attivo. Disattivalo prima.');
            } else {
                throw new Error(data.detail || 'Errore durante l\'eliminazione');
            }
            return;
        }

        alert('Veicolo e tutte le sue manutenzioni sono stati eliminati con successo!');
        loadVehicles(); // Reload the vehicles list
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore durante l\'eliminazione: ' + error.message);
    }
}