const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../prisma');

const router = express.Router();

function createAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

function createRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

function getRefreshExpiry() {
  const days = Number(process.env.REFRESH_TOKEN_DAYS || 30);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// POST /users - skapa ny användare
router.post('/', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (username.trim().length < 3 || password.length < 8) {
    return res.status(400).json({ error: 'Username must be 3+ chars and password 8+ chars' });
  }

  const cleanUsername = username.trim().toLowerCase();

  try {
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // bcrypt skapar salt och hash automatiskt
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        passwordHash
      },
      select: {
        id: true,
        username: true,
        createdAt: true
      }
    });

    return res.status(201).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not create user' });
  }
});

// POST /users/login - kontrollera lösenord och returnera access + refresh token
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const passwordIsCorrect = await bcrypt.compare(password, user.passwordHash);

    if (!passwordIsCorrect) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: getRefreshExpiry()
      }
    });

    return res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not log in' });
  }
});

// POST /users/refresh - returnera ny access token
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!storedToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (storedToken.expiresAt <= new Date()) {
      await prisma.refreshToken.delete({
        where: { id: storedToken.id }
      }).catch(() => {});

      return res.status(401).json({ error: 'Refresh token expired' });
    }

    const accessToken = createAccessToken(storedToken.user);

    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not refresh access token' });
  }
});

// DELETE /users/refresh - logga ut genom att radera refresh token
router.delete('/refresh', async (req, res) => {
  const authorization = req.headers.authorization || '';
  const refreshToken = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken }
    });

    return res.status(200).json({ message: 'Logged out' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not log out' });
  }
});

module.exports = router;
