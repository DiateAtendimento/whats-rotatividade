// ✅ script.js completo e atualizado com todas as correções aplicadas

const API_URL = 'https://rotatividade-backend.onrender.com/api/rotatividade';

const senhaModal = new bootstrap.Modal(document.getElementById('senhaModal'));
const senhaInput = document.getElementById('senhaInput');
const erroSenha = document.getElementById('erroSenha');

let atendentes = JSON.parse(localStorage.getItem('atendentes')) || [];
let solicitantes = JSON.parse(localStorage.getItem('solicitantes')) || [];

let tipoAtual = '';
let modo = '';
let indexAtual = -1;

const modal = new bootstrap.Modal(document.getElementById('crudModal'));
const nomeInput = document.getElementById('nomeInput');
const salvarBtn = document.getElementById('salvarBtn');
const container = document.getElementById('quadrosContainer');

// 🔁 CRUD sempre visível ao carregar
renderizarAtendentes();
renderizarSolicitantes();

senhaInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('confirmarSenhaBtn').click();
  }
});

async function carregarDadosIniciais() {
  mostrarAnimacao('list-loaded.json');
  try {
    const res = await fetch(`${API_URL}/ultima-rotatividade`);
    const data = await res.json();

    if (data.ok && data.dados) {
      const { atendentes: a, solicitantes: s, quadros, mes, ano } = data.dados;
      atendentes = a;
      solicitantes = s;
      localStorage.setItem('atendentes', JSON.stringify(atendentes));
      localStorage.setItem('solicitantes', JSON.stringify(solicitantes));
      renderizarAtendentes();
      renderizarSolicitantes();
      renderizarQuadros(quadros, mes, ano);
    } else {
      container.innerHTML = '<p class="text-muted mt-3">Nenhum quadro de rotatividade foi gerado ainda.</p>';
    }
  } catch (error) {
    console.error('Erro ao carregar dados iniciais:', error);
    container.innerHTML = '<p class="text-danger">Erro ao carregar os dados.</p>';
  }
}

document.addEventListener('DOMContentLoaded', carregarDadosIniciais);

document.getElementById('gerarRotatividadeBtn').addEventListener('click', () => {
  senhaInput.value = '';
  erroSenha.classList.add('d-none');
  senhaModal.show();
});

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
    mostrarAnimacao('loading.json');

    try {
      const res = await fetch(`${API_URL}/nova-ordem`);
      const dados = await res.json();

      if (dados.ok && Array.isArray(dados.atendentes)) {
        atendentes = dados.atendentes;

        const sRes = await fetch(`${API_URL}/ultima-rotatividade`);
        const sData = await sRes.json();
        if (sData.ok && sData.dados?.solicitantes?.length) {
          solicitantes = sData.dados.solicitantes;
        }

        setTimeout(() => gerarQuadrosSemanais(), 800);
      } else {
        mostrarAnimacao('error-cross.json');
      }
    } catch (erro) {
      mostrarAnimacao('error-cross.json');
    }
  } else {
    erroSenha.classList.remove('d-none');
  }
});

function gerarQuadrosSemanais() {
  if (!solicitantes.length || !atendentes.length) {
    mostrarAnimacao('error-cross.json');
    alert('Erro: é necessário ter ao menos 1 atendente e 1 solicitante.');
    return;
  }

  const semanas = contarSemanasDoMesAtual();
  const totalAtendentes = atendentes.length;
  const quadros = [];
  const now = new Date();
  const ano = now.getFullYear();
  const mes = now.toLocaleDateString('pt-BR', { month: 'long' });

  for (let semana = 0; semana < semanas; semana++) {
    const semanaData = [];
    solicitantes.forEach((sol, i) => {
      const atendenteIndex = (i + semana) % totalAtendentes;
      semanaData.push({ solicitante: sol, atendente: atendentes[atendenteIndex] });
    });
    quadros.push(semanaData);
  }

  const dados = { atendentes, solicitantes, quadros, mes, ano, responsavel: 'admin' };
  localStorage.setItem('rotatividade', JSON.stringify(dados));

  fetch(`${API_URL}/gerar-tabelas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  })
    .then(res => res.json())
    .then(async res => {
      if (res.ok) {
        await fetch(`${API_URL}/salvar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quadros, mes, ano, responsavel: 'admin' })
        });

        mostrarAnimacao('success-checkmark.json', () => {
          renderizarQuadros(quadros, mes, ano);
          renderizarAtendentes();
          renderizarSolicitantes();
        });
      } else {
        mostrarAnimacao('error-cross.json');
      }
    })
    .catch(() => mostrarAnimacao('error-cross.json'));
}

function renderizarQuadros(quadros, mes, ano) {
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

function mostrarAnimacao(nomeArquivo, callback) {
  const btn = document.getElementById('gerarRotatividadeBtn');
  btn.disabled = true;

  container.innerHTML = '<div id="lottie" class="text-center my-4" style="height: 200px;"></div>';
  const anim = lottie.loadAnimation({
    container: document.getElementById('lottie'),
    renderer: 'svg',
    loop: false,
    autoplay: true,
    path: `https://rotatividade-backend.onrender.com/animacoes/${nomeArquivo}`
  });
  anim.addEventListener('complete', () => {
    btn.disabled = false;
    if (callback) callback();
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

function renderizarAtendentes() {
  const container = document.getElementById('atendentesContainer');
  container.innerHTML = '';
  atendentes.forEach((nome, i) => {
    container.innerHTML += gerarItemHTML(nome, i, 'atendente');
  });
  container.innerHTML += `<button class="btn btn-outline-primary w-100 mt-3" onclick="abrirModal('atendente', 'novo')">➕ Adicionar Atendente</button>`;
}

function renderizarSolicitantes() {
  const container = document.getElementById('solicitantesContainer');
  container.innerHTML = '';
  solicitantes.forEach((nome, i) => {
    container.innerHTML += gerarItemHTML(nome, i, 'solicitante');
  });
  container.innerHTML += `<button class="btn btn-outline-success w-100 mt-3" onclick="abrirModal('solicitante', 'novo')">➕ Adicionar Solicitante</button>`;
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

  const lista = tipo === 'atendente' ? atendentes : solicitantes;
  nomeInput.value = (modo === 'editar') ? lista[index] : '';
  document.getElementById('crudModalLabel').textContent =
    `${modo === 'novo' ? 'Adicionar' : 'Editar'} ${tipo === 'atendente' ? 'Atendente' : 'Solicitante'}`;
  salvarBtn.textContent = modo === 'novo' ? 'Adicionar' : 'Salvar';

  modal.show();
}

salvarBtn.addEventListener('click', salvarNome);

function salvarNome() {
  const nome = nomeInput.value.trim();
  if (!nome) {
    nomeInput.classList.add('is-invalid');
    return;
  }

  const lista = tipoAtual === 'atendente' ? atendentes : solicitantes;
  const nomeNormalizado = nome.toLowerCase();

  const existe = lista.some((n, i) => i !== indexAtual && n.toLowerCase() === nomeNormalizado);
  if (existe) {
    nomeInput.classList.add('is-invalid');
    nomeInput.nextElementSibling.textContent = 'Nome já existe.';
    return;
  }

  nomeInput.classList.remove('is-invalid');

  if (modo === 'novo') {
    lista.push(nome);
  } else {
    lista[indexAtual] = nome;
  }

  modal.hide();
  tipoAtual === 'atendente' ? renderizarAtendentes() : renderizarSolicitantes();
  mostrarToast('✅ Alterações salvas com sucesso!');
}

function excluirItem(index, tipo) {
  const lista = tipo === 'atendente' ? atendentes : solicitantes;
  if (confirm(`Deseja realmente excluir "${lista[index]}"?`)) {
    lista.splice(index, 1);
    tipo === 'atendente' ? renderizarAtendentes() : renderizarSolicitantes();
  }
}

function mostrarToast(msg) {
  const toastEl = document.getElementById('toastSucesso');
  toastEl.querySelector('.toast-body').textContent = msg;
  const toast = new bootstrap.Toast(toastEl);
  toast.show();
}
