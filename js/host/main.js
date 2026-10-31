// Yamete Party : écran principal (ordinateur branché sur la télé)
import { JOUEURS, pastille, nom, tag } from '../shared/joueurs.js';
import { $, $$, esc, shuffle, pick, uid, sleep, dateFr } from '../shared/util.js';
import {
  db, sauver, soiree, nouvelleSoiree, terminerSoiree, stat, noterManche,
  exporter, importer, reinitialiser, titresDuSoir,
} from './db.js';
import { NIVEAUX, MANCHES } from './config.js';
import { Reseau, ecranAttente } from './reseau.js';
import { afficher, etape, abandonner, Abandon, toast, modale, confirmer, scene } from './ui.js';
import { pariDebile } from './sanctions.js';
import { vueClassement, vueProfil, vueHof, vueVerdicts, vueSusceptible, vueReglages } from './vues.js';
import { NOMS_EQUIPES } from '../../contenu/chambrage.js';
import tribunal from './manches/tribunal.js';
import susceptible from './manches/susceptible.js';
import roast from './manches/roast.js';
import pireQueCa from './manches/pirequeca.js';
import mytho from './manches/mytho.js';

const FONCTIONS = { tribunal, susceptible, roast, pirequeca: pireQueCa, mytho };

const reseau = new Reseau();
const J = {
  reseau,
  memo: {},
  surConnexion: null,
  enManche: false,
  derniere: null,
  presents: () => soiree()?.presents || [],
  niveau: () => soiree()?.niveau || 1,
  arrose: () => soiree()?.mode === 'arrose' && !db.enCours?.pause,
  g: n => Math.max(1, Math.round(n * NIVEAUX[soiree()?.niveau || 1].multi)),
  ajouterHof,
};
window.__J = J; // utile pour déboguer depuis la console

reseau.presents = () => J.presents();
reseau.surChangement = () => {
  J.surConnexion?.();
  majBarre();
  rafraichirConnexions();
};
reseau.surEtat = () => majBarre();

let pageCourante = 'accueil';

// =====================================================================
//  Barre du haut (pendant une soirée)
// =====================================================================
function majBarre() {
  const s = soiree();
  const barre = $('#barre');
  const fab = $('#btn-hof');
  if (!s) { barre.hidden = true; fab.hidden = true; document.body.classList.remove('en-soiree'); return; }
  barre.hidden = false;
  fab.hidden = false;
  document.body.classList.add('en-soiree');
  const nbCo = s.presents.filter(p => reseau.connecte(p)).length;
  const etatNet = reseau.etat === 'en-ligne' ? '' : reseau.etat === 'reconnexion' ? ' · reconnexion…' : reseau.etat === 'erreur' ? ' · hors ligne' : '';
  const mode = s.mode === 'arrose' ? (db.enCours.pause ? '⏸ Arrosé en pause' : '💦 Arrosé') : '😇 Sobre';
  barre.innerHTML = `
    <button class="logo-mini" data-b="hub" title="Retour au menu de la soirée">Yamete<span>Party</span></button>
    <div class="barre-centre">
      <button class="pill ${nbCo < s.presents.length ? 'warn' : ''}" data-b="qr">📱 ${reseau.code || '----'} · ${nbCo}/${s.presents.length}${etatNet}</button>
      <button class="pill" data-b="mode" title="Basculer Sobre / Arrosé">${mode}</button>
      ${s.mode === 'arrose' ? `<button class="pill ${db.enCours.pause ? 'actif' : ''}" data-b="pause">${db.enCours.pause ? '▶ Reprendre' : '⏸ Pause'}</button>` : ''}
      <button class="pill" data-b="niveau" title="Changer l'intensité">🌶 ${NIVEAUX[s.niveau].nom}</button>
    </div>
    <div class="barre-droite">
      ${J.enManche ? '<button class="pill danger" data-b="quitter">✕ Quitter la manche</button>' : '<button class="pill" data-b="fin">Terminer la soirée</button>'}
    </div>`;
}

$('#barre').addEventListener('click', async e => {
  const b = e.target.closest('[data-b]');
  if (!b) return;
  const s = soiree();
  switch (b.dataset.b) {
    case 'hub':
      if (J.enManche) { if (await confirmer('Quitter la manche en cours ?', 'Quitter')) abandonner(); }
      else afficherHub();
      break;
    case 'qr': modaleQr(); break;
    case 'mode':
      s.mode = s.mode === 'arrose' ? 'sobre' : 'arrose';
      db.enCours.pause = false;
      sauver(); majBarre();
      toast(s.mode === 'arrose' ? '💦 Mode Arrosé activé' : '😇 Mode Sobre : gages uniquement');
      break;
    case 'pause':
      db.enCours.pause = !db.enCours.pause;
      sauver(); majBarre();
      toast(db.enCours.pause ? '⏸ Arrosé en pause : gages uniquement' : '💦 Arrosé relancé');
      break;
    case 'niveau':
      s.niveau = s.niveau % 3 + 1;
      sauver(); majBarre();
      toast(`🌶 Intensité : ${NIVEAUX[s.niveau].nom}`);
      break;
    case 'quitter':
      if (await confirmer('Quitter la manche en cours ?', 'Quitter')) abandonner();
      break;
    case 'fin':
      if (await confirmer('Terminer la soirée ? Le bilan va s\'afficher.', 'Terminer')) finDeSoiree();
      break;
  }
});

// =====================================================================
//  Hall of Fame : bouton en direct
// =====================================================================
function ajouterHof(texte, auteur) {
  const s = soiree();
  if (!s || !texte.trim()) return;
  db.hof.push({ id: uid(8), date: Date.now(), soireeId: s.id, texte: texte.trim(), auteur });
  sauver();
  stat(auteur, 'hof');
  toast(`★ Vanne de <b>${esc(nom(auteur))}</b> ajoutée au Hall of Fame`);
}

function modaleHof() {
  const s = soiree();
  if (!s || document.querySelector('.modale-hof')) return;
  let auteur = null;
  const m = modale(`<div class="modale-hof">
    <h2>★ Vanne pour le Hall of Fame</h2>
    <textarea class="champ" id="hof-texte" rows="2" maxlength="280" placeholder="La vanne, en une phrase…"></textarea>
    <p class="muet">Qui l'a lancée ?</p>
    <div class="choix-joueurs petit">${s.presents.map(p => `<button class="choix-j" data-a="${p}">${pastille(p, 'm')}<span>${esc(nom(p))}</span></button>`).join('')}</div>
    <div class="actions"><button class="btn primaire" id="hof-ok" disabled>Graver dans le marbre</button></div>
  </div>`);
  const zone = $('#hof-texte', m.el);
  const ok = $('#hof-ok', m.el);
  const verif = () => { ok.disabled = !(zone.value.trim() && auteur); };
  zone.focus();
  zone.addEventListener('input', verif);
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!ok.disabled) ok.click(); } });
  m.el.addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (b) {
      auteur = b.dataset.a;
      $$('[data-a]', m.el).forEach(x => x.classList.toggle('actif', x === b));
      verif();
    }
  });
  ok.addEventListener('click', () => { ajouterHof(zone.value, auteur); m.fermer(); });
}

$('#btn-hof').addEventListener('click', modaleHof);
document.addEventListener('keydown', e => {
  if (e.target.closest('input, textarea, .modale')) return;
  if ((e.key === 'h' || e.key === 'H') && soiree()) { e.preventDefault(); modaleHof(); }
});
// Boutons « ★ Hall of Fame » des écrans de résultats
document.addEventListener('click', e => {
  const b = e.target.closest('[data-hof-auteur]');
  if (!b || b.disabled) return;
  ajouterHof(b.dataset.hofTexte, b.dataset.hofAuteur);
  b.disabled = true;
  b.textContent = '★ Ajoutée';
});

// =====================================================================
//  Connexion des manettes
// =====================================================================
function urlManette() {
  const u = new URL('manette.html', location.href);
  const p = new URLSearchParams(location.search);
  u.search = '';
  u.searchParams.set('code', reseau.code || '');
  for (const k of ['peerhost', 'peerport', 'peerpath', 'peersecure']) if (p.get(k)) u.searchParams.set(k, p.get(k));
  return u.toString();
}

function qrSvg(texte) {
  try {
    const qr = window.qrcode(0, 'M');
    qr.addData(texte);
    qr.make();
    return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  } catch (e) {
    return '<p>QR indisponible</p>';
  }
}

function blocConnexion() {
  const url = urlManette();
  return `<div class="connexion">
    <div class="qr verre">${qrSvg(url)}</div>
    <div class="connexion-info">
      <p class="muet">Scanne le QR code avec ton téléphone, ou va sur</p>
      <p class="url">${esc(url.split('?')[0])}</p>
      <p class="muet">et tape le code</p>
      <p class="code">${reseau.code || '····'}</p>
      ${reseau.etat === 'erreur' ? '<p class="alerte">Connexion au serveur de mise en relation impossible. Vérifie Internet puis recharge la page.</p>' : ''}
    </div>
  </div>`;
}

function grilleConnectes() {
  return `<div class="grille-co" id="grille-co">${J.presents().map(p => `
    <div class="co-j ${reseau.connecte(p) ? 'ok' : ''}" data-co="${p}">${pastille(p, 'l')}<span>${esc(nom(p))}</span><em>${reseau.connecte(p) ? 'connecté' : 'en attente'}</em></div>`).join('')}</div>`;
}

function rafraichirConnexions() {
  const g = $('#grille-co');
  if (g) g.outerHTML = grilleConnectes();
  $$('[data-dot]').forEach(el => el.classList.toggle('ok', reseau.connecte(el.dataset.dot)));
}

function modaleQr() {
  return modale(`<h2>Connecter un téléphone</h2>${blocConnexion()}${grilleConnectes()}`, { large: true });
}

// =====================================================================
//  Accueil
// =====================================================================
function afficherAccueil() {
  pageCourante = 'accueil';
  majBarre();
  const enCours = soiree();
  const nbSoirees = db.soirees.filter(s => s.fin).length;
  afficher(`<div class="accueil">
    <div class="logo">
      <h1>Yamete<span>Party</span></h1>
      <p class="muet">Le jeu de soirée du groupe. ${nbSoirees ? `${nbSoirees} soirée${nbSoirees > 1 ? 's' : ''} au compteur.` : 'Première soirée ?'}</p>
    </div>
    <div class="accueil-emblemes">${JOUEURS.map((j, i) => `<span style="--i:${i}">${pastille(j.id, 'm')}</span>`).join('')}</div>
    <div class="accueil-actions">
      ${enCours ? `
        <button class="btn primaire geant" data-go="reprendre">▶ Reprendre la soirée</button>
        <button class="btn fantome" data-go="abandon">Clôturer la soirée en cours</button>` : `
        <button class="btn primaire geant" data-go="setup">Nouvelle soirée</button>`}
    </div>
    <nav class="accueil-nav">
      <button class="tuile verre" data-nav="classement"><span>🏆</span>Classement</button>
      <button class="tuile verre" data-nav="hof"><span>★</span>Hall of Fame</button>
      <button class="tuile verre" data-nav="verdicts"><span>⚖️</span>Tribunal</button>
      <button class="tuile verre" data-nav="susceptible"><span>👉</span>Susceptibles</button>
      <button class="tuile verre" data-nav="reglages"><span>⚙️</span>Réglages</button>
    </nav>
  </div>`, 'scene-accueil');
}

// Navigation générique (pages de consultation)
function page(nomPage, arg) {
  pageCourante = nomPage;
  const retour = `<button class="btn fantome retour-accueil" data-go="${soiree() ? 'hub' : 'accueil'}">← ${soiree() ? 'Retour à la soirée' : 'Accueil'}</button>`;
  let html = '';
  if (nomPage === 'classement') html = vueClassement();
  if (nomPage === 'profil') html = vueProfil(arg);
  if (nomPage === 'hof') html = vueHof(arg || {});
  if (nomPage === 'verdicts') html = vueVerdicts();
  if (nomPage === 'susceptible') html = vueSusceptible();
  if (nomPage === 'reglages') html = vueReglages();
  afficher(retour + html, 'scene-page');
  if (nomPage === 'hof') brancherHof(arg || {});
  if (nomPage === 'reglages') brancherReglages();
}

function brancherHof(filtres) {
  const champ = $('#hof-recherche');
  champ?.addEventListener('input', () => {
    const pos = champ.selectionStart;
    page('hof', { ...filtres, recherche: champ.value });
    const c = $('#hof-recherche');
    c.focus();
    c.setSelectionRange(pos, pos);
  });
  scene().querySelectorAll('[data-auteur]').forEach(b => b.addEventListener('click', () => page('hof', { ...filtres, auteur: b.dataset.auteur })));
  scene().querySelectorAll('[data-suppr-hof]').forEach(b => b.addEventListener('click', async () => {
    if (await confirmer('Supprimer cette vanne du Hall of Fame ?', 'Supprimer')) {
      const h = db.hof.find(x => x.id === b.dataset.supprHof);
      db.hof = db.hof.filter(x => x.id !== b.dataset.supprHof);
      if (h && db.joueurs[h.auteur].stats.hof) db.joueurs[h.auteur].stats.hof--;
      sauver();
      page('hof', filtres);
    }
  }));
}

function brancherReglages() {
  $('#r-plaidoirie').addEventListener('change', e => { db.reglages.dureePlaidoirie = Math.max(15, Number(e.target.value) || 60); sauver(); toast('Enregistré'); });
  $('#r-recit').addEventListener('change', e => { db.reglages.dureeRecit = Math.max(15, Number(e.target.value) || 90); sauver(); toast('Enregistré'); });
  $('#r-export').addEventListener('click', exporter);
  $('#r-import').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    if (!(await confirmer('Remplacer toutes les données actuelles par cette sauvegarde ?', 'Importer'))) return;
    try { await importer(f); toast('Sauvegarde importée'); page('reglages'); }
    catch (err) { toast(`Erreur : ${esc(err.message)}`); }
  });
  $('#r-reset').addEventListener('click', async () => {
    if (!(await confirmer('Tout effacer ? Classement, Hall of Fame, verdicts…', 'Continuer'))) return;
    if (!(await confirmer('Vraiment ? C\'est irréversible.', 'Tout effacer'))) return;
    reinitialiser();
    toast('Données réinitialisées');
    afficherAccueil();
  });
}

// Délégation des clics de navigation sur la scène
scene().addEventListener('click', async e => {
  const nav = e.target.closest('[data-nav]');
  if (nav) return page(nav.dataset.nav);
  const prof = e.target.closest('[data-profil]');
  if (prof) return page('profil', prof.dataset.profil);
  const go = e.target.closest('[data-go]');
  if (!go) return;
  const v = go.dataset.go;
  if (v === 'accueil') afficherAccueil();
  if (v === 'setup') afficherSetup();
  if (v === 'hub') afficherHub();
  if (v === 'reprendre') reprendre();
  if (v === 'abandon') {
    if (await confirmer('Clôturer la soirée en cours et afficher son bilan ?', 'Clôturer')) finDeSoiree();
  }
});

// =====================================================================
//  Préparation de la soirée
// =====================================================================
let clicSetup = null;
function afficherSetup() {
  pageCourante = 'setup';
  if (clicSetup) scene().removeEventListener('click', clicSetup);
  const derniere = db.soirees[db.soirees.length - 1];
  const cfg = {
    presents: new Set(derniere?.presents || JOUEURS.map(j => j.id)),
    equipes: false, nbEquipes: 2, repartition: {}, nomsEquipes: [],
    mode: derniere?.mode || 'arrose', niveau: derniere?.niveau || 2,
  };

  const melanger = () => {
    const l = shuffle([...cfg.presents]);
    cfg.repartition = {};
    l.forEach((p, i) => { cfg.repartition[p] = i % cfg.nbEquipes; });
    cfg.nomsEquipes = shuffle(NOMS_EQUIPES).slice(0, cfg.nbEquipes);
  };

  const rendre = () => {
    for (const p of cfg.presents) if (!(p in cfg.repartition)) cfg.repartition[p] = 0;
    const presents = JOUEURS.filter(j => cfg.presents.has(j.id)).map(j => j.id);
    afficher(`<div class="page setup">
      <button class="btn fantome retour-accueil" data-go="accueil">← Accueil</button>
      <h1 class="page-titre">Nouvelle soirée</h1>
      <section>
        <h3>Qui est là ce soir ? <span class="muet">(${cfg.presents.size})</span></h3>
        <div class="choix-joueurs">${JOUEURS.map(j => `
          <button class="choix-j ${cfg.presents.has(j.id) ? 'actif' : 'inactif'}" data-p="${j.id}">${pastille(j.id, 'l')}<span>${esc(j.nom)}</span></button>`).join('')}</div>
      </section>
      <div class="setup-grille">
        <section class="verre carte">
          <h3>Format</h3>
          <div class="segment">
            <button class="${!cfg.equipes ? 'actif' : ''}" data-s="solo">Solo</button>
            <button class="${cfg.equipes ? 'actif' : ''}" data-s="equipes">Équipes</button>
          </div>
          ${cfg.equipes ? `
            <div class="segment petit">
              <button class="${cfg.nbEquipes === 2 ? 'actif' : ''}" data-n="2">2 équipes</button>
              <button class="${cfg.nbEquipes === 3 ? 'actif' : ''}" data-n="3">3 équipes</button>
              <button data-s="melanger">🔀 Mélanger</button>
            </div>
            <div class="equipes">${Array.from({ length: cfg.nbEquipes }, (_, t) => `
              <div class="equipe"><b>${esc(cfg.nomsEquipes[t] || `Équipe ${t + 1}`)}</b>
                <div>${presents.filter(p => cfg.repartition[p] === t).map(p => `<button class="mini-j" data-t="${p}" title="Changer d'équipe">${pastille(p, 's')}${esc(nom(p))}</button>`).join('')}</div>
              </div>`).join('')}</div>
            <p class="muet petit">Clique sur un joueur pour le changer d'équipe.</p>` : '<p class="muet">Chacun pour sa peau.</p>'}
        </section>
        <section class="verre carte">
          <h3>Mode</h3>
          <div class="segment">
            <button class="${cfg.mode === 'sobre' ? 'actif' : ''}" data-m="sobre">😇 Sobre</button>
            <button class="${cfg.mode === 'arrose' ? 'actif' : ''}" data-m="arrose">💦 Arrosé</button>
          </div>
          <p class="muet">${cfg.mode === 'sobre' ? 'Les perdants subissent un Pari Débile.' : 'Gorgées selon les règles de chaque manche. Pause possible à tout moment.'}</p>
        </section>
        <section class="verre carte">
          <h3>Intensité</h3>
          <div class="niveaux">${[1, 2, 3].map(n => `
            <button class="niveau ${cfg.niveau === n ? 'actif' : ''}" data-l="${n}"><span>${'🌶'.repeat(n)}</span><b>${NIVEAUX[n].nom}</b></button>`).join('')}</div>
        </section>
      </div>
      <div class="actions">
        <button class="btn primaire geant" data-lancer ${cfg.presents.size < 3 ? 'disabled' : ''}>Ouvrir la salle →</button>
      </div>
      ${cfg.presents.size < 3 ? '<p class="centre alerte">Il faut au moins 3 joueurs.</p>' : ''}
    </div>`, 'scene-page');
  };

  const clic = e => {
    const t = e.target.closest('button');
    if (!t || pageCourante !== 'setup') return;
    if (t.dataset.p) { cfg.presents.has(t.dataset.p) ? cfg.presents.delete(t.dataset.p) : cfg.presents.add(t.dataset.p); if (cfg.equipes) melanger(); }
    else if (t.dataset.s === 'solo') cfg.equipes = false;
    else if (t.dataset.s === 'equipes') { cfg.equipes = true; melanger(); }
    else if (t.dataset.s === 'melanger') melanger();
    else if (t.dataset.n) { cfg.nbEquipes = Number(t.dataset.n); melanger(); }
    else if (t.dataset.t) cfg.repartition[t.dataset.t] = (cfg.repartition[t.dataset.t] + 1) % cfg.nbEquipes;
    else if (t.dataset.m) cfg.mode = t.dataset.m;
    else if (t.dataset.l) cfg.niveau = Number(t.dataset.l);
    else if ('lancer' in t.dataset) {
      scene().removeEventListener('click', clic);
      clicSetup = null;
      const presents = JOUEURS.filter(j => cfg.presents.has(j.id)).map(j => j.id);
      let equipes = null;
      if (cfg.equipes) {
        equipes = Array.from({ length: cfg.nbEquipes }, (_, i) => ({
          nom: cfg.nomsEquipes[i] || `Équipe ${i + 1}`,
          membres: presents.filter(p => cfg.repartition[p] === i),
        })).filter(eq => eq.membres.length);
      }
      nouvelleSoiree({ presents, mode: cfg.mode, niveau: cfg.niveau, equipes });
      J.memo = {};
      return ouvrirSalle();
    } else return;
    rendre();
  };
  clicSetup = clic;
  scene().addEventListener('click', clic);
  rendre();
}

// =====================================================================
//  Salle d'attente (connexion des téléphones)
// =====================================================================
async function ouvrirSalle() {
  pageCourante = 'salle';
  afficher('<div class="centre attente-reseau"><div class="loader"></div><p>Ouverture de la salle…</p></div>');
  const code = await reseau.demarrer(db.enCours?.code);
  if (db.enCours && code) { db.enCours.code = code; sauver(); }
  majBarre();
  afficherSalle();
}

function afficherSalle() {
  pageCourante = 'salle';
  majBarre();
  reseau.ecranTous(J.presents(), ecranAttente('Connecté ✓', 'La soirée va commencer. Garde ton téléphone à portée de main.'));
  afficher(`<div class="page salle">
    <h1 class="page-titre">Sortez vos téléphones</h1>
    ${blocConnexion()}
    ${grilleConnectes()}
    <div class="actions">
      <button class="btn primaire geant" data-go="hub">C'est parti →</button>
    </div>
    <p class="centre muet petit">Les manches secrètes (votes, vannes) se jouent sur téléphone. Un joueur sans téléphone connecté sera ignoré.</p>
  </div>`, 'scene-page');
}

async function reprendre() {
  J.memo = J.memo || {};
  if (!reseau.peer) await ouvrirSalle();
  else afficherSalle();
}

// =====================================================================
//  Menu de la soirée (hub)
// =====================================================================
function tableauSoir() {
  const s = soiree();
  const pts = p => s.points[p] || 0;
  const tri = [...s.presents].sort((a, b) => pts(b) - pts(a));
  const equipes = s.equipes ? s.equipes.map(eq => ({ ...eq, total: eq.membres.reduce((a, p) => a + pts(p), 0) })).sort((a, b) => b.total - a.total) : null;
  return `<aside class="tableau verre">
    <h3>Ce soir</h3>
    ${equipes ? `<div class="tab-equipes">${equipes.map((eq, i) => `
      <div class="tab-eq ${i === 0 && eq.total > 0 ? 'tete' : ''}"><b>${esc(eq.nom)}</b><span>${eq.total} pts</span>
        <div>${eq.membres.map(p => pastille(p, 'xs')).join('')}</div></div>`).join('')}</div>` : ''}
    <ol class="tab-joueurs">${tri.map((p, i) => `
      <li style="--i:${i}"><span class="tab-rang">${i + 1}</span>${pastille(p, 's')}<b>${esc(nom(p))}</b>
        <i class="dot ${reseau.connecte(p) ? 'ok' : ''}" data-dot="${p}" title="Téléphone"></i><span class="tab-pts">${pts(p)}</span></li>`).join('')}</ol>
  </aside>`;
}

function afficherHub() {
  const s = soiree();
  if (!s) return afficherAccueil();
  pageCourante = 'hub';
  J.enManche = false;
  majBarre();
  reseau.ecranTous(s.presents, ecranAttente('Regarde la télé', 'Prochaine manche dans un instant.'));
  const joues = t => s.manches.filter(m => m.type === t).length;
  afficher(`<div class="hub">
    <div class="hub-gauche">
      <button class="btn primaire geant hub-hasard" data-h="hasard">🎰 Manche au hasard</button>
      ${J.derniere ? `<button class="btn secondaire hub-rejouer" data-h="${J.derniere}">↻ Rejouer : ${esc(MANCHES[J.derniere].court || MANCHES[J.derniere].nom)}</button>` : ''}
      <div class="hub-manches">${Object.entries(MANCHES).map(([k, m]) => `
        <button class="manche-tuile verre" data-h="${k}">
          <span class="mt-icone">${m.icone}</span>
          <span class="mt-txt"><b>${esc(m.nom)}</b><small>${esc(m.pitch)}</small></span>
          ${joues(k) ? `<em class="mt-compte">×${joues(k)}</em>` : ''}
        </button>`).join('')}</div>
      <div class="hub-outils">
        <button class="btn fantome" data-h="pari">🎲 Pari Débile manuel</button>
        <button class="btn fantome" data-h="presents">👥 Présents</button>
        <button class="btn fantome" data-nav="classement">🏆 Classement</button>
        <button class="btn fantome" data-nav="hof">★ Hall of Fame</button>
      </div>
    </div>
    ${tableauSoir()}
  </div>`, 'scene-hub');
}

scene().addEventListener('click', async e => {
  const b = e.target.closest('[data-h]');
  if (!b || pageCourante !== 'hub') return;
  const v = b.dataset.h;
  if (v === 'hasard') return mancheHasard();
  if (v === 'pari') return pariManuel();
  if (v === 'presents') return modalePresents();
  if (MANCHES[v]) return lancerManche(v);
});

async function mancheHasard() {
  const s = soiree();
  const types = Object.keys(MANCHES).filter(t => t !== J.derniere);
  const joues = t => s.manches.filter(m => m.type === t).length;
  const min = Math.min(...types.map(joues));
  const candidats = types.filter(t => joues(t) <= min + 1);
  const choix = pick(candidats);
  pageCourante = 'roulette';
  const s2 = afficher(`<div class="roulette"><p class="muet">Prochaine manche</p><div class="roulette-nom"></div></div>`, 'scene-page');
  const el = $('.roulette-nom', s2);
  const ordre = shuffle(Object.keys(MANCHES));
  for (let i = 0; i < 14; i++) {
    const t = ordre[i % ordre.length];
    el.innerHTML = `<span>${MANCHES[t].icone}</span>${esc(MANCHES[t].nom)}`;
    await sleep(60 + i * 18);
  }
  el.innerHTML = `<span>${MANCHES[choix].icone}</span>${esc(MANCHES[choix].nom)}`;
  el.classList.add('choisi');
  await sleep(1100);
  lancerManche(choix);
}

async function lancerManche(type) {
  const s = soiree();
  const m = MANCHES[type];
  if (s.presents.length < m.min) { toast(`Il faut au moins ${m.min} joueurs.`); return afficherHub(); }
  const sansTel = s.presents.filter(p => !reseau.connecte(p));
  if (sansTel.length) {
    const ok = await confirmer(`${sansTel.map(p => `<b>${esc(nom(p))}</b>`).join(', ')} ${sansTel.length > 1 ? "n'ont" : "n'a"} pas de téléphone connecté. Lancer quand même ?`, 'Lancer', 'Attendre');
    if (!ok) { modaleQr(); return afficherHub(); }
  }
  pageCourante = 'manche';
  J.enManche = true;
  majBarre();
  noterManche(type);
  s.presents.forEach(p => stat(p, 'manches'));
  try {
    await FONCTIONS[type](J);
  } catch (err) {
    if (!(err instanceof Abandon)) {
      console.error(err);
      toast(`Oups, la manche a planté : ${esc(err.message)}`, 5000);
    }
  }
  J.derniere = type;
  J.enManche = false;
  afficherHub();
}

async function pariManuel() {
  const s = soiree();
  const m = modale(`<h2>🎲 Pari Débile pour qui ?</h2>
    <div class="choix-joueurs petit">${s.presents.map(p => `<button class="choix-j" data-pd="${p}">${pastille(p, 'm')}<span>${esc(nom(p))}</span></button>`).join('')}
    <button class="choix-j" data-pd="hasard"><span class="emb emb-m">🎲</span><span>Au hasard</span></button></div>`);
  m.el.addEventListener('click', async e => {
    const b = e.target.closest('[data-pd]');
    if (!b) return;
    m.fermer();
    const pid = b.dataset.pd === 'hasard' ? pick(s.presents) : b.dataset.pd;
    pageCourante = 'manche';
    J.enManche = true;
    majBarre();
    try { await pariDebile(J, pid); } catch (err) { if (!(err instanceof Abandon)) console.error(err); }
    J.enManche = false;
    afficherHub();
  });
}

function modalePresents() {
  const s = soiree();
  const sel = new Set(s.presents);
  const rendre = () => `<h2>👥 Qui est là ?</h2>
    <p class="muet">Quelqu'un arrive en retard ou part plus tôt ? Coche ou décoche.</p>
    <div class="choix-joueurs petit">${JOUEURS.map(j => `<button class="choix-j ${sel.has(j.id) ? 'actif' : 'inactif'}" data-pp="${j.id}">${pastille(j.id, 'm')}<span>${esc(j.nom)}</span></button>`).join('')}</div>
    <div class="actions"><button class="btn primaire" data-pp-ok ${sel.size < 3 ? 'disabled' : ''}>Valider (${sel.size})</button></div>`;
  const m = modale(rendre(), { large: true });
  m.el.addEventListener('click', e => {
    const b = e.target.closest('[data-pp]');
    if (b) {
      sel.has(b.dataset.pp) ? sel.delete(b.dataset.pp) : sel.add(b.dataset.pp);
      m.el.innerHTML = '<button class="modale-x" aria-label="Fermer">✕</button>' + rendre();
      return;
    }
    if (e.target.closest('[data-pp-ok]')) {
      s.presents = JOUEURS.filter(j => sel.has(j.id)).map(j => j.id);
      if (s.equipes) {
        s.equipes.forEach(eq => { eq.membres = eq.membres.filter(p => sel.has(p)); });
        const deja = new Set(s.equipes.flatMap(eq => eq.membres));
        for (const p of s.presents) if (!deja.has(p)) {
          const petite = s.equipes.reduce((a, b2) => (b2.membres.length < a.membres.length ? b2 : a));
          petite.membres.push(p);
        }
      }
      sauver();
      reseau.deconnecterAbsents();
      m.fermer();
      afficherHub();
    }
  });
}

// =====================================================================
//  Fin de soirée
// =====================================================================
async function finDeSoiree() {
  const s = soiree();
  if (!s) return afficherAccueil();
  if (J.enManche) abandonner();
  const pts = p => s.points[p] || 0;
  const tri = [...s.presents].sort((a, b) => pts(b) - pts(a));
  const titres = titresDuSoir(s);
  const vannes = db.hof.filter(h => h.soireeId === s.id);
  const nbVerdicts = db.verdicts.filter(v => v.soireeId === s.id).length;
  const equipes = s.equipes ? s.equipes.map(eq => ({ ...eq, total: eq.membres.reduce((a, p) => a + pts(p), 0) })).sort((a, b) => b.total - a.total) : null;
  terminerSoiree();
  reseau.arreter();
  J.memo = {};
  J.derniere = null;
  majBarre();
  pageCourante = 'recap';
  const podium = tri.slice(0, 3);
  const ordrePodium = [podium[1], podium[0], podium[2]].filter(Boolean);
  afficher(`<div class="page recap">
    <h1 class="page-titre">Bilan de la soirée</h1>
    <p class="muet centre">${dateFr(s.debut)} · ${s.manches.length} manche${s.manches.length > 1 ? 's' : ''} · ${nbVerdicts} procès · ${vannes.length} vanne${vannes.length > 1 ? 's' : ''} au Hall of Fame</p>
    ${equipes ? `<p class="annonce">🏆 Victoire de <b>${esc(equipes[0].nom)}</b> avec ${equipes[0].total} pts</p>` : ''}
    <div class="podium">${ordrePodium.map(p => {
      const place = tri.indexOf(p) + 1;
      return `<div class="marche m${place}">${pastille(p, place === 1 ? 'xl' : 'l')}<b>${esc(nom(p))}</b><span>${pts(p)} pts</span><div class="socle">${place}</div></div>`;
    }).join('')}</div>
    <div class="recap-grille">
      <section class="verre carte">
        <h3>Titres du soir</h3>
        ${titres.length ? `<ul class="liste titres">${titres.map(t => `<li><em class="chip grand">${esc(t.titre)}</em> ${t.qui.map(p => tag(p, 'xs')).join(' ')}</li>`).join('')}</ul>` : '<p class="muet">Soirée trop calme pour distribuer des titres.</p>'}
        ${tri.length > 3 ? `<p class="muet petit">Lanterne rouge : ${tag(tri[tri.length - 1], 'xs')}</p>` : ''}
      </section>
      <section class="verre carte">
        <h3>Vannes de la soirée</h3>
        ${vannes.length ? `<ul class="liste citations">${vannes.map(v => `<li>« ${esc(v.texte)} » ${tag(v.auteur, 'xs')}</li>`).join('')}</ul>` : '<p class="muet">Aucune vanne gravée ce soir.</p>'}
      </section>
    </div>
    <div class="actions">
      <button class="btn secondaire" id="recap-export">⬇ Télécharger la sauvegarde</button>
      <button class="btn primaire" data-go="accueil">Accueil</button>
    </div>
  </div>`, 'scene-page');
  $('#recap-export').addEventListener('click', exporter);
}

// =====================================================================
//  Démarrage
// =====================================================================
window.addEventListener('beforeunload', e => {
  if (J.enManche) { e.preventDefault(); e.returnValue = ''; }
});

afficherAccueil();
