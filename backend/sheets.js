const { GoogleSpreadsheet } = require('google-spreadsheet');

const creds = JSON.parse(
  Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf8')
);
const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

async function acessarPlanilha() {
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
}

// 🔐 Validação da senha
async function validarSenha(senhaDigitada) {
  if (!senhaDigitada) return false;

  await acessarPlanilha();
  const abaSenha = doc.sheetsByTitle['Senha'];
  if (!abaSenha) return false;

  await abaSenha.loadHeaderRow();
  const linhas = await abaSenha.getRows();
  const senhas = linhas.map(row => row.Senha?.toString().trim());
  return senhas.includes(senhaDigitada.trim());
}

// Salvar lista de nomes em aba específica
async function salvarLista(nomeAba, dados) {
  await acessarPlanilha();
  let aba = doc.sheetsByTitle[nomeAba];

  if (!aba) {
    aba = await doc.addSheet({ title: nomeAba, headerValues: ['Nome'] });
  } else {
    // Se já existir, apenas apague as linhas mantendo o cabeçalho
    const linhas = await aba.getRows();
    for (const linha of linhas) await linha.delete();
  }

  const linhas = dados.map(nome => ({ Nome: nome }));
  await aba.addRows(linhas);
}


// Salvar quadros semanais gerados
async function salvarRotatividade({ quadros, mes, ano, responsavel }) {
  await acessarPlanilha();
  let aba = doc.sheetsByTitle['Rotatividade'];
  if (!aba) {
    aba = await doc.addSheet({
      title: 'Rotatividade',
      headerValues: ['Semana', 'Solicitante', 'Atendente', 'Mês', 'Ano', 'Gerado Em', 'Responsável']
    });
  }

  const geradoEm = new Date().toLocaleString('pt-BR');
  const linhas = [];

  quadros.forEach((semanaObj, i) => {
    semanaObj.forEach(({ solicitante, atendente }) => {
      linhas.push({
        Semana: `Semana ${i + 1}`,
        Solicitante: solicitante,
        Atendente: atendente,
        'Mês': mes,
        'Ano': ano,
        'Gerado Em': geradoEm,
        'Responsável': responsavel
      });
    });
  });

  await aba.addRows(linhas);
}

module.exports = {
  validarSenha,
  salvarLista,
  salvarRotatividade
};
