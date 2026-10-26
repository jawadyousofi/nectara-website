"""Makes Nectara's supporting art with OpenAI's image API, guided by the style refs in tools/art/refs.
Needs OPENAI_API_KEY in the environment and api.openai.com allowed. Usage:
  python3 tools/art/generate.py cast            # each child, plain and see-through (Inside Me)
  python3 tools/art/generate.py one ID inside   # one child again
Images land in tools/art/out/ for review; approved ones are copied into assets/world/kids/."""
import base64, json, os, sys, urllib.request, uuid
HERE = os.path.dirname(os.path.abspath(__file__))
KEY = os.environ.get('OPENAI_API_KEY', '')
CAST = json.load(open(os.path.join(HERE, 'cast.json')))
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)

def edit(prompt, refs, out_path, size='1024x1536'):
    # Multipart request to /v1/images/edits so the reference images steer the style.
    boundary = uuid.uuid4().hex
    parts = []
    def field(name, value):
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    for k, v in (('model', 'gpt-image-1'), ('prompt', prompt), ('size', size), ('background', 'transparent'), ('quality', 'high'), ('n', '1')):
        field(k, v)
    for r in refs:
        data = open(r, 'rb').read(); mime = 'image/png' if r.endswith('.png') else 'image/webp'
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="image[]"; filename="{os.path.basename(r)}"\r\nContent-Type: {mime}\r\n\r\n'.encode() + data + b'\r\n')
    parts.append(f'--{boundary}--\r\n'.encode())
    req = urllib.request.Request('https://api.openai.com/v1/images/edits', data=b''.join(parts), method='POST',
        headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': 'multipart/form-data; boundary=' + boundary})
    with urllib.request.urlopen(req, timeout=300) as r:
        j = json.load(r)
    open(out_path, 'wb').write(base64.b64decode(j['data'][0]['b64_json']))
    print('made', out_path)

def make(kid, inside):
    refs = [os.path.join(HERE, 'refs', f) for f in sorted(os.listdir(os.path.join(HERE, 'refs')))]
    prompt = CAST['style'] + ' The character is ' + kid['desc'] + '.' + (' ' + CAST['inside'] if inside else '') + \
        ' Use the reference images only for the art style, not for the character\'s looks.'
    edit(prompt, refs, os.path.join(OUT, kid['id'] + ('-inside' if inside else '') + '.png'))

if __name__ == '__main__':
    if not KEY: sys.exit('Set OPENAI_API_KEY first.')
    if sys.argv[1] == 'cast':
        for kid in CAST['children']:
            make(kid, False); make(kid, True)
    elif sys.argv[1] == 'one':
        kid = [k for k in CAST['children'] if k['id'] == sys.argv[2]][0]
        make(kid, len(sys.argv) > 3 and sys.argv[3] == 'inside')
