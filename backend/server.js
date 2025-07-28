// backend/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const rotatividadeRoutes = require('./routes/rotatividade');

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: 'https://whatsaprotatividade.netlify.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight para qualquer rota

app.use(express.json());

// Rotas
app.use('/api/rotatividade', rotatividadeRoutes);
// Rota raiz para teste
app.get('/', (req, res) => {
  res.send('Servidor da Rotatividade de Atendimentos ativo! ✅');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
})