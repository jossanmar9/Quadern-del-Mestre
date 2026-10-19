#!/usr/bin/env python3
"""Comprova que tots els textos de l'app tenen traducció al castellà a src/web/i18n.js.

Ús:  python3 eines/comprova-traduccions.py
"""
import re,json,glob,sys
import os
root=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','src')+'/'
keys=[]
def add(k):
    if k not in keys: keys.append(k)
def parse_args(src,i):
    # src[i] == '(' ; return list of (arg_text) top-level
    depth=0;args=[];cur='';j=i+1;q=None
    while j<len(src):
        ch=src[j]
        if q:
            cur+=ch
            if ch=='\\': cur+=src[j+1]; j+=2; continue
            if ch==q: q=None
        elif ch in '\'"`': q=ch; cur+=ch
        elif ch in '([{': depth+=1; cur+=ch
        elif ch in ')]}':
            if depth==0: args.append(cur); return args
            depth-=1; cur+=ch
        elif ch==',' and depth==0: args.append(cur); cur=''
        else: cur+=ch
        j+=1
    return args
def top_literals(a):
    out=[];depth=0;j=0;q=None;start=0
    while j<len(a):
        ch=a[j]
        if q:
            if ch=='\\': j+=2; continue
            if ch==q:
                if depth==0 and q!='`': out.append(a[start:j+1])
                q=None
        elif ch in '\'"`': q=ch; start=j
        elif ch in '([{': depth+=1
        elif ch in ')]}': depth-=1
        j+=1
    return out
for f in sorted(glob.glob(root+'web/*.js')):
    if f.endswith('i18n.js'): continue
    s=open(f).read()
    for m in re.finditer(r'(?<![\w.$])(t|M|L|pl)\(',s):
        args=parse_args(s,m.end()-1)
        if not args: continue
        idx=[1,2] if m.group(1)=='pl' else [0]
        for k in idx:
            if k<len(args):
                for lit in top_literals(args[k]):
                    add(json.loads(lit) if lit[0]=='"' else eval(lit))
for g in re.findall(r'data-i18n(?:-ph|-aria)?="([^"]*)"',open(root+'web/cos.html').read()): add(g)
for g in re.findall(r'"error": "([^"]+)"',open(root+'servidor.py').read()): add(g)
keys=[k for k in keys if k and re.search(r'[A-Za-zÀ-ú]',k)]
# Compara amb el diccionari de i18n.js
src=open(root+'web/i18n.js',encoding='utf-8').read()
have=set(json.loads(m.group(0)) for m in re.finditer(r'"(?:[^"\\]|\\.)*"(?=: )',src))
miss=[k for k in keys if k not in have and k not in ('adv','crit','pin')]
print(f'{len(keys)} textos, {len(miss)} sense traduir al castellà')
for k in miss: print('  -',k)
sys.exit(1 if miss else 0)
