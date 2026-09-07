"""Validate the audit ledger against its recorded Git snapshot."""

import collections
import csv
from pathlib import Path
import subprocess


audit_dir = Path(__file__).resolve().parent
repo_root = Path(
    subprocess.check_output(
        ["git", "rev-parse", "--show-toplevel"], cwd=audit_dir, text=True
    ).strip()
)
baseline = (audit_dir / "baseline.txt").read_text().strip()
tree = subprocess.check_output(
    ["git", "ls-tree", "-rz", "--full-tree", baseline], cwd=repo_root
)
expected = {}
for entry in tree.split(b"\0"):
    if entry:
        metadata, path = entry.decode().split("\t", 1)
        expected[path] = metadata.split()[2]

with (audit_dir / "coverage.tsv").open(newline="") as ledger:
    rows = list(csv.DictReader(ledger, delimiter="\t"))

errors = []
paths = [row["path"] for row in rows]
duplicates = [path for path, count in collections.Counter(paths).items() if count > 1]
if duplicates:
    errors.append(f"Duplicate paths: {duplicates}")
if set(paths) != set(expected):
    errors.append(f"Missing paths: {sorted(set(expected) - set(paths))}")
    errors.append(f"Unexpected paths: {sorted(set(paths) - set(expected))}")

statuses = {"needs-edit", "reviewed-no-change", "excluded"}
for row in rows:
    path = row["path"]
    if row["blob"] != expected.get(path):
        errors.append(f"Snapshot blob mismatch: {path}")
    if row["status"] not in statuses or not row["reason"].strip():
        errors.append(f"Missing or invalid review disposition: {path}")
    if row["status"] == "needs-edit" and not row["findings"].strip():
        errors.append(f"Missing edit findings: {path}")

if errors:
    raise SystemExit("\n".join(errors))

print(f"Validated {len(rows)} unique paths at {baseline}.")
for status, count in sorted(collections.Counter(row["status"] for row in rows).items()):
    print(f"{status}: {count}")
print("This verifies snapshot coverage, not editorial judgment or cleanup completion.")
