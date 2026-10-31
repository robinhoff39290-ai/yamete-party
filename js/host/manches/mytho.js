import { pastille, nom } from '../../shared/joueurs.js';
import { esc, pick } from '../../shared/util.js';
import { etape, enTete, collecter, chrono } from '../ui.js';
import { db, stat } from '../db.js';
import { POINTS, MANCHES } from '../config.js';
import { tirerBrut, remplir } from '../contenu.js';
import { bilan, pariDebile } from '../sanctions.js';
import { VERITE_CONFIRMEE } from '../../../contenu/chambrage.js';

const M = MANCHES.mytho;

export default async function mytho(J) {
  const presents = J.presents();
  J.memo.mytho = J.memo.mytho || [];
  const jamais = presents.filter(p => !J.memo.mytho.includes(p));
  const conteur = pick(jamais.length ? jamais : presents);
  J.memo.mytho.push(conteur);
  const juges = presents.filter(p => p !== conteur);
  const q = tirerBrut('mytho', J.niveau());

  const carte = `<div class="conteur">${pastille(conteur, 'xl', 'pulse')}<b>${esc(nom(conteur))}</b></div>
    <div class="carte verre question-geante"><p>${esc(q.texte)}</p></div>`;

  // Choix secret du conteur
  const choix = await collecter(J, [conteur], () => ({
    kind: 'vote', titre: 'Choix secret', texte: `« ${q.texte} »\nTu racontes une vraie histoire ou tu mytho ?`,
    options: [{ id: 'verite', label: '😇 Vérité' }, { id: 'mytho', label: '🤥 Gros mytho' }, { id: 'hasard', label: "🎲 L'appli décide" }],
  }), `${enTete(M.icone, M.nom, `${esc(nom(conteur))} choisit en secret : vérité ou mytho ?`)}${carte}`, {
    apresReponse: () => ({ kind: 'wait', titre: '…', texte: '' }),
  });
  let c = choix.get(conteur) || 'hasard';
  if (c === 'hasard') c = Math.random() < 0.5 ? 'verite' : 'mytho';
  J.reseau.ecran(conteur, {
    kind: 'info', ton: c === 'mytho' ? 'alerte' : 'bravo',
    titre: c === 'mytho' ? '🤥 Tu dois MYTHONNER' : '😇 Dis la VÉRITÉ',
    texte: c === 'mytho' ? `Invente une histoire crédible pour : « ${q.texte} »` : `Raconte ta vraie histoire pour : « ${q.texte} »`,
  });
  J.reseau.ecranTous(juges, { kind: 'wait', titre: `${nom(conteur)} raconte`, texte: 'Écoute bien. Tu voteras ensuite : vérité ou mytho ?' });

  await chrono(db.reglages.dureeRecit || 90, `${enTete(M.icone, `${esc(nom(conteur))} raconte…`)}${carte}`, 'Fin du récit');

  const votes = await collecter(J, juges, () => ({
    kind: 'vote', titre: 'Vérité ou mytho ?', texte: `${nom(conteur)} : « ${q.texte} »`,
    options: [{ id: 'verite', label: '😇 Vérité' }, { id: 'mytho', label: '🤥 Mytho' }],
  }), `${enTete(M.icone, 'Vérité ou mytho ?')}${carte}`);

  const croient = [...votes].filter(([, v]) => v === 'verite').map(([p]) => p);
  const doutent = [...votes].filter(([, v]) => v === 'mytho').map(([p]) => p);
  const crue = croient.length >= doutent.length; // égalité : avantage au conteur
  const bons = c === 'verite' ? croient : doutent;
  const trompes = c === 'verite' ? doutent : croient;

  await etape(`${enTete(M.icone, 'Le groupe a voté')}
    <div class="decompte large">
      <div><b>${croient.length}</b><span>😇 Vérité</span><div class="mini">${croient.map(p => pastille(p, 's')).join('')}</div></div>
      <div><b>${doutent.length}</b><span>🤥 Mytho</span><div class="mini">${doutent.map(p => pastille(p, 's')).join('')}</div></div>
    </div>`, [{ label: 'Révéler la vérité', valeur: 'ok', style: 'primaire' }]);

  let issue, texte;
  const points = bons.map(p => ({ pid: p, n: POINTS.bonVote, raison: 'bon flair' }));
  bons.forEach(p => stat(p, 'mytho_flair'));
  const gorgees = [];
  const distribue = [];
  let gages = [];
  let gageChoisi = false;

  if (c === 'mytho' && crue) {
    issue = 'piege';
    texte = `${nom(conteur)} a mytho et vous avez tout gobé.`;
    points.push({ pid: conteur, n: POINTS.victoire, raison: 'mytho gobé' });
    stat(conteur, 'mytho_piege');
    distribue.push({ pid: conteur, n: Math.max(1, trompes.length) });
    gageChoisi = trompes.length > 0;
  } else if (c === 'mytho') {
    issue = 'demasque';
    texte = `${nom(conteur)} est démasqué. Pinocchio, va.`;
    stat(conteur, 'mytho_demasque');
    gorgees.push({ pid: conteur, n: 3, raison: 'mytho démasqué' });
    gages = [conteur];
  } else if (crue) {
    issue = 'confirme';
    texte = remplir(pick(VERITE_CONFIRMEE), { J: nom(conteur) });
    stat(conteur, 'verite_confirmee');
    gorgees.push({ pid: conteur, n: 1, raison: 'pour la honte' });
    trompes.forEach(p => gorgees.push({ pid: p, n: 1, raison: 'mauvais flair' }));
  } else {
    issue = 'incroyable';
    texte = `C'était vrai. Personne n'y a cru. ${nom(conteur)} a une vie incroyable (ou pathétique).`;
    points.push({ pid: conteur, n: POINTS.veriteIncroyable, raison: 'vérité incroyable' });
    trompes.forEach(p => gorgees.push({ pid: p, n: 1, raison: 'mauvais flair' }));
  }

  await etape(`<div class="verdict">
      ${pastille(conteur, 'xl')}
      <div class="tampon ${c === 'mytho' ? 'rouge' : 'vert'}">${c === 'mytho' ? 'MYTHO !' : 'VÉRITÉ'}</div>
      <p class="annonce">${esc(texte)}</p>
    </div>`, [{ label: 'Bilan', valeur: 'ok', style: 'primaire' }]);

  await bilan(J, { titre: 'Mytho ou Pas Mytho', points, gorgees, distribue, gages });

  // Mode Sobre : celui qui a piégé tout le monde choisit qui prend un Pari Débile
  if (gageChoisi && !J.arrose()) {
    const choixCible = await collecter(J, [conteur], () => ({
      kind: 'vote', titre: 'Distribue un Pari Débile', texte: 'Choisis une victime parmi ceux qui t\'ont cru.',
      options: trompes.map(p => ({ id: p, label: nom(p), pid: p })),
    }), `${enTete('🎲', `${esc(nom(conteur))} distribue un Pari Débile`, 'à l\'un de ceux qui l\'ont cru')}
      <div class="centre">${trompes.map(p => pastille(p, 'l')).join(' ')}</div>`);
    await pariDebile(J, choixCible.get(conteur) || pick(trompes));
  }
  return issue;
}
