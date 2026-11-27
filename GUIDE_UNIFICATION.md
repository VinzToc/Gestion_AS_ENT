# Mon AS + Gestion AS — guide de mise en place

Deux applications statiques (aucun serveur, 100 % local, RGPD) qui remplacent « Gestion AS via l'ENT », « Gestion AS Pronote » et le formulaire d'inscription.

| Dossier | Rôle | À déposer dans |
|---|---|---|
| `mon-as/` | App **élève** : fiche d'inscription 2026-2027, signatures élève + responsable, carte d'AS, QR d'inscription | portail *Applis EPS Élèves* |
| `gestion-as/` | App **professeur** : réception, rapprochement, fiches, cartes, appel, exports | portail *Mes Apps EPS* (prof) |

## Parcours
1. L'élève ouvre **Mon AS**, remplit la fiche, fait signer son responsable → la **carte d'AS** n'est créée que lorsque tous les éléments obligatoires (20 contrôles) et les 2 signatures sont présents.
2. Il remet au professeur : le **QR d'inscription** (flashé) ou le **.xlsx** ; le **dossier PDF signé** (adresse + signatures) peut être imprimé.
3. Dans **Gestion AS**, le nom saisi par l'élève est rapproché de la liste Pronote du portail (exact, ordre inversé, fautes, prénom partiel, homonymes par classe/naissance). Cas douteux → file **« À rapprocher »** (propositions, recherche, création).
4. Le professeur complète : cotisation, licence, jeune officiel, dossier papier ; imprime les **cartes** (10 par page A4) ; fait l'**appel** en flashant les cartes ; exporte (classeur AS, global portail, CSV OPUSS).

## Données (classeur .xlsx du portail)
- `inscription_as` (fiche élève), `gestion_as` (Inscrit, Cotisation, Dossier_papier, Licence, Jeune_officiel, Notes), `gestion_as_presences` (Date, Activite, Presence — une ligne par présence).
- Le QR d'inscription ne contient NI adresse NI signature.

## Intégration au portail
- Copier `eps-core.js` (v2.4, rétro-compatible v2.3) dans chaque application.
- apps.json côté prof : remplacer `appel_qr` / `appel_qr_pronote` par
  `{"id":"gestion_as","nom":"Gestion AS","url":"gestion-as/index.html"}`
- apps.json côté élèves : ajouter `{"id":"mon_as","nom":"Mon AS","url":"mon-as/index.html"}`
  (adapter les clés au schéma exact de vos apps.json).
- Si `as-core.js` est modifié, le recopier à l'identique dans les deux dossiers.

## Reprise des anciens fichiers
Onglet **Inscriptions → Importer un fichier** : CSV ENT (colonne « Utilisateur ») ou sauvegarde de « Gestion AS Pronote » (présences incluses). Les élèves reconnus sont rapprochés automatiquement, les autres vont dans « À rapprocher ».

## ⚠ À faire avant mise en service
1. **Textes légaux** : `mon-as/textes-legaux.js` contient des textes provisoires (droit à l'image, données personnelles, assurances) et la phrase d'autorisation parentale est à aligner sur la fiche papier. Copier les textes officiels (page 2 de la fiche non reçue).
2. Faire valider par le chef d'établissement / le DPD la valeur de la **signature à l'écran** du responsable et l'archivage du dossier PDF.
3. Compléter les coordonnées du DPD dans `confidentialite.html` des deux apps.
4. Le sexe est demandé (statistiques / OPUSS). Licence et jeune officiel sont facultatifs côté élève (« en attente » sur la carte).
5. Sur iOS, l'icône d'écran d'accueil transparente peut recevoir un fond noir (limite du système).
