// routes/rotatividade.js
const express = require('express');
const router = express.Router();
const {
  validarSenha,
  salvarLista,
  salvarRotatividade
} = require('../sheets'); // importa diretamente do sheets.js

// Rota para validar a senha
router.post('/validar-senha', async (req, res) => {
  const { senha } = req.body;
  try {
    const ok = await validarSenha(senha);
    res.json({ ok });
  } catch (erro) {
    console.error('Erro ao validar senha:', erro);
    res.status(500).json({ ok: false, erro: 'Erro interno ao validar senha.' });
  }
});

// Rota para salvar dados da rotatividade
router.post('/gerar-tabelas', async (req, res) => {
  const { atendentes, solicitantes, quadros, mes, ano, responsavel } = req.body;
  try {
    // Salva lista de nomes (opcional)
    await salvarLista('Atendentes', atendentes);
    await salvarLista('Solicitantes', solicitantes);

    // Salva rotatividade
    await salvarRotatividade({ quadros, mes, ano, responsavel });

    res.json({ ok: true });
  } catch (erro) {
    console.error('Erro ao salvar dados da rotatividade:', erro);
    res.status(500).json({ ok: false, erro: 'Erro interno ao salvar dados.' });
  }
});

module.exports = router;
