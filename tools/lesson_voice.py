"""Lesson read-aloud: records what Asal says on every slide of every lesson, in the Nectara voice (tools/VOICE.md).

  python3 tools/lesson_voice.py [lesson-id ...]      # all lessons, or just the ones named

The words come from app/lesson-script.js (the same script the app uses), so screen and voice always match.
Writes assets/lessons/audio/<lesson-id>/NN.mp3. Needs the Kokoro model in $KOKORO_DIR (see story_voice.py)."""
import json, os, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import story_voice as sv

ROOT = sv.ROOT
LEVEL = 0.12          # the same loudness as the stories
SENT_GAP = 0.45       # a breath between sentences, so little ones can follow

js = """global.window={};require(%r);require(%r);const N=window.NECTARA;const out=[];
N.series.forEach(s=>(s.lessons||[]).forEach(l=>out.push({id:l.id,slides:window.NectaraLessonScript(s,l,N.song)})));
process.stdout.write(JSON.stringify(out))""" % (os.path.join(ROOT, 'app/lessons.js'), os.path.join(ROOT, 'app/lesson-script.js'))
lessons = json.loads(subprocess.check_output(['node', '-e', js]))
only = set(sys.argv[1:])
import re
for les in lessons:
    if only and les['id'] not in only: continue
    d = os.path.join(ROOT, 'assets/lessons/audio', les['id']); os.makedirs(d, exist_ok=True)
    for i, text in enumerate(les['slides']):
        out = [sv.quiet(0.35)]
        for n, sent in enumerate([x for x in re.split(r'(?<=[.!?])\s+', text) if x.strip()]):
            if n: out.append(sv.quiet(SENT_GAP))
            out.append(sv.fit(sv.synth(sv.speakable(sent)), LEVEL))
        out.append(sv.quiet(0.4))
        sv.write(np.concatenate(out), os.path.join(d, '%02d.mp3' % (i + 1)))
        print(les['id'], i + 1, '%.1fs' % (sum(len(o) for o in out) / sv.SR))
