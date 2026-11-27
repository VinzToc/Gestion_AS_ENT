from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(); pg.set_content('<canvas id=c></canvas><script>document.title=!!document.getElementById("c").getContext("2d")+" "+typeof indexedDB</script>')
    print(pg.title()); b.close()
