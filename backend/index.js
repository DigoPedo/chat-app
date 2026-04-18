const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ─────────────────────────────────────────────────────────────────

// POST /send — save a new message
app.post('/send', async (req, res) => {
  try {
    const { roomId, username, content } = req.body;

    if (!roomId || !username || !content) {
      return res.status(400).json({ error: 'roomId, username, and content are required.' });
    }

    const message = await prisma.message.create({
      data: { roomId, username, content },
    });

    res.status(201).json(message);
  } catch (err) {
    console.error('POST /send error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /messages/:roomId — fetch all messages for a room
app.get('/messages/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages);
  } catch (err) {
    console.error('GET /messages/:roomId error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Chat backend running on http://localhost:${PORT}`);
});
