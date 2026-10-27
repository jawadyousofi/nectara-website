"""Story narration tools (offline Kokoro voice af_heart, same voice as the rest of the app).

  python3 tools/story_voice.py doit     # I Am Grand: rebuild each DO IT! move as
                                        #   narration, pause, chime, "It's your turn now. Let's do it together.", pause, Asal leads the move
  python3 tools/story_voice.py timing   # write assets/stories/<id>/audio/timing.json (when each line starts) for every story

Needs: pip install kokoro-onnx soundfile numpy, ffmpeg, and the model files in $KOKORO_DIR
(kokoro-v1.0.onnx, voices-v1.0.bin). Story text comes from app/lessons.js (via node).
When ElevenLabs replaces Kokoro, keep the same timing.json format so the reading highlight stays in step.
"""
import json, os, subprocess, sys, tempfile
import numpy as np
import soundfile as sf

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SR = 48000
TURN_LINE = "It's your turn now. Let's do it together."
PAUSE_BEFORE_CHIME = 1.6   # seconds of quiet after the story lines
PAUSE_AFTER_CHIME = 0.7
PAUSE_AFTER_TURN = 1.6     # let the children get ready before Asal leads
TMP = tempfile.mkdtemp()


def stories():
    js = "global.window={};require(%r);process.stdout.write(JSON.stringify(window.NECTARA.stories.map(s=>({id:s.id,audio:s.audio,pages:s.pages}))))" % os.path.join(ROOT, 'app/lessons.js')
    return json.loads(subprocess.check_output(['node', '-e', js]))


def load(p):
    out = os.path.join(TMP, 'in.wav')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', p, '-ac', '1', '-ar', str(SR), out], check=True)
    x, _ = sf.read(out)
    return x


def write(x, p):
    w = os.path.join(TMP, 'out.wav'); sf.write(w, x, SR)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', w, '-ac', '1', '-ar', str(SR), '-b:a', '80k', p], check=True)


def segments(x, thr=0.01, mingap=0.3):
    fr = int(0.01 * SR)
    e = np.array([np.sqrt((x[i:i + fr] ** 2).mean()) for i in range(0, len(x) - fr, fr)])
    on = e > thr; segs = []; i = 0; n = len(on); g = int(mingap * 100)
    while i < n:
        if on[i]:
            j = i
            while j < n and (on[j] or (j + g < n and on[j:j + g].any())): j += 1
            segs.append((i * fr, j * fr)); i = j
        else:
            i += 1
    return segs


def peak_freq(seg):
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg))))
    return np.fft.rfftfreq(len(seg), 1 / SR)[np.argmax(sp)]


def chime_index(x, segs):
    for n, (a, b) in enumerate(segs):
        if (b - a) / SR < 1.2 and 840 < peak_freq(x[a:b]) < 920: return n
    return None


_k = None
def kokoro():
    global _k
    if _k is None:
        from kokoro_onnx import Kokoro
        d = os.environ.get('KOKORO_DIR', '')
        _k = Kokoro(os.path.join(d, 'kokoro-v1.0.onnx'), os.path.join(d, 'voices-v1.0.bin'))
    return _k


# Words the voice gets wrong, fixed in the phonemes (checked one by one).
PHON_FIX = [('sˈuːuː', 'sˈoʊːːː'),            # "Soooo brave" (not "soo-oo")
            ('ˌɛsˌeɪtʃˈeɪtʃ', 'ʃːːː')]       # "shhh" (not spelled out)


def speakable(t):
    t = t.lstrip('*>').replace('“', '').replace('”', '').replace('’', "'")
    # ALL-CAPS words are read as letters: lower-case them (keep "I")
    return ' '.join(w if not (w.strip('!?.,:;').isupper() and len(w.strip('!?.,:;')) > 1) else w.lower() for w in t.split(' '))


def synth(text, speed=0.9):
    k = kokoro()
    ph = k.tokenizer.phonemize(text, 'en-us')
    for a, b in PHON_FIX: ph = ph.replace(a, b)
    s, sr = k.create(ph, voice='af_heart', speed=speed, lang='en-us', is_phonemes=True)
    a = os.path.join(TMP, 's.wav'); b = os.path.join(TMP, 's48.wav'); sf.write(a, s, sr)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', a, '-ar', str(SR), b], check=True)
    y, _ = sf.read(b)
    idx = np.where(np.abs(y) > 0.01)[0]
    return y[max(0, idx[0] - 240):idx[-1] + 480] if len(idx) else y


def rms(v): return np.sqrt((v ** 2).mean()) if len(v) else 0


def quiet(sec): return np.zeros(int(sec * SR))


def doit():
    st = [s for s in stories() if s['id'] == 'i-am-grand'][0]
    timing = {}
    for i, lines in enumerate(st['pages']):
        if not lines or not lines[-1].startswith('>'): continue
        path = os.path.join(ROOT, 'assets/stories/i-am-grand/audio/%02d.mp3' % (i + 1))
        backup = os.path.join(ROOT, 'tools/.audio-backup/i-am-grand-%02d.mp3' % (i + 1))
        os.makedirs(os.path.dirname(backup), exist_ok=True)
        if not os.path.exists(backup): subprocess.run(['cp', path, backup], check=True)
        x = load(backup); segs = segments(x); ci = chime_index(x, segs)
        assert ci is not None, 'no chime on page %d' % (i + 1)
        story_end = segs[ci - 1][1]
        story = x[:story_end]; chime = x[segs[ci][0]:segs[ci][1] + int(0.15 * SR)]
        level = rms(x[segs[0][0]:story_end])
        turn = synth(TURN_LINE, 0.88); turn *= level / rms(turn)
        move = synth(speakable(lines[-1]), 0.9); move *= level / rms(move)
        out = np.concatenate([story, quiet(PAUSE_BEFORE_CHIME), chime, quiet(PAUSE_AFTER_CHIME), turn, quiet(PAUSE_AFTER_TURN)])
        do_at = len(out) / SR
        out = np.concatenate([out, move, quiet(0.8)])
        write(out, path)
        timing[i + 1] = {'storyEnd': story_end / SR, 'turnAt': (story_end / SR) + PAUSE_BEFORE_CHIME, 'doAt': do_at}
        print('page %d: %.1fs (move starts %.1fs)' % (i + 1, len(out) / SR, do_at))
    json.dump(timing, open(os.path.join(TMP, 'doit.json'), 'w'))
    return timing


def line_starts(x, lines, story_end=None):
    """When each line starts: split the voiced parts at the biggest pauses, one piece per line."""
    segs = [s for s in segments(x, mingap=0.12) if story_end is None or s[0] < story_end * SR]
    if story_end is not None:
        ci = chime_index(x, segs)
        if ci is not None: segs = segs[:ci]
    n = len(lines)
    if not segs: return [0] * n
    if len(segs) >= n:
        gaps = sorted(range(1, len(segs)), key=lambda j: segs[j][0] - segs[j - 1][1], reverse=True)[:n - 1]
        cuts = sorted(gaps)
        return [round(segs[0][0] / SR, 2)] + [round(segs[j][0] / SR, 2) for j in cuts]
    # fewer pauses than lines: share the voiced time by line length
    a, b = segs[0][0] / SR, segs[-1][1] / SR
    w = [max(8, len(t)) for t in lines]; tot = sum(w); out = []; acc = 0
    for v in w: out.append(round(a + (b - a) * acc / tot, 2)); acc += v
    return out


def timing():
    for st in stories():
        if not st.get('audio'): continue
        res = {}
        for i, lines in enumerate(st['pages']):
            if i == 0: continue   # the title page shows no reading lines
            path = os.path.join(ROOT, 'assets/stories/%s/audio/%02d.mp3' % (st['id'], i + 1))
            if not os.path.exists(path): continue
            x = load(path); segs = segments(x)
            ci = chime_index(x, segs) if lines[-1].startswith('>') else None
            if ci is not None:
                starts = line_starts(x, lines[:-1], story_end=segs[ci][0] / SR)
                # the move line lights up when Asal starts leading it (the last voiced part after "your turn")
                after = [s for s in segments(x, mingap=0.3) if s[0] > segs[ci][1]]
                lead = next((after[j] for j in range(1, len(after)) if (after[j][0] - after[j - 1][1]) / SR > 1.2), after[-1])
                starts.append(round(lead[0] / SR, 2))
            else:
                starts = line_starts(x, lines)
            res['%02d' % (i + 1)] = starts
        out = os.path.join(ROOT, 'assets/stories/%s/audio/timing.json' % st['id'])
        json.dump(res, open(out, 'w'), separators=(',', ':'))
        print('wrote', out)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'doit': doit()
    elif cmd == 'timing': timing()
    else: print(__doc__)
