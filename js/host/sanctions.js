// Bilan de manche (points, gorgées) et Pari Débile.
import { pastille, nom, tag } from '../shared/joueurs.js';
import { esc, pick, pluriel } from '../shared/util.js';
import { etape } from './ui.js';
import { ajouterPoints, stat } from './db.js';
import { POINTS } from './config.js';
import { tirerBrut, remplir } from './contenu.js';
import { PASSE } from '../../contenu/chambrage.js';

function regrouper(liste) {
  const m = new Map();
  for (const { pid, n, raison } of liste) {
    if (!pid || !n) continue;
    const e = m.get(pid) || { pid, n: 0, raisons: [] };
    e.n += n;
    if (raison && !e.raisons.includes(raison)) e.raisons.push(raison);
    m.set(pid, e);
  }
  return [...m.values()].sort((a, b) => b.n - a.n);
}

function ligne(e, suffixe) {
  return `<li>${pastille(e.pid, 's')}<b>${esc(nom(e.pid))}</b><span class="val">${suffixe(e.n)}</span>${e.raisons.length ? `<small>${esc(e.raisons.join(' · '))}</small>` : ''}</li>`;
}

// points : [{pid, n, raison}] · gorgees : [{pid, n, raison}] (valeurs de base, ajustées au niveau)
// distribue : [{pid, n}] · gages : [pid] (Pari Débile en mode Sobre)
export async function bilan(J, { titre = 'Bilan', texte = '', points = [], gorgees = [], distribue = [], gages = [] }) {
  const arrose = J.arrose();
  const pts = regrouper(points);
  pts.forEach(e => ajouterPoints(e.pid, e.n));

  let boit = [];
  let dist = [];
  if (arrose) {
    boit = regrouper(gorgees.map(g => ({ ...g, n: J.g(g.n) })));
    dist = regrouper(distribue.map(g => ({ ...g, n: J.g(g.n) })));
    boit.forEach(e => stat(e.pid, 'gorgees', e.n));
  }

  // Écran perso sur chaque téléphone
  for (const pid of J.presents()) {
    const p = pts.find(e => e.pid === pid)?.n || 0;
    const b = boit.find(e => e.pid === pid)?.n || 0;
    const d = dist.find(e => e.pid === pid)?.n || 0;
    const morceaux = [];
    if (p) morceaux.push(`${p > 0 ? '+' : ''}${p} pt${Math.abs(p) > 1 ? 's' : ''}`);
    if (b) morceaux.push(`Tu bois ${pluriel(b, 'gorgée')}`);
    if (d) morceaux.push(`Tu distribues ${pluriel(d, 'gorgée')}`);
    if (!arrose && gages.includes(pid)) morceaux.push('Pari Débile pour toi…');
    J.reseau.ecran(pid, { kind: 'info', titre: morceaux.length ? morceaux.join(' · ') : 'Rien pour toi', texte: 'Regarde la télé.', ton: b || gages.includes(pid) ? 'alerte' : p > 0 ? 'bravo' : '' });
  }

  const colonnes = [];
  if (pts.length) colonnes.push(`<div class="bilan-col"><h3>Points</h3><ul>${pts.map(e => ligne(e, n => `${n > 0 ? '+' : ''}${n}`)).join('')}</ul></div>`);
  if (arrose && (boit.length || dist.length)) {
    colonnes.push(`<div class="bilan-col arrose"><h3>Gorgées</h3><ul>
      ${boit.map(e => ligne(e, n => `boit ${n}`)).join('')}
      ${dist.map(e => ligne(e, n => `distribue ${n}`)).join('')}</ul></div>`);
  }
  if (!arrose && gages.length) {
    colonnes.push(`<div class="bilan-col gage"><h3>Pari Débile</h3><ul>${gages.map(pid => `<li>${pastille(pid, 's')}<b>${esc(nom(pid))}</b><span class="val">🎲</span></li>`).join('')}</ul></div>`);
  }

  await etape(`
    <div class="carte verre bilan">
      <h2 class="titre-bilan">${titre}</h2>
      ${texte ? `<p class="bilan-texte">${texte}</p>` : ''}
      <div class="bilan-cols">${colonnes.join('') || '<p class="muet">Rien à signaler. Bizarre.</p>'}</div>
    </div>`, [{ label: !arrose && gages.length ? 'Au Pari Débile 🎲' : 'Continuer', valeur: 'ok', style: 'primaire' }]);

  if (!arrose) {
    for (const pid of gages) await pariDebile(J, pid);
  }
}

export async function pariDebile(J, pid) {
  let relances = 1;
  const tirer = () => {
    const g = tirerBrut('gages', J.niveau());
    const autres = J.presents().filter(p => p !== pid);
    const x = autres.length ? pick(autres) : pid;
    return remplir(g?.texte || 'Faire 30 pompes.', { X: nom(x), J: nom(pid) });
  };
  let texte = tirer();
  for (;;) {
    J.reseau.ecran(pid, { kind: 'info', titre: '🎲 Pari Débile', texte, ton: 'alerte' });
    const boutons = [
      { label: '✓ Gage fait', valeur: 'fait', style: 'primaire' },
      ...(relances > 0 ? [{ label: '↻ Autre gage', valeur: 'autre', style: 'secondaire' }] : []),
      { label: `✕ Passer son tour (${POINTS.gagePasse} pts)`, valeur: 'passe', style: 'fantome' },
    ];
    const v = await etape(`
      <div class="pari">
        <p class="pari-sur">Pari Débile</p>
        ${pastille(pid, 'xl', 'pulse')}
        <h2 class="pari-nom">${esc(nom(pid))}</h2>
        <div class="carte verre pari-carte"><p>${esc(texte)}</p></div>
        <p class="muet petit">Niveau ${J.niveau()} · droit de passer son tour</p>
      </div>`, boutons, 'scene-pari');
    if (v === 'autre') { relances--; texte = tirer(); continue; }
    if (v === 'fait') {
      ajouterPoints(pid, POINTS.gageFait);
      stat(pid, 'gages_faits');
      J.reseau.ecran(pid, { kind: 'info', titre: 'Respect.', texte: `+${POINTS.gageFait} pt. Tu as assumé.`, ton: 'bravo' });
    } else {
      ajouterPoints(pid, POINTS.gagePasse);
      stat(pid, 'gages_passes');
      J.reseau.ecran(pid, { kind: 'info', titre: 'Petite nature', texte: `${POINTS.gagePasse} pts. On s'en souviendra.`, ton: 'alerte' });
      await etape(`<div class="carte verre centre"><div>${tag(pid, 'l')}</div><h2>${esc(remplir(pick(PASSE), { J: nom(pid) }))}</h2></div>`);
    }
    return v;
  }
}
