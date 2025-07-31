// Carreguei o script
console.log('⚡ script.js carregado');

// URL base do backend (Render) e da API
const BACKEND_BASE = 'https://whats-rotatividade.onrender.com';
const API_URL = `${BACKEND_BASE}/api/rotatividade`;

let atendentes = [], solicitantes = [];
let tipoAtual = '', modoAtual = '', idxAtual = -1;

// Instâncias de modais/toasts
const modal       = new bootstrap.Modal('#crudModal');
const senhaModal  = new bootstrap.Modal('#senhaModal');
const toastSucesso = new bootstrap.Toast('#toastSucesso');

// Elementos chave
const nomeInput    = document.getElementById('nomeInput');
const feedbackNome = document.getElementById('feedbackNome');
const senhaInput   = document.getElementById('senhaInput');
const erroSenha    = document.getElementById('erroSenha');
const quadrosEl    = document.getElementById('quadrosContainer');

// Atalho Enter no modal de senha
senhaInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') document.getElementById('confirmarSenhaBtn').click();
});

// Ao carregar a página, puxamos listas e último quadro
document.addEventListener('DOMContentLoaded', carregarDadosIniciais);

async function carregarDadosIniciais() {
  mostrarAnimacao('list-loaded.json');
  try {
    // Busca listas de atendentes e solicitantes
    const listas = await fetchJSON(`${API_URL}/listas`);
    atendentes   = [...new Set(listas.atendentes)];
    solicitantes = [...new Set(listas.solicitantes)];
    salvarLocal();
    renderizarAtendentes();
    renderizarSolicitantes();

    // Busca última rotatividade gerada
    const rot = await fetchJSON(`${API_URL}/ultima-rotatividade`);
    if (rot.ok && rot.dados.quadros.length) {
      renderizarQuadros(rot.dados.quadros, rot.dados.mes, rot.dados.ano);
    } else {
      quadrosEl.innerHTML = `<p class="text-muted mt-3">Nenhum quadro gerado ainda.</p>`;
    }
  } catch (e) {
    console.error(e);
    quadrosEl.innerHTML = `<p class="text-danger">Erro ao carregar os dados.</p>`;
  }
}

// Helper genérico para GET JSON
async function fetchJSON(url) {
  const res = await fetch(url);
  return res.json();
}

// Salva listas em localStorage
function salvarLocal() {
  localStorage.setItem('atendentes', JSON.stringify(atendentes));
  localStorage.setItem('solicitantes', JSON.stringify(solicitantes));
}

// Renderiza coluna de atendentes
function renderizarAtendentes() {
  const c = document.getElementById('atendentesContainer');
  c.innerHTML = atendentes
    .map((n, i) => gerarItem(n, 'atendente', i))
    .join('') +
    `<button class="btn btn-outline-primary w-100 mt-3"
      onclick="abrirModal('atendente','novo')">
      ➕ Adicionar Atendente
    </button>`;
}

// Renderiza coluna de solicitantes
function renderizarSolicitantes() {
  const c = document.getElementById('solicitantesContainer');
  c.innerHTML = solicitantes
    .map((n, i) => gerarItem(n, 'solicitante', i))
    .join('') +
    `<button class="btn btn-outline-success w-100 mt-3"
      onclick="abrirModal('solicitante','novo')">
      ➕ Adicionar Solicitante
    </button>`;
}

// Gera o HTML de cada item com botões de editar/excluir
function gerarItem(nome, tipo, i) {
  return `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <span>${nome}</span>
      <div>
        <button class="btn btn-sm btn-warning me-1"
          onclick="abrirModal('${tipo}','editar',${i})">✏️</button>
        <button class="btn btn-sm btn-danger"
          onclick="excluirItem(${i},'${tipo}')">🗑️</button>
      </div>
    </div>`;
}

// Abre modal de CRUD (adicionar/editar)
function abrirModal(tipo, modo, i = -1) {
  tipoAtual = tipo;
  modoAtual = modo;
  idxAtual  = i;
  nomeInput.value =
    modo === 'editar'
      ? (tipo === 'atendente' ? atendentes[i] : solicitantes[i])
      : '';
  document.getElementById('crudModalLabel').textContent =
    `${modo === 'novo' ? 'Adicionar' : 'Editar'} ` +
    (tipo === 'atendente' ? 'Atendente' : 'Solicitante');
  feedbackNome.textContent = '';
  nomeInput.classList.remove('is-invalid');
  document.getElementById('salvarBtn').textContent =
    modo === 'novo' ? 'Adicionar' : 'Salvar';
  modal.show();
}

// Evento de salvar/adicionar
document.getElementById('salvarBtn').addEventListener('click', async () => {
  const nome = nomeInput.value.trim().replace(/\s+/g, ' ');
  if (!nome) {
    nomeInput.classList.add('is-invalid');
    feedbackNome.textContent = 'Por favor, preencha um nome válido.';
    return;
  }
  const lista = tipoAtual === 'atendente' ? atendentes : solicitantes;
  const dup = lista.some((n, idx) =>
    idx !== idxAtual && n.toLowerCase() === nome.toLowerCase()
  );
  if (dup) {
    nomeInput.classList.add('is-invalid');
    feedbackNome.textContent = `Esse ${tipoAtual} já foi adicionado.`;
    return;
  }
  if (modoAtual === 'novo') lista.push(nome);
  else lista[idxAtual] = nome;
  modal.hide();
  salvarLocal();
  await persistirListas();
  renderizarAtendentes();
  renderizarSolicitantes();
  mostrarToast(
    `✅ ${tipoAtual.charAt(0).toUpperCase() + tipoAtual.slice(1)} ` +
    `${modoAtual === 'novo' ? 'adicionado' : 'atualizado'}!`
  );
});

// Excluir item após confirmação
async function excluirItem(i, tipo) {
  const lista = tipo === 'atendente' ? atendentes : solicitantes;
  if (!confirm(`Excluir "${lista[i]}"?`)) return;
  lista.splice(i, 1);
  salvarLocal();
  await persistirListas();
  tipo === 'atendente' ? renderizarAtendentes() : renderizarSolicitantes();
  mostrarToast('🗑️ Item excluído');
}

// Persiste listas no Google Sheets
async function persistirListas() {
  try {
    await fetch(`${API_URL}/listas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ atendentes, solicitantes })
    });
  } catch (e) {
    console.error('Erro ao persistir listas:', e);
  }
}

// Abre modal de senha para gerar nova ordem
document.getElementById('gerarRotatividadeBtn').addEventListener('click', () => {
  senhaInput.value = '';
  erroSenha.classList.add('d-none');
  senhaModal.show();
});



const senhaForm = document.getElementById('senhaForm');

// on submit do form de senha
senhaForm.addEventListener('submit', async e => {
  e.preventDefault();            // não recarrega a página

  const senha = senhaInput.value.trim();
  if (!senha) return;

  // 1) valida a senha
  const res = await fetch(`${API_URL}/validar-senha`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha })
  });
  const j = await res.json();
  if (!j.ok) {
    erroSenha.classList.remove('d-none');
    return;
  }

  // 2) fecha o modal e mostra loading
  bootstrap.Modal.getInstance(document.getElementById('senhaModal')).hide();
  mostrarAnimacao('loading.json');

  // 3) busca nova ordem
  const ordem = await fetchJSON(`${API_URL}/nova-ordem`);
  if (!ordem.ok) {
    mostrarAnimacao('error-cross.json');
    return;
  }
  atendentes = ordem.atendentes;

  // 4) gera e salva os quadros
  setTimeout(gerarESalvarQuadros, 800);
});


// Gera quadros e salva no Sheets
async function gerarESalvarQuadros() {
  if (!atendentes.length || !solicitantes.length) {
    mostrarAnimacao('error-cross.json');
    alert('É necessário ter pelo menos 1 atendente e 1 solicitante.');
    return;
  }
  const semanas = contarSemanasDoMesAtual();
  const totalAt = atendentes.length;
  const quadros = [];
  const agora      = new Date();
  const mes        = agora.toLocaleDateString('pt-BR', { month: 'long' });
  const ano        = agora.getFullYear();
  const responsavel = 'admin';

  for (let s = 0; s < semanas; s++) {
    quadros.push(
      solicitantes.map((sol, i) => ({
        solicitante: sol,
        atendente:   atendentes[(i + s) % totalAt]
      }))
    );
  }

  const res = await fetch(`${API_URL}/salvar`, {
    method: 'POST',
    headers:{ 'Content-Type': 'application/json' },
    body:   JSON.stringify({ atendentes, solicitantes, quadros, mes, ano, responsavel })
  });
  const j = await res.json();
  if (j.ok) {
    mostrarAnimacao('success-checkmark.json', () => {
      renderizarAtendentes();
      renderizarSolicitantes();
      renderizarQuadros(quadros, mes, ano);
    });
  } else {
    mostrarAnimacao('error-cross.json');
    console.error('Erro ao salvar rotatividade:', j.erro);
  }
}

// Exibe quadros na tela
function renderizarQuadros(quadros, mes, ano) {
  quadrosEl.innerHTML = `<h4 class="text-primary">📅 Referente a: ${mes} de ${ano}</h4>`;
  quadros.forEach((sem, i) => {
    let html = `<h5 class="mt-4">📆 Semana ${i + 1}</h5>
      <div class="table-responsive">
        <table class="table table-bordered">
        <thead><tr><th>Solicitante</th><th>Atendente</th></tr></thead><tbody>`;
    sem.forEach(r => {
      html += `<tr><td>${r.solicitante}</td><td>${r.atendente}</td></tr>`;
    });
    html += '</tbody></table></div>';
    quadrosEl.innerHTML += html;
  });
}

// Exibe toast de sucesso
function mostrarToast(msg) {
  const t = document.getElementById('toastSucesso');
  t.querySelector('.toast-body').textContent = msg;
  toastSucesso.show();
}

// Carrega animação Lottie via fetch + animationData
async function mostrarAnimacao(file, cb) {
  const btn = document.getElementById('gerarRotatividadeBtn');
  btn.disabled = true;
  quadrosEl.innerHTML = `<div id="lottie" class="text-center my-4" style="height:200px;"></div>`;
  const container = document.getElementById('lottie');
  try {
    const resp = await fetch(`${BACKEND_BASE}/animacoes/${file}`);
    const json = await resp.json();
    const anim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      animationData: json
    });
    anim.addEventListener('complete', () => {
      btn.disabled = false;
      if (cb) cb();
    });
  } catch (err) {
    console.error('Erro carregando animação:', err);
    btn.disabled = false;
  }
}

// Conta quantas semanas o mês atual possui
function contarSemanasDoMesAtual() {
  const now      = new Date();
  const primeiro = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const dias     = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.ceil((primeiro + dias) / 7);
}
