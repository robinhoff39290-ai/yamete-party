import { pastille, nom, tag } from '../../shared/joueurs.js';
import { esc, shuffle, pick } from '../../shared/util.js';
import { etape, enTete, collecter } from '../ui.js';
import { stat } from '../db.js';
import { POINTS, MANCHES } from '../config.js';
import { bilan } from '../sanctions.js';
import { THEMES_ROAST } from '../../../contenu/chambrage.js';

const M = MANCHES.roast;

export default async function roast(J) {
  const presents = J.presents();
  J.memo.roast = J.memo.roast || [];
  const jamais = presents.filter(p => !J.memo.roast.includes(p));
  const victime = pick(jamais.length ? jamais : presents);
  J.memo.roast.push(victime);
  const auteurs = presents.filter(p => p !== victime);
  const theme = Math.random() < 0.5 ? pick(THEMES_ROAST) : null;
  stat(victime, 'roast_victime');

  await etape(`${enTete(M.icone, M.nom, 'La victime du jour est…')}
    <div class="victime">${pastille(victime, 'xxl', 'pulse')}<h2>${esc(nom(victime))}</h2>
    ${theme ? `<p class="badge orchid grand">Thème imposé : ${esc(theme)}</p>` : '<p class="muet">Thème libre. Lâchez-vous.</p>'}</div>`,
  [{ label: 'Écrire les vannes', valeur: 'ok', style: 'primaire' }]);

  J.reseau.ecran(victime, { kind: 'wait', titre: '🔥 Tu es la victime', texte: 'Ils écrivent des horreurs sur toi. Prépare-toi à deviner qui a écrit quoi.' });
  const ecrits = await collecter(J, auteurs, () => ({
    kind: 'text', titre: `Ta vanne sur ${nom(victime)}`,
    texte: theme ? `Thème : ${theme}. Reste anonyme : n'écris pas comme d'habitude.` : 'Anonyme. Sans pitié. Une ou deux phrases.',
    placeholder: `${nom(victime)} est tellement…`, max: 220,
  }), `${enTete(M.icone, `Roast de ${esc(nom(victime))}`, theme ? `Thème : ${esc(theme)}` : 'Thème libre')}
    <div class="centre">${pastille(victime, 'xl')}</div>`);

  const vannes = shuffle([...ecrits].filter(([, t]) => String(t || '').trim()).map(([auteur, t]) => ({ auteur, texte: String(t).trim() })))
    .map((v, i) => ({ ...v, id: String(i + 1) }));
  if (vannes.length < 2) {
    await etape(`<div class="carte verre centre"><h2>Pas assez de vannes.</h2><p>Il en faut au moins deux. Manche annulée, bande de lâches.</p></div>`);
    return;
  }

  // Révélation une par une
  for (let i = 0; i < vannes.length; i++) {
    await etape(`${enTete(M.icone, `Vannes sur ${esc(nom(victime))}`, `${i + 1} / ${vannes.length}`)}
      <div class="vannes">${vannes.slice(0, i + 1).map((v, k) => `
        <div class="vanne verre ${k === i ? 'nouvelle' : 'ancienne'}"><span class="num">#${v.id}</span><p>${esc(v.texte)}</p></div>`).join('')}</div>`,
    [{ label: i < vannes.length - 1 ? 'Vanne suivante' : `${nom(victime)} devine !`, valeur: 'ok', style: 'primaire' }]);
  }

  // La victime devine les auteurs
  const ecrivains = vannes.map(v => v.auteur);
  const rep = await collecter(J, [victime], () => ({
    kind: 'guess', titre: 'Qui a écrit quoi ?',
    items: vannes.map(v => ({ id: v.id, texte: v.texte })),
    options: shuffle(ecrivains).map(p => ({ id: p, label: nom(p), pid: p })),
  }), `${enTete(M.icone, `${esc(nom(victime))} mène l'enquête`, 'Sur son téléphone : une vanne, un auteur.')}
    <div class="vannes compact">${vannes.map(v => `<div class="vanne verre"><span class="num">#${v.id}</span><p>${esc(v.texte)}</p></div>`).join('')}</div>`);
  const devine = rep.get(victime) || {};
  const justes = vannes.filter(v => devine[v.id] === v.auteur);

  await etape(`${enTete(M.icone, 'Les auteurs démasqués', `${justes.length} / ${vannes.length} bonnes réponses pour ${esc(nom(victime))}`)}
    <div class="vannes compact">${vannes.map((v, i) => {
      const ok = devine[v.id] === v.auteur;
      return `<div class="vanne verre revele ${ok ? 'juste' : 'faux'}" style="--i:${i}">
        <span class="num">#${v.id}</span><p>${esc(v.texte)}</p>
        <div class="auteur">${devine[v.id] ? `<span class="muet">Deviné : ${esc(nom(devine[v.id]))}</span>` : ''}
          <span class="vrai">${ok ? '✓' : '✕'} ${tag(v.auteur, 's')}</span></div></div>`;
    }).join('')}</div>`, [{ label: 'Voter pour la pire', valeur: 'ok', style: 'primaire' }]);

  // Vote pour la pire vanne
  const votes = await collecter(J, presents, pid => ({
    kind: 'vote', titre: 'La pire vanne ?', texte: 'Tu ne peux pas voter pour la tienne.',
    options: vannes.filter(v => v.auteur !== pid).map(v => ({ id: v.id, label: `#${v.id} · ${v.texte}` })),
  }), `${enTete(M.icone, 'Élection de la pire vanne')}
    <div class="vannes compact">${vannes.map(v => `<div class="vanne verre"><span class="num">#${v.id}</span><p>${esc(v.texte)}</p></div>`).join('')}</div>`);

  const compte = Object.fromEntries(vannes.map(v => [v.id, 0]));
  for (const v of votes.values()) if (v in compte) compte[v]++;
  const tri = [...vannes].sort((a, b) => compte[b.id] - compte[a.id]);
  const max = compte[tri[0].id];
  const gagnantes = tri.filter(v => compte[v.id] === max && max > 0);
  const min = compte[tri[tri.length - 1].id];
  const nulles = tri.filter(v => compte[v.id] === min);

  await etape(`${enTete(M.icone, 'Palmarès du Roast')}
    <div class="vannes compact">${tri.map((v, i) => `
      <div class="vanne verre ${gagnantes.includes(v) ? 'gagnante' : ''}" style="--i:${i}">
        <span class="num">${compte[v.id]} vote${compte[v.id] > 1 ? 's' : ''}</span><p>${esc(v.texte)}</p>
        <div class="auteur">${tag(v.auteur, 's')}
          <button class="btn mini hof-btn" data-hof-auteur="${v.auteur}" data-hof-texte="${esc(v.texte)}">★ Hall of Fame</button></div>
      </div>`).join('')}</div>`, [{ label: 'Bilan', valeur: 'ok', style: 'primaire' }], 'avec-hof');

  // Points et sanctions
  const points = [];
  justes.forEach(() => points.push({ pid: victime, n: POINTS.bonVote, raison: 'auteur démasqué' }));
  if (justes.length) stat(victime, 'roast_devine', justes.length);
  vannes.filter(v => !justes.includes(v)).forEach(v => {
    points.push({ pid: v.auteur, n: POINTS.incognito, raison: 'resté anonyme' });
    stat(v.auteur, 'roast_incognito');
  });
  gagnantes.forEach(v => {
    points.push({ pid: v.auteur, n: POINTS.victoire, raison: 'pire vanne' });
    stat(v.auteur, 'roast_meilleure');
  });
  const gorgees = [{ pid: victime, n: max, raison: 'votes de la pire vanne' }];
  justes.forEach(v => gorgees.push({ pid: v.auteur, n: 1, raison: 'grillé' }));
  const rate = justes.length < vannes.length / 2;
  const gages = rate ? [victime] : [pick(nulles).auteur];
  await bilan(J, {
    titre: `Roast de ${nom(victime)}`,
    texte: J.arrose() ? '' : (rate ? `${nom(victime)} a raté son enquête : Pari Débile.` : 'Enquête réussie : la vanne la plus nulle prend le Pari Débile.'),
    points, gorgees, gages,
  });
}
