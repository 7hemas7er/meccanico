// User management functions
let isAdmin = false;

async function checkAdminPermissions() {
    try {
        const response = await fetch('/api/user/role');
        const data = await response.json();
        isAdmin = data.is_admin;
        
        if (!isAdmin) {
            // Se non è admin, reindirizza alla pagina principale
            window.location.href = '/admin';
            return false;
        }
        
        return isAdmin;
    } catch (error) {
        console.error('Errore nel controllo permessi:', error);
        window.location.href = '/login';
        return false;
    }
}

async function loadUsers() {
    if (!isAdmin) return;
    
    try {
        const response = await fetch('/api/users');
        const users = await response.json();
        
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = '';
        
        if (users.length === 0) {
            usersList.innerHTML = '<p class="text-gray-500">Nessun utente trovato.</p>';
            return;
        }
        
        users.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.className = 'border p-4 mb-2 rounded flex justify-between items-center';
            userDiv.innerHTML = `
                <div>
                    <span class="font-semibold">${user.username}</span>
                    <span class="ml-2 px-2 py-1 text-xs rounded ${user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}">${user.role}</span>
                    <span class="ml-2 px-2 py-1 text-xs rounded ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">${user.is_active ? 'Attivo' : 'Inattivo'}</span>
                    <div class="text-sm text-gray-500">Creato: ${new Date(user.created_at).toLocaleDateString()}</div>
                    ${user.last_login ? `<div class="text-sm text-gray-500">Ultimo accesso: ${new Date(user.last_login).toLocaleDateString()}</div>` : ''}
                </div>
                <div class="flex gap-2">
                    ${user.role !== 'admin' ? `
                        <button onclick="toggleUserActive(${user.id})" 
                                class="px-3 py-1 text-sm rounded ${user.is_active ? 'bg-yellow-500 hover:bg-yellow-700 text-white' : 'bg-green-500 hover:bg-green-700 text-white'}">
                            ${user.is_active ? 'Disattiva' : 'Attiva'}
                        </button>
                        <button onclick="deleteUser(${user.id})" 
                                class="bg-red-500 hover:bg-red-700 text-white px-3 py-1 text-sm rounded">
                            Elimina
                        </button>
                    ` : '<span class="text-gray-500 text-sm">Amministratore</span>'}
                </div>
            `;
            usersList.appendChild(userDiv);
        });
    } catch (error) {
        console.error('Errore nel caricamento utenti:', error);
        alert('Errore nel caricamento utenti');
    }
}

async function createUser() {
    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('new-password').value;
    
    if (!username || !password) {
        alert('Inserisci username e password');
        return;
    }
    
    if (username.length < 3) {
        alert('Lo username deve essere di almeno 3 caratteri');
        return;
    }
    
    if (password.length < 6) {
        alert('La password deve essere di almeno 6 caratteri');
        return;
    }
    
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        if (response.ok) {
            document.getElementById('new-username').value = '';
            document.getElementById('new-password').value = '';
            loadUsers();
            alert('Utente creato con successo');
        } else {
            const error = await response.json();
            alert('Errore: ' + error.detail);
        }
    } catch (error) {
        console.error('Errore nella creazione utente:', error);
        alert('Errore nella creazione utente');
    }
}

async function deleteUser(userId) {
    if (!confirm('Sei sicuro di voler eliminare questo utente? Questa operazione non può essere annullata.')) return;
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadUsers();
            alert('Utente eliminato con successo');
        } else {
            const error = await response.json();
            alert('Errore: ' + error.detail);
        }
    } catch (error) {
        console.error('Errore nell\'eliminazione utente:', error);
        alert('Errore nell\'eliminazione utente');
    }
}

async function toggleUserActive(userId) {
    try {
        const response = await fetch(`/api/users/${userId}/toggle-active`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            const result = await response.json();
            loadUsers();
            alert(`Utente ${result.is_active ? 'attivato' : 'disattivato'} con successo`);
        } else {
            const error = await response.json();
            alert('Errore: ' + error.detail);
        }
    } catch (error) {
        console.error('Errore nel cambio stato utente:', error);
        alert('Errore nel cambio stato utente');
    }
}