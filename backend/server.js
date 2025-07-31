require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rotas = require('./routes/rotatividade');

const app = express();
const PORT = process.env.PORT || 3000;

// Para desenvolvimento, libera CORS de qualquer origem
app.use(cors());
app.use(express.json());

// 1) Servir frontend estático (index.html, script.js, style.css)
app.use(express.static(path.join(__dirname, 'frontend')));

// 2) Rotas da API
app.use('/api/rotatividade', rotas);

// 3) Fallback para SPA: devolve index.html em todas as outras rotas GET
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () =>
  console.log(`Servidor rodando na porta ${PORT}`)
);
