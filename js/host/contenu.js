// Tirage du contenu (sans répétition tant que la réserve n'est pas épuisée).
import TRIBUNAL from '../../contenu/tribunal.js';
import SUSCEPTIBLE from '../../contenu/susceptible.js';
import DILEMMES from '../../contenu/dilemmes.js';
import MYTHO from '../../contenu/mytho.js';
import GAGES from '../../contenu/gages.js';
import { hash, shuffle } from '../shared/util.js';
import { dejaVu, marquerVu, oublierCategorie } from './db.js';

const SOURCES = { tribunal: TRIBUNAL, susceptible: SUSCEPTIBLE, dilemmes: DILEMMES, mytho: MYTHO, gages: GAGES };

function cle(item) {
  const { niveau, ...reste } = item;
  return hash(JSON.stringify(reste));
}

// Les éléments du niveau choisi sortent deux fois plus souvent que ceux des niveaux inférieurs.
export function tirerBrut(categorie, niveau, filtre = () => true) {
  const liste = SOURCES[categorie].filter(i => (i.niveau || 1) <= niveau && filtre(i));
  if (!liste.length) return null;
  const vus = dejaVu(categorie);
  let dispo = liste.filter(i => !vus.includes(cle(i)));
  if (!dispo.length) {
    oublierCategorie(categorie, liste.map(cle));
    dispo = liste;
  }
  const pond = dispo.flatMap(i => (i.niveau || 1) === niveau ? [i, i] : [i]);
  const choix = pond[Math.floor(Math.random() * pond.length)];
  marquerVu(categorie, cle(choix));
  return { ...choix };
}

// Remplace {A}, {B}, {X}, {J}… par les noms fournis
export function remplir(texte, valeurs) {
  return String(texte).replace(/\{(\w+)\}/g, (m, k) => (k in valeurs ? valeurs[k] : m));
}

// Associe des joueurs présents distincts aux balises présentes dans un texte
export function balises(textes, presents, exclure = []) {
  const tags = new Set();
  for (const t of textes) for (const m of String(t).matchAll(/\{([A-Z])\}/g)) tags.add(m[1]);
  let pool = shuffle(presents.filter(p => !exclure.includes(p)));
  if (pool.length < tags.size) pool = shuffle(presents);
  const res = {};
  [...tags].forEach((t, i) => { res[t] = pool[i % pool.length]; });
  return res;
}
