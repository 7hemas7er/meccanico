async function loadVehicleData() {
    const vehicleId = window.location.pathname.split('/').pop();

    try {
        const response = await fetch(`/api/vehicle/${vehicleId}`);
        const data = await response.json();

        if (response.ok) {
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

// Carica i dati del veicolo all'avvio
document.addEventListener('DOMContentLoaded', loadVehicleData);