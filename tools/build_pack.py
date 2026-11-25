"""Build one optional game pack for the release (runs on GitHub Actions).

usage: python3 tools/build_pack.py PACK_ID OUT_DIR

Reads release/packs/PACK_ID.json and fills OUT_DIR/files/packs/PACK_ID/ plus the pack's
registry OUT_DIR/files/packs/PACK_ID.js, so the zip extracts straight into the same folder
as Run Me.html and the dashboard shows the pack's games.

source "drive": downloads each listed Google Drive file by id and checks its size
source "git":   checks out a pinned commit and packs it with tools/pack_site.py
"""
import json, os, shutil, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def download_drive(fid, dest, size):
    url = "https://drive.usercontent.google.com/download?id=%s&export=download&confirm=t" % fid
    for attempt in range(6):
        subprocess.run(["curl", "-sS", "-L", "--retry", "3", "--max-time", "1200", "-o", dest, url], check=False)
        if os.path.exists(dest) and os.path.getsize(dest) == size:
            return
        time.sleep(5 * (attempt + 1))
    got = os.path.getsize(dest) if os.path.exists(dest) else 0
    raise SystemExit("download failed for %s (%s): got %d bytes, expected %d" % (os.path.basename(dest), fid, got, size))


def main():
    pid, out = sys.argv[1], os.path.abspath(sys.argv[2])
    m = json.load(open(os.path.join(ROOT, "release", "packs", pid + ".json")))
    dest = os.path.join(out, "files", "packs", pid)
    os.makedirs(dest, exist_ok=True)

    if m["source"] == "drive":
        for i, f in enumerate(m["files"], 1):
            print("[%d/%d] %s" % (i, len(m["files"]), f["file"]), flush=True)
            download_drive(f["fid"], os.path.join(dest, f["file"]), f["size"])
    elif m["source"] == "git":
        work = os.path.join(out, "_src")
        shutil.rmtree(work, ignore_errors=True)
        subprocess.run(["git", "init", "-q", work], check=True)
        subprocess.run(["git", "-C", work, "remote", "add", "origin", m["repo"]], check=True)
        subprocess.run(["git", "-C", work, "fetch", "-q", "--depth", "1", "--filter=blob:none", "origin", m["commit"]], check=True)
        if m.get("path"):
            subprocess.run(["git", "-C", work, "sparse-checkout", "set", "--no-cone", m["path"]], check=True)
        subprocess.run(["git", "-C", work, "checkout", "-q", "FETCH_HEAD"], check=True)
        src = os.path.join(work, m["path"]) if m.get("path") else work
        shutil.rmtree(os.path.join(src, ".git"), ignore_errors=True)
        shutil.copyfile(os.path.join(ROOT, "release", "packs", m["entry"]), os.path.join(src, "mmc-index.html"))
        cmd = [sys.executable, os.path.join(HERE, "pack_site.py"), src, os.path.join(dest, m["out"]), "--entry", "mmc-index.html"]
        for s in m.get("skip", []):
            cmd += ["--skip", s]
        subprocess.run(cmd, check=True)
        shutil.rmtree(work, ignore_errors=True)
    else:
        raise SystemExit("unknown source " + m["source"])

    shutil.copyfile(os.path.join(ROOT, "release", "packs", pid + ".js"), os.path.join(out, "files", "packs", pid + ".js"))
    print("built pack", pid, "->", dest)


if __name__ == "__main__":
    main()
