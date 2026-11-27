/* Mon AS — application élève : fiche d'inscription, signatures, carte d'AS. 100 % local. */
(function(){
'use strict';
const A=window.ASCORE, $=id=>document.getElementById(id), DK='mon_as_brouillon_v1';
const form=$('form'), sig={sigEleve:null,sigResp:null};
let logo=null;
$('ver').textContent='v'+(window.VERSION||'');
$('tx-droit').textContent=TEXTES.droitImage.texte;$('tx-donnees').textContent=TEXTES.donnees.texte;$('tx-assurance').textContent=TEXTES.assurance.texte;
$('chips').innerHTML=A.ACT_AS.map((a,i)=>`<label class="chip"><input type="checkbox" name="act" value="${a}"><span>${a}</span></label>`).join('');
const img=new Image();img.onload=()=>{logo=img};img.src='img/logo-as.png';
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
 ['sigEleve','sigResp'].forEach(k=>{if(f[k]){const i=new Image();i.onload=()=>{const c=$(k);c.getContext('2d').drawImage(i,0,0,c.width,c.height);sig[k]=f[k]};i.src=f[k]}})}

function sauver(){try{localStorage.setItem(DK,JSON.stringify(lire()))}catch(e){}}
function etat(){const m=A.manques(lire());
 $('barTx').innerHTML=m.length?`${m.length} élément${m.length>1?'s':''} à compléter<small>La carte sera créée quand tout sera rempli et signé</small>`:'✅ Tout est complet<small>Tu peux créer ta carte</small>';
 return m}
function maj(){sauver();etat();form.querySelectorAll('.mq').forEach(e=>e.classList.remove('mq'))}
form.addEventListener('input',maj);form.addEventListener('change',maj);

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

/* ---- Création de la carte ---- */
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
const nomFichier=f=>'AS_'+A.norm(f.nom).toUpperCase()+'_'+A.tc(f.prenom).replace(/\s/g,'');
let cur=null;
async function creer(){
 const f=lire(),m=A.manques(f);
 if(m.length){$('manqueList').innerHTML=m.map(x=>`<li>• ${x.label}</li>`).join('');$('dlgManque').showModal();
  m.forEach(x=>{const el=form.querySelector(`[data-k="${x.k}"]`);if(el)el.classList.add('mq')});
  const first=form.querySelector('.mq');if(first)first.scrollIntoView({block:'center'});return}
 const ds=A.today(),d={nom:f.nom,prenom:f.prenom,classe:f.classe,licence:f.licence,jo:f.jo};
 try{await ELEVE.definir({nom:A.clean(f.nom),prenom:A.clean(f.prenom),classe:A.clean(f.classe)});
  await ELEVE.enregistrerChamps(A.ACT_ID,A.toRecord(f,ds))}catch(e){$('msg').textContent='Enregistrement local impossible : '+e.message}
 cur={f,d,ds};
 const cv=A.cardCanvas(document,d,{logo},1011),dst=$('cardcv');dst.width=cv.width;dst.height=cv.height;dst.getContext('2d').drawImage(cv,0,0);
 const q=A.makeQR(A.encodeInscription(f,ds),'M'),qc=$('qrIns');qc.width=qc.height=560;const x=qc.getContext('2d');A.drawQR(x,q,0,0,560);
 $('resultat').hidden=false;$('resultat').scrollIntoView({behavior:'smooth'})}
$('go').onclick=creer;$('manqueOk').onclick=()=>$('dlgManque').close();$('go').disabled=false;

$('dlPng').onclick=()=>{if(cur)$('cardcv').toBlob(b=>dl(b,nomFichier(cur.f)+'_carte.png'))};
$('dlCartePdf').onclick=()=>{if(!cur)return;const P=new jspdf.jsPDF({unit:'mm',format:'a4'});
 P.addImage($('cardcv').toDataURL('image/png'),'PNG',(210-85.6)/2,30,85.6,54);P.setFontSize(10);P.text('Découper suivant le contour.',105,92,{align:'center'});P.save(nomFichier(cur.f)+'_carte.pdf')};
$('dlXlsx').onclick=async()=>{try{await ELEVE.exporter([A.ACT_ID])}catch(e){$('msg').textContent=e.message}};
const ascii=s=>String(s==null?'':s).replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-');
$('dlDossier').onclick=()=>{if(!cur)return;const f=cur.f,P=new jspdf.jsPDF({unit:'mm',format:'a4'});let y=20;
 P.setFontSize(16);P.setFont('helvetica','bold');P.text(ascii("Fiche d'inscription "+A.SAISON+" - Association Sportive"),105,y,{align:'center'});y+=7;
 P.setFontSize(10);P.setFont('helvetica','normal');P.text(ascii(A.ETAB+' - '+A.VILLE),105,y,{align:'center'});y+=12;
 const L=(k,v)=>{P.setFont('helvetica','bold');P.text(ascii(k)+' :',20,y);P.setFont('helvetica','normal');const t=P.splitTextToSize(ascii(v||'-'),115);P.text(t,75,y);y+=5.6*t.length+1.4};
 L('Nom',f.nom.toUpperCase());L('Prénom',A.tc(f.prenom));L('Classe',f.classe);L('Né(e) le',A.frDate(f.naissance)+' à '+A.tc(f.lieu));L('Sexe',f.sexe==='M'?'Garçon':'Fille');
 y+=3;L('Responsable légal',f.respNom+' ('+f.qualite+')');L('Téléphone',f.tel);L('E-mail',f.mail);L('Adresse',f.adresse);
 y+=3;L('Activités',A.sortActs(f.acts).join(' ; '));L('Compétitions UNSS',f.compet==='1'?'Oui':'Non');L('Sport partagé / handisport',f.handi==='1'?'Oui':'Non');L('Club',f.club);
 y+=3;L('Autorisation parentale','Oui');L("Droit à l'image",f.droitImage==='1'?"J'autorise":"Je n'autorise pas");L('Données personnelles','Lues');L('Assurances','Lues');
 L('N° licence UNSS',f.licence||'en attente');if(f.jo)L('N° jeune officiel',f.jo);
 y+=6;P.setFont('helvetica','bold');P.text('Signature de l\'élève',20,y);P.text('Signature du responsable légal',115,y);y+=3;
 P.addImage(f.sigEleve,'PNG',20,y,75,23.6);P.addImage(f.sigResp,'PNG',115,y,75,23.6);y+=30;
 P.setFont('helvetica','normal');P.setFontSize(8);P.text(ascii('Signé électroniquement le '+A.frDate(cur.ds)+' sur l\'application Mon AS.'),20,y);
 P.save(nomFichier(f)+'_dossier.pdf')};

$('efface').onclick=async()=>{if(!confirm('Effacer toutes tes données de cet appareil ?'))return;
 try{localStorage.removeItem(DK)}catch(e){}try{await ELEVE.supprimer()}catch(e){}location.reload()};

/* ---- Démarrage ---- */
try{const s=localStorage.getItem(DK);if(s)ecrire(JSON.parse(s))}catch(e){}
etat();
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
window.__monAS={lire,ecrire,creer,sig};
})();
