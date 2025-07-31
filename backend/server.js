require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const rotas   = require('./routes/rotatividade');

const app = express();
const PORT = process.env.PORT || 3000;

// 1) Liberar CORS para qualquer origem (em prod limite ao seu front)
app.use(cors());
app.use(express.json());

// 2) API de rotatividade
app.use('/api/rotatividade', rotas);

// 3) Servir as animações Lottie do backend
app.use(
  '/animacoes',
  express.static(path.join(__dirname, 'animacoes'))
);

// 4) Servir o frontend (pasta ../frontend/)
const frontPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontPath));

// 5) SPA fallback: qualquer GET não-API nem /animacoes envia index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(frontPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
