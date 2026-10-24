"""Makes Asal's World narration (assets/world/audio/*.mp3) from app/world-data.js.
Needs: pip install kokoro-onnx soundfile, ffmpeg, and the kokoro-v1.0.onnx + voices-v1.0.bin model files
(github.com/thewh1teagle/kokoro-onnx releases). Run: python3 tools/world_voice.py MODEL_DIR [--force]"""
import json, os, re, subprocess, sys
import soundfile as sf
from kokoro_onnx import Kokoro

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

def speakable(t):
    t = t.replace('’', "'").replace('Asal', 'Asahl')   # say a-SAL
    return t

k = Kokoro(os.path.join(model_dir, 'kokoro-v1.0.onnx'), os.path.join(model_dir, 'voices-v1.0.bin'))
for lid, text in sorted(lines.items()):
    mp3 = os.path.join(out, lid + '.mp3')
    if os.path.exists(mp3) and not force:
        continue
    samples, rate = k.create(speakable(text), voice='af_heart', speed=0.9, lang='en-us')
    wav = mp3[:-4] + '.wav'; sf.write(wav, samples, rate)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-b:a', '64k', mp3], check=True)
    os.remove(wav); print('made', lid)
print(len(lines), 'lines')
