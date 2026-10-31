// =====================================================================
//  LE TRIBUNAL : affaires à juger
// ---------------------------------------------------------------------
//  type "accusation" : {A} est l'accusé (un joueur présent tiré au sort).
//                      Le défenseur plaide son innocence, le procureur
//                      réclame sa condamnation.
//  type "debat"      : une affirmation idiote. Le défenseur est POUR,
//                      le procureur est CONTRE. L'appli peut imposer à
//                      un avocat de défendre l'inverse de ce qu'il pense.
//  niveau : 1 = Tranquille les mecs · 2 = J'assume · 3 = 3,5
//  {A} et {B} sont remplacés par des joueurs présents (différents).
//  Pour ajouter une affaire : copie une ligne, change le texte. C'est tout.
// =====================================================================
export default [
  // ---------- Accusations ----------
  { niveau: 1, type: 'accusation', texte: "{A} est accusé d'avoir fait semblant de chercher son portefeuille pendant 12 minutes pour ne pas payer l'addition." },
  { niveau: 1, type: 'accusation', texte: "{A} est accusé d'avoir liké une photo de 2016 en stalkant son ex à 3 h du matin." },
  { niveau: 1, type: 'accusation', texte: "{A} est accusé d'avoir mis ses chaussettes de la veille « parce qu'elles sentaient encore à peu près bon »." },
  { niveau: 1, type: 'accusation', texte: "{A} est accusé d'avoir dit « je passe vite fait » et d'être resté jusqu'à 6 h." },
  { niveau: 1, type: 'accusation', texte: "{A} est accusé d'avoir vendu la mèche du dernier épisode à {B} par pure méchanceté." },
  { niveau: 1, type: 'accusation', texte: "{A} est accusé d'avoir répondu « tkt » à un message important et de n'avoir plus jamais donné de nouvelles." },
  { niveau: 1, type: 'accusation', texte: "{A} est accusé d'avoir mangé la dernière part sans demander, puis d'avoir accusé {B}." },
  { niveau: 1, type: 'accusation', texte: "{A} est accusé d'avoir une playlist « motivation » composée à 80 % de génériques de dessins animés." },
  { niveau: 1, type: 'accusation', texte: "{A} est accusé d'avoir pleuré devant un film d'animation et d'avoir prétendu avoir une poussière dans l'œil." },
  { niveau: 1, type: 'accusation', texte: "{A} est accusé d'avoir parlé de crypto à un repas de famille sans qu'on lui demande rien." },
  { niveau: 2, type: 'accusation', texte: "{A} est accusé d'avoir pissé sous la douche chez {B}. Plusieurs fois. En chantant." },
  { niveau: 2, type: 'accusation', texte: "{A} est accusé d'avoir lâché une caisse silencieuse dans l'ascenseur et d'avoir regardé {B} d'un air dégoûté." },
  { niveau: 2, type: 'accusation', texte: "{A} est accusé d'avoir dragué la mère de {B} à son anniversaire. Avec un succès relatif." },
  { niveau: 2, type: 'accusation', texte: "{A} est accusé d'avoir vomi dans un Uber et d'avoir mis 1 étoile au chauffeur." },
  { niveau: 2, type: 'accusation', texte: "{A} est accusé d'avoir un dossier caché nommé « Compta 2019 » qui ne contient aucune compta." },
  { niveau: 2, type: 'accusation', texte: "{A} est accusé d'avoir gardé le même caleçon trois jours en vacances « pour économiser la lessive »." },
  { niveau: 2, type: 'accusation', texte: "{A} est accusé d'avoir envoyé un vocal de 7 minutes bourré à son ex, dont 4 minutes de respiration." },
  { niveau: 2, type: 'accusation', texte: "{A} est accusé de s'être endormi en soirée et d'avoir laissé {B} lui dessiner un truc obscène sur le front sans jamais se venger." },
  { niveau: 2, type: 'accusation', texte: "{A} est accusé d'avoir fait croire à une intoxication alimentaire pour annuler un date qui ne lui plaisait pas." },
  { niveau: 2, type: 'accusation', texte: "{A} est accusé de se curer le nez au feu rouge en pensant que les vitres sont teintées." },
  { niveau: 2, type: 'accusation', texte: "{A} est accusé d'avoir utilisé la brosse à dents de {B}. Et de l'avoir reposée humide." },
  { niveau: 2, type: 'accusation', texte: "{A} est accusé d'avoir un compte Tinder actif avec des photos de 2017 et 8 kilos de moins." },
  { niveau: 3, type: 'accusation', texte: "{A} est accusé d'avoir couché avec quelqu'un uniquement parce qu'il avait la clim." },
  { niveau: 3, type: 'accusation', texte: "{A} est accusé d'avoir confondu le prénom de sa conquête au pire moment possible. Il a crié celui de {B}." },
  { niveau: 3, type: 'accusation', texte: "{A} est accusé d'avoir chié chez {B}, bouché les toilettes et d'être parti sans rien dire." },
  { niveau: 3, type: 'accusation', texte: "{A} est accusé d'avoir sniffé le slip qu'il comptait remettre « juste pour vérifier »." },
  { niveau: 3, type: 'accusation', texte: "{A} est accusé d'avoir un historique de recherche qui justifierait une perquisition." },
  { niveau: 3, type: 'accusation', texte: "{A} est accusé d'avoir simulé un orgasme. Le sien. Pour finir plus vite." },
  { niveau: 3, type: 'accusation', texte: "{A} est accusé d'avoir dormi dans sa propre gerbe et d'avoir dit le lendemain que c'était « un oreiller bizarre »." },
  { niveau: 3, type: 'accusation', texte: "{A} est accusé d'avoir pécho l'ex de {B} et de lui avoir demandé des conseils après." },
  { niveau: 3, type: 'accusation', texte: "{A} est accusé de s'essuyer debout. Le jury doit savoir." },
  { niveau: 3, type: 'accusation', texte: "{A} est accusé d'avoir été surpris en pleine action solitaire par sa grand-mère et d'avoir prétendu chercher une télécommande." },
  { niveau: 3, type: 'accusation', texte: "{A} est accusé d'avoir mis la main dans le slip de {B} pendant son sommeil « pour voir s'il dormait vraiment »." },
  { niveau: 3, type: 'accusation', texte: "{A} est accusé d'avoir pissé dans une bouteille en voiture et de l'avoir remise dans la portière de {B}." },

  // ---------- Débats idiots ----------
  { niveau: 1, type: 'debat', texte: "Les chaussettes dans des claquettes, c'est la classe absolue." },
  { niveau: 1, type: 'debat', texte: "La pizza à l'ananas mérite le respect." },
  { niveau: 1, type: 'debat', texte: "Un homme qui met du parfum pour aller à la salle est un homme suspect." },
  { niveau: 1, type: 'debat', texte: "Les pigeons sont des drones du gouvernement." },
  { niveau: 1, type: 'debat', texte: "Mettre un pyjama assorti à 30 ans, c'est la maturité." },
  { niveau: 1, type: 'debat', texte: "Manger des céréales le soir, c'est un vrai dîner." },
  { niveau: 1, type: 'debat', texte: "Dire « bon appétit » au boulot, c'est un manque d'éducation." },
  { niveau: 1, type: 'debat', texte: "Les gens qui applaudissent quand l'avion atterrit devraient être interdits de vol." },
  { niveau: 2, type: 'debat', texte: "Se faire masser les pieds par un pote, ce n'est pas gay, c'est de l'entraide." },
  { niveau: 2, type: 'debat', texte: "Péter devant sa copine au bout d'un mois, c'est une preuve d'amour." },
  { niveau: 2, type: 'debat', texte: "Pisser sous la douche est un geste écologique et devrait être encouragé par l'État." },
  { niveau: 2, type: 'debat', texte: "Se raser les jambes quand on est un mec, c'est l'avenir." },
  { niveau: 2, type: 'debat', texte: "Le slip est supérieur au caleçon. Point." },
  { niveau: 2, type: 'debat', texte: "Lire les messages de son pote quand il est aux toilettes, c'est un droit." },
  { niveau: 2, type: 'debat', texte: "Rester ami avec son ex, c'est garder une roue de secours." },
  { niveau: 3, type: 'debat', texte: "Se renifler les doigts après s'être gratté, c'est un plaisir simple et légitime." },
  { niveau: 3, type: 'debat', texte: "On peut juger un homme à l'odeur de ses chaussettes." },
  { niveau: 3, type: 'debat', texte: "Le premier date devrait toujours se finir au lit, sinon c'est une perte de temps." },
  { niveau: 3, type: 'debat', texte: "Sentir son propre pet sous la couette, c'est réconfortant." },
  { niveau: 3, type: 'debat', texte: "Un plan à trois avec deux potes du groupe, c'est la consécration de l'amitié." },
  { niveau: 3, type: 'debat', texte: "Avaler, c'est une question de politesse." },
];
