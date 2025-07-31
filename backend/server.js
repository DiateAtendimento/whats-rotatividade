require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rotas = require('./routes/rotatividade');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS usando origem definida em .env
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
  })
);

app.use(express.json());

// Servir animações Lottie como estático
app.use('/animacoes', express.static(path.join(__dirname, 'animacoes')));

// API de rotatividade
app.use('/api/rotatividade', rotas);

// Rota raiz para teste
app.get('/', (req, res) => {
  res.send('Servidor da Rotatividade ativo! ✅');
});

// 404 fallback
app.use((req, res) => {
  res.status(404).send(`Rota não encontrada: ${req.originalUrl}`);
});

app.listen(PORT, () =>
  console.log(`Servidor rodando na porta ${PORT}`)
);
