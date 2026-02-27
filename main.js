const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let favoritesWindow;
const filePath = path.join(__dirname, 'data', 'favorite-stops.json');

if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));
if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]');

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 900, // Match size
        height: 700,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    mainWindow.loadFile('renderer/index.html');
}

function createFavoritesWindow() {
    if (favoritesWindow) {
        favoritesWindow.focus();
        return;
    }

    favoritesWindow = new BrowserWindow({
        width: 900, // Set to same width as main
        height: 700, // Set to same height as main
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });

    favoritesWindow.loadFile('renderer/favorites.html');

    favoritesWindow.on('closed', () => {
        favoritesWindow = null;
    });
}

ipcMain.on('open-favorites-window', () => { // IPC Handlers
    createFavoritesWindow();
});

ipcMain.on('save-favorite', (event, item) => {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    item.id = Date.now();
    data.push(item);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
});

ipcMain.handle('load-favorites', () => {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
});

ipcMain.on('update-favorite', (event, updatedItem) => {
    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const index = data.findIndex(i => i.id === updatedItem.id);
    if (index !== -1) {
        data[index].notes = updatedItem.notes;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
});

ipcMain.on('delete-favorite', (event, id) => {
    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data = data.filter(i => i.id !== id);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
});

ipcMain.on('focus-main-window', () => {
    if (mainWindow) {
        mainWindow.focus(); // Brings the search window to the front
    } else {
        createMainWindow(); // Re-creates it if you accidentally closed it
    }
});

app.whenReady().then(createMainWindow);