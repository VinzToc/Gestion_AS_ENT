/* as-core.js v1.0 — noyau commun de « Mon AS » (élèves) et « Gestion AS » (professeur).
   Ce fichier est IDENTIQUE dans les deux applications (copie à garder synchronisée).
   Contenu : liste des activités, validation de la fiche d'inscription, format d'échange (QR code / tableur),
   rapprochement nom saisi par l'élève ↔ liste du portail Mes Apps EPS, dessin de la carte d'AS.
   100 % local : aucune donnée n'est envoyée sur Internet. */
(function (root) {
'use strict';

const SAISON = '2026-2027';
const ETAB = 'Lycée des métiers Romain Rolland';
const VILLE = 'Amiens';

/* Activités proposées dans le formulaire d'inscription (ordre alphabétique) */
const ACT_AS = ['Badminton', 'Basket', 'Basket 3x3', 'Cross country', 'Football', 'Futsal', 'Handball',
  'Kitesurf / Landkite / Landwing', 'La lycéenne', 'Patinoire', 'Raid multi activités', 'Tennis de table'];

const norm = s => (s == null ? '' : String(s)).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const tc = s => String(s || '').toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).trim();
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
const oui = v => v ? 'Oui' : 'Non';
const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

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
  need('handi', 'Réponse « sport partagé / handisport »', f.handi === '0' || f.handi === '1');
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
    Sport_partage: oui(f.handi === '1'),
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
   Tableau JSON : ["ASI1", nom, prénom, classe, naissance, lieu, sexe F/M, qualité M/P/T, responsable, tel, mail,
                   masque des activités, compét 0/1, handi 0/1, club, droit image 0/1, licence, jeune officiel, date]
   Les signatures et l'adresse n'y figurent JAMAIS (elles restent sur l'appareil de l'élève et dans son PDF signé). */
const QUAL = { 'Mère': 'M', 'Père': 'P', 'Tuteur ou tutrice': 'T' }, QUAL_INV = { M: 'Mère', P: 'Père', T: 'Tuteur ou tutrice' };
function encodeInscription(f, dateSig) {
  const mask = (f.acts || []).reduce((s, a) => { const i = ACT_AS.indexOf(a); return i < 0 ? s : s | (1 << i); }, 0);
  return JSON.stringify(['ASI1', clean(f.nom), clean(f.prenom), clean(f.classe), isoDate(f.naissance), tc(clean(f.lieu)), f.sexe === 'M' ? 'M' : 'F',
    QUAL[f.qualite] || 'T', clean(f.respNom), clean(f.tel).replace(/[^\d+]/g, ''), clean(f.mail).toLowerCase(), mask,
    f.compet === '1' ? 1 : 0, f.handi === '1' ? 1 : 0, clean(f.club), f.droitImage === '1' ? 1 : 0, clean(f.licence), clean(f.jo), isoDate(dateSig) || today()]);
}
function decodeInscription(text) {
  let a; try { a = JSON.parse(String(text).trim()); } catch (e) { throw new Error('Code non reconnu.'); }
  if (!Array.isArray(a) || a[0] !== 'ASI1' || a.length !== 19) throw new Error('Code non reconnu (version ou format inattendu).');
  const [, nom, prenom, classe, naiss, lieu, sx, q, rn, tel, mail, mask, comp, hand, club, droit, lic, jo, ds] = a;
  if (!clean(nom) || !clean(prenom)) throw new Error('Code incomplet : nom ou prénom manquant.');
  const f = {
    nom: clean(nom), prenom: clean(prenom), classe: clean(classe), naissance: naiss, lieu, sexe: sx === 'M' ? 'M' : 'F',
    qualite: QUAL_INV[q] || 'Tuteur ou tutrice', respNom: rn, tel, mail, acts: ACT_AS.filter((x, i) => (mask >> i) & 1),
    compet: comp ? '1' : '0', handi: hand ? '1' : '0', club, droitImage: droit ? '1' : '0', autor: true, consentDonnees: true, consentAssurance: true,
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
  if (t.startsWith('["ASI1"')) return 'inscription';
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
  fit(ETAB + ' · ' + VILLE, W - tx - 24 * S, 26 * S, '600'); ctx.fillText(ETAB + ' · ' + VILLE, tx, 104 * S);
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

const API = { SAISON, ETAB, VILLE, ACT_AS, ACT_ID, norm, tc, clean, hash, isoDate, frDate, today, telOk, mailOk, naissanceOk, manques,
  toRecord, actsFromString, sortActs, encodeInscription, decodeInscription, fromSheet, cardId, cardPayload, parseCardPayload, typeCode,
  lev, matchEleve, setQR, makeQR, drawQR, drawCard, cardCanvas };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.ASCORE = API;
})(typeof window !== 'undefined' ? window : globalThis);
