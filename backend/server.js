require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleSpreadsheet } = require('google-spreadsheet');

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 Carrega credenciais do .env
const creds = JSON.parse(
  Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf8')
);

// 📄 Inicializa planilha
const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

async function acessarPlanilha() {
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
}

// 🔐 Validação de senha
app.post('/validar-senha', async (req, res) => {
  try {
    const senhaDigitada = (req.body.senha || '').trim();

    if (!senhaDigitada) {
      return res.status(400).json({ ok: false, erro: 'Senha não fornecida.' });
    }

    await acessarPlanilha();
    const abaSenha = doc.sheetsByTitle['Senha'];

    if (!abaSenha) {
      return res.status(500).json({ ok: false, erro: 'Aba Senha não encontrada.' });
    }

    await abaSenha.loadHeaderRow();
    const linhas = await abaSenha.getRows();
    const senhas = linhas.map(row => row.Senha?.toString().trim());

    const senhaValida = senhas.includes(senhaDigitada);

    res.json({ ok: senhaValida });
  } catch (err) {
    console.error('Erro na validação de senha:', err);
    res.status(500).json({ ok: false, erro: 'Erro interno.' });
  }
});

// ✅ Teste de status
app.get('/', (req, res) => res.send('API Online'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
