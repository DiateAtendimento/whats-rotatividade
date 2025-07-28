require('dotenv').config();
const express = require('express');
const cors = require('cors');

const rotatividadeRoutes = require('./routes/rotatividade');

const app = express();
const PORT = process.env.PORT || 3000;

// ATENÇÃO: use JSON primeiro, depois CORS
app.use(express.json());

const corsOptions = {
  origin: 'https://whatsaprotatividade.netlify.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // permite preflight requests

// Rotas
app.use('/api/rotatividade', rotatividadeRoutes);

// Teste
app.get('/', (req, res) => {
  res.send('Servidor da Rotatividade de Atendimentos ativo! ✅');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
