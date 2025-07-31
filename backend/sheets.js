const { GoogleSpreadsheet } = require('google-spreadsheet');

const creds = JSON.parse(
  Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf8')
);
const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

// 🔐 Acesso e carregamento da planilha
async function acessarPlanilha() {
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
}

// 🔠 Limpeza e padronização de nomes
function normalizarNome(nome) {
  return nome
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 📋 Obtém lista da aba (Atendentes ou Solicitantes)
async function obterLista(nomeAba) {
  await acessarPlanilha();
  const aba = doc.sheetsByTitle[nomeAba];
  if (!aba) return [];
  const linhas = await aba.getRows();
  return linhas.map(r => normalizarNome(r['Nome'])).filter(Boolean);
}

// 🔐 Verifica se a senha está presente na aba 'Senha'
async function validarSenha(senhaDigitada) {
  if (!senhaDigitada) return false;
  await acessarPlanilha();
  const aba = doc.sheetsByTitle['Senha'];
  if (!aba) return false;
  const linhas = await aba.getRows();
  return linhas
    .map(r => r.Senha?.toString().trim())
    .includes(senhaDigitada.trim());
}

// 💾 Salva lista sobrescrevendo (deduplicada)
async function salvarLista(nomeAba, dados) {
  await acessarPlanilha();
  let aba = doc.sheetsByTitle[nomeAba];

  if (!aba) {
    aba = await doc.addSheet({ title: nomeAba, headerValues: ['Nome'] });
  } else {
    const existentes = await aba.getRows();
    for (const l of existentes) await l.delete();
  }

  const nomesUnicos = [...new Set(dados.map(normalizarNome).filter(Boolean))];
  await aba.addRows(nomesUnicos.map(nome => ({ Nome: nome })));
}

// 📍 Salva índice rotativo
async function salvarUltimoIndiceRotativo(indice) {
  await acessarPlanilha();
  const aba = doc.sheetsByTitle['Senha'];
  if (!aba) return;

  const linhas = await aba.getRows();
  if (linhas.length > 1) {
    linhas[1].Senha = indice.toString();
    await linhas[1].save();
  } else {
    await aba.addRow({ Senha: indice.toString() });
  }
}

// 📍 Recupera índice rotativo
async function obterUltimoIndiceRotativo() {
  await acessarPlanilha();
  const aba = doc.sheetsByTitle['Senha'];
  if (!aba) return 0;
  const linhas = await aba.getRows();
  const valor = linhas[1]?.Senha;
  return isNaN(valor) ? 0 : parseInt(valor, 10);
}

// 🧾 Salvar quadros na aba “Rotatividade”
async function salvarRotatividade({ quadros, mes, ano, responsavel }) {
  await acessarPlanilha();
  let aba = doc.sheetsByTitle['Rotatividade'];

  if (!aba) {
    aba = await doc.addSheet({
      title: 'Rotatividade',
      headerValues: [
        'Semana',
        'Solicitante',
        'Atendente',
        'Mês',
        'Ano',
        'Gerado Em',
        'Responsável'
      ]
    });
  }

  const geradoEm = new Date().toLocaleString('pt-BR');
  const linhas = [];

  quadros.forEach((sem, i) => {
    sem.forEach(({ solicitante, atendente }) => {
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

  const existentes = await aba.getRows();
  for (const l of existentes) await l.delete();
  await aba.addRows(linhas);
}

// 📤 Obter última rotatividade + listas
async function obterUltimaRotatividade() {
  await acessarPlanilha();
  const atendentes = await obterLista('Atendentes');
  const solicitantes = await obterLista('Solicitantes');

  const abaRot = doc.sheetsByTitle['Rotatividade'];
  if (!abaRot) return { quadros: [], mes: null, ano: null, atendentes, solicitantes };

  const rows = await abaRot.getRows();
  if (!rows.length) return { quadros: [], mes: null, ano: null, atendentes, solicitantes };

  const agrupado = {};
  rows.forEach(r => {
    const chave = `${r['Ano']}-${r['Mês']}`;
    if (!agrupado[chave]) agrupado[chave] = [];
    agrupado[chave].push(r);
  });

  const ultimaChave = Object.keys(agrupado).sort().pop();
  const dados = agrupado[ultimaChave];
  const quadros = [];

  for (let i = 0; i < 5; i++) {
    const semana = `Semana ${i + 1}`;
    const daSemana = dados.filter(r => r['Semana'] === semana);
    if (daSemana.length) {
      quadros.push(
        daSemana.map(r => ({
          solicitante: r['Solicitante'],
          atendente: r['Atendente']
        }))
      );
    }
  }

  const ref = dados[0];
  return {
    quadros,
    mes: ref['Mês'],
    ano: ref['Ano'],
    atendentes,
    solicitantes
  };
}

// 🔁 Rotação baseada em índice persistente
async function obterOrdemRotacionadaDeAtendentes() {
  await acessarPlanilha();
  const aba = doc.sheetsByTitle['Atendentes'];
  if (!aba) return [];

  const nomes = (await aba.getRows())
    .map(r => normalizarNome(r.Nome))
    .filter(Boolean);

  if (!nomes.length) return [];

  const atual = await obterUltimoIndiceRotativo();
  const novaOrdem = nomes.slice(atual).concat(nomes.slice(0, atual));
  const proximo = (atual + 1) % nomes.length;
  await salvarUltimoIndiceRotativo(proximo);

  return novaOrdem;
}

// 📦 Export
module.exports = {
  obterLista,
  validarSenha,
  salvarLista,
  salvarUltimoIndiceRotativo,
  obterUltimoIndiceRotativo,
  salvarRotatividade,
  obterUltimaRotatividade,
  obterOrdemRotacionadaDeAtendentes
};
