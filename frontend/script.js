console.log('⚡ script.js carregado');

const API_URL = 'https://rotatividade-backend.onrender.com/api/rotatividade';

let atendentes = [];
let solicitantes = [];

let tipoAtual = '';
let modoAtual = '';
let idxAtual = -1;

const modal = new bootstrap.Modal(document.getElementById('crudModal'));
const senhaModal = new bootstrap.Modal(document.getElementById('senhaModal'));

const nomeInput = document.getElementById('nomeInput');
const salvarBtn = document.getElementById('salvarBtn');
const feedbackNome = document.getElementById('feedbackNome');
const senhaInput = document.getElementById('senhaInput');
const erroSenha = document.getElementById('erroSenha');
const toastSucesso = new bootstrap.Toast(document.getElementById('toastSucesso'));
const quadrosEl = document.getElementById('quadrosContainer');

// Atalho Enter no modal de senha
senhaInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') document.getElementById('confirmarSenhaBtn').click();
});

document.addEventListener('DOMContentLoaded', carregarDadosIniciais);

async function carregarDadosIniciais() {
  mostrarAnimacao('list-loaded.json');
  try {
    const listasRes = await fetch(`${API_URL}/listas`);
    const listasJson = await listasRes.json();

    if (listasJson.ok) {
      atendentes = [...new Set(listasJson.atendentes)];
      solicitantes = [...new Set(listasJson.solicitantes)];
      salvarLocal();
      renderizarAtendentes();
      renderizarSolicitantes();
    }

    const rotRes = await fetch(`${API_URL}/ultima-rotatividade`);
    const rotJson = await rotRes.json();

    if (rotJson.ok && rotJson.dados.quadros.length) {
      const { quadros, mes, ano } = rotJson.dados;
      renderizarQuadros(quadros, mes, ano);
    } else {
      quadrosEl.innerHTML = '<p class="text-muted mt-3">Nenhum quadro de rotatividade foi gerado ainda.</p>';
    }
  } catch (err) {
    console.error(err);
    quadrosEl.innerHTML = '<p class="text-danger">Erro ao carregar os dados.</p>';
  }
}

function salvarLocal() {
  localStorage.setItem('atendentes', JSON.stringify(atendentes));
  localStorage.setItem('solicitantes', JSON.stringify(solicitantes));
}

function renderizarAtendentes() {
  const c = document.getElementById('atendentesContainer');
  c.innerHTML = '';
  atendentes.forEach((n, i) => c.innerHTML += gerarItem(n, 'atendente', i));
  c.innerHTML += `<button class="btn btn-outline-primary w-100 mt-3" onclick="abrirModal('atendente','novo')">➕ Adicionar Atendente</button>`;
}

function renderizarSolicitantes() {
  const c = document.getElementById('solicitantesContainer');
  c.innerHTML = '';
  solicitantes.forEach((n, i) => c.innerHTML += gerarItem(n, 'solicitante', i));
  c.innerHTML += `<button class="btn btn-outline-success w-100 mt-3" onclick="abrirModal('solicitante','novo')">➕ Adicionar Solicitante</button>`;
}

function gerarItem(nome, tipo, i) {
  return `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <span>${nome}</span>
      <div>
        <button class="btn btn-sm btn-warning me-1" onclick="abrirModal('${tipo}','editar',${i})">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="excluirItem(${i},'${tipo}')">🗑️</button>
      </div>
    </div>`;
}

function abrirModal(tipo, modo, i = -1) {
  tipoAtual = tipo;
  modoAtual = modo;
  idxAtual = i;

  nomeInput.value = modo === 'editar'
    ? (tipo === 'atendente' ? atendentes[i] : solicitantes[i])
    : '';

  document.getElementById('crudModalLabel').textContent =
    `${modo === 'novo' ? 'Adicionar' : 'Editar'} ${tipo === 'atendente' ? 'Atendente' : 'Solicitante'}`;

  feedbackNome.textContent = '';
  nomeInput.classList.remove('is-invalid');
  salvarBtn.textContent = modo === 'novo' ? 'Adicionar' : 'Salvar';

  modal.show();
}

salvarBtn.addEventListener('click', async () => {
  const nome = nomeInput.value.trim().replace(/\s+/g, ' ');
  if (!nome) {
    nomeInput.classList.add('is-invalid');
    feedbackNome.textContent = 'Por favor, preencha um nome válido.';
    return;
  }

  const lista = tipoAtual === 'atendente' ? atendentes : solicitantes;
  const label = tipoAtual === 'atendente' ? 'atendente' : 'solicitante';

  const duplicado = lista.some((n, idx) => idx !== idxAtual && n.toLowerCase() === nome.toLowerCase());
  if (duplicado) {
    nomeInput.classList.add('is-invalid');
    feedbackNome.textContent = `Esse ${label} já foi adicionado.`;
    return;
  }

  if (modoAtual === 'novo') lista.push(nome);
  else lista[idxAtual] = nome;

  modal.hide();
  salvarLocal();
  await persistirListas();
  renderizarAtendentes();
  renderizarSolicitantes();
  mostrarToast(`✅ ${label.charAt(0).toUpperCase() + label.slice(1)} ${modoAtual === 'novo' ? 'adicionado' : 'atualizado'}!`);
});

async function excluirItem(i, tipo) {
  const lista = tipo === 'atendente' ? atendentes : solicitantes;
  if (!confirm(`Excluir "${lista[i]}"?`)) return;

  lista.splice(i, 1);
  salvarLocal();
  await persistirListas();
  if (tipo === 'atendente') renderizarAtendentes();
  else renderizarSolicitantes();
  mostrarToast('🗑️ Item excluído');
}

async function persistirListas() {
  try {
    await fetch(`${API_URL}/listas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        atendentes: [...new Set(atendentes.map(n => n.trim()))],
        solicitantes: [...new Set(solicitantes.map(n => n.trim()))]
      })
    });
  } catch (e) {
    console.error('Erro ao persistir listas:', e);
  }
}

// Geração de rotatividade
document.getElementById('gerarRotatividadeBtn').addEventListener('click', () => {
  senhaInput.value = '';
  erroSenha.classList.add('d-none');
  senhaModal.show();
});

document.getElementById('confirmarSenhaBtn').addEventListener('click', async () => {
  const senha = senhaInput.value.trim();
  if (!senha) return;

  const res = await fetch(`${API_URL}/validar-senha`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha })
  });

  const json = await res.json();
  if (!json.ok) {
    erroSenha.classList.remove('d-none');
    return;
  }

  senhaModal.hide();
  mostrarAnimacao('loading.json');

  const ordemRes = await fetch(`${API_URL}/nova-ordem`);
  const ordemJson = await ordemRes.json();

  if (!ordemJson.ok) {
    mostrarAnimacao('error-cross.json');
    return;
  }

  atendentes = ordemJson.atendentes;
  setTimeout(gerarESalvarQuadros, 800);
});

async function gerarESalvarQuadros() {
  if (!atendentes.length || !solicitantes.length) {
    mostrarAnimacao('error-cross.json');
    alert('É necessário ter pelo menos 1 atendente e 1 solicitante.');
    return;
  }

  const semanas = contarSemanasDoMesAtual();
  const totalAt = atendentes.length;
  const quadros = [];
  const now = new Date();
  const ano = now.getFullYear();
  const mes = now.toLocaleDateString('pt-BR', { month: 'long' });
  const responsavel = 'admin';

  for (let s = 0; s < semanas; s++) {
    quadros.push(
      solicitantes.map((sol, i) => ({
        solicitante: sol,
        atendente: atendentes[(i + s) % totalAt]
      }))
    );
  }

  const payload = { atendentes, solicitantes, quadros, mes, ano, responsavel };
  const salvarRes = await fetch(`${API_URL}/salvar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const salvarJson = await salvarRes.json();

  if (salvarJson.ok) {
    mostrarAnimacao('success-checkmark.json', () => {
      renderizarAtendentes();
      renderizarSolicitantes();
      renderizarQuadros(quadros, mes, ano);
    });
  } else {
    mostrarAnimacao('error-cross.json');
    console.error('Erro ao salvar rotatividade:', salvarJson.erro);
  }
}

function renderizarQuadros(quadros, mes, ano) {
  quadrosEl.innerHTML = `<h4 class="text-primary">📅 Referente a: ${mes} de ${ano}</h4>`;
  quadros.forEach((sem, i) => {
    let html = `<h5 class="mt-4">📆 Semana ${i + 1}</h5>`;
    html += `<div class="table-responsive"><table class="table table-bordered">
               <thead><tr><th>Solicitante</th><th>Atendente</th></tr></thead><tbody>`;
    sem.forEach(r => {
      html += `<tr><td>${r.solicitante}</td><td>${r.atendente}</td></tr>`;
    });
    html += '</tbody></table></div>';
    quadrosEl.innerHTML += html;
  });
}

function mostrarToast(msg) {
  const t = document.getElementById('toastSucesso');
  t.querySelector('.toast-body').textContent = msg;
  toastSucesso.show();
}

function mostrarAnimacao(file, cb) {
  const btn = document.getElementById('gerarRotatividadeBtn');
  btn.disabled = true;
  quadrosEl.innerHTML = `<div id="lottie" class="text-center my-4" style="height:200px;"></div>`;
  const anim = lottie.loadAnimation({
    container: document.getElementById('lottie'),
    renderer: 'svg',
    loop: false,
    autoplay: true,
    path: `${API_URL.replace('/api/rotatividade', '')}/animacoes/${file}`
  });
  anim.addEventListener('complete', () => {
    btn.disabled = false;
    if (cb) cb();
  });
}

function contarSemanasDoMesAtual() {
  const now = new Date();
  const ano = now.getFullYear(), mes = now.getMonth();
  const primeiro = new Date(ano, mes, 1).getDay();
  const dias = new Date(ano, mes + 1, 0).getDate();
  return Math.ceil((primeiro + dias) / 7);
}
