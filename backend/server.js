// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rotatividadeRoutes = require('./routes/rotatividade');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware global de CORS com origem específica
app.use(cors({
  origin: 'https://whatsaprotatividade.netlify.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
}));

// Suporte a preflight (OPTIONS) para todas as rotas
app.options('*', cors());

// Middleware para JSON
app.use(express.json());

// Rotas
app.use('/api/rotatividade', rotatividadeRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.send('Servidor da Rotatividade de Atendimentos ativo! ✅');
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
