const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = JSON.parse(
  Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf8')
);
const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

// Abre e autentica no Sheets
async function acessarPlanilha() {
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
}

// Remove acentos e espaçamentos extras
function normalizarNome(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Lê todos os nomes de uma aba
async function obterLista(nomeAba) {
  await acessarPlanilha();
  const aba = doc.sheetsByTitle[nomeAba];
  if (!aba) return [];
  const rows = await aba.getRows();
  return rows.map(r => normalizarNome(r.Nome)).filter(Boolean);
}

// Valida senha na aba "Senha"
async function validarSenha(senha) {
  if (!senha) return false;
  await acessarPlanilha();
  const aba = doc.sheetsByTitle['Senha'];
  if (!aba) return false;
  const rows = await aba.getRows();
  return rows.some(r => r.Senha?.trim() === senha.trim());
}

// Sobrescreve lista (Atendentes/Solicitantes)
async function salvarLista(nomeAba, dados) {
  await acessarPlanilha();
  let aba = doc.sheetsByTitle[nomeAba];
  if (!aba) {
    aba = await doc.addSheet({ title: nomeAba, headerValues: ['Nome'] });
  } else {
    const existentes = await aba.getRows();
    for (const r of existentes) await r.delete();
  }
  const unicos = [...new Set(dados.map(normalizarNome).filter(Boolean))];
  await aba.addRows(unicos.map(n => ({ Nome: n })));
}

// Grava todos os registros de rotatividade na aba “Rotatividade”
async function salvarRotatividade({ quadros, mes, ano, responsavel }) {
  await acessarPlanilha();
  let aba = doc.sheetsByTitle['Rotatividade'];
  if (!aba) {
    aba = await doc.addSheet({
      title: 'Rotatividade',
      headerValues: [
        'Semana', 'Solicitante', 'Atendente',
        'Mês', 'Ano', 'Gerado Em', 'Responsável'
      ]
    });
  }
  const geradoEm = new Date().toLocaleString('pt-BR');
  const linhas = [];
  quadros.forEach((sem, i) => {
    sem.forEach(({ solicitante, atendente }) => {
      linhas.push({
        Semana: `Semana ${i+1}`,
        Solicitante: solicitante,
        Atendente: atendente,
        'Mês': mes,
        'Ano': ano,
        'Gerado Em': geradoEm,
        'Responsável': responsavel
      });
    });
  });
  const existentes = await aba.getRows();
  for (const r of existentes) await r.delete();
  await aba.addRows(linhas);
}

// Retorna o último conjunto salvo, incluindo listas
async function obterUltimaRotatividade() {
  await acessarPlanilha();
  const atendentes = await obterLista('Atendentes');
  const solicitantes = await obterLista('Solicitantes');
  const aba = doc.sheetsByTitle['Rotatividade'];
  if (!aba) return { quadros: [], mes: null, ano: null, atendentes, solicitantes };
  const rows = await aba.getRows();
  if (!rows.length) return { quadros: [], mes: null, ano: null, atendentes, solicitantes };

  // Agrupa por mês-ano e pega o mais recente
  const agrupado = rows.reduce((acc, r) => {
    const chave = `${r.Ano}-${r.Mês}`;
    acc[chave] = acc[chave] || [];
    acc[chave].push(r);
    return acc;
  }, {});
  const ultima = agrupado[Object.keys(agrupado).sort().pop()];
  const quadros = [];
  // Reconstrói até 5 semanas
  for (let i = 1; i <= 5; i++) {
    const sem = ultima.filter(r => r.Semana === `Semana ${i}`);
    if (sem.length) {
      quadros.push(sem.map(r => ({
        solicitante: r.Solicitante,
        atendente: r.Atendente
      })));
    }
  }
  return {
    quadros,
    mes: ultima[0].Mês,
    ano: ultima[0].Ano,
    atendentes,
    solicitantes
  };
}

// Roda rotação cíclica usando um índice persistido em "Senha"
async function obterOrdemRotacionadaDeAtendentes() {
  await acessarPlanilha();
  const aba = doc.sheetsByTitle['Atendentes'];
  const nomes = (await aba.getRows())
    .map(r => normalizarNome(r.Nome))
    .filter(Boolean);
  // lê índice atual (segunda linha da aba Senha)
  const senhaAba = doc.sheetsByTitle['Senha'];
  const idxRow = (await senhaAba.getRows())[1];
  let idx = idxRow ? parseInt(idxRow.Senha, 10) : 0;
  idx = isNaN(idx) ? 0 : idx;
  // monta nova ordem e atualiza índice
  const novaOrdem = nomes.slice(idx).concat(nomes.slice(0, idx));
  const proximo = (idx + 1) % nomes.length;
  if (idxRow) {
    idxRow.Senha = proximo;
    await idxRow.save();
  } else {
    await senhaAba.addRow({ Senha: proximo });
  }
  return novaOrdem;
}

module.exports = {
  obterLista,
  validarSenha,
  salvarLista,
  salvarRotatividade,
  obterUltimaRotatividade,
  obterOrdemRotacionadaDeAtendentes
};
