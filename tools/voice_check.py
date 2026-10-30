"""Checks everything children hear for words the voice might say wrong (see tools/VOICE.md).

  python3 tools/voice_check.py        # exit code 1 if a name or sound word has no pronunciation yet

Looks at story pages, lesson read-aloud scripts and Asal's World lines. Flags capitalized words in the middle of a
sentence (likely names) and stretched sound words (shhh, zzzz, mmmm…) that NAMES / SOUNDS in story_voice.py
don't cover and that aren't ordinary words."""
import json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import story_voice as sv
try:
    from english_words import get_english_words_set          # pip install english-words
    WORDS = get_english_words_set(['web2', 'gcide'], lower=True)
except Exception:
    WORDS = set()

ROOT = sv.ROOT
OK = {'I', 'Asal', 'Earth', 'Mama', 'Papa', 'Grand', 'Nectara', 'Growth', 'Garden', 'World', 'Pond', 'Hive', 'Sky',
      'Orange', 'Tree', 'Inside', 'Me', 'Feelings', 'Meadow', 'Wonder', 'Little', 'Scientists', 'Big', 'One', 'Two', 'Three',
      'Monday', 'Wednesday', 'Friday', 'September', 'October', 'November', 'December', 'January', 'February', 'March',
      'April', 'May', 'June', 'Ghana', 'Afghanistan', 'Nighty', 'Amara', 'Sofia', 'Mia', 'Do', 'It', 'Try', 'Make', 'Notice', 'Feel', 'Body'}
js = """global.window={};require(%r);require(%r);require(%r);const N=window.NECTARA,W=window.NECTARA_WORLD,out=[];
N.stories.forEach(s=>s.pages.forEach(p=>p.forEach(l=>out.push(['story '+s.id,l]))));
N.series.forEach(s=>(s.lessons||[]).forEach(l=>window.NectaraLessonScript(s,l,N.song).forEach(t=>out.push(['lesson '+l.id,t]))));
JSON.stringify(W,(k,v)=>{if((k==='text'||k==='say'||k==='mission')&&typeof v==='string')out.push(['world',v]);return v});
process.stdout.write(JSON.stringify(out))""" % tuple(os.path.join(ROOT, f) for f in ['app/lessons.js', 'app/lesson-script.js', 'app/world-data.js'])
lines = json.loads(subprocess.check_output(['node', '-e', js]))

def covered(core):
    return any(re.match(p, core, re.I) for p, _ in sv.SOUNDS)

def everyday(core):
    w = core.lower()
    return w in WORDS or (w.endswith('s') and w[:-1] in WORDS) or (w.endswith('es') and w[:-2] in WORDS)

problems = {}
for where, text in lines:
    for sent in re.split(r'(?<=[.!?…:“"])\s+', text.lstrip('*>')):
        words = re.findall(r"[A-Za-z’']+", sent)
        for n, w in enumerate(words):
            core = re.sub(r"[’'].*$", '', w)
            stretched = re.search(r'(.)\1\1', core.lower()) is not None
            name = n > 0 and core[:1].isupper() and not core.isupper()
            if (stretched or (name and not everyday(core))) and not covered(core) and core not in OK:
                problems.setdefault(core, where)
for w, where in sorted(problems.items()):
    print('needs a pronunciation: %-14s (first seen in %s)' % (w, where))
print('%d lines checked, %d words to look at' % (len(lines), len(problems)))
sys.exit(1 if problems else 0)
