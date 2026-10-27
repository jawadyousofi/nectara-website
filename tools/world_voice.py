"""Makes Asal's World narration (assets/world/audio/*.mp3) from app/world-data.js.
Needs: pip install kokoro-onnx soundfile, ffmpeg, and the kokoro-v1.0.onnx + voices-v1.0.bin model files
(github.com/thewh1teagle/kokoro-onnx releases). Run: python3 tools/world_voice.py MODEL_DIR [--force | --fix]  (--fix remakes only lines with sounds, live/lives, … or capitals)"""
import json, os, re, subprocess, sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(root, 'app/world-data.js'), encoding='utf-8').read()
model_dir, force = sys.argv[1], '--force' in sys.argv
out = os.path.join(root, 'assets/world/audio'); os.makedirs(out, exist_ok=True)

# Pull every { id: '...', text: '...' } line, plus each spot's say / mission.
lines = {}
for m in re.finditer(r"\{\s*id:\s*'([a-z0-9-]+)',\s*(?:days:\s*\d+,\s*)?text:\s*'((?:[^'\\]|\\.)*)'", src):
    lines[m.group(1)] = m.group(2)
for m in re.finditer(r"\{\s*days:\s*\d+,\s*id:\s*'([a-z0-9-]+)',\s*text:\s*'((?:[^'\\]|\\.)*)'", src):
    lines[m.group(1)] = m.group(2)
for m in re.finditer(r"\{ id: '([a-z]+)', name: '[^']*'.*?say: '((?:[^'\\]|\\.)*)',\s*mission: '((?:[^'\\]|\\.)*)'", src, re.S):
    lines['d-' + m.group(1)] = m.group(2)
    lines['m-' + m.group(1)] = 'Try it outside! ' + m.group(3)

# Same voice and the same word fixes as the stories (tools/story_voice.py): sounds like shhh/hmmm/bzzz are never
# spelled out, "live/lives" rhyme with "give", each … is a real pause, and "Asal" is said a-SAHL.
os.environ.setdefault('KOKORO_DIR', model_dir)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import story_voice as sv
import numpy as np

NEEDS_FIX = re.compile(r"\b(?i:s+h+|h+m+|b+z+|w+h+o+o+s+h+|s+o+o+o+|lives?)\b|…|\.\.\.|\b[A-Z]{2,}\b")
fix_only = '--fix' in sys.argv
for lid, text in sorted(lines.items()):
    mp3 = os.path.join(out, lid + '.mp3')
    if fix_only:
        if not NEEDS_FIX.search(text.replace('I ', '')): continue
    elif os.path.exists(mp3) and not force:
        continue
    y = sv.synth(sv.speakable(text.replace("\\'", "'"), asal=True), 0.9)
    y = sv.fit(y, 0.12)
    sv.write(np.concatenate([np.zeros(int(0.1 * sv.SR)), y, np.zeros(int(0.2 * sv.SR))]), mp3)
    print('made', lid)
print(len(lines), 'lines')
