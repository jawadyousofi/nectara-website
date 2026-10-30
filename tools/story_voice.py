"""Story narration tools (offline Kokoro voice af_heart, same voice as the rest of the app).

  python3 tools/story_voice.py build [story-id ...]
      Records every page line by line and writes assets/stories/<id>/audio/timing.json (when each line starts).
      DO IT! pages: story lines, pause, chime, "It's your turn now. Let's do it together.", pause, then Asal leads the move.
      Sounds like shhh, hmmm and bzzz are hand-written phonemes (never spelled out); "live/lives" rhyme with "give";
      ALL-CAPS words are lower-cased; each … is a real pause.
  python3 tools/story_voice.py timing   # re-measure timing.json from existing recordings

Needs: pip install kokoro-onnx soundfile numpy, ffmpeg, and the model files in $KOKORO_DIR
(kokoro-v1.0.onnx, voices-v1.0.bin). Story text comes from app/lessons.js (via node).
When ElevenLabs replaces Kokoro, keep the same timing.json format so the reading highlight stays in step.
"""
import json, os, re, subprocess, sys, tempfile
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


# Words the voice gets wrong. Sounds (shhh, hmmm, bzzz, whoooosh) get hand-written phonemes so they are
# not spelled out letter by letter; verbs "live/lives" are respelled so they rhyme with "give".
# Names said the way the family says them (the voice's own guesses were wrong: "Asal" came out "AY-zel").
NAMES = [(r"^Asal$", 'ɐsˈɑːl'), (r"^Asals$", 'ɐsˈɑːlz'),     # a-SAHL, the same as in Asal's World
         (r"^Eli$", 'ˈiːlaɪ'), (r"^Keon$", 'kˈiːɑːn'), (r"^Priya$", 'pɹˈiːjə')]
SOUNDS = NAMES + [(r"^g+r+$", 'ɡɹːːːː'),                # grrr (a little growl)
          (r"^h+a+h+$", 'hˈɑːːːːh'),            # haaah (a foggy breath)
          (r"^s+h+$", 'ʃːːːː'),                 # shh, shhh, shhhhh
          (r"^h+m+$", 'mːːːːː'),                # hmmmm (a hum)
          (r"^b+z+$", 'bzːːːː'),                # bzzz
          (r"^w+h+o+o+s+h+$", 'wˈuːːːʃ'),       # whoooosh
          (r"^s+o+o+o+$", 'sˈoʊːːː'),           # soooo
          (r"^g+r+a+a+n+d+$", 'ɡɹˈæːːːnd')]     # graaand
RESPELL = [(r"\blives\b", 'livs'), (r"\bLives\b", 'Livs'), (r"\blive\b", 'liv'), (r"\bLive\b", 'Liv')]
ELLIPSIS_PAUSE = 0.45


def speakable(t, asal=False):
    t = t.lstrip('*>').replace('“', '').replace('”', '').replace('’', "'").replace('...', '…')
    if asal: t = t.replace('Asal', 'Asahl')   # world lines: a-SAHL
    for a, b in RESPELL: t = re.sub(a, b, t)
    # ALL-CAPS words are read as letters: lower-case them (keep "I")
    return ' '.join(w if not (re.sub(r'[^A-Za-z]', '', w).isupper() and len(re.sub(r'[^A-Za-z]', '', w)) > 1) else w.lower() for w in t.split(' '))


def phonemes(text):
    """Phonemes for one chunk, with the sound words swapped for hand-written ones."""
    k = kokoro(); out = []; buf = []
    def flush():
        if buf: out.append(k.tokenizer.phonemize(' '.join(buf), 'en-us')); buf[:] = []
    for w in text.split(' '):
        core = re.sub(r'[^A-Za-z]', '', w); hit = None
        for pat, ph in SOUNDS:
            if core and re.match(pat, core, re.I): hit = ph; break
        if hit:
            flush(); tail = re.sub(r'^.*?([!?.,:;]*)$', r'\1', w); out.append(hit + tail)
        else:
            buf.append(w)
    flush()
    return ' '.join(o for o in out if o)


SHH = re.compile(r"\b([Ss]+[Hh]+)\b[!.,]?")


def hiss(seconds=1.0):
    """A real, soft "shhh": filtered breath noise. The voice can't make a lone consonant and says something like the letters."""
    n = int(seconds * SR); rng = np.random.default_rng(7)
    f = np.fft.rfft(rng.standard_normal(n)); fr = np.fft.rfftfreq(n, 1 / SR)
    f *= np.exp(-((fr - 3200) / 1500) ** 2)                      # the "sh" band, centred near 3 kHz
    y = np.fft.irfft(f, n); t = np.arange(n) / SR
    env = np.minimum(1, t / 0.09) * np.minimum(1, (seconds - t) / 0.3) * (1 + 0.08 * np.sin(2 * np.pi * 3 * t))
    y = y * env; return 0.035 * y / (np.sqrt((y ** 2).mean()) + 1e-9)


def synth(text, speed=0.87):
    """Speak one line. Pauses for each … are real silence (the voice used to stumble on the word after one).
    Each shh/shhh becomes a real hiss (see hiss)."""
    bits = []
    for chunk in SHH.split(text):
        if SHH.fullmatch(chunk.strip() + ''):
            bits.append(('hiss', chunk))
        elif chunk and re.fullmatch(r"[Ss]+[Hh]+", chunk.strip()):
            bits.append(('hiss', chunk))
        elif chunk.strip(' ,.!'):
            bits.append(('say', chunk))
    out = []
    for kind, chunk in bits:
        if out: out.append(np.zeros(int(0.18 * SR)))
        out.append(hiss(0.5 + 0.12 * min(len(chunk), 6)) if kind == 'hiss' else _say(chunk, speed))
    return np.concatenate(out) if out else np.zeros(1)


def _say(text, speed=0.87):
    k = kokoro(); parts = [p.strip() for p in text.split('…')]; pieces = []
    for n, part in enumerate(parts):
        if not part: continue
        ph = phonemes(part)
        s, sr = k.create(ph, voice='af_heart', speed=speed, lang='en-us', is_phonemes=True)
        a = os.path.join(TMP, 's.wav'); b = os.path.join(TMP, 's48.wav'); sf.write(a, s, sr)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', a, '-ar', str(SR), b], check=True)
        y, _ = sf.read(b)
        idx = np.where(np.abs(y) > 0.01)[0]
        if len(idx): y = y[max(0, idx[0] - 240):idx[-1] + 480]
        if pieces: pieces.append(np.zeros(int(ELLIPSIS_PAUSE * SR)))
        pieces.append(y)
    return np.concatenate(pieces) if pieces else np.zeros(1)


def rms(v): return np.sqrt((v ** 2).mean()) if len(v) else 0


def fit(y, level):
    """Same loudness for every line, without clipping."""
    y = y * (level / max(rms(y), 1e-6)); pk = np.abs(y).max()
    return y * (0.95 / pk) if pk > 0.95 else y


def quiet(sec): return np.zeros(int(sec * SR))


LEAD, GAP, TAIL = 0.6, 0.75, 1.0   # seconds: before the first line, between lines, after the last


def chime_clip():
    """The soft chime before each DO IT! move (kept from the original recordings)."""
    src = os.path.join(ROOT, 'tools/.audio-backup/i-am-grand-02.mp3')
    if not os.path.exists(src): src = os.path.join(ROOT, 'assets/stories/i-am-grand/audio/02.mp3')
    x = load(src); segs = segments(x); ci = chime_index(x, segs)
    if ci is not None: return x[segs[ci][0]:segs[ci][1] + int(0.15 * SR)]
    t = np.arange(int(0.7 * SR)) / SR   # fallback: a soft 880 Hz bell
    return 0.12 * np.sin(2 * np.pi * 880 * t) * np.exp(-t * 5)


def build(only=None):
    """Re-record every story page line by line, with exact timing for the reading light."""
    chime = None; level = 0.12
    for st in stories():
        if not st.get('audio') or (only and st['id'] not in only): continue
        timing = {}
        for i, lines in enumerate(st['pages']):
            path = os.path.join(ROOT, 'assets/stories/%s/audio/%02d.mp3' % (st['id'], i + 1))
            story = lines[:-1] if lines and lines[-1].startswith('>') else lines
            move = lines[-1] if len(story) < len(lines) else None
            out = [quiet(LEAD)]; starts = []; t = LEAD
            for n, line in enumerate(story):
                y = fit(synth(speakable(line)), level)
                if n: out.append(quiet(GAP)); t += GAP
                starts.append(round(t, 2)); out.append(y); t += len(y) / SR
            if move:
                if chime is None: chime = fit(chime_clip(), level * 0.8)
                turn = fit(synth(TURN_LINE, 0.85), level)
                lead_in = fit(synth(speakable(move)), level)
                for piece in [quiet(PAUSE_BEFORE_CHIME), chime, quiet(PAUSE_AFTER_CHIME), turn, quiet(PAUSE_AFTER_TURN)]:
                    out.append(piece); t += len(piece) / SR
                starts.append(round(t, 2)); out.append(lead_in)
            out.append(quiet(TAIL))
            write(np.concatenate(out), path)
            if i: timing['%02d' % (i + 1)] = starts
            print(st['id'], i + 1, '%.1fs' % (sum(len(o) for o in out) / SR))
        json.dump(timing, open(os.path.join(ROOT, 'assets/stories/%s/audio/timing.json' % st['id']), 'w'), separators=(',', ':'))


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
    if cmd == 'build': build(sys.argv[2:] or None)
    elif cmd == 'timing': timing()
    else: print(__doc__)
