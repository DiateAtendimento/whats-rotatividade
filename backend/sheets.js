// sheets.js

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
  const aba = doc.sheetsByTitle['Senha'];
  if (!aba) return false;
  await aba.loadHeaderRow();
  const linhas = await aba.getRows();
  return linhas
    .map(r => r.Senha?.toString().trim())
    .includes(senhaDigitada.trim());
}

// 📍 Salva índice da última rotação de atendente
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

// 🔁 Recupera índice salvo da última rotação
async function obterUltimoIndiceRotativo() {
  await acessarPlanilha();
  const aba = doc.sheetsByTitle['Senha'];
  if (!aba) return 0;
  const linhas = await aba.getRows();
  const valor = linhas[1]?.Senha;
  return isNaN(valor) ? 0 : parseInt(valor, 10);
}

// 💾 Salvar lista de nomes em aba
async function salvarLista(nomeAba, dados) {
  await acessarPlanilha();
  let aba = doc.sheetsByTitle[nomeAba];
  if (!aba) {
    aba = await doc.addSheet({ title: nomeAba, headerValues: ['Nome'] });
  } else {
    const linhas = await aba.getRows();
    for (const l of linhas) await l.delete();
  }
  await aba.addRows(dados.map(nome => ({ Nome: nome })));
}

// 🧾 Salvar quadros semanais na aba “Rotatividade”
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

  const antigas = await aba.getRows();
  for (const l of antigas) await l.delete();
  await aba.addRows(linhas);
}

// 🔄 Última rotatividade *sempre* retorna quadros (ou []) e as duas listas
async function obterUltimaRotatividade() {
  await acessarPlanilha();
  const atendentes = await obterLista('Atendentes');
  const solicitantes = await obterLista('Solicitantes');
  const abaRot = doc.sheetsByTitle['Rotatividade'];
  if (!abaRot) {
    return { quadros: [], mes: null, ano: null, atendentes, solicitantes };
  }

  await abaRot.loadHeaderRow();
  const rows = await abaRot.getRows();
  if (rows.length === 0) {
    return { quadros: [], mes: null, ano: null, atendentes, solicitantes };
  }

  // agrupar por mês/ano e construir quadros
  const agrupado = {};
  rows.forEach(r => {
    const chave = `${r['Ano']}-${r['Mês']}`;
    agrupado[chave] = agrupado[chave] || [];
    agrupado[chave].push(r);
  });

  const ultimaChave = Object.keys(agrupado).sort().pop();
  const dados = agrupado[ultimaChave];
  const quadros = [];

  for (let i = 0; i < 5; i++) {
    const semana = `Semana ${i + 1}`;
    const fil = dados.filter(r => r['Semana'] === semana);
    if (fil.length) {
      quadros.push(
        fil.map(r => ({
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

// 🔄 Nova ordem com rotação persistente
async function obterOrdemRotacionadaDeAtendentes() {
  await acessarPlanilha();
  const aba = doc.sheetsByTitle['Atendentes'];
  if (!aba) return [];

  await aba.loadHeaderRow();
  const nomes = (await aba.getRows())
    .map(r => r.Nome?.trim())
    .filter(Boolean);

  if (!nomes.length) return [];

  const atual = await obterUltimoIndiceRotativo();
  const novaOrdem = nomes.slice(atual).concat(nomes.slice(0, atual));
  const proximo = (atual + 1) % nomes.length;
  await salvarUltimoIndiceRotativo(proximo);

  return novaOrdem;
}

// ——— Export único, completo ———
module.exports = {
  obterLista,
  validarSenha,
  salvarUltimoIndiceRotativo,
  obterUltimoIndiceRotativo,
  salvarLista,
  salvarRotatividade,
  obterUltimaRotatividade,
  obterOrdemRotacionadaDeAtendentes
};
