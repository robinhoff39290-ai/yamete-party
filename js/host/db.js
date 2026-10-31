// Persistance locale (navigateur de l'ordinateur de soirée) + export / import.
import { JOUEURS } from '../shared/joueurs.js';
import { uid } from '../shared/util.js';
import { TITRES, TITRES_SOIR } from './config.js';

const CLE = 'yamete-party-v1';

function vide() {
  return {
    version: 1,
    joueurs: Object.fromEntries(JOUEURS.map(j => [j.id, { points: 0, stats: {} }])),
    soirees: [],
    verdicts: [],
    hof: [],
    susceptible: {},
    deja: {},
    enCours: null,
    reglages: { dureePlaidoirie: 60, dureeRecit: 90 },
  };
}

export let db = charger();

function charger() {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return vide();
    return completer(JSON.parse(brut));
  } catch (e) {
    console.warn('Sauvegarde illisible, nouvelle base', e);
    return vide();
  }
}

function completer(d) {
  const base = vide();
  const out = { ...base, ...d };
  out.reglages = { ...base.reglages, ...(d.reglages || {}) };
  for (const j of JOUEURS) {
    out.joueurs[j.id] = { points: 0, stats: {}, ...(out.joueurs[j.id] || {}) };
  }
  return out;
}

export function sauver() {
  try {
    localStorage.setItem(CLE, JSON.stringify(db));
  } catch (e) {
    console.error('Impossible de sauvegarder', e);
  }
}

export function exporter() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date();
  a.href = URL.createObjectURL(blob);
  a.download = `yamete-party-sauvegarde-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function importer(fichier) {
  const txt = await fichier.text();
  const d = JSON.parse(txt);
  if (!d || d.version !== 1 || !d.joueurs) throw new Error('Fichier de sauvegarde invalide');
  db = completer(d);
  db.enCours = null;
  sauver();
}

export function reinitialiser() {
  db = vide();
  sauver();
}

// ---------- Soirée ----------
export function soiree() {
  if (!db.enCours) return null;
  return db.soirees.find(s => s.id === db.enCours.soireeId) || null;
}

export function nouvelleSoiree({ presents, mode, niveau, equipes }) {
  const s = {
    id: uid(10), debut: Date.now(), fin: null, presents: [...presents],
    mode, niveau, equipes: equipes || null,
    points: {}, stats: {}, manches: [],
  };
  db.soirees.push(s);
  db.enCours = { soireeId: s.id, pause: false };
  sauver();
  return s;
}

export function terminerSoiree() {
  const s = soiree();
  if (s) s.fin = Date.now();
  db.enCours = null;
  sauver();
  return s;
}

// ---------- Points et stats ----------
export function ajouterPoints(pid, n) {
  if (!n) return;
  db.joueurs[pid].points += n;
  const s = soiree();
  if (s) s.points[pid] = (s.points[pid] || 0) + n;
  sauver();
}

export function stat(pid, cle, n = 1) {
  if (!n) return;
  const st = db.joueurs[pid].stats;
  st[cle] = (st[cle] || 0) + n;
  const s = soiree();
  if (s) {
    s.stats[pid] = s.stats[pid] || {};
    s.stats[pid][cle] = (s.stats[pid][cle] || 0) + n;
  }
  sauver();
}

export function noterManche(type) {
  const s = soiree();
  if (s) s.manches.push({ type, date: Date.now() });
  sauver();
}

// ---------- Tirage sans répétition ----------
export function dejaVu(categorie) {
  db.deja[categorie] = db.deja[categorie] || [];
  return db.deja[categorie];
}

export function marquerVu(categorie, cle) {
  const l = dejaVu(categorie);
  if (!l.includes(cle)) l.push(cle);
  sauver();
}

export function oublierCategorie(categorie, cles) {
  db.deja[categorie] = dejaVu(categorie).filter(c => !cles.includes(c));
  sauver();
}

// ---------- Titres ----------
function leaders(source, cle, parmi) {
  let max = 0; let qui = [];
  for (const pid of parmi) {
    const v = source(pid)?.[cle] || 0;
    if (v > max) { max = v; qui = [pid]; } else if (v === max && v > 0) qui.push(pid);
  }
  return max > 0 ? qui : [];
}

export function titresPermanents(pid) {
  const tous = JOUEURS.map(j => j.id);
  return TITRES.filter(t => leaders(id => db.joueurs[id].stats, t.stat, tous).includes(pid)).map(t => t.titre);
}

export function titresDuSoir(s) {
  const res = [];
  for (const t of TITRES_SOIR) {
    const qui = leaders(id => s.stats[id], t.stat, s.presents);
    if (qui.length) res.push({ titre: t.titre, qui });
  }
  return res;
}
