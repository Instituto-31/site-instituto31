# Acrescentos de SEO aplicados ao HTML final de cada página (27/11/2026)
import json, re

BASE = "https://instituto31.pt/"
ESTRADA = '<div aria-hidden="true" style="height: 64px; background: #2B2F33'

TESTES = [("testes-de-tvde/", "Testes de TVDE"), ("testes-de-taxi/", "Testes de Táxi (CMT)"),
          ("testes-adr/", "Testes ADR"), ("testes-conselheiro-de-seguranca/", "Testes de Conselheiro de Segurança")]

NAV_TESTES = ('<nav aria-label="Testes grátis" style="display: flex; flex-direction: column; gap: 8px">'
              '<strong style="color: #FFFFFF">Testes grátis</strong>'
              + "".join(f'<a href="/{u}">{t}</a>' for u, t in TESTES) + '</nav>')

TESTE_CURSO = {
    "Curso-TVDE": ("testes-de-tvde/", "TVDE"), "Curso-TVDE-Continua": ("testes-de-tvde/", "TVDE"),
    "Curso-Taxi-Inicial": ("testes-de-taxi/", "Táxi (CMT)"), "Curso-Taxi-Continua": ("testes-de-taxi/", "Táxi (CMT)"),
}
for n in ["Curso-ADR-Base-Inicial", "Curso-ADR-Base-Reciclagem", "Curso-ADR-BaseCisternas-Inicial", "Curso-ADR-BaseCisternas-Reciclagem", "Curso-ADR-Cisternas-Inicial", "Curso-ADR-Cisternas-Reciclagem"]:
    TESTE_CURSO[n] = ("testes-adr/", "ADR")


def bloco_testes(url, nome):
    return (f'<section aria-label="Treinar para o exame" style="background: #F4F6F8"><div style="max-width: 1240px; margin: 0 auto; padding: 40px 24px; display: flex; flex-wrap: wrap; gap: 16px 32px; align-items: center; justify-content: space-between">'
            f'<div style="flex: 1 1 420px"><h2 style="margin: 0 0 6px; font-size: 26px">Treine para o exame de {nome}</h2>'
            f'<p style="margin: 0; font-size: 17px; color: #3C4248">Perguntas do banco oficial do IMT, com correção na hora. Experimente grátis antes do curso.</p></div>'
            f'<a href="/{url}" style="display: inline-block; padding: 14px 24px; border-radius: 999px; background: #111111; color: #FFFFFF; font-weight: 800; text-decoration: none">Fazer testes grátis de {nome} →</a>'
            f'</div></section>')


FAQ_PSI = [
    ("Quem tem de fazer o psicotécnico?",
     "A avaliação psicológica é obrigatória para candidatos a condutor e condutores do Grupo 2: pesados de mercadorias e de passageiros (C, CE, D, DE) e ligeiros com averbamento do Grupo 2, como TVDE, táxi, ambulâncias e transporte escolar. No Grupo 1 só é pedida quando o médico a recomenda."),
    ("Na renovação da carta também é preciso?",
     "Para os condutores do Grupo 2, a avaliação psicológica é exigida na revalidação aos 50 anos. Se tiver dúvidas sobre o seu caso, ligue-nos antes de marcar."),
    ("Quanto custa?",
     "35 € em português. 25 € para formandos do Instituto 31, com o código de formando. 70 € em inglês ou francês. Paga por MB WAY no momento da marcação."),
    ("Quanto tempo demora e quando tenho o resultado?",
     "A obtenção demora cerca de 1h30 e a renovação cerca de 50 minutos. O relatório é entregue na hora."),
    ("O que tenho de levar?",
     "Cartão de cidadão ou passaporte, carta de condução se já tiver, e óculos ou lentes se usar."),
    ("O psicotécnico substitui o atestado médico?",
     "Não. São documentos diferentes: o atestado médico é passado por um médico e a avaliação psicológica por um psicólogo. Conforme a categoria, pode precisar dos dois."),
    ("Posso fazer a avaliação noutra língua?",
     "Sim, em português, inglês ou francês. Escolha a língua ao marcar."),
    ("Posso alterar ou cancelar?",
     "Sim, sem custos até 24 horas antes, por telefone ou WhatsApp (916 31 31 31)."),
]


def bloco_faq(faq):
    itens = "".join(
        f'<details style="border-bottom: 1px solid #E3E6EA; padding: 16px 0"><summary style="cursor: pointer; font-weight: 700; font-size: 18px">{q}</summary>'
        f'<p style="margin: 10px 0 0; font-size: 17px; line-height: 1.55; color: #3C4248">{a}</p></details>' for q, a in faq)
    return (f'<section aria-labelledby="faq-psi" style="background: #FFFFFF"><div style="max-width: 860px; margin: 0 auto; padding: 56px 24px">'
            f'<h2 id="faq-psi" style="margin: 0 0 12px; font-size: 32px">Perguntas frequentes sobre o psicotécnico</h2>{itens}</div></section>')


def ld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False) + '</script>'


NEGOCIO = {
    "@type": ["LocalBusiness", "EducationalOrganization"], "@id": BASE + "#instituto31",
    "name": "Instituto 31", "url": BASE, "telephone": "+351916313131", "email": "geral@instituto31.pt",
    "image": BASE + "assets/rececao.jpg", "logo": BASE + "assets/logo.svg", "priceRange": "€",
    "address": {"@type": "PostalAddress", "streetAddress": "Rua Doutor João Afonso de Almeida 315 R/C", "postalCode": "4800-045", "addressLocality": "Guimarães", "addressCountry": "PT"},
    "areaServed": ["Guimarães", "Braga", "Vizela", "Fafe", "Famalicão", "Felgueiras"],
}


def ld_psi(url):
    servico = {"@type": "Service", "name": "Avaliação psicológica de condutores (psicotécnico)", "serviceType": "Psicotécnico para carta de condução",
               "provider": {"@id": BASE + "#instituto31"}, "areaServed": NEGOCIO["areaServed"], "url": url,
               "offers": {"@type": "Offer", "price": "35.00", "priceCurrency": "EUR", "url": url + "#marcar"}}
    faq = {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ_PSI]}
    return ld({"@context": "https://schema.org", "@graph": [NEGOCIO, servico, faq]})


def aplicar(name, fname, html):
    url = BASE + ("" if fname == "index.html" else fname)
    # canónico
    html = html.replace("</head>", f'<link rel="canonical" href="{url}">\n</head>', 1)
    # rodapé: testes grátis + âncora certa dos cursos
    html = html.replace('<a href="/#formacao">Todos os cursos</a>', '<a href="/#cursos">Todos os cursos</a>')
    html = re.sub(r'(<nav aria-label="Informação")', NAV_TESTES + r'\n\1', html, count=1)
    html = html.replace('<a href="Multas.html">Contestação de multas</a>', '<a href="Psicotecnico-Braga.html">Psicotécnico perto de Braga</a><a href="Multas.html">Contestação de multas</a>', 1)
    if name in TESTE_CURSO and ESTRADA in html:
        u, n = TESTE_CURSO[name]
        html = html.replace(ESTRADA, bloco_testes(u, n) + "\n" + ESTRADA, 1)
    if name == "Main":
        html = html.replace("</head>", ld({"@context": "https://schema.org", **NEGOCIO}) + "\n</head>", 1)
    if name == "Psicotecnicos":
        html = html.replace(ESTRADA, bloco_faq(FAQ_PSI) + "\n" + ESTRADA, 1)
        html = html.replace("</head>", ld_psi(url) + "\n</head>", 1)
    return html


def pagina_braga(html_psi):
    """Página local para quem procura em Braga: mesma marcação, texto próprio."""
    h = html_psi
    h = re.sub(r"<title>.*?</title>", "<title>Psicotécnico perto de Braga — 35 €, marcação online · Instituto 31</title>", h, count=1)
    desc = "Psicotécnico para condutores de Braga: a cerca de 25 minutos, em Guimarães. 35 €, relatório na hora, marcação e pagamento MB WAY online."
    h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', h, count=1)
    h = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{desc}">', h, count=1)
    h = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="Psicotécnico perto de Braga · Instituto 31">', h, count=1)
    h = h.replace('href="https://instituto31.pt/Psicotecnicos.html">', 'href="https://instituto31.pt/Psicotecnico-Braga.html">')
    h = h.replace('"url": "https://instituto31.pt/Psicotecnicos.html"', '"url": "https://instituto31.pt/Psicotecnico-Braga.html"')
    h = h.replace("https://instituto31.pt/Psicotecnicos.html#marcar", "https://instituto31.pt/Psicotecnico-Braga.html#marcar")
    m = re.search(r"(<h1[^>]*>)(.*?)(</h1>)", h, re.S)
    intro = ('<p style="margin: 12px 0 0; font-size: 19px; line-height: 1.5; max-width: 640px">Mora ou trabalha em Braga? O Instituto 31 fica em Guimarães, '
             'a cerca de 25 minutos pela A11. Psicotécnico para carta de condução (Grupo 2, pesados, TVDE, táxi, ADR) por 35 €, com o relatório entregue na hora. '
             'Marque e pague já aqui, por MB WAY.</p>')
    if m:
        h = h[:m.start()] + m.group(1) + "Psicotécnico perto de Braga, a 25 minutos." + m.group(3) + intro + h[m.end():]
    return h
