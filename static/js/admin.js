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

        document.getElementById('qr-code-display').classList.remove('hidden');
        document.getElementById('qr-code').src = data.qr_code;
        
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

// Modifica la funzione openActivityModal per caricare i tipi
async function openActivityModal(vehicleId) {
    document.getElementById('activity-modal').classList.remove('hidden');
    document.getElementById('current-vehicle-id').value = vehicleId;
    await loadMaintenanceTypes();
}

// Aggiungi il caricamento dei tipi all'avvio
document.addEventListener('DOMContentLoaded', () => {
    loadVehicles();
    loadMaintenanceTypes();
});

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
}

function closeActivityModal() {
    document.getElementById('activity-modal').classList.add('hidden');
    document.getElementById('activity-name').value = '';
    document.getElementById('activity-km').value = '';
    document.getElementById('activity-date').value = '';
    document.getElementById('activity-index').value = '';
}

async function saveActivity() {
    const vehicleId = document.getElementById('current-vehicle-id').value;
    const activity = document.getElementById('activity-name').value;
    const kilometers = parseInt(document.getElementById('activity-km').value);
    const date = document.getElementById('activity-date').value;

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

            return `
                        <tr>
                            <td class="border px-4 py-2">${vehicle.license_plate}</td>
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
                                <button onclick="openActivityModal('${vehicle.id}')"
                                        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded mr-2">
                                    Aggiungi Attività
                                </button>
                                <button onclick="regenerateQR('${vehicle.id}')"
                                        class="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded">
                                    Ristampa QR
                                </button>
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
    document.getElementById('activity-name').value = activity.activity;
    document.getElementById('activity-km').value = activity.kilometers;
    document.getElementById('activity-date').value = new Date(activity.date).toISOString().split('T')[0];
    document.getElementById('modal-title').textContent = 'Modifica Attività';
    document.getElementById('save-activity-btn').onclick = updateActivity;
}

// Funzione per aggiornare un'attività
async function updateActivity() {
    const vehicleId = document.getElementById('current-vehicle-id').value;
    const activityIndex = document.getElementById('activity-index').value;
    const activity = document.getElementById('activity-name').value;
    const kilometers = document.getElementById('activity-km').value;
    const date = document.getElementById('activity-date').value;

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

        // Rimuovi la classe dopo la stampa
        qrDisplay.classList.remove('printing');

    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nella generazione del QR code');
    }
}


// Carica la lista dei veicoli all'avvio
document.addEventListener('DOMContentLoaded', loadVehicles);