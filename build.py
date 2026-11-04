"""Gera index.html (documento completo, para GitHub Pages e cópia local) a partir de app.html (formato Artifact)."""
import pathlib, sys

here = pathlib.Path(__file__).resolve().parent
src = (here / "app.html").read_text(encoding="utf-8")
marker = "<!-- /head -->"
if marker not in src:
    sys.exit("marcador <!-- /head --> não encontrado")
head_part, body_part = src.split(marker, 1)

SITE = "https://fellipecramos.github.io/amigox/"

favicon = (
    "data:image/svg+xml,"
    "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E"
    "%3Crect x='5' y='9' width='38' height='30' rx='3' fill='%23FFF8E7' stroke='%23D9C690' stroke-width='1.5'/%3E"
    "%3Cpath d='M5 19 L24 28.5 L43 19' fill='none' stroke='%23D9C690' stroke-width='1.5'/%3E"
    "%3Ccircle cx='24' cy='28' r='8' fill='%23F2C14E'/%3E"
    "%3Cpath d='M21 25l6 6M27 25l-6 6' stroke='%230E3B66' stroke-width='2.6' stroke-linecap='round'/%3E"
    "%3C/svg%3E"
)

meta = f"""<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Toque para descobrir quem você tirou no Amigo X da SEMAM Fundão. O link é só seu.">
<meta property="og:title" content="Seu papelzinho do Amigo X chegou 🎁">
<meta property="og:description" content="Toque para descobrir quem você tirou. O link é só seu: não encaminhe.">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Amigo X da SEMAM">
<meta property="og:url" content="{SITE}">
<meta property="og:image" content="{SITE}preview.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="800">
<meta property="og:image:alt" content="Papelzinho dobrado com um selo dourado: seu papelzinho do Amigo X chegou.">
<meta property="og:locale" content="pt_BR">
<meta name="twitter:card" content="summary_large_image">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#0E3B66">
<link rel="icon" href="{favicon}">
"""

doc = (
    "<!doctype html>\n<html lang=\"pt-BR\">\n<head>\n"
    + meta
    + head_part.strip()
    + "\n</head>\n<body>\n"
    + body_part.strip()
    + "\n</body>\n</html>\n"
)
(here / "index.html").write_text(doc, encoding="utf-8")
print("index.html", len(doc.encode("utf-8")), "bytes")
