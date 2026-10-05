const ESPECIES = [
    { id: 'planta',   nome: 'Folhino',      tipo: 'Planta',   corpo: '#4ade80', escuro: '#16a34a', barriga: '#dcfce7', detalhe: '#22c55e', extra: 'folha' },
    { id: 'fogo',     nome: 'Brasito',      tipo: 'Fogo',     corpo: '#fb923c', escuro: '#ea580c', barriga: '#ffedd5', detalhe: '#f97316', extra: 'chama' },
    { id: 'agua',     nome: 'Gotinho',      tipo: 'Água',     corpo: '#38bdf8', escuro: '#0284c7', barriga: '#e0f2fe', detalhe: '#0ea5e9', extra: 'barbatana' },
    { id: 'eletrico', nome: 'Faíscio',      tipo: 'Elétrico', corpo: '#facc15', escuro: '#ca8a04', barriga: '#fef9c3', detalhe: '#eab308', extra: 'raio' },
    { id: 'veneno',   nome: 'Venenito',     tipo: 'Veneno',   corpo: '#c084fc', escuro: '#9333ea', barriga: '#f3e8ff', detalhe: '#a855f7', extra: 'bolhas' },
    { id: 'psiquico', nome: 'Soninho',      tipo: 'Psíquico', corpo: '#f472b6', escuro: '#db2777', barriga: '#fce7f3', detalhe: '#ec4899', extra: 'espiral' },
    { id: 'dragao',   nome: 'Dragãozinho',  tipo: 'Dragão',   corpo: '#f87171', escuro: '#dc2626', barriga: '#fee2e2', detalhe: '#ef4444', extra: 'asas' },
    { id: 'inseto',   nome: 'Bugzinho',     tipo: 'Inseto',   corpo: '#a3e635', escuro: '#65a30d', barriga: '#ecfccb', detalhe: '#84cc16', extra: 'antenas' },
    { id: 'mineral',  nome: 'Pedrita',      tipo: 'Mineral',  corpo: '#94a3b8', escuro: '#475569', barriga: '#e2e8f0', detalhe: '#8b5cf6', extra: 'cristal' },
    { id: 'cosmico',  nome: 'Estrelin',     tipo: 'Cósmico',  corpo: '#818cf8', escuro: '#4f46e5', barriga: '#e0e7ff', detalhe: '#fbbf24', extra: 'estrela' }
];

const ESTAGIOS = [
    { nome: 'Ovo',    xp: 0,    desc: 'O monstro está esperando nascer.' },
    { nome: 'Bebê',   xp: 100,  desc: 'Nasceu! Pequeno, curioso e cheio de energia.' },
    { nome: 'Jovem',  xp: 300,  desc: 'Crescendo e descobrindo o mundo.' },
    { nome: 'Adulto', xp: 600,  desc: 'Forte, ágil e pronto para as provas.' },
    { nome: 'Lenda',  xp: 1000, desc: 'Evolução máxima! Um monstro de lenda.' }
];

const XP_EVENTOS = [
    { fonte: 'Cadastro do monstro', xp: 50, acao: 'Feito!' },
    { fonte: 'Simulado concluído', xp: 40, acao: '+2 por acerto, 1x por dia' },
    { fonte: 'Estudo nos materiais', xp: 10, acao: '+10 por dia' }
];

function getEspecie(id) {
    return ESPECIES.find(e => e.id === id) || ESPECIES[0];
}

function getEstagio(xp) {
    let atual = 0;
    ESTAGIOS.forEach((e, i) => { if (xp >= e.xp) atual = i; });
    return atual;
}

function progressoXP(xp) {
    const i = getEstagio(xp);
    const atual = ESTAGIOS[i];
    const proximo = ESTAGIOS[i + 1] || null;
    if (!proximo) return { i, atual, proximo: null, pct: 1, faltam: 0 };
    const pct = Math.min(1, (xp - atual.xp) / (proximo.xp - atual.xp));
    return { i, atual, proximo, pct, faltam: proximo.xp - xp };
}

const AvatarStore = {
    chave: 'simplifica_perfil_v1',
    carregar() {
        try {
            const bruto = localStorage.getItem(this.chave);
            return bruto ? JSON.parse(bruto) : null;
        } catch (e) { return null; }
    },
    salvar(perfil) {
        localStorage.setItem(this.chave, JSON.stringify(perfil));
        return perfil;
    },
    criar({ nome, email, especie }) {
        const hoje = new Date().toISOString().slice(0, 10);
        const perfil = {
            nome, email, especie,
            xp: 50,
            criadoEm: new Date().toISOString(),
            diario: { data: hoje, simulado: 0, materiais: 0 }
        };
        this.salvar(perfil);
        return perfil;
    },
    addXP(valor) {
        const perfil = this.carregar();
        if (!perfil) return null;
        const antes = getEstagio(perfil.xp);
        perfil.xp = Math.max(0, perfil.xp + valor);
        this.salvar(perfil);
        const depois = getEstagio(perfil.xp);
        return { perfil, evoluiu: depois > antes, estagioAntes: antes, estagioDepois: depois };
    },
    premiarSimulado(acertos) {
        const perfil = this.carregar();
        if (!perfil) return null;
        const hoje = new Date().toISOString().slice(0, 10);
        if (perfil.diario.data !== hoje) perfil.diario = { data: hoje, simulado: 0, materiais: 0 };
        const merecido = acertos * 2;
        const ganho = Math.max(0, Math.min(40, merecido) - perfil.diario.simulado);
        if (ganho === 0) { this.salvar(perfil); return { perfil, ganho: 0, evoluiu: false }; }
        perfil.diario.simulado += ganho;
        this.salvar(perfil);
        const r = this.addXP(ganho);
        return { perfil: r.perfil, ganho, evoluiu: r.evoluiu, estagioAntes: r.estagioAntes, estagioDepois: r.estagioDepois };
    },
    premiarMateriais() {
        const perfil = this.carregar();
        if (!perfil) return null;
        const hoje = new Date().toISOString().slice(0, 10);
        if (perfil.diario.data !== hoje) perfil.diario = { data: hoje, simulado: 0, materiais: 0 };
        if (perfil.diario.materiais > 0) return { perfil, ganho: 0, evoluiu: false };
        perfil.diario.materiais = 10;
        this.salvar(perfil);
        const r = this.addXP(10);
        return { perfil: r.perfil, ganho: 10, evoluiu: r.evoluiu, estagioAntes: r.estagioAntes, estagioDepois: r.estagioDepois };
    },
    apagar() {
        localStorage.removeItem(this.chave);
    }
};

let avatarUID = 0;

function eggSVG(sp, size) {
    const u = 'av' + (++avatarUID);
    return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="Ovo de ${sp.nome}">
        <defs>
            <linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="${sp.corpo}"/>
                <stop offset="100%" stop-color="${sp.escuro}"/>
            </linearGradient>
        </defs>
        <ellipse cx="100" cy="182" rx="52" ry="10" fill="#000" opacity="0.08"/>
        <path d="M100 34 C138 34 162 82 162 122 C162 156 134 180 100 180 C66 180 38 156 38 122 C38 82 62 34 100 34 Z" fill="url(#${u})"/>
        <path d="M100 34 C138 34 162 82 162 122 C162 156 134 180 100 180 C112 168 120 150 120 122 C120 84 112 52 100 34 Z" fill="#fff" opacity="0.18"/>
        <circle cx="74" cy="96" r="9" fill="${sp.detalhe}" opacity="0.75"/>
        <circle cx="124" cy="128" r="7" fill="${sp.detalhe}" opacity="0.75"/>
        <circle cx="88" cy="146" r="6" fill="${sp.barriga}" opacity="0.9"/>
        <circle cx="126" cy="84" r="5" fill="${sp.barriga}" opacity="0.9"/>
        <path d="M86 118 l10 -8 10 8 -10 8 z" fill="${sp.barriga}" opacity="0.95"/>
        <g class="egg-crack" stroke="${sp.escuro}" stroke-width="3" fill="none" opacity="0.35">
            <path d="M60 150 l12 -6 8 8 12 -4"/>
        </g>
    </svg>`;
}

function accessarioSVG(sp, r, cy, stage) {
    const top = cy - r;
    const d = sp.detalhe, e = sp.escuro;
    const anexos = {
        folha: `<path d="M100 ${top - 4} C100 ${top - 30} 118 ${top - 40} 132 ${top - 42} C130 ${top - 24} 118 ${top - 8} 100 ${top - 4} Z" fill="${d}"/>
                 <path d="M100 ${top - 4} C104 ${top - 20} 114 ${top - 32} 126 ${top - 38}" stroke="${e}" stroke-width="2.5" fill="none"/>`,
        chama: `<path d="M100 ${top + 2} C88 ${top - 12} 96 ${top - 26} 102 ${top - 38} C104 ${top - 26} 118 ${top - 26} 116 ${top - 10} C114 ${top - 2} 106 ${top + 4} 100 ${top + 2} Z" fill="${d}"/>
                 <path d="M102 ${top - 4} C98 ${top - 12} 104 ${top - 20} 106 ${top - 26} C108 ${top - 18} 112 ${top - 14} 110 ${top - 6} Z" fill="#fde047"/>`,
        barbatana: `<path d="M100 ${top + 4} C92 ${top - 14} 104 ${top - 30} 100 ${top - 42} C114 ${top - 30} 110 ${top - 12} 108 ${top + 4} Z" fill="${d}"/>`,
        raio: `<path d="M100 ${top + 2} L88 ${top - 20} L100 ${top - 18} L92 ${top - 40} L116 ${top - 16} L102 ${top - 18} L112 ${top - 2} Z" fill="${d}"/>`,
        bolhas: `<circle cx="${100 - r * 0.7}" cy="${top - 10}" r="9" fill="${d}" opacity="0.85"/>
                 <circle cx="${100 + r * 0.75}" cy="${top - 18}" r="7" fill="${d}" opacity="0.85"/>
                 <circle cx="${100 + r * 0.3}" cy="${top - 30}" r="5" fill="${sp.barriga}" stroke="${d}" stroke-width="2"/>`,
        espiral: `<path d="M100 ${top + 2} C100 ${top - 14} 84 ${top - 16} 84 ${top - 28} C84 ${top - 38} 96 ${top - 42} 102 ${top - 34} C106 ${top - 28} 100 ${top - 22} 96 ${top - 26}" fill="none" stroke="${d}" stroke-width="4" stroke-linecap="round"/>`,
        asas: `<path d="M100 ${top + 4} L86 ${top - 8} L98 ${top - 6} L88 ${top - 26} L106 ${top - 4} L98 ${top - 2} Z" fill="${d}"/>`,
        antenas: `<path d="M${100 - 14} ${top + 4} C${100 - 20} ${top - 14} ${100 - 30} ${top - 20} ${100 - 32} ${top - 32}" stroke="${e}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
                   <path d="M${100 + 14} ${top + 4} C${100 + 20} ${top - 14} ${100 + 30} ${top - 20} ${100 + 32} ${top - 32}" stroke="${e}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
                   <circle cx="${100 - 32}" cy="${top - 34}" r="6" fill="${d}"/>
                   <circle cx="${100 + 32}" cy="${top - 34}" r="6" fill="${d}"/>`,
        cristal: `<path d="M100 ${top + 4} L90 ${top - 18} L100 ${top - 34} L110 ${top - 18} Z" fill="${d}"/>
                   <path d="M78 ${top + 4} L72 ${top - 10} L82 ${top - 4} Z" fill="${sp.corpo}"/>
                   <path d="M122 ${top + 4} L128 ${top - 12} L134 ${top} Z" fill="${sp.corpo}"/>`,
        estrela: `<path d="M100 ${top - 36} l7 15 16 2 -12 11 3 16 -14 -8 -14 8 3 -16 -12 -11 16 -2 z" fill="${d}"/>`
    };
    return anexos[sp.extra] || '';
}

function monstroSVG(id, stage, size) {
    const sp = getEspecie(id);
    if (stage <= 0) return eggSVG(sp, size);

    const rBase = [0, 44, 52, 60, 63][stage];
    const cy = 178 - rBase;
    const olhoR = stage === 1 ? 10 : 8.5;
    const temMembros = stage >= 2;
    const temCauda = stage >= 2;
    const asas = (sp.extra === 'asas' && stage >= 2) || stage === 4;
    const aura = stage === 4;
    const coroa = stage === 4;

    const membros = temMembros ? `
        <ellipse cx="${100 - rBase - 6}" cy="${cy + rBase * 0.35}" rx="14" ry="9" fill="${sp.escuro}" transform="rotate(-24 ${100 - rBase - 6} ${cy + rBase * 0.35})"/>
        <ellipse cx="${100 + rBase + 6}" cy="${cy + rBase * 0.35}" rx="14" ry="9" fill="${sp.escuro}" transform="rotate(24 ${100 + rBase + 6} ${cy + rBase * 0.35})"/>
        <ellipse cx="${100 - rBase * 0.45}" cy="${176}" rx="16" ry="10" fill="${sp.escuro}"/>
        <ellipse cx="${100 + rBase * 0.45}" cy="${176}" rx="16" ry="10" fill="${sp.escuro}"/>` : `
        <ellipse cx="${100 - rBase * 0.5}" cy="${174}" rx="13" ry="9" fill="${sp.escuro}"/>
        <ellipse cx="${100 + rBase * 0.5}" cy="${174}" rx="13" ry="9" fill="${sp.escuro}"/>`;

    const cauda = temCauda ? `<path d="M${100 + rBase - 4} ${cy + rBase * 0.5} Q${100 + rBase + 34} ${cy + rBase * 0.55} ${100 + rBase + 30} ${cy - 6}" stroke="${sp.escuro}" stroke-width="10" fill="none" stroke-linecap="round"/>
        <circle cx="${100 + rBase + 30}" cy="${cy - 8}" r="8" fill="${sp.detalhe}"/>` : '';

    const asasSVG = asas ? `
        <path d="M${100 - rBase + 4} ${cy - 14} C${100 - rBase - 34} ${cy - 44} ${100 - rBase - 52} ${cy - 10} ${100 - rBase - 6} ${cy + 6} Z" fill="${sp.detalhe}" opacity="0.9"/>
        <path d="M${100 + rBase - 4} ${cy - 14} C${100 + rBase + 34} ${cy - 44} ${100 + rBase + 52} ${cy - 10} ${100 + rBase + 6} ${cy + 6} Z" fill="${sp.detalhe}" opacity="0.9"/>` : '';

    const boca = stage === 1
        ? `<path d="M${100 - 9} ${cy + 16} q9 10 18 0" stroke="#0f172a" stroke-width="3" fill="none" stroke-linecap="round"/>`
        : `<path d="M${100 - 14} ${cy + 14} q14 14 28 0" stroke="#0f172a" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;

    const bochechas = stage <= 2 ? `
        <ellipse cx="${100 - rBase * 0.62}" cy="${cy + 12}" rx="8" ry="5" fill="#fb7185" opacity="0.5"/>
        <ellipse cx="${100 + rBase * 0.62}" cy="${cy + 12}" rx="8" ry="5" fill="#fb7185" opacity="0.5"/>` : '';

    const coroaSVG = coroa ? `<path d="M${100 - 26} ${cy - rBase + 6} l8 -18 8 12 10 -16 10 16 8 -12 8 18 z" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/>` : '';

    const brilhos = aura ? `
        <circle cx="${100 - rBase - 22}" cy="${cy - rBase - 6}" r="4" fill="#fbbf24" class="sparkle"/>
        <circle cx="${100 + rBase + 20}" cy="${cy - rBase + 12}" r="5" fill="#fbbf24" class="sparkle"/>
        <circle cx="${100 + rBase + 8}" cy="${cy - rBase - 24}" r="3.5" fill="#fff" class="sparkle"/>
        <circle cx="${100 - rBase - 14}" cy="${cy + 10}" r="3" fill="#fff" class="sparkle"/>` : '';

    const auraRing = aura ? `<circle cx="100" cy="${cy}" r="${rBase + 16}" fill="none" stroke="${sp.detalhe}" stroke-width="3" stroke-dasharray="10 12" opacity="0.7" class="aura"/>` : '';

    return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="${sp.nome} estágio ${ESTAGIOS[stage].nome}">
        <ellipse cx="100" cy="184" rx="${rBase + 14}" ry="9" fill="#000" opacity="0.08"/>
        ${auraRing}
        ${asasSVG}
        ${cauda}
        ${membros}
        <ellipse cx="100" cy="${cy}" rx="${rBase}" ry="${rBase * 0.96}" fill="${sp.corpo}"/>
        <ellipse cx="100" cy="${cy + rBase * 0.28}" rx="${rBase * 0.62}" ry="${rBase * 0.5}" fill="${sp.barriga}"/>
        <path d="M${100 - rBase * 0.98} ${cy - rBase * 0.2} a${rBase} ${rBase} 0 0 1 ${rBase * 0.7} ${-rBase * 0.72}" stroke="#fff" stroke-width="7" fill="none" opacity="0.35" stroke-linecap="round"/>
        ${bochechas}
        <circle cx="${100 - rBase * 0.36}" cy="${cy - rBase * 0.1}" r="${olhoR}" fill="#fff"/>
        <circle cx="${100 + rBase * 0.36}" cy="${cy - rBase * 0.1}" r="${olhoR}" fill="#fff"/>
        <circle cx="${100 - rBase * 0.34}" cy="${cy - rBase * 0.08}" r="${olhoR * 0.55}" fill="#0f172a"/>
        <circle cx="${100 + rBase * 0.38}" cy="${cy - rBase * 0.08}" r="${olhoR * 0.55}" fill="#0f172a"/>
        <circle cx="${100 - rBase * 0.3}" cy="${cy - rBase * 0.14}" r="${olhoR * 0.2}" fill="#fff"/>
        <circle cx="${100 + rBase * 0.42}" cy="${cy - rBase * 0.14}" r="${olhoR * 0.2}" fill="#fff"/>
        ${boca}
        ${accessarioSVG(sp, rBase, cy, stage)}
        ${coroaSVG}
        ${brilhos}
    </svg>`;
}

function cicloHTML(xp, miniSize) {
    const size = miniSize || 76;
    const atual = getEstagio(xp);
    return '<div class="ciclo">' + ESTAGIOS.map((e, i) => {
        const destravado = i <= atual;
        const sp = AvatarStore.carregar();
        const especie = sp ? sp.especie : 'planta';
        return `<div class="ciclo-etapa ${i === atual ? 'atual' : ''} ${destravado ? '' : 'trancado'}">
            <div class="ciclo-mini">${monstroSVG(especie, i, size)}</div>
            <strong>${e.nome}</strong>
            <span>${e.xp} XP</span>
        </div>`;
    }).join('') + '</div>';
}

function toastEvolucao(sp, stage) {
    const el = document.createElement('div');
    el.className = 'evolucao-toast';
    el.innerHTML = `<div class="evolucao-card">
        <p class="evolucao-label">Evolução!</p>
        <div class="evolucao-art">${monstroSVG(sp, stage, 190)}</div>
        <h3>${getEspecie(sp).nome} evoluiu para <span>${ESTAGIOS[stage].nome}</span></h3>
        <button class="evolucao-ok">Incrível!</button>
    </div>`;
    document.body.appendChild(el);
    el.querySelector('.evolucao-ok').addEventListener('click', () => el.remove());
    setTimeout(() => { if (el.parentNode) el.remove(); }, 7000);
}

(function injetarEstilosAvatar() {
    if (document.getElementById('avatar-estilos')) return;
    const css = `
        .evolucao-toast {
            position: fixed; inset: 0;
            background: rgba(10, 54, 34, 0.75);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            z-index: 300; padding: 24px;
            animation: avFadeIn 0.3s ease;
        }
        .evolucao-card {
            background: #fff; border-radius: 24px;
            padding: 36px 44px; text-align: center;
            box-shadow: 0 20px 45px -20px rgba(0,0,0,0.45);
            max-width: 420px;
            animation: avEvolvePop 0.55s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .evolucao-label {
            font-size: 0.85rem; font-weight: 900;
            text-transform: uppercase; letter-spacing: 3px;
            color: #fbbf24; margin-bottom: 8px;
        }
        .evolucao-art { animation: avFloat 3s ease-in-out infinite; }
        .evolucao-art svg { margin: 0 auto; }
        .evolucao-card h3 { font-size: 1.25rem; color: #111827; margin: 8px 0 18px; }
        .evolucao-card h3 span { color: #16a34a; }
        .evolucao-ok {
            background: linear-gradient(135deg, #22c55e, #166534);
            color: #fff; border: none;
            font-family: inherit; font-weight: 700; font-size: 1rem;
            padding: 12px 30px; border-radius: 8px; cursor: pointer;
            transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .evolucao-ok:hover { transform: translateY(-2px); }
        .sparkle { animation: avTwinkle 1.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .aura { animation: avSpin 9s linear infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes avFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes avEvolvePop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.06); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes avFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes avTwinkle { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.6; } }
        @keyframes avSpin { to { transform: rotate(360deg); } }
    `;
    const style = document.createElement('style');
    style.id = 'avatar-estilos';
    style.textContent = css;
    document.head.appendChild(style);
})();
