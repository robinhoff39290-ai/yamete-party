// Pages de consultation : classement, profils, Hall of Fame, verdicts, stats.
import { JOUEURS, pastille, nom, tag } from '../shared/joueurs.js';
import { esc, dateFr, pluriel } from '../shared/util.js';
import { db, titresPermanents } from './db.js';
import { grade, LIBELLES_STATS } from './config.js';

export function classementTrie() {
  return JOUEURS.map(j => ({ id: j.id, ...db.joueurs[j.id] })).sort((a, b) => b.points - a.points);
}

export function vueClassement() {
  const lignes = classementTrie();
  return `<div class="page">
    <h1 class="page-titre">Classement général</h1>
    <p class="muet">Cumul de toutes les soirées · ${pluriel(db.soirees.filter(s => s.fin).length, 'soirée')} jouée${db.soirees.filter(s => s.fin).length > 1 ? 's' : ''}</p>
    <div class="classement">
      ${lignes.map((j, i) => {
        const titres = titresPermanents(j.id);
        return `<button class="rang verre" data-profil="${j.id}" style="--i:${i}">
          <span class="rang-n">${i + 1}</span>
          ${pastille(j.id, 'l')}
          <span class="rang-info"><b>${esc(nom(j.id))}</b><small>${esc(grade(j.points))}</small>
            <span class="chips">${titres.slice(0, 3).map(t => `<em class="chip">${esc(t)}</em>`).join('')}${titres.length > 3 ? `<em class="chip">+${titres.length - 3}</em>` : ''}</span></span>
          <span class="rang-pts">${j.points}<small>pts</small></span>
        </button>`;
      }).join('')}
    </div>
  </div>`;
}

export function vueProfil(pid) {
  const j = db.joueurs[pid];
  const titres = titresPermanents(pid);
  const rang = classementTrie().findIndex(x => x.id === pid) + 1;
  const soirees = db.soirees.filter(s => s.fin && s.presents.includes(pid));
  const vannes = db.hof.filter(h => h.auteur === pid).slice(-5).reverse();
  const procès = db.verdicts.filter(v => [v.defenseur, v.procureur, v.accuse].includes(pid)).slice(-5).reverse();
  const desig = Object.values(db.susceptible)
    .map(s => ({ texte: s.texte, n: s.votes[pid] || 0 }))
    .filter(s => s.n > 0).sort((a, b) => b.n - a.n).slice(0, 5);
  const stats = Object.entries(LIBELLES_STATS).filter(([k]) => j.stats[k]).map(([k, l]) => ({ l, v: j.stats[k] }));

  return `<div class="page profil">
    <button class="btn fantome retour" data-nav="classement">← Classement</button>
    <div class="profil-tete">
      ${pastille(pid, 'xxl')}
      <div>
        <h1>${esc(nom(pid))}</h1>
        <p class="grade">${esc(grade(j.points))}</p>
        <p class="muet">${j.points} pts · ${rang}e au général · ${pluriel(soirees.length, 'soirée')}</p>
        <div class="chips">${titres.map(t => `<em class="chip grand">${esc(t)}</em>`).join('') || '<em class="muet">Aucun titre pour l\'instant</em>'}</div>
      </div>
    </div>
    <div class="profil-grille">
      <section class="verre carte">
        <h3>Statistiques</h3>
        ${stats.length ? `<dl class="stats">${stats.map(s => `<div><dt>${esc(s.l)}</dt><dd>${s.v}</dd></div>`).join('')}</dl>` : '<p class="muet">Rien encore. Joue.</p>'}
      </section>
      <section class="verre carte">
        <h3>Le plus susceptible de…</h3>
        ${desig.length ? `<ul class="liste">${desig.map(d => `<li>${esc(d.texte)} <b>${d.n}</b></li>`).join('')}</ul>` : '<p class="muet">Jamais désigné. Suspect.</p>'}
      </section>
      <section class="verre carte">
        <h3>Ses vannes au Hall of Fame</h3>
        ${vannes.length ? `<ul class="liste citations">${vannes.map(v => `<li>« ${esc(v.texte)} »<small>${dateFr(v.date)}</small></li>`).join('')}</ul>` : '<p class="muet">Aucune vanne mémorable.</p>'}
      </section>
      <section class="verre carte">
        <h3>Casier judiciaire</h3>
        ${procès.length ? `<ul class="liste">${procès.map(v => `<li><b>${esc(v.verdict)}</b> · ${esc(v.texte)}</li>`).join('')}</ul>` : '<p class="muet">Casier vierge.</p>'}
      </section>
    </div>
  </div>`;
}

export function vueHof({ recherche = '', auteur = '' } = {}) {
  const r = recherche.trim().toLowerCase();
  const items = db.hof
    .filter(h => (!auteur || h.auteur === auteur) && (!r || h.texte.toLowerCase().includes(r)))
    .slice().reverse();
  return `<div class="page">
    <h1 class="page-titre">Hall of Fame des vannes</h1>
    <div class="filtres">
      <input type="search" class="champ" id="hof-recherche" placeholder="Rechercher une vanne…" value="${esc(recherche)}">
      <div class="filtre-auteurs">
        <button class="chip-btn ${!auteur ? 'actif' : ''}" data-auteur="">Tous</button>
        ${JOUEURS.map(j => `<button class="chip-btn ${auteur === j.id ? 'actif' : ''}" data-auteur="${j.id}">${pastille(j.id, 'xs')}${esc(j.nom)}</button>`).join('')}
      </div>
    </div>
    <div class="hof-liste">
      ${items.map((h, i) => `<article class="hof-item verre" style="--i:${Math.min(i, 12)}">
        <p>« ${esc(h.texte)} »</p>
        <footer>${tag(h.auteur, 's')}<small>${dateFr(h.date, true)}</small>
          <button class="lien-suppr" data-suppr-hof="${h.id}" title="Supprimer">✕</button></footer>
      </article>`).join('') || '<p class="muet centre">Aucune vanne. Le bouton « ★ Vanne » est disponible pendant les soirées.</p>'}
    </div>
  </div>`;
}

export function vueVerdicts() {
  const v = db.verdicts.slice().reverse();
  return `<div class="page">
    <h1 class="page-titre">Archives du Tribunal</h1>
    <div class="verdicts">
      ${v.map(x => `<article class="verre carte verdict-item">
        <header><span class="tampon mini ${x.verdict === 'COUPABLE' || x.verdict === 'THÈSE REJETÉE' ? 'rouge' : x.verdict === 'JURY PENDU' ? '' : 'vert'}">${esc(x.verdict)}</span><small>${dateFr(x.date, true)}</small></header>
        <p>${esc(x.texte)}</p>
        <footer>🛡️ ${tag(x.defenseur, 'xs')} · ⚔️ ${tag(x.procureur, 'xs')} · ${x.votes.def} contre ${x.votes.proc}
        ${x.contreEmploi?.length ? ` · 🎭 contre-emploi : ${x.contreEmploi.map(nom).join(', ')}` : ''}</footer>
      </article>`).join('') || '<p class="muet centre">Aucun procès pour l\'instant.</p>'}
    </div>
  </div>`;
}

export function vueSusceptible() {
  const items = Object.values(db.susceptible)
    .map(s => ({ ...s, total: Object.values(s.votes).reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total);
  return `<div class="page">
    <h1 class="page-titre">Qui est le plus susceptible de…</h1>
    <p class="muet">Statistiques cumulées de toutes les soirées.</p>
    <div class="stats-sus">
      ${items.map(s => {
        const tri = Object.entries(s.votes).sort((a, b) => b[1] - a[1]);
        return `<article class="verre carte">
          <p class="sus-q">… ${esc(s.texte)} ?</p>
          <div class="sus-top">${tri.slice(0, 3).map(([p, n], i) => `<span class="sus-j ${i === 0 ? 'premier' : ''}">${pastille(p, i === 0 ? 'm' : 's')}<b>${esc(nom(p))}</b><em>${n}</em></span>`).join('')}</div>
        </article>`;
      }).join('') || '<p class="muet centre">Pas encore de stats.</p>'}
    </div>
  </div>`;
}

export function vueReglages() {
  return `<div class="page reglages">
    <h1 class="page-titre">Réglages et sauvegarde</h1>
    <section class="verre carte">
      <h3>Durées</h3>
      <label class="ligne-reglage">Plaidoirie au Tribunal (secondes)
        <input type="number" class="champ court" min="15" max="300" step="5" id="r-plaidoirie" value="${db.reglages.dureePlaidoirie}"></label>
      <label class="ligne-reglage">Récit à Mytho ou Pas Mytho (secondes)
        <input type="number" class="champ court" min="15" max="300" step="5" id="r-recit" value="${db.reglages.dureeRecit}"></label>
    </section>
    <section class="verre carte">
      <h3>Sauvegarde</h3>
      <p class="muet">Les données sont stockées dans ce navigateur, sur cet ordinateur. Télécharge régulièrement une sauvegarde pour ne rien perdre, ou pour changer d'ordinateur.</p>
      <div class="actions gauche">
        <button class="btn primaire" id="r-export">⬇ Télécharger la sauvegarde</button>
        <label class="btn secondaire">⬆ Importer une sauvegarde<input type="file" accept=".json,application/json" id="r-import" hidden></label>
      </div>
    </section>
    <section class="verre carte danger">
      <h3>Zone dangereuse</h3>
      <p class="muet">Efface classement, Hall of Fame, verdicts et statistiques.</p>
      <button class="btn fantome" id="r-reset">Tout réinitialiser</button>
    </section>
  </div>`;
}
