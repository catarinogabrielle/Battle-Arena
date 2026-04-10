// ==========================================
// ROSTER DE PERSONAGENS E STATUS
// ==========================================
const characters = [
    { id: 'kaelen', name: 'KAELEN', class: 'GUERREIRO DO SOL', img: 'assets/kaelen.png', color: '#00d2ff', weapon: 'melee' },
    { id: 'elara', name: 'ELARA', class: 'PATRULHEIRA DA FLORESTA', img: 'assets/elara.png', color: '#A7FF83', weapon: 'ranged' },
    { id: 'malacor', name: 'MALACOR', class: 'MAGO DAS SOMBRAS', img: 'assets/malacor.png', color: '#B19CD9', weapon: 'ranged' },
    { id: 'lyra', name: 'LYRA', class: 'SACERDOTISA DA LUZ', img: 'assets/lyra.png', color: '#F0E68C', weapon: 'melee' },
    { id: 'silas', name: 'SILAS', class: 'ASSASSINO DA NÉVOA', img: 'assets/silas.png', color: '#ffffff', weapon: 'melee' },
    { id: 'morwen', name: 'MORWEN', class: 'INVOCADORA DOS ELEMENTOS', img: 'assets/morwen.png', color: '#ff3d68', weapon: 'ranged' }
];

let selectedCharIndex = 0;
const rosterContainer = document.getElementById('roster-container');
const mainImg = document.getElementById('main-hero-img');
const mainName = document.getElementById('main-hero-name');
const mainClass = document.getElementById('main-hero-class');
const nickElement = document.getElementById('player-nickname');

function renderRoster() {
    characters.forEach((char, index) => {
        const btn = document.createElement('div');
        btn.classList.add('char-thumb');
        if (index === 0) btn.classList.add('active');

        btn.innerHTML = `<img src="${char.img}" alt="${char.name}">`;

        btn.addEventListener('click', () => {
            selectedCharIndex = index; // Atualiza o índice do herói escolhido
            document.querySelectorAll('.char-thumb').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');

            mainImg.style.opacity = 0;
            setTimeout(() => {
                mainImg.src = char.img;
                mainName.innerText = char.name;
                mainClass.innerText = char.class;
                mainImg.style.opacity = 1;
            }, 150);
        });
        rosterContainer.appendChild(btn);
    });
}
renderRoster();

// ==========================================
// LÓGICA DO MODAL & CRIAÇÃO DE SALA
// ==========================================

const modal = document.getElementById('room-modal');
const viewList = document.getElementById('view-room-list');
const viewCreate = document.getElementById('view-create-room');
const modalTitle = document.getElementById('modal-main-title');

// Botões
document.getElementById('btn-play').onclick = () => {
    viewCreate.classList.add('hidden');
    viewList.classList.remove('hidden');
    modalTitle.innerHTML = '<i class="fas fa-globe"></i> ARENA MULTIPLAYER';
    modal.classList.remove('hidden');
    carregarSalas();
};

document.getElementById('close-modal-btn').onclick = () => modal.classList.add('hidden');
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

document.getElementById('btn-show-create').onclick = () => {
    viewList.classList.add('hidden');
    setTimeout(() => {
        viewCreate.classList.remove('hidden');
        modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> CRIAR NOVA SALA';
    }, 150);
};

document.getElementById('btn-cancel-create').onclick = () => {
    viewCreate.classList.add('hidden');
    setTimeout(() => {
        viewList.classList.remove('hidden');
        modalTitle.innerHTML = '<i class="fas fa-globe"></i> ARENA MULTIPLAYER';
    }, 150);
};

// ==========================================
// ENTRAR NO JOGO E SALVAR OS DADOS
// ==========================================
function entrarNoJogo() {
    const playerConfig = {
        nickname: nickElement.innerText.trim(),
        color: characters[selectedCharIndex].color,
        weapon: characters[selectedCharIndex].weapon,
        charId: characters[selectedCharIndex].id // SALVANDO QUEM ELE É
    };

    // Salva na memória do navegador
    localStorage.setItem('arenaPlayer', JSON.stringify(playerConfig));

    // Inicia a arena
    window.location.href = 'arena.html';
}

document.getElementById('btn-confirm-create').addEventListener('click', () => {
    const btn = document.getElementById('btn-confirm-create');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CRIANDO...';
    setTimeout(entrarNoJogo, 600);
});

// Simulando banco de dados de salas
const salasMock = [
    { nome: "Arena dos Campeões", mapa: "Hexágono Cósmico", jogadores: 3, max: 4 },
    { nome: "Brawl Amigável", mapa: "Abismo Escuro", jogadores: 1, max: 2 }
];

function carregarSalas() {
    const roomListContainer = document.getElementById('room-list');
    roomListContainer.innerHTML = '';
    salasMock.forEach(sala => {
        const li = document.createElement('li');
        li.classList.add('room-item');
        li.innerHTML = `
            <div class="room-info">
                <h4>${sala.nome}</h4>
                <p><i class="fas fa-map-marker-alt"></i> ${sala.mapa}</p>
            </div>
            <div class="room-status">
                <span class="player-count"><i class="fas fa-users"></i> ${sala.jogadores}/${sala.max}</span>
                <button class="btn-enter-room" onclick="entrarNoJogo()">ENTRAR</button>
            </div>
        `;
        roomListContainer.appendChild(li);
    });
}

// Expõe a função globalmente para as salas
window.entrarNoJogo = entrarNoJogo;