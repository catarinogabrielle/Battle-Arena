const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const elements = {
    aliveCount: document.getElementById('alive-count'),
    killFeed: document.getElementById('kill-feed'),
    p1Hp: document.getElementById('p1-hp-fill'),
    p1PipsContainer: document.getElementById('p1-pips-container'),
    p1EnergyText: document.getElementById('p1-energy-text'),
    p1Reloader: document.getElementById('p1-reloader'),
    p1LoaderInner: document.querySelector('.loader-inner'),
    damageOverlay: document.getElementById('damage-overlay'),
    playerHud: document.getElementById('player-hud'),
    spectatorUI: document.getElementById('spectator-ui'),
    gameOver: document.getElementById('game-over-screen'),
    winnerText: document.getElementById('winner-text'),
    rankingList: document.getElementById('ranking-list')
};

const savedData = JSON.parse(localStorage.getItem('arenaPlayer')) || { nickname: "PLAYER", color: "#00d2ff", weapon: "melee" };

function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas); resizeCanvas();

const CONFIG = { speedWalk: 3.2, speedRun: 6.5, meleeDamage: 40, rangedDamage: 25, zoneDamage: 1.2, zoneShrinkSpeed: 0.2, reloadFrames: 180 };
const keys = {};
const mouse = { x: 0, y: 0, clicked: false };

window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mousedown', e => { if (e.button === 0) mouse.clicked = true; });
window.addEventListener('mouseup', e => { if (e.button === 0) mouse.clicked = false; });

class Projectile {
    constructor(x, y, angle, color, ownerId, ownerName) {
        this.x = x; this.y = y;
        this.vx = Math.cos(angle) * 16; this.vy = Math.sin(angle) * 16;
        this.radius = 5; this.color = color; this.ownerId = ownerId; this.ownerName = ownerName; this.life = 100;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life--; }
    draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill(); }
}

class Player {
    constructor(id, name, color, x, y, isBot, weaponType, controls) {
        this.id = id; this.name = name; this.color = color;
        this.x = x; this.y = y; this.radius = 22;
        this.hp = 500; this.maxHp = 500;
        this.alive = true; this.isBot = isBot;
        this.weapon = weaponType; this.controls = controls;
        this.angle = 0; this.cooldown = 0;
        this.attackFrame = 0; this.maxAttackFrames = 15;
        this.maxAmmo = (weaponType === 'melee') ? 5 : 2;
        this.currentAmmo = this.maxAmmo;
        this.reloadTimer = 0;
        this.muzzleFlash = 0;
    }

    update() {
        if (!this.alive) return;
        if (this.reloadTimer > 0) { this.reloadTimer--; if (this.reloadTimer <= 0) this.currentAmmo = this.maxAmmo; }

        if (!this.isBot) {
            let speed = keys['Space'] ? CONFIG.speedRun : CONFIG.speedWalk;
            if (keys[this.controls.up]) this.y -= speed;
            if (keys[this.controls.down]) this.y += speed;
            if (keys[this.controls.left]) this.x -= speed;
            if (keys[this.controls.right]) this.x += speed;
            this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
            if (mouse.clicked && this.cooldown <= 0 && this.currentAmmo > 0 && this.reloadTimer <= 0) this.attack();
            if (this.hp < 150) elements.damageOverlay.classList.add('pulse-red'); else elements.damageOverlay.classList.remove('pulse-red');
        } else {
            let closest = null; let minDist = Infinity;
            Game.players.forEach(p => { if (p !== this && p.alive) { let d = Math.hypot(p.x - this.x, p.y - this.y); if (d < minDist) { minDist = d; closest = p; } } });
            if (closest) {
                this.angle = Math.atan2(closest.y - this.y, closest.x - this.x);
                let s = CONFIG.speedWalk * 0.85;
                if (this.weapon === 'melee') {
                    if (minDist > 50) { this.x += Math.cos(this.angle) * s; this.y += Math.sin(this.angle) * s; }
                    if (minDist < 80 && this.cooldown <= 0 && this.currentAmmo > 0 && this.reloadTimer <= 0) this.attack();
                } else {
                    if (minDist > 300) { this.x += Math.cos(this.angle) * s; this.y += Math.sin(this.angle) * s; }
                    if (this.cooldown <= 0 && Math.random() < 0.04 && this.currentAmmo > 0 && this.reloadTimer <= 0) this.attack();
                }
            }
        }
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
        if (this.cooldown > 0) this.cooldown--;
        if (this.attackFrame > 0) this.attackFrame--;
        if (this.muzzleFlash > 0) this.muzzleFlash--;
        if (Math.hypot(this.x - Game.zone.x, this.y - Game.zone.y) > Game.zone.radius) this.takeDamage(CONFIG.zoneDamage, "A Tempestade");
        if (this.id === 'P1') this.updateUI();
    }

    attack() {
        this.attackFrame = this.maxAttackFrames;
        this.currentAmmo--;
        if (this.currentAmmo <= 0) this.reloadTimer = CONFIG.reloadFrames;
        if (this.weapon === 'melee') {
            this.cooldown = 20;
            Game.players.forEach(p => {
                if (p !== this && p.alive) {
                    let d = Math.hypot(p.x - this.x, p.y - this.y);
                    let angT = Math.atan2(p.y - this.y, p.x - this.x);
                    if (d < 95 && Math.abs(angT - this.angle) < Math.PI / 2) { p.takeDamage(CONFIG.meleeDamage, this.name); p.x += Math.cos(angT) * 40; p.y += Math.sin(angT) * 40; }
                }
            });
        } else {
            this.cooldown = 35;
            this.muzzleFlash = 5;
            Game.projectiles.push(new Projectile(this.x, this.y, this.angle, this.color, this.id, this.name));
        }
    }

    takeDamage(amount, killer) {
        if (!this.alive) return;
        this.hp -= amount;
        if (this.hp <= 0) { this.alive = false; Game.eliminatedOrder.push({ name: this.name, color: this.color }); Game.addKillMsg(this.name, killer, this.color); if (this.id === 'P1') Game.startSpectating(); Game.checkWin(); }
    }

    updateUI() {
        elements.p1Hp.style.width = Math.max(0, (this.hp / this.maxHp) * 100) + '%';
        const pips = elements.p1PipsContainer.children;
        if (this.reloadTimer > 0) {
            elements.p1EnergyText.innerText = "..."; elements.p1Reloader.classList.remove('hidden');
            let pct = (1 - (this.reloadTimer / CONFIG.reloadFrames)) * 100;
            elements.p1LoaderInner.style.background = `conic-gradient(#00ff88 ${pct}%, transparent ${pct}%)`;
        } else {
            elements.p1EnergyText.innerText = `${this.currentAmmo}/${this.maxAmmo}`; elements.p1Reloader.classList.add('hidden');
            for (let i = 0; i < this.maxAmmo; i++) { if (pips[i]) pips[i].className = i < this.currentAmmo ? 'pip filled' : 'pip'; }
        }
    }

    draw() {
        if (!this.alive) return;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill(); ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.stroke();

        ctx.save();
        ctx.translate(this.x, this.y);
        let swing = 0; if (this.attackFrame > 0 && this.weapon === 'melee') swing = (1 - (this.attackFrame / this.maxAttackFrames)) * Math.PI - Math.PI / 2;
        ctx.rotate(this.angle + swing);

        if (this.weapon === 'melee') {
            ctx.fillStyle = "#444"; ctx.fillRect(this.radius - 2, -3, 8, 6);
            ctx.fillStyle = "#FFD700"; ctx.fillRect(this.radius + 6, -12, 4, 24);
            ctx.shadowBlur = 15; ctx.shadowColor = this.color; ctx.fillStyle = "white";
            ctx.beginPath(); ctx.moveTo(this.radius + 10, -5); ctx.lineTo(this.radius + 65, -2); ctx.lineTo(this.radius + 65, 2); ctx.lineTo(this.radius + 10, 5); ctx.fill(); ctx.shadowBlur = 0;

            // RESTAURAÇÃO DA LINHA CURVA (SLASH)
            if (this.attackFrame > 0) {
                ctx.beginPath(); ctx.arc(0, 0, 80, -0.6, 0.6);
                ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 4; ctx.stroke();
            }
        } else {
            ctx.fillStyle = "#555"; ctx.fillRect(this.radius, -5, 25, 10);
            if (this.muzzleFlash > 0) {
                ctx.beginPath(); ctx.arc(this.radius + 30, 0, 12, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255, 200, 0, 0.8)"; ctx.fill();
            }
        }
        ctx.restore();

        ctx.fillStyle = "white"; ctx.font = "bold 12px Arial"; ctx.textAlign = "center"; ctx.fillText(this.name, this.x, this.y - 35);
        if (this.id !== 'P1' || Game.isSpectating) {
            let barW = 40; ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(this.x - 20, this.y - 30, barW, 4);
            ctx.fillStyle = (this.hp < 150) ? "#ff3d68" : this.color; ctx.fillRect(this.x - 20, this.y - 30, (this.hp / this.maxHp) * barW, 4);
        }
    }
}

const Game = {
    active: true, players: [], projectiles: [], zone: { x: 0, y: 0, radius: 0 }, eliminatedOrder: [], isSpectating: false,
    init() {
        this.zone = { x: canvas.width / 2, y: canvas.height / 2, radius: Math.max(canvas.width, canvas.height) * 0.45 };
        const cX = canvas.width / 2; const cY = canvas.height / 2;
        this.players = [
            new Player('P1', savedData.nickname, savedData.color, cX, cY, false, savedData.weapon, { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }),
            new Player('B1', 'Shadow', '#ff3d68', cX - 250, cY - 250, true, 'ranged'),
            new Player('B2', 'Titan', '#A7FF83', cX + 250, cY - 250, true, 'melee'),
            new Player('B3', 'Hunter', '#F0E68C', cX - 250, cY + 250, true, 'ranged'),
            new Player('B4', 'Apex', '#FFA500', cX + 250, cY + 250, true, 'melee'),
            new Player('B5', 'Viper', '#B19CD9', cX + 350, cY, true, 'ranged')
        ];
        const p1 = this.players[0]; elements.p1PipsContainer.innerHTML = '';
        for (let i = 0; i < p1.maxAmmo; i++) { let p = document.createElement('div'); p.className = 'pip filled'; elements.p1PipsContainer.appendChild(p); }
        this.loop();
    },
    startSpectating() { this.isSpectating = true; elements.playerHud.classList.add('hidden'); elements.spectatorUI.classList.remove('hidden'); },
    update() {
        if (!this.active) return;
        if (this.zone.radius > 110) this.zone.radius -= CONFIG.zoneShrinkSpeed;
        this.players.forEach(p => p.update());
        this.projectiles.forEach((t, i) => { t.update(); this.players.forEach(p => { if (p.alive && p.id !== t.ownerId && Math.hypot(p.x - t.x, p.y - t.y) < p.radius + t.radius) { p.takeDamage(CONFIG.rangedDamage, t.ownerName); t.life = 0; } }); if (t.life <= 0) this.projectiles.splice(i, 1); });
    },
    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "rgba(10, 0, 20, 0.75)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(this.zone.x, this.zone.y, this.zone.radius, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath(); ctx.arc(this.zone.x, this.zone.y, this.zone.radius, 0, Math.PI * 2); ctx.strokeStyle = "#00d2ff"; ctx.lineWidth = 5; ctx.stroke();
        this.projectiles.forEach(p => p.draw()); this.players.forEach(p => p.draw());
    },
    loop() { Game.update(); Game.draw(); requestAnimationFrame(() => Game.loop()); },
    addKillMsg(name, killer, color) { const div = document.createElement('div'); div.className = 'feed-item'; div.innerHTML = `<span style="color:${color}">${name}</span> eliminado por <b>${killer}</b>`; elements.killFeed.appendChild(div); setTimeout(() => div.remove(), 4500); },
    checkWin() { let vivos = this.players.filter(p => p.alive); elements.aliveCount.innerText = vivos.length; if (vivos.length <= 1) { this.active = false; this.showRanking(vivos[0]); } },
    showRanking(vencedor) {
        const ranking = vencedor ? [vencedor, ...this.eliminatedOrder.reverse()] : [...this.eliminatedOrder.reverse()];
        elements.rankingList.innerHTML = '';
        ranking.forEach((player, index) => { const pos = index + 1; const item = document.createElement('div'); item.className = `rank-item ${pos === 1 ? 'winner' : ''}`; item.innerHTML = `<span class="rank-pos">#${pos}</span><span class="rank-name" style="color:${player.color}">${player.name}</span><span class="rank-status">${pos === 1 ? 'VENCEDOR' : 'MORTO'}</span>`; elements.rankingList.appendChild(item); });
        setTimeout(() => { elements.gameOver.classList.remove('hidden'); elements.spectatorUI.classList.add('hidden'); if (vencedor) { elements.winnerText.innerText = `${vencedor.name} VENCEU!`; elements.winnerText.style.color = vencedor.color; } }, 1500);
    }
};
window.onload = () => Game.init();