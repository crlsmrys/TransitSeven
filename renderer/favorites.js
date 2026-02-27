const { ipcRenderer } = require('electron');
const listContainer = document.getElementById("favoritesList");
const statusDiv = document.getElementById("statusSummary");

async function loadFavs() {
    const favs = await ipcRenderer.invoke('load-favorites');
    if (favs.length === 0) {
        listContainer.innerHTML = "<p>No favorites saved yet.</p>";
        statusDiv.innerHTML = "Add some stops to see your summary!";
        return;
    }

    let soonestBus = { route: '', time: Infinity, stop: '' };

    // Fetch live data and build the HTML for all cards
    const favCards = await Promise.all(favs.map(async (item) => {
        let etaText = "Fetching...";
        let isLive = false;

        try {
            const res = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${item.stop_id}`);
            const json = await res.json();
            const busData = json.data.find(b => b.route === item.route);

            if (busData && busData.eta) {
                const wait = Math.max(0, Math.floor((new Date(busData.eta) - new Date()) / 1000 / 60));
                etaText = `${wait} mins`;
                isLive = busData.rmk_en === "Real-time";
                
                if (wait < soonestBus.time) {
                    soonestBus = { route: item.route, time: wait, stop: item.stopName };
                }
            } else {
                etaText = "No Service";
            }
        } catch (e) { etaText = "Offline"; }

        // Returning the combined View and Edit HTML
        return `
            <div class="bus-card">
                <div id="view-${item.id}">
                    <div class="fav-header">
                        <span class="route-badge">${item.route}</span>
                        <span class="live-indicator ${isLive ? 'active' : ''}">
                            ${isLive ? '● LIVE' : '○ SCHEDULED'}
                        </span>
                    </div>
                    <h3>${item.stopName}</h3>
                    <p class="wait-time">${etaText}</p>
                    <p class="notes-text"><strong>Note:</strong> ${item.notes || "No notes added."}</p>
                    
                    <div class="card-actions">
                        <button class="edit-btn" onclick="showEdit(${item.id})">✏️ Edit Note</button>
                        <button class="delete-btn" onclick="deleteItem(${item.id})">🗑️</button>
                    </div>
                </div>

                <div id="edit-${item.id}" style="display:none;" class="edit-mode">
                    <input type="text" id="input-${item.id}" value="${item.notes || ''}" placeholder="Enter new note...">
                    <div class="card-actions">
                        <button class="save-btn" onclick="saveUpdate(${item.id})">✅ Save</button>
                        <button class="cancel-btn" onclick="loadFavs()">❌ Cancel</button>
                    </div>
                </div>
            </div>`;
    }));

    listContainer.innerHTML = favCards.join('');
    
    // Update Summary
    if (soonestBus.time !== Infinity) {
        statusDiv.innerHTML = `🌟 <strong>Summary:</strong> Next bus is <strong>${soonestBus.route}</strong> in <strong>${soonestBus.time} mins</strong> at ${soonestBus.stop}.`;
    } else {
        statusDiv.innerHTML = `✅ You have ${favs.length} saved stops.`;
    }
    
    document.getElementById('lastUpdated').innerText = `Last updated: ${new Date().toLocaleTimeString()}`;
}

// CRUD FUNCTIONS
window.showEdit = (id) => {
    document.getElementById(`view-${id}`).style.display = 'none';
    document.getElementById(`edit-${id}`).style.display = 'block';
};

window.saveUpdate = (id) => {
    const newNote = document.getElementById(`input-${id}`).value;
    ipcRenderer.send('update-favorite', { id, notes: newNote });
    loadFavs();
};

window.deleteItem = (id) => {
    if(confirm("Delete this favorite?")) {
        ipcRenderer.send('delete-favorite', id);
        loadFavs();
    }
};

// Start logic
document.addEventListener('DOMContentLoaded', loadFavs);
setInterval(loadFavs, 30000); // Auto-refresh every 30s

document.getElementById('backBtn').addEventListener('click', () => {
    ipcRenderer.send('focus-main-window');
});