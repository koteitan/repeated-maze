import re
from xml.sax.saxutils import escape

SIZE = 1000.0
X0, Y0 = 120.0, 40.0
MARGIN_R = 40.0
BG, FG, RED, GREEN = "#ffffff", "#222222", "#dd2222", "#1a9e3a"

# Each maze: ports (junction -> y fraction on the left wall),
# subs (letter -> (x frac, y frac, scale)), edges (junction, sub, sub junction),
# answer rules (address regex -> edges on the solution), depth, label depth.
MAZES = {
    "Koteitan-inffracmaze-01-1-hop": dict(
        start_goal=("1", "2"),
        ports={1: 0.3, 2: 0.7},
        subs={"A": (0.3, 0.25, 0.5)},
        edges=[(1, "A", 1), (2, "A", 2)],
        answer=[(r"A*", {(1, "A", 1), (2, "A", 2)})],
        depth=3, label_depth=2),
    "Koteitan-inffracmaze-02-2-hop": dict(
        start_goal=("1", "3"),
        ports={1: 0.15, 2: 0.5, 3: 0.85},
        subs={"A": (0.25, 0.06, 0.4), "B": (0.55, 0.5, 0.4)},
        edges=[(1, "A", 1), (2, "A", 2), (2, "B", 2), (3, "B", 3)],
        answer=[(r"A*", {(1, "A", 1), (2, "A", 2)}),
                (r"B*", {(2, "B", 2), (3, "B", 3)})],
        depth=3, label_depth=2),
    "Koteitan-inffracmaze-03-w-hop": dict(
        start_goal=("1", "3"),
        ports={1: 0.2, 2: 0.5, 3: 0.85},
        subs={"A": (0.25, 0.06, 0.4), "B": (0.55, 0.5, 0.4)},
        edges=[(1, "A", 1), (2, "A", 2), (2, "B", 1), (3, "B", 3)],
        answer=[(r"B*A*", {(1, "A", 1), (2, "A", 2)}),
                (r"B*", {(2, "B", 1), (3, "B", 3)})],
        depth=3, label_depth=2),
    "Koteitan-inffracmaze-04-w2-hop": dict(
        start_goal=("1", "5"),
        ports={1: 0.06, 2: 0.26, 3: 0.50, 4: 0.70, 5: 0.93},
        subs={"A": (0.22, 0.03, 0.2), "B": (0.62, 0.27, 0.2),
              "C": (0.22, 0.52, 0.2), "D": (0.62, 0.76, 0.2)},
        edges=[(1, "A", 1), (2, "A", 2), (2, "B", 1), (3, "B", 3),
               (3, "C", 3), (4, "C", 4), (4, "D", 3), (5, "D", 5)],
        answer=[(r"B*A*", {(1, "A", 1), (2, "A", 2)}),
                (r"B*", {(2, "B", 1), (3, "B", 3)}),
                (r"D*C*", {(3, "C", 3), (4, "C", 4)}),
                (r"D*", {(4, "D", 3), (5, "D", 5)})],
        depth=2, label_depth=1),
    "Koteitan-inffracmaze-05-wt2-hop": dict(
        start_goal=("1", "4"),
        ports={1: 0.10, 2: 0.35, 3: 0.62, 4: 0.90},
        subs={"A": (0.20, 0.02, 0.28), "B": (0.45, 0.34, 0.28), "C": (0.70, 0.66, 0.28)},
        edges=[(1, "A", 1), (2, "A", 2), (2, "B", 1), (3, "B", 3), (3, "C", 1), (4, "C", 4)],
        answer=[(r"C*B*A*", {(1, "A", 1), (2, "A", 2)}),
                (r"C*B*", {(2, "B", 1), (3, "B", 3)}),
                (r"C*", {(3, "C", 1), (4, "C", 4)})],
        depth=2, label_depth=1),
    "Koteitan-inffracmaze-06-wt3-hop": dict(
        start_goal=("1", "5"),
        ports={1: 0.08, 2: 0.30, 3: 0.52, 4: 0.74, 5: 0.94},
        subs={"A": (0.16, 0.02, 0.2), "B": (0.36, 0.26, 0.2),
              "C": (0.56, 0.50, 0.2), "D": (0.76, 0.75, 0.2)},
        edges=[(1, "A", 1), (2, "A", 2), (2, "B", 1), (3, "B", 3),
               (3, "C", 1), (4, "C", 4), (4, "D", 1), (5, "D", 5)],
        answer=[(r"D*C*B*A*", {(1, "A", 1), (2, "A", 2)}),
                (r"D*C*B*", {(2, "B", 1), (3, "B", 3)}),
                (r"D*C*", {(3, "C", 1), (4, "C", 4)}),
                (r"D*", {(4, "D", 1), (5, "D", 5)})],
        depth=2, label_depth=1),
}


def render(cfg):
    cells, svg = [], []
    nid = [2]

    def new_id():
        nid[0] += 1
        return f"c{nid[0]}"

    def on_answer(addr, e):
        return any(re.fullmatch(p, addr) and e in es for p, es in cfg["answer"])

    def box(addr, x, y, w, d):
        name = addr if addr else "M"
        fs = max(14, round(36 * (w / SIZE) ** 0.6))
        sw = 2 if d == 0 else 1
        cells.append(f'<mxCell id="{new_id()}" value="{escape(name)}" style="rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor={FG};strokeWidth={sw};fontColor={FG};align=right;verticalAlign=top;spacingRight=4;fontSize={fs};" vertex="1" parent="1"><mxGeometry x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{w:.2f}" as="geometry"/></mxCell>')
        svg.append(f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{w:.2f}" fill="none" stroke="{FG}" stroke-width="{sw}"/>')
        svg.append(f'<text x="{x + w - 4:.2f}" y="{y + fs + 2:.2f}" font-size="{fs}" text-anchor="end" fill="{FG}">{escape(name)}</text>')
        r = max(2.5, 7 * w / SIZE)
        pfs = max(14, round(32 * (w / SIZE) ** 0.6))
        ports = {}
        for j, fy in cfg["ports"].items():
            px, py = x, y + w * fy
            pid = new_id()
            ports[j] = pid
            label = f"{addr}{j}" if d <= cfg["label_depth"] else ""
            cells.append(f'<mxCell id="{pid}" value="{escape(label)}" style="ellipse;html=1;fillColor={FG};strokeColor=none;labelPosition=right;verticalLabelPosition=bottom;align=left;verticalAlign=top;spacingTop=-4;spacingLeft=-2;fontSize={pfs};fontColor={FG};fontStyle=0;" vertex="1" parent="1"><mxGeometry x="{px - r:.2f}" y="{py - r:.2f}" width="{2 * r:.2f}" height="{2 * r:.2f}" as="geometry"/></mxCell>')
            svg.append(f'<circle cx="{px:.2f}" cy="{py:.2f}" r="{r:.2f}" fill="{FG}"/>')
            if label:
                svg.append(f'<text x="{px + r:.2f}" y="{py + r + pfs * 0.8:.2f}" font-size="{pfs}" fill="{FG}">{escape(label)}</text>')
        return ports

    def build(addr, x, y, w, d):
        ports = box(addr, x, y, w, d)
        if d == cfg["depth"]:
            return ports
        child = {s: build(addr + s, x + w * fx, y + w * fy, w * sc, d + 1)
                 for s, (fx, fy, sc) in cfg["subs"].items()}
        for e in cfg["edges"]:
            j, s, k = e
            ans = on_answer(addr, e)
            col = GREEN if ans else RED
            sw = max(1, (3 if ans else 1.5) * (w / SIZE) ** 0.5)
            cells.append(f'<mxCell id="{new_id()}" style="endArrow=none;html=1;strokeColor={col};strokeWidth={sw:.2f};" edge="1" parent="1" source="{ports[j]}" target="{child[s][k]}"><mxGeometry relative="1" as="geometry"/></mxCell>')
            fx, fy, sc = cfg["subs"][s]
            x1, y1 = x, y + w * cfg["ports"][j]
            x2, y2 = x + w * fx, y + w * fy + w * sc * cfg["ports"][k]
            svg.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{col}" stroke-width="{sw:.2f}"/>')
        return ports

    build("", X0, Y0, SIZE, 0)

    def port_pos(addr):
        if isinstance(addr, float):
            return X0, Y0 + SIZE * addr, SIZE
        letters, num = re.fullmatch(r"([A-Z]*)(\d+)", addr).groups()
        x, y, w = X0, Y0, SIZE
        for ch in letters:
            fx, fy, sc = cfg["subs"][ch]
            x, y, w = x + w * fx, y + w * fy, w * sc
        return x, y + w * cfg["ports"][int(num)], w

    tfs = 28
    for word, addr, dy in zip(("start", "goal"), cfg["start_goal"], cfg.get("start_goal_dy", (0, 0))):
        px, py, w = port_pos(addr)
        r = max(2.5, 7 * w / SIZE)
        if isinstance(addr, float):
            cells.append(f'<mxCell id="{new_id()}" value="" style="ellipse;html=1;fillColor={FG};strokeColor=none;" vertex="1" parent="1"><mxGeometry x="{px - r:.2f}" y="{py - r:.2f}" width="{2 * r:.2f}" height="{2 * r:.2f}" as="geometry"/></mxCell>')
            svg.append(f'<circle cx="{px:.2f}" cy="{py:.2f}" r="{r:.2f}" fill="{FG}"/>')
        py += dy
        tw, th = 90.0, 34.0
        tx, ty = px - r - 6 - tw, py - th / 2
        cells.append(f'<mxCell id="{new_id()}" value="{word}" style="text;html=1;align=right;verticalAlign=middle;fontSize={tfs};fontColor={FG};" vertex="1" parent="1"><mxGeometry x="{tx:.2f}" y="{ty:.2f}" width="{tw:.2f}" height="{th:.2f}" as="geometry"/></mxCell>')
        svg.append(f'<text x="{px - r - 6:.2f}" y="{py + tfs * 0.35:.2f}" font-size="{tfs}" text-anchor="end" fill="{FG}">{word}</text>')

    for fy in cfg.get("dots", []):
        px, py, r = X0, Y0 + SIZE * fy, 3.0
        cells.append(f'<mxCell id="{new_id()}" value="" style="ellipse;html=1;fillColor={FG};strokeColor=none;" vertex="1" parent="1"><mxGeometry x="{px - r:.2f}" y="{py - r:.2f}" width="{2 * r:.2f}" height="{2 * r:.2f}" as="geometry"/></mxCell>')
        svg.append(f'<circle cx="{px:.2f}" cy="{py:.2f}" r="{r:.2f}" fill="{FG}"/>')

    for fx, fy, text, size in cfg.get("texts", []):
        tx, ty = X0 + SIZE * fx, Y0 + SIZE * fy
        cells.append(f'<mxCell id="{new_id()}" value="{escape(text)}" style="text;html=1;align=center;verticalAlign=middle;fontSize={size};fontColor={FG};" vertex="1" parent="1"><mxGeometry x="{tx - 40:.2f}" y="{ty - size:.2f}" width="80" height="{2 * size:.2f}" as="geometry"/></mxCell>')
        svg.append(f'<text x="{tx:.2f}" y="{ty + size * 0.35:.2f}" font-size="{size}" text-anchor="middle" fill="{FG}">{escape(text)}</text>')

    total_w = X0 + SIZE + MARGIN_R
    total = Y0 * 2 + SIZE
    drawio = (
        '<mxfile host="Electron"><diagram name="maze" id="maze">'
        f'<mxGraphModel dx="1100" dy="1100" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="1100" pageHeight="1100" math="0" shadow="0" background="{BG}">'
        '<root><mxCell id="0"/><mxCell id="1" parent="0"/>' + "".join(cells) +
        '</root></mxGraphModel></diagram></mxfile>\n')
    svgtext = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_w:.0f} {total:.0f}" font-family="sans-serif">'
        f'<rect width="100%" height="100%" fill="{BG}"/>' + "".join(svg) + '</svg>\n')
    return drawio, svgtext


for name, cfg in MAZES.items():
    drawio, svgtext = render(cfg)
    open(f"{name}.drawio", "w").write(drawio)
    open(f"{name}.svg", "w").write(svgtext)
    print(name)
