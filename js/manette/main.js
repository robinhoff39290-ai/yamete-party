// Yamete Party : manette (téléphone)
import { PAR_ID, pastille, nom } from '../shared/joueurs.js';
import { $, esc, uid } from '../shared/util.js';
import { PREFIXE, optionsPeer } from '../host/reseau.js';

const params = new URLSearchParams(location.search);
let code = (params.get('code') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
const device = (() => {
  try {
    let d = localStorage.getItem('yp-device');
    if (!d) { d = uid(12); localStorage.setItem('yp-device', d); }
    return d;
  } catch (e) { return uid(12); }
})();

const stocker = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
};

let peer = null;
let conn = null;
let moi = null;
let ecran = null;
let repondu = new Set();
let brouillons = {};
let tentative = 0;
let minuteurReco = null;

const app = $('#app');
const bandeau = $('#bandeau');

function rendre(html) {
  app.innerHTML = html;
  app.classList.remove('entree');
  void app.offsetWidth;
  app.classList.add('entree');
}

function majEntete() {
  const h = $('#entete');
  if (!moi) { h.innerHTML = '<span class="logo-mini">Yamete<span>Party</span></span>'; return; }
  h.innerHTML = `${pastille(moi, 'm')}<b>${esc(nom(moi))}</b><button id="changer" class="lien">changer</button>`;
  $('#changer').addEventListener('click', () => {
    if (!confirm('Changer de joueur sur ce téléphone ?')) return;
    stocker.set(`yp-pid-${code}`, null);
    moi = null;
    majEntete();
    envoyer({ t: 'quitter' });
  });
}

function etatBandeau(txt, ton = '') {
  if (!txt) { bandeau.hidden = true; return; }
  bandeau.hidden = false;
  bandeau.className = `bandeau ${ton}`;
  bandeau.textContent = txt;
}

// ---------- Saisie du code ----------
function ecranCode(erreur = '') {
  moi = null;
  majEntete();
  rendre(`<div class="bloc centre">
    <h1 class="titre">Rejoindre la soirée</h1>
    <p class="muet">Tape le code affiché sur la télé.</p>
    <input id="code" class="champ code" maxlength="4" autocomplete="off" autocapitalize="characters" inputmode="text" value="${esc(code)}" placeholder="ABCD">
    ${erreur ? `<p class="alerte">${esc(erreur)}</p>` : ''}
    <button id="go" class="btn primaire large">Rejoindre</button>
  </div>`);
  const champ = $('#code');
  champ.focus();
  champ.addEventListener('input', () => { champ.value = champ.value.toUpperCase().replace(/[^A-Z]/g, ''); });
  const valider = () => {
    code = champ.value.slice(0, 4);
    if (code.length !== 4) return;
    const u = new URL(location.href);
    u.searchParams.set('code', code);
    history.replaceState(null, '', u);
    connecter();
  };
  $('#go').addEventListener('click', valider);
  champ.addEventListener('keydown', e => { if (e.key === 'Enter') valider(); });
}

// ---------- Connexion ----------
function connecter() {
  clearTimeout(minuteurReco);
  etatBandeau('Connexion…');
  if (!moi) rendre('<div class="bloc centre"><div class="loader"></div><p class="muet">Connexion à la soirée…</p></div>');
  const lancer = () => {
    try { conn?.close(); } catch (e) { /* ignore */ }
    conn = peer.connect(PREFIXE + code, { serialization: 'json', reliable: true });
    conn.on('open', () => {
      tentative = 0;
      etatBandeau('');
      envoyer({ t: 'hello', device, pid: stocker.get(`yp-pid-${code}`) });
    });
    conn.on('data', recevoir);
    conn.on('close', () => reconnecter());
    conn.on('error', () => reconnecter());
  };
  if (peer && !peer.destroyed && peer.open) return lancer();
  try { peer?.destroy(); } catch (e) { /* ignore */ }
  peer = new window.Peer(optionsPeer());
  peer.on('open', lancer);
  peer.on('error', err => {
    console.warn('PeerJS', err.type);
    if (err.type === 'peer-unavailable') {
      if (moi || tentative > 0) reconnecter();
      else ecranCode('Salle introuvable. Vérifie le code sur la télé.');
    } else reconnecter();
  });
  peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* ignore */ } });
}

function reconnecter() {
  clearTimeout(minuteurReco);
  tentative++;
  if (tentative > 40) { etatBandeau('Connexion perdue. Recharge la page.', 'alerte'); return; }
  etatBandeau('Connexion perdue… reconnexion', 'alerte');
  minuteurReco = setTimeout(connecter, Math.min(1000 * tentative, 5000));
}

function envoyer(msg) {
  try { if (conn?.open) conn.send(msg); } catch (e) { console.warn(e); }
}

function recevoir(msg) {
  if (!msg || typeof msg !== 'object') return;
  if (msg.t === 'roster') ecranChoix(msg.joueurs);
  if (msg.t === 'welcome') {
    moi = msg.pid;
    stocker.set(`yp-pid-${code}`, moi);
    majEntete();
    gardeEveil();
  }
  if (msg.t === 'screen') afficherEcran(msg.screen);
  if (msg.t === 'kick') {
    moi = null;
    stocker.set(`yp-pid-${code}`, null);
    majEntete();
    rendre(`<div class="bloc centre"><h1 class="titre">Déconnecté</h1><p class="muet">${esc(msg.raison || '')}</p>
      <button class="btn secondaire large" id="re">Revenir</button></div>`);
    $('#re').addEventListener('click', () => location.reload());
  }
}

// ---------- Choix du joueur ----------
function ecranChoix(joueurs) {
  moi = null;
  majEntete();
  rendre(`<div class="bloc">
    <h1 class="titre">Tu es qui ?</h1>
    <div class="grille-choix">${joueurs.map(j => `
      <button class="choix ${j.pris ? 'pris' : ''}" data-pid="${j.id}">${pastille(j.id, 'l')}<span>${esc(nom(j.id))}</span>${j.pris ? '<em>déjà pris</em>' : ''}</button>`).join('')}</div>
    <p class="muet petit centre">Un joueur absent n'apparaît pas ici.</p>
  </div>`);
  app.querySelectorAll('[data-pid]').forEach(b => b.addEventListener('click', () => {
    if (b.classList.contains('pris') && !confirm(`${nom(b.dataset.pid)} est déjà connecté ailleurs. Reprendre ce joueur ?`)) return;
    envoyer({ t: 'claim', pid: b.dataset.pid, device });
  }));
}

// ---------- Écrans de jeu ----------
function vibrer() {
  try { navigator.vibrate?.(60); } catch (e) { /* ignore */ }
}

function repondre(valeur) {
  if (!ecran?.rid || repondu.has(ecran.rid)) return;
  repondu.add(ecran.rid);
  envoyer({ t: 'answer', rid: ecran.rid, value: valeur });
  rendre(`<div class="bloc centre attente"><div class="ok-rond">✓</div><h1 class="titre">Envoyé</h1><p class="muet">Regarde la télé.</p></div>`);
}

function optionHtml(o) {
  return `<button class="opt" data-o="${esc(o.id)}">${o.pid && PAR_ID[o.pid] ? pastille(o.pid, 's') : ''}<span>${esc(o.label)}</span></button>`;
}

function afficherEcran(s) {
  if (!s) return;
  const memeEcran = ecran && s.rid && ecran.rid === s.rid;
  ecran = s;
  if (s.rid && repondu.has(s.rid)) return;
  if (s.rid && !memeEcran) vibrer();

  const texte = s.texte ? `<p class="texte">${esc(s.texte).replace(/\n/g, '<br>')}</p>` : '';

  if (s.kind === 'wait') {
    rendre(`<div class="bloc centre attente">${moi ? pastille(moi, 'xl', 'flotte') : ''}<h1 class="titre">${esc(s.titre || '')}</h1>${texte}</div>`);
  } else if (s.kind === 'info') {
    rendre(`<div class="bloc centre info ${s.ton || ''}"><h1 class="titre">${esc(s.titre || '')}</h1>${texte}</div>`);
  } else if (s.kind === 'vote') {
    rendre(`<div class="bloc"><h1 class="titre">${esc(s.titre || '')}</h1>${texte}
      <div class="opts">${s.options.map(optionHtml).join('')}</div></div>`);
    app.querySelectorAll('[data-o]').forEach(b => b.addEventListener('click', () => {
      app.querySelectorAll('[data-o]').forEach(x => x.classList.toggle('choisi', x === b));
      setTimeout(() => repondre(b.dataset.o), 180);
    }));
  } else if (s.kind === 'text') {
    rendre(`<div class="bloc"><h1 class="titre">${esc(s.titre || '')}</h1>${texte}
      <textarea id="saisie" class="champ" rows="4" maxlength="${s.max || 200}" placeholder="${esc(s.placeholder || '')}">${esc(brouillons[s.rid] || '')}</textarea>
      <div class="compteur"><span id="nb">0</span>/${s.max || 200}</div>
      <button id="envoyer" class="btn primaire large" disabled>Envoyer</button></div>`);
    const z = $('#saisie');
    const b = $('#envoyer');
    const maj = () => { brouillons[s.rid] = z.value; $('#nb').textContent = z.value.length; b.disabled = !z.value.trim(); };
    z.addEventListener('input', maj);
    maj();
    b.addEventListener('click', () => repondre(z.value.trim()));
  } else if (s.kind === 'guess') {
    ecranDevinette(s);
  }
}

function ecranDevinette(s) {
  const choix = {};
  let i = 0;
  const etape = () => {
    if (i >= s.items.length) {
      rendre(`<div class="bloc"><h1 class="titre">Ton enquête</h1>
        <div class="recap-devine">${s.items.map(it => `<div><p>« ${esc(it.texte)} »</p><b>${choix[it.id] ? `${pastille(choix[it.id], 'xs')} ${esc(nom(choix[it.id]))}` : '?'}</b></div>`).join('')}</div>
        <button id="valider" class="btn primaire large">Valider</button>
        <button id="refaire" class="btn fantome large">Recommencer</button></div>`);
      $('#valider').addEventListener('click', () => repondre(choix));
      $('#refaire').addEventListener('click', () => { for (const k in choix) delete choix[k]; i = 0; etape(); });
      return;
    }
    const it = s.items[i];
    const pris = new Set(Object.values(choix));
    const dispo = s.options.filter(o => !pris.has(o.id));
    rendre(`<div class="bloc"><p class="muet">Vanne ${i + 1} / ${s.items.length}</p>
      <div class="vanne-tel">« ${esc(it.texte)} »</div>
      <p class="texte">Qui a écrit ça ?</p>
      <div class="opts">${dispo.map(optionHtml).join('')}</div>
      ${i > 0 ? '<button id="retour" class="btn fantome large">← Précédente</button>' : ''}</div>`);
    app.querySelectorAll('[data-o]').forEach(b => b.addEventListener('click', () => { choix[it.id] = b.dataset.o; i++; etape(); }));
    $('#retour')?.addEventListener('click', () => { i--; delete choix[s.items[i].id]; etape(); });
  };
  etape();
}

// ---------- Garder l'écran allumé ----------
let verrou = null;
async function gardeEveil() {
  try {
    if ('wakeLock' in navigator && !verrou) {
      verrou = await navigator.wakeLock.request('screen');
      verrou.addEventListener('release', () => { verrou = null; });
    }
  } catch (e) { /* non supporté */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    gardeEveil();
    if (code && (!conn || !conn.open)) connecter();
  }
});

// ---------- Démarrage ----------
majEntete();
if (code.length === 4) connecter();
else ecranCode();
