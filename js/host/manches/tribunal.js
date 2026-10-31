import { pastille, nom, tag } from '../../shared/joueurs.js';
import { esc, shuffle, pick, uid } from '../../shared/util.js';
import { etape, enTete, chrono, collecter } from '../ui.js';
import { db, sauver, stat, soiree } from '../db.js';
import { POINTS, MANCHES } from '../config.js';
import { tirerBrut, remplir, balises } from '../contenu.js';
import { bilan } from '../sanctions.js';

const M = MANCHES.tribunal;

export default async function tribunal(J) {
  const presents = J.presents();
  const affaire = tirerBrut('tribunal', J.niveau());
  const [avocatA, avocatB] = shuffle(presents);
  const jures = presents.filter(p => p !== avocatA && p !== avocatB);

  let defenseur, procureur, accuse = null, contreEmploi = [];
  let texte;

  if (affaire.type === 'accusation') {
    const b = balises([affaire.texte], presents);
    accuse = b.A;
    texte = remplir(affaire.texte, Object.fromEntries(Object.entries(b).map(([k, v]) => [k, nom(v)])));
    [defenseur, procureur] = [avocatA, avocatB];
  } else {
    texte = affaire.texte;
  }

  await etape(`${enTete(M.icone, M.nom, 'Deux avocats tirés au sort. Un jury sans pitié.')}
    <div class="duo">
      <div class="duo-j">${pastille(avocatA, 'xl', 'pulse')}<b>${esc(nom(avocatA))}</b></div>
      <div class="duo-vs">VS</div>
      <div class="duo-j">${pastille(avocatB, 'xl', 'pulse')}<b>${esc(nom(avocatB))}</b></div>
    </div>
    <p class="centre muet">${jures.length} juré${jures.length > 1 ? 's' : ''} : ${jures.map(p => pastille(p, 's')).join(' ')}</p>`,
  [{ label: "Découvrir l'affaire", valeur: 'ok', style: 'primaire' }]);

  // Débat : opinion secrète puis contre-emploi éventuel
  if (affaire.type === 'debat') {
    const avis = await collecter(J, [avocatA, avocatB], () => ({
      kind: 'vote', titre: 'Avis secret', texte: `Sincèrement, tu es d'accord avec : « ${texte} » ?`,
      options: [{ id: 'pour', label: "👍 D'accord" }, { id: 'contre', label: "👎 Pas d'accord" }],
    }), `${enTete(M.icone, 'Avis secret des avocats', 'Ils répondent sur leur téléphone. Personne ne voit rien.')}
      <div class="carte verre affaire"><p>${esc(texte)}</p></div>`);
    const oA = avis.get(avocatA) || pick(['pour', 'contre']);
    const oB = avis.get(avocatB) || pick(['pour', 'contre']);
    const forcer = Math.random() < 0.45;
    if (oA !== oB) {
      // Opinions opposées : rôles naturels, ou tout inversé si contre-emploi
      const pourNaturel = oA === 'pour' ? avocatA : avocatB;
      const contreNaturel = pourNaturel === avocatA ? avocatB : avocatA;
      if (forcer) { defenseur = contreNaturel; procureur = pourNaturel; contreEmploi = [avocatA, avocatB]; }
      else { defenseur = pourNaturel; procureur = contreNaturel; }
    } else {
      // Même avis : l'un des deux défend forcément l'inverse
      [defenseur, procureur] = shuffle([avocatA, avocatB]);
      contreEmploi = [oA === 'pour' ? procureur : defenseur];
    }
  }

  const estAcc = affaire.type === 'accusation';
  const roleDef = estAcc ? `Défend ${accuse === defenseur ? 'sa propre peau' : esc(nom(accuse))}` : 'POUR';
  const roleProc = estAcc ? 'Réclame la condamnation' : 'CONTRE';

  for (const pid of presents) {
    if (pid === defenseur || pid === procureur) {
      const ce = contreEmploi.includes(pid);
      J.reseau.ecran(pid, {
        kind: 'info',
        titre: pid === defenseur ? (estAcc ? '🛡️ Tu es la défense' : '🛡️ Tu défends : POUR') : (estAcc ? '⚔️ Tu es le procureur' : '⚔️ Tu attaques : CONTRE'),
        texte: (ce ? '⚠️ CONTRE-EMPLOI : tu penses l\'inverse, mais tu dois défendre ce camp à fond. Ça restera secret jusqu\'au verdict. ' : '') + texte,
        ton: ce ? 'alerte' : '',
      });
    } else {
      J.reseau.ecran(pid, { kind: 'wait', titre: '⚖️ Tu es juré', texte: 'Écoute les plaidoiries. Tu voteras sur ton téléphone.' });
    }
  }

  const carteAffaire = `<div class="carte verre affaire">
      <p class="etiquette">${estAcc ? 'Acte d\'accusation' : 'Le tribunal doit trancher'}</p>
      <p>${esc(texte)}</p>
    </div>
    <div class="roles">
      <div class="role">${tag(defenseur, 'm')}<span class="badge mint">🛡️ Défense · ${roleDef}</span></div>
      <div class="role">${tag(procureur, 'm')}<span class="badge orchid">⚔️ Procureur · ${roleProc}</span></div>
    </div>`;

  await etape(`${enTete(M.icone, 'L\'affaire')}${carteAffaire}
    ${contreEmploi.length ? '<p class="centre accent">⚠️ Au moins un avocat est peut-être en contre-emploi. Verdict pour le savoir.</p>' : ''}`,
  [{ label: 'Place au procureur', valeur: 'ok', style: 'primaire' }]);

  const duree = db.reglages.dureePlaidoirie || 60;
  await chrono(duree, `${enTete('⚔️', `Réquisitoire de ${esc(nom(procureur))}`, esc(texte))}<div class="centre">${pastille(procureur, 'xl')}</div>`, 'Fin du réquisitoire');
  await chrono(duree, `${enTete('🛡️', `Plaidoirie de ${esc(nom(defenseur))}`, esc(texte))}<div class="centre">${pastille(defenseur, 'xl')}</div>`, 'Fin de la plaidoirie');
  J.reseau.ecranTous([defenseur, procureur], { kind: 'wait', titre: 'Le jury délibère', texte: 'Prie.' });

  const optDef = estAcc ? '🛡️ Innocent' : `🛡️ POUR (${nom(defenseur)})`;
  const optProc = estAcc ? '⚔️ Coupable' : `⚔️ CONTRE (${nom(procureur)})`;
  const votes = await collecter(J, jures, () => ({
    kind: 'vote', titre: 'Ton verdict', texte: estAcc ? `${nom(accuse)} est-il coupable ?` : 'Qui a été le plus convaincant ?',
    options: [{ id: 'def', label: optDef }, { id: 'proc', label: optProc }],
  }), `${enTete(M.icone, 'Le jury délibère')}${carteAffaire}`);

  const pourDef = [...votes].filter(([, v]) => v === 'def').map(([p]) => p);
  const pourProc = [...votes].filter(([, v]) => v === 'proc').map(([p]) => p);
  let gagnant = null, perdant = null;
  if (pourDef.length > pourProc.length) { gagnant = defenseur; perdant = procureur; }
  else if (pourProc.length > pourDef.length) { gagnant = procureur; perdant = defenseur; }

  let verdict;
  if (!gagnant) verdict = 'JURY PENDU';
  else if (estAcc) verdict = gagnant === procureur ? 'COUPABLE' : 'ACQUITTÉ';
  else verdict = gagnant === defenseur ? 'THÈSE ADOPTÉE' : 'THÈSE REJETÉE';

  db.verdicts.push({
    id: uid(8), date: Date.now(), soireeId: soiree()?.id, type: affaire.type, texte,
    accuse, defenseur, procureur, verdict, votes: { def: pourDef.length, proc: pourProc.length }, contreEmploi,
  });
  sauver();
  if (estAcc && verdict === 'COUPABLE') stat(accuse, 'coupable');

  await etape(`${enTete(M.icone, 'Verdict')}
    <div class="verdict">
      <div class="tampon ${gagnant === procureur ? 'rouge' : gagnant ? 'vert' : ''}">${verdict}</div>
      <div class="decompte">
        <div><b>${pourDef.length}</b><span>${estAcc ? 'Innocent' : 'Pour'}</span><div class="mini">${pourDef.map(p => pastille(p, 'xs')).join('')}</div></div>
        <div><b>${pourProc.length}</b><span>${estAcc ? 'Coupable' : 'Contre'}</span><div class="mini">${pourProc.map(p => pastille(p, 'xs')).join('')}</div></div>
      </div>
      ${contreEmploi.length ? `<p class="revelation">🎭 Révélation : ${contreEmploi.map(p => `<b>${esc(nom(p))}</b>`).join(' et ')} ${contreEmploi.length > 1 ? 'plaidaient' : 'plaidait'} le contraire de ${contreEmploi.length > 1 ? 'leur' : 'son'} avis.</p>` : ''}
    </div>`, [{ label: 'Sentence', valeur: 'ok', style: 'primaire' }]);

  const points = [];
  const gorgees = [];
  let gages = [];
  if (gagnant) {
    stat(gagnant, 'tribunal_gagne');
    stat(perdant, 'tribunal_perdu');
    points.push({ pid: gagnant, n: POINTS.victoire, raison: 'procès gagné' });
    const majorite = gagnant === defenseur ? pourDef : pourProc;
    const minorite = gagnant === defenseur ? pourProc : pourDef;
    majorite.forEach(p => points.push({ pid: p, n: POINTS.bonVote, raison: 'juré dans la majorité' }));
    gorgees.push({ pid: perdant, n: 3, raison: 'procès perdu' });
    minorite.forEach(p => gorgees.push({ pid: p, n: 1, raison: `a voté pour ${nom(perdant)}` }));
    gages = [perdant];
  } else {
    gorgees.push({ pid: defenseur, n: 2, raison: 'jury pendu' }, { pid: procureur, n: 2, raison: 'jury pendu' });
    gages = [pick([defenseur, procureur])];
  }
  await bilan(J, { titre: `Sentence : ${verdict.toLowerCase()}`, points, gorgees, gages });
}
