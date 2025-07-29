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

// Obter última rotatividade salva
async function obterUltimaRotatividade() {
  await acessarPlanilha();
  const aba = doc.sheetsByTitle['Rotatividade'];
  if (!aba) return null;

  await aba.loadHeaderRow();
  const linhas = await aba.getRows();
  if (linhas.length === 0) return null;

  // Agrupar por mês e ano e pegar o mais recente
  const agrupado = {};
  for (const linha of linhas) {
    const chave = `${linha['Ano']}-${linha['Mês']}`;
    if (!agrupado[chave]) agrupado[chave] = [];
    agrupado[chave].push(linha);
  }

  const chavesOrdenadas = Object.keys(agrupado).sort().reverse();
  const maisRecente = agrupado[chavesOrdenadas[0]];

  // Agrupar por semana
  const quadros = [];
  const atendentesSet = new Set();
  const solicitantesSet = new Set();

  for (let i = 0; i < 5; i++) {
    const semana = `Semana ${i + 1}`;
    const dadosSemana = maisRecente.filter(l => l['Semana'] === semana);
    if (dadosSemana.length > 0) {
      const semanaData = dadosSemana.map(l => {
        atendentesSet.add(l['Atendente']);
        solicitantesSet.add(l['Solicitante']);
        return {
          solicitante: l['Solicitante'],
          atendente: l['Atendente']
        };
      });
      quadros.push(semanaData);
    }
  }

  const ref = maisRecente[0];
  return {
    quadros,
    mes: ref['Mês'],
    ano: ref['Ano'],
    atendentes: Array.from(atendentesSet),
    solicitantes: Array.from(solicitantesSet)
  };
}


// Gera uma nova ordem rotacionada de atendentes
async function obterOrdemRotacionadaDeAtendentes() {
  await acessarPlanilha();
  const aba = doc.sheetsByTitle['Atendentes'];
  if (!aba) return ['Samara', 'Thayná', 'Mateus']; // ordem inicial

  await aba.loadHeaderRow();
  const linhas = await aba.getRows();
  const nomes = linhas.map(row => row.Nome?.trim()).filter(Boolean);

  if (nomes.length === 0) return ['Samara', 'Thayná', 'Mateus']; // fallback

  // Rotaciona a ordem: [A, B, C] → [B, C, A]
  const novaOrdem = nomes.slice(1).concat(nomes[0]);
  return novaOrdem;
}


module.exports = {
  validarSenha,
  salvarLista,
  salvarRotatividade,
  obterUltimaRotatividade,
  obterOrdemRotacionadaDeAtendentes // 👈 nova exportação
};

