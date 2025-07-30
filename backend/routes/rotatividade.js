// routes/rotatividade.js

const express = require('express');
const router = express.Router();
const {
  validarSenha,
  salvarLista,
  salvarRotatividade,
  obterUltimaRotatividade,
  obterOrdemRotacionadaDeAtendentes,
  obterLista
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

// Rota para gerar quadros (sem salvar listas)
router.post('/gerar-tabelas', async (req, res) => {
  try {
    res.json({ ok: true });
  } catch (erro) {
    console.error('Erro ao gerar quadros:', erro);
    res.status(500).json({ ok: false, erro: 'Erro interno ao gerar quadros.' });
  }
});

// Rota para salvar rotatividade
router.post('/salvar', async (req, res) => {
  const { quadros, mes, ano, responsavel } = req.body;
  try {
    await salvarRotatividade({ quadros, mes, ano, responsavel });
    res.json({ ok: true });
  } catch (erro) {
    console.error('Erro ao salvar rotatividade:', erro);
    res.status(500).json({ ok: false, erro: 'Erro ao salvar quadros na aba Rotatividade.' });
  }
});

// Rota para obter a última rotatividade salva
router.get('/ultima-rotatividade', async (req, res) => {
  try {
    const dados = await obterUltimaRotatividade();
    res.json({ ok: true, dados });
  } catch (erro) {
    console.error('Erro ao obter última rotatividade:', erro);
    res.status(500).json({ ok: false, erro: 'Erro interno ao obter dados.' });
  }
});

// Rota para obter nova ordem rotacionada de atendentes
router.get('/nova-ordem', async (req, res) => {
  try {
    const atendentes = await obterOrdemRotacionadaDeAtendentes();
    res.json({ ok: true, atendentes });
  } catch (erro) {
    console.error('Erro ao obter nova ordem de atendentes:', erro);
    res.status(500).json({ ok: false, erro: 'Erro ao gerar nova ordem.' });
  }
});

// Rota para obter Atendentes e Solicitantes
router.get('/listas', async (req, res) => {
  try {
    const atendentes   = await obterLista('Atendentes');
    const solicitantes = await obterLista('Solicitantes');
    res.json({ ok: true, atendentes, solicitantes });
  } catch (erro) {
    console.error('Erro ao obter listas:', erro);
    res.status(500).json({ ok: false, erro: 'Erro interno ao obter listas.' });
  }
});

// **Nova rota** para **salvar** as listas no Sheets
router.post('/listas', async (req, res) => {
  const { atendentes, solicitantes } = req.body;
  try {
    await salvarLista('Atendentes',   atendentes);
    await salvarLista('Solicitantes', solicitantes);
    res.json({ ok: true });
  } catch (erro) {
    console.error('Erro ao salvar listas:', erro);
    res.status(500).json({ ok: false, erro: 'Não foi possível salvar as listas.' });
  }
});

module.exports = router;
