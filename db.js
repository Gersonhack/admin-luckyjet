// Configuração do Firebase
// IMPORTANTE: Substitua estas configurações pelas suas próprias configurações do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyASMsT_cApFPFwyV4zdB_lIUbipYe5z7Z8",
  authDomain: "diom-luckyjet.firebaseapp.com",
  databaseURL: "https://diom-luckyjet-default-rtdb.firebaseio.com",
  projectId: "diom-luckyjet",
  storageBucket: "diom-luckyjet.firebasestorage.app",
  messagingSenderId: "755891064514",
  appId: "1:755891064514:web:86cfc95ef99fea86ee355b"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referências para os serviços do Firebase
const auth = firebase.auth();
const database = firebase.database();


// Adicione estas linhas após a inicialização do Firebase

// Testar conexão com Firebase
async function testFirebaseConnection() {
    try {
        console.log('Testando conexão com Firebase...');
        
        // Testar acesso ao banco de dados
        const testRef = database.ref('.info/connected');
        testRef.on('value', (snap) => {
            if (snap.val() === true) {
                console.log('✅ Firebase Database conectado');
            } else {
                console.log('❌ Firebase Database desconectado');
            }
        });
        
        // Verificar se os nós existem
        const nodes = ['usuarios', 'diom'];
        for (const node of nodes) {
            const snapshot = await database.ref(node).once('value');
            const count = snapshot.numChildren();
            console.log(`📊 Nó ${node}: ${count} registros encontrados`);
            
            if (count > 0) {
                // Mostrar alguns dados para debug
                const data = snapshot.val();
                const firstKey = Object.keys(data)[0];
                console.log(`   Exemplo do primeiro registro:`, data[firstKey]);
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao testar conexão Firebase:', error);
        return false;
    }
}

// Atualize a função de inicialização para testar a conexão
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Sistema Firebase inicializado');
    
    // Testar conexão
    const isConnected = await testFirebaseConnection();
    
    if (isConnected) {
        ExpirationChecker.startPeriodicCheck();
    } else {
        Utils.showMessage('Erro na conexão com o banco de dados', 'error');
    }
});

// Configurações do sistema
const ADMIN_EMAIL = "root@gmail.com"; // Altere para o email do administrador
const ADMIN_PASSWORD = "admin123"; // Altere para a senha do administrador

// Constantes do sistema
const USER_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  NO_ACCESS: 'no_access',
  INACTIVE: 'inactive'
};

const ACCESS_PLANS = {
  '1': { name: '1 Dia', days: 1 },
  '3': { name: '3 Dias', days: 3 },
  '7': { name: '1 Semana', days: 7 },
  '14': { name: '2 Semanas', days: 14 },
  '30': { name: '1 Mês', days: 30 },
  'permanent': { name: 'Permanente', days: null }
};

// Funções utilitárias globais
window.Utils = {
    // Mostrar mensagem para o usuário
    showMessage: function(message, type = 'info') {
        const messageDiv = document.getElementById('message');
        if (!messageDiv) return;
        
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    },

    // Mostrar/esconder loading
    showLoading: function(show = true) {
        const loading = document.getElementById('loading');
        if (!loading) return;
        loading.style.display = show ? 'flex' : 'none';
    },

    // Formatar data
    formatDate: function(timestamp) {
        if (!timestamp) return '---';
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return '---';
            
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return '---';
        }
    },

    // Formatar data curta
    formatDateShort: function(timestamp) {
        if (!timestamp) return 'Nunca';
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return 'Nunca';
            
            const now = new Date();
            const diffTime = now - date;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Hoje';
            if (diffDays === 1) return 'Ontem';
            if (diffDays < 7) return `${diffDays} dias atrás`;
            
            const day = date.getDate().toString().padStart(2, '0');
            const month = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
            const year = date.getFullYear();
            return `${day} ${month}, ${year}`;
        } catch (e) {
            return 'Nunca';
        }
    },

    // Calcular dias restantes
    calculateDaysRemaining: function(expirationDate) {
        if (!expirationDate) return 'Permanente';
        try {
            const now = new Date().getTime();
            const expiration = new Date(expirationDate).getTime();
            if (isNaN(expiration)) return 'Permanente';
            
            const diffTime = expiration - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 0 ? `${diffDays} dias` : 'Expirado';
        } catch (e) {
            return 'Permanente';
        }
    },

    // Verificar se o acesso expirou
    isAccessExpired: function(expirationDate) {
        if (!expirationDate) return false;
        try {
            return new Date().getTime() > new Date(expirationDate).getTime();
        } catch (e) {
            return false;
        }
    },

    // Calcular data de expiração baseada no plano
    calculateExpirationDate: function(planValue) {
        if (planValue === 'permanent' || !planValue) {
            return null;
        }
        
        const days = parseInt(planValue);
        if (isNaN(days) || days <= 0) {
            return null;
        }
        
        const now = new Date();
        const expirationDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
        return expirationDate.toISOString();
    },

    // Gerar ID único para usuário
    generateUserId: function() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `user_${timestamp}_${random}`;
    },

    // Validar email
    validateEmail: function(email) {
        if (!email || typeof email !== 'string') return false;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email.trim());
    },

    // Limpar formulário
    clearForm: function(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    },

    // Obter iniciais do nome
    getInitials: function(name) {
        if (!name || name === 'N/A' || name.trim() === '') return '?';
        return name.split(' ')
                   .map(n => n[0])
                   .join('')
                   .toUpperCase()
                   .substring(0, 2);
    },

    // Determinar status do usuário
    getUserStatus: function(user) {
        if (!user) return USER_STATUS.INACTIVE;
        
        const isExpired = Utils.isAccessExpired(user.accessExpiration);
        
        if (user.hasAccess && !isExpired) {
            return USER_STATUS.ACTIVE;
        } else if (isExpired) {
            return USER_STATUS.EXPIRED;
        } else {
            return USER_STATUS.NO_ACCESS;
        }
    },

    // Obter classe CSS para status
    getStatusClass: function(user) {
        const status = Utils.getUserStatus(user);
        switch(status) {
            case USER_STATUS.ACTIVE: return 'status-active';
            case USER_STATUS.EXPIRED: return 'status-expired';
            case USER_STATUS.NO_ACCESS: return 'status-no-access';
            default: return 'status-inactive';
        }
    },

    // Obter texto do status
    getStatusText: function(user) {
        const status = Utils.getUserStatus(user);
        const daysRemaining = Utils.calculateDaysRemaining(user.accessExpiration);
        
        switch(status) {
            case USER_STATUS.ACTIVE:
                return user.accessPlan === 'permanent' ? 'Ativo - Permanente' : `Ativo - ${daysRemaining}`;
            case USER_STATUS.EXPIRED:
                return 'Expirado';
            case USER_STATUS.NO_ACCESS:
                return 'Sem acesso';
            default:
                return 'Inativo';
        }
    },

    // Obter plano formatado
    getPlanName: function(planValue) {
        if (!planValue) return 'Free';
        if (planValue === 'permanent') return 'Premium';
        if (planValue === '30' || planValue === 'enterprise') return 'Enterprise';
        if (['1', '3', '7', '14', 'standard'].includes(planValue)) return 'Standard';
        return 'Free';
    },

    // Obter classe CSS para plano
    getPlanClass: function(planValue) {
        const planName = Utils.getPlanName(planValue);
        switch(planName) {
            case 'Premium': return 'plan-premium';
            case 'Enterprise': return 'plan-enterprise';
            case 'Standard': return 'plan-standard';
            default: return '';
        }
    },

    // Verificar se usuário tem nome válido
    hasValidName: function(user) {
        return user && user.name && user.name !== 'N/A' && user.name.trim() !== '';
    },

    // Sanitizar dados do usuário
    sanitizeUserData: function(data) {
        const sanitized = {};
        
        // Campos obrigatórios
        sanitized.email = (data.email || '').trim().toLowerCase();
        sanitized.name = (data.name || '').trim();
        sanitized.accessPlan = data.accessPlan || null;
        sanitized.accessExpiration = data.accessExpiration || null;
        sanitized.hasAccess = Boolean(data.hasAccess);
        sanitized.createdAt = data.createdAt || new Date().toISOString();
        sanitized.updatedAt = new Date().toISOString();
        sanitized.firebaseUid = data.firebaseUid || null;
        sanitized.lastAccess = data.lastAccess || new Date().toISOString();
        
        return sanitized;
    },

    // Validar dados do usuário antes de salvar
    validateUserData: function(data) {
        const errors = [];
        
        if (!data.email || !Utils.validateEmail(data.email)) {
            errors.push('Email inválido');
        }
        
        if (!data.name || data.name.trim() === '') {
            errors.push('Nome é obrigatório');
        }
        
        if (!data.accessPlan && data.hasAccess) {
            errors.push('Plano de acesso é obrigatório para usuários com acesso');
        }
        
        return errors;
    }
};

// Sistema de verificação automática de expiração
window.ExpirationChecker = {
    // Verificar e remover acessos expirados
    checkExpiredAccess: async function() {
        try {
            console.log('Iniciando verificação de acessos expirados...');
            
            // Verificar em ambos os nós
            const nodes = ['usuarios', 'diom'];
            let totalExpired = 0;
            const updates = {};
            
            for (const node of nodes) {
                const usersRef = database.ref(node);
                const snapshot = await usersRef.once('value');
                const users = snapshot.val();
                
                if (users) {
                    Object.keys(users).forEach(userId => {
                        const user = users[userId];
                        if (user.accessExpiration && Utils.isAccessExpired(user.accessExpiration)) {
                            // Atualizar status do usuário
                            updates[`${node}/${userId}/hasAccess`] = false;
                            updates[`${node}/${userId}/updatedAt`] = new Date().toISOString();
                            totalExpired++;
                        }
                    });
                }
            }
            
            if (Object.keys(updates).length > 0) {
                await database.ref().update(updates);
                console.log(`${totalExpired} acessos expirados foram desativados automaticamente.`);
            }
            
            return totalExpired;
        } catch (error) {
            console.error('Erro ao verificar acessos expirados:', error);
            return 0;
        }
    },

    // Verificar acessos que irão expirar em breve (próximos 3 dias)
    checkUpcomingExpirations: async function() {
        try {
            const usersRef = database.ref('diom');
            const snapshot = await usersRef.orderByChild('hasAccess').equalTo(true).once('value');
            const users = snapshot.val();
            const now = new Date();
            const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
            
            const upcomingExpirations = [];
            
            if (users) {
                Object.keys(users).forEach(userId => {
                    const user = users[userId];
                    if (user.accessExpiration && !Utils.isAccessExpired(user.accessExpiration)) {
                        const expDate = new Date(user.accessExpiration);
                        if (expDate <= threeDaysFromNow) {
                            const daysLeft = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
                            upcomingExpirations.push({
                                userId,
                                name: user.name,
                                email: user.email,
                                expirationDate: user.accessExpiration,
                                daysLeft
                            });
                        }
                    }
                });
            }
            
            return upcomingExpirations;
        } catch (error) {
            console.error('Erro ao verificar expirações próximas:', error);
            return [];
        }
    },

    // Iniciar verificação periódica
    startPeriodicCheck: function() {
        // Verificar imediatamente
        this.checkExpiredAccess();
        
        // Verificar expirações próximas
        this.checkUpcomingExpirations().then(expirations => {
            if (expirations.length > 0) {
                console.log(`${expirations.length} usuários com acesso expirando em breve:`);
                expirations.forEach(u => {
                    console.log(`- ${u.name} (${u.email}): ${u.daysLeft} dias restantes`);
                });
            }
        });
        
        // Verificar a cada hora
        setInterval(() => {
            this.checkExpiredAccess();
        }, 3600000); // 1 hora
        
        // Verificar expirações próximas a cada 6 horas
        setInterval(() => {
            this.checkUpcomingExpirations();
        }, 21600000); // 6 horas
    }
};

// Inicializar quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Sistema Firebase inicializado');
        ExpirationChecker.startPeriodicCheck();
    });
} else {
    console.log('Sistema Firebase inicializado (DOM já carregado)');
    ExpirationChecker.startPeriodicCheck();
}

// Exportar para uso global
window.auth = auth;
window.database = database;
window.ADMIN_EMAIL = ADMIN_EMAIL;
window.ADMIN_PASSWORD = ADMIN_PASSWORD;