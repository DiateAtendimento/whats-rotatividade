const { GoogleSpreadsheet } = require('google-spreadsheet');

const creds = JSON.parse(
  Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf8')
);
const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

async function acessarPlanilha() {
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
}

// 📋 Obtém qualquer aba de “Nome”
async function obterLista(nomeAba) {
  await acessarPlanilha();
  const aba = doc.sheetsByTitle[nomeAba];
  if (!aba) return [];
  await aba.loadHeaderRow();
  const linhas = await aba.getRows();
  return linhas.map(r => r['Nome']?.trim()).filter(Boolean);
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

// 📍 Salva índice da última rotação de atendente
async function salvarUltimoIndiceRotativo(indice) {
  await acessarPlanilha();
  const abaSenha = doc.sheetsByTitle['Senha'];
  if (!abaSenha) return;

  const linhas = await abaSenha.getRows();
  if (linhas.length > 1) {
    linhas[1]['Senha'] = indice.toString();
    await linhas[1].save();
  } else {
    await abaSenha.addRow({ Senha: indice.toString() });
  }
}

// 🔁 Recupera índice salvo da última rotação
async function obterUltimoIndiceRotativo() {
  await acessarPlanilha();
  const abaSenha = doc.sheetsByTitle['Senha'];
  if (!abaSenha) return 0;

  const linhas = await abaSenha.getRows();
  const valor = linhas[1]?.Senha;
  return isNaN(valor) ? 0 : parseInt(valor);
}

// 💾 Salvar lista de nomes em aba
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

// 🧾 Salvar quadros semanais na aba Rotatividade
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

  const linhasAntigas = await aba.getRows();
  for (const linha of linhasAntigas) await linha.delete();

  await aba.addRows(linhas);
}

// 🔄 Última rotatividade *sempre* retorna quadros (ou []) e as duas listas
async function obterUltimaRotatividade() {
  await acessarPlanilha();
  // pegar listas
  const atendentes   = await obterLista('Atendentes');
  const solicitantes = await obterLista('Solicitantes');

  const abaRot = doc.sheetsByTitle['Rotatividade'];
  if (!abaRot) {
    return { quadros: [], mes: null, ano: null, atendentes, solicitantes };
  }

  await abaRot.loadHeaderRow();
  const todasLinhas = await abaRot.getRows();
  if (todasLinhas.length === 0) {
    return { quadros: [], mes: null, ano: null, atendentes, solicitantes };
  }

  // agrupar por mês/ano e construir quadros
  const agrupado = {};
  todasLinhas.forEach(l => {
    const chave = `${l['Ano']}-${l['Mês']}`;
    agrupado[chave] = agrupado[chave] || [];
    agrupado[chave].push(l);
  });
  const chavesOrdenadas = Object.keys(agrupado).sort().reverse();
  const maisRecente = agrupado[chavesOrdenadas[0]];
  const quadros = [];
  for (let i = 0; i < 5; i++) {
    const semana = `Semana ${i+1}`;
    const dadosSemana = maisRecente.filter(l => l['Semana'] === semana);
    if (dadosSemana.length)
      quadros.push(dadosSemana.map(l => ({
        solicitante: l['Solicitante'],
        atendente:   l['Atendente']
      })));
  }
  const ref = maisRecente[0];
  return {
    quadros,
    mes:         ref['Mês'],
    ano:         ref['Ano'],
    atendentes,
    solicitantes
  };
}

module.exports = {
  validarSenha,
  salvarLista,
  salvarRotatividade,
  obterUltimaRotatividade,
  obterOrdemRotacionadaDeAtendentes,
  obterLista              // ← exporte
};

// 🔄 Nova ordem com rotação persistente
async function obterOrdemRotacionadaDeAtendentes() {
  await acessarPlanilha();
  const aba = doc.sheetsByTitle['Atendentes'];
  if (!aba) return [];

  await aba.loadHeaderRow();
  const linhas = await aba.getRows();
  const nomes = linhas.map(row => row.Nome?.trim()).filter(Boolean);

  if (nomes.length === 0) return [];

  const atual = await obterUltimoIndiceRotativo();
  const novaOrdem = nomes.slice(atual).concat(nomes.slice(0, atual));
  const proximoIndice = (atual + 1) % nomes.length;
  await salvarUltimoIndiceRotativo(proximoIndice);

  return novaOrdem;
}

module.exports = {
  validarSenha,
  salvarLista,
  salvarRotatividade,
  obterUltimaRotatividade,
  obterOrdemRotacionadaDeAtendentes
};
