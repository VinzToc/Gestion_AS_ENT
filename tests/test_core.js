const assert=require('assert');
const A=require('../mon-as/as-core.js');
const qrlib=require('../mon-as/lib/qrcode-generator-1.4.4.js');
const jsQR=require('../gestion-as/lib/jsQR-1.4.0.js');
A.setQR(qrlib);
let ok=0;const t=(n,f)=>{try{f();ok++;console.log('  ✔',n)}catch(e){console.log('  ✘',n,'\n     ',e.message);process.exitCode=1}};

const f={nom:'Dupont',prenom:'léa-rose',classe:'2GATL1',naissance:'2010-04-12',lieu:'amiens',sexe:'F',qualite:'Mère',respNom:'Sophie Dupont',
 tel:'06 12 34 56 78',mail:'Sophie.Dupont@exemple.fr',adresse:'12 rue des Écoles 80000 Amiens',acts:['Futsal','Badminton','La lycéenne'],compet:'1',handi:'0',club:'Danse',
 autor:true,droitImage:'1',consentDonnees:true,consentAssurance:true,licence:'',jo:'',sigEleve:'data:x',sigResp:'data:y'};

console.log('Validation');
t('fiche complète → aucun manque',()=>assert.deepStrictEqual(A.manques(f),[]));
t('signatures absentes → 2 manques',()=>assert.deepStrictEqual(A.manques({...f,sigEleve:'',sigResp:''}).map(x=>x.k),['sigEleve','sigResp']));
t('case autorisation décochée → manque',()=>assert(A.manques({...f,autor:false}).some(x=>x.k==='autor')));
t('droit à l’image non répondu → manque (« non » est une réponse valable)',()=>{assert(A.manques({...f,droitImage:''}).some(x=>x.k==='droitImage'));assert(!A.manques({...f,droitImage:'0'}).some(x=>x.k==='droitImage'))});
t('téléphone invalide refusé',()=>{assert(!A.telOk('123'));assert(A.telOk('+33 6 12 34 56 78'));assert(A.telOk('0612345678'))});
t('naissance impossible refusée (31/02, trop jeune)',()=>{assert(!A.naissanceOk('2010-02-31'));assert(!A.naissanceOk('2024-01-01'));assert(A.naissanceOk('2010-04-12'))});
t('e-mail invalide refusé',()=>{assert(!A.mailOk('a@b'));assert(A.mailOk('a@b.fr'))});

console.log('Enregistrement (colonnes du tableur)');
const rec=A.toRecord(f,'2026-11-27');
t('Date_signature est la 1re clé (datation dans le portail)',()=>assert.strictEqual(Object.keys(rec)[0],'Date_signature'));
t('activités triées dans l’ordre alphabétique de la liste',()=>assert.strictEqual(rec.Activites,'Badminton ; Futsal ; La lycéenne'));
t('aucune adresse ni image de signature dans l’enregistrement',()=>{const s=JSON.stringify(rec);assert(!/Écoles|data:/.test(s));assert(!('Adresse' in rec))});

console.log('QR « inscription »');
const code=A.encodeInscription(f,'2026-11-27');
t('taille du code raisonnable (<400 octets)',()=>{const n=Buffer.byteLength(code);console.log('      →',n,'octets');assert(n<400)});
t('aller-retour sans perte (format JSON ASI2, toujours lu)',()=>{const j=JSON.stringify(['ASI2',f.nom,f.prenom,f.classe,f.naissance,f.lieu,'F','M',f.respNom,'0612345678',f.mail.toLowerCase(),'Badminton ; Futsal ; La lycéenne',1,0,'',1,'','',A.today()]);
 const d=A.decodeInscription(j);assert.strictEqual(d.nom,'Dupont');assert.strictEqual(d.record.Nom_responsable,f.respNom);assert.strictEqual(d.record.Mail_responsable,f.mail.toLowerCase())});
t('code ASI3 : identité, naissance et téléphone conservés',()=>{const d=A.decodeInscription(code);assert.strictEqual(d.nom,'Dupont');assert.strictEqual(d.record.Naissance,f.naissance);assert.strictEqual(d.record.Telephone_responsable,'0612345678')});
t('le code ne contient ni adresse ni signature',()=>assert(!/Écoles|data:/.test(code)));
t('code inconnu rejeté',()=>{assert.throws(()=>A.decodeInscription('bonjour'));assert.throws(()=>A.decodeInscription('["ASI2",1]'))});
t('type de code détecté',()=>{assert.strictEqual(A.typeCode(code),'inscription');assert.strictEqual(A.typeCode('AS|c1|X|Y|2A|'),'carte');assert.strictEqual(A.typeCode('http://x'),null)});

console.log('Lisibilité des QR codes (décodage réel avec jsQR)');
function decodeQR(text,ecc,scale){const q=A.makeQR(text,ecc),n=q.getModuleCount(),m=scale,w=(n+8)*m,px=new Uint8ClampedArray(w*w*4).fill(255);
 for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))for(let y=0;y<m;y++)for(let x=0;x<m;x++){const i=(((r+4)*m+y)*w+(c+4)*m+x)*4;px[i]=px[i+1]=px[i+2]=20}
 const res=jsQR(px,w,w);return{res,n}}
t('code d’inscription (version QR élevée) décodé',()=>{const{res,n}=decodeQR(code,'M',6);console.log('      → QR',n,'×',n,'modules');assert(res);assert.strictEqual(new TextDecoder().decode(Uint8Array.from(res.binaryData)),code)});
const cp=A.cardPayload({nom:'Dupont',prenom:'léa-rose',classe:'2GATL1',licence:'25 123456'});
t('code de carte court décodé',()=>{const{res,n}=decodeQR(cp,'M',6);console.log('      →',Buffer.byteLength(cp),'octets, QR',n,'×',n);assert(res);assert.strictEqual(new TextDecoder().decode(Uint8Array.from(res.binaryData)),cp)});
t('carte : lecture du code',()=>{const p=A.parseCardPayload(cp);assert.strictEqual(p.nom,'DUPONT');assert.strictEqual(p.prenom,'Léa-Rose');assert.strictEqual(p.classe,'2GATL1');assert.strictEqual(p.licence,'25 123456')});
t('carte : accents dans le nom conservés',()=>{const x=A.cardPayload({nom:'Lefèvre',prenom:'Zoé',classe:'1MCVA2'});const {res}=decodeQR(x,'M',6);assert(res);assert(new TextDecoder().decode(Uint8Array.from(res.binaryData)).includes('LEFÈVRE'))});

console.log('Rapprochement avec la liste Pronote');
const L=[
 {id:'1',nom:'DUPONT',prenom:'Léa Rose',classe:'2GATL1',naissance:'2010-04-12'},
 {id:'2',nom:'MARTIN',prenom:'Hugo',classe:'1MCVA1',naissance:'2009-01-02'},
 {id:'3',nom:'MARTIN',prenom:'Hugo',classe:'2MS',naissance:'2010-05-05'},
 {id:'4',nom:'DE LA FONTAINE',prenom:'Jean-Pierre',classe:'3PM',naissance:'2008-09-09'},
 {id:'5',nom:'LEFEVRE',prenom:'Zoé',classe:'1OTM',naissance:''},
 {id:'6',nom:'BENALI',prenom:'Yasmine',classe:'AS1',naissance:'2011-03-03'}];
const M=(q)=>A.matchEleve(L,q);
t('nom identique (accents/casse/tirets ignorés) → certain',()=>{const r=M({nom:'dupont',prenom:'lea-rose',classe:'2GATL1'});assert.strictEqual(r.statut,'certain');assert.strictEqual(r.eleve.id,'1')});
t('nom et prénom inversés → certain',()=>assert.strictEqual(M({nom:'Hugo',prenom:'Martin',classe:'1MCVA1'}).eleve.id,'2'));
t('homonymes départagés par la classe',()=>assert.strictEqual(M({nom:'Martin',prenom:'Hugo',classe:'2MS'}).eleve.id,'3'));
t('homonymes sans classe ni naissance → à vérifier (2 candidats)',()=>{const r=M({nom:'Martin',prenom:'Hugo',classe:''});assert.strictEqual(r.statut,'a_verifier');assert.strictEqual(r.candidats.length,2)});
t('homonymes départagés par la naissance',()=>assert.strictEqual(M({nom:'Martin',prenom:'Hugo',classe:'',naissance:'05/05/2010'}).eleve.id,'3'));
t('même nom mais naissance différente → à vérifier',()=>assert.strictEqual(M({nom:'Dupont',prenom:'Léa Rose',classe:'2GATL1',naissance:'2010-04-13'}).statut,'a_verifier'));
t('faute de frappe (Dupond) → proposée, jamais rattachée seule',()=>{const r=M({nom:'Dupond',prenom:'Léa Rose',classe:'2GATL1'});assert.strictEqual(r.statut,'a_verifier');assert.strictEqual(r.candidats[0].eleve.id,'1')});
t('prénom partiel (Jean pour Jean-Pierre) → proposé',()=>{const r=M({nom:'De La Fontaine',prenom:'Jean',classe:'3PM'});assert.strictEqual(r.statut,'a_verifier');assert.strictEqual(r.candidats[0].eleve.id,'4')});
t('élève inconnu → aucun',()=>assert.strictEqual(M({nom:'Zzzz',prenom:'Qqqq',classe:'X'}).statut,'aucun'));
t('classe différente signalée mais rattaché',()=>{const r=M({nom:'Benali',prenom:'Yasmine',classe:'2MS'});assert.strictEqual(r.statut,'certain');assert(r.notes.join().includes('Classe différente'))});
t('nom composé avec particule certain',()=>assert.strictEqual(M({nom:'DE LA FONTAINE',prenom:'Jean Pierre',classe:'3PM'}).eleve.id,'4'));

console.log(ok,'tests réussis');

console.log('QR d’inscription compact (ASI3)');
const big={...f,nom:'Dupont-Lefebvre',prenom:'Marie-Charlotte',classe:'2NDE MELEC',acts:A.ACT_AS.slice(0,6),licence:'123456',club:'FC Amiens Sport',mail:'a.b@gmail.com',respNom:'Anne Dupont-Lefebvre'};
t('format ASI3 reconnu comme inscription',()=>{const c=A.encodeInscription(big,'2026-11-27');assert(c.startsWith('ASI3|'));assert.strictEqual(A.typeCode(c),'inscription')});
t('QR nettement moins dense qu’avant (≤ 45 modules)',()=>{const c=A.encodeInscription(big,'2026-11-27');assert(c.length<=100,c.length+' octets');assert(A.makeQR(c,'M').getModuleCount()<=45)});
t('aller-retour : identité, naissance, activités, téléphone, drapeaux',()=>{const d=A.decodeInscription(A.encodeInscription(big,'2026-11-27')),r=d.record;
 assert.strictEqual(d.nom,'Dupont-Lefebvre');assert.strictEqual(d.classe,'2NDE MELEC');assert.strictEqual(r.Naissance,'2010-04-12');assert.strictEqual(r.Sexe,'Fille');
 assert.strictEqual(r.Telephone_responsable,'0612345678');assert.strictEqual(r.Activites,A.sortActs(big.acts).join(' ; '));assert.strictEqual(r.Competitions_UNSS,'Oui');assert.strictEqual(r.Sport_partage,'Non');assert.strictEqual(r.Droit_image,'Oui');assert.strictEqual(r.Licence,'123456');assert.strictEqual(r.Date_signature,'2026-11-27')});
t('les champs absents du QR n’effacent rien côté professeur (clés non transmises)',()=>{const r=A.decodeInscription(A.encodeInscription(big,'2026-11-27')).record;['Lieu_naissance','Qualite_responsable','Nom_responsable','Mail_responsable','Club'].forEach(k=>assert(!(k in r),k))});
t('Date_signature reste la première clé (fiche du portail)',()=>assert.strictEqual(Object.keys(A.decodeInscription(A.encodeInscription(big,'2026-11-27')).record)[0],'Date_signature'));
t('ancien format ASI1 toujours lu',()=>{const old=JSON.stringify(['ASI1','Dupont','Léa','2NDE','2010-04-12','Amiens','F','M','Anne','0612345678','a@b.fr',3,1,0,'',1,'','','2026-11-27']);assert.strictEqual(A.typeCode(old),'inscription');assert.strictEqual(A.decodeInscription(old).record.Mail_responsable,'a@b.fr')});
t('lecture réelle jsQR à faible résolution (QR de 130 px, flou + bruit)',()=>{
 // rendu manuel du QR en niveaux de gris, 130 px de large, avec bruit déterministe
 const q=A.makeQR(A.encodeInscription(big,'2026-11-27'),'M'),n=q.getModuleCount(),px=130,quiet=4,m=px/(n+2*quiet),d=new Uint8ClampedArray(px*px*4);let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let y=0;y<px;y++)for(let x=0;x<px;x++){const r=Math.floor(y/m)-quiet,c=Math.floor(x/m)-quiet;const dark=r>=0&&c>=0&&r<n&&c<n&&q.isDark(r,c);const v=Math.max(0,Math.min(255,(dark?30:225)+(rnd()-.5)*50));const i=(y*px+x)*4;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255}
 const res=jsQR(d,px,px);assert(res&&res.data===A.encodeInscription(big,'2026-11-27'))});

t('ASI3 : liste d’activités propre à l’établissement + « ne souhaite pas répondre »',()=>{A.setConfig({acts:['Escalade','Badminton','Futsal']});
 const c=A.encodeInscription({...big,handi:'2',acts:['Escalade','Futsal']},'2026-11-27'),d=A.decodeInscription(c);A.setConfig({});
 assert.strictEqual(d.record.Sport_partage,'Ne souhaite pas répondre');assert.strictEqual(d.avertissement,'');assert.strictEqual(d.record.Activites,'Escalade ; Futsal');assert(c.length<=100,c.length+' octets')});
t('ASI3 : liste d’activités différente → activités non lues, avertissement, rien d’inventé',()=>{A.setConfig({acts:['Escalade','Badminton']});const c=A.encodeInscription({...big,acts:['Escalade']},'2026-11-27');A.setConfig({});
 const d=A.decodeInscription(c);assert(d.avertissement.length>0);assert(!('Activites' in d.record))});
t('format JSON ASI2 (version précédente) reconnu par le professeur',()=>{const c=JSON.stringify(['ASI2','Dupont','Léa','2NDE','2010-04-12','Amiens','F','M','Anne','0612345678','a@b.fr','Futsal ; Badminton',1,0,'',1,'','','2026-11-27']);assert.strictEqual(A.typeCode(c),'inscription');assert.strictEqual(A.decodeInscription(c).record.Mail_responsable,'a@b.fr')});
console.log(ok+' tests réussis (total)');
console.log('Mentions légales paramétrables');
t('textes légaux : transmis par le lien, balises retirées, plafonnés à 1 500 caractères',()=>{const c=A.cfgClean({leg:{d:'Texte <b>gras</b>\r\nligne 2',p:'x'.repeat(2000),a:''}});assert.strictEqual(c.leg.d,'Texte gras\nligne 2');assert.strictEqual(c.leg.p.length,1500);assert(!('a' in c.leg));
 const r=A.cfgFromParam(A.cfgToParam(c,null));assert.strictEqual(r.cfg.leg.d,'Texte gras\nligne 2')});
t('sans mentions légales : aucune clé leg',()=>assert(!('leg' in A.cfgClean({etab:'X'}))));
console.log(ok+' tests réussis (total 2)');
