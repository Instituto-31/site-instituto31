"""Converte as pranchas .dc.html em páginas estáticas para publicar em instituto31.pt."""
import re, shutil, os, json

SRC = "/home/claude/i31/project"
OUT = "/home/claude/site/dist"
THEME = dict(ink='#111111', accent='#0670C2', onAccent='#FFFFFF', bright='#0A8AE6', ground='#F4F6F8', line='#E3E6EA',
             line2='#C9CED4', input='#A3AAB2', muted='#555B63', muted2='#3C4248', onDarkMuted='#C8CDD3', darkLine='#3A3F45',
             placeholder='#E6E9EC', num='#0670C2')
BLOBS = {"0daeba7c5090eae07b5ead2f0671b826": "assets/logo.svg", "551d4d7163d18cf936d143b3b82488c4": "assets/logo-branco.svg",
         "7c67a16b504a38457d90dc83848effd0": "assets/sala.jpg", "abf781fc22781900b9bf55be6a3ab24e": "assets/gabinete.jpg",
         "c5c1d5665ed80ad20768e5c74695774d": "assets/rececao.jpg", "71657e21de80d9dd337d3e364f673966": "assets/espera.jpg"}
SKIP = {"Main-v2", "Main-verdes", "Psicotecnicos-verdes", "Mobile-1-Hora", "Mobile-2-Pagamento", "Mobile-3-Confirmado", "Ficha-Inscricao"}
API = "https://dzccpluaszhcroehktrg.supabase.co/functions/v1"

DESC = {
    "Main": "Formação TVDE, CAM, Táxi, ADR e transporte de crianças em Guimarães. Psicotécnicos todos os dias, com marcação e pagamento online.",
    "Psicotecnicos": "Avaliação psicológica de condutores (psicotécnico) em Guimarães: 35 €, relatório na hora, marcação e pagamento MB WAY online.",
}

MARCAR = '<section id="marcar" data-lingua="{lang}" aria-labelledby="marcar-t" style="flex: 1 1 400px; min-width: 0; background: #FFFFFF; color: #111111; border-radius: 22px; padding: 28px; display: flex; flex-direction: column; gap: 16px"><noscript>Para marcar online ative o JavaScript, ou ligue 916 31 31 31.</noscript></section>'

PRE_ASIDE_FORM = """<form class="pedido" data-tipo="{tipo}" data-curso="{curso}" style="display: flex; flex-direction: column; gap: 14px">
<input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position: absolute; left: -9999px">
<p style="margin: 0; padding: 12px 14px; border-radius: 10px; background: #F4F6F8; font-size: 15px"><strong>Próximas datas:</strong> confirmamos consigo por telefone. A inscrição fica válida com 80 €, descontados no preço.</p>
<label style="display: flex; flex-direction: column; gap: 6px; font-weight: 500; font-size: 15px">Nome<input name="nome" type="text" required autocomplete="name" style="font: inherit; font-weight: 400; padding: 12px 14px; border: 1px solid #A3AAB2; border-radius: 8px"></label>
<label style="display: flex; flex-direction: column; gap: 6px; font-weight: 500; font-size: 15px">Telemóvel<input name="telemovel" type="tel" required autocomplete="tel" style="font: inherit; font-weight: 400; padding: 12px 14px; border: 1px solid #A3AAB2; border-radius: 8px"></label>
<label style="display: flex; flex-direction: column; gap: 6px; font-weight: 500; font-size: 15px">Email<input name="email" type="email" autocomplete="email" style="font: inherit; font-weight: 400; padding: 12px 14px; border: 1px solid #A3AAB2; border-radius: 8px"></label>
<label style="display: flex; flex-direction: column; gap: 6px; font-weight: 500; font-size: 15px">Preferência de horário (opcional)<select name="horario" style="font: inherit; font-weight: 400; padding: 12px 14px; border: 1px solid #A3AAB2; border-radius: 8px; background: #fff"><option value="">Indiferente</option><option>Laboral</option><option>Pós-laboral</option><option>Sábados</option></select></label>
{extra}
<label style="display: flex; gap: 10px; align-items: flex-start; font-size: 14px; color: #3C4248"><input name="marketing" type="checkbox" style="width: 20px; height: 20px; margin: 0; flex: none"> Quero receber por email o lembrete de renovação do certificado e novidades de formação (opcional).</label>
<label style="display: flex; gap: 10px; align-items: flex-start; font-size: 14px; color: #3C4248"><input name="rgpd" type="checkbox" required style="width: 20px; height: 20px; margin: 0; flex: none"> Li e aceito a <a href="Privacidade.html">Política de Privacidade</a>.</label>
<button type="submit" style="font: inherit; cursor: pointer; border: 0; text-align: center; font-weight: 800; font-size: 17px; padding: 16px; background: #0670C2; color: #FFFFFF; border-radius: 999px">{botao}</button>
<p class="pedido-msg" role="status" style="margin: 0; font-size: 14px"></p>
</form>"""

FORM_JS = """<script>
document.querySelectorAll('form.pedido').forEach(function (f) {
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = f.querySelector('.pedido-msg'), b = f.querySelector('button[type=submit]');
    var g = function (n) { var el = f.elements[n]; return el ? (el.type === 'checkbox' ? el.checked : el.value) : ''; };
    if (!g('rgpd')) { msg.textContent = 'Aceite a Política de Privacidade.'; return; }
    b.disabled = true; msg.style.color = '#555B63'; msg.textContent = 'A enviar…';
    var dados = {}, base = ['nome','email','telemovel','rgpd','marketing','website'];
    Array.prototype.forEach.call(f.elements, function (el) { if (!el.name || base.indexOf(el.name) >= 0) return; if (el.type === 'checkbox') { if (!el.checked) return; if (el.value && el.value !== 'on') { (dados[el.name] = dados[el.name] || []).push(el.value); } else dados[el.name] = true; } else if (el.value) dados[el.name] = el.value; });
    fetch('""" + API + """/pedido-site', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: f.dataset.tipo, curso: f.dataset.curso, nome: g('nome'), email: g('email'), telemovel: g('telemovel'), marketing: g('marketing'), rgpd: true, website: g('website'), dados: dados }) })
      .then(function (r) { if (!r.ok) throw 0; f.reset(); msg.style.color = '#0670C2'; msg.textContent = f.dataset.tipo === 'aviso_abertura' ? 'Obrigado! Avisamos assim que abrirem inscrições.' : (f.dataset.tipo === 'contacto' ? 'Recebido! Envie agora a notificação por WhatsApp (916 31 31 31) e respondemos com a análise.' : 'Recebido! Ligamos-lhe nos próximos dias úteis.'); })
      .catch(function () { msg.style.color = '#B42318'; msg.textContent = 'Não foi possível enviar. Ligue 916 31 31 31 ou use o WhatsApp.'; })
      .finally(function () { b.disabled = false; });
  });
});
</script>"""


def theme(s):
    s = re.sub(r"\{\{\s*t\.(\w+)\s*\}\}", lambda m: THEME[m.group(1)], s)
    return s


def links(s):
    s = s.replace('href="Main.dc.html#', 'href="/#').replace('href="Main.dc.html"', 'href="/"')
    s = re.sub(r'href="([A-Za-z0-9\-]+)\.dc\.html', r'href="\1.html', s)
    s = s.replace('Ficha-Inscricao.html', '#inscricao')
    for k, v in BLOBS.items():
        s = s.replace("/_blob/" + k, v)
    return s


def page(name):
    raw = open(f"{SRC}/{name}.dc.html", encoding="utf-8").read()
    title = re.search(r"<title>(.*?)</title>", raw, re.S).group(1)
    helmet = re.search(r"<helmet>(.*?)</helmet>", raw, re.S).group(1)
    body = re.search(r"</helmet>(.*)</x-dc>", raw, re.S).group(1)
    lang = 'en' if name.endswith('-EN') else 'fr' if name.endswith('-FR') else 'pt-PT'

    # placeholders comuns
    body = body.replace('<span>Próxima turma TVDE: [dd/mm]</span>', '<span>Psicotécnicos com marcação e pagamento MB WAY online</span>')
    body = body.replace('[24 h]', '24 h')
    body = body.replace('MB WAY, Multibanco reference or card.', 'MB WAY.').replace('MB WAY, référence Multibanco ou carte.', 'MB WAY.').replace('receba a confirmação por SMS.', 'receba a confirmação por email.')
    body = re.sub(r'<span>Multibanco</span><span>Visa · Mastercard</span>', '', body)
    body = body.replace('MB WAY, Multibanco ou cartão', 'Pagamento MB WAY na hora').replace('Lembrete por SMS na véspera', 'Confirmação por email').replace('Escolha a turma e garanta a vaga.', 'Deixe o contacto e ligamos-lhe com as datas.')
    body = re.sub(r'<a href="#">(Facebook|Instagram)</a>', '', body)
    # DGERT: certificação concedida a 26/11/2026 (processo C6171)
    body = body.replace('Formação, saúde e consultoria rodoviária em Guimarães desde 2019.', 'Formação, saúde e consultoria rodoviária em Guimarães desde 2019. Entidade formadora certificada pela DGERT.')
    body = body.replace('>Reconhecido pelo IMT</a>', '>Reconhecido pelo IMT</a><span>Certificado pela DGERT</span>')
    body = body.replace('Formação, conformidade legal, psicotécnicos e gestão da empresa, com uma equipa que conhece o setor rodoviário.</p>', 'Formação, conformidade legal, psicotécnicos e gestão da empresa, com uma equipa que conhece o setor rodoviário. Entidade formadora certificada pela DGERT (áreas 729 Saúde, 840 Serviços de transporte, 861 Proteção de pessoas e bens e 862 Segurança e higiene no trabalho): a formação conta para as horas obrigatórias dos seus trabalhadores.</p>')

    if name == "Main":
        body = re.sub(r'<section id="marcar".*?</sc-if>\s*</section>', MARCAR.format(lang='pt'), body, flags=re.S)
        body = body.replace('Vagas reais', 'Vagas reais')
        # turmas: sem datas definidas
        body = body.replace('<span style="font-size: 13px; font-weight: 600; letter-spacing', '<span style="font-size: 11px; font-weight: 600; letter-spacing')
        body = re.sub(r'>\[dd\]<', '>Nova<', body)
        body = re.sub(r'>\[MÊS\]<', '>TURMA<', body)
        body = re.sub(r'<a href="Curso-ADR-BaseCisternas-Reciclagem\.dc\.html"[^>]*>.*?</a>\s*', '', body, flags=re.S)
        body = re.sub(r'<span[^>]*>ÚLTIMAS VAGAS</span>', '', body)
        body = body.replace('Devolução se a turma atrasar mais de 60 dias.</p>', 'Devolução se a turma atrasar mais de 60 dias. Datas confirmadas por telefone.</p>')
    if name in ("Psicotecnicos", "Psicotecnicos-EN", "Psicotecnicos-FR"):
        if name == "Psicotecnicos":
            body = re.sub(r'<section aria-labelledby="fluxo".*?</section>(?=\s*<aside aria-label="Resumo")', MARCAR.format(lang='pt').replace('flex: 1 1 400px', 'flex: 999 1 560px; border: 1px solid #E3E6EA'), body, count=1, flags=re.S)
            body = re.sub(r'(<aside aria-label="Resumo"[^>]*>)\s*<div[^>]*>\s*<h2[^>]*>Resumo</h2>.*?</div>\s*</div>', r'\1', body, count=1, flags=re.S)
            body = body.replace(' [Confirmar política]', '')
            body = re.sub(r'<div[^>]*>\[Foto\]</div>', '', body)
        else:
            # páginas EN/FR: substitui o bloco de marcação estático, se existir, pelo widget
            body = re.sub(r'(<section id="book"[^>]*>).*?(</section>)', lambda m: m.group(1) + '<div style="max-width: 760px; margin: 0 auto; padding: 56px 24px">' + MARCAR.format(lang=lang[:2]).replace('aria-labelledby="marcar-t"', 'aria-labelledby="marcar-t" style2') + '</div>' + m.group(2), body, count=1, flags=re.S)
            body = body.replace(' style2', '')
    if name.startswith("Curso-"):
        # FAQ sem resposta: remove
        body = re.sub(r'<details[^>]*>(?:(?!</details>).)*?\[Resposta\].*?</details>', '', body, flags=re.S)
        curso = re.search(r'<h1[^>]*>(.*?)</h1>', body, re.S).group(1)
        curso = re.sub(r'<[^>]+>', '', curso).strip()
        breve = 'Avise-me' in body or 'Brevemente' in body
        aside = re.search(r'(<aside aria-labelledby="inscricao"[^>]*>)(.*?)(</aside>)', body, re.S)
        if aside:
            inner = aside.group(2)
            head_m = re.search(r'^(.*?</h2>(?:\s*<p[^>]*>.*?</p>)?)', inner, re.S)
            head = head_m.group(1) if head_m else ''
            # mantém título + preço; troca o resto pelo formulário real
            preco_m = re.search(r'(<div[^>]*>\s*<span[^>]*>[^<]*€.*?</div>)', inner, re.S)
            if breve:
                form = PRE_ASIDE_FORM.format(tipo='aviso_abertura', curso=curso, extra='', botao='Avise-me quando abrir')
                form = form.replace('<p style="margin: 0; padding: 12px 14px; border-radius: 10px; background: #F4F6F8; font-size: 15px"><strong>Próximas datas:</strong> confirmamos consigo por telefone. A inscrição fica válida com 80 €, descontados no preço.</p>', '<p style="margin: 0; padding: 12px 14px; border-radius: 10px; background: #F4F6F8; font-size: 15px">Este curso abre brevemente. Deixe o contacto e avisamos assim que houver datas.</p>')
            else:
                extra = '' if 'Tacógrafo' in curso else '<label style="display: flex; gap: 10px; align-items: flex-start; font-size: 15px; padding: 12px 14px; border-radius: 10px; background: #F4F6F8"><input name="psico" type="checkbox" style="width: 18px; height: 18px; margin: 2px 0 0; flex: none"><span><strong>Juntar o psicotécnico por 25 €</strong> (em vez de 35 €)</span></label>'
                form = PRE_ASIDE_FORM.format(tipo='pre_inscricao', curso=curso, extra=extra, botao='Enviar pré-inscrição')
            body = body[:aside.start()] + aside.group(1) + head + form + aside.group(3) + body[aside.end():]
    if name in ("Multas", "Empresas"):
        tipo = 'contacto' if name == 'Multas' else 'empresa'
        def wire(fm):
            f = fm.group(0)
            f = f.replace('<form ', f'<form class="pedido" data-tipo="{tipo}" data-curso="{name}" ', 1).replace('<form>', f'<form class="pedido" data-tipo="{tipo}" data-curso="{name}">', 1)
            NM = {'Nome': 'nome', 'Pessoa de contacto': 'nome', 'Telemóvel': 'telemovel', 'Telefone': 'telemovel', 'Email': 'email'}
            def lab(m):
                txt = m.group(1).strip()
                key = NM.get(txt) or re.sub(r'[^a-z0-9]+', '_', txt.lower().replace('º', 'o').replace('ç', 'c').replace('ã', 'a').replace('é', 'e').replace('ó', 'o').replace('í', 'i'))[:30].strip('_')
                return m.group(0).replace('<input ', f'<input name="{key}" ', 1).replace('<textarea ', f'<textarea name="{key}" ', 1)
            f = re.sub(r'<label[^>]*>([^<]+)<(?:input|textarea) ', lab, f)
            f = re.sub(r'<label([^>]*)><input type="checkbox"([^>]*)>([^<]+)</label>', lambda m: f'<label{m.group(1)}><input type="checkbox" name="servicos" value="{m.group(3).strip()}"{m.group(2)}>{m.group(3)}</label>', f)
            f = f.replace('<input type="checkbox" required=""', '<input type="checkbox" name="rgpd" required=""')
            f = re.sub(r'<label[^>]*>Foto ou PDF da notificação<input[^>]*></label>', '<p style="margin: 0; font-size: 14px; color: #3C4248">Depois de enviar, mande a foto ou o PDF da notificação por WhatsApp para 916 31 31 31.</p>', f)
            f = f.replace('</form>', '<input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position: absolute; left: -9999px"><p class="pedido-msg" role="status" style="margin: 0; font-size: 14px"></p></form>')
            return f
        body = re.sub(r'<form.*?</form>', wire, body, count=1, flags=re.S)
        body = body.replace('Respondemos em [24 h úteis] com', 'Respondemos com')
    if name in ("Privacidade", "Cookies"):
        body = re.sub(r'Rascunho: texto-base a rever[^<]*', 'Versão provisória, em revisão jurídica.', body)
        body = body.replace('[dd/mm/aaaa]', '26/11/2026')
        body = body.replace('[Denominação social], NIF [xxx]', 'Instituto 31 – Formação, Saúde e Consultoria, Unipessoal Lda., NIF 515285471')
        body = body.replace('Fornecedor de envio de SMS [nome].', 'Brevo (envio de emails e SMS). Supabase (alojamento de dados na UE).')
        body = body.replace('Google (agenda de marcações). ', '')
        body = body.replace('dossiês técnico-pedagógicos [x anos], faturação 10 anos, processos clínicos de psicologia [x anos]. [Confirmar prazos]', 'dossiês técnico-pedagógicos e processos clínicos de psicologia pelo prazo exigido pela regulamentação aplicável; faturação 10 anos.')
        body = re.sub(r'<tr[^>]*>(?:(?!</tr>).)*(?:\[confirmar\]|\[se usarem\]).*?</tr>', '', body, flags=re.S)
    if name == "Curso-Tacografos":
        body = body.replace(' [confirmar]', '').replace('[x h]', 'A anunciar').replace('[Requisitos a definir]', 'Requisitos a anunciar com a abertura do curso.')
        body = re.sub(r'<li[^>]*>(?:(?!</li>).)*\[Confirmar programa\].*?</li>', '', body, flags=re.S)
    if name == "Multas":
        body = body.replace('a partir de [preço]', 'preço sob consulta').replace('Avença [preço]', 'Avença sob consulta')

    body = links(theme(body))
    helmet = theme(helmet).replace("&amp;display", "&display")
    leftover = sorted(set(re.findall(r"\{\{[^}]*\}\}|<sc-(?:if|for)", body)))
    ph = sorted(set(re.findall(r"\[(?:dd/mm|dias e horário|x|Resposta|Nome|Texto do testemunho|xxxxx|preço|n)\]", body)))
    desc = DESC.get(name.split('-')[0], DESC["Main"])
    scripts = ''
    if 'id="marcar"' in body:
        scripts += '<script src="assets/marcar.js" defer></script>'
    if 'class="pedido"' in body:
        scripts += FORM_JS
    html = f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="https://instituto31.pt/assets/rececao.jpg">
{helmet}
<link rel="stylesheet" href="assets/site.css">
</head>
<body>
{body}
{scripts}
</body>
</html>
"""
    fname = "index.html" if name == "Main" else f"{name}.html"
    open(f"{OUT}/{fname}", "w", encoding="utf-8").write(html)
    return fname, leftover, ph


def main():
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT + "/assets")
    for src, dst in [("/home/claude/logo/logo-preto.svg", "logo.svg"), ("/home/claude/logo/logo-branco.svg", "logo-branco.svg"),
                     ("/home/claude/imgs/sala.jpg", "sala.jpg"), ("/home/claude/imgs/gabinete.jpg", "gabinete.jpg"),
                     ("/home/claude/imgs/rececao.jpg", "rececao.jpg"), ("/home/claude/imgs/espera.jpg", "espera.jpg"),
                     ("/home/claude/site/src/marcar.js", "marcar.js"), ("/home/claude/site/src/site.css", "site.css"),
                     ("/home/claude/site/src/favicon.svg", "favicon.svg")]:
        shutil.copy(src, f"{OUT}/assets/{dst}")
    names = [f[:-8] for f in sorted(os.listdir(SRC)) if f.endswith(".dc.html") and f[:-8] not in SKIP]
    report = []
    for n in names:
        report.append(page(n))
    for f, l, p in report:
        if l or p:
            print(f, l, p)
    # páginas da app antiga que convém manter: .htaccess com redirecionamentos e 404
    open(f"{OUT}/.htaccess", "w").write("""DirectoryIndex index.html index.php
ErrorDocument 404 /index.html
<IfModule mod_headers.c>
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
<IfModule mod_expires.c>
ExpiresActive On
ExpiresByType image/jpeg "access plus 30 days"
ExpiresByType image/svg+xml "access plus 30 days"
</IfModule>
""")
    open(f"{OUT}/robots.txt", "w").write("User-agent: *\nAllow: /\nSitemap: https://instituto31.pt/sitemap.xml\n")
    urls = "".join(f"<url><loc>https://instituto31.pt/{'' if f == 'index.html' else f}</loc></url>" for f, _, _ in report)
    open(f"{OUT}/sitemap.xml", "w").write(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>')
    print("ok", len(report), "páginas")


if __name__ == "__main__":
    main()
