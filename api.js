// Painel Administrativo Firebase - Sistema de Produção
// Gerencia usuários dos nós /usuarios e /diom

class AdminPanel {
    constructor() {
        this.currentAdmin = null;
        this.users = new Map(); // Usar Map para melhor performance
        this.filteredUsers = new Map();
        this.currentPage = 1;
        this.usersPerPage = 10;
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.isLoading = false;
        this.stats = {
            total: 0,
            active: 0,
            expired: 0,
            noAccess: 0,
            premium: 0
        };
        
        this.init();
    }

    async init() {
        try {
            console.log('Inicializando painel administrativo...');
            
            // Configurar tema
            this.setupTheme();
            
            // Verificar autenticação
            await this.setupAuthListener();
            
            // Configurar eventos
            this.setupEventListeners();
            
            // Configurar busca
            this.setupSearch();
            
            // Configurar paginação
            this.setupPagination();
            
            console.log('Painel administrativo inicializado com sucesso');
        } catch (error) {
            console.error('Erro ao inicializar painel:', error);
            Utils.showMessage('Erro ao inicializar sistema', 'error');
        }
    }

    setupTheme() {
        // Carregar tema salvo
        const savedTheme = localStorage.getItem('admin-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Configurar botão de tema
        const themeBtn = document.querySelector('.theme-toggle, [data-action="toggle-theme"]');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.toggleTheme());
        }
    }

    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('admin-theme', newTheme);
        
        // Atualizar ícone
        const icon = document.getElementById('theme-icon');
        if (icon) {
            icon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }

    async setupAuthListener() {
        auth.onAuthStateChanged(async (user) => {
            if (user && user.email === ADMIN_EMAIL) {
                this.currentAdmin = user;
                await this.handleSuccessfulLogin();
            } else {
                this.handleLogout();
            }
        });
    }

    async handleSuccessfulLogin() {
        try {
            console.log('✅ Login realizado com sucesso');
            console.log(`👤 Admin: ${this.currentAdmin.email}`);
            
            // Atualizar interface
            this.showMainPanel();
            
            // Atualizar informações do admin
            this.updateAdminInfo();
            
            // Carregar dados
            await this.loadAllUsers();
            
            // Iniciar listeners em tempo real
            this.setupRealtimeListeners();
            
            // Verificar se há dados
            if (this.users.size === 0) {
                // Mostrar modal de boas-vindas
                Swal.fire({
                    icon: 'info',
                    title: 'Bem-vindo ao Painel!',
                    html: `
                        <div class="text-left">
                            <p>Seu painel administrativo está pronto!</p>
                            <p class="text-sm text-gray-300 dark:text-gray-400 mt-2">
                                <strong>Nenhum usuário encontrado</strong> no banco de dados.
                            </p>
                            <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mt-3">
                                <p class="text-sm">
                                    <strong>Para começar:</strong>
                                </p>
                                <ol class="list-decimal pl-4 mt-1 text-sm">
                                    <li>Clique em "Adicionar Usuário"</li>
                                    <li>Preencha os dados do novo usuário</li>
                                    <li>O sistema irá sincronizar automaticamente</li>
                                </ol>
                            </div>
                        </div>
                    `,
                    confirmButtonText: 'Adicionar Primeiro Usuário',
                    confirmButtonColor: '#3b82f6',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    showCancelButton: true,
                    cancelButtonText: 'Entendi'
                }).then((result) => {
                    if (result.isConfirmed) {
                        this.showAddUserModal();
                    }
                });
            }
            
        } catch (error) {
            console.error('Erro após login:', error);
            Utils.showMessage('Erro ao carregar dados do sistema', 'error');
            
            // Tentar carregar dados de exemplo em caso de erro
       //     this.loadSampleDataForDemo();
       await this.loadAllUsers();
        }
    }

    showMainPanel() {
    const loginSection = document.getElementById('login-section');
    const mainPanel = document.getElementById('admin-panel');
    
    if (loginSection) loginSection.style.display = 'none';
    if (mainPanel) {
        mainPanel.style.display = 'block';
        mainPanel.classList.remove('hidden'); // REMOVE ESTA LINHA
    }
    
    // Mostrar mensagem de boas-vindas
    setTimeout(() => {
        Utils.showMessage(`Bem-vindo, ${this.currentAdmin.email}`, 'success');
    }, 500);
}

    showLoginSection() {
    const loginSection = document.getElementById('login-section');
    const mainPanel = document.getElementById('admin-panel');
    
    if (loginSection) {
        loginSection.style.display = 'flex';
        loginSection.classList.remove('hidden');
    }
    if (mainPanel) {
        mainPanel.style.display = 'none';
        mainPanel.classList.add('hidden');
    }
}

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Adicionar usuário
        const addUserBtn = document.querySelector('.btn-primary, [data-action="add-user"]');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => {
                this.showAddUserModal();
            });
        }

        // Formulário de adicionar usuário
        const addUserForm = document.getElementById('add-user-form');
        if (addUserForm) {
            addUserForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddUser();
            });
        }

        // Botão de filtros
        const filterBtn = document.querySelector('.btn-secondary, [data-action="show-filters"]');
        if (filterBtn) {
            filterBtn.addEventListener('click', () => {
                this.showFiltersModal();
            });
        }

        // Botão de exportar
        const exportBtn = document.querySelector('[data-action="export-data"]');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportUsersData();
            });
        }

        // Botão de atualizar
        const refreshBtn = document.querySelector('[data-action="refresh-data"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }
    }

    setupSearch() {
        const searchInput = document.querySelector('.search-input, [data-search-input]');
        if (searchInput) {
            // Debounce para busca
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentSearch = e.target.value.trim();
                    this.currentPage = 1;
                    this.filterAndRenderUsers();
                }, 300);
            });
        }
    }

    setupPagination() {
        const paginationContainer = document.querySelector('.pagination-buttons, [data-pagination]');
        if (paginationContainer) {
            paginationContainer.addEventListener('click', (e) => {
                const button = e.target.closest('.page-btn');
                if (!button) return;

                if (button.dataset.action === 'prev') {
                    this.previousPage();
                } else if (button.dataset.action === 'next') {
                    this.nextPage();
                } else if (button.dataset.page) {
                    const page = parseInt(button.dataset.page);
                    this.goToPage(page);
                } else {
                    const page = parseInt(button.textContent);
                    if (!isNaN(page)) {
                        this.goToPage(page);
                    }
                }
            });
        }
    }

    setupRealtimeListeners() {
        // Escutar mudanças em tempo real em ambos os nós
        const nodes = ['usuarios', 'diom'];
        
        nodes.forEach(node => {
            database.ref(node).on('value', (snapshot) => {
                this.processNodeData(node, snapshot.val());
            }, (error) => {
                console.error(`Erro ao escutar nó ${node}:`, error);
            });
        });
    }

    processNodeData(node, data) {
        if (!data) return;

        const users = this.users;
        let hasChanges = false;

        // Processar dados do nó
        Object.keys(data).forEach(userId => {
            const userData = data[userId];
            const userKey = `${node}_${userId}`;
            
            if (!users.has(userKey) || JSON.stringify(users.get(userKey)) !== JSON.stringify(userData)) {
                users.set(userKey, {
                    ...userData,
                    _id: userId,
                    _node: node,
                    _key: userKey
                });
                hasChanges = true;
            }
        });

        // Remover usuários deletados
        const currentKeys = new Set(Object.keys(data).map(id => `${node}_${id}`));
        users.forEach((user, key) => {
            if (user._node === node && !currentKeys.has(key)) {
                users.delete(key);
                hasChanges = true;
            }
        });

        if (hasChanges) {
            this.updateStatistics();
            this.filterAndRenderUsers();
        }
    }

    async loadAllUsers() {
        this.isLoading = true;
        Utils.showLoading(true);

        try {
            console.log('🔍 Iniciando carregamento de usuários...');
            
            // Limpar dados atuais
            this.users.clear();
            
            // Carregar de ambos os nós
            const nodes = ['usuarios', 'diom'];
            let totalLoaded = 0;
            
            for (const node of nodes) {
                console.log(`📂 Carregando nó: ${node}`);
                
                try {
                    const snapshot = await database.ref(node).once('value');
                    const data = snapshot.val();
                    
                    if (data) {
                        const userCount = Object.keys(data).length;
                        console.log(`   ✅ ${node}: ${userCount} usuários encontrados`);
                        
                        Object.keys(data).forEach(userId => {
                            const userData = data[userId];
                            const userKey = `${node}_${userId}`;
                            
                            // Validar dados mínimos do usuário
                            if (userData && (userData.email || userData.name)) {
                                this.users.set(userKey, {
                                    ...userData,
                                    _id: userId,
                                    _node: node,
                                    _key: userKey
                                });
                                totalLoaded++;
                            } else {
                                console.warn(`   ⚠️ Usuário inválido em ${node}/${userId}:`, userData);
                            }
                        });
                    } else {
                        console.log(`   ℹ️ Nó ${node} está vazio`);
                    }
                    
                } catch (error) {
                    console.error(`   ❌ Erro ao carregar nó ${node}:`, error);
                }
            }
            
            console.log(`✅ Total de usuários carregados: ${totalLoaded}`);
            
            if (totalLoaded === 0) {
                console.warn('⚠️ Nenhum usuário encontrado. Verifique:');
                console.warn('   1. Se os nós /usuarios e /diom existem');
                console.warn('   2. Se há dados nos nós');
                console.warn('   3. Se as credenciais do admin estão corretas');
                
                // Mostrar mensagem amigável
                Utils.showMessage('Nenhum usuário encontrado no sistema. Comece adicionando um novo usuário.', 'warning');
                
                // Carregar dados de exemplo para demonstração
              //  await this.loadSampleDataForDemo();
              await this.loadAllUsers();
            } else {
                this.updateStatistics();
                this.filterAndRenderUsers();
                Utils.showMessage(`Sistema carregado com ${totalLoaded} usuários`, 'success');
            }
            
        } catch (error) {
            console.error('❌ Erro crítico ao carregar usuários:', error);
            Utils.showMessage('Erro ao carregar usuários do sistema', 'error');
            
            // Mostrar detalhes do erro para debug
            Swal.fire({
                icon: 'error',
                title: 'Erro de Conexão',
                html: `
                    <div class="text-left">
                        <p>Não foi possível carregar os usuários:</p>
                        <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded mt-2 text-xs">${error.message}</pre>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mt-3">
                            Verifique:
                            <ul class="list-disc pl-4 mt-1">
                                <li>Conexão com a internet</li>
                                <li>Configurações do Firebase</li>
                                <li>Permissões do banco de dados</li>
                            </ul>
                        </p>
                    </div>
                `,
                confirmButtonColor: '#3b82f6',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)'
            });
        } finally {
            this.isLoading = false;
            Utils.showLoading(false);
        }
    }

    // Mpara carregar dados de exemplo (apenas para debug)
  //  async loadSampleDataForDemo() {   }

    updateStatistics() {
        const stats = {
            total: 0,
            active: 0,
            expired: 0,
            noAccess: 0,
            premium: 0
        };

        this.users.forEach(user => {
            stats.total++;
            
            const status = Utils.getUserStatus(user);
            switch(status) {
                case USER_STATUS.ACTIVE:
                    stats.active++;
                    if (user.accessPlan === 'permanent' || user.accessPlan === '30') {
                        stats.premium++;
                    }
                    break;
                case USER_STATUS.EXPIRED:
                    stats.expired++;
                    break;
                case USER_STATUS.NO_ACCESS:
                    stats.noAccess++;
                    break;
            }
        });

        this.stats = stats;
        this.updateStatsUI();
    }

    updateStatsUI() {
        // Atualizar cards de estatísticas
        const elements = {
            'total-users-count': this.stats.total,
            'premium-users-count': this.stats.premium,
            'expired-users-count': this.stats.expired,
            'no-access-users-count': this.stats.noAccess
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value.toLocaleString();
            }
        });

        // Atualizar contadores no header se existirem
        const statCards = document.querySelectorAll('.stat-card');
        if (statCards.length >= 4) {
            const values = [this.stats.total, this.stats.premium, this.stats.expired, this.stats.noAccess];
            statCards.forEach((card, index) => {
                const valueElement = card.querySelector('h3, .stat-value');
                if (valueElement && values[index] !== undefined) {
                    valueElement.textContent = values[index].toLocaleString();
                }
            });
        }
    }

    filterAndRenderUsers() {
        // Aplicar filtro de status
        let filtered = Array.from(this.users.values());
        
        // Filtrar por status
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(user => {
                const status = Utils.getUserStatus(user);
                return status === this.currentFilter;
            });
        }
        
        // Filtrar por busca
        if (this.currentSearch) {
            const searchTerm = this.currentSearch.toLowerCase();
            filtered = filtered.filter(user => 
                (user.name && user.name.toLowerCase().includes(searchTerm)) ||
                (user.email && user.email.toLowerCase().includes(searchTerm)) ||
                (user._id && user._id.toLowerCase().includes(searchTerm))
            );
        }

        // Ordenar por última atualização (mais recentes primeiro)
        filtered.sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt || 0);
            const dateB = new Date(b.updatedAt || b.createdAt || 0);
            return dateB - dateA;
        });

        // Salvar usuários filtrados
        this.filteredUsers = new Map(filtered.map(user => [user._key, user]));
        
        // Renderizar usuários
        this.renderUsers();
    }

    renderUsers() {
        const tableBody = document.querySelector('.table tbody');
        
        if (!tableBody) {
            console.warn('Elemento para renderizar usuários não encontrado');
            return;
        }

        // Calcular índices para paginação
        const startIndex = (this.currentPage - 1) * this.usersPerPage;
        const endIndex = startIndex + this.usersPerPage;
        const usersArray = Array.from(this.filteredUsers.values());
        const pageUsers = usersArray.slice(startIndex, endIndex);

        // Renderizar como tabela
        if (pageUsers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-8 text-gray-500">
                        <i class="fas fa-users-slash text-2xl mb-2"></i>
                        <p>Nenhum usuário encontrado</p>
                        ${this.users.size === 0 ? '<p class="text-sm mt-2">Adicione seu primeiro usuário!</p>' : ''}
                    </td>
                </tr>
            `;
        } else {
            let html = '';
            pageUsers.forEach((user, index) => {
                html += this.createTableRow(user, startIndex + index + 1);
            });
            
            tableBody.innerHTML = html;
            this.attachTableRowEvents();
        }

        // Atualizar informações de paginação
        this.updatePaginationInfo(startIndex + 1, endIndex, usersArray.length);
        this.updatePagination();
    }

    createTableRow(user, index) {
        const statusClass = Utils.getStatusClass(user);
        const statusText = Utils.getStatusText(user);
        const planClass = Utils.getPlanClass(user.accessPlan);
        const planText = Utils.getPlanName(user.accessPlan);
        const hasName = Utils.hasValidName(user);
        const initials = Utils.getInitials(hasName ? user.name : user.email);
        const lastAccess = Utils.formatDateShort(user.lastAccess || user.createdAt);

        return `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" data-user-key="${user._key}">
                <td class="py-4 px-6">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            ${initials}
                        </div>
                        <div>
                            <div class="font-medium text-white dark:text-white">
                                ${hasName ? user.name : '<span class="text-yellow-500">Sem nome</span>'}
                            </div>
                            <div class="text-sm text-gray-300 dark:text-gray-400">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td class="py-4 px-6">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusClass}">
                        <span class="w-2 h-2 rounded-full mr-2 ${statusClass === 'status-active' ? 'bg-green-500' : statusClass === 'status-expired' ? 'bg-red-500' : 'bg-gray-500'}"></span>
                        ${statusText}
                    </span>
                </td>
                <td class="py-4 px-6">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${planClass}">
                        ${planText}
                    </span>
                </td>
                <td class="py-4 px-6 text-gray-300 dark:text-gray-400">
                    ${lastAccess}
                </td>
                <td class="py-4 px-6">
                    <div class="flex items-center space-x-2">
                        ${!hasName ? `
                        <button class="p-2 text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg transition-colors" 
                                data-action="edit-name" data-user-key="${user._key}" title="Editar nome">
                            <i class="fas fa-edit"></i>
                        </button>
                        ` : ''}
                        <button class="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" 
                                data-action="edit-access" data-user-key="${user._key}" title="Editar acesso">
<i class="fas fa-edit"></i>

                        </button>
                        <button class="p-2 text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" 
                                data-action="remove-access" data-user-key="${user._key}" title="Remover acesso">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="p-2 text-green-600 hover:text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors" 
                                data-action="view-details" data-user-key="${user._key}" title="Ver detalhes">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    updatePagination() {
        const totalUsers = this.filteredUsers.size;
        const totalPages = Math.ceil(totalUsers / this.usersPerPage);
        
        // Atualizar botões de página
        const paginationContainer = document.querySelector('.pagination-buttons, [data-pagination]');
        if (!paginationContainer) return;
        
        let html = '';
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // Botão anterior
        html += `
            <button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
                    ${this.currentPage === 1 ? 'disabled' : ''}
                    data-action="prev">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // Primeira página
        if (startPage > 1) {
            html += `<button class="page-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                html += `<span class="px-2">...</span>`;
            }
        }
        
        // Páginas visíveis
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                        data-page="${i}">
                    ${i}
                </button>
            `;
        }
        
        // Última página
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<span class="px-2">...</span>`;
            }
            html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
        }
        
        // Botão próximo
        html += `
            <button class="page-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
                    ${this.currentPage === totalPages ? 'disabled' : ''}
                    data-action="next">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        paginationContainer.innerHTML = html;
    }

    updatePaginationInfo(start, end, total) {
        const paginationInfo = document.querySelector('[data-pagination-info]');
        if (paginationInfo) {
            paginationInfo.textContent = `Mostrando ${start} a ${end} de ${total.toLocaleString()} resultados`;
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderUsers();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredUsers.size / this.usersPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderUsers();
        }
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredUsers.size / this.usersPerPage);
        
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderUsers();
        }
    }

    attachTableRowEvents() {
        document.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = button.dataset.action;
                const userKey = button.dataset.userKey;
                
                if (!userKey) return;
                
                const user = this.filteredUsers.get(userKey);
                if (!user) return;
                
                switch(action) {
                    case 'edit-name':
                        this.editUserName(user);
                        break;
                    case 'edit-access':
                        this.editUserAccess(user);
                        break;
                    case 'remove-access':
                        this.removeUserAccess(user);
                        break;
                    case 'view-details':
                        this.viewUserDetails(user);
                        break;
                }
            });
        });
    }

    async handleLogin() {
        const emailInput = document.getElementById('admin-email-input');
        const passwordInput = document.getElementById('admin-password-input');
        
        if (!emailInput || !passwordInput) {
            Utils.showMessage('Campos de login não encontrados', 'error');
            return;
        }
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!email || !password) {
            Utils.showMessage('Preencha todos os campos', 'warning');
            return;
        }
        
        if (email !== ADMIN_EMAIL) {
            Swal.fire({
                icon: 'error',
                title: 'Acesso negado',
                text: 'Email de administrador inválido',
                confirmButtonColor: '#3b82f6',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)'
            });
            return;
        }
        
        Utils.showLoading(true);
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
            
            Swal.fire({
                icon: 'success',
                title: 'Login realizado!',
                text: 'Redirecionando para o painel...',
                timer: 1500,
                showConfirmButton: false,
                background: 'var(--bg-card)',
                color: 'var(--text-primary)'
            });
            
        } catch (error) {
            console.error('Erro no login:', error);
            
            let errorMessage = 'Erro ao fazer login';
            switch(error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Conta de administrador não encontrada';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Senha incorreta';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            Swal.fire({
                icon: 'error',
                title: 'Erro no login',
                text: errorMessage,
                confirmButtonColor: '#3b82f6',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)'
            });
            
        } finally {
            Utils.showLoading(false);
        }
    }

    async handleLogout() {
        try {
            await auth.signOut();
            
            Swal.fire({
                icon: 'success',
                title: 'Logout realizado',
                text: 'Até breve!',
                timer: 1500,
                showConfirmButton: false,
                background: 'var(--bg-card)',
                color: 'var(--text-primary)'
            });
            
            this.currentAdmin = null;
            this.users.clear();
            this.filteredUsers.clear();
            this.showLoginSection();
            
        } catch (error) {
            console.error('Erro no logout:', error);
            Utils.showMessage('Erro ao fazer logout', 'error');
        }
    }

    showAddUserModal() {
        Swal.fire({
            title: 'Adicionar Novo Usuário',
            html: this.getAddUserFormHTML(),
            showCancelButton: true,
            confirmButtonText: 'Criar Usuário',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#6b7280',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: 500,
            preConfirm: () => {
                return this.validateAddUserForm();
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                await this.createUser(result.value);
            }
        });
    }

    getAddUserFormHTML() {
        return `
            <div class="space-y-4 text-left">
                <div>
                    <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Nome Completo *
                    </label>
                    <input type="text" id="swal-name" 
                           class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                           placeholder="Digite o nome completo"
                           required>
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Email *
                    </label>
                    <input type="email" id="swal-email" 
                           class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                           placeholder="email@exemplo.com"
                           required>
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Senha *
                    </label>
                    <input type="password" id="swal-password" 
                           class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                           placeholder="Mínimo 6 caracteres"
                           required
                           minlength="6">
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-1 text-gray-300 dark:text-gray-300">
                        Plano de Acesso *
                    </label>
                    <select id="swal-plan" 
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-300 rounded-lg bg-white dark:bg-gray-300 text-gray-900 dark:text-white"
                            required>
                        <option value="">Selecione um plano</option>
                        <option value="1">1 Dia </option>
                        <option value="3">3 Dias </option>
                        <option value="7">1 Semana </option>
                        <option value="14">2 Semanas </option>
                        <option value="30">1 Mês </option>
                        <option value="permanent">Acesso Permanente</option>
                    </select>
                </div>
                
                <div class="text-sm text-gray-300 dark:text-gray-400 mt-2">
                    * Campos obrigatórios
                </div>
            </div>
        `;
    }

    validateAddUserForm() {
        const name = document.getElementById('swal-name').value.trim();
        const email = document.getElementById('swal-email').value.trim();
        const password = document.getElementById('swal-password').value;
        const plan = document.getElementById('swal-plan').value;

        const errors = [];

        if (!name) errors.push('Nome é obrigatório');
        if (!email) errors.push('Email é obrigatório');
        if (!password) errors.push('Senha é obrigatória');
        if (!plan) errors.push('Plano é obrigatório');

        if (email && !Utils.validateEmail(email)) {
            errors.push('Email inválido');
        }

        if (password && password.length < 6) {
            errors.push('Senha deve ter no mínimo 6 caracteres');
        }

        if (errors.length > 0) {
            Swal.showValidationMessage(errors.join('<br>'));
            return false;
        }

        return { name, email, password, plan };
    }

    async createUser(userData) {
        Utils.showLoading(true);

        try {
            // Verificar se usuário já existe
            const existingUser = await this.checkUserExists(userData.email);
            if (existingUser) {
                throw new Error('Já existe um usuário com este email');
            }

            // Criar usuário no Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(
                userData.email, 
                userData.password
            );
            const firebaseUser = userCredential.user;

            // Preparar dados do usuário
            const userId = Utils.generateUserId();
            const expirationDate = Utils.calculateExpirationDate(userData.plan);
            
            const userRecord = {
                id: userId,
                name: userData.name,
                email: userData.email.toLowerCase(),
                accessPlan: userData.plan,
                accessExpiration: expirationDate,
                hasAccess: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                firebaseUid: firebaseUser.uid,
                lastAccess: new Date().toISOString()
            };

            // Salvar no nó /diom (padrão para novos usuários)
            await database.ref(`diom/${userId}`).set(userRecord);

            // Fazer logout do usuário criado
            await auth.signOut();

            // Relogar como admin
            await auth.signInWithEmailAndPassword(ADMIN_EMAIL, ADMIN_PASSWORD);


            // Recarregar dados
            await this.loadAllUsers();
            // Mostrar modal de sucesso
           // this.showSuccessModal(userData);
       //    const expirationDate = Utils.calculateExpirationDate(userData.plan);
    const expirationText = expirationDate ?
        Utils.formatDateShort(expirationDate) :
        'Nunca (Permanente)';
    
    const planName = ACCESS_PLANS[userData.plan]?.name || userData.plan;
    
           
           const template = `Acesso robô Diom Systems luckyJet 
╭━━•𖧹꧁᭼⸼◍ཻꢀ᮪⸱ᨗᨗᨗ🛸⸱ᨗᨗᨗꢀ᮪ཻ◍⸼᭼꧂𖧹•━━╮
📧 E-mail: ${userData.email}
🗝️ Senha: ${userData.password}
📊 Acesso: ${planName}
🕒 Expira: ${expirationText}
🌐 Site: https://diomsystems-luckyjet.netlify.app
╰━━•𖧹꧁᭼⸼◍ཻꢀ᮪⸱ᨗᨗᨗ🛸⸱ᨗᨗᨗꢀ᮪ཻ◍⸼᭼꧂𖧹•━━╯
Obrigada✅❤️`;

    // Criar HTML do modal com SweetAlert2
    const htmlContent = `
        <div style="text-align: left; background-color: var(--bg-card); padding: 10px; border-radius: 8px;">
            <div style="margin-bottom: 20px;">
                <h4 style="color: var(--text-primary); margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.5em;"></i>
                    Usuário Cadastrado com Sucesso!
                </h4>
                <p style="color: var(--text-secondary); font-size: 0.9em; margin: 0;">
                    Copie o template abaixo e envie ao usuário
                </p>
            </div>
            
            <div style="background-color: var(--bg-input); border: 1px solid var(--border-color); border-radius: 6px; padding: 15px; margin-bottom: 15px; font-family: 'Courier New', monospace; font-size: 0.85em; color: var(--text-primary); white-space: pre-wrap; word-break: break-word; max-height: 300px; overflow-y: auto;" id="template-display">
${template}
            </div>
            

        </div>
    `;
    
    
    
    
    
    

           
           

            Swal.fire({
                icon: 'success',
                title: htmlContent,
                text: 'Usuário criado com sucesso',
                customClass: {
        popup: 'rounded-2xl shadow-2xl border border-gray-700',
        title: 'text-2xl font-bold mb-4 text-white',
        confirmButton: 'bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-colors',
        closeButton: 'text-gray-400 hover:text-white'
    },
    showCloseButton: true,
    showConfirmButton: true,
    confirmButtonText: 'Fechar',
    confirmButtonColor: '#7c3aed',
    width: '600px',
    buttonsStyling: true,
    focusConfirm: false,
                background: 'var(--bg-card)',
                color: 'var(--text-primary)'
            });

        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            
            // Tentar fazer login do admin novamente em caso de erro
            try {
                await auth.signInWithEmailAndPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
            } catch (loginError) {
                console.error('Erro ao relogar admin:', loginError);
            }
            
            Swal.fire({
                icon: 'error',
                title: 'Erro ao criar usuário',
                text: error.message || 'Ocorreu um erro inesperado',
                confirmButtonColor: '#3b82f6',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)'
            });
            
        } finally {
            Utils.showLoading(false);
        }
    }

    async checkUserExists(email) {
        try {
            const emailLower = email.toLowerCase();
            
            // Verificar em ambos os nós
            const [usuariosSnapshot, diomSnapshot] = await Promise.all([
                database.ref('usuarios').orderByChild('email').equalTo(emailLower).once('value'),
                database.ref('diom').orderByChild('email').equalTo(emailLower).once('value')
            ]);

            return usuariosSnapshot.exists() || diomSnapshot.exists();
        } catch (error) {
            console.error('Erro ao verificar usuário:', error);
            throw error;
        }
    }

    /**
 * FUNÇÃO CORRIGIDA: showSuccessModal
 * 
 * PROBLEMAS IDENTIFICADOS NO CÓDIGO ANTERIOR:
 * 1. IDs de botões inconsistentes (modal-close-btn vs modal-close-bt)
 * 2. ID de botão copiar não existia (copy-template-btn)
 * 3. Modal criado manualmente em vez de usar SweetAlert2
 * 4. Evento de clique no botão copiar não funcionava
 * 5. Lógica de fechamento confusa
 * 
 * SOLUÇÃO:
 * Usar SweetAlert2 para criar um modal profissional com:
 * - Botão de copiar template
 * - Botão de fechar
 * - Validação de cópia
 * - Feedback visual
 */

showSuccessModal(userData) {
    const expirationDate = Utils.calculateExpirationDate(userData.plan);
    const expirationText = expirationDate ?
        Utils.formatDateShort(expirationDate) :
        'Nunca (Permanente)';
    
    const planName = ACCESS_PLANS[userData.plan]?.name || userData.plan;
    
    // Template de acesso formatado
    const template = `Acesso robô Diom Aviator 
╭━━•𖧹꧁᭼⸼◍ཻꢀ᮪⸱ᨗᨗᨗ🛸⸱ᨗᨗᨗꢀ᮪ཻ◍⸼᭼꧂𖧹•━━╮
📧 E-mail: ${userData.email}
🗝️ Senha: ${userData.password}
📊 Acesso: ${planName}
🕒 Expira: ${expirationText}
🌐 Site: https://diom-aviator.site
╰━━•𖧹꧁᭼⸼◍ཻꢀ᮪⸱ᨗᨗᨗ🛸⸱ᨗᨗᨗꢀ᮪ཻ◍⸼᭼꧂𖧹•━━╯
Obrigada✅❤️`;

    // Criar HTML do modal com SweetAlert2
    const htmlContent = `
        <div style="text-align: left; background-color: var(--bg-card); padding: 20px; border-radius: 8px;">
            <div style="margin-bottom: 20px;">
                <h4 style="color: var(--text-primary); margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.5em;"></i>
                    Usuário Cadastrado com Sucesso!
                </h4>
                <p style="color: var(--text-secondary); font-size: 0.9em; margin: 0;">
                    Copie o template abaixo e envie ao usuário
                </p>
            </div>
            
            <div style="background-color: var(--bg-input); border: 1px solid var(--border-color); border-radius: 6px; padding: 15px; margin-bottom: 15px; font-family: 'Courier New', monospace; font-size: 0.85em; color: var(--text-primary); white-space: pre-wrap; word-break: break-word; max-height: 300px; overflow-y: auto;" id="template-display">
${template}
            </div>
            
            <div style="display: flex; gap: 10px; flex-direction: column;">
                <button id="copy-btn" style="
                    width: 100%;
                    padding: 10px 15px;
                    background-color: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-weight: 500;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.3s ease;
                    font-size: 0.95em;
                ">
                    <i class="fas fa-copy"></i> Copiar Template
                </button>
                
                <button id="close-btn" style="
                    width: 100%;
                    padding: 10px 15px;
                    background-color: var(--bg-input);
                    color: var(--text-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    font-weight: 500;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.3s ease;
                    font-size: 0.95em;
                ">
                    <i class="fas fa-times"></i> Fechar
                </button>
            </div>
        </div>
    `;

    // Mostrar SweetAlert2
    Swal.fire({
        title: '✅ Sucesso!',
        html: htmlContent,
        icon: 'success',
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        width: '600px',
        didOpen: (modal) => {
            // Botão Copiar
            const copyBtn = document.getElementById('copy-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', async () => {
                    try {
                        // Copiar para clipboard
                        await navigator.clipboard.writeText(template);
                        
                        // Feedback visual
                        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado com Sucesso!';
                        copyBtn.style.backgroundColor = '#10b981';
                        copyBtn.disabled = true;
                        
                        // Mostrar mensagem de sucesso
                        Utils.showMessage('Template copiado com sucesso!', 'success');
                        
                        // Voltar ao estado normal após 2 segundos
                        setTimeout(() => {
                            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copiar Template';
                            copyBtn.style.backgroundColor = '#3b82f6';
                            copyBtn.disabled = false;
                        }, 2000);
                        
                    } catch (err) {
                        console.error('Erro ao copiar:', err);
                        
                        // Fallback: usar método antigo
                        try {
                            const textArea = document.createElement('textarea');
                            textArea.value = template;
                            textArea.style.position = 'fixed';
                            textArea.style.opacity = '0';
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                            
                            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado com Sucesso!';
                            copyBtn.style.backgroundColor = '#10b981';
                            copyBtn.disabled = true;
                            
                            Utils.showMessage('Template copiado com sucesso!', 'success');
                            
                            setTimeout(() => {
                                copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copiar Template';
                                copyBtn.style.backgroundColor = '#3b82f6';
                                copyBtn.disabled = false;
                            }, 2000);
                            
                        } catch (fallbackErr) {
                            console.error('Erro no fallback:', fallbackErr);
                            Utils.showMessage('Erro ao copiar. Selecione e copie manualmente.', 'error');
                        }
                    }
                });
            }
            
            // Botão Fechar
            const closeBtn = document.getElementById('close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    Swal.close();
                });
            }
        }
    });
}

/**
 * Função auxiliar para fechar o modal de sucesso
 */
closeSuccessModal() {
    Swal.close();
}

/**
 * Função auxiliar para copiar template
 */
copyTemplateToClipboard(template) {
    navigator.clipboard.writeText(template).then(() => {
        Utils.showMessage('Template copiado com sucesso!', 'success');
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        Utils.showMessage('Erro ao copiar. Tente novamente.', 'error');
    });
}

    async editUserName(user) {
        const { value: newName } = await Swal.fire({
            title: 'Editar Nome',
            html: `
                <div class="text-left">
                    <p class="mb-3 text-gray-300 dark:text-gray-400">
                        Usuário: <strong>${user.email}</strong>
                    </p>
                    <input type="text" id="swal-edit-name" 
                           class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-300 text-gray-900 dark:text-white"
                           placeholder="Novo nome"
                           value="${user.name || ''}"
                           required>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Salvar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#6b7280',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            preConfirm: () => {
                const name = document.getElementById('swal-edit-name').value.trim();
                if (!name) {
                    Swal.showValidationMessage('Digite um nome válido');
                    return false;
                }
                return name;
            }
        });

        if (newName) {
            await this.updateUser(user, { name: newName });
        }
    }

    async editUserAccess(user) {
        const { value: selectedPlan } = await Swal.fire({
            title: 'Editar Acesso',
            html: `
                <div class="text-left">
                    <p class="mb-3 text-gray-300 dark:text-gray-400">
                        Usuário: <strong>${user.name || user.email}</strong>
                    </p>
                    <select id="swal-edit-plan" 
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="">Selecione um plano</option>
                        <option value="1" ${user.accessPlan === '1' ? 'selected' : ''}>1 Dia</option>
                        <option value="3" ${user.accessPlan === '3' ? 'selected' : ''}>3 Dias</option>
                        <option value="7" ${user.accessPlan === '7' ? 'selected' : ''}>1 Semana</option>
                        <option value="14" ${user.accessPlan === '14' ? 'selected' : ''}>2 Semanas</option>
                        <option value="30" ${user.accessPlan === '30' ? 'selected' : ''}>1 Mês</option>
                        <option value="permanent" ${user.accessPlan === 'permanent' ? 'selected' : ''}>Permanente</option>
                    </select>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Atualizar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#6b7280',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            preConfirm: () => {
                const plan = document.getElementById('swal-edit-plan').value;
                if (!plan) {
                    Swal.showValidationMessage('Selecione um plano');
                    return false;
                }
                return plan;
            }
        });

        if (selectedPlan) {
            const updates = {
                accessPlan: selectedPlan,
                accessExpiration: Utils.calculateExpirationDate(selectedPlan),
                hasAccess: true,
                updatedAt: new Date().toISOString(),
                lastAccess: new Date().toISOString()
            };
            await this.updateUser(user, updates);
        }
    }

    async removeUserAccess(user) {
        const result = await Swal.fire({
            title: 'Remover Acesso',
            html: `
                <div class="text-left">
                    <p class="mb-3 text-gray-300 dark:text-gray-400">
                        Tem certeza que deseja remover o acesso de:
                    </p>
                    <div class="bg-gray-500 dark:bg-gray-800 p-3 rounded-lg">
                        <p class="font-semibold">${user.name || 'Sem nome'}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">${user.email}</p>
                    </div>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, remover',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)'
        });

        if (result.isConfirmed) {
            const updates = {
                accessPlan: null,
                accessExpiration: null,
                hasAccess: false,
                updatedAt: new Date().toISOString()
            };
            await this.updateUser(user, updates);
        }
    }

    async updateUser(user, updates) {
        Utils.showLoading(true);

        try {
            await database.ref(`${user._node}/${user._id}`).update(updates);
            
            Swal.fire({
                icon: 'success',
                title: 'Sucesso!',
                text: 'Usuário atualizado com sucesso',
                timer: 1500,
                showConfirmButton: false,
                background: 'var(--bg-card)',
                color: 'var(--text-primary)'
            });
            
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            
            Swal.fire({
                icon: 'error',
                title: 'Erro!',
                text: 'Não foi possível atualizar o usuário',
                confirmButtonColor: '#3b82f6',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)'
            });
            
        } finally {
            Utils.showLoading(false);
        }
    }

    viewUserDetails(user) {
        Swal.fire({
            title: 'Detalhes do Usuário',
            html: this.getUserDetailsHTML(user),
            showConfirmButton: true,
            confirmButtonText: 'Fechar',
            confirmButtonColor: '#3b82f6',
            showCloseButton: true,
            width: 600,
            background: 'var(--bg-card)',
            color: 'var(--text-primary)'
        });
    }

    getUserDetailsHTML(user) {
        const status = Utils.getUserStatus(user);
        const statusText = Utils.getStatusText(user);
        const planName = Utils.getPlanName(user.accessPlan);
        const createdAt = Utils.formatDate(user.createdAt);
        const updatedAt = Utils.formatDate(user.updatedAt);
        const lastAccess = Utils.formatDate(user.lastAccess);
        const expiresAt = user.accessExpiration ? Utils.formatDate(user.accessExpiration) : 'Permanente';
        const daysRemaining = Utils.calculateDaysRemaining(user.accessExpiration);

        return `
            <div class="text-left space-y-4">
                <div class="flex items-center space-x-4">
                    <div class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                        ${Utils.getInitials(user.name || user.email)}
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold">${user.name || 'Sem nome'}</h3>
                        <p class="text-gray-300 dark:text-gray-400">${user.email}</p>
                        <div class="flex items-center space-x-2 mt-1">
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${Utils.getStatusClass(user)}">
                                ${statusText}
                            </span>
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${Utils.getPlanClass(user.accessPlan)}">
                                ${planName}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-gray-500 dark:bg-gray-800 p-3 rounded-lg">
                        <p class="text-sm text-gray-300 dark:text-gray-400">ID do Sistema</p>
                        <p class="font-mono text-sm">${user._id}</p>
                    </div>
                    <div class="bg-gray-500 dark:bg-gray-800 p-3 rounded-lg">
                        <p class="text-sm text-gray-300 dark:text-gray-400">Origem</p>
                        <p class="font-medium">${user._node}</p>
                    </div>
                </div>
                
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="text-gray-300 dark:text-gray-400">Criado em:</span>
                        <span class="font-medium">${createdAt}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-300 dark:text-gray-400">Última atualização:</span>
                        <span class="font-medium">${updatedAt}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-300 dark:text-gray-400">Último acesso:</span>
                        <span class="font-medium">${lastAccess}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-300 dark:text-gray-400">Expira em:</span>
                        <span class="font-medium">${expiresAt}</span>
                    </div>
                    ${user.accessExpiration ? `
                    <div class="flex justify-between">
                        <span class="text-gray-300 dark:text-gray-400">Dias restantes:</span>
                        <span class="font-medium">${daysRemaining}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p class="text-sm text-gray-300 dark:text-gray-400">
                     UID: <code class="text-xs">${user.firebaseUid || 'Não disponível'}</code>
                    </p>
                </div>
            </div>
        `;
    }

    showFiltersModal() {
        Swal.fire({
            title: 'Filtros Avançados',
            html: this.getFiltersFormHTML(),
            showCancelButton: true,
            confirmButtonText: 'Aplicar Filtros',
            cancelButtonText: 'Limpar Filtros',
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#6b7280',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: 500,
            preConfirm: () => {
                const status = document.getElementById('filter-status').value;
                const plan = document.getElementById('filter-plan').value;
                const node = document.getElementById('filter-node').value;
                const dateFrom = document.getElementById('filter-date-from').value;
                const dateTo = document.getElementById('filter-date-to').value;
                
                return { status, plan, node, dateFrom, dateTo };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.applyFilters(result.value);
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                this.clearFilters();
            }
        });
    }

    getFiltersFormHTML() {
        return `
            <div class="space-y-4 text-left">
                <div>
                    <label class="block text-sm font-medium mb-1 text-gray-300 dark:text-gray-300">
                        Status
                    </label>
                    <select id="filter-status" 
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="all">Todos os status</option>
                        <option value="active">Ativos</option>
                        <option value="expired">Expirados</option>
                        <option value="no_access">Sem acesso</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Plano
                    </label>
                    <select id="filter-plan" 
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="all">Todos os planos</option>
                        <option value="premium">Premium</option>
                        <option value="enterprise">Enterprise</option>
                        <option value="standard">Standard</option>
                        <option value="free">Free</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Origem
                    </label>
                    <select id="filter-node" 
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="all">Ambas as origens</option>
                        <option value="usuarios">Nó /usuarios</option>
                        <option value="diom">Nó /diom</option>
                    </select>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Data de criação (de)
                        </label>
                        <input type="date" id="filter-date-from" 
                               class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            Data de criação (até)
                        </label>
                        <input type="date" id="filter-date-to" 
                               class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    </div>
                </div>
            </div>
        `;
    }

    applyFilters(filters) {
        this.currentFilter = filters.status;
        this.currentPage = 1;
        
        // Filtrar usuários
        this.filterAndRenderUsers();
        
        Utils.showMessage('Filtros aplicados com sucesso', 'success');
    }

    clearFilters() {
        this.currentFilter = 'all';
        this.currentSearch = '';
        
        const searchInput = document.querySelector('.search-input, [data-search-input]');
        if (searchInput) {
            searchInput.value = '';
        }
        
        this.filterAndRenderUsers();
        Utils.showMessage('Filtros removidos', 'info');
    }

    async exportUsersData() {
        Utils.showLoading(true);
        
        try {
            const usersArray = Array.from(this.users.values());
            const csvContent = this.convertToCSV(usersArray);
            this.downloadCSV(csvContent, 'usuarios_diom_aviator.csv');
            
            Utils.showMessage('Dados exportados com sucesso', 'success');
            
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            Utils.showMessage('Erro ao exportar dados', 'error');
            
        } finally {
            Utils.showLoading(false);
        }
    }

    convertToCSV(users) {
        const headers = ['Nome', 'Email', 'Status', 'Plano', 'Criado em', 'Último acesso', 'Expira em', 'Origem'];
        
        const rows = users.map(user => {
            const status = Utils.getStatusText(user);
            const plan = Utils.getPlanName(user.accessPlan);
            const createdAt = Utils.formatDate(user.createdAt);
            const lastAccess = Utils.formatDate(user.lastAccess);
            const expiresAt = user.accessExpiration ? Utils.formatDate(user.accessExpiration) : 'Permanente';
            
            return [
                `"${user.name || ''}"`,
                `"${user.email}"`,
                `"${status}"`,
                `"${plan}"`,
                `"${createdAt}"`,
                `"${lastAccess}"`,
                `"${expiresAt}"`,
                `"${user._node}"`
            ].join(',');
        });
        
        return [headers.join(','), ...rows].join('\n');
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (navigator.msSaveBlob) {
            navigator.msSaveBlob(blob, filename);
        } else {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    async refreshData() {
        await this.loadAllUsers();
        Utils.showMessage('Dados atualizados com sucesso', 'success');
    }

    async handleAddUser() {
        // Esta função é para o formulário de adicionar usuário na página
        const nameInput = document.getElementById('user-name');
        const emailInput = document.getElementById('user-email');
        const passwordInput = document.getElementById('user-password');
        const planInput = document.getElementById('access-plan');
        
        if (!nameInput || !emailInput || !passwordInput || !planInput) {
            Utils.showMessage('Formulário de adicionar usuário não encontrado', 'error');
            return;
        }
        
        const userData = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value,
            plan: planInput.value
        };
        
        const errors = [];
        if (!userData.name) errors.push('Nome é obrigatório');
        if (!userData.email) errors.push('Email é obrigatório');
        if (!userData.password) errors.push('Senha é obrigatória');
        if (!userData.plan) errors.push('Plano é obrigatório');
        
        if (userData.email && !Utils.validateEmail(userData.email)) {
            errors.push('Email inválido');
        }
        
        if (userData.password && userData.password.length < 6) {
            errors.push('Senha deve ter no mínimo 6 caracteres');
        }
        
        if (errors.length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'Erro no formulário',
                html: errors.join('<br>'),
                confirmButtonColor: '#3b82f6',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)'
            });
            return;
        }
        
        await this.createUser(userData);
        
        // Limpar formulário
        if (nameInput && emailInput && passwordInput && planInput) {
            nameInput.value = '';
            emailInput.value = '';
            passwordInput.value = '';
            planInput.value = '';
        }
    }
}

// Inicializar o painel quando o DOM estiver carregado
let adminPanelInstance;

function initializeAdminPanel() {
    if (!adminPanelInstance) {
        adminPanelInstance = new AdminPanel();
        window.adminPanel = adminPanelInstance; // Para acesso global
    }
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminPanel);
} else {
    initializeAdminPanel();
}

// Exportar para uso global
window.AdminPanel = AdminPanel;