import os, subprocess, sys, json, tempfile, html

CHROME = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell"
OUT = sys.argv[1]
POSTS = json.load(open(sys.argv[2]))

CSS = """
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px}
body{font-family:'Inter',sans-serif;color:#fff;
 background:linear-gradient(160deg,#0B3B3A 0%,#0F4744 50%,#14564F 100%);
 position:relative;overflow:hidden}
.glow{position:absolute;width:900px;height:900px;border-radius:50%;
 background:radial-gradient(circle,rgba(110,231,168,.13) 0%,rgba(110,231,168,0) 65%);
 right:-380px;top:-300px}
.top{position:absolute;top:80px;left:90px;right:90px;display:flex;
 justify-content:space-between;align-items:center}
.logo{display:flex;align-items:center;gap:18px;font-weight:800;font-size:34px;letter-spacing:1px}
.logo i{width:50px;height:50px;border-radius:50%;border:4px solid #fff;display:flex;
 align-items:center;justify-content:center}
.logo i b{width:20px;height:20px;border-radius:50%;border:4px solid #fff}
.count{font-size:30px;font-weight:600;opacity:.8}
.main{position:absolute;left:90px;right:90px;top:50%;transform:translateY(-50%)}
.label{color:#6EE7A8;font-weight:800;font-size:30px;letter-spacing:5px;margin-bottom:40px}
h1{font-weight:900;line-height:1.04;letter-spacing:-2px}
h1 em{font-style:normal;color:#6EE7A8}
.cover h1{font-size:104px}
.inner h1{font-size:88px}
p{font-size:40px;line-height:1.4;margin-top:48px;color:rgba(255,255,255,.88);font-weight:400}
p strong{color:#fff;font-weight:800}
.cta{display:inline-block;margin-top:56px;background:#6EE7A8;color:#0B3B3A;
 font-weight:800;font-size:36px;padding:26px 44px;border-radius:999px}
.foot{position:absolute;left:90px;right:90px;bottom:80px;display:flex;
 justify-content:space-between;font-size:28px;font-weight:600}
.foot .t{opacity:.85}
.foot .a{color:#6EE7A8;font-weight:800}
"""

def slide_html(post, i, s):
    n = len(post["slides"])
    cover = i == 0
    foot = ('<div class="foot"><span class="t">Relacionamento que traz cliente de volta</span>'
            '<span class="a">Arrasta &rarr;</span></div>') if cover else (
            '<div class="foot"><span class="t">@eitechrelacionamentos</span><span></span></div>')
    cta = f'<div class="cta">{s["cta"]}</div>' if s.get("cta") else ""
    body = f'<p>{s["body"]}</p>' if s.get("body") else ""
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head>
<body class="{'cover' if cover else 'inner'}"><div class="glow"></div>
<div class="top"><div class="logo"><i><b></b></i>EITECH</div><div class="count">{i+1}/{n}</div></div>
<div class="main"><div class="label">{s['label']}</div><h1>{s['title']}</h1>{body}{cta}</div>
{foot}</body></html>"""

for post in POSTS:
    d = os.path.join(OUT, post["dir"])
    os.makedirs(d, exist_ok=True)
    for i, s in enumerate(post["slides"]):
        with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as f:
            f.write(slide_html(post, i, s))
        png = os.path.join(d, f"slide-{i+1:02d}.png")
        subprocess.run([CHROME, "--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1",
                        "--window-size=1080,1350", f"--screenshot={png}", "file://" + f.name],
                       check=True, capture_output=True)
        os.unlink(f.name)
    print(d, len(post["slides"]))
