import os
s=open('/home/claude/site/gestao/app.html').read().replace('/*OLDCSS*/',open('/home/claude/site/gestao/_old.css').read())
os.makedirs('/home/claude/site/gestao/dist',exist_ok=True)
open('/home/claude/site/gestao/dist/index.html','w').write(s)
open('/home/claude/site/gestao/dist/robots.txt','w').write('User-agent: *\nDisallow: /\n')
print(len(s))
import shutil
shutil.copy('/home/claude/site/gestao/psidocs.js','/home/claude/site/gestao/dist/psidocs.js')
os.makedirs('/home/claude/site/gestao/dist/modelos',exist_ok=True)
U='/mnt/user-data/uploads/Dropbox/instituto31/'
for f in ['psi_relatorio.docx','psi_certificado.docx','psi_consentimento.docx']: shutil.copy(U+f,'/home/claude/site/gestao/dist/modelos/'+f)
shutil.copy('/home/claude/psi/psi_certificado_2via.docx','/home/claude/site/gestao/dist/modelos/psi_certificado_2via.docx')
