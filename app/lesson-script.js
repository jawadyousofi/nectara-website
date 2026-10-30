// What Asal reads aloud on each lesson slide, in the same order as the slides in app.js (buildSlides).
// One source for both the app (which recording to play) and tools/lesson_voice.py (which makes the recordings),
// so the words on screen and the words read aloud never drift apart. Lines follow tools/VOICE.md.
// Written in ES5 like the rest of the app.
(function () {
  'use strict';
  function lessonScript(s, l, song) {
    var list = [
      l.title + '. Today, Asal has a big question for us.',
      'Sit in a circle and breathe with Asal. ' + (song || []).join(' '),
      'Asal wonders… ' + l.question + ' What do you think? Everyone shares a guess. Scientists start with a guess!',
      'Here’s what we’ll do. One: ' + l.steps[0] + '. Two: ' + l.steps[1] + '. Three: ' + l.steps[2] + '.',
      l.doIntro + ' ' + l.doSteps.join(' ') + ' It’s your turn now. Let’s do it together.',
      l.makeIt ? 'Make it yours! ' + l.makeIt + ' Show someone what you made. Every idea is welcome.' : null,
      'Let’s notice. ' + l.notice,
      l.feel,
      l.body,
      'What do you think happened, and why? Everyone shares an idea. Scientists share their ideas before anyone knows for sure.',
      'Here is what scientists think so far. ' + l.answer + ' Big kid challenge: ' + l.challenge,
      'A flower grew in your garden! ' + l.bigIdea + ' Take it home: ' + l.takeHome
    ];
    return list.filter(function (x) { return x !== null; });
  }
  if (typeof window !== 'undefined') window.NectaraLessonScript = lessonScript;
})();
