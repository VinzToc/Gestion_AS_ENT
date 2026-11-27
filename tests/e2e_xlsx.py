from playwright.sync_api import sync_playwright
import base64
CSV="Élèves;Né(e) le;Classe de rattachement;Régime\nDUPONT-MARTIN Léa;12/04/2009;2NDE MELEC;Externe\n"
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']);pg=b.new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8802/index.html');pg.wait_for_timeout(300)
    pg.evaluate("async c=>{await EPS.clear();await EPS.importFile(new File([c],'p.csv'));await __gas.load()}",CSV)
    x=base64.b64encode(open('/tmp/eleve.xlsx','rb').read()).decode()
    print(pg.evaluate("async x=>{const b=Uint8Array.from(atob(x),c=>c.charCodeAt(0));return __gas.importeFichier(new File([b],'eleve.xlsx'))}",x))
    print(pg.evaluate("JSON.stringify([__gas.L[0].ext.inscription_as,__gas.L[0].ext.gestion_as])")[:400],'queue',pg.evaluate("__gas.queue.length"))
    print(errs);b.close()
