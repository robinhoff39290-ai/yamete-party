// Outils d'affichage sur l'écran principal (télé).
import { $, $$, esc } from '../shared/util.js';
import { pastille, nom } from '../shared/joueurs.js';

export class Abandon extends Error {}

let rejetCourant = null;
let nettoyageCourant = null;

function lier(reject, nettoyage) {
  rejetCourant = reject;
  nettoyageCourant = nettoyage;
}

function delier() {
  rejetCourant = null;
  nettoyageCourant = null;
}

export function abandonner() {
  const r = rejetCourant;
  nettoyageCourant?.();
  delier();
  r?.(new Abandon());
}

export function scene() {
  return $('#scene');
}

export function afficher(html, classe = '') {
  const s = scene();
  s.className = `scene ${classe}`;
  s.innerHTML = html;
  s.classList.remove('entree');
  void s.offsetWidth;
  s.classList.add('entree');
  s.scrollTop = 0;
  return s;
}

function boutonsHtml(boutons) {
  if (!boutons?.length) return '';
  return `<div class="actions">${boutons.map(b =>
    `<button class="btn ${b.style || 'secondaire'}" data-v="${esc(b.valeur)}">${b.label}</button>`).join('')}</div>`;
}

// Affiche une étape et attend un clic (ou Entrée / Espace pour le bouton principal).
export function etape(html, boutons = [{ label: 'Continuer', valeur: 'ok', style: 'primaire' }], classe = '') {
  return new Promise((resolve, reject) => {
    const s = afficher(`${html}${boutonsHtml(boutons)}`, classe);
    const principal = boutons.find(b => b.style === 'primaire');
    const fin = v => { nettoyage(); delier(); resolve(v); };
    const clic = e => {
      const b = e.target.closest('[data-v]');
      if (b && s.contains(b)) fin(b.dataset.v);
    };
    const touche = e => {
      if (e.target.closest('input, textarea, .modale')) return;
      if ((e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') && principal) {
        e.preventDefault();
        fin(String(principal.valeur));
      }
    };
    const nettoyage = () => {
      s.removeEventListener('click', clic);
      document.removeEventListener('keydown', touche);
    };
    s.addEventListener('click', clic);
    document.addEventListener('keydown', touche);
    lier(reject, nettoyage);
  });
}

// Titre de manche animé
export function enTete(icone, titre, sous = '') {
  return `<header class="manche-tete">
    <div class="manche-icone">${icone}</div>
    <div><h1>${titre}</h1>${sous ? `<p class="sous">${sous}</p>` : ''}</div>
  </header>`;
}

// Chrono géant (plaidoiries, récits)
let audioCtx = null;
export function bip(freq = 880, duree = 0.15, vol = 0.15) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.frequency.value = freq;
    o.type = 'sine';
    g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duree);
    o.stop(audioCtx.currentTime + duree);
  } catch (e) { /* audio indisponible */ }
}

export function chrono(secondes, htmlHaut = '', libelleFin = 'Terminer') {
  return new Promise((resolve, reject) => {
    let restant = secondes;
    let total = secondes;
    let enPause = true;
    let dernier = null;
    let raf = null;
    const s = afficher(`${htmlHaut}
      <div class="chrono">
        <svg viewBox="0 0 120 120"><circle class="piste" cx="60" cy="60" r="52"/><circle class="arc" cx="60" cy="60" r="52"/></svg>
        <div class="chrono-val">${secondes}</div>
      </div>
      <div class="actions">
        <button class="btn primaire" data-c="go">▶ Lancer</button>
        <button class="btn secondaire" data-c="plus">+15 s</button>
        <button class="btn secondaire" data-c="fin">${libelleFin} ⏭</button>
      </div>`);
    const arc = $('.arc', s);
    const val = $('.chrono-val', s);
    const go = $('[data-c="go"]', s);
    const L = 2 * Math.PI * 52;
    arc.style.strokeDasharray = L;
    let derniereSec = Math.ceil(restant);

    const dessiner = () => {
      const r = Math.max(0, restant);
      val.textContent = Math.ceil(r);
      arc.style.strokeDashoffset = L * (1 - r / total);
      s.querySelector('.chrono').classList.toggle('urgent', r <= 10);
    };
    const boucle = t => {
      if (dernier != null && !enPause) restant -= (t - dernier) / 1000;
      dernier = t;
      const sec = Math.ceil(restant);
      if (sec !== derniereSec && !enPause) {
        derniereSec = sec;
        if (sec <= 5 && sec > 0) bip(660, 0.08, 0.08);
      }
      dessiner();
      if (restant <= 0) {
        bip(440, 0.6, 0.2);
        return fin();
      }
      raf = requestAnimationFrame(boucle);
    };
    const basculer = () => {
      enPause = !enPause;
      go.innerHTML = enPause ? '▶ Reprendre' : '⏸ Pause';
    };
    const fin = () => { nettoyage(); delier(); resolve(); };
    const clic = e => {
      const b = e.target.closest('[data-c]');
      if (!b) return;
      if (b.dataset.c === 'go') basculer();
      if (b.dataset.c === 'plus') { restant += 15; total = Math.max(total, restant); dessiner(); }
      if (b.dataset.c === 'fin') fin();
    };
    const touche = e => {
      if (e.target.closest('input, textarea, .modale')) return;
      if (e.key === ' ') { e.preventDefault(); basculer(); }
      if (e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); fin(); }
    };
    const nettoyage = () => {
      cancelAnimationFrame(raf);
      s.removeEventListener('click', clic);
      document.removeEventListener('keydown', touche);
    };
    s.addEventListener('click', clic);
    document.addEventListener('keydown', touche);
    lier(reject, nettoyage);
    dessiner();
    raf = requestAnimationFrame(boucle);
  });
}

// Collecte des réponses des téléphones avec suivi en direct sur la télé.
// fabriquer(pid) -> écran à envoyer au téléphone
export function collecter(J, pids, fabriquer, htmlHaut, { apresReponse } = {}) {
  return new Promise((resolve, reject) => {
    const reponses = new Map();
    const rids = [];
    const s = afficher(`${htmlHaut}
      <div class="suivi">
        <p class="suivi-titre">Réponses sur les téléphones</p>
        <div class="suivi-grille">${pids.map(pid => `
          <div class="suivi-j" data-pid="${pid}">${pastille(pid, 'm')}<span>${esc(nom(pid))}</span><em></em></div>`).join('')}
        </div>
      </div>
      <div class="actions">
        <button class="btn fantome" data-c="skip">Continuer sans les retardataires ⏭</button>
      </div>`);

    const maj = () => {
      for (const pid of pids) {
        const el = s.querySelector(`.suivi-j[data-pid="${pid}"]`);
        if (!el) continue;
        const ok = reponses.has(pid);
        const co = J.reseau.connecte(pid);
        el.classList.toggle('ok', ok);
        el.classList.toggle('horsligne', !co && !ok);
        el.querySelector('em').textContent = ok ? '✓' : co ? '…' : 'pas de manette';
      }
    };
    const fin = () => {
      nettoyage(); delier();
      resolve(reponses);
    };
    for (const pid of pids) {
      rids.push(J.reseau.demander(pid, fabriquer(pid), (p, v) => {
        if (reponses.has(p)) return;
        reponses.set(p, v);
        J.reseau.ecran(p, apresReponse ? apresReponse(p, v) : { kind: 'wait', titre: 'Réponse envoyée ✓', texte: 'Attends les autres et regarde la télé.' });
        maj();
        if (reponses.size >= pids.length) setTimeout(fin, 500);
      }));
    }
    const clic = e => {
      if (e.target.closest('[data-c="skip"]')) {
        for (const pid of pids) if (!reponses.has(pid)) J.reseau.ecran(pid, { kind: 'wait', titre: 'Trop tard', texte: 'On a continué sans toi. Regarde la télé.' });
        fin();
      }
    };
    const ancien = J.surConnexion;
    J.surConnexion = maj;
    const nettoyage = () => {
      J.surConnexion = ancien;
      s.removeEventListener('click', clic);
      rids.forEach(r => J.reseau.annuler(r));
    };
    s.addEventListener('click', clic);
    lier(reject, () => {
      nettoyage();
      for (const pid of pids) J.reseau.ecran(pid, { kind: 'wait', titre: 'Manche annulée', texte: 'Regarde la télé.' });
    });
    maj();
    if (!pids.length) fin();
  });
}

// Toast
export function toast(html, duree = 2600) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = html;
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('sortie'), duree);
  setTimeout(() => t.remove(), duree + 500);
}

// Fenêtre modale générique
export function modale(html, { large = false } = {}) {
  const fond = document.createElement('div');
  fond.className = 'modale-fond';
  fond.innerHTML = `<div class="modale verre ${large ? 'large' : ''}" role="dialog" aria-modal="true">
    <button class="modale-x" aria-label="Fermer">✕</button>${html}</div>`;
  document.body.appendChild(fond);
  const fermer = () => {
    fond.classList.add('sortie');
    document.removeEventListener('keydown', echap, true);
    setTimeout(() => fond.remove(), 220);
  };
  const echap = e => { if (e.key === 'Escape') { e.stopPropagation(); fermer(); } };
  document.addEventListener('keydown', echap, true);
  fond.addEventListener('click', e => { if (e.target === fond || e.target.closest('.modale-x')) fermer(); });
  return { el: $('.modale', fond), fermer };
}

export function confirmer(question, oui = 'Oui', non = 'Annuler') {
  return new Promise(resolve => {
    const m = modale(`<h2>${question}</h2><div class="actions">
      <button class="btn secondaire" data-r="0">${non}</button>
      <button class="btn primaire" data-r="1">${oui}</button></div>`);
    m.el.addEventListener('click', e => {
      const b = e.target.closest('[data-r]');
      if (b) { m.fermer(); resolve(b.dataset.r === '1'); }
    });
  });
}

// Rangée de pastilles cliquables pour choisir un joueur sur la télé
export function choisirJoueurHtml(pids, attr = 'data-pid') {
  return `<div class="choix-joueurs">${pids.map(pid =>
    `<button class="choix-j" ${attr}="${pid}">${pastille(pid, 'l')}<span>${esc(nom(pid))}</span></button>`).join('')}</div>`;
}

export { $, $$ };
