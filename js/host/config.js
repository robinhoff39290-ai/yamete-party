// Réglages du jeu : points, gorgées, titres. Tout est modifiable ici.

export const NIVEAUX = {
  1: { nom: 'Tranquille les mecs', court: 'Niv. 1', multi: 1 },
  2: { nom: "J'assume", court: 'Niv. 2', multi: 1.5 },
  3: { nom: '3,5', court: 'Niv. 3', multi: 2 },
};

export const POINTS = {
  victoire: 3,         // gagnant d'une manche (avocat, meilleure vanne, piège réussi…)
  bonVote: 1,          // juré dans la majorité, bon flair à Mytho, bonne devinette au Roast
  incognito: 1,        // auteur de vanne non démasqué au Roast
  veriteIncroyable: 2, // vérité que personne n'a crue
  gageFait: 1,         // gage réalisé
  gagePasse: -2,       // droit de passer son tour
};

export const MANCHES = {
  tribunal:    { nom: 'Le Tribunal', icone: '⚖️', pitch: 'Un procès absurde, deux avocats, un jury sans pitié.', min: 3 },
  susceptible: { nom: 'Qui est le plus susceptible de…', court: 'Le plus susceptible', icone: '👉', pitch: 'Vote secret. Les désignés se justifient.', min: 3 },
  roast:       { nom: 'Le Roast Aveugle', icone: '🔥', pitch: 'Vannes anonymes sur une victime. Elle doit deviner qui a écrit quoi.', min: 3 },
  pirequeca:   { nom: 'Pire Que Ça', icone: '🤢', pitch: 'Un dilemme dégueulasse. Invente une option encore pire.', min: 3 },
  mytho:       { nom: 'Mytho ou Pas Mytho', icone: '🤥', pitch: 'Une histoire perso. Vérité ou gros mytho ?', min: 3 },
};

// Titres permanents : attribués au leader de chaque statistique (cumul toutes soirées)
export const TITRES = [
  { stat: 'mytho_piege',      titre: "Menteur de l'année" },
  { stat: 'tribunal_gagne',   titre: 'Avocat du Diable' },
  { stat: 'roast_meilleure',  titre: 'Langue de Vipère' },
  { stat: 'designe',          titre: 'Suspect n°1' },
  { stat: 'pqc_gagne',        titre: 'Esprit Malade' },
  { stat: 'gages_faits',      titre: 'Kamikaze' },
  { stat: 'gages_passes',     titre: 'Petite Nature' },
  { stat: 'hof',              titre: 'Plume Empoisonnée' },
  { stat: 'mytho_demasque',   titre: 'Pinocchio Grillé' },
  { stat: 'verite_confirmee', titre: 'Casier Chargé' },
  { stat: 'mytho_flair',      titre: 'Détecteur de Mythos' },
  { stat: 'coupable',         titre: 'Repris de Justice' },
  { stat: 'gorgees',          titre: 'Éponge Officielle' },
  { stat: 'roast_victime',    titre: 'Punching-Ball' },
];

// Titres du soir (affichés au bilan de fin de soirée)
export const TITRES_SOIR = [
  { stat: 'roast_meilleure', titre: 'Roi du Roast du soir' },
  { stat: 'mytho_piege',     titre: 'Mytho du soir' },
  { stat: 'designe',         titre: 'Cible du soir' },
  { stat: 'tribunal_gagne',  titre: 'Ténor du barreau' },
  { stat: 'pqc_gagne',       titre: 'Cerveau malade du soir' },
  { stat: 'gages_faits',     titre: 'Kamikaze du soir' },
  { stat: 'gages_passes',    titre: 'Petite nature du soir' },
  { stat: 'hof',             titre: 'Plume du soir' },
];

// Grades selon les points cumulés
export const GRADES = [
  { min: -999, titre: 'Boulet Officiel' },
  { min: 0,    titre: 'Bleu' },
  { min: 15,   titre: 'Stagiaire du Chambrage' },
  { min: 40,   titre: 'Chambreur Confirmé' },
  { min: 80,   titre: 'Légende du Canap\'' },
  { min: 150,  titre: 'Parrain du Groupe' },
  { min: 300,  titre: 'Dieu Vivant de la Vanne' },
];

export const LIBELLES_STATS = {
  tribunal_gagne: 'Procès gagnés', tribunal_perdu: 'Procès perdus', coupable: 'Fois reconnu coupable',
  designe: 'Votes « susceptible » reçus', designe_top: 'Fois désigné n°1',
  roast_victime: 'Fois roasté', roast_meilleure: 'Meilleures vannes', roast_devine: 'Auteurs démasqués', roast_incognito: 'Vannes restées anonymes',
  pqc_gagne: 'Pire Que Ça gagnés',
  mytho_piege: 'Mythos gobés par le groupe', mytho_demasque: 'Mythos démasqués', verite_confirmee: 'Hontes confirmées', mytho_flair: 'Bons flairs',
  gages_faits: 'Gages réalisés', gages_passes: 'Tours passés', gorgees: 'Gorgées bues', hof: 'Vannes au Hall of Fame',
  manches: 'Manches jouées',
};

export function grade(points) {
  let g = GRADES[0].titre;
  for (const x of GRADES) if (points >= x.min) g = x.titre;
  return g;
}
