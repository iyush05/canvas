import WebSocket from 'ws';
const url = "ws://localhost:3001?roomId=cmpdom2t10005gts4iu843ktr&clientId=W8PGyFszMh&userName=SwiftFox&color=%23f06595";
const ws = new WebSocket(url);
ws.on('open', () => { console.log('Connected'); ws.close(); });
ws.on('error', (err) => console.error('Error:', err.message));
ws.on('close', (code, reason) => console.log('Closed:', code, reason.toString()));
