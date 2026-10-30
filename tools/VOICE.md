# The Nectara voice

Every recording children hear in Nectara (stories, lessons, Asal's World) comes from the same voice, made the same way,
so nothing new ever sounds different from what families already know. Follow this for all new content.

## The voice
- Kokoro, voice **af_heart** (the warm female narrator Jawad chose). Never a different voice or service without his OK.
- Speed **0.87** for stories and lessons, **0.9** for Asal's World. Loudness **0.12** RMS (`fit(y, 0.12)`), the same everywhere.
- Every line goes through `story_voice.speakable()` then `story_voice.synth()`. Never call Kokoro directly.

## How words are said
- **Names** are spelled out by sound in `NAMES` (tools/story_voice.py): Asal is a-SAHL, plus Eli, Keon, Priya.
  A new name in any story, lesson or world line must be added to `NAMES` before recording.
- **Sounds** are never spelled out. *shh/shhh* is a real soft hiss (`hiss()`); *hmmm*, *bzzz*, *whoosh* use the
  hand-written sounds in `SOUNDS`. A new sound word must be added there first.
- **live / lives** rhyme with *give*. **ALL-CAPS** words are read as normal words, not letters.
- Each **…** is a real pause, never a stumble.
- **Do it!** moves (stories): story lines, a pause, a chime, "It's your turn now. Let's do it together.", a pause, then Asal leads.
- Lessons: a short breath between sentences (`SENT_GAP` in tools/lesson_voice.py), ending with
  "It's your turn now. Let's do it together." on the Do slide.

## Before recording anything new
1. Run `python3 tools/voice_check.py`. It lists every name and sound word in everything children hear,
   and fails if one has no pronunciation yet. Fix those first.
2. Record with the right tool:
   - stories: `python3 tools/story_voice.py build <story-id>`
   - lessons: `python3 tools/lesson_voice.py <lesson-id>` (words come from app/lesson-script.js)
   - Asal's World: `python3 tools/world_voice.py $KOKORO_DIR` (only new lines are made)
3. Listen to at least one new recording before publishing.
