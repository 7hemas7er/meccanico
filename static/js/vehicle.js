async function loadVehicleData() {
    const vehicleId = window.location.pathname.split('/').pop();

    try {
        const response = await fetch(`/api/vehicle/${vehicleId}`);
        const data = await response.json();

        if (response.ok) {
            document.getElementById('vehicle-plate').textContent = data.license_plate;

            // Ordina le attività per data (più recenti prima)
            const sortedActivities = data.activities.sort((a, b) =>
                new Date(b.date) - new Date(a.date)
            );

            // Popola la lista delle attività
            const activitiesList = document.getElementById('activities-list');
            activitiesList.innerHTML = sortedActivities.length > 0
                ? sortedActivities.map(activity => `
                    <div class="border-l-4 border-blue-500 pl-4 mb-4">
                        <p class="font-bold">${activity.activity}</p>
                        <p class="text-sm text-gray-600">
                            Kilometri: ${activity.kilometers.toLocaleString('it-IT')}
                        </p>
                        <p class="text-sm text-gray-600">
                            Data: ${new Date(activity.date).toLocaleDateString('it-IT')}
                        </p>
                    </div>
                `).join('')
                : '<p class="text-gray-500">Nessuna manutenzione registrata</p>';
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