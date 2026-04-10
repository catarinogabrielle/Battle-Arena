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

// Renderizar todos os 6 personagens
characters.forEach((char, index) => {
    const btn = document.createElement('div');
    btn.className = 'char-thumb' + (index === 0 ? ' active' : '');
    btn.innerHTML = `<img src="${char.img}" alt="${char.name}">`;
    btn.onclick = () => {
        selectedCharIndex = index;
        document.querySelectorAll('.char-thumb').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        mainImg.style.opacity = 0;
        setTimeout(() => {
            mainImg.src = char.img;
            mainName.innerText = char.name;
            mainClass.innerText = char.class;
            mainImg.style.opacity = 1;
        }, 150);
    };
    rosterContainer.appendChild(btn);
});

// Lógica do Modal e Conexão
const modal = document.getElementById('room-modal');
const viewList = document.getElementById('view-room-list');
const viewCreate = document.getElementById('view-create-room');

document.getElementById('btn-play').onclick = () => {
    modal.classList.remove('hidden');
    carregarSalas();
};

document.getElementById('close-modal-btn').onclick = () => modal.classList.add('hidden');
document.getElementById('btn-show-create').onclick = () => { viewList.classList.add('hidden'); viewCreate.classList.remove('hidden'); };
document.getElementById('btn-cancel-create').onclick = () => { viewCreate.classList.add('hidden'); viewList.classList.remove('hidden'); };

function entrarNoJogo() {
    const playerConfig = {
        nickname: nickElement.innerText.trim(),
        color: characters[selectedCharIndex].color,
        weapon: characters[selectedCharIndex].weapon
    };
    localStorage.setItem('arenaPlayer', JSON.stringify(playerConfig));
    window.location.href = 'arena.html';
}

document.getElementById('btn-confirm-create').onclick = entrarNoJogo;

function carregarSalas() {
    const list = document.getElementById('room-list');
    list.innerHTML = `<li class="room-item">
        <div class="room-info"><h4>Arena Alpha</h4><p>Mapa: Floresta Mística</p></div>
        <button class="btn-enter-room" onclick="window.location.href='arena.html'">ENTRAR</button>
    </li>`;
}