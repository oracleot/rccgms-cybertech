#!/usr/bin/env python3
"""
EasyWorship 7 -> Fusion Worship Library importer.

Usage:
  python scripts/ew-import.py                                 # dry run, default EW path
  python scripts/ew-import.py --dir "C:\\path\\to\\ew\\data"    # dry run, custom path
  python scripts/ew-import.py --import                         # actually import
  python scripts/ew-import.py --json songs.json                # export to JSON for review

The --dir path should contain Songs.db and SongWords.db (the EasyWorship
profile data folder). Default: the local EW7 installation path.

Copy the church machine's EW data folder before running:
  C:\\Users\\Public\\Documents\\Softouch\\Easyworship\\Default\\v6.1\\Databases\\Data

The script opens the database read-only and never modifies EasyWorship files.
"""

import sqlite3
import json
import os
import sys
import re
import time
import zlib
import urllib.request
import urllib.error
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DEFAULT_EW_DIR = (
    r"C:\Users\Public\Documents\Softouch\Easyworship"
    r"\Default\v6.1\Databases\Data"
)
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Env
# ---------------------------------------------------------------------------

def load_env():
    env = {}
    for name in (".env.local", ".env"):
        p = PROJECT_ROOT / name
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            key = k.strip()
            if key not in env:
                env[key] = v.strip().strip('"').strip("'")
    return env

# ---------------------------------------------------------------------------
# RTF -> slides
# ---------------------------------------------------------------------------

def rtf_to_slides(raw):
    """Parse an EasyWorship RTF blob into a list of slide plain-text strings."""
    if not raw:
        return []

    if isinstance(raw, bytes):
        try:
            raw = zlib.decompress(raw)
        except zlib.error:
            pass
        if isinstance(raw, bytes):
            for enc in ("utf-8", "cp1252", "latin-1"):
                try:
                    raw = raw.decode(enc)
                    break
                except (UnicodeDecodeError, LookupError):
                    pass
            else:
                raw = raw.decode("latin-1", errors="replace")

    text = str(raw)
    if not text.lstrip().startswith("{\\rtf"):
        return [text.strip()] if text.strip() else []

    slides = []
    buf = []
    i = 0
    depth = 0
    skip_depth = 0

    SKIP_GROUPS = (
        b"\\fonttbl", b"\\colortbl", b"\\stylesheet", b"\\info",
        b"\\*\\", b"\\pntext", b"\\pgdsctbl", b"\\listtable",
        b"\\listoverridetable", b"\\revtbl",
    )

    while i < len(text):
        ch = text[i]

        if ch == "{":
            depth += 1
            ahead = text[i + 1 : i + 30].encode("ascii", "replace")
            if any(ahead.startswith(sg) for sg in SKIP_GROUPS):
                skip_depth = depth
            i += 1
            continue

        if ch == "}":
            if skip_depth == depth:
                skip_depth = 0
            depth -= 1
            i += 1
            continue

        if skip_depth:
            i += 1
            continue

        if ch == "\\":
            if i + 1 >= len(text):
                i += 1
                continue
            nc = text[i + 1]
            if nc in "\\{}":
                buf.append(nc)
                i += 2
                continue
            if nc == "~":
                buf.append("\u00a0")
                i += 2
                continue
            if nc == "-":
                i += 2
                continue
            if nc == "_":
                buf.append("\u2011")
                i += 2
                continue
            if nc == "'":
                hx = text[i + 2 : i + 4]
                try:
                    buf.append(bytes([int(hx, 16)]).decode("cp1252"))
                except (ValueError, UnicodeDecodeError):
                    pass
                i += 4
                continue
            j = i + 1
            while j < len(text) and text[j].isalpha():
                j += 1
            word = text[i + 1 : j]
            param = ""
            while j < len(text) and (text[j].isdigit() or text[j] == "-"):
                param += text[j]
                j += 1
            if j < len(text) and text[j] == " ":
                j += 1
            if word == "page":
                slide = "".join(buf).strip()
                if slide:
                    slides.append(slide)
                buf = []
            elif word in ("par", "line"):
                buf.append("\n")
            elif word == "tab":
                buf.append("\t")
            elif word == "u" and param:
                code = int(param)
                if code < 0:
                    code += 65536
                buf.append(chr(code))
                if j < len(text) and text[j] not in "\\{}":
                    j += 1
            elif word == "lquote":
                buf.append("\u2018")
            elif word == "rquote":
                buf.append("\u2019")
            elif word == "ldblquote":
                buf.append("\u201c")
            elif word == "rdblquote":
                buf.append("\u201d")
            elif word == "emdash":
                buf.append("\u2014")
            elif word == "endash":
                buf.append("\u2013")
            elif word == "bullet":
                buf.append("\u2022")
            i = j
            continue

        if ch in ("\r", "\n"):
            i += 1
            continue

        buf.append(ch)
        i += 1

    slide = "".join(buf).strip()
    if slide:
        slides.append(slide)
    return slides

# ---------------------------------------------------------------------------
# Heading detection (mirrors lib/lyrics/sections.ts)
# ---------------------------------------------------------------------------

HEADING_PATTERNS = [
    (re.compile(r"^pre[-\s]?chorus$", re.I), "prechorus"),
    (re.compile(r"^(chorus|ch)$", re.I), "chorus"),
    (re.compile(r"^(verse|vs?)$", re.I), "verse"),
    (re.compile(r"^(bridge|br)$", re.I), "bridge"),
    (re.compile(r"^refrain$", re.I), "refrain"),
    (re.compile(r"^intro(duction)?$", re.I), "intro"),
    (re.compile(r"^interlude$", re.I), "interlude"),
    (re.compile(r"^outro$", re.I), "outro"),
    (re.compile(r"^tag$", re.I), "tag"),
    (re.compile(r"^ending$", re.I), "ending"),
]

REPEAT_RE = [
    re.compile(r"^(.*?)\s*\(\s*[x\u00d7]\s*(\d+)\s*\)\s*$", re.I),
    re.compile(r"^(.*?)\s+(?:[x\u00d7]\s*(\d+)|(\d+)\s*[x\u00d7])\s*$", re.I),
]

def _strip_repeat(text):
    for pat in REPEAT_RE:
        m = pat.match(text)
        if m:
            return m.group(1).strip(), int(m.group(2) or m.group(3))
    return text, None


def parse_heading(line):
    """Returns (section_type, number, repeat) or None."""
    raw = line.strip()
    if not raw or len(raw) > 40:
        return None
    without_colon = re.sub(r"[:.;\u2013\u2014-]\s*$", "", raw).strip()
    if not without_colon:
        return None
    text, repeat = _strip_repeat(without_colon)
    if not text:
        return None
    if re.match(r"^\d{1,2}$", text):
        return ("verse", int(text), repeat)
    m = re.match(r"^([A-Za-z][A-Za-z\s-]*?)\s*(\d{1,2})?$", text)
    if not m:
        return None
    word = m.group(1).strip()
    number = int(m.group(2)) if m.group(2) else None
    for pat, stype in HEADING_PATTERNS:
        if pat.match(word):
            return (stype, number, repeat)
    return None

# ---------------------------------------------------------------------------
# ID generation (mirrors lib/lyrics/types.ts)
# ---------------------------------------------------------------------------

_counter = [0]

def _b36(n):
    if n <= 0:
        return "0"
    d = ""
    while n:
        d = "0123456789abcdefghijklmnopqrstuvwxyz"[n % 36] + d
        n //= 36
    return d


def _ts():
    return _b36(int(time.time() * 1000))


def new_set_id():
    _counter[0] += 1
    return f"s{_ts()}{_b36(_counter[0])}"


def new_group_id():
    _counter[0] += 1
    return f"g{_ts()}{_b36(_counter[0])}"


def new_section_id():
    _counter[0] += 1
    return f"sec{_ts()}{_b36(_counter[0])}"

# ---------------------------------------------------------------------------
# Classify song vs hymn
# ---------------------------------------------------------------------------

def classify_type(title, slides):
    t = (title or "").lower()
    if "hymn" in t:
        return "hymn"
    if re.match(r"^\d+[.\s]", title.strip()):
        return "hymn"
    headings = [parse_heading(s.split("\n")[0]) for s in slides if s]
    headings = [h for h in headings if h]
    if len(headings) >= 2 and all(h[0] == "verse" for h in headings):
        return "hymn"
    return "song"

# ---------------------------------------------------------------------------
# Map EW slides -> Fusion sections + groups
# ---------------------------------------------------------------------------

def slides_to_fusion(slides, content_type):
    """
    Returns (sections_list_or_None, flat_groups_list).
    Each EW slide becomes one Fusion LyricGroup (cue).
    Headings on the first line of a slide create section structure.
    """
    sections = []
    flat_groups = []
    verse_counter = {}
    recognised = False

    for slide_text in slides:
        if not slide_text.strip():
            continue
        lines = slide_text.strip().split("\n")
        first = lines[0].strip() if lines else ""
        heading = parse_heading(first)

        if heading:
            recognised = True
            stype, snum, srep = heading
            content_lines = lines[1:]
            content = "\n".join(l.strip() for l in content_lines).strip()
            if not content:
                content = first
                heading = None
        else:
            content = "\n".join(l.strip() for l in lines).strip()

        if not content:
            continue

        gid = new_group_id()

        if heading:
            stype, snum, srep = heading
            if snum is None and stype == "verse":
                snum = verse_counter.get("verse", 0) + 1
            if snum is not None:
                verse_counter[stype] = max(
                    verse_counter.get(stype, 0), snum
                )
            sec_ref = {"type": stype}
            if snum is not None:
                sec_ref["number"] = snum

            group = {"id": gid, "primary": content, "section": sec_ref}
            if srep:
                group["repeat"] = srep
            flat_groups.append(group)

            sec = {
                "id": new_section_id(),
                "type": stype,
                "groups": [{"id": gid, "primary": content}],
            }
            if snum is not None:
                sec["number"] = snum
            if srep:
                sec["repeat"] = srep
            sections.append(sec)
        else:
            group = {"id": gid, "primary": content}
            flat_groups.append(group)
            sections.append(
                {
                    "id": new_section_id(),
                    "type": "other",
                    "groups": [{"id": gid, "primary": content}],
                }
            )

    if content_type == "hymn" and recognised:
        for sec in sections:
            if len(sec["groups"]) > 1:
                combined = "\n".join(g["primary"] for g in sec["groups"])
                sec["groups"] = [
                    {"id": sec["groups"][0]["id"], "primary": combined}
                ]
        flat_groups = []
        for sec in sections:
            ref = {"type": sec["type"]}
            if "number" in sec:
                ref["number"] = sec["number"]
            for g in sec["groups"]:
                fg = {**g, "section": ref}
                if sec.get("repeat"):
                    fg["repeat"] = sec["repeat"]
                flat_groups.append(fg)

    return (sections if recognised else None, flat_groups)

# ---------------------------------------------------------------------------
# Read EasyWorship database
# ---------------------------------------------------------------------------

def read_ew_songs(data_dir):
    """Returns a list of dicts: {title, author, copyright, slides, ...}."""
    songs_path = os.path.join(data_dir, "Songs.db")
    words_path = os.path.join(data_dir, "SongWords.db")

    if not os.path.exists(songs_path):
        print(f"  Songs.db not found at {songs_path}")
        return []
    if not os.path.exists(words_path):
        print(f"  SongWords.db not found at {words_path}")
        return []

    songs_conn = sqlite3.connect(f"file:{songs_path}?mode=ro", uri=True)
    words_conn = sqlite3.connect(f"file:{words_path}?mode=ro", uri=True)

    try:
        song_rows = songs_conn.execute(
            "SELECT rowid, title, author, copyright, administrator, "
            "description, tags, reference_number FROM song"
        ).fetchall()

        word_rows = {}
        for row in words_conn.execute("SELECT song_id, words FROM word").fetchall():
            word_rows[row[0]] = row[1]

        results = []
        for row in song_rows:
            rowid, title, author, copyright_, admin, desc, tags, refnum = row
            raw_words = word_rows.get(rowid)
            slides = rtf_to_slides(raw_words)
            results.append(
                {
                    "ew_id": rowid,
                    "title": (title or "").strip(),
                    "author": (author or "").strip(),
                    "copyright": (copyright_ or "").strip(),
                    "administrator": (admin or "").strip(),
                    "description": (desc or "").strip(),
                    "tags": (tags or "").strip(),
                    "reference_number": (refnum or "").strip(),
                    "slides": slides,
                }
            )
        return results
    finally:
        songs_conn.close()
        words_conn.close()

# ---------------------------------------------------------------------------
# Normalise title for duplicate detection
# ---------------------------------------------------------------------------

def normalise_title(t):
    t = t.lower().strip()
    t = re.sub(r"[^\w\s]", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t

# ---------------------------------------------------------------------------
# Supabase REST helpers
# ---------------------------------------------------------------------------

def supabase_get(base_url, key, table, params=""):
    url = f"{base_url}/rest/v1/{table}?{params}"
    req = urllib.request.Request(url)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Accept", "application/json")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def supabase_post(base_url, key, table, rows):
    url = f"{base_url}/rest/v1/{table}"
    req = urllib.request.Request(url)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=representation,resolution=merge-duplicates")
    req.data = json.dumps(rows).encode("utf-8")
    req.method = "POST"
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

# ---------------------------------------------------------------------------
# Fetch existing Fusion library
# ---------------------------------------------------------------------------

def fetch_existing_titles(base_url, key):
    """Returns {normalised_title: original_title} for all existing sets."""
    rows = supabase_get(base_url, key, "lyric_sets", "select=title")
    return {normalise_title(r["title"]): r["title"] for r in rows}

# ---------------------------------------------------------------------------
# Build Fusion records
# ---------------------------------------------------------------------------

def build_fusion_record(ew_song):
    slides = ew_song["slides"]
    if not slides:
        return None

    content_type = classify_type(ew_song["title"], slides)
    sections, groups = slides_to_fusion(slides, content_type)

    if not groups:
        return None

    if content_type == "hymn":
        presentation = {"sectionLabels": "numbers", "verseNumberStyle": "heading"}
    else:
        presentation = {"sectionLabels": "off", "verseNumberStyle": "none"}

    record = {
        "id": new_set_id(),
        "type": content_type,
        "title": ew_song["title"],
        "groups": groups,
        "sections": sections,
        "language": None,
        "presentation": presentation,
        "scripture_reference": None,
    }
    return record

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="EasyWorship 7 -> Fusion Worship Library importer"
    )
    parser.add_argument(
        "--dir",
        default=DEFAULT_EW_DIR,
        help="Path to the EW data directory containing Songs.db + SongWords.db",
    )
    parser.add_argument(
        "--import",
        dest="do_import",
        action="store_true",
        help="Actually import into Fusion (default is dry run)",
    )
    parser.add_argument(
        "--json",
        dest="json_out",
        help="Export extracted songs to a JSON file for review",
    )
    args = parser.parse_args()

    mode = "IMPORT" if args.do_import else "DRY RUN"
    print()
    print(f"  EasyWorship -> Fusion Import ({mode})")
    print(f"  {'=' * 44}")
    print(f"  Source: {args.dir}")
    print()

    # --- Read EW database ---
    ew_songs = read_ew_songs(args.dir)
    if not ew_songs:
        print("  No songs found in the EasyWorship database.")
        print()
        print("  If this machine has a fresh EW install, copy the church's")
        print("  EW data folder first:")
        print()
        print(f"    From the church machine, copy:")
        print(f"    C:\\Users\\Public\\Documents\\Softouch\\Easyworship"
              f"\\Default\\v6.1\\Databases\\Data")
        print()
        print(f"    To this machine (e.g. Desktop), then re-run with:")
        print(f'    python scripts/ew-import.py --dir "C:\\path\\to\\copied\\Data"')
        print()
        return 1

    songs_count = 0
    hymns_count = 0
    empty_count = 0

    records = []
    for ew in ew_songs:
        rec = build_fusion_record(ew)
        if rec is None:
            empty_count += 1
            continue
        rec["_ew_title"] = ew["title"]
        rec["_ew_author"] = ew["author"]
        rec["_ew_copyright"] = ew["copyright"]
        records.append(rec)
        if rec["type"] == "hymn":
            hymns_count += 1
        else:
            songs_count += 1

    print(f"  Songs detected: {len(ew_songs)}")
    print(f"    Mappable as songs: {songs_count}")
    print(f"    Mappable as hymns: {hymns_count}")
    if empty_count:
        print(f"    Empty (no lyrics):  {empty_count}")
    print()

    # --- JSON export ---
    if args.json_out:
        export = []
        for r in records:
            e = {k: v for k, v in r.items() if not k.startswith("_")}
            e["_ew_author"] = r.get("_ew_author", "")
            e["_ew_copyright"] = r.get("_ew_copyright", "")
            export.append(e)
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump(export, f, indent=2, ensure_ascii=False)
        print(f"  Exported to {args.json_out}")
        print()

    # --- Preview first 10 ---
    print("  Preview (first 10 songs):")
    print(f"  {'-' * 60}")
    for rec in records[:10]:
        cue_count = len(rec["groups"])
        sec_count = len(rec["sections"]) if rec["sections"] else 0
        stype = rec["type"].upper()
        first_cue = rec["groups"][0]["primary"][:60] if rec["groups"] else ""
        print(f"  [{stype:5s}] {rec['title']}")
        print(f"         {cue_count} cues, {sec_count} sections")
        print(f'         "{first_cue}..."')
        print()

    # --- Duplicate check ---
    env = load_env()
    sb_url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    sb_key = env.get("SUPABASE_SERVICE_ROLE_KEY")

    if not sb_url or not sb_key:
        print("  WARNING: Supabase credentials not found in .env / .env.local")
        print("  Cannot check for duplicates or import.")
        print()
        if args.json_out:
            print("  JSON export completed. Review and import manually.")
        return 1

    print("  Checking existing Fusion library for duplicates...")
    try:
        existing = fetch_existing_titles(sb_url, sb_key)
    except Exception as e:
        print(f"  ERROR fetching existing library: {e}")
        return 1

    duplicates = []
    to_import = []
    for rec in records:
        norm = normalise_title(rec["title"])
        if norm in existing:
            duplicates.append((rec["title"], existing[norm]))
        else:
            to_import.append(rec)

    print()
    if duplicates:
        print(f"  Duplicates found (will skip): {len(duplicates)}")
        for ew_t, fus_t in duplicates[:15]:
            marker = " (exact)" if ew_t == fus_t else ""
            print(f'    "{ew_t}" <-> "{fus_t}"{marker}')
        if len(duplicates) > 15:
            print(f"    ... and {len(duplicates) - 15} more")
        print()

    print(f"  Ready to import: {len(to_import)} songs")
    print()

    if not args.do_import:
        print("  This was a dry run. To import, re-run with --import:")
        print(f'    python scripts/ew-import.py --dir "{args.dir}" --import')
        print()
        return 0

    # --- Import ---
    if not to_import:
        print("  Nothing to import (all duplicates).")
        return 0

    print(f"  Importing {len(to_import)} songs into Fusion...")
    batch_size = 25
    imported = 0
    failed = 0

    for i in range(0, len(to_import), batch_size):
        batch = to_import[i : i + batch_size]
        rows = []
        for rec in batch:
            rows.append(
                {
                    "id": rec["id"],
                    "type": rec["type"],
                    "title": rec["title"],
                    "groups": rec["groups"],
                    "sections": rec["sections"],
                    "language": rec["language"],
                    "presentation": rec["presentation"],
                    "scripture_reference": rec["scripture_reference"],
                }
            )
        try:
            supabase_post(sb_url, sb_key, "lyric_sets", rows)
            imported += len(batch)
            titles = ", ".join(r["title"][:30] for r in batch[:3])
            if len(batch) > 3:
                titles += f" (+{len(batch) - 3} more)"
            print(f"    [{imported}/{len(to_import)}] {titles}")
        except Exception as e:
            failed += len(batch)
            print(f"    BATCH FAILED ({len(batch)} songs): {e}")

    print()
    print(f"  Import complete: {imported} imported, {failed} failed,"
          f" {len(duplicates)} skipped (duplicates)")
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
