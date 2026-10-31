import { pastille, nom } from '../../shared/joueurs.js';
import { esc, pick, hash } from '../../shared/util.js';
import { etape, enTete, collecter } from '../ui.js';
import { db, sauver, stat } from '../db.js';
import { MANCHES } from '../config.js';
import { tirerBrut } from '../contenu.js';
import { bilan } from '../sanctions.js';
import { DESIGNATION } from '../../../contenu/chambrage.js';

const M = MANCHES.susceptible;

export default async function susceptible(J) {
  const presents = J.presents();
  const sit = tirerBrut('susceptible', J.niveau());
  const question = `Qui est le plus susceptible de ${sit.texte} ?`;
  const haut = `${enTete(M.icone, 'Qui est le plus susceptible de…')}
    <div class="carte verre question-geante"><p>${esc(sit.texte)} ?</p></div>`;

  const votes = await collecter(J, presents, () => ({
    kind: 'vote', titre: 'Vote secret', texte: question,
    options: presents.map(p => ({ id: p, label: nom(p), pid: p })),
  }), haut);

  const compte = Object.fromEntries(presents.map(p => [p, 0]));
  for (const v of votes.values()) if (v in compte) compte[v]++;
  const classes = presents.filter(p => compte[p] > 0).sort((a, b) => compte[b] - compte[a]);
  const total = votes.size || 1;
  const max = classes.length ? compte[classes[0]] : 0;
  const tops = classes.filter(p => compte[p] === max);

  // Statistiques long terme
  const k = hash(sit.texte);
  db.susceptible[k] = db.susceptible[k] || { texte: sit.texte, votes: {} };
  for (const p of classes) {
    db.susceptible[k].votes[p] = (db.susceptible[k].votes[p] || 0) + compte[p];
    stat(p, 'designe', compte[p]);
  }
  tops.forEach(p => stat(p, 'designe_top'));
  sauver();

  await etape(`${enTete(M.icone, esc(sit.texte) + ' ?')}
    <div class="sbars">
      ${classes.map((p, i) => `
        <div class="sbar ${tops.includes(p) ? 'top' : ''}" style="--i:${i}">
          ${pastille(p, 'm')}<span class="sbar-nom">${esc(nom(p))}</span>
          <div class="sbar-piste"><div class="sbar-rempli" style="--w:${Math.round(compte[p] / total * 100)}%"></div></div>
          <b>${compte[p]}</b>
        </div>`).join('') || '<p class="muet centre">Personne n\'a voté. Lâches.</p>'}
    </div>
    ${tops.length ? `<p class="annonce">${tops.map(p => `<b>${esc(nom(p))}</b>`).join(' et ')}, ${tops.length > 1 ? 'justifiez-vous' : 'justifie-toi'} ! <span class="muet">${pick(DESIGNATION)}</span></p>` : ''}`,
  [{ label: 'Justification faite', valeur: 'ok', style: 'primaire' }]);

  const plebiscite = tops.length === 1 && max > total / 2;
  await bilan(J, {
    titre: 'Le peuple a tranché',
    texte: J.arrose() ? 'Chaque désigné boit autant que les votes reçus.' : (plebiscite ? `${nom(tops[0])} est plébiscité : Pari Débile.` : 'Pas de majorité absolue, pas de gage. Cette fois.'),
    gorgees: classes.map(p => ({ pid: p, n: compte[p], raison: `${compte[p]} vote${compte[p] > 1 ? 's' : ''}` })),
    gages: plebiscite ? [tops[0]] : [],
  });
}
