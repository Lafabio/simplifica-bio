(() => {
    const LAT = 1600;
    const ALT = 900;
    const $ = id => document.getElementById(id);
    const canvas = $('quadro');
    const camada = $('camada');
    const ctx = canvas.getContext('2d');
    const ctxC = camada.getContext('2d');

    const PERFIL = (typeof AvatarStore !== 'undefined' && AvatarStore.carregar) ? AvatarStore.carregar() : null;

    const ICONES = {
        caneta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
        marcador: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>',
        borracha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>',
        linha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 19 19 5"/></svg>',
        seta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19 19 5"/><path d="M12 5h7v7"/></svg>',
        retangulo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>',
        elipse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="12" rx="9" ry="6"/></svg>',
        texto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>',
        desfazer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/></svg>',
        refazer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15-6.7L21 13"/></svg>',
        limpar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>'
    };

    const CORES = ['#111827', '#dc2626', '#f59e0b', '#16a34a', '#0ea5e9', '#7c3aed', '#db2777'];
    const TAMANHOS = [3, 6, 12];

    const estado = {
        ferramenta: 'caneta',
        cor: '#111827',
        tam: 6,
        ops: [],
        refazer: [],
        mapa: {},
        traco: null,
        arrastando: null,
        preRemoto: null,
        pendentes: [],
        papel: null,
        codigo: null,
        peer: null,
        conns: new Set(),
        conexao: null,
        qtd: 1,
        nome: PERFIL && PERFIL.nome ? PERFIL.nome : null,
        gravando: false,
        recorder: null,
        chunks: [],
        streamGrav: null,
        inicioGrav: 0,
        timerGrav: null,
        arquivo: null,
        ultimoCursor: 0
    };

    function toast(msg, tipo) {
        const box = $('toasts');
        const el = document.createElement('div');
        el.className = 'toast' + (tipo ? ' ' + tipo : '');
        el.textContent = msg;
        box.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2600);
        setTimeout(() => el.remove(), 3000);
    }

    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function gerarCodigo() {
        const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let s = '';
        for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
        return s;
    }

    function meuNome() {
        if (estado.nome) return estado.nome;
        return estado.papel === 'professor' ? 'Professor' : 'Aluno';
    }

    function ponto(ev) {
        const r = camada.getBoundingClientRect();
        return {
            x: (ev.clientX - r.left) / r.width * LAT,
            y: (ev.clientY - r.top) / r.height * ALT
        };
    }

    function estiloTraco(c, op) {
        c.lineCap = 'round';
        c.lineJoin = 'round';
        if (op.f === 'borracha') {
            c.strokeStyle = '#ffffff';
            c.lineWidth = op.tam * 6;
            c.globalAlpha = 1;
            c.globalCompositeOperation = 'source-over';
        } else if (op.f === 'marcador') {
            c.strokeStyle = op.cor;
            c.lineWidth = op.tam * 3.5;
            c.globalAlpha = 0.35;
            c.globalCompositeOperation = 'multiply';
        } else {
            c.strokeStyle = op.cor;
            c.lineWidth = op.tam;
            c.globalAlpha = 1;
            c.globalCompositeOperation = 'source-over';
        }
    }

    function estiloForma(c, op) {
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.strokeStyle = op.cor;
        c.lineWidth = op.tam;
        c.globalAlpha = 1;
        c.globalCompositeOperation = 'source-over';
    }

    function caminhoTraco(c, pts, i0, i1) {
        if (!pts.length) return;
        const ini = Math.max(0, i0 - 1);
        c.beginPath();
        c.moveTo(pts[ini][0], pts[ini][1]);
        if (pts.length === 1 && i0 === 0) {
            c.lineTo(pts[0][0] + 0.01, pts[0][1]);
        } else {
            for (let i = Math.max(1, i0); i <= Math.min(i1, pts.length - 1); i++) {
                c.lineTo(pts[i][0], pts[i][1]);
            }
        }
        c.stroke();
    }

    function desenharSegmento(op, i0, i1) {
        ctx.save();
        estiloTraco(ctx, op);
        caminhoTraco(ctx, op.pts, i0, i1);
        ctx.restore();
    }

    function formaPath(c, op) {
        const [ax, ay] = op.a;
        const [bx, by] = op.b;
        if (op.f === 'linha' || op.f === 'seta') {
            c.beginPath();
            c.moveTo(ax, ay);
            c.lineTo(bx, by);
            c.stroke();
            if (op.f === 'seta') {
                const ang = Math.atan2(by - ay, bx - ax);
                const h = 16 + op.tam * 2;
                c.beginPath();
                c.moveTo(bx, by);
                c.lineTo(bx - h * Math.cos(ang - Math.PI / 7), by - h * Math.sin(ang - Math.PI / 7));
                c.moveTo(bx, by);
                c.lineTo(bx - h * Math.cos(ang + Math.PI / 7), by - h * Math.sin(ang + Math.PI / 7));
                c.stroke();
            }
        } else if (op.f === 'retangulo') {
            c.beginPath();
            c.rect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay));
            c.stroke();
        } else if (op.f === 'elipse') {
            c.beginPath();
            c.ellipse((ax + bx) / 2, (ay + by) / 2, Math.abs(bx - ax) / 2, Math.abs(by - ay) / 2, 0, 0, Math.PI * 2);
            c.stroke();
        }
    }

    function aplicarOp(c, op) {
        if (op.k === 'texto') {
            c.save();
            c.fillStyle = op.cor;
            c.font = '700 ' + op.fs + 'px Inter, Segoe UI, sans-serif';
            c.textBaseline = 'alphabetic';
            c.fillText(op.txt, op.x, op.y);
            c.restore();
        } else if (op.k === 'forma') {
            c.save();
            estiloForma(c, op);
            formaPath(c, op);
            c.restore();
        } else {
            if (!op.pts || !op.pts.length) return;
            c.save();
            estiloTraco(c, op);
            caminhoTraco(c, op.pts, 0, op.pts.length - 1);
            c.restore();
        }
    }

    function renderizar() {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, LAT, ALT);
        for (const op of estado.ops) aplicarOp(ctx, op);
        pintarCamada();
    }

    function pintarCamada() {
        ctxC.clearRect(0, 0, LAT, ALT);
        if (estado.arrastando) {
            ctxC.save();
            estiloForma(ctxC, estado.arrastando);
            formaPath(ctxC, estado.arrastando);
            ctxC.restore();
        } else if (estado.preRemoto) {
            aplicarOp(ctxC, estado.preRemoto);
        }
    }

    function enviar(msg) {
        try {
            if (estado.papel === 'professor') {
                estado.conns.forEach(cn => { if (cn.open) cn.send(msg); });
            } else if (estado.conexao && estado.conexao.open) {
                estado.conexao.send(msg);
            }
        } catch (e) { }
    }

    function retransmitir(msg, origem) {
        estado.conns.forEach(cn => {
            if (cn !== origem && cn.open) {
                try { cn.send(msg); } catch (e) { }
            }
        });
    }

    function aplicarMsg(msg) {
        if (!msg || !msg.t) return;
        switch (msg.t) {
            case 'novo': {
                const op = { k: 'stroke', id: msg.id, f: msg.f, cor: msg.cor, tam: msg.tam, pts: [] };
                estado.ops.push(op);
                estado.mapa[msg.id] = op;
                estado.refazer = [];
                break;
            }
            case 'pts': {
                const op = estado.mapa[msg.id];
                if (op && msg.pts && msg.pts.length) {
                    const i0 = op.pts.length;
                    op.pts.push(...msg.pts);
                    desenharSegmento(op, i0, op.pts.length);
                }
                break;
            }
            case 'op': {
                if (!msg.op) break;
                estado.ops.push(msg.op);
                if (msg.op.k === 'stroke' && msg.op.id) estado.mapa[msg.op.id] = msg.op;
                estado.refazer = [];
                aplicarOp(ctx, msg.op);
                break;
            }
            case 'pre':
                estado.preRemoto = msg.op || null;
                pintarCamada();
                break;
            case 'pre-fim':
                estado.preRemoto = null;
                pintarCamada();
                break;
            case 'desfazer': {
                const o = estado.ops.pop();
                if (o) { estado.refazer.push(o); renderizar(); }
                break;
            }
            case 'refazer': {
                const o = estado.refazer.pop();
                if (o) { estado.ops.push(o); renderizar(); }
                break;
            }
            case 'limpar':
                estado.ops = [];
                estado.refazer = [];
                estado.mapa = {};
                renderizar();
                break;
            case 'estado':
                estado.ops = (msg.ops || []).slice();
                estado.mapa = {};
                for (const op of estado.ops) if (op.k === 'stroke' && op.id) estado.mapa[op.id] = op;
                renderizar();
                break;
            case 'qtd':
                estado.qtd = msg.n || 1;
                atualizarStatus();
                break;
            case 'cursor':
                mostrarCursor(msg);
                break;
        }
    }

    function aoReceber(msg, conn) {
        aplicarMsg(msg);
        if (estado.papel === 'professor' && conn) retransmitir(msg, conn);
    }

    function conectarConn(conn, host) {
        conn.on('open', () => {
            if (host) {
                estado.conns.add(conn);
                try { conn.send({ t: 'estado', ops: estado.ops }); } catch (e) { }
                enviar({ t: 'qtd', n: estado.conns.size + 1 });
                atualizarStatus();
            }
        });
        conn.on('data', msg => aoReceber(msg, host ? conn : null));
        conn.on('close', () => {
            if (host) {
                estado.conns.delete(conn);
                enviar({ t: 'qtd', n: estado.conns.size + 1 });
            } else {
                setStatus('off', 'Desconectado — recarregue a página');
            }
            atualizarStatus();
        });
        conn.on('error', () => toast('Erro na conexão com o participante', 'erro'));
    }

    function setStatus(cls, txt) {
        const pill = $('status-sala');
        pill.className = 'status-pill ' + cls;
        $('status-texto').textContent = txt;
    }

    function atualizarStatus() {
        if (estado.papel === 'professor') {
            const n = estado.conns.size + 1;
            if (estado.conns.size > 0) setStatus('on', n + ' na sala');
            else setStatus('aguardando', 'Aguardando o aluno…');
        } else if (estado.conexao && estado.conexao.open) {
            setStatus('on', 'Conectado — ' + estado.qtd + ' na sala');
        }
    }

    function mostrarCursor(msg) {
        const el = $('cursor-peer');
        $('cursor-nome').textContent = msg.nome || 'Participante';
        el.style.left = (msg.x / LAT * 100) + '%';
        el.style.top = (msg.y / ALT * 100) + '%';
        el.classList.remove('escondido');
        clearTimeout(estado.cursorTimer);
        estado.cursorTimer = setTimeout(() => el.classList.add('escondido'), 2600);
    }

    function construirToolbar() {
        const gf = $('grupo-ferramentas');
        gf.innerHTML = Object.keys(ICONES).filter(k => !['desfazer', 'refazer', 'limpar'].includes(k)).map(k =>
            '<button class="ferramenta' + (k === estado.ferramenta ? ' ativa' : '') + '" data-ferramenta="' + k + '" title="' + k + '" aria-label="' + k + '">' + ICONES[k] + '</button>'
        ).join('');
        gf.querySelectorAll('[data-ferramenta]').forEach(b => {
            b.addEventListener('click', () => {
                estado.ferramenta = b.dataset.ferramenta;
                gf.querySelectorAll('.ferramenta').forEach(x => x.classList.remove('ativa'));
                b.classList.add('ativa');
            });
        });

        const gc = $('grupo-cores');
        gc.innerHTML = CORES.map(c =>
            '<button class="cor' + (c === estado.cor ? ' ativa' : '') + '" data-cor="' + c + '" style="background:' + c + '" title="Cor" aria-label="Cor"></button>'
        ).join('') + '<input type="color" class="cor-input" id="cor-livre" value="' + estado.cor + '" title="Escolher cor" aria-label="Escolher cor livre">';
        gc.querySelectorAll('[data-cor]').forEach(b => {
            b.addEventListener('click', () => {
                estado.cor = b.dataset.cor;
                gc.querySelectorAll('.cor').forEach(x => x.classList.remove('ativa'));
                b.classList.add('ativa');
                $('cor-livre').value = estado.cor;
            });
        });
        $('cor-livre').addEventListener('input', e => {
            estado.cor = e.target.value;
            gc.querySelectorAll('.cor').forEach(x => x.classList.remove('ativa'));
        });

        const gt = $('grupo-tamanhos');
        gt.innerHTML = TAMANHOS.map((t, i) =>
            '<button class="tam' + (t === estado.tam ? ' ativa' : '') + '" data-tam="' + t + '" title="Espessura" aria-label="Espessura"><span style="width:' + (6 + i * 5) + 'px;height:' + (6 + i * 5) + 'px"></span></button>'
        ).join('');
        gt.querySelectorAll('[data-tam]').forEach(b => {
            b.addEventListener('click', () => {
                estado.tam = Number(b.dataset.tam);
                gt.querySelectorAll('.tam').forEach(x => x.classList.remove('ativa'));
                b.classList.add('ativa');
            });
        });

        const gh = $('grupo-historico');
        gh.innerHTML = ['desfazer', 'refazer', 'limpar'].map(k =>
            '<button class="ferramenta" data-hist="' + k + '" title="' + k + '" aria-label="' + k + '">' + ICONES[k] + '</button>'
        ).join('');
        gh.querySelectorAll('[data-hist]').forEach(b => {
            b.addEventListener('click', () => {
                const k = b.dataset.hist;
                if (k === 'desfazer') desfazer();
                else if (k === 'refazer') refazer();
                else limpar();
            });
        });
    }

    function desfazer() {
        const op = estado.ops.pop();
        if (!op) return;
        estado.refazer.push(op);
        if (op.k === 'stroke' && op.id) delete estado.mapa[op.id];
        renderizar();
        enviar({ t: 'desfazer' });
    }

    function refazer() {
        const op = estado.refazer.pop();
        if (!op) return;
        estado.ops.push(op);
        if (op.k === 'stroke' && op.id) estado.mapa[op.id] = op;
        renderizar();
        enviar({ t: 'refazer' });
    }

    function limpar() {
        if (!estado.ops.length) return;
        if (!confirm('Limpar todo o quadro branco?')) return;
        estado.ops = [];
        estado.refazer = [];
        estado.mapa = {};
        renderizar();
        enviar({ t: 'limpar' });
    }

    function abrirTexto(p) {
        const el = $('input-texto');
        const r = canvas.getBoundingClientRect();
        el.style.left = (p.x / LAT * 100) + '%';
        el.style.top = (p.y / ALT * 100) + '%';
        el.style.fontSize = Math.max(14, 34 * r.width / LAT) + 'px';
        el.value = '';
        el.classList.remove('escondido');
        el.focus();
        const fechar = () => {
            el.classList.add('escondido');
            el.onkeydown = null;
            el.onblur = null;
        };
        const confirmar = () => {
            const txt = el.value.trim();
            if (txt) {
                const fs = 34;
                const op = { k: 'texto', x: p.x, y: p.y + fs * 0.8, txt, cor: estado.cor, fs };
                estado.ops.push(op);
                estado.refazer = [];
                aplicarOp(ctx, op);
                enviar({ t: 'op', op });
            }
            fechar();
        };
        el.onkeydown = ev => {
            ev.stopPropagation();
            if (ev.key === 'Enter') { ev.preventDefault(); confirmar(); }
            if (ev.key === 'Escape') { el.value = ''; fechar(); }
        };
        el.onblur = () => { if (!el.classList.contains('escondido')) confirmar(); };
    }

    let ultimoP = null;
    let ultimoCursorEnvio = 0;

    camada.addEventListener('pointerdown', ev => {
        if (ev.button !== undefined && ev.button !== 0) return;
        camada.setPointerCapture(ev.pointerId);
        const p = ponto(ev);
        ultimoP = p;

        if (estado.ferramenta === 'texto') { abrirTexto(p); return; }

        if (['linha', 'seta', 'retangulo', 'elipse'].includes(estado.ferramenta)) {
            estado.arrastando = { k: 'forma', f: estado.ferramenta, cor: estado.cor, tam: estado.tam, a: [p.x, p.y], b: [p.x, p.y] };
            pintarCamada();
            enviar({ t: 'pre', op: estado.arrastando });
            return;
        }

        const op = { k: 'stroke', id: uid(), f: estado.ferramenta, cor: estado.cor, tam: estado.tam, pts: [[p.x, p.y]] };
        estado.ops.push(op);
        estado.mapa[op.id] = op;
        estado.refazer = [];
        estado.traco = op;
        estado.pendentes = [];
        desenharSegmento(op, 0, 0);
        enviar({ t: 'novo', id: op.id, f: op.f, cor: op.cor, tam: op.tam });
        enviar({ t: 'pts', id: op.id, pts: [[p.x, p.y]] });
    });

    camada.addEventListener('pointermove', ev => {
        const p = ponto(ev);

        const agora = performance.now();
        if (agora - ultimoCursorEnvio > 90) {
            ultimoCursorEnvio = agora;
            enviar({ t: 'cursor', nome: meuNome(), x: p.x, y: p.y });
        }

        if (estado.traco) {
            const op = estado.traco;
            const i0 = op.pts.length;
            op.pts.push([p.x, p.y]);
            desenharSegmento(op, i0, op.pts.length);
            estado.pendentes.push([p.x, p.y]);
            if (estado.pendentes.length >= 6) {
                enviar({ t: 'pts', id: op.id, pts: estado.pendentes });
                estado.pendentes = [];
            }
            return;
        }

        if (estado.arrastando) {
            estado.arrastando.b = [p.x, p.y];
            pintarCamada();
            enviar({ t: 'pre', op: estado.arrastando });
        }
    });

    function encerrarPonteiros() {
        if (estado.traco) {
            if (estado.pendentes.length) {
                enviar({ t: 'pts', id: estado.traco.id, pts: estado.pendentes });
                estado.pendentes = [];
            }
            estado.traco = null;
        }
        if (estado.arrastando) {
            const op = estado.arrastando;
            estado.arrastando = null;
            estado.ops.push(op);
            estado.refazer = [];
            ctx.save();
            estiloForma(ctx, op);
            formaPath(ctx, op);
            ctx.restore();
            pintarCamada();
            enviar({ t: 'pre-fim' });
            enviar({ t: 'op', op });
        }
    }

    camada.addEventListener('pointerup', encerrarPonteiros);
    camada.addEventListener('pointercancel', encerrarPonteiros);

    function mostrarSala() {
        $('view-entrada').classList.add('escondido');
        $('view-sala').classList.remove('escondido');
        $('chip-codigo').textContent = 'SALA ' + estado.codigo;
        const chip = $('chip-papel');
        chip.textContent = estado.papel === 'professor' ? 'Professor' : 'Aluno';
        chip.classList.remove('escondido');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function mostrarEntrada() {
        $('view-sala').classList.add('escondido');
        $('view-entrada').classList.remove('escondido');
    }

    function criarSala(codigoForcada) {
        if (typeof Peer === 'undefined') {
            toast('Não foi possível carregar a conexão. Verifique a internet.', 'erro');
            return;
        }
        estado.papel = 'professor';
        estado.codigo = (codigoForcada || gerarCodigo()).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        if (estado.codigo.length < 6) estado.codigo = gerarCodigo();
        const peer = new Peer('simplifica-' + estado.codigo);
        estado.peer = peer;
        peer.on('open', () => {
            mostrarSala();
            setStatus('aguardando', 'Aguardando o aluno…');
        });
        peer.on('connection', conn => conectarConn(conn, true));
        peer.on('error', err => {
            if (err.type === 'unavailable-id') {
                toast('Código já em uso — tente novamente', 'erro');
                peer.destroy();
                estado.papel = null;
            } else {
                toast('Erro de conexão: ' + (err.message || err.type), 'erro');
            }
        });
    }

    function entrarSala(codigo) {
        if (typeof Peer === 'undefined') {
            toast('Não foi possível carregar a conexão. Verifique a internet.', 'erro');
            return;
        }
        estado.papel = 'aluno';
        estado.codigo = codigo;
        const peer = new Peer();
        estado.peer = peer;
        peer.on('open', () => {
            const conn = peer.connect('simplifica-' + codigo, { reliable: true });
            estado.conexao = conn;
            conectarConn(conn, false);
            conn.on('open', () => {
                mostrarSala();
                setStatus('on', 'Conectado — 2 na sala');
                toast('Você entrou na sala!', 'ok');
            });
        });
        peer.on('error', err => {
            if (err.type === 'peer-unavailable') {
                toast('Sala não encontrada. Confira o código.', 'erro');
                estado.papel = null;
                mostrarEntrada();
            } else {
                toast('Erro de conexão: ' + (err.message || err.type), 'erro');
            }
        });
    }

    function sair() {
        if (estado.gravando) pararGravacao();
        try { if (estado.peer) estado.peer.destroy(); } catch (e) { }
        estado.peer = null;
        estado.conexao = null;
        estado.conns.clear();
        estado.papel = null;
        estado.codigo = null;
        estado.ops = [];
        estado.refazer = [];
        estado.mapa = {};
        renderizar();
        $('cursor-peer').classList.add('escondido');
        mostrarEntrada();
    }

    async function gerarPDF() {
        const J = window.jsPDF || (window.jspdf && window.jspdf.jsPDF);
        if (!J) { toast('Biblioteca de PDF indisponível', 'erro'); return; }
        try {
            const doc = new J({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const hoje = new Date().toLocaleDateString('pt-BR');
            doc.setFillColor(22, 163, 74);
            doc.rect(0, 0, 297, 16, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.text('Simplifica BIO — Aula de Biologia', 10, 10.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(60, 70, 80);
            doc.text('Data: ' + hoje + '   |   Sala: ' + (estado.codigo || '—') + '   |   ' + meuNome(), 10, 23);
            const url = canvas.toDataURL('image/png');
            const w = 277;
            const h = w * ALT / LAT;
            doc.addImage(url, 'PNG', 10, 28, w, h);
            doc.setFontSize(7.5);
            doc.setTextColor(140, 150, 160);
            doc.text('Gerado em ' + new Date().toLocaleString('pt-BR') + ' — Simplifica BIO Online', 10, 28 + h + 8);
            const blob = doc.output('blob');
            const file = new File([blob], 'aula-simplifica-bio-' + slug() + '.pdf', { type: 'application/pdf' });
            oferecer(file, 'PDF da aula pronto para compartilhar');
        } catch (e) {
            toast('Erro ao gerar o PDF', 'erro');
        }
    }

    function slug() {
        return new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
    }

    async function iniciarGravacao() {
        if (!canvas.captureStream || typeof MediaRecorder === 'undefined') {
            toast('Gravação não suportada neste navegador', 'erro');
            return;
        }
        try {
            const stream = canvas.captureStream(30);
            let audioOk = false;
            try {
                const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
                mic.getAudioTracks().forEach(t => stream.addTrack(t));
                audioOk = true;
            } catch (e) {
                toast('Gravando sem áudio — permita o microfone para gravar a voz', 'erro');
            }
            const tipos = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
            const mime = tipos.find(t => MediaRecorder.isTypeSupported(t));
            const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
            estado.chunks = [];
            rec.ondataavailable = e => { if (e.data && e.data.size) estado.chunks.push(e.data); };
            rec.onstop = () => {
                const blob = new Blob(estado.chunks, { type: 'video/webm' });
                const file = new File([blob], 'aula-gravada-' + slug() + '.webm', { type: 'video/webm' });
                stream.getTracks().forEach(t => t.stop());
                oferecer(file, 'Aula gravada pronta para compartilhar');
            };
            rec.start(1000);
            estado.recorder = rec;
            estado.streamGrav = stream;
            estado.gravando = true;
            estado.inicioGrav = Date.now();
            $('btn-gravar').classList.add('on');
            $('btn-gravar').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/></svg> Parar gravação';
            $('pill-gravacao').classList.add('on');
            estado.timerGrav = setInterval(() => {
                const s = Math.floor((Date.now() - estado.inicioGrav) / 1000);
                const mm = String(Math.floor(s / 60)).padStart(2, '0');
                const ss = String(s % 60).padStart(2, '0');
                $('timer-gravacao').textContent = mm + ':' + ss;
            }, 1000);
            if (audioOk) toast('Gravando aula (com áudio)', 'ok');
        } catch (e) {
            toast('Não foi possível iniciar a gravação', 'erro');
        }
    }

    function pararGravacao() {
        if (estado.recorder && estado.recorder.state !== 'inactive') estado.recorder.stop();
        estado.recorder = null;
        estado.gravando = false;
        clearInterval(estado.timerGrav);
        $('btn-gravar').classList.remove('on');
        $('btn-gravar').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/></svg> Gravar aula';
        $('pill-gravacao').classList.remove('on');
    }

    function oferecer(file, titulo) {
        estado.arquivo = file;
        $('modal-titulo').textContent = titulo;
        $('modal-arquivo-nome').textContent = file.name;
        const podeShare = navigator.canShare && navigator.canShare({ files: [file] });
        $('btn-share').classList.toggle('escondido', !podeShare);
        $('modal-arquivo').classList.remove('escondido');
    }

    $('btn-share').addEventListener('click', async () => {
        const f = estado.arquivo;
        if (!f) return;
        try {
            await navigator.share({ files: [f], title: 'Simplifica BIO — Aula', text: 'Aula compartilhada pelo quadro branco da Simplifica BIO.' });
            $('modal-arquivo').classList.add('escondido');
        } catch (e) {
            if (e.name !== 'AbortError') toast('Não foi possível compartilhar — use "Baixar"', 'erro');
        }
    });

    $('btn-baixar').addEventListener('click', () => {
        const f = estado.arquivo;
        if (!f) return;
        const url = URL.createObjectURL(f);
        const a = document.createElement('a');
        a.href = url;
        a.download = f.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        toast('Arquivo baixado', 'ok');
        $('modal-arquivo').classList.add('escondido');
    });

    $('btn-fechar').addEventListener('click', () => $('modal-arquivo').classList.add('escondido'));

    $('btn-criar').addEventListener('click', () => criarSala());
    $('btn-entrar').addEventListener('click', () => {
        const cod = $('input-codigo').value.trim().toUpperCase();
        const ok = /^[A-Z0-9]{6}$/.test(cod);
        $('erro-codigo').style.display = ok ? 'none' : 'block';
        if (!ok) return;
        entrarSala(cod);
    });
    $('input-codigo').addEventListener('input', e => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        $('erro-codigo').style.display = 'none';
    });
    $('input-codigo').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-entrar').click(); });

    $('btn-link').addEventListener('click', () => {
        if (!estado.codigo) return;
        const url = location.origin + location.pathname + '?sala=' + estado.codigo;
        navigator.clipboard.writeText(url).then(
            () => toast('Link da sala copiado!', 'ok'),
            () => toast(url, 'erro')
        );
    });

    $('btn-pdf').addEventListener('click', gerarPDF);
    $('btn-gravar').addEventListener('click', () => { estado.gravando ? pararGravacao() : iniciarGravacao(); });
    $('btn-sair').addEventListener('click', () => sair());

    function desenhoTeste() {
        const ops = [
            { k: 'forma', f: 'linha', cor: '#dc2626', tam: 6, a: [180, 200], b: [640, 420] },
            { k: 'forma', f: 'retangulo', cor: '#16a34a', tam: 6, a: [780, 160], b: [1280, 420] },
            { k: 'forma', f: 'elipse', cor: '#0ea5e9', tam: 6, a: [220, 520], b: [700, 800] },
            { k: 'forma', f: 'seta', cor: '#7c3aed', tam: 6, a: [860, 620], b: [1340, 760] },
            { k: 'texto', x: 820, y: 540, txt: 'Sala conectada!', cor: '#111827', fs: 44 }
        ];
        for (const op of ops) {
            estado.ops.push(op);
            aplicarOp(ctx, op);
            enviar({ t: 'op', op });
        }
        toast('Desenho de teste enviado', 'ok');
    }

    const params = new URLSearchParams(location.search);

    construirToolbar();
    renderizar();

    if (params.get('vista') === 'sala') {
        estado.codigo = 'DEMO00';
        estado.papel = 'professor';
        mostrarSala();
        setStatus('on', 'Modo demonstração');
    } else if (params.get('criar')) {
        criarSala(params.get('criar'));
    } else if (params.get('sala')) {
        const cod = params.get('sala').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
        if (cod.length === 6) {
            entrarSala(cod);
            if (params.get('teste') === 'desenho') {
                const tentar = setInterval(() => {
                    if (estado.conexao && estado.conexao.open) {
                        clearInterval(tentar);
                        setTimeout(desenhoTeste, 400);
                    }
                }, 200);
            }
        } else {
            toast('Código de sala inválido no link', 'erro');
        }
    }

    window.QuadroApp = {
        estado,
        aplicarMsg,
        aplicarOp,
        renderizar,
        desenhoTeste,
        enviar
    };
})();
