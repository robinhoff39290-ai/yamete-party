import { nom, tag, pastille } from '../../shared/joueurs.js';
import { esc, shuffle, pick } from '../../shared/util.js';
import { etape, enTete, collecter } from '../ui.js';
import { stat } from '../db.js';
import { POINTS, MANCHES } from '../config.js';
import { tirerBrut, remplir, balises } from '../contenu.js';
import { bilan } from '../sanctions.js';

const M = MANCHES.pirequeca;

export default async function pireQueCa(J) {
  const presents = J.presents();
  const d = tirerBrut('dilemmes', J.niveau());
  const b = balises([d.a, d.b], presents);
  const noms = Object.fromEntries(Object.entries(b).map(([k, v]) => [k, nom(v)]));
  const a = remplir(d.a, noms);
  const bb = remplir(d.b, noms);

  const dilemme = `<div class="dilemme">
      <div class="option verre"><span class="lettre">A</span><p>Plutôt ${esc(a)}</p></div>
      <div class="ou">ou</div>
      <div class="option verre"><span class="lettre">B</span><p>${esc(bb)}</p></div>
      <div class="ou">ou pire…</div>
      <div class="option verre option-c"><span class="lettre">C</span><p>???</p></div>
    </div>`;

  await etape(`${enTete(M.icone, M.nom, 'Inventez une troisième option encore plus abjecte.')}${dilemme}`,
    [{ label: 'À vos téléphones', valeur: 'ok', style: 'primaire' }]);

  const ecrits = await collecter(J, presents, () => ({
    kind: 'text', titre: 'Option C : encore pire',
    texte: `A : ${a}\nB : ${bb}\nInvente pire que ça.`,
    placeholder: 'Plutôt…', max: 200,
  }), `${enTete(M.icone, 'Pire que ça…')}${dilemme}`);

  const options = shuffle([...ecrits].filter(([, t]) => String(t || '').trim()).map(([auteur, t]) => ({ auteur, texte: String(t).trim() })))
    .map((o, i) => ({ ...o, id: String(i + 1) }));
  if (options.length < 2) {
    await etape(`<div class="carte verre centre"><h2>Pas assez de propositions.</h2><p>Manche annulée.</p></div>`);
    return;
  }

  for (let i = 0; i < options.length; i++) {
    await etape(`${enTete(M.icone, 'Les horreurs proposées', `${i + 1} / ${options.length}`)}
      <div class="vannes">${options.slice(0, i + 1).map((o, k) => `
        <div class="vanne verre ${k === i ? 'nouvelle' : 'ancienne'}"><span class="num">#${o.id}</span><p>${esc(o.texte)}</p></div>`).join('')}</div>`,
    [{ label: i < options.length - 1 ? 'Suivante' : 'Au vote', valeur: 'ok', style: 'primaire' }]);
  }

  const votes = await collecter(J, presents, pid => ({
    kind: 'vote', titre: 'La plus abjecte ?', texte: 'Pas le droit de voter pour la tienne.',
    options: options.filter(o => o.auteur !== pid).map(o => ({ id: o.id, label: `#${o.id} · ${o.texte}` })),
  }), `${enTete(M.icone, 'Vote : la plus dégueulasse')}
    <div class="vannes compact">${options.map(o => `<div class="vanne verre"><span class="num">#${o.id}</span><p>${esc(o.texte)}</p></div>`).join('')}</div>`);

  const compte = Object.fromEntries(options.map(o => [o.id, 0]));
  for (const v of votes.values()) if (v in compte) compte[v]++;
  const tri = [...options].sort((x, y) => compte[y.id] - compte[x.id]);
  const max = compte[tri[0].id];
  const gagnants = tri.filter(o => compte[o.id] === max && max > 0);
  const min = compte[tri[tri.length - 1].id];
  const nuls = tri.filter(o => compte[o.id] === min);
  const perdant = pick(nuls).auteur;

  await etape(`${enTete(M.icone, 'Le podium de l\'horreur')}
    <div class="vannes compact">${tri.map((o, i) => `
      <div class="vanne verre ${gagnants.includes(o) ? 'gagnante' : ''}" style="--i:${i}">
        <span class="num">${compte[o.id]} vote${compte[o.id] > 1 ? 's' : ''}</span><p>${esc(o.texte)}</p>
        <div class="auteur">${tag(o.auteur, 's')}
          <button class="btn mini hof-btn" data-hof-auteur="${o.auteur}" data-hof-texte="${esc(o.texte)}">★ Hall of Fame</button></div>
      </div>`).join('')}</div>`, [{ label: 'Bilan', valeur: 'ok', style: 'primaire' }], 'avec-hof');

  const points = gagnants.map(o => ({ pid: o.auteur, n: POINTS.victoire, raison: 'option la plus abjecte' }));
  gagnants.forEach(o => stat(o.auteur, 'pqc_gagne'));
  await bilan(J, {
    titre: 'Pire Que Ça : verdict',
    texte: J.arrose() ? '' : `${nom(perdant)} a proposé la moins abjecte. Trop gentil : Pari Débile.`,
    points,
    distribue: gagnants.map(o => ({ pid: o.auteur, n: Math.max(1, max) })),
    gorgees: [{ pid: perdant, n: 2, raison: 'option trop soft' }],
    gages: [perdant],
  });
}
