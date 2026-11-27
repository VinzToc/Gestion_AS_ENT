/* Mon AS — application élève : fiche d'inscription, signatures, carte d'AS. 100 % local. */
(function(){
'use strict';
const A=window.ASCORE, $=id=>document.getElementById(id), DK='mon_as_brouillon_v1',FK='mon_as_final_v1';
const form=$('form'), sig={sigEleve:null,sigResp:null};
$('ver').textContent='v'+(window.VERSION||'');
$('tx-droit').textContent=TEXTES.droitImage.texte;$('tx-donnees').textContent=TEXTES.donnees.texte;$('tx-assurance').textContent=TEXTES.assurance.texte;
/* ---- Réglages de l'AS (établissement, ville, saison, activités, logo) : jamais en dur ---- */
const CFGK='mon_as_cfg_v1';
function cfgStock(){try{return JSON.parse(localStorage.getItem(CFGK)||'null')||{}}catch(e){return{}}}
const escA=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
function appliquerCfg(){A.setConfig(cfgStock());
 const pris=[...form.querySelectorAll('input[name=act]:checked')].map(x=>x.value);
 $('chips').innerHTML=A.ACT_AS.map(a=>`<label class="chip"><input type="checkbox" name="act" value="${escA(a)}"><span>${escA(a)}</span></label>`).join('');
 form.querySelectorAll('input[name=act]').forEach(c=>{c.checked=pris.includes(c.value)});
 $('sous').textContent=['Inscription '+A.SAISON,A.ETAB,A.VILLE].filter(Boolean).join(' · ');
 $('cardEtab').hidden=!!cfgStock().etab&&!cfgStock().saisieEleve;
 const i2=new Image();i2.onload=()=>{logo=i2;if(cur)montre(cur.f,cur.ds)};i2.src=A.LOGOS[A.LOGO]||A.LOGOS.defaut}
let logo=null;
const val=id=>$(id).value, radio=n=>{const r=form.querySelector(`input[name=${n}]:checked`);return r?r.value:''};

function lire(){return{nom:val('nom'),prenom:val('prenom'),classe:val('classe'),naissance:val('naissance'),lieu:val('lieu'),sexe:radio('sexe'),
 qualite:val('qualite'),respNom:val('respNom'),tel:val('tel'),mail:val('mail'),adresse:val('adresse'),
 acts:[...form.querySelectorAll('input[name=act]:checked')].map(x=>x.value),compet:radio('compet'),handi:radio('handi'),club:val('club'),
 autor:$('autor').checked,droitImage:radio('droitImage'),consentDonnees:$('consentDonnees').checked,consentAssurance:$('consentAssurance').checked,
 sigEleve:sig.sigEleve,sigResp:sig.sigResp,licence:val('licence'),jo:val('jo')}}

function ecrire(f){['nom','prenom','classe','naissance','lieu','qualite','respNom','tel','mail','adresse','club','licence','jo'].forEach(k=>{$(k).value=f[k]||''});
 ['sexe','compet','handi','droitImage'].forEach(n=>{const r=form.querySelector(`input[name=${n}][value="${f[n]}"]`);if(r)r.checked=true});
 form.querySelectorAll('input[name=act]').forEach(c=>{c.checked=(f.acts||[]).includes(c.value)});
 ['autor','consentDonnees','consentAssurance'].forEach(k=>{$(k).checked=!!f[k]});
 ['sigEleve','sigResp'].forEach(k=>{if(f[k]){sig[k]=f[k];const i=new Image();i.onload=()=>{const c=$(k);c.getContext('2d').drawImage(i,0,0,c.width,c.height)};i.src=f[k]}})}

function sauver(){try{localStorage.setItem(DK,JSON.stringify(lire()))}catch(e){}}
let cur=null,vue='vue-ins';
function etat(){const m=A.manques(lire());
 $('barTx').innerHTML=cur?'✅ Inscription enregistrée<small>Montre ton QR code à ton professeur</small>':m.length?`${m.length} élément${m.length>1?'s':''} à compléter<small>💾 Brouillon enregistré sur cet appareil : tu peux reprendre plus tard</small>`:'✅ Tout est complet<small>Tu peux enregistrer ton inscription</small>';
 $('go').textContent=cur?'📲 Montrer mon QR code':'Enregistrer mon inscription';
 $('bar').hidden=vue!=='vue-ins';
 return m}
function maj(){sauver();etat();form.querySelectorAll('.mq').forEach(e=>e.classList.remove('mq'))}
form.addEventListener('input',maj);form.addEventListener('change',maj);
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{vue=b.dataset.v;document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));['vue-ins','vue-carte'].forEach(v=>$(v).hidden=v!==vue);etat();window.scrollTo(0,0)});
/* ---- Signatures ---- */
function pad(id){const c=$(id),x=c.getContext('2d');let on=false,n=0;
 x.lineWidth=3.2;x.lineCap=x.lineJoin='round';x.strokeStyle='#14151a';
 const pos=e=>{const r=c.getBoundingClientRect();return[(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]};
 c.addEventListener('pointerdown',e=>{e.preventDefault();c.setPointerCapture(e.pointerId);on=true;n=0;const[p,q]=pos(e);x.beginPath();x.moveTo(p,q);x.lineTo(p+.1,q+.1);x.stroke()});
 c.addEventListener('pointermove',e=>{if(!on)return;const[p,q]=pos(e);x.lineTo(p,q);x.stroke();x.beginPath();x.moveTo(p,q);n++});
 const fin=()=>{if(!on)return;on=false;if(n>=3){sig[id]=c.toDataURL('image/png')}maj()};
 c.addEventListener('pointerup',fin);c.addEventListener('pointercancel',fin);
}
['sigEleve','sigResp'].forEach(pad);
document.querySelectorAll('[data-clear]').forEach(b=>b.onclick=()=>{const id=b.dataset.clear,c=$(id);c.getContext('2d').clearRect(0,0,c.width,c.height);sig[id]=null;maj()});


/* ---- Cotisation en ligne (lien saisi par le professeur) ---- */
const CK='mon_as_cotis_v1';
function cotisHote(u){try{const x=new URL(u);return x.protocol==='https:'&&!x.username&&!x.password&&x.hostname.includes('.')?x.hostname.replace(/^www\./,''):''}catch(e){return ''}}
function cotisOk(c){return !!(c&&typeof c.u==='string'&&c.u.length<2000&&cotisHote(c.u))}
function cotisLire(){try{const c=JSON.parse(localStorage.getItem(CK)||'null');return cotisOk(c)?c:null}catch(e){return null}}
function cotisMaj(){const c=cotisLire(),p=$('pay'),h=$('payHint');p.hidden=!c;h.hidden=!c;
 if(c){p.href=c.u;p.textContent='💳 Payer ma cotisation en ligne'+(c.m?' ('+c.m+')':'');h.textContent='Le paiement se fait sur un site extérieur à cette application : '+cotisHote(c.u)+'. Vérifie auprès de ton professeur que c’est bien l’adresse de l’AS avant de payer. Garde ta confirmation de paiement.'}}
async function cotisInit(){
 let par=null,leg=null;try{const q=new URLSearchParams(location.search);par=q.get('cfg');leg=q.get('cotis')}catch(e){}
 if(par||leg){try{
  if(par){const r=A.cfgFromParam(par);localStorage.setItem(CFGK,JSON.stringify(r.cfg));if(cotisOk(r.cotis))localStorage.setItem(CK,JSON.stringify(r.cotis));else localStorage.removeItem(CK)}
  else{const o=JSON.parse(decodeURIComponent(escape(atob(leg.replace(/-/g,'+').replace(/_/g,'/')))));const c={u:String(o.u||''),m:String(o.m||'').slice(0,30)};if(cotisOk(c))localStorage.setItem(CK,JSON.stringify(c))}
  history.replaceState(null,'',location.pathname)}catch(e){}}
 else{try{const r=await fetch('config.json',{cache:'no-store'});if(r.ok){const j=await r.json(),c=j&&j.cotisation;if(c&&cotisOk({u:c.url}))localStorage.setItem(CK,JSON.stringify({u:c.url,m:String(c.montant||'').slice(0,30)}));
  const k=A.cfgClean(j&&j.as);if(k.etab&&!cfgStock().etab)localStorage.setItem(CFGK,JSON.stringify(k))}}catch(e){}}
 appliquerCfg();cotisMaj()}
/* Établissement saisi par l'élève quand aucun réglage n'a été reçu */
function etabSaisie(){const c=cfgStock();c.etab=A.clean($('etabIn').value).slice(0,80);c.ville=A.clean($('villeIn').value).slice(0,50);c.saisieEleve=true;try{localStorage.setItem(CFGK,JSON.stringify(c))}catch(e){}
 A.setConfig(c);$('sous').textContent=['Inscription '+A.SAISON,A.ETAB,A.VILLE].filter(Boolean).join(' · ')}
$('etabIn').addEventListener('input',etabSaisie);$('villeIn').addEventListener('input',etabSaisie);

/* ---- Enregistrement de l'inscription ---- */
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
const nomFichier=f=>'AS_'+A.norm(f.nom).toUpperCase()+'_'+A.tc(f.prenom).replace(/\s/g,'');
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function creer(){
 const f=lire(),m=A.manques(f);
 if(m.length){$('manqueList').innerHTML=m.map(x=>`<li>• ${x.label}</li>`).join('');$('dlgManque').showModal();
  m.forEach(x=>{const el=form.querySelector(`[data-k="${x.k}"]`);if(el)el.classList.add('mq')});
  const first=form.querySelector('.mq');if(first)first.scrollIntoView({block:'center'});return}
 if(!confirm('Enregistrer ton inscription ? Tu ne pourras plus modifier ta fiche ensuite.'))return;
 const ds=A.today();
 try{await ELEVE.definir({nom:A.clean(f.nom),prenom:A.clean(f.prenom),classe:A.clean(f.classe)});
  await ELEVE.enregistrerChamps(A.ACT_ID,A.toRecord(f,ds))}catch(e){$('msg').textContent='Enregistrement local impossible : '+e.message}
 try{localStorage.setItem(FK,ds);localStorage.setItem(DK,JSON.stringify(f))}catch(e){}
 montre(f,ds);window.scrollTo(0,0)}
function resume(f){
 const o=v=>v==='1'?'Oui':v==='0'?'Non':v==='2'?'Ne souhaite pas répondre':'';
 const kv=[['Nom',f.nom.toUpperCase()],['Prénom',A.tc(f.prenom)],['Classe',f.classe],['Né(e) le',A.frDate(f.naissance)+' à '+A.tc(f.lieu)],['Sexe',f.sexe==='M'?'Garçon':'Fille'],
  ['Responsable',f.respNom+' ('+f.qualite+')'],['Téléphone',f.tel],['E-mail',f.mail||'—'],['Adresse',f.adresse],
  ['Activités',A.sortActs(f.acts).join(', ')],['Compétitions UNSS',o(f.compet)],['Sport partagé / handisport',o(f.handi)],['Club',f.club||'—'],
  ['Droit à l\u2019image',f.droitImage==='1'?'Autorisé':'Non autorisé'],['Licence UNSS',f.licence||'en attente'],['Jeune officiel',f.jo||'—']];
 $('resume').innerHTML=kv.map(([k,v])=>`<b>${esc(k)}</b><span>${esc(v)}</span>`).join('');
 $('resumeSig').innerHTML=`<figure><img alt="Signature de l'élève" src="${f.sigEleve}"><figcaption>Signature de l'élève</figcaption></figure><figure><img alt="Signature du responsable" src="${f.sigResp}"><figcaption>Signature du responsable</figcaption></figure>`}
function montre(f,ds){
 const d={nom:f.nom,prenom:f.prenom,classe:f.classe,licence:f.licence,jo:f.jo};cur={f,d,ds};
 $('saisie').hidden=true;$('fait').hidden=false;$('faitDate').textContent='Inscription enregistrée le '+A.frDate(ds)+'.';resume(f);
 const cv=A.cardCanvas(document,d,{logo},1011),dst=$('cardcv');dst.width=cv.width;dst.height=cv.height;dst.getContext('2d').drawImage(cv,0,0);
 $('carteVide').hidden=true;$('carteOk').hidden=false;
 const qc=$('qrIns');qc.width=qc.height=560;A.drawQR(qc.getContext('2d'),A.makeQR(A.encodeInscription(f,ds),'M'),0,0,560);
 cotisMaj();etat()}
/* ---- QR plein écran pour le professeur ---- */
let wake=null;
async function plein(){if(!cur)return;const c=$('qrBig');c.width=c.height=900;A.drawQR(c.getContext('2d'),A.makeQR(A.encodeInscription(cur.f,cur.ds),'M'),0,0,900);
 $('qrNom').textContent=A.tc(cur.f.prenom)+' '+cur.f.nom.toUpperCase()+' · '+cur.f.classe;$('dQr').showModal();
 try{wake=await navigator.wakeLock.request('screen')}catch(e){}}
$('qrClose').onclick=()=>$('dQr').close();$('dQr').addEventListener('close',()=>{try{wake&&wake.release()}catch(e){}wake=null});
$('go').onclick=()=>cur?plein():creer();$('manqueOk').onclick=()=>$('dlgManque').close();

$('dlPng').onclick=()=>{if(cur)$('cardcv').toBlob(b=>dl(b,nomFichier(cur.f)+'_carte.png'))};
$('dlCartePdf').onclick=()=>{if(!cur)return;const P=new jspdf.jsPDF({unit:'mm',format:'a4'});
 P.addImage($('cardcv').toDataURL('image/png'),'PNG',(210-85.6)/2,30,85.6,54);P.setFontSize(10);P.text('Découper suivant le contour.',105,92,{align:'center'});P.save(nomFichier(cur.f)+'_carte.pdf')};
const ascii=s=>String(s==null?'':s).replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-');
$('dlDossier').onclick=()=>{if(!cur)return;const f=cur.f,P=new jspdf.jsPDF({unit:'mm',format:'a4'});let y=20;
 P.setFontSize(16);P.setFont('helvetica','bold');P.text(ascii("Fiche d'inscription "+A.SAISON+" - Association Sportive"),105,y,{align:'center'});y+=7;
 P.setFontSize(10);P.setFont('helvetica','normal');P.text(ascii([A.ETAB,A.VILLE].filter(Boolean).join(' - ')),105,y,{align:'center'});y+=12;
 const L=(k,v)=>{P.setFont('helvetica','bold');P.text(ascii(k)+' :',20,y);P.setFont('helvetica','normal');const t=P.splitTextToSize(ascii(v||'-'),115);P.text(t,75,y);y+=5.6*t.length+1.4};
 L('Nom',f.nom.toUpperCase());L('Prénom',A.tc(f.prenom));L('Classe',f.classe);L('Né(e) le',A.frDate(f.naissance)+' à '+A.tc(f.lieu));L('Sexe',f.sexe==='M'?'Garçon':'Fille');
 y+=3;L('Responsable légal',f.respNom+' ('+f.qualite+')');L('Téléphone',f.tel);L('E-mail',f.mail);L('Adresse',f.adresse);
 y+=3;L('Activités',A.sortActs(f.acts).join(' ; '));L('Compétitions UNSS',f.compet==='1'?'Oui':'Non');L('Sport partagé / handisport',f.handi==='1'?'Oui':f.handi==='2'?'Ne souhaite pas répondre':'Non');L('Club',f.club);
 y+=3;L('Autorisation parentale','Oui');L("Droit à l'image",f.droitImage==='1'?"J'autorise":"Je n'autorise pas");L('Données personnelles','Lues');L('Assurances','Lues');
 L('N° licence UNSS',f.licence||'en attente');if(f.jo)L('N° jeune officiel',f.jo);
 y+=6;P.setFont('helvetica','bold');P.text('Signature de l\'élève',20,y);P.text('Signature du responsable légal',115,y);y+=3;
 P.addImage(f.sigEleve,'PNG',20,y,75,23.6);P.addImage(f.sigResp,'PNG',115,y,75,23.6);y+=30;
 P.setFont('helvetica','normal');P.setFontSize(8);P.text(ascii('Signé électroniquement le '+A.frDate(cur.ds)+' sur l\'application Mon AS.'),20,y);
 P.save(nomFichier(f)+'_dossier.pdf')};


$('efface').onclick=async()=>{if(!confirm('Effacer toutes tes données de cet appareil ? Ton inscription devra être refaite.'))return;
 try{localStorage.removeItem(DK);localStorage.removeItem(FK)}catch(e){}try{await ELEVE.supprimer()}catch(e){}location.reload()};

/* ---- Démarrage ---- */
appliquerCfg();
try{const s=localStorage.getItem(DK);if(s)ecrire(JSON.parse(s))}catch(e){}
try{const ds=localStorage.getItem(FK);if(ds&&!A.manques(lire()).length)montre(lire(),ds)}catch(e){}
{const c=cfgStock();$('etabIn').value=c.etab||'';$('villeIn').value=c.ville||''}etat();cotisInit();
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
window.__monAS={lire,ecrire,creer,sig};
})();
