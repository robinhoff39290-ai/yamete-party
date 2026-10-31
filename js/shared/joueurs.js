// Les 10 membres du groupe et leur emblème fixe (issu du drapeau).
// Pour modifier un nom affiché, change uniquement "nom". Ne touche pas à "id".
export const JOUEURS = [
  { id: 'robin',    nom: 'Robin',    embleme: 'robin',    symbole: 'Aigle' },
  { id: 'coco',     nom: 'Coco',     embleme: 'coco',     symbole: 'Cible' },
  { id: 'mathou',   nom: 'Mathou',   embleme: 'mathou',   symbole: 'Étoile' },
  { id: 'matraque', nom: 'Matraque', embleme: 'matraque', symbole: 'Matraque' },
  { id: 'lucas',    nom: 'Lucas',    embleme: 'lucas',    symbole: 'Manette' },
  { id: 'dylan',    nom: 'Dylan',    embleme: 'dylan',    symbole: 'Chat' },
  { id: 'louis',    nom: 'Louis',    embleme: 'louis',    symbole: 'Cigarette' },
  { id: 'cyprien',  nom: 'Cyprien',  embleme: 'cyprien',  symbole: 'Avion' },
  { id: 'dane',     nom: 'Dane',     embleme: 'dane',     symbole: 'Chope' },
  { id: 'leo',      nom: 'Léo',      embleme: 'leo',      symbole: 'Pistolet' },
];

export const PAR_ID = Object.fromEntries(JOUEURS.map(j => [j.id, j]));

export function nom(id) {
  return PAR_ID[id]?.nom ?? '???';
}

// URL absolue : une url() placée dans une variable CSS est sinon résolue depuis le dossier css/
export function emblemeUrl(id) {
  return new URL(`assets/emblemes/${PAR_ID[id]?.embleme ?? 'robin'}.png`, document.baseURI).href;
}

// Pastille emblème (HTML). taille : 'xs' | 's' | 'm' | 'l' | 'xl'
export function pastille(id, taille = 'm', extraClass = '') {
  return `<span class="emb emb-${taille} ${extraClass}" title="${nom(id)}"><i style="--src:url('${emblemeUrl(id)}')"></i></span>`;
}

// Emblème + nom
export function tag(id, taille = 's') {
  return `<span class="tag">${pastille(id, taille)}<b>${nom(id)}</b></span>`;
}
