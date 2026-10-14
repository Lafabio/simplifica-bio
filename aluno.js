const AlunoStore = {
    chave: 'simplifica_sessao_v1',
    carregar() {
        try {
            const bruto = localStorage.getItem(this.chave);
            return bruto ? JSON.parse(bruto) : null;
        } catch (e) { return null; }
    },
    entrar(sessao) {
        localStorage.setItem(this.chave, JSON.stringify(sessao));
        return sessao;
    },
    entrarDev() {
        return this.entrar({
            nome: 'Aluno Teste',
            email: 'dev@simplificabio.com.br',
            dev: true,
            desde: new Date().toISOString()
        });
    },
    sair() {
        localStorage.removeItem(this.chave);
    },
    exigeLogin(destino) {
        if (!this.carregar()) {
            location.replace(destino || 'login.html');
            return false;
        }
        return true;
    }
};

function alunoToast(msg, tipo) {
    let box = document.getElementById('aluno-toasts');
    if (!box) {
        box = document.createElement('div');
        box.id = 'aluno-toasts';
        box.setAttribute('aria-live', 'polite');
        box.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:300;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;';
        document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = 'toast-ia ' + (tipo || '');
    el.textContent = msg;
    el.style.cssText = 'background:#111827;color:#fff;padding:11px 20px;border-radius:999px;font-size:.9rem;font-weight:600;box-shadow:0 10px 15px -3px rgb(0 0 0 / .1);max-width:90vw;text-align:center;animation:toastUp .35s cubic-bezier(.22,1,.36,1);';
    if (tipo === 'ok') el.style.background = '#166534';
    if (tipo === 'erro') el.style.background = '#dc2626';
    box.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2600);
    setTimeout(() => el.remove(), 3000);
}
