from playwright.sync_api import sync_playwright
CSV="Élèves;Né(e) le;Classe de rattachement;Régime\nDUPONT-MARTIN Léa;12/04/2009;2NDE MELEC;Externe\nDUPONT Léo;01/01/2009;2NDE MELEC;Externe\nBERNARD Tom;05/05/2008;1ERE CAP;DP\nMARTIN Zoé;07/07/2009;2NDE MELEC;Externe\n"
ENT=open('/home/claude/vinztoc/appel_as_qrcodes_rgpd/Fichier_exemple_inscriptions_AS.csv',encoding='utf-8-sig').read()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    ctx=b.new_context(viewport={'width':430,'height':900},accept_downloads=True);pg=ctx.new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.on('dialog',lambda d:d.accept())
    pg.goto('http://localhost:8802/index.html');pg.wait_for_timeout(400)
    pg.evaluate("async c=>{await EPS.importFile(new File([c],'p.csv'));await __gas.load()}",CSV)
    print('élèves:',pg.evaluate("__gas.L.length"))
    # 1) QR avec faute de frappe -> à vérifier ; exact -> certain
    qr_ok='["ASI1","Dupont-Martin","lea","2NDE MELEC","2009-04-12","Amiens","F","M","Anne Dupont","0612345678","anne@ex.fr",33,1,0,"",1,"123456","","2026-11-27"]'
    qr_typo='["ASI1","Dupont Martn","Léa","2NDE MELEC","2009-04-12","Amiens","F","M","Anne Dupont","0612345678","anne@ex.fr",33,1,0,"",1,"","","2026-11-27"]'
    qr_dup='["ASI1","DUPONT","Zoe","2NDE MELEC","2009-07-07","Amiens","F","P","X Dupont","0612345678","x@ex.fr",1,0,0,"",1,"","","2026-11-27"]'
    print(pg.evaluate("t=>__gas.traiteTexte(t)",qr_ok), 'queue',pg.evaluate("__gas.queue.length"))
    pg.evaluate("t=>__gas.traiteTexte(t)",qr_typo);pg.evaluate("t=>__gas.traiteTexte(t)",qr_dup)
    print('queue',pg.evaluate("__gas.queue.map(q=>q.nom+'/'+q.cands.length+'/'+q.notes[0])"))
    pg.screenshot(path='/tmp/p1.png',full_page=False)
    # lier la 1re file au candidat
    pg.locator('[data-lie]').first.click();pg.wait_for_timeout(300)
    print('queue après lien',pg.evaluate("__gas.queue.length"))
    print('inscrits:',pg.inner_text('#kpis').replace('\n',' '))
    # import ENT legacy
    print(pg.evaluate("c=>__gas.importeFichier(new File([c],'ent.csv'))",ENT))
    print('queue',pg.evaluate("__gas.queue.length"),'élèves',pg.evaluate("__gas.L.length"))
    # fiche
    pg.evaluate("__gas.fiche(__gas.L.find(e=>e.nom.startsWith('DUPONT-')).id)");pg.wait_for_timeout(200);pg.screenshot(path='/tmp/p2.png')
    pg.fill('#fLic','987654');pg.check('#fCoti');pg.click('#fOk');pg.wait_for_timeout(300)
    # cartes
    pg.click('[data-p=p-car]');pg.check('#cAll');pg.click('#cPng');pg.wait_for_timeout(200)
    with pg.expect_download() as d: pg.click('#cPdf')
    print('pdf',d.value.suggested_filename);pg.screenshot(path='/tmp/p3.png')
    # appel manuel
    pg.click('[data-p=p-app]');pg.fill('#aAct','Badminton');pg.fill('#aQ','dupont');pg.wait_for_timeout(200)
    pg.locator('[data-ok]').first.click();pg.wait_for_timeout(300)
    print('présents',pg.inner_text('#aN'));pg.screenshot(path='/tmp/p4.png',full_page=True)
    # scan carte (logique)
    print('carte match:',pg.evaluate("(()=>{const e=__gas.L.find(x=>x.nom.startsWith('BERNARD'));return ASCORE.cardPayload({nom:e.nom,prenom:e.prenom,classe:e.classe})})()"))
    # exports
    pg.click('[data-p=p-don]')
    for s in ['#xAS','#xAll','#xOpuss']:
        with pg.expect_download() as d: pg.click(s)
        print(s,d.value.suggested_filename); d.value.save_as('/tmp/'+d.value.suggested_filename)
    print('errs',errs);b.close()
