// routes/rotatividade.js

const express = require('express');
const router = express.Router();
const {
  validarSenha,
  salvarLista,
  salvarRotatividade,
  obterUltimaRotatividade,
  obterOrdemRotacionadaDeAtendentes // ✅ Nova função adicionada
} = require('../sheets');

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
    // Salva lista de nomes
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

// Rota para obter a última rotatividade salva
router.get('/ultima-rotatividade', async (req, res) => {
  try {
    const dados = await obterUltimaRotatividade();
    if (dados) {
      res.json({ ok: true, dados });
    } else {
      res.json({ ok: false, erro: 'Nenhuma rotatividade encontrada.' });
    }
  } catch (erro) {
    console.error('Erro ao obter última rotatividade:', erro);
    res.status(500).json({ ok: false, erro: 'Erro interno ao obter dados.' });
  }
});

// ✅ Rota para obter nova ordem rotacionada de atendentes
router.get('/nova-ordem', async (req, res) => {
  try {
    const novaOrdem = await obterOrdemRotacionadaDeAtendentes();
    res.json({ ok: true, atendentes: novaOrdem });
  } catch (erro) {
    console.error('Erro ao obter nova ordem de atendentes:', erro);
    res.status(500).json({ ok: false, erro: 'Erro ao gerar nova ordem.' });
  }
});

module.exports = router;
