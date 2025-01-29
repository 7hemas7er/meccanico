// Funzione per aggiungere un nuovo veicolo
async function addVehicle() {
    const licensePlate = document.getElementById('license-plate').value;
    if (!licensePlate) {
        alert('Inserisci una targa valida');
        return;
    }

    try {
        const response = await fetch('/vehicle/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                license_plate: licensePlate,
                operations: []
            })
        });

        const data = await response.json();
        
        // Mostra il QR code
        document.getElementById('qr-code-display').classList.remove('hidden');
        document.getElementById('qr-code').src = data.qr_code;
        document.getElementById('vehicle-url').textContent = `ID Veicolo: ${data.vehicle_id}`;
        
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore durante la creazione del veicolo');
    }
}

// Funzione per caricare i dati del veicolo
async function loadVehicleData(vehicleId) {
    try {
        const response = await fetch(`/vehicle/${vehicleId}`);
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('vehicle-info').classList.remove('hidden');
            document.getElementById('info-license-plate').textContent = data.license_plate;
            document.getElementById('info-service-date').textContent = 
                data.service_date ? new Date(data.service_date).toLocaleDateString('it-IT') : 'Non disponibile';
            document.getElementById('info-next-service').textContent = 
                data.next_service ? new Date(data.next_service).toLocaleDateString('it-IT') : 'Non disponibile';
            document.getElementById('info-operations').textContent = 
                data.operations.length > 0 ? data.operations.join(', ') : 'Nessuna operazione registrata';
        } else {
            alert('Veicolo non trovato');
        }
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore durante il caricamento dei dati');
    }
}

// Controlla se siamo in una pagina veicolo
const pathParts = window.location.pathname.split('/');
if (pathParts[1] === 'vehicle' && pathParts[2]) {
    loadVehicleData(pathParts[2]);
}
