"""Convierte texto en contornos vectoriales VML para que Outlook lo renderice
con la tipografia exacta, sin fuente instalada y sin descargar imagenes."""
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
import sys

class VMLPen(BasePen):
    def __init__(self, glyphSet, scale, xoff, ascent):
        super().__init__(glyphSet)
        self.cmds=[]; self.s=scale; self.x=xoff; self.asc=ascent
    def _pt(self, p):
        # VML tiene Y hacia abajo; la fuente hacia arriba -> se invierte
        return int(round(p[0]*self.s + self.x)), int(round((self.asc - p[1])*self.s))
    def _moveTo(self, p):
        x,y=self._pt(p); self.cmds.append(f"m{x},{y}")
    def _lineTo(self, p):
        x,y=self._pt(p); self.cmds.append(f"l{x},{y}")
    def _curveToOne(self, p1,p2,p3):
        a=self._pt(p1); b=self._pt(p2); c=self._pt(p3)
        self.cmds.append(f"c{a[0]},{a[1]},{b[0]},{b[1]},{c[0]},{c[1]}")
    def _closePath(self):
        self.cmds.append("x")

def text_to_vml(font_path, text, px):
    f=TTFont(font_path)
    upm=f['head'].unitsPerEm
    asc=f['hhea'].ascent; desc=f['hhea'].descent
    scale=px/upm
    gs=f.getGlyphSet(); cmap=f.getBestCmap(); hmtx=f['hmtx']
    parts=[]; xoff=0.0
    for ch in text:
        gname=cmap.get(ord(ch))
        if not gname: continue
        pen=VMLPen(gs, scale, xoff, asc)
        gs[gname].draw(pen)
        parts.extend(pen.cmds)
        xoff += hmtx[gname][0]*scale
    path="".join(parts)+"e"
    w=int(round(xoff)); h=int(round((asc-desc)*scale))
    return path, w, h

if __name__=="__main__":
    fp,txt,px = sys.argv[1], sys.argv[2], int(sys.argv[3])
    p,w,h = text_to_vml(fp,txt,px)
    print(f"width={w} height={h} bytes={len(p)}")
    print(p)
