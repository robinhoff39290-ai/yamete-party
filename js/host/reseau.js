// Connexion des téléphones-manettes en direct (WebRTC via PeerJS, gratuit).
// L'ordinateur est l'hôte : il garde tout l'état. Les téléphones affichent
// simplement l'écran que l'hôte leur envoie et renvoient leurs réponses.
import { uid } from '../shared/util.js';

export const PREFIXE = 'yamete-party-';
const LETTRES = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export function optionsPeer() {
  // Paramètres de test locaux : ?peerhost=localhost&peerport=9000
  const p = new URLSearchParams(location.search);
  const o = { debug: 1 };
  if (p.get('peerhost')) {
    o.host = p.get('peerhost');
    o.port = Number(p.get('peerport') || 9000);
    o.path = p.get('peerpath') || '/';
    o.secure = p.get('peersecure') === '1';
  }
  return o;
}

function nouveauCode() {
  let c = '';
  for (let i = 0; i < 4; i++) c += LETTRES[Math.floor(Math.random() * LETTRES.length)];
  return c;
}

export class Reseau {
  constructor() {
    this.peer = null;
    this.code = null;
    this.etat = 'hors-ligne';
    this.cnx = new Map();        // conn.connectionId -> { conn, pid, device }
    this.parJoueur = new Map();  // pid -> conn
    this.ecrans = new Map();     // pid -> écran courant
    this.attentes = new Map();   // rid -> { pid -> callback }
    this.presents = () => [];
    this.surChangement = () => {};
    this.surEtat = () => {};
  }

  demarrer(codeSouhaite) {
    return new Promise((resolve) => {
      const essayer = (code, essais) => {
        this.code = code;
        const peer = new window.Peer(PREFIXE + code, optionsPeer());
        let ouvert = false;
        peer.on('open', () => {
          ouvert = true;
          this.peer = peer;
          this.majEtat('en-ligne');
          resolve(code);
        });
        peer.on('connection', conn => this.accueillir(conn));
        peer.on('disconnected', () => {
          this.majEtat('reconnexion');
          setTimeout(() => { try { peer.reconnect(); } catch (e) { /* ignore */ } }, 1500);
        });
        peer.on('error', err => {
          console.warn('PeerJS', err.type, err);
          if (!ouvert && err.type === 'unavailable-id' && essais < 5) {
            peer.destroy();
            essayer(nouveauCode(), essais + 1);
          } else if (!ouvert && essais < 5 && ['network', 'server-error', 'socket-error', 'socket-closed'].includes(err.type)) {
            peer.destroy();
            this.majEtat('reconnexion');
            setTimeout(() => essayer(code, essais + 1), 2500);
          } else if (!ouvert) {
            this.majEtat('erreur');
            resolve(null);
          }
        });
        peer.on('open', () => {
          if (this.etat !== 'en-ligne') this.majEtat('en-ligne');
        });
      };
      essayer(codeSouhaite || nouveauCode(), 0);
    });
  }

  majEtat(e) {
    this.etat = e;
    this.surEtat(e);
  }

  accueillir(conn) {
    const info = { conn, pid: null, device: null };
    conn.on('open', () => {
      this.cnx.set(conn.connectionId, info);
    });
    conn.on('data', msg => this.recevoir(info, msg));
    conn.on('close', () => this.fermer(info));
    conn.on('error', () => this.fermer(info));
  }

  fermer(info) {
    this.cnx.delete(info.conn.connectionId);
    if (info.pid && this.parJoueur.get(info.pid) === info.conn) {
      this.parJoueur.delete(info.pid);
      this.surChangement();
    }
  }

  roster() {
    return this.presents().map(id => ({ id, pris: this.parJoueur.has(id) }));
  }

  envoyerRoster() {
    for (const info of this.cnx.values()) {
      if (!info.pid) this.envoyerConn(info.conn, { t: 'roster', joueurs: this.roster() });
    }
  }

  recevoir(info, msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'hello') {
      info.device = msg.device;
      if (msg.pid && this.presents().includes(msg.pid)) {
        this.attribuer(info, msg.pid);
      } else {
        this.envoyerConn(info.conn, { t: 'roster', joueurs: this.roster() });
      }
    } else if (msg.t === 'claim') {
      if (this.presents().includes(msg.pid)) this.attribuer(info, msg.pid);
      else this.envoyerConn(info.conn, { t: 'roster', joueurs: this.roster() });
    } else if (msg.t === 'quitter') {
      if (info.pid && this.parJoueur.get(info.pid) === info.conn) this.parJoueur.delete(info.pid);
      info.pid = null;
      this.envoyerConn(info.conn, { t: 'roster', joueurs: this.roster() });
      this.envoyerRoster();
      this.surChangement();
    } else if (msg.t === 'answer' && info.pid) {
      const att = this.attentes.get(msg.rid);
      const cb = att?.get(info.pid);
      if (cb) cb(msg.value);
    }
  }

  attribuer(info, pid) {
    const ancien = this.parJoueur.get(pid);
    if (ancien && ancien !== info.conn) {
      this.envoyerConn(ancien, { t: 'kick', raison: 'Ce joueur a été repris sur un autre téléphone.' });
      const ai = this.cnx.get(ancien.connectionId);
      if (ai) ai.pid = null;
    }
    info.pid = pid;
    this.parJoueur.set(pid, info.conn);
    this.envoyerConn(info.conn, { t: 'welcome', pid });
    this.envoyerConn(info.conn, { t: 'screen', screen: this.ecrans.get(pid) || ecranAttente() });
    this.envoyerRoster();
    this.surChangement();
  }

  connecte(pid) {
    return this.parJoueur.has(pid);
  }

  envoyerConn(conn, msg) {
    try { if (conn.open) conn.send(msg); } catch (e) { console.warn(e); }
  }

  ecran(pid, screen) {
    this.ecrans.set(pid, screen);
    const c = this.parJoueur.get(pid);
    if (c) this.envoyerConn(c, { t: 'screen', screen });
  }

  ecranTous(pids, screenOuFn) {
    for (const pid of pids) this.ecran(pid, typeof screenOuFn === 'function' ? screenOuFn(pid) : screenOuFn);
  }

  // Envoie un écran interactif et appelle cb(pid, valeur) à chaque réponse.
  demander(pid, screen, cb) {
    const rid = screen.rid || uid(6);
    screen.rid = rid;
    if (!this.attentes.has(rid)) this.attentes.set(rid, new Map());
    this.attentes.get(rid).set(pid, v => cb(pid, v));
    this.ecran(pid, screen);
    return rid;
  }

  annuler(rid) {
    this.attentes.delete(rid);
  }

  deconnecterAbsents() {
    for (const [pid, conn] of this.parJoueur) {
      if (!this.presents().includes(pid)) {
        this.envoyerConn(conn, { t: 'kick', raison: "Tu n'es plus coché comme présent." });
        this.parJoueur.delete(pid);
      }
    }
    this.envoyerRoster();
    this.surChangement();
  }

  arreter() {
    for (const info of this.cnx.values()) this.envoyerConn(info.conn, { t: 'kick', raison: 'La soirée est terminée. Merci d\'avoir joué.' });
    setTimeout(() => { try { this.peer?.destroy(); } catch (e) { /* ignore */ } }, 400);
    this.peer = null;
    this.cnx.clear();
    this.parJoueur.clear();
    this.ecrans.clear();
    this.attentes.clear();
    this.majEtat('hors-ligne');
  }
}

export function ecranAttente(titre = 'Regarde la télé', texte = 'La prochaine manche arrive.') {
  return { kind: 'wait', titre, texte };
}
