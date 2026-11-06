/* Montador de Ads — v1
   Tudo roda no aparelho: dados em IndexedDB, vídeos em IndexedDB, chave do ElevenLabs em localStorage.
   Nada sai do aparelho além das chamadas pro ElevenLabs que você mesmo dispara. */
(function () {
  'use strict';

  // ---------- constantes ----------
  const FORMATOS = [
    { id: 'FMT01', nome: 'Narração + cenas de preparo' },
    { id: 'FMT02', nome: 'Cena encenada (casal à mesa)' },
    { id: 'FMT03', nome: 'Selfie falando pra câmera' },
    { id: 'FMT04', nome: 'Print de WhatsApp' },
    { id: 'FMT05', nome: 'Fofoca (duas mulheres)' },
    { id: 'FMT06', nome: 'POV' },
  ];
  const VARS = [
    { id: 'ctl', nome: 'Controle' },
    { id: 'hkc', nome: 'Hook de copy' },
    { id: 'hkv', nome: 'Hook visual' },
    { id: 'avt', nome: 'Avatar' },
    { id: 'amb', nome: 'Ambiente' },
    { id: 'fmt', nome: 'Formato' },
    { id: 'bdy', nome: 'Body' },
  ];
  const STATUS = [
    { id: 'gravar', nome: 'A gravar' }, { id: 'pronto', nome: 'Pronto pra subir' }, { id: 'teste', nome: 'Em teste' },
    { id: 'validado', nome: 'Validado' }, { id: 'escalando', nome: 'Escalando' }, { id: 'pausado', nome: 'Pausado' }, { id: 'morto', nome: 'Morto' },
  ];
  const QUEM = ['meu marido', 'minha sogra', 'minha cunhada', 'minha mãe', 'minha filha', 'meu chefe', 'minha chefe', 'minha vizinha', 'meu irmão', 'minhas amigas'];
  const FRASES = [
    'duvidava que alguém compraria meus {produtos}',
    'riu quando eu falei que ia vender {produtos}',
    'achava que {produto} feito em casa não vendia',
    'achou que eu só ia gastar dinheiro',
    'jurou que isso não ia dar certo',
  ];
  const VIRADAS = [
    { longa: 'Até ver o primeiro Pix cair.', curta: 'até ver o Pix cair' },
    { longa: 'Até ver as encomendas chegando.', curta: 'até ver as encomendas' },
    { longa: 'Até provar um.', curta: 'até provar' },
    { longa: 'Hoje me ajuda a entregar.', curta: 'hoje me ajuda a entregar' },
  ];
  const CAMERAS = [
    'Selfie, braço estendido, câmera levemente tremida',
    'Celular apoiado na bancada, plano médio',
    'Close nas mãos, câmera na mão',
    'POV de quem está filmando a cena',
    'Duas pessoas conversando, câmera parada na altura dos olhos',
  ];
  const FLOW_URL = 'https://labs.google/fx/tools/flow';
  const FEMININO = /^(minha|minhas)\b/i;

  const ICONS = {
    montar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5M16 4v5M10 13l4 2.5-4 2.5z"/></svg>',
    biblioteca: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    avatar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/><path d="M19 3l.7 1.6L21.3 5l-1.6.7L19 7.3l-.7-1.6L16.7 5l1.6-.4z"/></svg>',
    ajustes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  };

  // ---------- util ----------
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = (p) => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const brl = (n) => (n == null || isNaN(n) ? '—' : 'R$' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const num = (n, d) => (n == null || isNaN(n) ? '—' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: d == null ? 0 : d }));
  const words = (s) => (s || '').trim().split(/\s+/).filter(Boolean);
  const pad = (n, l) => String(n).padStart(l, '0');
  const numOf = (id) => parseInt(String(id || '').replace(/\D/g, ''), 10) || 0;
  const fmtProd = (s, p) => s.replace(/\{produtos\}/g, p.produtos || p.produto || 'produtos').replace(/\{produto\}/g, p.produto || 'produto');
  const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

  // ---------- armazenamento ----------
  const mem = new Map();
  let idb = null;
  function openDB() {
    return new Promise((res) => {
      try {
        const r = indexedDB.open('montador-ads', 1);
        r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('blobs'); };
        r.onsuccess = () => { idb = r.result; res(); };
        r.onerror = () => res();
      } catch (e) { res(); }
    });
  }
  function idbOp(store, mode, fn) {
    return new Promise((res) => {
      if (!idb) { res(fn(null)); return; }
      try {
        const tx = idb.transaction(store, mode); const st = tx.objectStore(store); const rq = fn(st);
        if (rq && 'onsuccess' in rq) { rq.onsuccess = () => res(rq.result); rq.onerror = () => res(undefined); } else { tx.oncomplete = () => res(); }
      } catch (e) { res(undefined); }
    });
  }
  const kvGet = (k) => (idb ? idbOp('kv', 'readonly', (s) => s.get(k)) : Promise.resolve(mem.get('kv:' + k)));
  const kvSet = (k, v) => (idb ? idbOp('kv', 'readwrite', (s) => s.put(v, k)) : Promise.resolve(mem.set('kv:' + k, v)));
  const blobGet = (k) => (k ? (idb ? idbOp('blobs', 'readonly', (s) => s.get(k)) : Promise.resolve(mem.get('b:' + k))) : Promise.resolve(null));
  const blobSet = (k, v) => (idb ? idbOp('blobs', 'readwrite', (s) => s.put(v, k)) : Promise.resolve(mem.set('b:' + k, v)));
  const blobDel = (k) => (idb ? idbOp('blobs', 'readwrite', (s) => s.delete(k)) : Promise.resolve(mem.delete('b:' + k)));

  const lsGet = (k, d) => { try { const v = localStorage.getItem('montador:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem('montador:' + k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };

  // ---------- estado ----------
  let DB = null;
  const UI = { tab: 'montar', lib: 'takes', mont: null, playing: null, pedido: null };
  let saveT = null;
  function save() { clearTimeout(saveT); saveT = setTimeout(() => kvSet('db', JSON.parse(JSON.stringify(DB))), 250); }
  const P = () => DB.projetos.find((p) => p.id === DB.atual) || DB.projetos[0];
  const AJ = () => Object.assign({ elKey: '', elVoice: '', elVoiceName: '', elModel: 'eleven_multilingual_v2', res: '1080', vozes: [] }, lsGet('ajustes', {}));
  const setAJ = (o) => lsSet('ajustes', Object.assign(AJ(), o));

  function novoProjeto(o) {
    return Object.assign({
      id: uid('p-'), nome: 'Nova oferta', prefixo: 'ofr', produto: 'produto', produtos: 'produtos', ticket: 37.9, cpaIdeal: 28, criadoEm: new Date().toISOString().slice(0, 10),
      mps: [{ id: 'MP01', nome: 'Público principal' }], angs: [{ id: 'ANG01', nome: 'Quem duvidou de mim' }],
      avatares: [], hooks: [], bodies: [], ctas: [{ id: 'CTA-01', texto: 'Toque em Saiba Mais e garanta o seu.', tela: 'Toque em Saiba Mais' }],
      takes: [], ads: [], montagens: [], pedidos: [],
    }, o);
  }

  // ---------- métricas ----------
  function adUsa(ad, tipo, id) {
    if (tipo === 'take') return (ad.takes || []).includes(id);
    if (tipo === 'hook') return ad.hook === id;
    if (tipo === 'body') return ad.body === id;
    if (tipo === 'cta') return ad.cta === id;
    if (tipo === 'avatar') return ad.av === id;
    return ad.id === id;
  }
  function metricas(p, tipo, id) {
    const ads = tipo === 'ad' ? p.ads.filter((a) => a.id === id) : p.ads.filter((a) => adUsa(a, tipo, id));
    const m = { nAds: ads.length, nRodou: 0, gasto: 0, imp: 0, ic: 0, vendas: 0, hookW: 0, hookImp: 0, hookN: 0, hookSum: 0, est: false };
    ads.forEach((a) => {
      if (a.gasto != null || a.vendas != null) m.nRodou++;
      m.gasto += +a.gasto || 0; m.imp += +a.imp || 0; m.ic += +a.ic || 0; m.vendas += +a.vendas || 0;
      if (a.hookRate != null && a.hookRate !== '') {
        m.hookN++; m.hookSum += +a.hookRate; if (a.imp) { m.hookW += a.hookRate * a.imp; m.hookImp += +a.imp; } if (a.hookEst) m.est = true;
      }
    });
    m.cpa = m.vendas ? m.gasto / m.vendas : null;
    m.custoIC = m.ic ? m.gasto / m.ic : null;
    m.hook = m.hookN ? (m.hookImp ? m.hookW / m.hookImp : m.hookSum / m.hookN) : null;
    return m;
  }
  function chips(p, m, opts) {
    opts = opts || {};
    if (!m.nRodou) return `<div class="metrics"><span class="m none">${m.nAds ? 'em ' + m.nAds + ' ad' + (m.nAds > 1 ? 's' : '') + ', sem número ainda' : 'sem métrica ainda'}</span></div>`;
    const t = +p.ticket || 0; const ideal = +p.cpaIdeal || 0;
    const cpaCls = m.cpa == null ? (m.gasto > 3 * t ? 'bad' : '') : m.cpa <= ideal ? 'good' : m.cpa <= t ? 'warn' : 'bad';
    const icCls = m.custoIC == null ? '' : m.custoIC <= t * 0.1 ? 'good' : m.custoIC <= t * 0.2 ? 'warn' : 'bad';
    const hkCls = m.hook == null ? '' : m.hook >= 55 ? 'good' : m.hook >= 30 ? 'warn' : 'bad';
    const out = [
      `<span class="m ${m.vendas ? 'good' : ''}"><b>${num(m.vendas)}</b> vendas</span>`,
      `<span class="m ${cpaCls}">CPA <b>${m.cpa == null ? '—' : brl(m.cpa)}</b></span>`,
      `<span class="m ${icCls}">IC <b>${num(m.ic)}</b>${m.custoIC != null ? ' · ' + brl(m.custoIC) : ''}</span>`,
      `<span class="m ${hkCls}">Hook <b>${m.hook == null ? '—' : num(m.hook, 1) + '%'}</b>${m.est ? '~' : ''}</span>`,
    ];
    if (!opts.short) out.push(`<span class="m">gasto ${brl(m.gasto)}</span>`);
    if (m.nAds > 1 && !opts.short) out.push(`<span class="m">${m.nAds} ads</span>`);
    return `<div class="metrics">${out.join('')}</div>`;
  }
  // nota pra ordenar: quem vendeu mais barato vem primeiro
  function nota(m) { if (!m.nRodou) return -1; return (m.vendas || 0) * 1000 - (m.cpa || 999) + (m.hook || 0) / 100; }

  // ---------- nomes ----------
  function nomeAd(p, o) {
    return [p.prefixo || 'ofr', (o.mp || 'MP01'), (o.ang || 'ANG01'), (o.fmt || 'FMT01'), (o.av || 'AV00'), (o.varCode || 'hkc'), pad(o.num || 1, 3)]
      .join('-').toLowerCase();
  }
  const proxNum = (p) => Math.max(0, ...p.ads.map((a) => numOf(a.id)), ...p.montagens.map((m) => +m.num || 0)) + 1;
  const proxId = (arr, pre, l) => pre + pad(Math.max(0, ...arr.map((x) => numOf(x.id))) + 1, l || 3);

  // ---------- render raiz ----------
  function render() {
    const p = P();
    document.title = 'Montador de Ads';
    $('#app').innerHTML = `
      <header class="top wrap">
        <div class="brand">Montador de Ads<small>v1 · roda no aparelho</small></div>
        <button class="proj-btn" data-act="projetos" aria-label="Trocar de projeto"><span class="pfx">${esc(p.prefixo)}</span><span class="pn">${esc(p.nome)}</span></button>
      </header>
      <main class="wrap" id="view"></main>
      <nav class="tabs" aria-label="Seções">
        ${[['montar', 'Montar'], ['biblioteca', 'Biblioteca'], ['avatar', 'Take com avatar'], ['ajustes', 'Ajustes']]
          .map(([k, n]) => `<button data-act="tab" data-v="${k}" aria-current="${UI.tab === k}">${ICONS[k]}<span>${n}</span></button>`).join('')}
      </nav>`;
    renderView();
  }
  function renderView() {
    const v = $('#view'); if (!v) return;
    if (UI.tab === 'montar') v.innerHTML = UI.mont ? viewEditor() : viewMontarHome();
    if (UI.tab === 'biblioteca') v.innerHTML = viewBiblioteca();
    if (UI.tab === 'avatar') v.innerHTML = viewAvatar();
    if (UI.tab === 'ajustes') v.innerHTML = viewAjustes();
    v.querySelectorAll('textarea.segtext').forEach(autosize);
    if (UI.tab === 'montar' && UI.mont) desenharParado();
    if (UI.tab === 'biblioteca') hydrateThumbs();
  }
  function autosize(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }

  // ---------- MONTAR: início ----------
  function viewMontarHome() {
    const p = P();
    const mol = UI.molde || (UI.molde = { quem: 'meu marido', frase: 0, virada: 0, fmt: 'FMT01', av: (p.avatares[0] || {}).id || '', body: (p.bodies[0] || {}).id || '', cta: (p.ctas[0] || {}).id || '', amb: '', adaptar: false, escolha: 0 });
    const opts = gerarHooks(p, mol);
    const temQuem = p.ads.some((a) => (p.angs.find((g) => g.id === a.ang) || {}).nome?.toLowerCase().includes('duvid')) || p.montagens.some((m) => m.molde === 'quem');
    return `
      ${inFrame ? `<div class="notice">Esta é a prévia. Gerar voz e salvar o vídeo funcionam no app instalado no celular; aqui dá pra montar e tocar o rascunho.</div>` : ''}
      <section class="card hero">
        <div class="eyebrow">Molde validado</div>
        <h2>Quem duvidou de mim</h2>
        <p class="small muted">Hook que vendeu de novo em 05/11. Toda oferta nova sobe com um ad dele.${temQuem ? '' : ' <b>Este projeto ainda não tem.</b>'} Trocar só a frase não conta como ad novo pro leilão: varie também avatar, ambiente ou formato.</p>
        <div class="stack">
          <div class="eyebrow">Quem duvidou</div>
          <div class="chips">${QUEM.map((q) => `<button class="chip" data-act="mol" data-k="quem" data-v="${esc(q)}" aria-pressed="${mol.quem === q}">${esc(q)}</button>`).join('')}</div>
          <input class="i" id="mol-quem" placeholder="Ou escreva: o pastor da minha igreja…" value="${QUEM.includes(mol.quem) ? '' : esc(mol.quem)}">
        </div>
        <div class="stack">
          <div class="eyebrow">Escolha o hook</div>
          ${opts.map((o, i) => `<button class="hookopt" data-act="mol" data-k="escolha" data-v="${i}" aria-pressed="${mol.escolha === i}">
              <span class="ban">${esc(o.banner)}</span><span>${esc(o.texto)}</span>
              <span class="small muted">${words(o.texto).length} palavras</span></button>`).join('')}
        </div>
        <div class="grid2">
          <label class="f">Formato<select class="i" id="mol-fmt">${FORMATOS.map((f) => `<option value="${f.id}" ${mol.fmt === f.id ? 'selected' : ''}>${f.id} ${esc(f.nome)}</option>`).join('')}</select></label>
          <label class="f">Avatar<select class="i" id="mol-av"><option value="">Sem avatar fixo</option>${p.avatares.map((a) => `<option value="${a.id}" ${mol.av === a.id ? 'selected' : ''}>${a.id} ${esc(a.nome)}</option>`).join('')}</select></label>
          <label class="f">Body<select class="i" id="mol-body"><option value="">Escrever na hora</option>${p.bodies.map((b) => `<option value="${b.id}" ${mol.body === b.id ? 'selected' : ''}>${b.id} ${esc(b.nome)}</option>`).join('')}</select></label>
          <label class="f">CTA<select class="i" id="mol-cta">${p.ctas.map((c) => `<option value="${c.id}" ${mol.cta === c.id ? 'selected' : ''}>${c.id}</option>`).join('')}</select></label>
        </div>
        <label class="f">Ambiente<input class="i" id="mol-amb" placeholder="cozinha clara, sala com árvore de Natal…" value="${esc(mol.amb)}"></label>
        <label class="row small"><input type="checkbox" id="mol-adaptar" ${mol.adaptar ? 'checked' : ''}> Trocar "meu marido" no body por quem duvidou (por padrão o body validado fica intacto)</label>
        <button class="btn primary block" data-act="montar-molde">Montar este ad</button>
      </section>
      <section class="stack">
        <div class="row"><h3 class="grow">Montagens</h3><button class="btn sm" data-act="montar-branco">Em branco</button></div>
        ${p.montagens.length ? p.montagens.slice().reverse().map((m) => `
          <div class="card tap" data-act="abrir" data-v="${m.id}">
            <div class="row"><span class="mono grow">${esc(nomeAd(p, m))}</span>${m.adId ? '<span class="pill pronto">exportado</span>' : '<span class="pill">rascunho</span>'}</div>
            <p class="small">${esc((m.segs[0] || {}).texto || '')}</p>
            <div class="row small muted">${m.segs.length} trechos · ${m.segs.filter((s) => takeDe(p, s.take)?.blob).length} com vídeo · ${durTotal(p, m).toFixed(0)} s</div>
          </div>`).join('') : '<div class="empty">Nenhuma montagem ainda. Escolha um hook acima e toque em Montar.</div>'}
      </section>`;
  }
  function gerarHooks(p, mol) {
    const quem = mol.quem || 'meu marido';
    const base = FRASES.map((f) => fmtProd(f, p));
    const out = [];
    const combos = [[0, 0], [1, 1], [3, 0], [2, 2]];
    combos.forEach(([fi, vi]) => {
      const fr = base[fi]; const vr = VIRADAS[vi];
      const verbo = fr.split(' ')[0];
      out.push({ texto: `${cap(quem)} ${fr}. ${vr.longa}`, banner: `${cap(quem)} ${verbo}... ${vr.curta}`, quem });
    });
    return out;
  }

  function criarMontagem(p, o) {
    const m = Object.assign({ id: uid('m-'), mp: p.mps[0]?.id || 'MP01', ang: p.angs[0]?.id || 'ANG01', fmt: 'FMT01', av: '', amb: '', varCode: 'hkc', num: proxNum(p), banner: '', segs: [], criadaEm: new Date().toISOString() }, o);
    p.montagens.push(m); save(); return m;
  }
  function seg(papel, texto, extra) { return Object.assign({ id: uid('s-'), papel, texto, take: '', tela: '', dur: null, voz: null, vozDur: null, words: null, somTake: false, cena: '' }, extra); }
  function sugerirTake(p, cena, usados) {
    const cands = p.takes.filter((t) => (t.tags || []).includes(cena));
    cands.sort((a, b) => (b.blob ? 1 : 0) - (a.blob ? 1 : 0) || nota(metricas(p, 'take', b.id)) - nota(metricas(p, 'take', a.id)));
    return (cands.find((t) => !usados.has(t.id)) || cands[0] || {}).id || '';
  }
  function montarDoMolde() {
    const p = P(); const mol = UI.molde; const h = gerarHooks(p, mol)[mol.escolha || 0];
    const body = p.bodies.find((b) => b.id === mol.body); const cta = p.ctas.find((c) => c.id === mol.cta);
    const ang = p.angs.find((g) => /duvid/i.test(g.nome)) || p.angs[0];
    const usados = new Set();
    const pick = (cena) => { const t = sugerirTake(p, cena, usados); if (t) usados.add(t); return t; };
    const segs = [seg('hook', h.texto, { take: pick('hook'), cena: 'hook' })];
    const fem = FEMININO.test(h.quem);
    (body ? body.blocos : [{ texto: '', cena: '' }]).forEach((b) => {
      let t = b.texto;
      if (mol.adaptar && h.quem !== 'meu marido') {
        t = t.replace(/meu marido/gi, h.quem).replace(/^Ele /, fem ? 'Ela ' : 'Ele ').replace(/ ele /g, fem ? ' ela ' : ' ele ');
      }
      segs.push(seg('body', t, { take: pick(b.cena), cena: b.cena }));
    });
    if (cta) segs.push(seg('cta', cta.texto, { take: pick('cta'), tela: cta.tela || '', cena: 'cta' }));
    const m = criarMontagem(p, { molde: 'quem', quem: h.quem, ang: ang?.id || 'ANG01', fmt: mol.fmt, av: mol.av, amb: mol.amb, banner: h.banner, hookTexto: h.texto, body: body?.id || '', cta: cta?.id || '', segs });
    m.varCode = varSugerida(p, m);
    UI.mont = m.id; save(); renderView(); window.scrollTo(0, 0);
    toast('Montado. Toque num trecho pra trocar o take.');
  }
  function varSugerida(p, m) {
    const base = p.ads.find((a) => a.status === 'validado' || a.status === 'escalando') || p.ads[0];
    if (!base) return 'ctl';
    if (m.av && base.av !== m.av) return 'avt';
    if (base.fmt !== m.fmt) return 'fmt';
    if (m.amb) return 'amb';
    const hookTake = (m.segs[0] || {}).take;
    if (hookTake && !(base.takes || []).includes(hookTake)) return 'hkv';
    return 'hkc';
  }

  // ---------- MONTAR: editor ----------
  const takeDe = (p, id) => p.takes.find((t) => t.id === id);
  const montAtual = () => P().montagens.find((m) => m.id === UI.mont);
  function estimar(texto) { const n = words(texto).length; return n ? Math.max(1.2, n / 2.7 + 0.3) : 2; }
  function segDur(p, s) {
    if (s.dur) return s.dur;
    if (s.vozDur) return s.vozDur + 0.12;
    const t = takeDe(p, s.take);
    if (s.somTake && t && t.dur) return Math.max(0.5, t.dur - (t.ini || 0));
    return estimar(s.texto);
  }
  const durTotal = (p, m) => m.segs.reduce((a, s) => a + segDur(p, s), 0);

  function checagens(p, m) {
    const out = [];
    const hook = m.segs.find((s) => s.papel === 'hook');
    const htxt = (hook?.texto || '');
    const n = words(htxt).length;
    out.push(n <= 15 ? { c: 'ok', t: `Hook com ${n} palavras (até 15).` } : { c: 'warn', t: `Hook com ${n} palavras. A régua é até 15; corte ou deixe a virada pro body.` });
    const renda = /R\$\s?\d|\d[\d.,]*\s?(reais|mil)\b|\b(cem|duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos|mil)\b[^.]*\breais\b/i;
    if (renda.test(htxt + ' ' + (m.banner || ''))) out.push({ c: 'warn', t: 'Tem número de renda no hook ou no banner. A base proíbe; o HK-001 tem e está rodando, então a decisão é sua.' });
    else out.push({ c: 'ok', t: 'Sem número de renda no hook.' });
    out.push(m.banner || hook?.tela ? { c: 'ok', t: 'Teste do mudo: tem texto na tela no começo.' } : { c: 'warn', t: 'Teste do mudo: sem banner nem texto na tela no hook. Sem som, dá pra entender?' });
    const assin = (o) => [o.av || '', o.fmt || '', (o.segs ? o.segs[0]?.take : (o.takes || [])[0]) || ''].join('|');
    const igual = p.ads.find((a) => a.montagemId !== m.id && assin(a) === assin(m));
    if (igual) out.push({ c: 'bad', t: `Mesmo avatar, formato e take de abertura do ${igual.id}. Pro leilão é quase o mesmo ad: varie avatar, ambiente ou formato.` });
    const sem = m.segs.filter((s) => !takeDe(p, s.take)?.blob).length;
    out.push(sem ? { c: 'info', t: `${sem} de ${m.segs.length} trechos ainda sem vídeo. Eles aparecem como cartão no rascunho.` } : { c: 'ok', t: 'Todos os trechos têm vídeo.' });
    const semVoz = m.segs.filter((s) => !s.voz && !s.somTake).length;
    if (semVoz) out.push({ c: 'info', t: `${semVoz} trechos sem voz. Gere no ElevenLabs ou marque "usar o som do take".` });
    return out;
  }

  function viewEditor() {
    const p = P(); const m = montAtual();
    if (!m) { UI.mont = null; return viewMontarHome(); }
    const total = durTotal(p, m);
    let acc = 0;
    return `
      <div class="row"><button class="btn sm ghost" data-act="voltar">‹ Montagens</button><span class="grow"></span>
        <button class="btn sm" data-act="duplicar">Duplicar como variação</button></div>
      <section class="stage">
        <canvas id="tela" width="540" height="960" aria-label="Prévia do anúncio"></canvas>
        <div class="bar"><i id="barra"></i></div>
        <div class="row" style="justify-content:center">
          <button class="btn dark" data-act="tocar">${UI.playing ? ICONS.stop + ' Parar' : ICONS.play + ' Tocar'}</button>
          <span class="mono muted">${total.toFixed(1)} s</span>
        </div>
        <div class="adname" data-act="editar-nome" title="Toque pra editar">${esc(nomeAd(p, m))}</div>
      </section>
      <section class="card">
        <div class="eyebrow">Checagem antes de subir</div>
        <div class="checks">${checagens(p, m).map((c) => `<div class="check ${c.c}"><span class="dot"></span><span>${esc(c.t)}</span></div>`).join('')}</div>
      </section>
      <label class="f">Banner do topo (fica no hook)<input class="i" id="banner" value="${esc(m.banner)}" placeholder="Ex.: Meu marido duvidava... até ver o Pix cair"></label>
      <section class="stack">
        ${m.segs.map((s, i) => { const ini = acc; acc += segDur(p, s); return segCard(p, m, s, i, ini); }).join('')}
        <button class="btn block" data-act="add-seg">+ Trecho no fim</button>
      </section>
      <section class="card">
        <div class="row"><button class="btn grow" data-act="voz">Gerar voz (ElevenLabs)</button><button class="btn primary grow" data-act="exportar">Exportar vídeo</button></div>
        <button class="btn sm danger" data-act="apagar-mont">Apagar montagem</button>
      </section>`;
  }
  function segCard(p, m, s, i, ini) {
    const t = takeDe(p, s.take);
    const role = s.papel === 'hook' ? 'HOOK' : s.papel === 'cta' ? 'CTA' : 'BODY ' + m.segs.slice(0, i).filter((x) => x.papel === 'body').length + 1;
    const mt = t ? metricas(p, 'take', t.id) : null;
    return `<article class="segcard ${s.papel}" data-seg="${s.id}">
      <div class="seghead"><span class="role">${role}</span><span class="mono muted small">${ini.toFixed(1)}s</span>
        <div class="dur"><button data-act="dur" data-d="-0.5" aria-label="Menos meio segundo">−</button><span>${segDur(p, s).toFixed(1)}s${s.dur ? '' : ' auto'}</span><button data-act="dur" data-d="0.5" aria-label="Mais meio segundo">+</button></div></div>
      <textarea class="segtext" data-k="texto" rows="1" aria-label="Fala do trecho">${esc(s.texto)}</textarea>
      <div class="take">
        <div class="thumb ${t?.thumb ? '' : 'empty'}" ${t?.thumb ? `style="background-image:url(${t.thumb})"` : ''}>${t ? (t.thumb ? '' : 'sem<br>vídeo') : 'sem<br>take'}</div>
        <div class="stack" style="gap:6px;min-width:0">
          <span class="tt">${t ? esc(t.id + ' · ' + t.titulo) : 'Nenhum take'}</span>
          ${mt ? chips(p, mt, { short: true }) : ''}
        </div>
      </div>
      <div class="segact">
        <button class="btn sm" data-act="trocar">Trocar take</button>
        <button class="btn sm" data-act="pedir-avatar">Take com avatar</button>
        <button class="btn sm ghost" data-act="mais">⋯</button>
      </div>
      ${s.tela || s.papel === 'cta' ? `<label class="f">Texto na tela<input class="i" data-k="tela" value="${esc(s.tela)}"></label>` : ''}
      ${s.voz ? `<span class="small muted">Voz gerada · ${(s.vozDur || 0).toFixed(1)} s</span>` : ''}
      ${s.somTake ? '<span class="small muted">Usando o som do take</span>' : ''}
    </article>`;
  }

  // ---------- render no canvas (prévia e export usam o mesmo) ----------
  function wrapLines(ctx, text, maxW) {
    const ws = words(text); const lines = []; let cur = '';
    ws.forEach((w) => { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function tempoPalavras(s, dur) {
    if (s.words && s.words.length) return s.words;
    const ws = words(s.texto); if (!ws.length) return [];
    const pesos = ws.map((w) => w.length + 2); const tot = pesos.reduce((a, b) => a + b, 0);
    let t = 0; const usable = Math.max(0.5, dur - 0.15);
    return ws.map((w, i) => { const d = usable * pesos[i] / tot; const o = { w, s: t, e: t + d }; t += d; return o; });
  }
  const DISPLAY = '"Bricolage Grotesque", "Arial Black", "Arial", sans-serif';
  function desenhar(ctx, W, H, f) {
    const { seg: s, take: t, video, tl, dur, mont: m, prog } = f;
    const k = W / 1080;
    ctx.fillStyle = '#0d0e0c'; ctx.fillRect(0, 0, W, H);
    if (video && video.readyState >= 2 && video.videoWidth) {
      const vr = video.videoWidth / video.videoHeight; const cr = W / H; let sw, sh, sx, sy;
      if (vr > cr) { sh = video.videoHeight; sw = sh * cr; sx = (video.videoWidth - sw) / 2; sy = 0; } else { sw = video.videoWidth; sh = sw / cr; sx = 0; sy = (video.videoHeight - sh) / 2; }
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, W, H);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a2d27'); g.addColorStop(1, '#141612'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.setLineDash([18 * k, 14 * k]); ctx.lineWidth = 4 * k; rrect(ctx, 60 * k, 420 * k, W - 120 * k, 560 * k, 40 * k); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = `700 ${30 * k}px "JetBrains Mono", monospace`; ctx.textAlign = 'center';
      ctx.fillText(t ? (t.blob ? 'CARREGANDO' : 'TAKE SEM VÍDEO · ' + t.id) : 'TRECHO SEM TAKE', W / 2, 500 * k);
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `600 ${40 * k}px "Figtree", sans-serif`;
      wrapLines(ctx, t ? t.titulo : 'Toque em Trocar take', W - 220 * k).slice(0, 6).forEach((l, i) => ctx.fillText(l, W / 2, (580 + i * 54) * k));
    }
    // banner do hook
    if (s.papel === 'hook' && m.banner) {
      ctx.font = `800 ${54 * k}px ${DISPLAY}`; const ls = wrapLines(ctx, m.banner, W - 200 * k).slice(0, 3);
      const lh = 64 * k; const bh = ls.length * lh + 44 * k; const bw = Math.min(W - 120 * k, Math.max(...ls.map((l) => ctx.measureText(l).width)) + 70 * k);
      const bx = (W - bw) / 2; const by = 190 * k;
      ctx.fillStyle = '#f5cb2a'; rrect(ctx, bx, by, bw, bh, 22 * k); ctx.fill();
      ctx.fillStyle = '#16130a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ls.forEach((l, i) => ctx.fillText(l, W / 2, by + 22 * k + lh * (i + 0.5)));
      ctx.textBaseline = 'alphabetic';
    }
    // texto na tela
    if (s.tela) {
      ctx.font = `800 ${58 * k}px ${DISPLAY}`; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
      const ls = wrapLines(ctx, s.tela.toUpperCase(), W - 180 * k).slice(0, 3);
      ls.forEach((l, i) => { const y = (s.papel === 'cta' ? 1180 : 420) * k + i * 68 * k; ctx.lineWidth = 12 * k; ctx.strokeStyle = '#000'; ctx.strokeText(l, W / 2, y); ctx.fillStyle = '#fff'; ctx.fillText(l, W / 2, y); });
    }
    // legenda palavra por palavra
    const pw = tempoPalavras(s, dur);
    if (pw.length) {
      let idx = pw.findIndex((w) => tl >= w.s && tl < w.e); if (idx < 0) idx = tl >= (pw[pw.length - 1].e) ? pw.length - 1 : 0;
      const g0 = Math.floor(idx / 3) * 3; const grupo = pw.slice(g0, g0 + 3);
      ctx.font = `800 ${74 * k}px ${DISPLAY}`; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
      const txt = grupo.map((w) => w.w.toUpperCase());
      const sp = ctx.measureText(' ').width; let totalW = txt.reduce((a, w) => a + ctx.measureText(w).width, 0) + sp * (txt.length - 1);
      let scale = 1; if (totalW > W - 120 * k) { scale = (W - 120 * k) / totalW; }
      ctx.save(); ctx.translate(W / 2, 1460 * k); ctx.scale(scale, scale);
      let x = -totalW / 2;
      txt.forEach((w, i) => {
        ctx.lineWidth = 14 * k; ctx.strokeStyle = '#000'; ctx.strokeText(w, x, 0);
        ctx.fillStyle = g0 + i === idx ? '#f5cb2a' : '#fff'; ctx.fillText(w, x, 0);
        x += ctx.measureText(w).width + sp;
      });
      ctx.restore();
    }
    // seta do CTA
    if (s.papel === 'cta') {
      const bob = Math.sin(tl * 6) * 16 * k; const cx = W / 2; const y = 1640 * k + bob;
      ctx.fillStyle = '#2bd46a'; ctx.strokeStyle = '#06210f'; ctx.lineWidth = 8 * k;
      ctx.beginPath(); ctx.moveTo(cx - 34 * k, y - 90 * k); ctx.lineTo(cx + 34 * k, y - 90 * k); ctx.lineTo(cx + 34 * k, y); ctx.lineTo(cx + 80 * k, y); ctx.lineTo(cx, y + 90 * k); ctx.lineTo(cx - 80 * k, y); ctx.lineTo(cx - 34 * k, y); ctx.closePath(); ctx.stroke(); ctx.fill();
    }
    if (prog != null) { ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(0, H - 6 * k, W, 6 * k); ctx.fillStyle = '#f5cb2a'; ctx.fillRect(0, H - 6 * k, W * prog, 6 * k); }
  }
  async function desenharParado() {
    const c = $('#tela'); if (!c) return; const p = P(); const m = montAtual(); if (!m || !m.segs.length) return;
    const s = m.segs[0]; const t = takeDe(p, s.take); let video = null;
    if (t && t.blob) { video = await carregarVideo(t, true); }
    desenhar(c.getContext('2d'), c.width, c.height, { seg: s, take: t, video, tl: 0.6, dur: segDur(p, s), mont: m });
    if (video) { URL.revokeObjectURL(video.src); }
  }
  async function carregarVideo(t, seekOnly) {
    const b = await blobGet(t.blob); if (!b) return null;
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = URL.createObjectURL(b);
    await new Promise((r) => { v.onloadeddata = r; v.onerror = r; setTimeout(r, 4000); });
    if (seekOnly) { v.currentTime = (t.ini || 0) + 0.3; await new Promise((r) => { v.onseeked = r; setTimeout(r, 1500); }); }
    return v;
  }

  // ---------- motor de reprodução / gravação ----------
  async function tocar(opts) {
    const p = P(); const m = montAtual(); if (!m) return null;
    const canvas = opts.canvas; const ctx = canvas.getContext('2d'); const W = canvas.width, H = canvas.height;
    const AC = window.AudioContext || window.webkitAudioContext; const ac = new AC();
    if (ac.state === 'suspended') await ac.resume();
    const out = ac.createGain(); out.connect(ac.destination);
    const dest = opts.record ? ac.createMediaStreamDestination() : null; if (dest) out.connect(dest);
    const prep = [];
    for (const s of m.segs) {
      const t = takeDe(p, s.take); let video = null, vg = null, voz = null;
      if (t && t.blob) {
        const b = await blobGet(t.blob);
        if (b) {
          video = document.createElement('video'); video.playsInline = true; video.preload = 'auto'; video.src = URL.createObjectURL(b);
          await new Promise((r) => { video.onloadeddata = r; video.onerror = r; setTimeout(r, 5000); });
          video.currentTime = t.ini || 0; await new Promise((r) => { video.onseeked = r; setTimeout(r, 1500); });
          try { const src = ac.createMediaElementSource(video); vg = ac.createGain(); src.connect(vg); vg.connect(out); vg.gain.value = s.somTake && !s.voz ? 1 : 0; } catch (e) { video.muted = !(s.somTake && !s.voz); }
        }
      }
      if (s.voz) { const b = await blobGet(s.voz); if (b) { try { voz = await ac.decodeAudioData(await b.arrayBuffer()); } catch (e) { voz = null; } } }
      prep.push({ s, t, video, vg, voz, dur: segDur(p, s) });
    }
    const total = prep.reduce((a, x) => a + x.dur, 0);
    let rec = null; const parts = []; let mime = '';
    if (opts.record) {
      const stream = canvas.captureStream(30); dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
      const cands = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
      mime = cands.find((c) => window.MediaRecorder && MediaRecorder.isTypeSupported(c)) || '';
      rec = new MediaRecorder(stream, { mimeType: mime || undefined, videoBitsPerSecond: W >= 1080 ? 9e6 : 5e6, audioBitsPerSecond: 160000 });
      rec.ondataavailable = (e) => e.data && e.data.size && parts.push(e.data);
      rec.start(500);
    }
    let tg = 0; const stopFlag = opts.stop || { v: false };
    for (const x of prep) {
      if (stopFlag.v) break;
      if (x.video) { try { await x.video.play(); } catch (e) { /* segue sem vídeo tocando */ } }
      let src = null; if (x.voz) { src = ac.createBufferSource(); src.buffer = x.voz; src.connect(out); src.start(); }
      const t0 = performance.now();
      await new Promise((res) => {
        const frame = () => {
          const tl = (performance.now() - t0) / 1000;
          desenhar(ctx, W, H, { seg: x.s, take: x.t, video: x.video, tl, dur: x.dur, mont: m, prog: opts.record ? null : (tg + tl) / total });
          opts.onProgress && opts.onProgress(Math.min(1, (tg + tl) / total));
          if (tl >= x.dur || stopFlag.v) { res(); return; }
          requestAnimationFrame(frame);
        };
        frame();
      });
      if (x.video) x.video.pause(); if (src) { try { src.stop(); } catch (e) { /* já parou */ } }
      tg += x.dur;
    }
    let blob = null;
    if (rec) { await new Promise((r) => { rec.onstop = r; rec.stop(); }); blob = new Blob(parts, { type: (mime || 'video/webm').split(';')[0] }); }
    prep.forEach((x) => x.video && URL.revokeObjectURL(x.video.src));
    try { await ac.close(); } catch (e) { /* ok */ }
    return blob;
  }

  // ---------- BIBLIOTECA ----------
  function viewBiblioteca() {
    const p = P();
    const abas = [['takes', 'Takes', p.takes.length], ['hooks', 'Hooks', p.hooks.length], ['bodies', 'Bodies', p.bodies.length], ['ctas', 'CTAs', p.ctas.length], ['avatares', 'Avatares', p.avatares.length], ['ads', 'Ads', p.ads.length]];
    let body = '';
    const ordena = (arr, tipo) => arr.slice().sort((a, b) => nota(metricas(p, tipo, b.id)) - nota(metricas(p, tipo, a.id)));
    if (UI.lib === 'takes') {
      body = `<div class="row"><label class="btn primary grow">+ Subir takes do celular<input type="file" accept="video/*" multiple hidden id="up-takes"></label></div>
        ${ordena(p.takes, 'take').map((t) => { const m = metricas(p, 'take', t.id); return `<article class="card libcard">
          <div class="thumb ${t.thumb ? '' : 'empty'}" data-thumb="${t.id}" ${t.thumb ? `style="background-image:url(${t.thumb})"` : ''}>${t.thumb ? '' : 'sem<br>vídeo'}</div>
          <div class="stack" style="gap:7px;min-width:0">
            <div class="row"><span class="mono">${t.id}</span>${t.av ? `<span class="pill">${esc(t.av)}</span>` : ''}${t.dur ? `<span class="mono muted">${t.dur.toFixed(1)}s</span>` : ''}</div>
            <span class="tt" style="font-weight:600">${esc(t.titulo)}</span>
            ${chips(p, m, { short: true })}
            <div class="small muted">${(t.tags || []).map((g) => '#' + esc(g)).join(' ')}${t.obs && !t.blob ? ' · ' + esc(t.obs) : ''}</div>
            <div class="row"><label class="btn sm">${t.blob ? 'Trocar vídeo' : 'Vincular vídeo'}<input type="file" accept="video/*" hidden data-vinc="${t.id}"></label><button class="btn sm ghost" data-act="edit-take" data-v="${t.id}">Editar</button></div>
          </div></article>`; }).join('') || '<div class="empty">Suba os takes que você já tem. Cada take ganha as métricas dos ads em que entrou.</div>'}`;
    }
    if (UI.lib === 'hooks') {
      body = `<button class="btn" data-act="novo-hook">+ Hook</button>` + ordena(p.hooks, 'hook').map((h) => { const m = metricas(p, 'hook', h.id); return `<article class="card">
        <div class="row"><span class="mono grow">${h.id}</span><span class="small muted">${esc(h.tipo || '')}</span></div>
        <p>${esc(h.texto || '(fala ainda não colada)')}</p>
        ${h.banner ? `<span class="hookopt" style="padding:0;border:0;background:none"><span class="ban">${esc(h.banner)}</span></span>` : ''}
        ${chips(p, m)}
        <div class="row"><button class="btn sm" data-act="montar-hook" data-v="${h.id}">Montar com este hook</button><button class="btn sm ghost" data-act="edit-hook" data-v="${h.id}">Editar</button></div></article>`; }).join('');
    }
    if (UI.lib === 'bodies') {
      body = `<button class="btn" data-act="novo-body">+ Body (colar roteiro)</button>` + ordena(p.bodies, 'body').map((b) => `<article class="card">
        <div class="row"><span class="mono grow">${b.id}</span><span class="small muted">${b.blocos.length} trechos · ~${b.blocos.reduce((a, x) => a + estimar(x.texto), 0).toFixed(0)} s</span></div>
        <h3>${esc(b.nome)}</h3>${b.obs ? `<p class="small muted">${esc(b.obs)}</p>` : ''}
        ${chips(p, metricas(p, 'body', b.id))}
        <button class="btn sm ghost" data-act="edit-body" data-v="${b.id}">Ver e editar</button></article>`).join('');
    }
    if (UI.lib === 'ctas') {
      body = `<button class="btn" data-act="novo-cta">+ CTA</button>` + ordena(p.ctas, 'cta').map((c) => `<article class="card">
        <div class="row"><span class="mono grow">${c.id}</span><span class="small muted">${esc(c.tela || '')}</span></div><p>${esc(c.texto)}</p>${c.obs ? `<p class="small muted">${esc(c.obs)}</p>` : ''}
        ${chips(p, metricas(p, 'cta', c.id))}<button class="btn sm ghost" data-act="edit-cta" data-v="${c.id}">Editar</button></article>`).join('');
    }
    if (UI.lib === 'avatares') {
      body = `<button class="btn" data-act="novo-avatar">+ Avatar</button><p class="small muted">A ficha em inglês vai igual em todo prompt do Flow. É isso que mantém a mesma pessoa de um take pro outro.</p>` + ordena(p.avatares, 'avatar').map((a) => `<article class="card">
        <div class="row"><span class="mono">${a.id}</span><h3 class="grow">${esc(a.nome)}</h3></div><p class="small mono muted">${esc(a.ficha)}</p>
        ${chips(p, metricas(p, 'avatar', a.id))}<div class="row"><button class="btn sm" data-act="avatar-flow" data-v="${a.id}">Pedir take com ele</button><button class="btn sm ghost" data-act="edit-avatar" data-v="${a.id}">Editar</button></div></article>`).join('');
    }
    if (UI.lib === 'ads') {
      body = `<p class="small muted">Lance aqui os números do Gerenciador. Eles sobem pros takes, hooks, bodies, CTAs e avatares de cada ad.</p>` + p.ads.slice().reverse().sort((a, b) => nota(metricas(p, 'ad', b.id)) - nota(metricas(p, 'ad', a.id))).map((a) => `<article class="card tap" data-act="edit-ad" data-v="${a.id}">
        <div class="row"><span class="mono grow">${esc(a.nome || nomeAd(p, Object.assign({ num: numOf(a.id) }, a)))}</span><span class="pill ${a.status}">${esc((STATUS.find((s) => s.id === a.status) || {}).nome || a.status)}</span></div>
        <div class="small muted">${a.id} · ${esc(a.hook)} · ${esc(a.body)} · ${(a.takes || []).length} take${(a.takes || []).length === 1 ? '' : 's'}${a.subiuEm ? ' · subiu ' + a.subiuEm.split('-').reverse().join('/') : ''}</div>
        ${chips(p, metricas(p, 'ad', a.id))}</article>`).join('');
    }
    return `<div class="seg" role="tablist">${abas.map(([k, n, c]) => `<button class="chip" data-act="lib" data-v="${k}" aria-pressed="${UI.lib === k}">${n} <span class="muted">${c}</span></button>`).join('')}</div><section class="stack">${body}</section>`;
  }
  async function hydrateThumbs() { /* miniaturas já ficam salvas como imagem pequena; nada a carregar */ }

  async function importarVideo(file, take) {
    const p = P();
    const key = 'take:' + p.id + ':' + take.id + ':' + Date.now().toString(36);
    if (take.blob) await blobDel(take.blob);
    await blobSet(key, file); take.blob = key; take.arquivo = file.name;
    try {
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = URL.createObjectURL(file);
      await new Promise((r) => { v.onloadeddata = r; v.onerror = r; setTimeout(r, 6000); });
      take.dur = isFinite(v.duration) ? v.duration : 0;
      v.currentTime = Math.min(0.5, (take.dur || 1) / 2); await new Promise((r) => { v.onseeked = r; setTimeout(r, 2000); });
      const c = document.createElement('canvas'); c.width = 108; c.height = 192; const x = c.getContext('2d');
      const vr = v.videoWidth / v.videoHeight || 0.5625; const cr = 108 / 192; let sw, sh, sx, sy;
      if (vr > cr) { sh = v.videoHeight; sw = sh * cr; sx = (v.videoWidth - sw) / 2; sy = 0; } else { sw = v.videoWidth; sh = sw / cr; sx = 0; sy = (v.videoHeight - sh) / 2; }
      x.drawImage(v, sx, sy, sw, sh, 0, 0, 108, 192); take.thumb = c.toDataURL('image/jpeg', 0.7);
      URL.revokeObjectURL(v.src);
    } catch (e) { /* sem miniatura */ }
    save();
  }
  async function novoTakeDeArquivo(file, extra) {
    const p = P();
    const t = Object.assign({ id: proxId(p.takes, 'T-'), titulo: file.name.replace(/\.[^.]+$/, ''), tags: [], av: '', obs: '', blob: null, thumb: null, dur: 0, ini: 0, prompt: '' }, extra);
    p.takes.push(t); await importarVideo(file, t); return t;
  }

  // ---------- TAKE COM AVATAR (Flow) ----------
  function promptFlow(p, d) {
    const av = p.avatares.find((a) => a.id === d.av);
    const fala = (d.fala || '').trim();
    return [
      'Vertical 9:16 video, 8 seconds, realistic smartphone footage, UGC style, natural light, no cinematic grading.',
      av ? `Character: ${av.ficha}. Keep exactly the same person, face, hair and clothes as the reference.` : 'Character: describe the person here.',
      d.amb ? `Setting: ${d.amb}.` : '',
      d.acao ? `Action: ${d.acao}.` : '',
      `Camera: ${d.camera}.`,
      fala ? `She speaks Brazilian Portuguese, natural and casual, lips in sync, saying exactly: "${fala}"` : 'No dialogue.',
      'No on-screen text, no subtitles, no logos, no music.',
    ].filter(Boolean).join('\n');
  }
  function viewAvatar() {
    const p = P();
    const d = UI.pedido || (UI.pedido = { av: (p.avatares[0] || {}).id || '', amb: '', acao: '', fala: '', camera: CAMERAS[0], ref: null });
    const nf = words(d.fala).length;
    const pend = p.pedidos.filter((x) => x.status === 'aguardando');
    return `
      <section class="card hero">
        <div class="eyebrow">Flow não tem API: você cola o prompt lá e sobe o take aqui</div>
        <h2>Pedir take com avatar</h2>
        ${d.ref ? `<p class="small">Vai encaixar no <b>${esc(d.ref.label)}</b> da montagem aberta.</p>` : ''}
        <label class="f">Avatar<select class="i" id="pd-av"><option value="">Sem ficha</option>${p.avatares.map((a) => `<option value="${a.id}" ${d.av === a.id ? 'selected' : ''}>${a.id} ${esc(a.nome)}</option>`).join('')}</select></label>
        <label class="f">Ambiente<input class="i" id="pd-amb" value="${esc(d.amb)}" placeholder="bright home kitchen with Christmas lights"></label>
        <label class="f">Ação<input class="i" id="pd-acao" value="${esc(d.acao)}" placeholder="holds a homemade panettone and smiles at the camera"></label>
        <label class="f">Câmera<select class="i" id="pd-cam">${CAMERAS.map((c) => `<option ${d.camera === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
        <label class="f">Fala (português)<textarea class="i" id="pd-fala" rows="3">${esc(d.fala)}</textarea></label>
        ${nf > 20 ? `<div class="notice">${nf} palavras não cabem em 8 s (cabem umas 20). Divida em dois takes.</div>` : ''}
        <div class="prompt" id="pd-prompt">${esc(promptFlow(p, d))}</div>
        <div class="row">
          <button class="btn dark grow" data-act="copiar-prompt">Copiar prompt</button>
          <a class="btn grow" href="${FLOW_URL}" target="_blank" rel="noopener">Abrir o Flow</a>
        </div>
        <button class="btn primary block" data-act="salvar-pedido">Salvar pedido e esperar o take</button>
      </section>
      <section class="stack">
        <h3>Aguardando take (${pend.length})</h3>
        ${pend.map((x) => `<article class="card">
          <div class="row"><span class="mono grow">${x.id}</span>${x.ref ? `<span class="pill teste">${esc(x.ref.label)}</span>` : ''}</div>
          <p class="small">${esc(x.fala || x.acao || '')}</p>
          <div class="row">
            <button class="btn sm" data-act="copiar-pedido" data-v="${x.id}">Copiar prompt</button>
            <label class="btn sm primary">Subir take pronto<input type="file" accept="video/*" hidden data-pedido="${x.id}"></label>
            <button class="btn sm ghost danger" data-act="apagar-pedido" data-v="${x.id}">Apagar</button>
          </div></article>`).join('') || '<div class="empty">Nenhum pedido aberto. Na montagem, toque em "Take com avatar" num trecho pra começar daqui com a fala pronta.</div>'}
      </section>`;
  }

  // ---------- AJUSTES ----------
  function viewAjustes() {
    const a = AJ(); const p = P();
    return `
      <section class="card">
        <h3>Voz no ElevenLabs</h3>
        <p class="small muted">A chave fica só neste aparelho. Nenhum dado vai pra outro lugar.</p>
        <label class="f">Chave da API<input class="i" id="aj-key" type="password" autocomplete="off" value="${esc(a.elKey)}" placeholder="sk_…"></label>
        <div class="row"><button class="btn sm" data-act="carregar-vozes">Carregar minhas vozes</button><span class="small muted">${a.vozes.length ? a.vozes.length + ' vozes' : ''}</span></div>
        <label class="f">Voz${a.vozes.length ? `<select class="i" id="aj-voice">${a.vozes.map((v) => `<option value="${esc(v.id)}" ${a.elVoice === v.id ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select>` : `<input class="i" id="aj-voice" value="${esc(a.elVoice)}" placeholder="ID da voz">`}</label>
        <label class="f">Modelo<select class="i" id="aj-model">${['eleven_multilingual_v2', 'eleven_turbo_v2_5', 'eleven_flash_v2_5', 'eleven_v3'].map((mm) => `<option ${a.elModel === mm ? 'selected' : ''}>${mm}</option>`).join('')}</select></label>
      </section>
      <section class="card">
        <h3>Exportar</h3>
        <label class="f">Resolução<select class="i" id="aj-res"><option value="1080" ${a.res === '1080' ? 'selected' : ''}>1080 × 1920 (padrão do Meta)</option><option value="720" ${a.res === '720' ? 'selected' : ''}>720 × 1280 (celular mais fraco)</option></select></label>
        <p class="small muted">O vídeo é gravado em tempo real: um ad de 80 s leva 80 s. Deixe a tela ligada.</p>
      </section>
      <section class="card">
        <h3>Projeto: ${esc(p.nome)}</h3>
        <div class="grid2">
          <label class="f">Nome<input class="i" id="pj-nome" value="${esc(p.nome)}"></label>
          <label class="f">Prefixo do nome<input class="i" id="pj-prefixo" value="${esc(p.prefixo)}" maxlength="6"></label>
          <label class="f">Produto (singular)<input class="i" id="pj-produto" value="${esc(p.produto)}"></label>
          <label class="f">Produto (plural)<input class="i" id="pj-produtos" value="${esc(p.produtos)}"></label>
          <label class="f">Ticket R$<input class="i" id="pj-ticket" inputmode="decimal" value="${esc(String(p.ticket).replace('.', ','))}"></label>
          <label class="f">CPA ideal R$<input class="i" id="pj-cpa" inputmode="decimal" value="${esc(String(p.cpaIdeal).replace('.', ','))}"></label>
        </div>
        <p class="small muted">Cores das métricas: CPA verde até o ideal, amarelo até o ticket. Custo por IC verde até 10% do ticket. Hook verde a partir de 55%.</p>
      </section>
      <section class="card">
        <h3>Backup</h3>
        <p class="small muted">Os dados ficam neste aparelho. O backup leva textos e métricas; os vídeos ficam de fora.</p>
        <div class="row"><button class="btn sm" data-act="backup">Baixar backup</button><label class="btn sm">Restaurar backup<input type="file" accept="application/json,.json" hidden id="restaurar"></label></div>
      </section>`;
  }

  // ---------- folhas ----------
  function sheet(html, onClose) {
    fecharSheet();
    const s = document.createElement('div'); s.className = 'scrim'; s.id = 'scrim';
    s.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    s.addEventListener('click', (e) => { if (e.target === s) fecharSheet(); });
    s._onClose = onClose; document.body.appendChild(s); return s.firstElementChild;
  }
  function fecharSheet() { const s = $('#scrim'); if (s) { s._onClose && s._onClose(); s.remove(); } }

  function sheetProjetos() {
    const el = sheet(`<div class="sheethead"><h3>Projetos</h3><button class="btn sm ghost" data-act="fechar">Fechar</button></div>
      ${DB.projetos.map((p) => { const v = p.ads.reduce((a, x) => a + (+x.vendas || 0), 0); return `<button class="card tap" style="text-align:left" data-act="usar-projeto" data-v="${p.id}">
        <div class="row"><span class="pill ${p.id === DB.atual ? 'validado' : ''}">${esc(p.prefixo)}</span><h3 class="grow">${esc(p.nome)}</h3></div>
        <span class="small muted">${p.ads.length} ads · ${v} vendas · ${p.takes.length} takes · ${p.montagens.length} montagens</span></button>`; }).join('')}
      <hr><h3>Novo projeto</h3>
      <div class="grid2">
        <label class="f">Nome da oferta<input class="i" id="np-nome" placeholder="Bolo de pote"></label>
        <label class="f">Prefixo<input class="i" id="np-prefixo" placeholder="bdp" maxlength="6"></label>
        <label class="f">Produto (singular)<input class="i" id="np-produto" placeholder="bolo de pote"></label>
        <label class="f">Produto (plural)<input class="i" id="np-produtos" placeholder="bolos de pote"></label>
        <label class="f">Ticket R$<input class="i" id="np-ticket" inputmode="decimal" placeholder="37,90"></label>
      </div>
      <button class="btn primary" data-act="criar-projeto">Criar projeto</button>
      <p class="small muted">Cada projeto tem a própria biblioteca, montagens e métricas. O prefixo abre o nome de todo ad exportado.</p>`);
    return el;
  }

  function sheetTrocar(segId) {
    const p = P(); const m = montAtual(); const s = m.segs.find((x) => x.id === segId);
    const tag = s.papel === 'hook' ? 'hook' : s.papel === 'cta' ? 'cta' : s.cena;
    const lista = p.takes.slice().sort((a, b) => ((b.tags || []).includes(tag) ? 1 : 0) - ((a.tags || []).includes(tag) ? 1 : 0) || nota(metricas(p, 'take', b.id)) - nota(metricas(p, 'take', a.id)));
    sheet(`<div class="sheethead"><h3>Trocar take</h3><button class="btn sm ghost" data-act="fechar">Fechar</button></div>
      <p class="small muted">"${esc(s.texto.slice(0, 90))}${s.texto.length > 90 ? '…' : ''}"</p>
      <div class="row"><label class="btn primary grow">Subir vídeo novo<input type="file" accept="video/*" hidden data-novo-seg="${s.id}"></label><button class="btn grow" data-act="pedir-avatar" data-seg-id="${s.id}">Take com avatar</button></div>
      ${lista.map((t) => `<button class="take" style="text-align:left;border:${t.id === s.take ? '2px solid var(--fg)' : '1px solid var(--line)'};cursor:pointer" data-act="escolher-take" data-v="${t.id}" data-seg-id="${s.id}">
        <div class="thumb ${t.thumb ? '' : 'empty'}" ${t.thumb ? `style="background-image:url(${t.thumb})"` : ''}>${t.thumb ? '' : 'sem<br>vídeo'}</div>
        <div class="stack" style="gap:6px;min-width:0"><span class="tt">${esc(t.id + ' · ' + t.titulo)}${(t.tags || []).includes(tag) ? ' <span class="pill teste">sugerido</span>' : ''}</span>${chips(p, metricas(p, 'take', t.id), { short: true })}</div></button>`).join('')}
      <button class="btn ghost" data-act="escolher-take" data-v="" data-seg-id="${s.id}">Deixar sem take</button>`);
  }

  function sheetMais(segId) {
    const m = montAtual(); const i = m.segs.findIndex((x) => x.id === segId); const s = m.segs[i];
    sheet(`<div class="sheethead"><h3>Trecho</h3><button class="btn sm ghost" data-act="fechar">Fechar</button></div>
      <label class="f">Texto na tela<input class="i" id="mx-tela" value="${esc(s.tela)}" placeholder="Ex.: +100 receitas em PDF"></label>
      <label class="row small"><input type="checkbox" id="mx-som" ${s.somTake ? 'checked' : ''}> Usar o som do take (avatar que já fala, gerado no Flow)</label>
      <label class="f">Começar o take em (s)<input class="i" id="mx-ini" inputmode="decimal" value="${esc(String((takeDe(P(), s.take) || {}).ini || 0).replace('.', ','))}"></label>
      <div class="grid2">
        <button class="btn" data-act="mover" data-d="-1" data-seg-id="${s.id}" ${i === 0 ? 'disabled' : ''}>Subir</button>
        <button class="btn" data-act="mover" data-d="1" data-seg-id="${s.id}" ${i === m.segs.length - 1 ? 'disabled' : ''}>Descer</button>
        <button class="btn" data-act="add-depois" data-seg-id="${s.id}">+ Trecho depois</button>
        <button class="btn" data-act="dur-auto" data-seg-id="${s.id}">Duração automática</button>
      </div>
      ${s.voz ? `<button class="btn" data-act="tirar-voz" data-seg-id="${s.id}">Tirar a voz gerada</button>` : ''}
      <button class="btn danger" data-act="apagar-seg" data-seg-id="${s.id}">Apagar trecho</button>
      <button class="btn primary" data-act="salvar-mais" data-seg-id="${s.id}">Salvar</button>`);
  }

  function sheetNome() {
    const p = P(); const m = montAtual();
    const sel = (id, arr, v) => `<select class="i" id="${id}">${arr.map((x) => `<option value="${x.id}" ${v === x.id ? 'selected' : ''}>${x.id} ${esc(x.nome || '')}</option>`).join('')}</select>`;
    sheet(`<div class="sheethead"><h3>Nome do ad</h3><button class="btn sm ghost" data-act="fechar">Fechar</button></div>
      <div class="mono">${esc(nomeAd(p, m))}</div>
      <div class="grid2">
        <label class="f">Micro-persona${sel('nm-mp', p.mps, m.mp)}</label>
        <label class="f">Ângulo${sel('nm-ang', p.angs, m.ang)}</label>
        <label class="f">Formato${sel('nm-fmt', FORMATOS, m.fmt)}</label>
        <label class="f">Avatar${sel('nm-av', [{ id: 'AV00', nome: 'sem avatar' }].concat(p.avatares), m.av || 'AV00')}</label>
        <label class="f">Variável mudada${sel('nm-var', VARS, m.varCode)}</label>
        <label class="f">Número<input class="i" id="nm-num" inputmode="numeric" value="${m.num}"></label>
      </div>
      <label class="f">Ambiente<input class="i" id="nm-amb" value="${esc(m.amb)}"></label>
      <p class="small muted">Uma variável por peça. Se mudou hook e avatar juntos, o resultado não ensina qual ganhou.</p>
      <button class="btn primary" data-act="salvar-nome">Salvar</button>`);
  }

  function sheetAd(id) {
    const p = P(); const a = p.ads.find((x) => x.id === id); const m = metricas(p, 'ad', id);
    const f = (k, l, ph) => `<label class="f">${l}<input class="i" id="ad-${k}" inputmode="decimal" value="${a[k] == null ? '' : esc(String(a[k]).replace('.', ','))}" placeholder="${ph || ''}"></label>`;
    sheet(`<div class="sheethead"><h3>${a.id}</h3><button class="btn sm ghost" data-act="fechar">Fechar</button></div>
      <div class="mono">${esc(a.nome || '')}</div>
      ${chips(p, m)}
      <label class="f">Status<select class="i" id="ad-status">${STATUS.map((s) => `<option value="${s.id}" ${a.status === s.id ? 'selected' : ''}>${s.nome}</option>`).join('')}</select></label>
      <div class="grid2">${f('gasto', 'Gasto R$', '172,90')}${f('imp', 'Impressões')}${f('hookRate', 'Hook rate %', '3 s ÷ impressões')}${f('ctr', 'CTR link %')}${f('ic', 'IC')}${f('vendas', 'Vendas')}</div>
      <label class="row small"><input type="checkbox" id="ad-hookEst" ${a.hookEst ? 'checked' : ''}> Hook rate aproximado</label>
      <label class="f">ID do anúncio no Meta<input class="i" id="ad-metaId" value="${esc(a.metaId)}"></label>
      <label class="f">Subiu em<input class="i" id="ad-subiuEm" type="date" value="${esc(a.subiuEm)}"></label>
      <label class="f">Observação<textarea class="i" id="ad-obs">${esc(a.obs)}</textarea></label>
      <button class="btn primary" data-act="salvar-ad" data-v="${a.id}">Salvar números</button>`);
  }

  function sheetEditar(tipo, id) {
    const p = P();
    const arr = { hook: p.hooks, body: p.bodies, cta: p.ctas, avatar: p.avatares, take: p.takes }[tipo];
    let o = arr.find((x) => x.id === id);
    const novo = !o;
    if (novo) {
      o = { hook: { id: proxId(p.hooks, 'H-'), texto: '', banner: '', quem: '', tipo: '' }, body: { id: proxId(p.bodies, 'BD-'), nome: '', blocos: [], obs: '' }, cta: { id: proxId(p.ctas, 'CTA-', 2), texto: '', tela: 'Toque em Saiba Mais' }, avatar: { id: proxId(p.avatares, 'AV', 2), nome: '', ficha: '' } }[tipo];
    }
    let campos = '';
    if (tipo === 'hook') campos = `<label class="f">Fala<textarea class="i" id="ed-texto">${esc(o.texto)}</textarea></label><label class="f">Banner<input class="i" id="ed-banner" value="${esc(o.banner)}"></label><label class="f">Tipo / variável<input class="i" id="ed-tipo" value="${esc(o.tipo)}"></label>`;
    if (tipo === 'body') campos = `<label class="f">Nome<input class="i" id="ed-nome" value="${esc(o.nome)}"></label><label class="f">Roteiro (um trecho por linha; se colar corrido, eu separo pelas frases)<textarea class="i" id="ed-roteiro" rows="10">${esc(o.blocos.map((b) => b.texto).join('\n'))}</textarea></label><label class="f">Cenas (uma por linha, na mesma ordem: produto, celular, pdf…)<textarea class="i" id="ed-cenas" rows="4">${esc(o.blocos.map((b) => b.cena || '').join('\n'))}</textarea></label><label class="f">Observação<input class="i" id="ed-obs" value="${esc(o.obs)}"></label>`;
    if (tipo === 'cta') campos = `<label class="f">Fala<textarea class="i" id="ed-texto">${esc(o.texto)}</textarea></label><label class="f">Texto na tela<input class="i" id="ed-tela" value="${esc(o.tela)}"></label>`;
    if (tipo === 'avatar') campos = `<label class="f">Nome<input class="i" id="ed-nome" value="${esc(o.nome)}"></label><label class="f">Ficha pro Flow (em inglês: idade, cabelo, roupa, jeito)<textarea class="i" id="ed-ficha" rows="4">${esc(o.ficha)}</textarea></label>`;
    if (tipo === 'take') campos = `<label class="f">Descrição<input class="i" id="ed-titulo" value="${esc(o.titulo)}"></label><label class="f">Cenas / tags (separadas por vírgula)<input class="i" id="ed-tags" value="${esc((o.tags || []).join(', '))}"></label><label class="f">Avatar<select class="i" id="ed-av"><option value="">—</option>${p.avatares.map((a) => `<option value="${a.id}" ${o.av === a.id ? 'selected' : ''}>${a.id} ${esc(a.nome)}</option>`).join('')}</select></label>${o.prompt ? `<div class="prompt">${esc(o.prompt)}</div>` : ''}`;
    sheet(`<div class="sheethead"><h3>${novo ? 'Novo' : 'Editar'} ${o.id}</h3><button class="btn sm ghost" data-act="fechar">Fechar</button></div>${campos}
      <button class="btn primary" data-act="salvar-ed" data-tipo="${tipo}" data-v="${o.id}" data-novo="${novo ? 1 : 0}">Salvar</button>
      ${!novo ? `<button class="btn danger" data-act="apagar-ed" data-tipo="${tipo}" data-v="${o.id}">Apagar</button>` : ''}`);
  }

  async function sheetVoz() {
    const p = P(); const m = montAtual(); const a = AJ();
    const alvo = m.segs.filter((s) => !s.somTake && s.texto.trim());
    const chars = alvo.reduce((n, s) => n + s.texto.length, 0);
    const ok = a.elKey && a.elVoice;
    sheet(`<div class="sheethead"><h3>Gerar voz</h3><button class="btn sm ghost" data-act="fechar">Fechar</button></div>
      ${ok ? `<p>Vai gerar <b>${alvo.length} trechos</b>, cerca de <b>${chars.toLocaleString('pt-BR')} caracteres</b> do seu plano no ElevenLabs, com a voz <b>${esc(a.elVoiceName || a.elVoice)}</b>.</p>
        <p class="small muted">A legenda passa a seguir o tempo de cada palavra que o ElevenLabs devolve. Trechos com "usar o som do take" ficam de fora.</p>
        <div class="bar" style="width:100%"><i id="voz-bar"></i></div><p class="small" id="voz-msg"></p>
        <button class="btn primary" data-act="voz-go">Gerar agora</button>`
      : `<p>Falta a chave da API e a voz. Coloque em Ajustes; ficam só neste aparelho.</p><button class="btn primary" data-act="tab" data-v="ajustes">Ir pra Ajustes</button>`}`);
  }
  async function gerarVoz() {
    const m = montAtual(); const a = AJ(); const btn = $('[data-act="voz-go"]'); if (btn) btn.disabled = true;
    const alvo = m.segs.filter((s) => !s.somTake && s.texto.trim());
    for (let i = 0; i < alvo.length; i++) {
      const s = alvo[i]; const idx = m.segs.indexOf(s);
      $('#voz-msg') && ($('#voz-msg').textContent = `Trecho ${i + 1} de ${alvo.length}…`);
      try {
        const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(a.elVoice)}/with-timestamps?output_format=mp3_44100_128`, {
          method: 'POST', headers: { 'xi-api-key': a.elKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: s.texto, model_id: a.elModel, previous_text: (m.segs[idx - 1] || {}).texto || undefined, next_text: (m.segs[idx + 1] || {}).texto || undefined, voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true } }),
        });
        if (!r.ok) { const tx = await r.text(); throw new Error(r.status === 401 ? 'chave recusada (401). Confira a chave em Ajustes.' : r.status === 429 ? 'limite do plano atingido (429).' : 'erro ' + r.status + ': ' + tx.slice(0, 120)); }
        const j = await r.json();
        const bin = atob(j.audio_base64); const u8 = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
        const blob = new Blob([u8], { type: 'audio/mpeg' });
        const key = 'voz:' + m.id + ':' + s.id + ':' + Date.now().toString(36);
        if (s.voz) await blobDel(s.voz);
        await blobSet(key, blob); s.voz = key;
        const al = j.alignment || j.normalized_alignment;
        if (al && al.characters) {
          const ws = []; let cur = null;
          al.characters.forEach((ch, k) => {
            if (/\s/.test(ch)) { if (cur) { ws.push(cur); cur = null; } return; }
            if (!cur) cur = { w: '', s: al.character_start_times_seconds[k], e: 0 };
            cur.w += ch; cur.e = al.character_end_times_seconds[k];
          });
          if (cur) ws.push(cur);
          s.words = ws; s.vozDur = ws.length ? ws[ws.length - 1].e : null;
        }
        if (!s.vozDur) { try { const ac = new (window.AudioContext || window.webkitAudioContext)(); const buf = await ac.decodeAudioData(await blob.arrayBuffer()); s.vozDur = buf.duration; ac.close(); } catch (e) { s.vozDur = estimar(s.texto); } }
        s.dur = null; save();
        $('#voz-bar') && ($('#voz-bar').style.width = ((i + 1) / alvo.length * 100) + '%');
      } catch (e) {
        const msg = /Failed to fetch|NetworkError|Load failed/i.test(String(e.message)) ? 'sem conexão com o ElevenLabs (rede ou bloqueio do navegador).' : e.message;
        $('#voz-msg') && ($('#voz-msg').textContent = `Parou no trecho ${i + 1}: ${msg}`); if (btn) btn.disabled = false; renderView(); return;
      }
    }
    $('#voz-msg') && ($('#voz-msg').textContent = 'Pronto. Toque em Tocar pra ouvir.');
    renderView();
  }

  function sheetExport() {
    const p = P(); const m = montAtual(); const a = AJ();
    const nome = nomeAd(p, m); const total = durTotal(p, m);
    const graves = checagens(p, m).filter((c) => c.c === 'bad' || c.c === 'warn');
    sheet(`<div class="sheethead"><h3>Exportar</h3><button class="btn sm ghost" data-act="fechar">Fechar</button></div>
      <div class="mono">${esc(nome)}</div>
      <p class="small muted">${a.res === '720' ? '720 × 1280' : '1080 × 1920'} · ${total.toFixed(1)} s · grava em tempo real, deixe a tela ligada.</p>
      ${graves.length ? `<div class="notice">${graves.map((g) => esc(g.t)).join('<br>')}</div>` : ''}
      <canvas id="tela-exp" width="${a.res === '720' ? 720 : 1080}" height="${a.res === '720' ? 1280 : 1920}" style="width:140px;aspect-ratio:9/16;border-radius:10px;background:#000;justify-self:center"></canvas>
      <div class="bar" style="width:100%"><i id="exp-bar"></i></div>
      <p class="small" id="exp-msg"></p>
      <button class="btn primary" data-act="exp-go">Gerar vídeo</button>
      <div class="row" id="exp-out" hidden></div>`, () => { if (UI.exportStop) UI.exportStop.v = true; });
  }
  async function exportar() {
    const p = P(); const m = montAtual(); const btn = $('[data-act="exp-go"]'); btn.disabled = true;
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { $('#exp-msg').textContent = 'Este navegador não grava vídeo. Use o Chrome no Android ou o Safari atualizado no iPhone.'; return; }
    let lock = null; try { lock = await navigator.wakeLock?.request('screen'); } catch (e) { /* sem wake lock */ }
    UI.exportStop = { v: false };
    $('#exp-msg').textContent = 'Gravando…';
    let blob = null;
    try { blob = await tocar({ canvas: $('#tela-exp'), record: true, stop: UI.exportStop, onProgress: (f) => { const b = $('#exp-bar'); if (b) b.style.width = (f * 100) + '%'; } }); } catch (e) { $('#exp-msg') && ($('#exp-msg').textContent = 'Falhou: ' + e.message); }
    try { lock && lock.release(); } catch (e) { /* ok */ }
    if (!blob || UI.exportStop.v) { btn && (btn.disabled = false); return; }
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const nome = nomeAd(p, m) + '.' + ext;
    const url = URL.createObjectURL(blob);
    // registra o ad na biblioteca
    let ad = p.ads.find((x) => x.montagemId === m.id);
    if (!ad) { ad = { id: 'HK-' + pad(m.num, 3), montagemId: m.id, status: 'pronto', gasto: null, imp: null, hookRate: null, hookEst: false, ic: null, vendas: null, ctr: null, metaId: '', subiuEm: '', obs: '' }; p.ads.push(ad); }
    let hook = p.hooks.find((h) => h.texto === m.segs[0]?.texto);
    if (!hook && m.segs[0]) { hook = { id: proxId(p.hooks, 'H-'), texto: m.segs[0].texto, banner: m.banner, quem: m.quem || '', tipo: (VARS.find((v) => v.id === m.varCode) || {}).nome || '' }; p.hooks.push(hook); }
    Object.assign(ad, { nome: nomeAd(p, m), hook: hook?.id || '', body: m.body || '', cta: m.cta || '', takes: [...new Set(m.segs.map((s) => s.take).filter(Boolean))], mp: m.mp, ang: m.ang, fmt: m.fmt, av: m.av, varCode: m.varCode });
    m.adId = ad.id; save();
    $('#exp-msg').textContent = `Pronto: ${nome} (${(blob.size / 1048576).toFixed(1)} MB). Já entrou em Biblioteca › Ads como ${ad.id}.${ext === 'webm' ? ' Este aparelho só grava WebM; se o Meta recusar, converta pra MP4.' : ''}`;
    const out = $('#exp-out'); out.hidden = false;
    out.innerHTML = `<a class="btn primary grow" href="${url}" download="${esc(nome)}">Salvar no aparelho</a>${navigator.canShare ? '<button class="btn grow" data-act="compartilhar">Compartilhar</button>' : ''}<button class="btn sm ghost" data-act="copiar-nome" data-v="${esc(nomeAd(p, m))}">Copiar nome</button>`;
    UI.ultimoExport = new File([blob], nome, { type: blob.type });
  }

  // ---------- toast ----------
  let toastT = null;
  function toast(msg) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }
  async function copiar(txt) {
    try { await navigator.clipboard.writeText(txt); toast('Copiado'); } catch (e) {
      const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Copiado'); } catch (e2) { toast('Selecione e copie o texto'); } ta.remove();
    }
  }
  const dec = (v) => { if (v == null || String(v).trim() === '') return null; const n = parseFloat(String(v).replace(/\./g, (m, o, s) => (/,/.test(s) ? '' : '.')).replace(',', '.')); return isNaN(n) ? null : n; };

  // ---------- eventos ----------
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act; const v = el.dataset.v; const p = P();
    const segEl = el.closest('[data-seg]'); const segId = el.dataset.segId || (segEl && segEl.dataset.seg);
    const m = montAtual(); const s = m && segId ? m.segs.find((x) => x.id === segId) : null;
    switch (act) {
      case 'tab': fecharSheet(); UI.tab = v; render(); window.scrollTo(0, 0); break;
      case 'fechar': fecharSheet(); break;
      case 'projetos': sheetProjetos(); break;
      case 'usar-projeto': DB.atual = v; UI.mont = null; UI.molde = null; UI.pedido = null; save(); fecharSheet(); render(); break;
      case 'criar-projeto': {
        const nome = $('#np-nome').value.trim(); if (!nome) { toast('Dê um nome pro projeto'); return; }
        const pref = ($('#np-prefixo').value.trim() || nome.slice(0, 3)).toLowerCase().replace(/[^a-z0-9]/g, '');
        const np = novoProjeto({ nome, prefixo: pref, produto: $('#np-produto').value.trim() || nome.toLowerCase(), produtos: $('#np-produtos').value.trim() || nome.toLowerCase(), ticket: dec($('#np-ticket').value) || 37.9 });
        DB.projetos.push(np); DB.atual = np.id; UI.mont = null; UI.molde = null; save(); fecharSheet(); render(); toast('Projeto criado'); break;
      }
      case 'mol': {
        const mol = UI.molde; if (el.dataset.k === 'escolha') mol.escolha = +v; else { mol.quem = v; mol.escolha = mol.escolha || 0; }
        renderView(); break;
      }
      case 'montar-molde': montarDoMolde(); break;
      case 'montar-branco': { const nm = criarMontagem(p, { segs: [seg('hook', ''), seg('body', ''), seg('cta', (p.ctas[0] || {}).texto || '', { tela: (p.ctas[0] || {}).tela || '' })] }); UI.mont = nm.id; renderView(); break; }
      case 'montar-hook': {
        const h = p.hooks.find((x) => x.id === v); const body = p.bodies[0]; const cta = p.ctas[0];
        const usados = new Set(); const pick = (c) => { const t = sugerirTake(p, c, usados); if (t) usados.add(t); return t; };
        const segs = [seg('hook', h.texto, { take: pick('hook'), cena: 'hook' })].concat((body ? body.blocos : []).map((b) => seg('body', b.texto, { take: pick(b.cena), cena: b.cena })));
        if (cta) segs.push(seg('cta', cta.texto, { tela: cta.tela, take: pick('cta'), cena: 'cta' }));
        const nm = criarMontagem(p, { banner: h.banner, quem: h.quem, body: body?.id, cta: cta?.id, segs }); nm.varCode = varSugerida(p, nm);
        UI.mont = nm.id; UI.tab = 'montar'; render(); break;
      }
      case 'abrir': UI.mont = v; renderView(); window.scrollTo(0, 0); break;
      case 'voltar': UI.mont = null; if (UI.playing) UI.playing.v = true; renderView(); break;
      case 'duplicar': {
        const c = JSON.parse(JSON.stringify(m)); c.id = uid('m-'); c.num = proxNum(p); c.adId = null; c.criadaEm = new Date().toISOString(); c.segs.forEach((x) => { x.id = uid('s-'); x.voz = null; x.vozDur = null; x.words = null; });
        p.montagens.push(c); UI.mont = c.id; save(); renderView(); window.scrollTo(0, 0); toast('Variação criada. Troque avatar, ambiente ou formato.'); break;
      }
      case 'apagar-mont': {
        if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = 'Toque de novo pra apagar'; return; }
        for (const x of m.segs) if (x.voz) await blobDel(x.voz);
        p.montagens = p.montagens.filter((x) => x.id !== m.id); UI.mont = null; save(); renderView(); break;
      }
      case 'tocar': {
        if (UI.playing) { UI.playing.v = true; return; }
        UI.playing = { v: false }; el.innerHTML = ICONS.stop + ' Parar';
        try { await tocar({ canvas: $('#tela'), stop: UI.playing, onProgress: (f) => { const b = $('#barra'); if (b) b.style.width = (f * 100) + '%'; } }); } catch (err) { toast('Não deu pra tocar: ' + err.message); }
        UI.playing = null; const b = $('[data-act="tocar"]'); if (b) b.innerHTML = ICONS.play + ' Tocar'; break;
      }
      case 'dur': { const cur = segDur(p, s); s.dur = Math.max(0.5, Math.round((cur + parseFloat(el.dataset.d)) * 10) / 10); save(); renderView(); break; }
      case 'trocar': sheetTrocar(segId); break;
      case 'escolher-take': s.take = v; save(); fecharSheet(); renderView(); toast(v ? 'Take encaixado' : 'Trecho sem take'); break;
      case 'mais': sheetMais(segId); break;
      case 'salvar-mais': {
        s.tela = $('#mx-tela').value; s.somTake = $('#mx-som').checked; const t = takeDe(p, s.take); if (t) t.ini = dec($('#mx-ini').value) || 0;
        save(); fecharSheet(); renderView(); break;
      }
      case 'mover': { const i = m.segs.indexOf(s); const j = i + (+el.dataset.d); [m.segs[i], m.segs[j]] = [m.segs[j], m.segs[i]]; save(); fecharSheet(); renderView(); break; }
      case 'add-depois': { const i = m.segs.indexOf(s); m.segs.splice(i + 1, 0, seg('body', '')); save(); fecharSheet(); renderView(); break; }
      case 'add-seg': { const ic = m.segs.findIndex((x) => x.papel === 'cta'); m.segs.splice(ic < 0 ? m.segs.length : ic, 0, seg('body', '')); save(); renderView(); break; }
      case 'dur-auto': s.dur = null; save(); fecharSheet(); renderView(); break;
      case 'tirar-voz': if (s.voz) await blobDel(s.voz); s.voz = null; s.vozDur = null; s.words = null; save(); fecharSheet(); renderView(); break;
      case 'apagar-seg': m.segs = m.segs.filter((x) => x.id !== s.id); save(); fecharSheet(); renderView(); break;
      case 'pedir-avatar': {
        const i = m.segs.indexOf(s); const role = s.papel === 'hook' ? 'HOOK' : s.papel === 'cta' ? 'CTA' : 'trecho ' + (i + 1);
        UI.pedido = { av: m.av || (p.avatares[0] || {}).id || '', amb: m.amb || '', acao: '', fala: s.texto, camera: CAMERAS[0], ref: { mont: m.id, seg: s.id, label: role } };
        fecharSheet(); UI.tab = 'avatar'; render(); window.scrollTo(0, 0); break;
      }
      case 'avatar-flow': UI.pedido = { av: v, amb: '', acao: '', fala: '', camera: CAMERAS[0], ref: null }; UI.tab = 'avatar'; render(); break;
      case 'copiar-prompt': copiar(promptFlow(p, UI.pedido)); break;
      case 'salvar-pedido': {
        const d = UI.pedido; const pd = Object.assign({ id: proxId(p.pedidos, 'PD-'), status: 'aguardando', prompt: promptFlow(p, d), criadoEm: new Date().toISOString() }, JSON.parse(JSON.stringify(d)));
        p.pedidos.push(pd); UI.pedido = null; save(); renderView(); toast('Pedido salvo. Quando o take ficar pronto, suba aqui.'); break;
      }
      case 'copiar-pedido': copiar((p.pedidos.find((x) => x.id === v) || {}).prompt || ''); break;
      case 'apagar-pedido': p.pedidos = p.pedidos.filter((x) => x.id !== v); save(); renderView(); break;
      case 'editar-nome': sheetNome(); break;
      case 'salvar-nome': {
        Object.assign(m, { mp: $('#nm-mp').value, ang: $('#nm-ang').value, fmt: $('#nm-fmt').value, av: $('#nm-av').value === 'AV00' ? '' : $('#nm-av').value, varCode: $('#nm-var').value, num: parseInt($('#nm-num').value, 10) || m.num, amb: $('#nm-amb').value });
        save(); fecharSheet(); renderView(); break;
      }
      case 'voz': sheetVoz(); break;
      case 'voz-go': gerarVoz(); break;
      case 'exportar': if (UI.playing) UI.playing.v = true; sheetExport(); break;
      case 'exp-go': exportar(); break;
      case 'compartilhar': try { await navigator.share({ files: [UI.ultimoExport], title: UI.ultimoExport.name }); } catch (err) { /* cancelado */ } break;
      case 'copiar-nome': copiar(v); break;
      case 'lib': UI.lib = v; renderView(); break;
      case 'edit-ad': sheetAd(v); break;
      case 'salvar-ad': {
        const a = p.ads.find((x) => x.id === v);
        ['gasto', 'imp', 'hookRate', 'ctr', 'ic', 'vendas'].forEach((k) => { a[k] = dec($('#ad-' + k).value); });
        a.status = $('#ad-status').value; a.hookEst = $('#ad-hookEst').checked; a.metaId = $('#ad-metaId').value.trim(); a.subiuEm = $('#ad-subiuEm').value; a.obs = $('#ad-obs').value;
        save(); fecharSheet(); renderView(); toast('Números salvos'); break;
      }
      case 'novo-hook': sheetEditar('hook'); break; case 'edit-hook': sheetEditar('hook', v); break;
      case 'novo-body': sheetEditar('body'); break; case 'edit-body': sheetEditar('body', v); break;
      case 'novo-cta': sheetEditar('cta'); break; case 'edit-cta': sheetEditar('cta', v); break;
      case 'novo-avatar': sheetEditar('avatar'); break; case 'edit-avatar': sheetEditar('avatar', v); break;
      case 'edit-take': sheetEditar('take', v); break;
      case 'salvar-ed': {
        const tipo = el.dataset.tipo; const arrName = { hook: 'hooks', body: 'bodies', cta: 'ctas', avatar: 'avatares', take: 'takes' }[tipo];
        let o = p[arrName].find((x) => x.id === v); if (!o) { o = { id: v }; p[arrName].push(o); }
        const val = (id) => ($('#' + id) || {}).value;
        if (tipo === 'hook') Object.assign(o, { texto: val('ed-texto').trim(), banner: val('ed-banner').trim(), tipo: val('ed-tipo').trim(), quem: o.quem || '' });
        if (tipo === 'cta') Object.assign(o, { texto: val('ed-texto').trim(), tela: val('ed-tela').trim() });
        if (tipo === 'avatar') Object.assign(o, { nome: val('ed-nome').trim(), ficha: val('ed-ficha').trim() });
        if (tipo === 'take') Object.assign(o, { titulo: val('ed-titulo').trim(), tags: val('ed-tags').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean), av: val('ed-av') });
        if (tipo === 'body') {
          let linhas = val('ed-roteiro').split('\n').map((x) => x.trim()).filter(Boolean);
          if (linhas.length === 1) linhas = linhas[0].match(/[^.!?]+[.!?]+["”]?|[^.!?]+$/g).map((x) => x.trim()).filter(Boolean);
          const cenas = val('ed-cenas').split('\n').map((x) => x.trim().toLowerCase());
          Object.assign(o, { nome: val('ed-nome').trim() || o.id, obs: val('ed-obs').trim(), blocos: linhas.map((t, i) => ({ texto: t, cena: cenas[i] || '' })) });
        }
        save(); fecharSheet(); renderView(); toast('Salvo'); break;
      }
      case 'apagar-ed': {
        if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = 'Toque de novo pra apagar'; return; }
        const tipo = el.dataset.tipo; const arrName = { hook: 'hooks', body: 'bodies', cta: 'ctas', avatar: 'avatares', take: 'takes' }[tipo];
        const o = p[arrName].find((x) => x.id === v); if (tipo === 'take' && o && o.blob) await blobDel(o.blob);
        p[arrName] = p[arrName].filter((x) => x.id !== v); save(); fecharSheet(); renderView(); break;
      }
      case 'carregar-vozes': {
        salvarAjustes(); const a = AJ(); if (!a.elKey) { toast('Coloque a chave primeiro'); return; }
        try {
          const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': a.elKey } });
          if (!r.ok) throw new Error(r.status === 401 ? 'chave recusada' : 'erro ' + r.status);
          const j = await r.json(); const vozes = (j.voices || []).map((x) => ({ id: x.voice_id, name: x.name }));
          setAJ({ vozes, elVoice: a.elVoice || (vozes[0] || {}).id || '', elVoiceName: a.elVoiceName || (vozes[0] || {}).name || '' }); renderView(); toast(vozes.length + ' vozes carregadas');
        } catch (err) { toast('Não carregou: ' + (/fetch|Network|Load failed/i.test(err.message) ? 'sem conexão com o ElevenLabs' : err.message)); }
        break;
      }
      case 'backup': {
        const blob = new Blob([JSON.stringify(DB, null, 1)], { type: 'application/json' }); const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'montador-backup-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove(); break;
      }
      default: break;
    }
  });

  function salvarAjustes() {
    const g = (id) => ($('#' + id) || {}).value;
    if (!$('#aj-key')) return;
    const a = AJ(); const voice = g('aj-voice');
    setAJ({ elKey: (g('aj-key') || '').trim(), elVoice: (voice || '').trim(), elVoiceName: (a.vozes.find((x) => x.id === voice) || {}).name || '', elModel: g('aj-model'), res: g('aj-res') });
  }

  document.addEventListener('input', (e) => {
    const t = e.target; const p = P(); const m = montAtual();
    if (t.matches('textarea.segtext, input[data-k]') && m) {
      const s = m.segs.find((x) => x.id === t.closest('[data-seg]').dataset.seg);
      s[t.dataset.k] = t.value; if (t.dataset.k === 'texto') { s.words = null; if (s.voz) { s.vozDesatualizada = true; } autosize(t); } save(); return;
    }
    if (t.id === 'banner' && m) { m.banner = t.value; save(); return; }
    if (t.id === 'mol-quem') { UI.molde.quem = t.value.trim() || 'meu marido'; clearTimeout(t._t); t._t = setTimeout(() => { const pos = t.selectionStart; renderView(); const n = $('#mol-quem'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 500); return; }
    if (t.id === 'mol-amb') { UI.molde.amb = t.value; return; }
    if (t.id && t.id.startsWith('pd-')) {
      const d = UI.pedido; d.av = $('#pd-av').value; d.amb = $('#pd-amb').value; d.acao = $('#pd-acao').value; d.fala = $('#pd-fala').value; d.camera = $('#pd-cam').value;
      $('#pd-prompt').textContent = promptFlow(p, d); return;
    }
    if (t.id && t.id.startsWith('pj-')) {
      p.nome = $('#pj-nome').value; p.prefixo = $('#pj-prefixo').value.toLowerCase().replace(/[^a-z0-9]/g, '') || p.prefixo; p.produto = $('#pj-produto').value; p.produtos = $('#pj-produtos').value;
      p.ticket = dec($('#pj-ticket').value) || p.ticket; p.cpaIdeal = dec($('#pj-cpa').value) || p.cpaIdeal; save();
      const pb = $('.proj-btn'); if (pb) pb.innerHTML = `<span class="pfx">${esc(p.prefixo)}</span><span class="pn">${esc(p.nome)}</span>`; return;
    }
    if (t.id && t.id.startsWith('aj-')) salvarAjustes();
  });
  document.addEventListener('change', async (e) => {
    const t = e.target; const p = P();
    if (t.id === 'mol-fmt') UI.molde.fmt = t.value;
    if (t.id === 'mol-av') UI.molde.av = t.value;
    if (t.id === 'mol-body') UI.molde.body = t.value;
    if (t.id === 'mol-cta') UI.molde.cta = t.value;
    if (t.id === 'mol-adaptar') UI.molde.adaptar = t.checked;
    if (t.id && t.id.startsWith('pd-')) t.dispatchEvent(new Event('input', { bubbles: true }));
    if (t.id && t.id.startsWith('aj-')) { salvarAjustes(); if (t.id === 'aj-voice') renderView(); }
    if (t.type !== 'file' || !t.files || !t.files.length) return;
    const files = [...t.files];
    if (t.id === 'up-takes') { toast('Subindo ' + files.length + ' take(s)…'); for (const f of files) await novoTakeDeArquivo(f); renderView(); toast('Takes na biblioteca'); return; }
    if (t.dataset.vinc) { const tk = p.takes.find((x) => x.id === t.dataset.vinc); toast('Vinculando…'); await importarVideo(files[0], tk); renderView(); toast('Vídeo vinculado ao ' + tk.id); return; }
    if (t.dataset.novoSeg) {
      const m = montAtual(); const s = m.segs.find((x) => x.id === t.dataset.novoSeg);
      const tk = await novoTakeDeArquivo(files[0], { tags: [s.papel === 'hook' ? 'hook' : s.papel === 'cta' ? 'cta' : s.cena].filter(Boolean), av: m.av || '' });
      s.take = tk.id; save(); fecharSheet(); renderView(); toast(tk.id + ' encaixado'); return;
    }
    if (t.dataset.pedido) {
      const pd = p.pedidos.find((x) => x.id === t.dataset.pedido);
      const tk = await novoTakeDeArquivo(files[0], { titulo: (pd.acao || pd.fala || 'Take com avatar').slice(0, 80), av: pd.av, tags: ['avatar'], prompt: pd.prompt, obs: 'Gerado no Flow a partir do ' + pd.id });
      pd.status = 'pronto'; pd.take = tk.id;
      let msg = tk.id + ' na biblioteca';
      if (pd.ref) {
        const m = p.montagens.find((x) => x.id === pd.ref.mont); const s = m && m.segs.find((x) => x.id === pd.ref.seg);
        if (s) { s.take = tk.id; if (pd.fala && pd.fala.trim() === s.texto.trim()) s.somTake = true; msg = tk.id + ' encaixado no ' + pd.ref.label; UI.mont = m.id; }
      }
      save(); renderView(); toast(msg); return;
    }
    if (t.id === 'restaurar') {
      try { const j = JSON.parse(await files[0].text()); if (!j.projetos) throw new Error('arquivo não é um backup do montador'); DB = j; save(); UI.mont = null; render(); toast('Backup restaurado'); } catch (err) { toast('Não restaurou: ' + err.message); }
    }
  });

  // ---------- início ----------
  async function iniciar() {
    await openDB();
    DB = await kvGet('db');
    if (!DB || !DB.projetos) {
      const seed = JSON.parse(JSON.stringify(window.SEED_PANETONE));
      DB = { versao: 1, projetos: [seed], atual: seed.id };
      save();
    }
    render();
    if ('serviceWorker' in navigator && !inFrame && location.protocol === 'https:') { navigator.serviceWorker.register('sw.js').catch(() => { /* offline indisponível */ }); }
  }
  window.__montador = { get DB() { return DB; }, nomeAd, metricas, gerarHooks, checagens };
  iniciar();
})();
