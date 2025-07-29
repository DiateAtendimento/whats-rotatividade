require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rotatividadeRoutes = require('./routes/rotatividade');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ CORS configurado com origem específica
app.use(cors({
  origin: 'https://whatsaprotatividade.netlify.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// Middleware para JSON
app.use(express.json());

// Servir animações Lottie
app.use('/animacoes', express.static(path.join(__dirname, 'animacoes')));

// Rotas
app.use('/api/rotatividade', rotatividadeRoutes);

// Página inicial
app.get('/', (req, res) => {
  res.send('Servidor da Rotatividade de Atendimentos ativo! ✅');
});

// Rota 404
app.use((req, res) => {
  res.status(404).send('Rota não encontrada: ' + req.originalUrl);
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
