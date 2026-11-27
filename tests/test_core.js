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
t('aller-retour sans perte',()=>{const d=A.decodeInscription(code);assert.strictEqual(d.nom,'Dupont');assert.deepStrictEqual(d.record,rec)});
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
