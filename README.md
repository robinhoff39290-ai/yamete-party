# Yamete Party

Le jeu de soirée du groupe. Appli web gratuite, rien à installer.
L'ordinateur branché sur la télé sert d'écran principal, les téléphones servent de manettes.

## Lancer une soirée

1. Sur l'ordinateur branché en HDMI, ouvre l'URL du jeu (GitHub Pages) dans Chrome, Edge ou Firefox, puis passe en plein écran (F11).
2. **Nouvelle soirée** : coche les présents, choisis Solo ou Équipes, Sobre ou Arrosé, et l'intensité.
3. **Ouvrir la salle** : chacun scanne le QR code (ou tape le code à 4 lettres) et touche son emblème.
4. **C'est parti** : lance une manche au hasard ou choisis-la.
5. **Terminer la soirée** (en haut à droite) affiche le bilan et enregistre tout.

Raccourcis sur l'ordinateur : `Entrée` ou `Espace` pour avancer, `H` pour ajouter une vanne au Hall of Fame.

## Les manches

| Manche | Principe | Mode Arrosé | Mode Sobre |
|---|---|---|---|
| Le Tribunal | Accusation absurde ou débat idiot. Défenseur et procureur tirés au sort, 1 min chacun. Contre-emploi possible (révélé au verdict). Le jury vote. | Le perdant boit 3, ceux qui ont voté pour lui boivent 1 | Pari Débile pour le perdant |
| Qui est le plus susceptible de… | Vote secret pour un présent. Les désignés se justifient. | Chacun boit autant que les votes reçus | Pari Débile si majorité absolue |
| Le Roast Aveugle | Vannes anonymes sur une victime. Elle devine qui a écrit quoi, puis le groupe élit la pire. | La victime boit autant que les votes de la pire vanne, les auteurs grillés boivent 1 | Pari Débile pour la victime si elle rate son enquête, sinon pour la vanne la plus nulle |
| Pire Que Ça | Dilemme dégueulasse, chacun invente une option C encore pire, vote. | Le gagnant distribue, la proposition la plus soft boit 2 | Pari Débile pour la plus soft |
| Mytho ou Pas Mytho | Question perso. Le conteur choisit en secret vérité ou mytho (ou laisse l'appli décider), raconte, le groupe vote. | Démasqué : boit 3. Piège réussi : distribue | Démasqué : Pari Débile. Piège réussi : il donne un Pari Débile à l'un de ceux qui l'ont cru |

Les gorgées sont multipliées selon l'intensité (×1, ×1,5, ×2). Le bouton **Pause** coupe le mode Arrosé à tout moment.
Au Pari Débile, on peut toujours **passer son tour** (−2 pts).

## Ajouter du contenu

Tout le contenu est dans le dossier `contenu/`, un fichier par manche. Pour ajouter une ligne, copie une ligne existante et change le texte.

| Fichier | Contenu |
|---|---|
| `contenu/tribunal.js` | Accusations (`{A}` = l'accusé) et débats |
| `contenu/susceptible.js` | Situations « Qui est le plus susceptible de… » |
| `contenu/dilemmes.js` | Dilemmes de Pire Que Ça |
| `contenu/mytho.js` | Questions perso |
| `contenu/gages.js` | Paris Débiles (`{X}` = un autre joueur présent) |
| `contenu/chambrage.js` | Phrases de chambrage, thèmes de roast, noms d'équipes |

`niveau` : 1 = Tranquille les mecs, 2 = J'assume, 3 = 3,5. Un niveau inclut les niveaux inférieurs.
Les balises `{A}`, `{B}`, `{X}` sont remplacées uniquement par des joueurs **présents**.
Chaque texte est entre guillemets droits `"…"`. À l'intérieur d'un texte, utilise `« »` plutôt que des guillemets droits.

Points, titres et grades se règlent dans `js/host/config.js`.

## Sauvegarde

Les données (classement, profils, Hall of Fame, verdicts, stats) sont stockées dans le navigateur de l'ordinateur de soirée.

- Utilise toujours **le même ordinateur et le même navigateur**.
- Télécharge une sauvegarde après chaque soirée (bouton sur le bilan ou dans Réglages). Elle permet de restaurer les données ou de changer d'ordinateur (Réglages, Importer).
- Vider l'historique « données de site » du navigateur efface les données : garde tes sauvegardes.

## Connexion des téléphones

La connexion passe en direct entre l'ordinateur et les téléphones (WebRTC, via le service gratuit PeerJS pour la mise en relation). Il faut Internet sur l'ordinateur et les téléphones. Le même Wi-Fi est idéal, la 4G/5G fonctionne aussi.

Si un téléphone se met en veille, il se reconnecte tout seul en revenant sur la page. Un joueur sans téléphone connecté est ignoré dans les votes (bouton « Continuer sans les retardataires »).

## Hébergement (GitHub Pages)

1. Pousse ce dossier sur un dépôt GitHub.
2. Sur GitHub : Settings, Pages, Source « Deploy from a branch », branche `main`, dossier `/ (root)`.
3. L'appli est en ligne à `https://<pseudo>.github.io/<depot>/` en une à deux minutes.

## Tester en local

```bash
python3 -m http.server 8080
```

Puis ouvre `http://localhost:8080`. Les téléphones doivent être sur le même réseau et utiliser l'adresse IP de l'ordinateur.

## Structure

```
index.html          écran principal (télé)
manette.html        manette (téléphone)
contenu/            textes du jeu, faciles à enrichir
js/host/            logique de l'écran principal, manches, sauvegarde
js/manette/         logique des téléphones
js/shared/          joueurs, emblèmes, utilitaires
assets/emblemes/    les 10 emblèmes extraits du drapeau
vendor/             PeerJS et générateur de QR code (copies locales)
```
