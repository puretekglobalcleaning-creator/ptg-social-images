"""Puretek Global Cleaning blog post builder.
Usage: python3 build_post.py <site_clone_dir> <post.json> <body.html> <images_dir> <out_dir>
post.json: {"slug","date_iso","date_txt","title_tag","h1","desc","lead_image","about":[...],"crumb"}
body.html uses {{IMG:name.jpg}} (files in images_dir; logo.png comes from the site) and {{DATE}}.
Writes <out_dir>/blog/<slug>.html (production) and <out_dir>/PREVIEW - <slug>.html (images inlined),
plus <out_dir>/blog/index.html (new card prepended) and <out_dir>/sitemap.xml (url appended)."""
import re, json, base64, os, sys, html as H
SITE, CFG, BODY, IMGS, OUT = sys.argv[1:6]
S = os.path.dirname(os.path.abspath(__file__))
c = json.load(open(CFG)); body = open(BODY).read()
src = open(os.path.join(SITE, 'move-out.html')).read()
tracking = src[:src.index('<meta charset')]
css = re.search(r'<style>(.*?)</style>', src, re.S).group(1)
ab = lambda h: re.sub(r'(href|src)="(?!https?:|tel:|sms:|#|/|mailto:)([^"]+)"', r'\1="/\2"', h)
header = ab(re.search(r'<header>.*?</header>', src, re.S).group(0)).replace('class="link active"', 'class="link"')
footer = ab(re.search(r'<footer>.*?</footer>\s*<div class="mobile-bar">.*?</div>', src, re.S).group(0))
blog_css = open(os.path.join(S, 'blog.css')).read()
URL = f"https://puretekglobal.net/blog/{c['slug']}.html"
IMG = f"https://puretekglobal.net/assets/blog/{c['lead_image']}"
faqs = re.findall(r'<details[^>]*><summary>(.*?)</summary><p>(.*?)</p></details>', body)
ld = [{"@context":"https://schema.org","@type":"BlogPosting","headline":H.unescape(c['h1']),"description":c['desc'],"image":IMG,
  "datePublished":c['date_iso'],"dateModified":c['date_iso'],
  "author":[{"@type":"Person","name":"Donta Polk","jobTitle":"Owner","worksFor":{"@type":"Organization","name":"Puretek Global Cleaning"}},{"@type":"Person","name":"Kenia","worksFor":{"@type":"Organization","name":"Puretek Global Cleaning"}}],
  "publisher":{"@type":"Organization","name":"Puretek Global Cleaning","logo":{"@type":"ImageObject","url":"https://puretekglobal.net/assets/logo.png"}},
  "mainEntityOfPage":URL,"about":c.get('about',[]),"spatialCoverage":"Houston, TX"},
 {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":H.unescape(q),"acceptedAnswer":{"@type":"Answer","text":H.unescape(re.sub('<[^>]+>','',a))}} for q,a in faqs]},
 {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
   {"@type":"ListItem","position":1,"name":"Home","item":"https://puretekglobal.net/"},
   {"@type":"ListItem","position":2,"name":"Blog","item":"https://puretekglobal.net/blog/"},
   {"@type":"ListItem","position":3,"name":c.get('crumb',c['h1']),"item":URL}]}]
def b64(p): return ('data:image/png;base64,' if p.endswith('png') else 'data:image/jpeg;base64,') + base64.b64encode(open(p,'rb').read()).decode()
def page(preview):
    def img(m):
        n = m.group(1)
        if preview: return b64(os.path.join(SITE,'assets',n) if n=='logo.png' else os.path.join(IMGS,n))
        return '/assets/'+n if n=='logo.png' else '/assets/blog/'+n
    b = re.sub(r'\{\{IMG:([^}]+)\}\}', img, body).replace('{{DATE}}', c['date_txt'])
    h, f = header, footer
    if preview:
        b = b.replace(' loading="lazy"',''); lg = b64(os.path.join(SITE,'assets','logo.png')); h = h.replace('/assets/logo.png', lg); f = f.replace('/assets/logo.png', lg)
    head = (('' if preview else tracking) + '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
      f"<title>{c['title_tag']}</title>\n<meta name=\"description\" content=\"{c['desc']}\">\n<link rel=\"canonical\" href=\"{URL}\">\n"
      f"<meta property=\"og:title\" content=\"{c['h1']}\">\n<meta property=\"og:description\" content=\"{c['desc']}\">\n<meta property=\"og:type\" content=\"article\">\n"
      f"<meta property=\"og:url\" content=\"{URL}\">\n<meta property=\"og:image\" content=\"{IMG}\">\n"
      '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
      '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">\n'
      f'<style>{css}\n{blog_css}</style>\n' + ''.join(f'<script type="application/ld+json">{json.dumps(x)}</script>\n' for x in ld))
    return f'<!DOCTYPE html>\n<html lang="en">\n<head>\n{head}</head>\n<body>\n{h}\n{b}\n{f}\n</body></html>\n'
os.makedirs(os.path.join(OUT,'blog'), exist_ok=True)
open(os.path.join(OUT,'blog',c['slug']+'.html'),'w').write(page(False))
open(os.path.join(OUT,'PREVIEW - '+c['slug']+'.html'),'w').write(page(True))
idx = open(os.path.join(SITE,'blog','index.html')).read()
if c['slug'] not in idx:
    card = (f'<a class="bcard" href="/blog/{c["slug"]}.html"><img src="/assets/blog/{c["lead_image"]}" alt="" loading="lazy"><div class="bc"><div class="cat">{c.get("category","")}</div>'
            f'<h2>{c["h1"]}</h2><p>{c.get("card_desc",c["desc"])}</p><div class="meta">Donta &amp; Kenia &middot; {c.get("date_short",c["date_txt"])} &middot; {c.get("read_time","5 min read")}</div></div></a>')
    i = idx.index('<a class="bcard"'); idx = idx[:i]+card+idx[i:]
open(os.path.join(OUT,'blog','index.html'),'w').write(idx)
sm = open(os.path.join(SITE,'sitemap.xml')).read()
if c['slug'] not in sm:
    j = sm.index('</urlset>'); sm = sm[:j]+f'  <url><loc>{URL}</loc><lastmod>{c["date_iso"]}</lastmod></url>\n'+sm[j:]
open(os.path.join(OUT,'sitemap.xml'),'w').write(sm)
print('built', c['slug'])
