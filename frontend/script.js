const API_URL = 'https://rotatividade-backend.onrender.com/api/rotatividade';

const senhaModal = new bootstrap.Modal(document.getElementById('senhaModal'));
const senhaInput = document.getElementById('senhaInput');
const erroSenha = document.getElementById('erroSenha');

let atendentes = ['Samara', 'Thayná', 'Mateus'];
let solicitantes = ['Consultor', 'Contatos Novos', 'RPPS'];

let tipoAtual = '';
let modo = '';
let indexAtual = -1;

const modal = new bootstrap.Modal(document.getElementById('crudModal'));
const nomeInput = document.getElementById('nomeInput');
const salvarBtn = document.getElementById('salvarBtn');

// -------------------- CRUD --------------------

function renderizarAtendentes() {
  const container = document.getElementById('atendentesContainer');
  container.innerHTML = '';
  atendentes.forEach((nome, i) => {
    container.innerHTML += gerarItemHTML(nome, i, 'atendente');
  });
  container.innerHTML += `<button class="btn btn-outline-primary w-100 mt-3" onclick="abrirModal('atendente', 'novo')">➕ Adicionar Atendente</button>`;
  renderizarTabelaCruzada();
}

function renderizarSolicitantes() {
  const container = document.getElementById('solicitantesContainer');
  container.innerHTML = '';
  solicitantes.forEach((nome, i) => {
    container.innerHTML += gerarItemHTML(nome, i, 'solicitante');
  });
  container.innerHTML += `<button class="btn btn-outline-success w-100 mt-3" onclick="abrirModal('solicitante', 'novo')">➕ Adicionar Solicitante</button>`;
  renderizarTabelaCruzada();
}

function gerarItemHTML(nome, index, tipo) {
  return `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <span>${nome}</span>
      <div>
        <button class="btn btn-sm btn-warning me-1" onclick="abrirModal('${tipo}', 'editar', ${index})">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="excluirItem(${index}, '${tipo}')">🗑️</button>
      </div>
    </div>
  `;
}

function abrirModal(tipo, acao, index = -1) {
  tipoAtual = tipo;
  modo = acao;
  indexAtual = index;

  nomeInput.value = (modo === 'editar') ? (tipo === 'atendente' ? atendentes[index] : solicitantes[index]) : '';
  document.getElementById('crudModalLabel').textContent =
    `${modo === 'novo' ? 'Adicionar' : 'Editar'} ${tipo === 'atendente' ? 'Atendente' : 'Solicitante'}`;
  salvarBtn.textContent = modo === 'novo' ? 'Adicionar' : 'Salvar';

  modal.show();
}

salvarBtn.addEventListener('click', () => {
  const nome = nomeInput.value.trim();
  if (!nome) {
    nomeInput.classList.add('is-invalid');
    return;
  }
  nomeInput.classList.remove('is-invalid');

  const lista = tipoAtual === 'atendente' ? atendentes : solicitantes;

  if (modo === 'novo') {
    lista.push(nome);
  } else {
    lista[indexAtual] = nome;
  }

  modal.hide();
  tipoAtual === 'atendente' ? renderizarAtendentes() : renderizarSolicitantes();
});

function excluirItem(index, tipo) {
  const lista = tipo === 'atendente' ? atendentes : solicitantes;
  if (confirm(`Deseja realmente excluir "${lista[index]}"?`)) {
    lista.splice(index, 1);
    tipo === 'atendente' ? renderizarAtendentes() : renderizarSolicitantes();
  }
}

// -------------------- Tabela Cruzada --------------------

function renderizarTabelaCruzada() {
  const container = document.getElementById('tabelaCruzadaContainer');

  if (atendentes.length === 0 || solicitantes.length === 0) {
    container.innerHTML = `<p class="text-muted">Adicione ao menos um atendente e um solicitante para visualizar a tabela.</p>`;
    return;
  }

  let html = '<div class="table-responsive"><table class="table table-bordered table-striped">';
  html += '<thead><tr><th>Atendente \\ Solicitante</th>';

  solicitantes.forEach(s => {
    html += `<th>${s}</th>`;
  });

  html += '</tr></thead><tbody>';

  atendentes.forEach((a) => {
    html += `<tr><td><strong>${a}</strong></td>`;
    solicitantes.forEach(() => {
      html += `<td class="text-center">-</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  container.innerHTML = html;
}

// -------------------- Inicialização --------------------

renderizarAtendentes();
renderizarSolicitantes();

// Carrega cache
const cache = localStorage.getItem('rotatividade');
if (cache) {
  const { quadros, mes, ano } = JSON.parse(cache);
  const container = document.getElementById('quadrosContainer');
  container.innerHTML = `<h4 class="text-primary">📅 Referente a: ${mes} de ${ano}</h4>`;

  quadros.forEach((semanaData, i) => {
    let html = `<h5 class="mt-4">📆 Semana ${i + 1}</h5>`;
    html += '<div class="table-responsive"><table class="table table-bordered">';
    html += '<thead><tr><th>Solicitante</th><th>Atendente Responsável</th></tr></thead><tbody>';
    semanaData.forEach(({ solicitante, atendente }) => {
      html += `<tr><td>${solicitante}</td><td>${atendente}</td></tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML += html;
  });
}

// --------------------- Geração da Rotatividade ------------------

document.getElementById('gerarRotatividadeBtn').addEventListener('click', () => {
  senhaInput.value = '';
  erroSenha.classList.add('d-none');
  senhaModal.show();
});

function gerarQuadrosSemanais() {
  const container = document.getElementById('quadrosContainer');
  container.innerHTML = '';

  const semanas = contarSemanasDoMesAtual();
  const totalAtendentes = atendentes.length;
  const quadros = [];
  const now = new Date();
  const ano = now.getFullYear();
  const mes = now.toLocaleDateString('pt-BR', { month: 'long' });

  if (solicitantes.length === 0 || atendentes.length === 0) {
    container.innerHTML = `<p class="text-danger">⚠️ É necessário ter pelo menos 1 atendente e 1 solicitante para gerar a rotatividade.</p>`;
    return;
  }

  container.innerHTML = `<h4 class="text-primary">📅 Referente a: ${mes} de ${ano}</h4>`;

  for (let semana = 0; semana < semanas; semana++) {
    let html = `<h5 class="mt-4">📆 Semana ${semana + 1}</h5>`;
    html += '<div class="table-responsive"><table class="table table-bordered">';
    html += '<thead><tr><th>Solicitante</th><th>Atendente Responsável</th></tr></thead><tbody>';

    const semanaData = [];

    solicitantes.forEach((sol, i) => {
      const atendenteIndex = (i + semana) % totalAtendentes;
      const atendente = atendentes[atendenteIndex];
      html += `<tr><td>${sol}</td><td>${atendente}</td></tr>`;
      semanaData.push({ solicitante: sol, atendente });
    });

    html += '</tbody></table></div>';
    container.innerHTML += html;

    quadros.push(semanaData);
  }

  const dados = {
    atendentes,
    solicitantes,
    quadros,
    mes,
    ano,
    responsavel: 'admin'
  };

  localStorage.setItem('rotatividade', JSON.stringify(dados));

  fetch(`${API_URL}/gerar-tabelas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  })
    .then(res => res.json())
    .then(res => {
      if (res.ok) {
        console.log('✅ Rotatividade salva com sucesso no Google Sheets.');
      } else {
        console.error('❌ Erro ao salvar rotatividade:', res.erro);
      }
    })
    .catch(err => {
      console.error('❌ Falha na requisição ao backend:', err);
    });
}

function contarSemanasDoMesAtual() {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = now.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);

  const diasNoMes = ultimoDia.getDate();
  const primeiraSemana = primeiroDia.getDay();

  return Math.ceil((primeiraSemana + diasNoMes) / 7);
}

// --------------------- Validação da senha ------------------

document.getElementById('confirmarSenhaBtn').addEventListener('click', async () => {
  const senha = senhaInput.value.trim();
  if (!senha) return;

  const resposta = await fetch(`${API_URL}/validar-senha`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha }),
  });

  const resultado = await resposta.json();

  if (resultado.ok) {
    senhaModal.hide();
    gerarQuadrosSemanais();
  } else {
    erroSenha.classList.remove('d-none');
  }
});
