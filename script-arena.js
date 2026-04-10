/**
 * BATTLE ARENA - ENGINE COMPLETA COM TELA DE LOADING E IA AVANÇADA
 */

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
    spellWarning: document.getElementById('spell-warning'),
    gameOver: document.getElementById('game-over-screen'),
    winnerText: document.getElementById('winner-text'),
    rankingList: document.getElementById('ranking-list'),
    weaponNameHud: document.getElementById('hud-weapon-name'),
    playerNameHud: document.getElementById('player-name-hud'),
    zoneHud: document.querySelector('.hud-zone')
};

const savedData = JSON.parse(localStorage.getItem('arenaPlayer')) || {
    nickname: "PLAYER", color: "#00d2ff", weapon: "melee", charId: "kaelen"
};

function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas); resizeCanvas();

const CONFIG = {
    speedWalk: 3.2, speedRun: 6.5, meleeDamage: 40, rangedDamage: 25,
    zoneDamage: 1.2, zoneShrinkSpeed: 0.15, reloadFrames: 180,
    regenDelay: 300, regenAmount: 0.5, zoneDelayFrames: 3600 // 60 segundos de tempo livre
};

const keys = {};
const mouse = { x: 0, y: 0, clicked: false };

window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mousedown', e => { if (e.button === 0) mouse.clicked = true; });
window.addEventListener('mouseup', e => { if (e.button === 0) mouse.clicked = false; });

class Projectile {
    constructor(x, y, angle, color, ownerId, ownerName, charId) {
        this.x = x; this.y = y;
        this.vx = Math.cos(angle) * 16; this.vy = Math.sin(angle) * 16;
        this.radius = 5; this.color = color; this.ownerId = ownerId; this.ownerName = ownerName; this.life = 120;
        this.charId = charId;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life--; }

    draw() {
        ctx.save(); ctx.translate(this.x, this.y); let angle = Math.atan2(this.vy, this.vx); ctx.rotate(angle);

        if (this.charId === 'elara') {
            ctx.shadowBlur = 3; ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.fillStyle = "#5c3a21"; ctx.fillRect(-15, -1.5, 25, 3);
            ctx.fillStyle = "#333"; ctx.fillRect(8, -2, 2, 4);
            ctx.fillStyle = "#e0e0e0"; ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(22, 0); ctx.lineTo(10, 4); ctx.closePath(); ctx.fill();
            ctx.fillStyle = "#A7FF83"; ctx.beginPath(); ctx.moveTo(-10, -1.5); ctx.lineTo(-18, -6); ctx.lineTo(-15, -1.5); ctx.fill(); ctx.beginPath(); ctx.moveTo(-10, 1.5); ctx.lineTo(-18, 6); ctx.lineTo(-15, 1.5); ctx.fill();
        } else if (this.charId === 'morwen') {
            ctx.shadowBlur = 20; ctx.shadowColor = "#ff0000";
            for (let i = 0; i < 6; i++) {
                let trailX = -(Math.random() * 25); let trailY = (Math.random() * 12) - 6; let trailSize = (Math.random() * 5) + 2;
                ctx.fillStyle = `rgba(255, ${Math.random() * 100}, 0, ${Math.random() + 0.2})`;
                ctx.beginPath(); ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2); ctx.fill();
            }
            let flicker = Math.random() * 4;
            ctx.fillStyle = "rgba(200, 20, 0, 0.8)"; ctx.beginPath(); ctx.arc(0, 0, this.radius + 6 + flicker, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#ff6a00"; ctx.beginPath(); ctx.arc(3, 0, this.radius + 2 + (flicker / 2), 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#fff566"; ctx.beginPath(); ctx.arc(5, 0, this.radius - 1, 0, Math.PI * 2); ctx.fill();
        } else if (this.charId === 'malacor') {
            ctx.shadowBlur = 15; ctx.shadowColor = "#B19CD9"; ctx.fillStyle = "#4B0082";
            ctx.beginPath();
            for (let i = 0; i < 8; i++) { let r = this.radius + (Math.random() * 8); let a = (i / 8) * Math.PI * 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = "black"; ctx.beginPath(); ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.shadowBlur = 10; ctx.shadowColor = this.color; ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

class Player {
    constructor(id, name, color, x, y, isBot, weaponType, controls, charId) {
        this.id = id; this.name = name; this.color = color;
        this.x = x; this.y = y; this.radius = 22;
        this.hp = 500; this.maxHp = 500;
        this.alive = true; this.isBot = isBot;
        this.weapon = weaponType; this.controls = controls;
        this.charId = charId;

        this.angle = 0; this.cooldown = 0;
        this.attackFrame = 0; this.maxAttackFrames = 15;
        this.maxAmmo = (this.charId === 'elara') ? 4 : (weaponType === 'melee' ? 5 : 2);
        this.currentAmmo = this.maxAmmo;
        this.reloadTimer = 0;
        this.healAura = 0;
        this.lastDamageTimer = 0;

        this.vx = 0; this.vy = 0;
        this.botState = 'WANDER';
        this.wanderTarget = null;
        this.currentTarget = null;
        this.strafeDir = Math.random() > 0.5 ? 1 : -1;
        this.strafeTimer = 0;
    }

    update() {
        if (!this.alive) return;
        let oldX = this.x; let oldY = this.y;

        this.lastDamageTimer++;
        if (this.lastDamageTimer > CONFIG.regenDelay && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + CONFIG.regenAmount);
        }

        if (this.reloadTimer > 0) { this.reloadTimer--; if (this.reloadTimer <= 0) this.currentAmmo = this.maxAmmo; }

        let sWalk = CONFIG.speedWalk; let sRun = CONFIG.speedRun;
        if (this.charId === 'silas') { sWalk *= 1.3; sRun *= 1.3; }

        let moveX = 0; let moveY = 0;

        if (!this.isBot) {
            let speed = keys['Space'] ? sRun : sWalk;
            if (keys[this.controls.up]) moveY -= speed;
            if (keys[this.controls.down]) moveY += speed;
            if (keys[this.controls.left]) moveX -= speed;
            if (keys[this.controls.right]) moveX += speed;
            this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
            if (mouse.clicked && this.cooldown <= 0 && this.currentAmmo > 0 && this.reloadTimer <= 0) this.attack();

            if (this.hp < 150) elements.damageOverlay.classList.add('pulse-red'); else elements.damageOverlay.classList.remove('pulse-red');
        } else {
            let speed = sWalk * 0.9;

            let distToZone = Math.hypot(this.x - Game.zone.x, this.y - Game.zone.y);

            // ==========================================
            // PRIORIDADE MÁXIMA ABSOLUTA: NÃO SAIR DA ZONA
            // ==========================================
            if (distToZone > Game.zone.radius - 60) {
                this.angle = Math.atan2(Game.zone.y - this.y, Game.zone.x - this.x);
                moveX = Math.cos(this.angle) * sRun * 1.1;
                moveY = Math.sin(this.angle) * sRun * 1.1;
                this.botState = 'ZONE_FLEE';
            } else {
                let newClosest = null; let minDist = Infinity;
                Game.players.forEach(p => {
                    if (p !== this && p.alive) {
                        let d = Math.hypot(p.x - this.x, p.y - this.y);
                        if (d < minDist) { minDist = d; newClosest = p; }
                    }
                });

                if (this.currentTarget && this.currentTarget.alive) {
                    let currentTargetDist = Math.hypot(this.currentTarget.x - this.x, this.currentTarget.y - this.y);
                    if (minDist < currentTargetDist - 100) { this.currentTarget = newClosest; }
                    else { minDist = currentTargetDist; }
                } else {
                    this.currentTarget = newClosest;
                }
                let closest = this.currentTarget;

                if (this.hp < this.maxHp * 0.3 && closest && minDist < 500 && this.lastDamageTimer < 180) {
                    this.botState = 'FLEE';
                } else if (closest && minDist < 700) {
                    this.botState = 'ATTACK';
                } else {
                    this.botState = 'WANDER';
                }

                if (this.botState === 'FLEE') {
                    this.angle = Math.atan2(this.y - closest.y, this.x - closest.x);
                    moveX = Math.cos(this.angle) * sRun * 0.8;
                    moveY = Math.sin(this.angle) * sRun * 0.8;
                }
                else if (this.botState === 'WANDER') {
                    if (!this.wanderTarget || Math.hypot(this.wanderTarget.x - this.x, this.wanderTarget.y - this.y) < 25) {
                        let r = Game.zone.radius * Math.random() * 0.6;
                        let theta = Math.random() * Math.PI * 2;
                        this.wanderTarget = { x: Game.zone.x + r * Math.cos(theta), y: Game.zone.y + r * Math.sin(theta) };
                    }
                    this.angle = Math.atan2(this.wanderTarget.y - this.y, this.wanderTarget.x - this.x);
                    moveX = Math.cos(this.angle) * speed * 0.6;
                    moveY = Math.sin(this.angle) * speed * 0.6;
                }
                else if (this.botState === 'ATTACK') {
                    this.strafeTimer--;
                    if (this.strafeTimer <= 0) {
                        this.strafeDir *= -1;
                        this.strafeTimer = 60 + Math.random() * 80;
                    }

                    let aimX = closest.x + (closest.vx || 0) * 10;
                    let aimY = closest.y + (closest.vy || 0) * 10;
                    this.angle = Math.atan2(aimY - this.y, aimX - this.x);

                    if (this.weapon === 'melee') {
                        if (minDist > 90) {
                            moveX = Math.cos(this.angle) * speed; moveY = Math.sin(this.angle) * speed;
                        } else if (minDist < 60) {
                            moveX = -Math.cos(this.angle) * speed * 0.5; moveY = -Math.sin(this.angle) * speed * 0.5;
                        } else {
                            moveX = Math.cos(this.angle + (Math.PI / 2 * this.strafeDir)) * speed * 0.6;
                            moveY = Math.sin(this.angle + (Math.PI / 2 * this.strafeDir)) * speed * 0.6;
                        }
                        if (minDist < 100 && this.cooldown <= 0 && this.currentAmmo > 0 && this.reloadTimer <= 0) this.attack();
                    } else {
                        if (minDist < 200) {
                            moveX = -Math.cos(this.angle) * speed; moveY = -Math.sin(this.angle) * speed;
                        } else if (minDist > 350) {
                            moveX = Math.cos(this.angle) * speed; moveY = Math.sin(this.angle) * speed;
                        } else {
                            moveX = Math.cos(this.angle + (Math.PI / 2 * this.strafeDir)) * speed * 0.8;
                            moveY = Math.sin(this.angle + (Math.PI / 2 * this.strafeDir)) * speed * 0.8;
                        }

                        if (this.cooldown <= 0 && this.currentAmmo > 0 && this.reloadTimer <= 0) {
                            let accuracyError = (minDist > 300) ? (Math.random() - 0.5) * 0.15 : 0;
                            this.angle += accuracyError;
                            this.attack();
                        }
                    }
                }
            }
        }

        this.x += moveX; this.y += moveY;

        this.vx = this.x - oldX;
        this.vy = this.y - oldY;

        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
        if (this.cooldown > 0) this.cooldown--;
        if (this.attackFrame > 0) this.attackFrame--;

        if (Math.hypot(this.x - Game.zone.x, this.y - Game.zone.y) > Game.zone.radius) this.takeDamage(CONFIG.zoneDamage, "Tempestade");
        if (this.id === 'P1') this.updateUI();
    }

    attack() {
        this.attackFrame = this.maxAttackFrames;
        this.currentAmmo--;
        if (this.currentAmmo <= 0) this.reloadTimer = CONFIG.reloadFrames;

        if (this.charId === 'lyra') { this.hp = Math.min(this.maxHp, this.hp + 40); this.healAura = 20; }

        if (this.weapon === 'melee') {
            this.cooldown = 20;
            let range = (this.charId === 'silas') ? 75 : 95;
            Game.players.forEach(p => {
                if (p !== this && p.alive) {
                    let d = Math.hypot(p.x - this.x, p.y - this.y);
                    let angT = Math.atan2(p.y - this.y, p.x - this.x);
                    if (d < range && Math.abs(angT - this.angle) < Math.PI / 2) {
                        p.takeDamage(CONFIG.meleeDamage, this.name);
                        p.x += Math.cos(angT) * 40; p.y += Math.sin(angT) * 40;
                    }
                }
            });
        } else {
            this.cooldown = 35;
            Game.projectiles.push(new Projectile(this.x, this.y, this.angle, this.color, this.id, this.name, this.charId));
        }
    }

    takeDamage(amount, killer) {
        if (!this.alive) return;
        this.hp -= amount;
        this.lastDamageTimer = 0;
        if (this.hp <= 0) {
            this.alive = false; Game.eliminatedOrder.push({ name: this.name, color: this.color });
            Game.addKillMsg(this.name, killer, this.color);
            if (this.id === 'P1') Game.startSpectating();
            Game.checkWin();
        }
    }

    updateUI() {
        let hpPercent = Math.max(0, (this.hp / this.maxHp) * 100);
        elements.p1Hp.style.width = hpPercent + '%';

        if (hpPercent <= 30) {
            elements.p1Hp.style.background = "#ff3d68";
            elements.p1Hp.style.boxShadow = "0 0 15px #ff3d68";
        } else {
            elements.p1Hp.style.background = "#00d2ff";
            elements.p1Hp.style.boxShadow = "none";
        }

        const pips = elements.p1PipsContainer.children;
        if (this.reloadTimer > 0) {
            elements.p1EnergyText.innerText = "WAIT"; elements.p1Reloader.classList.remove('hidden');
            let pct = (1 - (this.reloadTimer / CONFIG.reloadFrames)) * 100;
            elements.p1LoaderInner.style.background = `conic-gradient(#00ff88 ${pct}%, transparent ${pct}%)`;
            for (let i = 0; i < this.maxAmmo; i++) if (pips[i]) pips[i].className = 'pip consumed';
        } else {
            elements.p1EnergyText.innerText = `${this.currentAmmo}/${this.maxAmmo}`; elements.p1Reloader.classList.add('hidden');
            for (let i = 0; i < this.maxAmmo; i++) if (pips[i]) pips[i].className = i < this.currentAmmo ? 'pip filled' : 'pip';
        }
    }

    draw() {
        if (!this.alive) return;

        if (this.healAura > 0) { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 15, 0, Math.PI * 2); ctx.fillStyle = "rgba(255, 215, 0, 0.4)"; ctx.fill(); this.healAura--; }

        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill(); ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.stroke();

        ctx.save();
        ctx.translate(this.x, this.y);
        let swing = 0; if (this.attackFrame > 0 && this.weapon === 'melee') swing = (1 - (this.attackFrame / this.maxAttackFrames)) * Math.PI - Math.PI / 2;
        ctx.rotate(this.angle + swing);

        if (this.charId === 'kaelen') { ctx.beginPath(); ctx.arc(0, 0, this.radius + 4, Math.PI / 2, Math.PI * 1.5); ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 6; ctx.stroke(); }

        if (this.weapon === 'melee') {
            if (this.charId === 'silas') {
                ctx.fillStyle = "#444"; ctx.fillRect(this.radius - 2, -15, 6, 4); ctx.fillRect(this.radius - 2, 11, 6, 4);
                ctx.fillStyle = "silver";
                ctx.beginPath(); ctx.moveTo(this.radius + 4, -16); ctx.lineTo(this.radius + 25, -13); ctx.lineTo(this.radius + 4, -10); ctx.fill();
                ctx.beginPath(); ctx.moveTo(this.radius + 4, 10); ctx.lineTo(this.radius + 25, 13); ctx.lineTo(this.radius + 4, 16); ctx.fill();
                if (this.attackFrame > 0) { ctx.beginPath(); ctx.arc(0, 0, 45, -0.8, 0.8); ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 3; ctx.stroke(); }
            } else {
                ctx.fillStyle = "#444"; ctx.fillRect(this.radius - 2, -3, 8, 6);
                ctx.fillStyle = "#FFD700"; ctx.fillRect(this.radius + 6, -12, 4, 24);
                ctx.shadowBlur = 15; ctx.shadowColor = this.color; ctx.fillStyle = "white";
                ctx.beginPath(); ctx.moveTo(this.radius + 10, -5); ctx.lineTo(this.radius + 65, -2); ctx.lineTo(this.radius + 65, 2); ctx.lineTo(this.radius + 10, 5); ctx.fill(); ctx.shadowBlur = 0;
                if (this.attackFrame > 0) { ctx.beginPath(); ctx.arc(0, 0, 80, -0.6, 0.6); ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 4; ctx.stroke(); }
            }
        } else {
            if (this.charId === 'elara') {
                ctx.strokeStyle = "#8B4513"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(this.radius - 5, 0, 20, -Math.PI / 2.5, Math.PI / 2.5); ctx.stroke();
                ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(this.radius + 1, -19);
                if (this.attackFrame > 0) { ctx.lineTo(this.radius - 15, 0); } else { ctx.lineTo(this.radius + 1, 19); } ctx.stroke();
            } else if (this.charId === 'malacor' || this.charId === 'morwen') {
                ctx.fillStyle = "#5c3a21"; ctx.fillRect(this.radius - 5, -25, 4, 50);
                ctx.shadowBlur = 15; ctx.shadowColor = this.color; ctx.fillStyle = this.color;
                ctx.beginPath(); ctx.arc(this.radius - 3, -25, 7, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
                if (this.attackFrame > 0) { ctx.beginPath(); ctx.arc(this.radius - 3, -25, 15, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fill(); }
            } else { ctx.fillStyle = "#555"; ctx.fillRect(this.radius, -5, 25, 10); }
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
    active: true, players: [], projectiles: [], zone: { x: 0, y: 0, radius: 0 }, eliminatedOrder: [], isSpectating: false, shakeFrames: 0,
    frameCount: 0,

    init() {
        this.active = true; // Garante que o jogo está ativo ao iniciar
        this.zone = { x: canvas.width / 2, y: canvas.height / 2, radius: Math.max(canvas.width, canvas.height) * 0.45 };
        const cX = canvas.width / 2; const cY = canvas.height / 2;

        let offset = Math.min(canvas.width, canvas.height) * 0.25;

        this.players = [
            new Player('P1', savedData.nickname, savedData.color, cX, cY, false, savedData.weapon, { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }, savedData.charId),
            new Player('B1', 'Malacor_Bot', '#B19CD9', cX - offset, cY - offset, true, 'ranged', null, 'malacor'),
            new Player('B2', 'Kaelen_Bot', '#00d2ff', cX + offset, cY - offset, true, 'melee', null, 'kaelen'),
            new Player('B3', 'Elara_Bot', '#A7FF83', cX - offset, cY + offset, true, 'ranged', null, 'elara'),
            new Player('B4', 'Silas_Bot', '#ffffff', cX + offset, cY + offset, true, 'melee', null, 'silas'),
            new Player('B5', 'Morwen_Bot', '#ff3d68', cX + (offset * 1.2), cY, true, 'ranged', null, 'morwen')
        ];

        elements.playerNameHud.innerText = savedData.nickname;
        let wName = "ARMA";
        if (savedData.charId === 'kaelen') wName = "ESPADA LENDÁRIA"; if (savedData.charId === 'elara') wName = "ARCO DA FLORESTA"; if (savedData.charId === 'malacor') wName = "CAJADO DO VAZIO";
        if (savedData.charId === 'lyra') wName = "CETRO DIVINO"; if (savedData.charId === 'silas') wName = "ADAGAS DA NÉVOA"; if (savedData.charId === 'morwen') wName = "CAJADO ELEMENTAL";
        elements.weaponNameHud.innerText = wName;

        const p1 = this.players[0]; elements.p1PipsContainer.innerHTML = '';
        for (let i = 0; i < p1.maxAmmo; i++) { let p = document.createElement('div'); p.className = 'pip filled'; elements.p1PipsContainer.appendChild(p); }
        this.loop();
    },

    startSpectating() { this.isSpectating = true; elements.playerHud.classList.add('hidden'); elements.spectatorUI.classList.remove('hidden'); },

    showWarning(msg, color) {
        if (elements.spellWarning) { elements.spellWarning.innerText = msg; elements.spellWarning.style.background = color; elements.spellWarning.classList.remove('hidden'); setTimeout(() => elements.spellWarning.classList.add('hidden'), 2000); }
    },

    update() {
        if (!this.active) return;
        this.frameCount++;

        if (this.frameCount < CONFIG.zoneDelayFrames) {
            let secondsLeft = Math.ceil((CONFIG.zoneDelayFrames - this.frameCount) / 60);
            if (elements.zoneHud) elements.zoneHud.innerHTML = `<i class="fas fa-radiation-alt" style="color: #00d2ff;"></i> FECHA EM: <span>${secondsLeft}s</span>`;
        } else {
            if (elements.zoneHud) elements.zoneHud.innerHTML = `<i class="fas fa-radiation-alt" style="color: #ff3d68;"></i> ZONA ENCOLHENDO!`;
            if (this.zone.radius > 110) this.zone.radius -= CONFIG.zoneShrinkSpeed;
        }

        this.players.forEach(p => p.update());

        this.projectiles.forEach((t, i) => {
            t.update();
            this.players.forEach(p => {
                if (p.alive && p.id !== t.ownerId && Math.hypot(p.x - t.x, p.y - t.y) < p.radius + t.radius) {
                    p.takeDamage(CONFIG.rangedDamage, t.ownerName);
                    if (t.charId === 'malacor' && p.id === 'P1') { Game.shakeFrames = 120; Game.showWarning("⚠️ MALDIÇÃO DE MALACOR! ⚠️", "rgba(177, 156, 217, 0.9)"); }
                    t.life = 0;
                }
            });
            if (t.life <= 0) this.projectiles.splice(i, 1);
        });
    },

    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        if (this.shakeFrames > 0) { ctx.translate(Math.random() * 10 - 5, Math.random() * 10 - 5); this.shakeFrames--; }
        ctx.fillStyle = "rgba(10, 0, 20, 0.75)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(this.zone.x, this.zone.y, this.zone.radius, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath(); ctx.arc(this.zone.x, this.zone.y, this.zone.radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.frameCount < CONFIG.zoneDelayFrames ? "#00d2ff" : "#ff3d68";
        ctx.lineWidth = 5; ctx.stroke();
        this.projectiles.forEach(p => p.draw()); this.players.forEach(p => p.draw());
        ctx.restore();
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

// ==========================================
// GERENCIADOR DE CARREGAMENTO (LOADING SCREEN - 15 SEGUNDOS)
// ==========================================
const LoadingManager = {
    progress: 0,
    bar: document.getElementById('loading-bar-fill'),
    text: document.getElementById('loading-text'),
    screen: document.getElementById('loading-screen'),

    start() {
        Game.active = false;

        // Atualiza a cada 50ms. 
        // 15.000ms (15s) / 50ms = 300 atualizações necessárias.
        // 100% / 300 = 0.333% de incremento por atualização.
        const interval = setInterval(() => {
            this.progress += 0.333;

            if (this.progress >= 100) {
                this.progress = 100;
                clearInterval(interval);
                this.updateUI();

                setTimeout(() => this.finish(), 1000);
            } else {
                this.updateUI();
            }
        }, 50);
    },

    updateUI() {
        if (this.bar && this.text) {
            this.bar.style.width = this.progress + '%';
            // Usa Math.floor para esconder os números quebrados (ex: 33.333%)
            this.text.innerText = `CARREGANDO ARENA... ${Math.floor(this.progress)}%`;
        }
    },

    finish() {
        if (this.screen) {
            this.screen.style.opacity = '0';
            this.screen.style.transition = 'opacity 0.5s ease';

            setTimeout(() => {
                this.screen.classList.add('hidden');
                // EM VEZ DE Game.init(), CHAMAMOS A CONTAGEM:
                CountdownManager.start();
            }, 500);
        } else {
            CountdownManager.start();
        }
    }
};

const CountdownManager = {
    counter: 5,
    overlay: document.getElementById('countdown-overlay'),
    numberEl: document.getElementById('countdown-number'),

    start() {
        this.overlay.classList.remove('hidden');
        this.run();
    },

    run() {
        if (this.counter > 0) {
            this.numberEl.innerText = this.counter;
            this.numberEl.style.animation = 'none'; // Reseta animação
            this.numberEl.offsetHeight; // Trigger reflow
            this.numberEl.style.animation = 'countdownPulse 1s infinite';

            this.counter--;
            setTimeout(() => this.run(), 1000);
        } else {
            // Quando chega a zero, mostra "BATALHA!"
            this.numberEl.innerText = "BATALHA!";
            this.numberEl.classList.add('start-text');

            setTimeout(() => {
                this.overlay.classList.add('hidden');
                Game.init(); // AGORA SIM, O JOGO COMEÇA!
            }, 1000);
        }
    }
};

// Inicia o carregamento ao abrir a página
window.onload = () => LoadingManager.start();