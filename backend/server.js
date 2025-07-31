require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const rotas   = require('./routes/rotatividade');

const app = express();
const PORT = process.env.PORT || 3000;

// Liberar CORS para qualquer origem (em produção restrinja ao seu frontend)
app.use(cors());
app.use(express.json());

// Defina o caminho para a pasta frontend (que deve estar no nível acima de backend/)
const frontPath = path.join(__dirname, '..', 'frontend');

// Serve arquivos estáticos do frontend (index.html, script.js, style.css, etc.)
app.use(express.static(frontPath));

// Rotas da API de rotatividade
app.use('/api/rotatividade', rotas);

// Em qualquer outra rota GET, retorna o index.html (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
