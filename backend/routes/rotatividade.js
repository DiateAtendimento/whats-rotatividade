const express = require('express');
const router = express.Router();
const {
  validarSenha,
  salvarLista,
  obterLista,
  obterOrdemRotacionadaDeAtendentes,
  salvarRotatividade,
  obterUltimaRotatividade
} = require('../sheets');

// POST /validar-senha
router.post('/validar-senha', async (req, res) => {
  try {
    const ok = await validarSenha(req.body.senha);
    res.json({ ok });
  } catch (e) {
    console.error('Erro validar-senha:', e);
    res.status(500).json({ ok: false, erro: 'Erro interno ao validar senha.' });
  }
});

// GET /listas
router.get('/listas', async (req, res) => {
  try {
    const atendentes = await obterLista('Atendentes');
    const solicitantes = await obterLista('Solicitantes');
    res.json({ ok: true, atendentes, solicitantes });
  } catch (e) {
    console.error('Erro /listas:', e);
    res.status(500).json({ ok: false, erro: e.message });
  }
});

// POST /listas (salvar)
router.post('/listas', async (req, res) => {
  try {
    await salvarLista('Atendentes', req.body.atendentes);
    await salvarLista('Solicitantes', req.body.solicitantes);
    res.json({ ok: true });
  } catch (e) {
    console.error('Erro salvar listas:', e);
    res.status(500).json({ ok: false, erro: 'Não foi possível salvar as listas.' });
  }
});

// GET /nova-ordem
router.get('/nova-ordem', async (req, res) => {
  try {
    const atendentes = await obterOrdemRotacionadaDeAtendentes();
    res.json({ ok: true, atendentes });
  } catch (e) {
    console.error('Erro nova-ordem:', e);
    res.status(500).json({ ok: false, erro: 'Erro ao gerar nova ordem.' });
  }
});

// POST /salvar (rotatividade)
router.post('/salvar', async (req, res) => {
  try {
    const { quadros, mes, ano, responsavel } = req.body;
    await salvarRotatividade({ quadros, mes, ano, responsavel });
    res.json({ ok: true });
  } catch (e) {
    console.error('Erro salvar rotatividade:', e);
    res.status(500).json({ ok: false, erro: 'Erro ao salvar rotatividade.' });
  }
});

// GET /ultima-rotatividade
router.get('/ultima-rotatividade', async (req, res) => {
  try {
    const dados = await obterUltimaRotatividade();
    res.json({ ok: true, dados });
  } catch (e) {
    console.error('Erro ultima-rotatividade:', e);
    res.status(500).json({ ok: false, erro: 'Erro interno ao obter última rotatividade.' });
  }
});

module.exports = router;
