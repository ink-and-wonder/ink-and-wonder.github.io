"""Transcode generated source artwork and rasterize the game's code-native icon."""
from pathlib import Path
from PIL import Image, ImageDraw
import math

root=Path(__file__).resolve().parents[1]
assets=root/'dist'/'assets'
for name in ('atelier','village','forest'):
    source=assets/f'{name}.png'
    if not source.exists():
        source=root/'art-source'/f'{name}.png'
    if source.exists():
        with Image.open(source) as image:
            image.convert('RGB').save(assets/f'{name}.webp',quality=88,method=6)
for size in (192,512):
    scale=3
    image=Image.new('RGB',(size*scale,size*scale),'#18352f')
    d=ImageDraw.Draw(image)
    f=lambda n:round(n/192*size*scale)
    stroke=f(2.4)
    d.ellipse((f(31),f(31),f(161),f(161)),outline='#e9dfc1',width=stroke)
    d.ellipse((f(74),f(74),f(118),f(118)),outline='#e9dfc1',width=stroke)
    for i in range(8):
        a=i*math.pi/4
        d.line([(f(96+34*math.cos(a)),f(96+34*math.sin(a))),(f(96+48*math.cos(a)),f(96+48*math.sin(a)))],fill='#e9dfc1',width=stroke)
    image.resize((size,size),Image.Resampling.LANCZOS).save(assets/f'icon-{size}.png')
print('Prepared artwork and install icons.')
