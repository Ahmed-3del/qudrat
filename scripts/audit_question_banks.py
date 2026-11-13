import json,re
from pathlib import Path

def extract_array(path,name):
 s=Path(path).read_text()
 m=re.search(rf'export const {name}[^=]*=\s*',s)
 if not m: raise RuntimeError((path,name))
 start=s.find('[',m.end()); dec=json.JSONDecoder(); arr,end=dec.raw_decode(s[start:]); return arr

allq=[]
names=[('Zero','door0'),('One','door1'),('Two','door2'),('Three','door3')]
for n,(word,prefix) in enumerate(names):
 path=f'client/src/data/{prefix}Data.ts'; qs=extract_array(path,f'door{word}Questions'); lessons=extract_array(path,f'door{word}Lessons')
 ids=[q.get('id') for q in qs]; dup=sorted({x for x in ids if ids.count(x)>1})
 invalid=[q.get('id') for q in qs if not isinstance(q.get('options'),list) or len(q.get('options'))!=4 or not isinstance(q.get('answer'),int) or not 0<=q.get('answer',-1)<len(q.get('options',[]))]
 missing=[q.get('id') for q in qs if any(not q.get(k) for k in ['id','question','solution','options'])]
 optdup=[q.get('id') for q in qs if len(set(q['options']))<len(q['options'])]
 badconf=[q.get('id') for q in qs if not isinstance(q.get('confidence'),(int,float)) or q['confidence']<.7]
 lesson_counts={i:0 for i in range(len(lessons))}
 for q in qs: lesson_counts[q.get('lessonIndex')]=lesson_counts.get(q.get('lessonIndex'),0)+1
 declared=[l.get('count') for l in lessons]
 mismatch=[(i,declared[i],lesson_counts.get(i,0)) for i in range(len(lessons)) if declared[i]!=lesson_counts.get(i,0)]
 pages=[q.get('sourcePage') for q in qs]
 print(f'DOOR {n}: questions={len(qs)} lessons={len(lessons)} ids_dup={len(dup)} invalid={len(invalid)} missing={len(missing)} option_dups={len(optdup)} low_conf={len(badconf)} count_mismatch={len(mismatch)} pages={min(pages)}-{max(pages)}')
 if dup or invalid or missing or optdup or badconf or mismatch: print('  detail', {'dup':dup[:10], 'invalid':invalid[:10], 'missing':missing[:10], 'option_dups':optdup[:10], 'low_conf':badconf[:10], 'mismatch':mismatch[:10]})
 allq += [(n,q) for q in qs]
# cross-bank duplicate IDs and prompts
prompts={}
for n,q in allq: prompts.setdefault(q['question'].strip(),[]).append((n,q['id']))
cross=[(p,v) for p,v in prompts.items() if len(v)>1]
print('CROSS_BANK_DUPLICATE_PROMPTS',len(cross))
print('TOTAL_QUESTIONS',len(allq))
# laws fields
s=Path('client/src/data/lawsData.ts').read_text(); titles=re.findall(r'title: "([^"]+)"',s); rules=re.findall(r'rule: "([^"]+)"',s); print('LAWS cards',len(titles),'titles_dup',len(titles)-len(set(titles)),'rules',len(rules),'empty_rules',sum(not r.strip() for r in rules))
