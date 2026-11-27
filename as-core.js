/* as-core.js v1.0 — noyau commun de « Mon AS » (élèves) et « Gestion AS » (professeur).
   Ce fichier est IDENTIQUE dans les deux applications (copie à garder synchronisée).
   Contenu : liste des activités, validation de la fiche d'inscription, format d'échange (QR code / tableur),
   rapprochement nom saisi par l'élève ↔ liste du portail Mes Apps EPS, dessin de la carte d'AS.
   100 % local : aucune donnée n'est envoyée sur Internet. */
(function (root) {
'use strict';

/* ---------- Configuration de l'AS (établissement, ville, saison, activités, logo) ----------
   Rien n'est écrit en dur pour un établissement : le professeur règle ces valeurs dans « Gestion AS » (Données → Réglages de l'AS),
   qui fabrique un lien « Mon AS » les transportant. Valeurs par défaut neutres tant que rien n'est réglé. */
const ACT_DEFAUT = ['Badminton', 'Basket', 'Cross', 'Danse', 'Escalade', 'Football', 'Futsal', 'Handball', 'Musculation', 'Natation', 'Tennis de table', 'Volley-ball'];
const LOGOS = { defaut: 'img/logo-app.png', rolland: 'img/logo-as.png' };   // logos fournis avec l'application (clé → fichier)
const saisonCourante = () => { const d = new Date(), y = d.getFullYear(); return d.getMonth() >= 7 ? y + '-' + (y + 1) : (y - 1) + '-' + y; };
let SAISON = saisonCourante(), ETAB = '', VILLE = '', LOGO = 'defaut', ACT_AS = ACT_DEFAUT.slice();

const norm = s => (s == null ? '' : String(s)).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const tc = s => String(s || '').toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).trim();
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
const oui = v => v ? 'Oui' : 'Non';
const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const txt = (s, n) => clean(s).replace(/[<>]/g, '').slice(0, n);
/* Nettoie une configuration venant d'un lien ou d'un fichier (jamais de confiance : textes courts, sans balises). */
/* Texte long (mentions légales) : retours à la ligne conservés, balises retirées, 1 500 caractères maximum. */
const longTxt = (s, n) => String(s == null ? '' : s).replace(/\r/g, '').replace(/<[^>]*>/g, '').replace(/[<>]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, n);
function cfgClean(c) {
  c = c && typeof c === 'object' ? c : {}; const o = {};
  const e = txt(c.etab, 80), v = txt(c.ville, 50), s = clean(c.saison), l = clean(c.logo);
  const a = Array.isArray(c.acts) ? [...new Set(c.acts.map(x => txt(x, 40)).filter(Boolean))].slice(0, 30) : [];
  const lg = {}; ['d', 'p', 'a'].forEach(k => { const t = longTxt(c.leg && c.leg[k], 1500); if (t) lg[k] = t; }); if (Object.keys(lg).length) o.leg = lg;
  if (e) o.etab = e; if (v) o.ville = v; if (/^\d{4}-\d{4}$/.test(s)) o.saison = s; if (a.length) o.acts = a; if (Object.prototype.hasOwnProperty.call(LOGOS, l)) o.logo = l;
  return o;
}
function setConfig(c) {
  c = cfgClean(c); ETAB = c.etab || ''; VILLE = c.ville || ''; SAISON = c.saison || saisonCourante(); LOGO = c.logo || 'defaut';
  ACT_AS = c.acts && c.acts.length ? c.acts : ACT_DEFAUT.slice(); return c;
}
const b64u = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = p => decodeURIComponent(escape(atob(String(p).replace(/-/g, '+').replace(/_/g, '/'))));
/* Paramètre d'adresse « ?cfg= » : réglages + lien de paiement (u, m) */
function cfgToParam(c, cotis) {
  const k = cfgClean(c), o = { e: k.etab, v: k.ville, s: k.saison, a: k.acts, l: k.logo, t: k.leg }; if (cotis && cotis.u) { o.u = cotis.u; if (cotis.m) o.m = cotis.m; }
  Object.keys(o).forEach(x => { if (o[x] == null) delete o[x]; }); return b64u(JSON.stringify(o));
}
function cfgFromParam(p) {
  const o = JSON.parse(unb64u(p)); return { cfg: cfgClean({ etab: o.e, ville: o.v, saison: o.s, acts: o.a, logo: o.l, leg: o.t }), cotis: { u: String(o.u || ''), m: String(o.m || '').slice(0, 30) } };
}

/* ---------- Dates ---------- */
const pad = n => String(n).padStart(2, '0');
function isoDate(v) {                       // 'AAAA-MM-JJ' | 'JJ/MM/AAAA' | série Excel → 'AAAA-MM-JJ' ou ''
  if (v == null || v === '') return '';
  if (typeof v === 'number' && v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10);
  const t = String(v).trim(); let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/.exec(t);
  return m ? m[3] + '-' + pad(m[2]) + '-' + pad(m[1]) : '';
}
const frDate = iso => { const i = isoDate(iso); return i ? i.split('-').reverse().join('/') : ''; };
const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

/* ---------- Contrôles de saisie ---------- */
const telOk = s => /^(?:\+33|0033|0)[\s.\-]?[1-9](?:[\s.\-]?\d{2}){4}$/.test(clean(s));
const mailOk = s => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean(s));
function naissanceOk(iso) {
  const i = isoDate(iso); if (!i) return false;
  const y = +i.slice(0, 4), n = new Date().getFullYear();
  const d = new Date(i + 'T12:00:00'); if (isNaN(d) || d.toISOString().slice(0, 10) !== i) return false;
  return y >= n - 30 && y <= n - 9;
}

/* ---------- Fiche d'inscription : éléments obligatoires ---------- */
function manques(f) {
  const m = [], need = (k, label, ok) => { if (!ok) m.push({ k, label }); };
  need('nom', 'Nom', clean(f.nom));
  need('prenom', 'Prénom', clean(f.prenom));
  need('classe', 'Classe', clean(f.classe));
  need('naissance', 'Date de naissance (valide)', naissanceOk(f.naissance));
  need('lieu', 'Lieu de naissance', clean(f.lieu));
  need('sexe', 'Sexe', f.sexe === 'F' || f.sexe === 'M');
  need('qualite', 'Qualité du responsable légal', clean(f.qualite));
  need('respNom', 'Nom et prénom du responsable légal', clean(f.respNom).length >= 3);
  need('tel', 'Téléphone du responsable (10 chiffres)', telOk(f.tel));
  need('mail', 'E-mail du responsable : format invalide (champ facultatif)', !clean(f.mail) || mailOk(f.mail));
  need('adresse', 'Adresse du responsable', clean(f.adresse).length >= 8);
  need('acts', 'Au moins une activité', Array.isArray(f.acts) && f.acts.length > 0);
  need('compet', 'Réponse « compétitions UNSS »', f.compet === '0' || f.compet === '1');
  need('handi', 'Réponse « sport partagé / handisport » (ou « je ne souhaite pas répondre »)', f.handi === '0' || f.handi === '1' || f.handi === '2');
  need('autor', 'Autorisation parentale cochée', f.autor === true);
  need('droitImage', 'Réponse « droit à l’image »', f.droitImage === '0' || f.droitImage === '1');
  need('consentDonnees', 'Données personnelles : lu et pris connaissance', f.consentDonnees === true);
  need('consentAssurance', 'Assurances : lu et pris connaissance', f.consentAssurance === true);
  need('sigEleve', 'Signature de l’élève', f.sigEleve);
  need('sigResp', 'Signature du responsable légal', f.sigResp);
  return m;
}

/* ---------- Données d'inscription (colonnes du tableur, sous l'application « inscription_as ») ----------
   ATTENTION à l'ordre : « Date_signature » doit rester la 1re clé (le portail s'en sert pour dater la saisie). */
const ACT_ID = 'inscription_as';
function actsFromString(s) { return String(s || '').split(/\s*;\s*/).map(clean).filter(Boolean); }
function sortActs(a) { return [...a].sort((x, y) => { const i = ACT_AS.indexOf(x), j = ACT_AS.indexOf(y); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j) || x.localeCompare(y, 'fr'); }); }
function toRecord(f, dateSig) {
  return {
    Date_signature: isoDate(dateSig) || today(),
    Naissance: isoDate(f.naissance),
    Lieu_naissance: tc(clean(f.lieu)),
    Sexe: f.sexe === 'M' ? 'Garçon' : 'Fille',
    Qualite_responsable: clean(f.qualite),
    Nom_responsable: clean(f.respNom),
    Telephone_responsable: clean(f.tel).replace(/[^\d+]/g, ''),
    Mail_responsable: clean(f.mail).toLowerCase(),
    Activites: sortActs(f.acts || []).join(' ; '),
    Competitions_UNSS: oui(f.compet === '1'),
    Sport_partage: f.handi === '2' ? 'Ne souhaite pas répondre' : oui(f.handi === '1'),
    Club: clean(f.club),
    Droit_image: oui(f.droitImage === '1'),
    Autorisation_parentale: oui(f.autor === true),
    Donnees_personnelles_lues: oui(f.consentDonnees === true),
    Assurance_lue: oui(f.consentAssurance === true),
    Licence: clean(f.licence),
    Jeune_officiel: clean(f.jo),
    Signatures: f.sigEleve && f.sigResp ? 'Élève et responsable' : 'Incomplètes'
  };
}

/* ---------- Format d'échange compact (QR code « inscription ») ----------
   Tableau JSON : ["ASI2", nom, prénom, classe, naissance, lieu, sexe F/M, qualité M/P/T, responsable, tel, mail,
                   activités (noms séparés par « ; »), compét 0/1, handi 0/1/2 (2 = ne souhaite pas répondre), club, droit image 0/1, licence, jeune officiel, date]
   « ASI1 » (masque binaire des activités, liste fixe) est encore lu.
   Les signatures et l'adresse n'y figurent JAMAIS (elles restent sur l'appareil de l'élève et dans son PDF signé). */
const QUAL = { 'Mère': 'M', 'Père': 'P', 'Tuteur ou tutrice': 'T' }, QUAL_INV = { M: 'Mère', P: 'Père', T: 'Tuteur ou tutrice' };
function encodeInscription(f, dateSig) {
  /* Format compact « ASI3 » (QR peu dense = lecture fiable avec une caméra moyenne) :
     ASI3|NOM|Prénom|classe|AAAAMMJJ|F/M|téléphone responsable|activités (empreinte de la liste de l'AS . masque base 36)|drapeaux|licence|jeune officiel|AAAAMMJJ
     drapeaux = compétitions UNSS (1) + 2 × sport partagé (0/1/2) + 8 × droit à l'image.
     Adresse, signatures, e-mail, club, lieu de naissance et identité du responsable restent dans le dossier PDF signé. */
  const x = v => clean(v).replace(/\|/g, ' ');
  const d8 = v => (isoDate(v) || '').replace(/-/g, '');
  const mask = (f.acts || []).reduce((m, a) => { const i = ACT_AS.indexOf(a); return i < 0 || i > 29 ? m : m | (1 << i); }, 0);
  const acts = listeId() + '.' + mask.toString(36);
  const handi = f.handi === '1' ? 1 : f.handi === '2' ? 2 : 0;
  const flags = (f.compet === '1' ? 1 : 0) + 2 * handi + (f.droitImage === '1' ? 8 : 0);
  return ['ASI3', x(f.nom), x(f.prenom), x(f.classe), d8(f.naissance), f.sexe === 'M' ? 'M' : 'F', x(f.tel).replace(/[^\d+]/g, ''),
    acts, flags, x(f.licence), x(f.jo), d8(dateSig || today())].join('|');
}
/* Empreinte courte de la liste d'activités de l'AS : le professeur ne lit les activités que si sa liste est la même que celle de l'élève. */
function listeId() { return hash(ACT_AS.join('|')).slice(0, 3); }
function actsDe(v) {
  const [h, m] = String(v || '').split('.');
  if (h !== listeId()) return null;
  const mask = parseInt(m, 36) || 0; return ACT_AS.filter((x, i) => i < 30 && (mask >> i) & 1);
}
function decodeInscription3(text) {
  const p = String(text).trim().split('|');
  if (p[0] !== 'ASI3' || p.length !== 12) throw new Error('Code non reconnu (format inattendu).');
  const iso = v => /^\d{8}$/.test(v) ? v.slice(0, 4) + '-' + v.slice(4, 6) + '-' + v.slice(6) : '';
  const fl = parseInt(p[8], 10) || 0;
  if (!clean(p[1]) || !clean(p[2])) throw new Error('Code incomplet : nom ou prénom manquant.');
  const f = { nom: clean(p[1]), prenom: clean(p[2]), classe: clean(p[3]), naissance: iso(p[4]), lieu: '', sexe: p[5] === 'M' ? 'M' : 'F', qualite: '', respNom: '',
    tel: p[6], mail: '', acts: actsDe(p[7]), compet: fl & 1 ? '1' : '0', handi: String(Math.min(2, (fl >> 1) & 3)), club: '',
    droitImage: fl & 8 ? '1' : '0', autor: true, consentDonnees: true, consentAssurance: true, licence: p[9], jo: p[10], sigEleve: true, sigResp: true };
  const rec = toRecord(f, iso(p[11])); const listeDiff = f.acts === null;
  if (listeDiff) delete rec.Activites;
  ['Lieu_naissance', 'Qualite_responsable', 'Nom_responsable', 'Mail_responsable', 'Club'].forEach(k => delete rec[k]);
  if (!rec.Licence) delete rec.Licence; if (!rec.Jeune_officiel) delete rec.Jeune_officiel;
  return { nom: f.nom, prenom: f.prenom, classe: f.classe, record: rec, source: 'qr', avertissement: listeDiff ? 'Liste d\u2019activités différente de la vôtre : activités non lues (voir le dossier PDF).' : '' };
}
function decodeInscription(text) {
  if (String(text).trim().startsWith('ASI3|')) return decodeInscription3(text);
  let a; try { a = JSON.parse(String(text).trim()); } catch (e) { throw new Error('Code non reconnu.'); }
  if (!Array.isArray(a) || (a[0] !== 'ASI1' && a[0] !== 'ASI2') || a.length !== 19) throw new Error('Code non reconnu (version ou format inattendu).');
  const [, nom, prenom, classe, naiss, lieu, sx, q, rn, tel, mail, mask, comp, hand, club, droit, lic, jo, ds] = a;
  if (!clean(nom) || !clean(prenom)) throw new Error('Code incomplet : nom ou prénom manquant.');
  const f = {
    nom: clean(nom), prenom: clean(prenom), classe: clean(classe), naissance: naiss, lieu, sexe: sx === 'M' ? 'M' : 'F',
    qualite: QUAL_INV[q] || 'Tuteur ou tutrice', respNom: rn, tel, mail, acts: a[0] === 'ASI2' ? actsFromString(mask).map(x => txt(x, 40)) : ACT_AS.filter((x, i) => (mask >> i) & 1),
    compet: comp ? '1' : '0', handi: +hand === 1 ? '1' : +hand === 2 ? '2' : '0', club, droitImage: droit ? '1' : '0', autor: true, consentDonnees: true, consentAssurance: true,
    licence: lic, jo, sigEleve: true, sigResp: true
  };
  return { nom: f.nom, prenom: f.prenom, classe: f.classe, record: toRecord(f, ds), source: 'qr' };
}
/* Un enregistrement lu dans le tableur d'un élève → même forme que decodeInscription */
function fromSheet(row) {
  const r = {}; for (const k in row) r[k] = row[k];
  return { nom: clean(r.nom), prenom: clean(r.prenom), classe: clean(r.classe), record: r.champs || {}, source: 'xlsx' };
}

/* ---------- QR code « carte d'AS » (court, pour être flashé à chaque séance) : AS|id|NOM|Prénom|classe|licence ---------- */
function cardId(f) { return 'c' + hash(norm(f.nom) + '|' + norm(f.prenom) + '|' + norm(f.classe)); }
function cardPayload(f) {
  const x = s => clean(s).replace(/\|/g, ' ');
  return ['AS', cardId(f), x(f.nom).toUpperCase(), x(tc(f.prenom)), x(f.classe), x(f.licence)].join('|');
}
function parseCardPayload(t) {
  const p = String(t || '').trim().split('|');
  if (p[0] !== 'AS' || p.length < 5) return null;
  return { id: p[1], nom: p[2], prenom: p[3], classe: p[4], licence: p[5] || '' };
}
function typeCode(t) {
  t = String(t || '').trim();
  if (t.startsWith('["ASI1"') || t.startsWith('["ASI2"') || t.startsWith('ASI3|')) return 'inscription';
  if (t.startsWith('AS|')) return 'carte';
  return null;
}

/* ---------- Rapprochement nom saisi par l'élève ↔ liste du portail ---------- */
function lev(a, b) {
  if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
  let p = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const c = [i];
    for (let j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    p = c;
  }
  return p[b.length];
}
/* q = {nom, prenom, classe, naissance} ; list = élèves du portail [{id,nom,prenom,classe,naissance}]
   → {statut:'certain'|'a_verifier'|'aucun', eleve, candidats:[{eleve,score,note}], notes:[]} */
function matchEleve(list, q) {
  const nk = norm(q.nom) + norm(q.prenom), nr = norm(q.prenom) + norm(q.nom), cl = norm(q.classe), nais = isoDate(q.naissance), notes = [];
  const exact = [], cands = [];
  for (const e of list) {
    const k = norm(e.nom) + norm(e.prenom);
    if (k === nk || k === nr) { exact.push(e); continue; }
    const d = Math.min(lev(k, nk), lev(k, nr)), lim = Math.max(2, Math.ceil(Math.max(k.length, nk.length) * 0.15));
    const pre = norm(e.nom) === norm(q.nom) && norm(q.prenom).length >= 3 && (norm(e.prenom).startsWith(norm(q.prenom)) || norm(q.prenom).startsWith(norm(e.prenom)));
    const en = isoDate(e.naissance), sameNC = nais && en === nais && cl && norm(e.classe) === cl;
    if (d <= lim || pre || (sameNC && d <= 6)) {
      let s = pre ? 70 : 100 - 15 * d;
      if (cl && norm(e.classe) === cl) s += 15;
      if (nais && en) s += en === nais ? 30 : -40;
      if (s >= 30) cands.push({ eleve: e, score: s, note: pre ? 'prénom partiel' : d ? 'orthographe proche' : '' });
    }
  }
  const best = list => list.map(e => ({ eleve: e, score: 100, note: '' }));
  if (exact.length === 1) {
    const e = exact[0], en = isoDate(e.naissance);
    if (nais && en && en !== nais) return { statut: 'a_verifier', eleve: null, candidats: best(exact), notes: ['Même nom mais date de naissance différente'] };
    if (cl && e.classe && norm(e.classe) !== cl) notes.push('Classe différente : ' + e.classe + ' (Pronote) / ' + q.classe + ' (élève)');
    return { statut: 'certain', eleve: e, candidats: best(exact), notes };
  }
  if (exact.length > 1) {
    let c = nais ? exact.filter(e => isoDate(e.naissance) === nais) : [];
    if (c.length !== 1 && cl) c = exact.filter(e => norm(e.classe) === cl);
    if (c.length === 1) return { statut: 'certain', eleve: c[0], candidats: best(c), notes: ['Homonymes départagés par la classe ou la naissance'] };
    return { statut: 'a_verifier', eleve: null, candidats: best(exact), notes: ['Plusieurs élèves portent ce nom'] };
  }
  cands.sort((a, b) => b.score - a.score);
  return cands.length ? { statut: 'a_verifier', eleve: null, candidats: cands.slice(0, 5), notes: ['Aucun élève identique : orthographe ou prénom différent'] }
    : { statut: 'aucun', eleve: null, candidats: [], notes: ['Élève absent de la liste du portail'] };
}

/* ---------- QR code ---------- */
let QRLIB = root.qrcode || null;
function setQR(lib) { QRLIB = lib; }
function makeQR(text, ecc) {
  if (!QRLIB) throw new Error('Bibliothèque QR non chargée.');
  QRLIB.stringToBytes = QRLIB.stringToBytesFuncs['UTF-8'];
  const q = QRLIB(0, ecc || 'M'); q.addData(text); q.make(); return q;
}
function drawQR(ctx, q, x, y, box) {          // QR net (modules entiers), fond blanc, zone de silence de 4 modules
  const n = q.getModuleCount(), m = Math.max(1, Math.floor(box / (n + 8))), t = m * (n + 8), o = Math.floor((box - t) / 2);
  ctx.fillStyle = '#fff'; ctx.fillRect(x + o, y + o, t, t); ctx.fillStyle = '#14151a';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(x + o + (c + 4) * m, y + o + (r + 4) * m, m, m);
}

/* ---------- Carte d'AS (format carte bancaire 85,6 × 54 mm) ----------
   d = {nom, prenom, classe, licence, jo} ; imgs = {logo: Image}. Aucun fond n'est ajouté derrière le logo (il reste détouré). */
function drawCard(ctx, W, H, d, imgs) {
  const S = W / 1011, F = 'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  const fit = (t, max, px, w) => { let s = px; ctx.font = w + ' ' + s + 'px ' + F; while (ctx.measureText(t).width > max && s > 14 * S) { s -= 2; ctx.font = w + ' ' + s + 'px ' + F; } return s; };
  ctx.clearRect(0, 0, W, H); ctx.save(); rr(0, 0, W, H, 38 * S); ctx.clip();
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#ffc02e'); g.addColorStop(1, '#ee7a0c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 158 * S);
  let tx = 28 * S;
  if (imgs && imgs.logo && imgs.logo.width) { const lh = 142 * S, lw = lh * imgs.logo.width / imgs.logo.height; ctx.drawImage(imgs.logo, 12 * S, 8 * S, lw, lh); tx = 12 * S + lw + 20 * S; }
  ctx.fillStyle = '#1c1a15'; ctx.textBaseline = 'alphabetic';
  fit('ASSOCIATION SPORTIVE', W - tx - 24 * S, 46 * S, '900'); ctx.fillText('ASSOCIATION SPORTIVE', tx, 66 * S);
  const lieu = [ETAB, VILLE].filter(Boolean).join(' · '); if (lieu) { fit(lieu, W - tx - 24 * S, 26 * S, '600'); ctx.fillText(lieu, tx, 104 * S); }
  fit('Carte d’adhérent ' + SAISON, W - tx - 24 * S, 28 * S, '800'); ctx.fillText('Carte d’adhérent ' + SAISON, tx, 142 * S);
  const qrBox = 300 * S, qx = W - qrBox - 34 * S, qy = 192 * S, maxW = qx - 52 * S;
  const nom = clean(d.nom).toUpperCase(), pre = tc(clean(d.prenom));
  ctx.fillStyle = '#1c1a15'; fit(nom, maxW, 60 * S, '900'); ctx.fillText(nom, 40 * S, 248 * S);
  ctx.fillStyle = '#3a362c'; fit(pre, maxW, 46 * S, '600'); ctx.fillText(pre, 40 * S, 304 * S);
  ctx.fillStyle = '#d9720f'; fit(clean(d.classe), maxW, 48 * S, '800'); ctx.fillText(clean(d.classe), 40 * S, 366 * S);
  let ly = 428 * S;
  if (clean(d.licence)) { ctx.fillStyle = '#1c1a15'; fit('Licence UNSS : ' + clean(d.licence), maxW, 32 * S, '700'); ctx.fillText('Licence UNSS : ' + clean(d.licence), 40 * S, ly); }
  else { ctx.fillStyle = '#8a8472'; fit('Licence UNSS : en attente', maxW, 30 * S, '600'); ctx.fillText('Licence UNSS : en attente', 40 * S, ly); }
  if (clean(d.jo)) { ly += 42 * S; ctx.fillStyle = '#1c1a15'; fit('Jeune officiel : ' + clean(d.jo), maxW, 30 * S, '700'); ctx.fillText('Jeune officiel : ' + clean(d.jo), 40 * S, ly); }
  if (d.qr) drawQR(ctx, d.qr, qx, qy, qrBox);
  ctx.fillStyle = '#8a8472'; ctx.font = '600 ' + 22 * S + 'px ' + F; ctx.fillText('À présenter à chaque séance', 40 * S, H - 26 * S);
  const g2 = ctx.createLinearGradient(0, 0, W, 0); g2.addColorStop(0, '#0a4fd0'); g2.addColorStop(1, '#ff7a14'); ctx.fillStyle = g2; ctx.fillRect(0, H - 12 * S, W, 12 * S);
  ctx.restore();
}
function cardCanvas(doc, d, imgs, W) {
  W = W || 1011; const c = doc.createElement('canvas'); c.width = W; c.height = Math.round(W * 54 / 85.6);
  drawCard(c.getContext('2d'), c.width, c.height, Object.assign({}, d, { qr: makeQR(cardPayload(d), 'M') }), imgs); return c;
}

const API = { ACT_DEFAUT, LOGOS, saisonCourante, setConfig, cfgClean, cfgToParam, cfgFromParam, ACT_ID, norm, tc, clean, hash, isoDate, frDate, today, telOk, mailOk, naissanceOk, manques,
  toRecord, actsFromString, sortActs, encodeInscription, decodeInscription, fromSheet, cardId, cardPayload, parseCardPayload, typeCode,
  lev, matchEleve, setQR, makeQR, drawQR, drawCard, cardCanvas };
['SAISON', 'ETAB', 'VILLE', 'LOGO', 'ACT_AS'].forEach(k => Object.defineProperty(API, k, { enumerable: true, get: () => ({ SAISON, ETAB, VILLE, LOGO, ACT_AS })[k] }));
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.ASCORE = API;
})(typeof window !== 'undefined' ? window : globalThis);
