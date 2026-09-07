"""Reconcile cleanup records with the baseline and current tracked files."""

import csv
from collections import Counter
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[3]
audit = Path(__file__).resolve().parent


def git(*args):
    return subprocess.check_output(['git', *args], cwd=root, text=True).strip()


def rows(name):
    with (audit / name).open() as file:
        return list(csv.DictReader(file, delimiter='\t'))


baseline = (audit / 'baseline.txt').read_text().strip()
coverage = rows('coverage.tsv')
records = {}
for name in ['application-execution.tsv', 'package-execution.tsv']:
    for row in rows(name):
        records.setdefault(row['path'], []).append(row['outcome'])
for row in rows('documentation-execution.tsv'):
    records.setdefault(row['baseline_path'], []).append(row['outcome'])

original = {row['path'] for row in coverage}
assert original == set(git('ls-tree', '-r', '--name-only', baseline).splitlines())
counts = Counter()
for row in coverage:
    path = row['path']
    assert git('rev-parse', f'{baseline}:{path}') == row['blob'], path
    current = root / path
    changed = not current.is_file() or git('hash-object', path) != row['blob']
    if row['status'] == 'excluded':
        assert not changed, f'Excluded file changed: {path}'
        counts['excluded'] += 1
        continue
    outcomes = records.get(path, [])
    if changed or row['status'] == 'needs-edit':
        assert any(outcome not in ['retained', 'excluded'] for outcome in outcomes), (
            f'Missing execution disposition: {path}'
        )
    counts['removed' if not current.is_file() else 'changed' if changed else 'retained'] += 1

current = set(git('ls-files', '--cached', '--others', '--exclude-standard').splitlines())
added = sorted(current - original)
print(f'Reconciled {len(original)} original paths: {dict(counts)}')
print(f'{len(added)} additions require review alongside the execution records:')
for path in added:
    print(path)
print('This checks coverage and excluded-file preservation, not editorial accuracy.')
