import WebSocket from 'ws';
const ws = new WebSocket('ws://localhost:3001?roomId=test&clientId=test');
ws.on('open', () => { console.log('Connected'); ws.close(); });
ws.on('error', (err) => console.error('Error:', err));
