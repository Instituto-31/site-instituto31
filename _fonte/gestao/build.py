import os
s=open('/home/claude/site/gestao/app.html').read().replace('/*OLDCSS*/',open('/home/claude/site/gestao/_old.css').read())
os.makedirs('/home/claude/site/gestao/dist',exist_ok=True)
open('/home/claude/site/gestao/dist/index.html','w').write(s)
open('/home/claude/site/gestao/dist/robots.txt','w').write('User-agent: *\nDisallow: /\n')
print(len(s))
