require('dotenv').config();

const http = require('http');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3003;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing from .env');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json'
    });

    return res.end(JSON.stringify({
      status: 'ok',
      service: 'websocket-pastebin'
    }));
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocket.Server({
  noServer: true
});

server.on('upgrade', (req, socket, head) => {
  try {
    const url = new URL(
      req.url,
      `http://${req.headers.host}`
    );

    const token = url.searchParams.get('token');

    if (!token) {
      throw new Error('Token missing');
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = {
      userId: payload.userId,
      username: payload.username
    };

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.user = req.user;
      wss.emit('connection', ws, req);
    });

  } catch (error) {
    socket.write(
      'HTTP/1.1 401 Unauthorized\r\n\r\n'
    );

    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  console.log(
    `WebSocket connected: user ${ws.user.userId}`
  );

  ws.on('message', (message) => {
    const text = message.toString();

    for (const client of wss.clients) {
      if (
        client.readyState === WebSocket.OPEN &&
        client.user.userId === ws.user.userId
      ) {
        client.send(text);
      }
    }
  });

  ws.on('close', () => {
    console.log(
      `WebSocket disconnected: user ${ws.user.userId}`
    );
  });
});

server.listen(PORT, () => {
  console.log(
    `WebSocket server running on port ${PORT}`
  );
});