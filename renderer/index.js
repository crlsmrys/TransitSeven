const { ipcRenderer } = require('electron');

const stopGrid = document.getElementById('stopGrid');
const routeResultsDiv = document.getElementById('routeResults');
const stopInput = document.getElementById('stopInput');

// Fetch and display 30 stops on load
async function initializeStops() {
    try {
        const res = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop`);
        const json = await res.json();
        renderStopBoxes(json.data.slice(0, 30)); // Take first 30 stops
        
        // Add filtering logic
        document.getElementById('searchStopBtn').onclick = () => {
            const term = stopInput.value.toLowerCase();
            const filtered = json.data.filter(s => s.name_en.toLowerCase().includes(term)).slice(0, 30);
            renderStopBoxes(filtered);
        };
    } catch (err) { console.error("Failed to load stops", err); }
}

function renderStopBoxes(stops) {
    stopGrid.innerHTML = "";
    stops.forEach(stop => {
        const box = document.createElement('div');
        box.className = "stop-box"; 
        box.innerHTML = `
            <span class="stop-name">${stop.name_en}</span>
        `;
        box.onclick = () => loadRoutesForStop(stop.stop, stop.name_en);
        stopGrid.appendChild(box);
    });
}

async function loadRoutesForStop(stopId, stopName) {
    routeResultsDiv.innerHTML = `<div class="loading">Fetching routes for ${stopName}...</div>`;
    try {
        const res = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${stopId}`);
        const json = await res.json();
        
        routeResultsDiv.innerHTML = `<h3>Routes at ${stopName}</h3>`;
        
        // Remove duplicates and show ETA
        const uniqueRoutes = json.data.filter((v, i, a) => a.findIndex(t => t.route === v.route) === i);

        uniqueRoutes.forEach(bus => {
            const waitTime = bus.eta ? Math.max(0, Math.floor((new Date(bus.eta) - new Date()) / 1000 / 60)) : "??";
            const card = document.createElement('div');
            card.className = 'bus-card';
            card.innerHTML = `
                <div class="bus-info-left">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span class="route-badge">${bus.route}</span>
                        <span style="font-weight:bold;">To: ${bus.dest_en}</span>
                    </div>
                    <span class="wait-time">${waitTime} min</span>
                </div>
                <button class="save-btn" onclick="saveToFav('${stopId}', '${bus.route}', '${bus.bound}', '${bus.service_type}', '${stopName}')">
                    ⭐ Save Stop
                </button>
            `;
            routeResultsDiv.appendChild(card);
        });
    } catch (err) { routeResultsDiv.innerHTML = "Error loading ETAs."; }
}

window.saveToFav = (stop_id, route, bound, service_type, stopName) => {
    ipcRenderer.send('save-favorite', { 
        stop_id, 
        route, 
        stopName, 
        notes: "" 
    });
    alert(`Saved Route ${route} at ${stopName}!`);
};

document.getElementById('favPageBtn').onclick = () => ipcRenderer.send('open-favorites-window');

initializeStops();