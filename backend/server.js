require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rotas = require('./routes/rotatividade');

const app = express();
const PORT = process.env.PORT || 3000;

// Para desenvolvimento: libera CORS de qualquer origem
app.use(cors());
app.use(express.json());

// Servindo o frontend que está um nível acima de `backend/`
const frontPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontPath));

// Rotas da API de rotatividade
app.use('/api/rotatividade', rotas);

// Qualquer outra rota GET retorna o index.html do frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(frontPath, 'index.html'));
});

app.listen(PORT, () =>
  console.log(`Servidor rodando na porta ${PORT}`)
);
