const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3001');
ws.on('error', err => console.error('Error:', err.message));
ws.on('close', (code, reason) => console.log('Closed:', code, reason.toString()));
