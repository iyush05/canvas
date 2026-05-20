const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3001');
ws.on('error', err => console.log('Error fired!', err.message));
ws.on('close', () => console.log('Close fired!'));
ws.close();
