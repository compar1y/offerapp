# Gera as miniaturas que o app mostra nas listas, a partir das páginas já convertidas:
#  - public/img/receitas/NNN.webp: a foto do panetone de cada receita (achada sozinha na página)
#  - public/img/sos/NN.webp: a foto de cada ficha do SOS Massa
#  - public/img/capas/<material>.webp: a capa (página 1) dos materiais que têm capa de verdade
# Uso: python3 scripts/gerar-miniaturas.py /mnt/project-files/app-novo/paginas-hd
import os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from miniaturas_foto import melhor_foto

PAG = sys.argv[1] if len(sys.argv) > 1 else '/mnt/project-files/app-novo/paginas-hd'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'img')
CAPAS = ['b01', 'b02', 'b03', 'b04', 'b06', 'b07', 'b08', 'fichas-socorro', 'recheios', 'encomenda-puxa-encomenda', 'primeira-encomenda']

def abrir(m, p):
    return Image.open(f'{PAG}/{m}/{p:03d}.webp').convert('RGB')

def salvar(im, caminho, largura):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    im = im.resize((largura, round(largura * im.height / im.width)), Image.LANCZOS)
    im.save(caminho, quality=78, method=6)

for n in range(1, 101):
    foto, _ = melhor_foto(abrir('ebook', n))
    w, h = foto.size
    foto = foto.crop((int(w * .04), int(h * .04), int(w * .96), int(h * .96)))  # tira bordas de moldura
    salvar(foto, f'{OUT}/receitas/{n:03d}.webp', 360)
for f in range(1, 22):
    im = abrir('fichas-socorro', f + 3)
    w, h = im.size
    salvar(im.crop((int(w * .62), int(h * .13), int(w * .965), int(h * .46))), f'{OUT}/sos/{f:02d}.webp', 240)
for m in CAPAS:
    salvar(abrir(m, 1), f'{OUT}/capas/{m}.webp', 360)
print('miniaturas prontas')
