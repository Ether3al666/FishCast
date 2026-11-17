"""Build complete, locally hosted Unicode-range WOFF2 web fonts.

Run only when updating font assets; Python is not a site runtime dependency.
Sources and tools are pinned. Original desktop fonts stay outside public/.
"""

from __future__ import annotations

import argparse
from collections import Counter
from concurrent.futures import ProcessPoolExecutor
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import shutil
from urllib.request import Request, urlopen

from fontTools import subset
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'fonts'
FACE_CSS = ROOT / 'src' / 'styles-font-faces.css'
CONFIG = Path(__file__).with_name('font-sources.json')
PRIORITY = Path(__file__).with_name('font-priority-characters.txt')
CHUNK_SIZE = 256


def digest(data: bytes) -> str:
    return sha256(data).hexdigest()


def get_source(url: str, target: Path) -> None:
    if target.exists():
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    with urlopen(Request(url, headers={'User-Agent': 'FishCast-font-builder'}), timeout=60) as response:
        data = response.read()
    target.write_bytes(data)


def refresh_priority() -> None:
    """Explicit opt-in: freeze source-character frequency for reproducible splits."""
    counts: Counter[str] = Counter()
    for path in sorted((ROOT / 'src').rglob('*')):
        if path.suffix not in {'.tsx', '.ts', '.json'}:
            continue
        text = path.read_text(encoding='utf-8')
        counts.update(c for c in text if 0x3400 <= ord(c) <= 0x9FFF)
    ranked = sorted(counts, key=lambda c: (-counts[c], ord(c)))
    PRIORITY.write_text(''.join(ranked[:1536]) + '\n', encoding='utf-8')


def unicode_ranges(points: list[int] | set[int]) -> str:
    values = sorted(points)
    runs = []
    start = previous = values[0]
    for cp in values[1:]:
        if cp == previous + 1:
            previous = cp
            continue
        runs.append(f'U+{start:X}' if start == previous else f'U+{start:X}-{previous:X}')
        start = previous = cp
    runs.append(f'U+{start:X}' if start == previous else f'U+{start:X}-{previous:X}')
    return ','.join(runs)


def expand_ranges(value: str) -> set[int]:
    result = set()
    for item in value.split(','):
        bounds = item.removeprefix('U+').split('-')
        first = int(bounds[0], 16)
        last = int(bounds[-1], 16)
        result.update(range(first, last + 1))
    return result


def split_points(points: set[int], priority: list[int], split: bool):
    if not split:
        return [('full', sorted(points))]
    remaining = points.copy()
    groups = []
    # Keep the Latin alphabet/numbers compact; CJK characters never pull in a full font.
    latin = sorted(cp for cp in remaining if cp <= 0x024F)
    if latin:
        groups.append(('latin', latin))
        remaining.difference_update(latin)
    common = [cp for cp in priority if cp in remaining]
    for start in range(0, len(common), CHUNK_SIZE):
        part = common[start:start + CHUNK_SIZE]
        groups.append((f'common-{start // CHUNK_SIZE:02d}', sorted(part)))
        remaining.difference_update(part)
    rest = sorted(remaining)
    for start in range(0, len(rest), CHUNK_SIZE):
        groups.append((f'unicode-{start // CHUNK_SIZE:03d}', rest[start:start + CHUNK_SIZE]))
    return groups


def rename_web_font(font: TTFont, family: str, weight: int) -> None:
    style = 'Medium' if weight == 500 else 'Regular'
    postscript = family.replace(' ', '') + '-' + style
    replacement = {
        1: family, 2: style, 3: postscript + '-FishCast-Web',
        4: family + ' ' + style, 6: postscript, 16: family, 17: style,
        21: family, 22: style,
    }
    # Rename derivative family/PostScript names. Keep original copyright/license records.
    for record in font['name'].names:
        if record.nameID in replacement:
            record.string = replacement[record.nameID].encode(record.getEncoding())
    if 'CFF ' in font:
        cff = font['CFF '].cff
        cff.fontNames = [postscript]
        for top in cff.topDictIndex:
            top.FamilyName = family
            top.FullName = family + ' ' + style


def make_chunk(job):
    spec, source_path, label, points = job
    font = TTFont(source_path, recalcTimestamp=False)
    options = subset.Options()
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.recalc_timestamp = False
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=points)
    subsetter.subset(font)
    rename_web_font(font, spec['family'], spec['weight'])
    font.flavor = 'woff2'
    stream = BytesIO()
    font.save(stream)
    data = stream.getvalue()
    asset_hash = digest(data)
    filename = f"{spec['id']}-{label}.{asset_hash[:12]}.woff2"
    (OUT / filename).write_bytes(data)
    return {
        'font': spec['id'], 'file': filename, 'bytes': len(data),
        'sha256': asset_hash, 'unicodeRange': unicode_ranges(points),
        'characters': len(points),
    }


def verify(manifest, source_dir: Path) -> None:
    """Check encoded coverage, non-overlap, names, and bytes against original fonts."""
    for spec in manifest['fonts']:
        source = TTFont(source_dir / spec['file'], recalcTimestamp=False)
        expected = set(source.getBestCmap())
        seen: set[int] = set()
        for item in manifest['assets']:
            if item['font'] != spec['id']:
                continue
            path = OUT / item['file']
            data = path.read_bytes()
            if digest(data) != item['sha256']:
                raise ValueError(f'Asset hash mismatch: {path}')
            font = TTFont(BytesIO(data), recalcTimestamp=False)
            actual = set(font.getBestCmap())
            advertised = expand_ranges(item['unicodeRange'])
            if actual != advertised or seen.intersection(actual):
                raise ValueError(f'Incorrect/overlapping Unicode subset: {path}')
            if font['name'].getDebugName(1) != spec['family']:
                raise ValueError(f'Unexpected family: {path}')
            seen.update(actual)
        if seen != expected:
            raise ValueError(f"Coverage mismatch for {spec['id']}: {len(expected - seen)} missing")
        print(f"Verified {spec['id']}: {len(seen):,} original Unicode characters, zero missing", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, default=ROOT / 'node_modules' / '.cache' / 'fishcast-font-sources')
    parser.add_argument('--jobs', type=int, default=4)
    parser.add_argument('--refresh-priority', action='store_true')
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    specs = json.loads(CONFIG.read_text(encoding='utf-8'))['fonts']
    args.source_dir.mkdir(parents=True, exist_ok=True)
    for spec in specs:
        path = args.source_dir / spec['file']
        get_source(spec['url'], path)
        if digest(path.read_bytes()) != spec['sha256']:
            raise ValueError(f'Original source hash mismatch: {path}; do not silently rebuild from changed fonts')
        get_source(spec['licenseUrl'], args.source_dir / spec['licenseFile'])
    if args.verify_only:
        verify(json.loads((OUT / 'manifest.json').read_text(encoding='utf-8')), args.source_dir)
        return
    if args.refresh_priority:
        refresh_priority()
    if not PRIORITY.exists():
        raise ValueError('Missing priority snapshot; run once with --refresh-priority')
    priority = list(dict.fromkeys(ord(c) for c in PRIORITY.read_text(encoding='utf-8').strip()))
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = []
    font_summaries = []
    for spec in specs:
        font = TTFont(args.source_dir / spec['file'], recalcTimestamp=False)
        points = set(font.getBestCmap())
        groups = split_points(points, priority, spec['split'])
        font_summaries.append({**spec, 'sourceCharacters': len(points), 'chunks': len(groups)})
        jobs.extend((spec, str(args.source_dir / spec['file']), label, chars) for label, chars in groups)
    print(f'Building {len(jobs)} WOFF2 assets with {args.jobs} workers...', flush=True)
    assets = []
    with ProcessPoolExecutor(max_workers=max(1, args.jobs)) as workers:
        for asset in workers.map(make_chunk, jobs):
            assets.append(asset)
            if len(assets) % 32 == 0 or len(assets) == len(jobs):
                print(f'{len(assets)}/{len(jobs)} assets written', flush=True)
    manifest = {
        'format': 1, 'fontToolsVersion': '4.60.1', 'brotliVersion': '1.2.1',
        'chunkSize': CHUNK_SIZE, 'prioritySha256': digest(PRIORITY.read_bytes()),
        'license': 'SIL Open Font License 1.1', 'fonts': font_summaries, 'assets': assets,
    }
    verify(manifest, args.source_dir)
    css = ['/* Generated by scripts/build-fonts.py. Do not hand-edit. */',
           '/* Local WOFF2 fonts; unicode-range downloads only characters used on the page. */', '']
    by_id = {spec['id']: spec for spec in specs}
    for asset in assets:
        spec = by_id[asset['font']]
        css.extend([
            '@font-face {', f"  font-family: '{spec['family']}';", '  font-style: normal;',
            f"  font-weight: {spec['weight']};", '  font-display: swap;',
            f"  src: url('/fonts/{asset['file']}') format('woff2');",
            f"  unicode-range: {asset['unicodeRange']};", '}', '',
        ])
    FACE_CSS.write_text('\n'.join(css), encoding='utf-8')
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    for spec in specs:
        shutil.copyfile(args.source_dir / spec['licenseFile'], OUT / spec['licenseFile'])
    shutil.copyfile(CONFIG, OUT / 'sources.json')
    # Remove only obsolete generated WOFF2 assets directly under the known output directory.
    current_files = {asset['file'] for asset in assets}
    prefixes = tuple(spec['id'] + '-' for spec in specs)
    for path in OUT.glob('*.woff2'):
        if path.name.startswith(prefixes) and path.name not in current_files:
            path.unlink()
    total = sum(item['bytes'] for item in assets)
    print(f'Done: {len(assets)} assets, {total:,} bytes stored; assets load on demand.', flush=True)


if __name__ == '__main__':
    main()
