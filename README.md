## WebSocket Pastebin
Detta är Projekt 2 i kursen Webbtjänster och molnteknologi.
Projektet går ut på att skapa en enkel pastebin där text kan skickas mellan olika enheter direkt med hjälp av WebSocket.
Projektet innehåller:
- Auth API
- Refresh tokens
- WebSocket-server
- Browserklient
- Desktop-app med Electron
Användaren loggar in och får en access token och en refresh token. WebSocket-servern kontrollerar JWT när anslutningen skapas. Text som skickas från en klient skickas vidare till andra klienter som är inloggade med samma användare.
Browserklienten kan användas på flera enheter och visar också status för WebSocket-anslutningen.
Desktop-appen är gjord med Electron och använder säker lagring för tokens.
Teknologier som används:
- Node.js
- Express
- WebSocket
- Prisma
- PostgreSQL / Neon
- JWT
- bcrypt
- HTML
- CSS
- JavaScript
- Electron
AI har använts som stöd för planering, kodförslag, felsökning och dokumentation.
