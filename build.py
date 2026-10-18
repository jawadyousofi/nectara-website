"""Builds the Nectara site pages from one shared template. Run: python3 build.py"""
SITE = 'https://nectaraschool.org'
NAV = [('index.html', 'Home'), ('approach.html', 'How we learn'), ('programs.html', 'Programs'),
       ('families.html', 'Families'), ('asal.html', 'Meet Asal'), ('about.html', 'Our story')]

LEAF = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 56 L32 28 M32 38 C24 32 18 32 12 35 C18 42 26 42 32 38 M32 32 C40 24 46 24 52 26 C46 34 38 35 32 32" fill="none" stroke="#2F4A35" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
BREATH = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 36 C20 24 28 24 32 30 C36 36 44 36 52 24" fill="none" stroke="#3E7CA8" stroke-width="3.5" stroke-linecap="round"/><path d="M12 46 C20 34 28 34 32 40 C36 46 44 46 52 34" fill="none" stroke="#7FB3D5" stroke-width="3.5" stroke-linecap="round"/></svg>'
WORLD = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="21" fill="none" stroke="#8A4F0B" stroke-width="3.5"/><circle cx="32" cy="11" r="4" fill="#8A4F0B"/><circle cx="51" cy="40" r="4" fill="#8A4F0B"/><circle cx="13" cy="40" r="4" fill="#8A4F0B"/></svg>'
HEART = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 52 C14 40 10 30 14 22 C18 14 28 14 32 22 C36 14 46 14 50 22 C54 30 50 40 32 52 Z" fill="none" stroke="#C2603E" stroke-width="3.5" stroke-linejoin="round"/></svg>'
STAR = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 8 L37 26 L56 28 L41 39 L46 57 L32 47 L18 57 L23 39 L8 28 L27 26 Z" fill="none" stroke="#E9A23B" stroke-width="3.5" stroke-linejoin="round"/></svg>'
FLASK = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M26 8 L26 26 L12 50 C10 54 12 57 16 57 L48 57 C52 57 54 54 52 50 L38 26 L38 8 M22 8 L42 8" fill="none" stroke="#3E7CA8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 44 L46 44" stroke="#E9A23B" stroke-width="3.5" stroke-linecap="round"/><circle cx="30" cy="37" r="2.5" fill="#E9A23B"/><circle cx="36" cy="32" r="2" fill="#E9A23B"/></svg>'
HIVE = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6 L54 19 L54 45 L32 58 L10 45 L10 19 Z" fill="none" stroke="#2F4A35" stroke-width="3.5" stroke-linejoin="round"/><path d="M32 22 L42 28 L42 40 L32 46 L22 40 L22 28 Z" fill="none" stroke="#E9A23B" stroke-width="3.5" stroke-linejoin="round"/></svg>'
HEX_BG = '<svg class="hex" viewBox="0 0 120 120" aria-hidden="true"><path d="M60 6 L106 32 L106 88 L60 114 L14 88 L14 32 Z" fill="none" stroke="#E9A23B" stroke-width="3"/><path d="M60 34 C60 34 80 58 80 70 A20 20 0 0 1 40 70 C40 58 60 34 60 34 Z" fill="none" stroke="#7FB3D5" stroke-width="3"/></svg>'
TRAIL = '<svg class="trail" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30 C150 0 300 40 500 18 S850 4 1000 22" fill="none" stroke="#E9A23B" stroke-width="3" stroke-linecap="round" stroke-dasharray="0 14"/></svg>'

def cta(title='Now welcoming founding families', text='Families with children ages 2 to 7, growing together. Join the list to hear first about dates, location and tuition.'):
    return f'''<section><div class="wrap"><div class="cta"><div class="who"><img src="assets/asal.svg" alt="" width="84" height="112"><div class="stack" style="gap:6px"><h2>{title}</h2><p>{text}</p></div></div><a class="btn" href="join.html">Join the founding list</a></div><div class="stripe"></div></div></section>'''

def page(fname, title, desc, body, artifact=False):
    nav = ''.join(f'<li><a href="{h}"{" aria-current=\"page\"" if h == fname else ""}>{t}</a></li>' for h, t in NAV)
    head = f'''<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="canonical" href="{SITE}/{'' if fname == 'index.html' else fname}">
<meta property="og:title" content="{title}"><meta property="og:description" content="{desc}"><meta property="og:image" content="{SITE}/assets/asal.png"><meta property="og:type" content="website">
<link rel="icon" href="assets/logo-mark.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Figtree:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/site.css">'''
    content = f'''<a class="skip" href="#main">Skip to content</a>
<header class="site-head"><div class="wrap">
  <a class="brand" href="index.html" aria-label="Nectara home"><img src="assets/logo-mark.svg" alt="" width="62" height="44"><span class="wordmark">nectara</span></a>
  <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="nav">Menu</button>
  <ul class="nav" id="nav">{nav}<li><a class="btn" href="join.html">Join us</a></li></ul>
</div></header>
<main id="main">
{body}
</main>
<footer class="site-foot"><div class="wrap">
  <span>&copy; 2026 Nectara &middot; Gather. Grow. Give.</span>
  <nav aria-label="Footer">{''.join(f'<a href="{h}">{t}</a>' for h, t in NAV)}<a href="join.html">Join</a></nav>
  <span>nectaraschool.org</span>
</div></footer>
<script src="assets/site.js"></script>'''
    if artifact:  # the artifact viewer supplies doctype/head/body
        return head + '\n' + content
    return f'<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n{head}\n</head>\n<body>\n{content}\n</body>\n</html>\n'

PAGES = {}

PAGES['index.html'] = ('Nectara', 'Nectara is a nature-rooted learning community for children ages 2 to 7, where every child blooms. Now welcoming founding families.', f'''
<div class="wrap hero">
  <div class="stack">
    <span class="eyebrow">A learning community for ages 2&ndash;7</span>
    <h1>Where every child blooms.</h1>
    <p class="lead">Like bees gathering nectar from many flowers, our children gather wonder from everything around them: the soil and the stars, their own breath and bodies, and the cultures of every corner of the earth.</p>
    <div class="actions"><a class="btn" href="join.html">Join the founding list</a><a class="btn ghost" href="approach.html">How we learn</a></div>
  </div>
  <figure class="asal-fig"><div class="asal-sun"><img src="assets/asal.svg" alt="Asal, the Nectara bee kid, a curly-haired child in a bee costume, waving" width="300" height="400"></div><span class="hello">Hi, I&rsquo;m Asal!</span></figure>
</div>
<section class="band-pollen"><div class="wrap">
  <div class="section-head"><h2>Learning the way nature lives</h2><p class="lead">Days move between the garden and a warm indoor studio, in every season, rain or shine. No one races to beat anyone. Like the hive, we grow together.</p></div>
  <div class="grid">
    <div class="tile">{LEAF}<h3>The garden</h3><p>Seeds, roots, herbs, mushrooms and bees: how life grows, heals and begins again.</p></div>
    <div class="tile">{BREATH}<h3>Breath and body</h3><p>Calm breathing, movement and feelings: understanding the body that grew from one tiny drop of life.</p></div>
    <div class="tile">{WORLD}<h3>One world</h3><p>Stories, songs, food and games from every culture, so children feel at home anywhere on earth.</p></div>
  </div>
</div></section>
<section style="padding-bottom:0"><div class="wrap"><div class="poem">{HEX_BG}<span class="eyebrow">From one drop</span><p class="big">A raindrop falls.<br>A seed drinks.<br><span>A child blooms.</span></p></div></div></section>
<section><div class="wrap split">
  <div class="stack"><span class="eyebrow">A day at Nectara</span><h2>A gentle rhythm that leaves room for wonder</h2><p class="lead">Each day is a loop from stillness to discovery and back again, with the garden at its heart.</p><a class="btn ghost" href="approach.html#day" style="justify-self:start">See the whole day</a></div>
  <ul class="day">
    <li><b>Arrive</b><span>Quiet breathing, a short poem, and each child names how they feel.</span></li>
    <li><b>Garden</b><span>Planting, watering, digging for roots and asking one big question together.</span></li>
    <li><b>Circle</b><span>What did I notice? What am I grateful for? What do I still wonder about?</span></li>
  </ul>
</div></section>
<section class="band-mist"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Three gardens, one hive</span><h2>Programs by age</h2></div>
  <div class="grid">
    <a class="band-card" href="programs.html#seeds" style="text-decoration:none"><span class="ages">2&ndash;3</span><h3>Seeds</h3><p>Senses, songs and soil, with a parent close by.</p></a>
    <a class="band-card" href="programs.html#sprouts" style="text-decoration:none"><span class="ages">4&ndash;5</span><h3>Sprouts</h3><p>Big questions, tiny gardens and first friendships.</p></a>
    <a class="band-card" href="programs.html#blossoms" style="text-decoration:none"><span class="ages">6&ndash;7</span><h3>Blossoms</h3><p>Projects, stories and early letters and numbers learned through living things.</p></a>
  </div>
</div></section>
{cta()}''')

PAGES['approach.html'] = ('How We Learn · Nectara', 'Nectara teaches through wonder, the garden, breath, feelings and the cultures of the world, never through rote memorization.', f'''
<div class="wrap hero" style="grid-template-columns:1fr">
  <div class="stack"><span class="eyebrow">How we learn</span><h1>Wonder first. Always.</h1>
  <p class="lead">Children are not empty jars to be filled with other people&rsquo;s answers. They are seeds that already hold everything they need. Our work is to give them sun, soil, water and time.</p></div>
</div>
{TRAIL}
<section><div class="wrap">
  <div class="section-head"><h2>Six things we believe</h2></div>
  <div class="grid">
    <div class="tile">{STAR}<h3>Each child has an inner power</h3><p>We help children notice what lights them up, and give it room to grow at its own pace.</p></div>
    <div class="tile">{LEAF}<h3>The garden is a classroom</h3><p>Herbs, roots, mushrooms and trees teach patience, care and how a living system heals itself.</p></div>
    <div class="tile">{BREATH}<h3>The body is a wonder</h3><p>Every child began as one droplet of life. We learn how our bodies move, rest, breathe and grow, and why.</p></div>
    <div class="tile">{HEART}<h3>Feelings have names</h3><p>Children learn to name what they feel, be with it, and find their way back to calm.</p></div>
    <div class="tile">{WORLD}<h3>The whole world is home</h3><p>Food, music, stories and games from many cultures, so every child feels like a citizen of the earth.</p></div>
    <div class="tile">{HIVE}<h3>Parents grow too</h3><p>Families learn alongside their children. A hive is stronger when everyone in it is growing.</p></div>
  </div>
</div></section>
<section class="band-pollen" id="day"><div class="wrap split">
  <div class="stack"><span class="eyebrow">A day at Nectara</span><h2>The rhythm of a day</h2><p class="lead">Like a bee&rsquo;s day, ours moves outward to explore and returns home to share. Garden time and brain-stimulating studio time take turns, so bodies and minds both stay awake.</p></div>
  <ul class="day">
    <li><b>Arrive</b><span>Quiet breathing, a short poem, and each child names how they feel.</span></li>
    <li><b>Garden</b><span>Planting, watering, digging for roots and asking one big question together.</span></li>
    <li><b>Move</b><span>Running, balancing, climbing and dancing: learning the body by using it.</span></li>
    <li><b>Make</b><span>Building, puzzles, drawing, and early letters and numbers through stories.</span></li>
    <li><b>World</b><span>A story, song or dish from another culture.</span></li>
    <li><b>Circle</b><span>What did I notice? What am I grateful for? What do I still wonder about?</span></li>
  </ul>
</div></section>
<section><div class="wrap"><div class="poem">{HEX_BG}<span class="eyebrow">Small, simple, deep</span><p class="big">We read less<br>and live more.<br><span>One idea, deeply felt, can change a path.</span></p></div></div></section>
<section style="padding-top:0"><div class="wrap split">
  <div class="stack"><h2>What you won&rsquo;t find here</h2><p class="lead">Worksheets for toddlers. Rankings. Rushing. Our children are not in a race, and neither are their families.</p></div>
  <div class="stack"><h2>What you will</h2><p class="lead">Muddy knees, quiet minutes, a lot of questions, and children who know how to calm themselves, care for a plant and make a friend.</p></div>
</div></section>
{cta()}''')

PAGES['programs.html'] = ('Programs · Nectara', 'Nectara programs for ages 2–3 (Seeds), 4–5 (Sprouts) and 6–7 (Blossoms), plus garden mornings and learning at home.', f'''
<div class="wrap hero" style="grid-template-columns:1fr">
  <div class="stack"><span class="eyebrow">Programs</span><h1>Three gardens, one hive.</h1>
  <p class="lead">Children grow in three age bands, each with its own rhythm. Everything is designed to grow with your child, from first steps in the soil to their first real projects.</p></div>
</div>
<section style="padding-top:0"><div class="wrap grid">
  <div class="band-card" id="seeds"><span class="ages">2&ndash;3</span><h3>Seeds</h3><p>A gentle start, often with a parent or caregiver nearby.</p><ul><li>Sensory play with soil, water, herbs and flowers</li><li>Songs, rhymes and breathing games with Asal</li><li>Naming feelings with simple words and faces</li><li>Short, playful garden visits</li></ul></div>
  <div class="band-card" id="sprouts"><span class="ages">4&ndash;5</span><h3>Sprouts</h3><p>Big questions and small gardens of their own.</p><ul><li>A garden bed to plant, tend and harvest</li><li>How the body works: heartbeat, breath, bones and food</li><li>Stories, songs and games from around the world</li><li>Calm-down tools children can use on their own</li></ul></div>
  <div class="band-card" id="blossoms"><span class="ages">6&ndash;7</span><h3>Blossoms</h3><p>Real projects that connect the garden to the wider world.</p><ul><li>Season-long projects: seed to harvest to meal</li><li>Early reading, writing and numbers through living things</li><li>Earth, sky and the cosmos: why the seasons turn</li><li>Helping younger children: everyone serves the hive</li></ul></div>
</div></section>
<section class="band-mist"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Ways to join</span><h2>First up: small sessions, big wonder</h2><p class="lead">Nectara begins where children already are: in parks, kitchens, libraries and windowsills. These first programs come before our own garden and classroom. Founding families hear the dates first.</p></div>
  <div class="grid">
    <div class="tile" id="little-scientists">{FLASK}<span class="tag">First up &middot; ages 4&ndash;7</span><h3>Little Scientists</h3><p>Hands-on experiments with everyday materials: a rain cloud in a jar, seeds that drink, things that float and sink. Each one ends with a big question to take home.</p><a href="#water-series">See the first series &rarr;</a></div>
    <div class="tile" id="park-mornings">{LEAF}<span class="tag">First up &middot; ages 2&ndash;5 with a parent</span><h3>Park mornings</h3><p>A slow walk, a breathing circle with Asal, a story and a nature treasure to bring home. Held at a local park; bring a blanket and muddy-ready shoes.</p></div>
    <div class="tile" id="garden-in-a-cup">{BREATH}<span class="tag">First up &middot; ages 2&ndash;7 at home</span><h3>Garden in a Cup</h3><p>Grow beans, herbs or microgreens on your windowsill. Each week brings a short check-in and Asal&rsquo;s question of the week to watch roots and leaves grow together.</p></div>
    <div class="tile" id="at-home">{STAR}<span class="tag">First up &middot; anywhere</span><h3>Nectara at home</h3><p>A monthly pack of simple wonder activities and short guided videos, so families anywhere can learn the Nectara way.</p></div>
  </div>
  <div class="section-head" style="margin-top:48px"><span class="eyebrow">Coming next</span><h2>The Nectara day</h2><p class="lead">The full garden-and-studio day for a small founding group, once we have a home with room to grow. Location, schedule and tuition will be shared with founding families first.</p></div>
</div></section>
<section id="water-series"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Little Scientists &middot; series one</span><h2>The Water Series</h2><p class="lead">Four 30-minute sessions, one a week, following a single drop of water on its journey: from the cloud, into a plant, onto a pond and back up to the sky. Asal flies along the whole way.</p></div>
  <div class="lessons">
{''.join(f"""    <article class="lesson">
      <img src="assets/lessons/{img}.webp" width="1200" height="750" alt="{alt}" loading="lazy">
      <div class="lesson-body"><span class="tag">Week {n}</span><h3>{title}</h3><p class="big-idea">{idea}</p><p>{what}</p><p class="home"><strong>Try it at home:</strong> {home}</p>
      <details><summary>See the steps</summary><img src="assets/lessons/{img}-steps.webp" width="1200" height="465" alt="{steps_alt}" loading="lazy"></details></div>
    </article>
""" for n, img, title, idea, what, home, alt, steps_alt in [
    (1, '1-rain-cloud', 'Grow a Rain Cloud', 'A cloud is a sky-full of tiny drops. When it holds too many, it shares them with the earth.', 'Children build a foam cloud on a cup of water and drip blue &ldquo;rain&rdquo; into it, counting drops until the cloud gets too heavy and the rain falls through.', 'next time it rains, look up together. What do the clouds look like right before?', 'Asal flies beside a cup of water topped with a foam cloud while a dropper drips blue rain into it', 'Three steps: a cup of water is the sky, foam on top is the cloud, blue drops fall through as rain'),
    (2, '2-seeds-drink', 'Seeds that Drink', 'A plant drinks from its feet to its leaves, one tiny sip at a time.', 'Celery stalks stand in colored water and slowly carry it up to their leaves. Under a magnifying glass, children find the plant&rsquo;s tiny straws.', 'stand a white flower or celery stalk in colored water overnight and check the leaves in the morning.', 'Asal hovers over a celery stalk drinking red water up to its leaves, beside a magnifying glass showing the dots inside the stalk', 'Three steps: color the water, plant the celery stalk, and the leaves turn red'),
    (3, '3-float-sink', 'Float or Sink', 'Some things ride on top of the water and some sink down to rest. Each one has its place.', 'After a short treasure walk, children guess and test what floats. A whole orange floats and a peeled one sinks; a ball of clay sinks until it becomes a boat.', 'at bath time, guess before each kitchen item goes in. Will it float or sink?', 'Asal rides a clay boat in a tub where a leaf, feather and orange float and a stone, spoon and peeled orange rest on the bottom', 'Three steps: a whole orange floats, a peeled orange sinks, and a clay boat floats while a clay ball sinks'),
    (4, '4-puddles', 'Where Puddles Go', 'Water never leaves us. The sun lifts it back to the sky, and one day it rains again.', 'Children trace a puddle with chalk and watch it shrink in the sun, make a cloud in a bag for the window, and see their own breath fog a spoon.', 'tape a bag with a little water to a sunny window and look for &ldquo;rain&rdquo; inside each day.', 'Asal flies up with the vapor rising from a chalk-ringed puddle toward a cloud that rains back down', 'Three steps: a cloud in a bag on a window, the breath test on a spoon, and a shrinking puddle inside chalk rings'),
])}  </div>
  <p class="lead" style="margin-top:28px">Sessions run in parks, libraries and community rooms with simple, grocery-store materials. <a href="join.html">Join the founding list</a> and choose Little Scientists to hear about the first dates.</p>
</div></section>
<section><div class="wrap split">
  <div class="stack"><h2>A note on what&rsquo;s ready and what&rsquo;s coming</h2><p class="lead">Nectara is new. We&rsquo;ll always tell you plainly what is open, what is planned, and which licensing and approvals apply to each program before it starts.</p></div>
  <div class="stack"><p>Have a question about a specific age, schedule or setting? Join the founding list and add it in the notes. Every message is read by a person.</p><a class="btn" href="join.html" style="justify-self:start">Ask or join</a></div>
</div></section>
{cta()}''')

PAGES['families.html'] = ('For Families · Nectara', 'Parents are a child’s first teachers. At Nectara, families grow alongside their children. Answers to common questions.', f'''
<div class="wrap hero" style="grid-template-columns:1fr">
  <div class="stack"><span class="eyebrow">For families</span><h1>You are your child&rsquo;s first teacher.</h1>
  <p class="lead">We don&rsquo;t take that role from you. We share it. Nectara families get simple ways to bring the garden, the breath and the wonder home.</p></div>
</div>
<section style="padding-top:0"><div class="wrap grid">
  <div class="tile">{LEAF}<h3>Take-home seeds</h3><p>Each week, one small idea to try at home: a plant to water, a breath to practice, a question to ask at dinner.</p></div>
  <div class="tile">{HIVE}<h3>Family circles</h3><p>Regular gatherings where parents share, learn and slow down together, with the children close by.</p></div>
  <div class="tile">{HEART}<h3>An open door</h3><p>Clear, warm communication about how your child is growing, in their body, their feelings and their curiosity.</p></div>
</div></section>
<section class="band-pollen"><div class="wrap split">
  <div class="stack"><span class="eyebrow">Founding families</span><h2>Help us plant the first garden</h2><p class="lead">Founding families hear first about location, dates and tuition, and help shape the first programs with their ideas and questions.</p><a class="btn" href="join.html" style="justify-self:start">Join the founding list</a></div>
  <img src="assets/asal.svg" alt="Asal the bee kid waving" width="300" height="400" style="width:min(260px,70%);justify-self:center">
</div></section>
<section><div class="wrap" style="max-width:820px">
  <div class="section-head"><h2>Questions families ask</h2></div>
  <details><summary>What ages does Nectara serve?</summary><p>Children ages 2 to 7, in three bands: Seeds (2&ndash;3), Sprouts (4&ndash;5) and Blossoms (6&ndash;7).</p></details>
  <details><summary>When and where will Nectara open?</summary><p>We&rsquo;re starting with small sessions in local parks and community spaces, plus activities families can do at home. Our own garden and classroom come next. Founding families hear every date and location first.</p></details>
  <details><summary>What does it cost?</summary><p>Tuition is being set now and will be shared with founding families first, along with any founding-family options.</p></details>
  <details><summary>Is Nectara licensed?</summary><p>We&rsquo;re working through the licensing and approvals that apply to our first program and location. We&rsquo;ll share exactly what is in place before any program begins.</p></details>
  <details><summary>Do children use screens?</summary><p>Rarely, and only with purpose: a short guided video or a call with friends from another part of the world. Most of the day happens in the garden and the studio.</p></details>
  <details><summary>What should my child wear?</summary><p>Clothes that can get muddy and shoes for the garden. We go outside in every season.</p></details>
  <details><summary>Can parents take part?</summary><p>Yes. Parents of our youngest children are often close by, and every family is invited to family circles and garden mornings.</p></details>
</div></section>
{cta()}''')

PAGES['asal.html'] = ('Meet Asal · Nectara', 'Asal is Nectara’s little bee: curious, kind and always buzzing with questions. Asal means honey.', f'''
<div class="wrap hero">
  <div class="stack"><span class="eyebrow">Meet Asal</span><h1>Hi! I&rsquo;m Asal, the little bee.</h1>
  <p class="lead">Asal means honey. I love flowers, rain, big questions and my friends. I fly from flower to flower to gather nectar, and I fly from question to question to gather wonder.</p></div>
  <figure class="asal-fig"><div class="asal-sun"><img src="assets/asal.svg" alt="Asal, a curly-haired child in a bee costume with antennae and wings, waving" width="300" height="400"></div><span class="hello">Buzz buzz!</span></figure>
</div>
<section class="band-pollen"><div class="wrap split">
  <div class="stack"><span class="eyebrow">Say it with Asal</span><h2>Asal&rsquo;s breathing song</h2><p class="lead">Say it slowly. Breathe in on the first line, out on the next.</p></div>
  <p class="chant"><span>Buzz in, breathe in,</span><span>buzz out, breathe out.</span><span>I am small,</span><span>I am strong,</span><span>I help the garden grow.</span></p>
</div></section>
<section><div class="wrap">
  <div class="section-head"><h2>Things Asal loves</h2></div>
  <div class="grid">
    <div class="tile">{LEAF}<h3>Flowers</h3><p>&ldquo;Every flower has its own smell. Can you find three?&rdquo;</p></div>
    <div class="tile">{BREATH}<h3>Rain</h3><p>&ldquo;One raindrop is tiny. Lots of raindrops make a river!&rdquo;</p></div>
    <div class="tile">{HIVE}<h3>The hive</h3><p>&ldquo;Bees help each other. Who did you help today?&rdquo;</p></div>
    <div class="tile">{STAR}<h3>Stars</h3><p>&ldquo;The sun is a star. Isn&rsquo;t that amazing?&rdquo;</p></div>
  </div>
</div></section>
<section style="padding-top:0"><div class="wrap"><div class="poem">{HEX_BG}<span class="eyebrow">Asal&rsquo;s big question</span><p class="big">What did you<br>wonder about<br><span>today?</span></p></div></div></section>
{cta('Fly with Asal', 'Join the founding list for Asal stories, songs and garden ideas for home.')}''')

PAGES['about.html'] = ('Our Story · Nectara', 'Why Nectara exists, where the name comes from, and how it will grow: from one garden to a global community.', f'''
<div class="wrap hero" style="grid-template-columns:1fr">
  <div class="stack"><span class="eyebrow">Our story</span><h1>One bee becomes a hive.</h1>
  <p class="lead">A honey bee is free, patient and resilient. It gives more than it takes, and its work feeds a whole landscape. That&rsquo;s the kind of person we hope every Nectara child grows to be, and the way we hope Nectara itself will grow.</p></div>
</div>
<section style="padding-top:0"><div class="wrap split">
  <div class="stack"><h2>Why Nectara</h2>
  <p>Nectara was founded by Jawad Yousofi, a father who looked at the schooling waiting for his young son and wanted something different: less rushing and memorizing, more wonder, nature and care.</p>
  <p>Many schools hand children other people&rsquo;s ideas and ask them to compete. We believe children learn best by living: digging in the garden, feeling their own breath, meeting the cultures of the world, and discovering who they are.</p>
  <p>Nectara is the school we wanted for our own children, built to share with yours.</p></div>
  <div class="stack"><h2>The name</h2>
  <p><b>Nectara</b> comes from nectar, the sweetness bees gather from many flowers and turn into something that nourishes everyone.</p>
  <p><b>Asal</b>, our bee kid, means honey.</p>
  <p>Our mark is a bee&rsquo;s flight path drawing the letter N: every child&rsquo;s path is their own, and every path leaves something sweet behind.</p></div>
</div></section>
<section class="band-forest"><div class="wrap split">
  <div class="stack"><span class="eyebrow" style="color:#A9BFA0">How Nectara will grow</span><h2>From one garden to many</h2><p>We&rsquo;re starting small on purpose. Each step grows only when the one before it is healthy, so Nectara keeps its soul as it spreads.</p></div>
  <ol class="path">
    <li><div><h3>First sessions <span class="now">Now</span></h3><p>Little Scientists, park mornings and founding families.</p></div></li>
    <li><div><h3>Little Scientists, park mornings and Nectara at home</h3><p>Small sessions and at-home activities that bring the Nectara way to families now.</p></div></li>
    <li><div><h3>Teachers and partners</h3><p>Training and support for educators who share the vision.</p></div></li>
    <li><div><h3>A global hive</h3><p>Nectara gardens in many places, learning from each other as one community.</p></div></li>
  </ol>
</div></section>
<section><div class="wrap split">
  <div class="stack"><span class="eyebrow">Grow with us</span><h2>Teachers, gardeners and partners</h2><p class="lead">If you teach young children, tend gardens, make music or stories, or run a space where children could learn, we&rsquo;d love to meet you.</p></div>
  <div class="stack"><p>Tell us a little about yourself and how you&rsquo;d like to help. We&rsquo;re building a community, not just a school.</p><a class="btn" href="join.html?as=partner" style="justify-self:start">Introduce yourself</a></div>
</div></section>''')

PAGES['join.html'] = ('Join Nectara', 'Join the Nectara founding list to hear first about location, dates and tuition for children ages 2 to 7.', f'''
<div class="wrap hero">
  <div class="stack"><span class="eyebrow">Join us</span><h1>Join the founding list.</h1>
  <p class="lead">Founding families hear first about location, dates and tuition, and help shape our first programs. Teachers and partners are welcome too.</p>
  <p>No commitment and no payment. We&rsquo;ll only write when there&rsquo;s real news.</p>
  <img src="assets/asal.svg" alt="" width="300" height="400" style="width:min(200px,50%)"></div>
  <form id="interest-form" novalidate>
    <fieldset><legend>I&rsquo;m joining as</legend><div class="choices">
      <label class="choice"><input type="radio" id="role-family" name="role" value="family" checked> A family</label>
      <label class="choice"><input type="radio" id="role-partner" name="role" value="partner"> A teacher or partner</label>
    </div></fieldset>
    <div class="row2">
      <div class="field"><label for="name">Your name</label><input id="name" name="name" autocomplete="name" required maxlength="120"></div>
      <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required maxlength="200"></div>
    </div>
    <div class="row2">
      <div class="field"><label for="phone">Phone <span class="hint">(optional)</span></label><input id="phone" name="phone" type="tel" autocomplete="tel" maxlength="40"></div>
      <div class="field"><label for="city">City or area</label><input id="city" name="city" autocomplete="address-level2" required maxlength="120"></div>
    </div>
    <fieldset><legend>Children&rsquo;s ages <span class="hint">(families)</span></legend><div class="choices">
      <label class="choice"><input type="checkbox" id="age-23" name="ages" value="2-3"> 2&ndash;3</label>
      <label class="choice"><input type="checkbox" id="age-45" name="ages" value="4-5"> 4&ndash;5</label>
      <label class="choice"><input type="checkbox" id="age-67" name="ages" value="6-7"> 6&ndash;7</label>
      <label class="choice"><input type="checkbox" id="age-under2" name="ages" value="under-2"> Under 2</label>
    </div></fieldset>
    <div class="field"><label for="interest">Most interested in</label>
      <select id="interest" name="interest"><option value="little-scientists">Little Scientists (ages 4&ndash;7)</option><option value="park-mornings">Park mornings (ages 2&ndash;5, with a parent)</option><option value="garden-in-a-cup">Garden in a Cup (at home)</option><option value="at-home">Nectara at home</option><option value="day">The full Nectara day (coming next)</option><option value="teach">Teaching or partnering</option><option value="not-sure">Not sure yet</option></select></div>
    <div class="field"><label for="notes">Anything you&rsquo;d like us to know? <span class="hint">(optional)</span></label><textarea id="notes" name="notes" rows="4" maxlength="2000"></textarea></div>
    <div class="hp" aria-hidden="true"><label for="website">Leave this empty</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div>
    <button class="btn" type="submit" style="justify-self:start">Join the founding list</button>
    <p class="status" id="form-status" role="status" tabindex="-1" hidden></p>
    <p class="hint">We use your details only to tell you about Nectara. We never sell or share them.</p>
  </form>
</div>''')

PAGES['404.html'] = ('Page Not Found · Nectara', 'This page flew away.', '''
<div class="wrap hero"><div class="stack"><span class="eyebrow">404</span><h1>This page flew away.</h1><p class="lead">Asal looked everywhere, but couldn&rsquo;t find it. Let&rsquo;s head back to the garden.</p><a class="btn" href="index.html" style="justify-self:start">Back home</a></div>
<figure class="asal-fig"><div class="asal-sun"><img src="assets/asal.svg" alt="Asal the bee kid" width="300" height="400"></div><span class="hello">Oops!</span></figure></div>''')

if __name__ == '__main__':
    import os
    for f, (t, d, b) in PAGES.items():
        open(f, 'w').write(page(f, t, d, b))
    os.makedirs('preview', exist_ok=True)
    for f, (t, d, b) in PAGES.items():  # artifact preview copies: index without skeleton, others full pages
        open('preview/' + f, 'w').write(page(f, t, d, b, artifact=(f == 'index.html')))
    pages = [f for f in PAGES if f != '404.html']
    open('sitemap.xml', 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>{SITE}/{"" if p == "index.html" else p}</loc></url>\n' for p in pages) + '</urlset>\n')
    open('robots.txt', 'w').write(f'User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n')
    print('built', len(PAGES), 'pages')
