"""Capture explicitly selected Actions attempts, including failures and queue time."""
import argparse
import concurrent.futures
import datetime
import json
import pathlib
import re
import subprocess

REPO = 'bc-solutions-coder/bcordes'


def gh(*args):
    return subprocess.check_output(['gh', *args], text=True, stderr=subprocess.PIPE)


def elapsed(start, end):
    parse = datetime.datetime.fromisoformat
    return (parse(end.replace('Z', '+00:00')) - parse(start.replace('Z', '+00:00'))).total_seconds()


def collect(selection):
    run_id, attempt = selection.split(':')
    endpoint = f'repos/{REPO}/actions/runs/{run_id}/attempts/{attempt}'
    run = json.loads(gh('api', endpoint))
    if run['status'] != 'completed':
        raise ValueError(f'{selection} is not complete; do not record it as a result')
    pages = json.loads(gh('api', '--paginate', '--slurp', endpoint + '/jobs?per_page=100'))
    jobs = [job for page in pages for job in page['jobs']]
    if not jobs:
        raise ValueError(f'{selection} has no available job records')
    result = {key: run[key] for key in (
        'id', 'run_attempt', 'head_sha', 'event', 'path', 'conclusion',
        'run_started_at', 'created_at', 'updated_at', 'html_url',
    )}
    result['jobs'] = []
    for job in jobs:
        steps = [{
            'name': step['name'], 'conclusion': step['conclusion'],
            'seconds': elapsed(step['started_at'], step['completed_at'])
            if step.get('started_at') and step.get('completed_at') else None,
        } for step in job['steps']]
        result['jobs'].append({
            'name': job['name'], 'conclusion': job['conclusion'],
            'started_at': job['started_at'], 'completed_at': job['completed_at'],
            'seconds': elapsed(job['started_at'], job['completed_at']),
            'steps': steps,
        })
    first = min(job['started_at'] for job in jobs)
    last = max(job['completed_at'] for job in jobs)
    result['initial_start_delay_seconds'] = elapsed(run['run_started_at'], first)
    result['execution_span_seconds'] = elapsed(first, last)
    result['attempt_elapsed_seconds'] = elapsed(run['run_started_at'], last)
    result['last_job_completed_at'] = last
    try:
        logs = gh('run', 'view', run_id, '--repo', REPO, '--attempt', attempt, '--log')
        result['runner_images'] = sorted(set(re.findall(r'Image: (ubuntu-[^\s]+)', logs)))
        result['cache_evidence'] = {
            'log_available': True,
            'pnpm_restore_hits': len(re.findall(r'Cache restored from key:', logs)),
            'pnpm_restore_misses': len(re.findall(r'Cache not found for input keys:|pnpm cache is not found', logs)),
            'buildkit_cached_steps': len(re.findall(r'#\d+ CACHED\b', logs)),
            'buildkit_import_mentions': len(re.findall(r'importing cache manifest', logs)),
        }
    except subprocess.CalledProcessError:
        result['runner_images'] = []
        result['cache_evidence'] = {'log_available': False}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', action='append', required=True, help='RUN_ID:ATTEMPT (repeatable)')
    parser.add_argument('--output', type=pathlib.Path, required=True)
    args = parser.parse_args()
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        runs = list(pool.map(collect, args.run))
    args.output.write_text(json.dumps({
        'captured_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'selection': args.run,
        'notes': 'Explicit attempts, not success-filtered samples. Elapsed ends at last job completion; initial delay is not pure runner queue time. Execution span includes inter-job gaps. Missing cache-hit markers do not prove a cold cache. API timestamps have second precision.',
        'runs': runs,
    }, indent=2) + '\n')
    print(f'Captured {len(runs)} attempts to {args.output}')


if __name__ == '__main__':
    main()
