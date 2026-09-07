"""Check local links in repository-owned Markdown, including heading anchors."""

from collections import Counter
from pathlib import Path
import re
import subprocess
from urllib.parse import unquote, urlsplit


root = Path(__file__).resolve().parent.parent
paths = subprocess.check_output(
    ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    cwd=root,
).decode().split("\0")
documents = sorted(
    {
        root / path
        for path in paths
        if path.endswith(".md")
        and not path.startswith(".agents/")
        and (root / path).is_file()
    }
)


def prose_lines(path):
    fence = None
    for number, line in enumerate(path.read_text().splitlines(), 1):
        marker = re.match(r"^\s*(`{3,}|~{3,})", line)
        if marker:
            run = marker[1]
            if fence is None:
                fence = run
            elif run[0] == fence[0] and len(run) >= len(fence):
                fence = None
            continue
        if fence is None:
            yield number, line


def anchors(path):
    result = set()
    counts = Counter()
    for _, line in prose_lines(path):
        heading = re.match(r"^#{1,6}\s+(.+?)\s*#*\s*$", line)
        if heading:
            text = re.sub(r"\[([^]]+)\]\([^)]*\)", r"\1", heading[1])
            text = re.sub(r"<[^>]+>", "", text).lower()
            slug = re.sub(r"[^\w\- ]", "", text).replace(" ", "-")
            result.add(f"{slug}-{counts[slug]}" if counts[slug] else slug)
            counts[slug] += 1
        result.update(re.findall(r'(?:id|name)=["\']([^"\']+)["\']', line))
    return result


errors = []
checked = 0
heading_cache = {}
for document in documents:
    for line_number, line in prose_lines(document):
        targets = re.findall(r"\]\(<?([^\s)>]+)>?(?:\s+\"[^\"]*\")?\)", line)
        targets += re.findall(r'(?:href|src)=["\']([^"\']+)["\']', line)
        for target in targets:
            url = urlsplit(target)
            if url.scheme or url.netloc:
                continue
            destination = (
                (root / unquote(url.path).lstrip("/"))
                if url.path.startswith("/")
                else (document.parent / unquote(url.path))
            ) if url.path else document
            destination = destination.resolve()
            checked += 1
            problem = None
            if not destination.exists():
                problem = "missing path"
            elif url.fragment and destination.suffix == ".md":
                if destination not in heading_cache:
                    heading_cache[destination] = anchors(destination)
                if unquote(url.fragment) not in heading_cache[destination]:
                    problem = "missing heading or HTML anchor"
            if problem:
                errors.append(
                    f"{document.relative_to(root)}:{line_number}: {target}: {problem}"
                )

if errors:
    raise SystemExit("\n".join(errors))
print(f"Checked {checked} local links in {len(documents)} Markdown files.")
print("External URLs and reference-style Markdown links are not checked.")
