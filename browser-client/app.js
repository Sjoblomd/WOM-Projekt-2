const config = window.PASTEBIN_CONFIG;
 
const loginCard = document.getElementById('loginCard');

const appCard = document.getElementById('appCard');
 
const usernameInput = document.getElementById('username');

const passwordInput = document.getElementById('password');
 
const loginBtn = document.getElementById('loginBtn');

const logoutBtn = document.getElementById('logoutBtn');
 
const statusText = document.getElementById('statusText');

const statusDot = document.getElementById('statusDot');
 
const reconnectBtn = document.getElementById('reconnectBtn');
 
const pasteText = document.getElementById('pasteText');
 
const sendBtn = document.getElementById('sendBtn');

const copyBtn = document.getElementById('copyBtn');
 
const loginError = document.getElementById('loginError');

const messageInfo = document.getElementById('messageInfo');
 
let socket;

let manualClose = false;
 
function setStatus(text, type = '') {

  statusText.textContent = text;

  statusDot.className = 'dot';
 
  if (type) {

    statusDot.classList.add(type);

  }

}
 
function getAccessToken() {

  return localStorage.getItem('accessToken');

}
 
function getRefreshToken() {

  return localStorage.getItem('refreshToken');

}
 
function saveTokens(accessToken, refreshToken) {

  localStorage.setItem('accessToken', accessToken);
 
  if (refreshToken) {

    localStorage.setItem('refreshToken', refreshToken);

  }

}
 
async function login() {

  loginError.textContent = '';
 
  try {

    const response = await fetch(

      `${config.AUTH_API_URL}/users/login`,

      {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json'

        },

        body: JSON.stringify({

          username: usernameInput.value,

          password: passwordInput.value

        })

      }

    );
 
    if (!response.ok) {

      loginError.textContent = 'Login failed';

      return;

    }
 
    const data = await response.json();
 
    saveTokens(

      data.accessToken,

      data.refreshToken

    );
 
    showApp();

    connectWebSocket();
 
  } catch (error) {

    console.error(error);

    loginError.textContent = 'Could not connect to server';

  }

}
 
async function refreshAccessToken() {

  const refreshToken = getRefreshToken();
 
  if (!refreshToken) {

    return false;

  }
 
  try {

    const response = await fetch(

      `${config.AUTH_API_URL}/users/refresh`,

      {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json'

        },

        body: JSON.stringify({

          refreshToken

        })

      }

    );
 
    if (!response.ok) {

      return false;

    }
 
    const data = await response.json();
 
    localStorage.setItem(

      'accessToken',

      data.accessToken

    );
 
    return true;
 
  } catch (error) {

    console.error(error);

    return false;

  }

}
 
function connectWebSocket() {

  const token = getAccessToken();
 
  if (!token) {

    showLogin();

    return;

  }
 
  if (socket) {

    manualClose = true;

    socket.close();

  }
 
  manualClose = false;
 
  setStatus('Connecting...');
 
  socket = new WebSocket(

    `${config.WS_URL}?token=${encodeURIComponent(token)}`

  );
 
  socket.onopen = () => {

    setStatus('Connected', 'connected');

  };
 
  socket.onmessage = (event) => {

    pasteText.value = event.data;

    messageInfo.textContent = 'Text received';

  };
 
  socket.onerror = () => {

    setStatus('Connection error', 'error');

  };
 
  socket.onclose = async () => {

    setStatus('Disconnected', 'error');
 
    if (manualClose) {

      return;

    }
 
    const refreshed = await refreshAccessToken();
 
    if (refreshed) {

      connectWebSocket();

    } else {

      await clearSession();

      loginError.textContent = 'Session expired. Please log in again.';

    }

  };

}
 
function sendText() {

  if (

    !socket ||

    socket.readyState !== WebSocket.OPEN

  ) {

    setStatus('Not connected', 'error');

    return;

  }
 
  socket.send(pasteText.value);

}
 
async function logout() {

  const refreshToken = getRefreshToken();
 
  if (refreshToken) {

    try {

      await fetch(

        `${config.AUTH_API_URL}/users/refresh`,

        {

          method: 'DELETE',

          headers: {

            Authorization: `Bearer ${refreshToken}`

          }

        }

      );

    } catch (error) {

      console.error(error);

    }

  }
 
  await clearSession();

}
 
async function clearSession() {

  localStorage.removeItem('accessToken');

  localStorage.removeItem('refreshToken');
 
  if (socket) {

    manualClose = true;

    socket.close();

    socket = null;

  }
 
  showLogin();

}
 
function showApp() {

  loginCard.classList.add('hidden');

  appCard.classList.remove('hidden');

}
 
function showLogin() {

  appCard.classList.add('hidden');

  loginCard.classList.remove('hidden');

}
 
loginBtn.addEventListener(

  'click',

  login

);
 
logoutBtn.addEventListener(

  'click',

  logout

);
 
reconnectBtn.addEventListener(

  'click',

  connectWebSocket

);
 
sendBtn.addEventListener(

  'click',

  sendText

);
 
copyBtn.addEventListener(

  'click',

  async () => {

    await navigator.clipboard.writeText(

      pasteText.value

    );
 
    messageInfo.textContent = 'Copied';

  }

);
 
if (

  getAccessToken() &&

  getRefreshToken()

) {

  showApp();

  connectWebSocket();

}
 