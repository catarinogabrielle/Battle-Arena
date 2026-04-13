// ==========================================
// API WRAPPER - YGAMING INTEGRATION
// ==========================================

const YG_CONFIG = {
    // URL da API de Produção da YGaming
    BASE_URL: 'https://ygaming-production.up.railway.app'
};

const YGamingAPI = {

    /**
     * Tenta fazer o login direto com e-mail e senha.
     * Chama a rota externa /api/auth/login.
     */
    async login(email, password) {
        try {
            const response = await fetch(`${YG_CONFIG.BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            // Retorna o payload JSON da API (que contém success, message, data, etc.)
            const result = await response.json();
            return result;

        } catch (error) {
            console.error("Erro na comunicação com a API YGaming:", error);
            return { success: false, message: "Falha na conexão com o servidor da YGaming." };
        }
    },

    /**
     * Salva a sessão do usuário (tokens e dados principais) no LocalStorage.
     * Extrai os dados usando a estrutura que a API retornou.
     */
    saveSession(apiData) {
        // A API retorna o token dentro de data.accessToken
        if (apiData.data && apiData.data.accessToken) {
            localStorage.setItem('ygaming_token', apiData.data.accessToken);
        }

        // E os dados do usuário ficam dentro de data.user
        if (apiData.data && apiData.data.user) {
            const user = apiData.data.user;
            const playerInfo = {
                id: user._id || user.id,
                username: user.username,
                email: user.email,
                coins: user.coins || 0,
                level: user.level || 1,
                avatar: user.avatar || ''
            };

            localStorage.setItem('arenaPlayerInfo', JSON.stringify(playerInfo));
        }
    },

    /**
     * Recupera os dados básicos do jogador logado.
     */
    getCurrentPlayer() {
        const data = localStorage.getItem('arenaPlayerInfo');
        return data ? JSON.parse(data) : null;
    },

    /**
     * Recupera o Token de acesso (JWT).
     */
    getToken() {
        return localStorage.getItem('ygaming_token');
    },

    /**
     * Faz o logout (limpa os dados e redireciona).
     */
    logout() {
        localStorage.removeItem('ygaming_token');
        localStorage.removeItem('arenaPlayerInfo');
        localStorage.removeItem('currentSessionId'); // Limpa a sessão da partida, se houver
        window.location.href = 'index.html'; // Volta para a tela de login
    },

    /**
     * Cria uma nova sessão de jogo ranqueado.
     * O Backend local atuará como proxy.
     */
    async createSession(entryFee) {
        try {
            // OBS: Esta chamada deve ir para o seu backend local (Proxy) 
            // e não direto para a YGaming, conforme a sua documentação de segurança.
            const response = await fetch('/api/external-game/session/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({
                    mode: "ranked",
                    entryFee: entryFee,
                    minPlayers: 2,
                    maxPlayers: 6,
                    prizePoolPercentage: 100,
                    metadata: {
                        roomName: "Arena Mortal",
                        gameName: "Last One Standing"
                    }
                })
            });

            return await response.json();
        } catch (error) {
            console.error("Erro ao criar sessão:", error);
            return { success: false, message: "Erro de comunicação com o servidor local." };
        }
    }
};