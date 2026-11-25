"""Pack a web game folder so it runs from file:// with no server (Gams style: data URLs -> blob URLs).

usage: python3 pack_site.py SRC_DIR OUT_DIR [--entry index.html] [--part-mb 30] [--drop-script PATTERN ...]

- .js/.css/.html files and anything under 512KB are copied as real files (tags and CSS can load them)
- every file is also packed as base64 into OUT_DIR/site/pN.js parts, listed in site/index.js
- the entry page gets mmcsite.js + site/index.js injected first, which answer the game's
  fetch(), XHR, image, audio and worker requests from the parts, loading parts on demand
- <base href> tags (usually CDN links) become <base href="./">, and scripts matching --drop-script
  (ads, analytics) are dropped from the entry page
"""
import argparse, base64, json, math, mimetypes, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
RUNTIME = os.path.join(HERE, "..", "games", "mmcsite.js")
REAL_EXT = {".js", ".css", ".html", ".htm", ".mjs"}
MIME = {
    ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".wasm": "application/wasm",
    ".css": "text/css", ".html": "text/html", ".htm": "text/html", ".png": "image/png", ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon",
    ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".mp4": "video/mp4",
    ".webm": "video/webm", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf",
    ".txt": "text/plain", ".xml": "application/xml", ".bin": "application/octet-stream", ".data": "application/octet-stream",
}
DEFAULT_DROP = [r"googletagmanager\.com", r"googlesyndication\.com", r"fundingchoicesmessages", r"gtag\(",
                r"__h82AlnkH6D91__", r"adsbygoogle", r"google-analytics\.com", r"coi-serviceworker"]


def mime_of(path):
    ext = os.path.splitext(path)[1].lower()
    return MIME.get(ext) or mimetypes.guess_type(path)[0] or "application/octet-stream"


def clean_entry(html, drops):
    # CDN <base> tags would send every request online; a local one keeps pages that read it working
    html = re.sub(r"<base\b[^>]*>", '<base href="./">', html, flags=re.I)
    def drop(m):
        tag = m.group(0)
        return "" if any(re.search(p, tag) for p in drops) else tag
    html = re.sub(r"<script\b[^>]*>.*?</script>", drop, html, flags=re.I | re.S)
    return html


def inject(html, tags):
    m = re.search(r"<head\b[^>]*>", html, flags=re.I)
    if m:
        return html[:m.end()] + "\n" + tags + html[m.end():]
    m = re.search(r"<html\b[^>]*>", html, flags=re.I)
    if m:
        return html[:m.end()] + "\n<head>" + tags + "</head>" + html[m.end():]
    return tags + html


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("out")
    ap.add_argument("--entry", default="index.html")
    ap.add_argument("--part-mb", type=float, default=30)
    ap.add_argument("--drop-script", action="append", default=[])
    ap.add_argument("--skip", action="append", default=[], help="regex of relative paths to leave out")
    a = ap.parse_args()

    src = os.path.abspath(a.src); out = os.path.abspath(a.out)
    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(os.path.join(out, "site"))
    limit = int(a.part_mb * 1024 * 1024) // 4 * 4  # base64 chars per part

    files = []
    for root, dirs, names in os.walk(src):
        dirs[:] = sorted(d for d in dirs if d != ".git")
        for n in sorted(names):
            p = os.path.join(root, n)
            rel = os.path.relpath(p, src).replace(os.sep, "/")
            if any(re.search(s, rel) for s in a.skip):
                continue
            files.append(rel)

    index, part, part_no, part_len = {}, {}, 0, 0

    def flush():
        nonlocal part, part_no, part_len
        if not part:
            return
        with open(os.path.join(out, "site", "p%d.js" % part_no), "w") as f:
            f.write("MMCSITE.part(%d,{" % part_no)
            f.write(",".join("%s:\"%s\"" % (json.dumps(k), v) for k, v in part.items()))
            f.write("});\n")
        part, part_no, part_len = {}, part_no + 1, 0

    total = 0
    for rel in files:
        p = os.path.join(src, rel)
        data = open(p, "rb").read()
        total += len(data)
        ext = os.path.splitext(rel)[1].lower()
        # code files load through tags; small files stay real so CSS url() and icons work too
        if (ext in REAL_EXT or len(data) <= 512 * 1024) and rel != a.entry:
            os.makedirs(os.path.dirname(os.path.join(out, rel)) or out, exist_ok=True)
            shutil.copyfile(p, os.path.join(out, rel))
        b64 = base64.b64encode(data).decode()
        index[rel] = {"m": mime_of(rel), "p": []}
        pos, first = 0, True
        while first or pos < len(b64):
            first = False
            if part_len >= limit:
                flush()
            chunk = b64[pos:pos + (limit - part_len)]
            part[rel] = chunk          # a big file continues in the next part under the same key
            part_len += len(chunk)
            index[rel]["p"].append(part_no)
            pos += len(chunk)
    flush()

    with open(os.path.join(out, "site", "index.js"), "w") as f:
        f.write("MMCSITE.index(" + json.dumps(index, separators=(",", ":")) + ",\"site/\");\n")
    shutil.copyfile(RUNTIME, os.path.join(out, "mmcsite.js"))

    entry_src = os.path.join(src, a.entry)
    html = open(entry_src, encoding="utf-8", errors="replace").read()
    html = clean_entry(html, DEFAULT_DROP + a.drop_script)
    html = inject(html, "<!-- MMC offline pack: game files load from site/ (Gams style data URLs) -->\n"
                        "<script src=\"mmcsite.js\"></script>\n<script src=\"site/index.js\"></script>\n")
    os.makedirs(os.path.dirname(os.path.join(out, a.entry)) or out, exist_ok=True)
    open(os.path.join(out, a.entry), "w", encoding="utf-8").write(html)
    print("packed %d files, %.1f MB raw into %d parts" % (len(files), total / 1e6, part_no))


if __name__ == "__main__":
    main()
