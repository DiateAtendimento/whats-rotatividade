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

  // Limpa todos os dados antigos da aba antes de salvar a nova rotatividade
  const linhasAntigas = await aba.getRows();
  for (const linha of linhasAntigas) await linha.delete();

  await aba.addRows(linhas);
}

// Obter última rotatividade salva
async function obterUltimaRotatividade() {
  await acessarPlanilha();
  const abaRot = doc.sheetsByTitle['Rotatividade'];
  if (!abaRot) return null;

  await abaRot.loadHeaderRow();
  const linhas = await abaRot.getRows();
  if (linhas.length === 0) return null;

  const agrupado = {};
  for (const linha of linhas) {
    const chave = `${linha['Ano']}-${linha['Mês']}`;
    if (!agrupado[chave]) agrupado[chave] = [];
    agrupado[chave].push(linha);
  }

  const chavesOrdenadas = Object.keys(agrupado).sort().reverse();
  const maisRecente = agrupado[chavesOrdenadas[0]];

  const quadros = [];
  for (let i = 0; i < 5; i++) {
    const semana = `Semana ${i + 1}`;
    const dadosSemana = maisRecente.filter(l => l['Semana'] === semana);
    if (dadosSemana.length > 0) {
      quadros.push(
        dadosSemana.map(l => ({
          solicitante: l['Solicitante'],
          atendente: l['Atendente']
        }))
      );
    }
  }

  const ref = maisRecente[0];

  const abaAtendentes = doc.sheetsByTitle['Atendentes'];
  const abaSolicitantes = doc.sheetsByTitle['Solicitantes'];
  await abaAtendentes?.loadHeaderRow();
  await abaSolicitantes?.loadHeaderRow();

  const atendentesRows = await abaAtendentes?.getRows() || [];
  const solicitantesRows = await abaSolicitantes?.getRows() || [];

  const atendentes = atendentesRows.map(r => r['Nome']?.trim()).filter(Boolean);
  const solicitantes = solicitantesRows.map(r => r['Nome']?.trim()).filter(Boolean);

  return {
    quadros,
    mes: ref['Mês'],
    ano: ref['Ano'],
    atendentes,
    solicitantes
  };
}

// Gera uma nova ordem rotacionada de atendentes
async function obterOrdemRotacionadaDeAtendentes() {
  await acessarPlanilha();
  const aba = doc.sheetsByTitle['Atendentes'];
  if (!aba) return ['Samara', 'Thayná', 'Mateus'];

  await aba.loadHeaderRow();
  const linhas = await aba.getRows();
  const nomes = linhas.map(row => row.Nome?.trim()).filter(Boolean);

  if (nomes.length === 0) return ['Samara', 'Thayná', 'Mateus'];

  const novaOrdem = nomes.slice(1).concat(nomes[0]);
  return novaOrdem;
}

module.exports = {
  validarSenha,
  salvarLista,
  salvarRotatividade,
  obterUltimaRotatividade,
  obterOrdemRotacionadaDeAtendentes
};
