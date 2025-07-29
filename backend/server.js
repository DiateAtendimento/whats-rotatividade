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

// Middleware estático para animações Lottie
app.use('/animacoes', express.static('animacoes'));

// Rotas
app.use('/api/rotatividade', rotatividadeRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.send('Servidor da Rotatividade de Atendimentos ativo! ✅');
});

app.use((req, res) => {
  res.status(404).send('Rota não encontrada: ' + req.originalUrl);
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
