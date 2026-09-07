"""Capture successful workflow timings and cache evidence without persisting raw logs."""
import argparse
import concurrent.futures
import datetime
import json
import pathlib
import re
import subprocess

REPO = 'bc-solutions-coder/bcordes'
WORKFLOWS = ('ci.yml', 'docker-publish.yml', 'deploy.yml')


def gh(*args):
    return subprocess.check_output(['gh', *args], text=True, stderr=subprocess.PIPE)


def instant(value):
    return datetime.datetime.fromisoformat(value.replace('Z', '+00:00'))


def elapsed(start, end):
    return (instant(end) - instant(start)).total_seconds()


def collect_run(run):
    run_id = str(run['databaseId'])
    pages = json.loads(gh('api', '--paginate', '--slurp',
                         f'repos/{REPO}/actions/runs/{run_id}/jobs?per_page=100'))
    jobs = [job for page in pages for job in page['jobs']]
    detail = json.loads(gh('api', f'repos/{REPO}/actions/runs/{run_id}'))
    result = {**run, 'url': f'https://github.com/{REPO}/actions/runs/{run_id}',
              'run_attempt': detail['run_attempt'],
              'run_started_at': detail['run_started_at']}
    result['workflow_elapsed_seconds'] = elapsed(run['createdAt'], run['updatedAt'])
    result['latest_attempt_elapsed_seconds'] = elapsed(detail['run_started_at'], run['updatedAt'])
    result['jobs'] = []
    for job in jobs:
        steps = []
        for step in job['steps']:
            steps.append({
                'name': step['name'], 'conclusion': step['conclusion'],
                'seconds': elapsed(step['started_at'], step['completed_at'])
                if step.get('started_at') and step.get('completed_at') else None,
            })
        result['jobs'].append({
            'name': job['name'], 'conclusion': job['conclusion'],
            'started_at': job['started_at'], 'completed_at': job['completed_at'],
            'execution_seconds': elapsed(job['started_at'], job['completed_at']),
            'start_delay_seconds': elapsed(detail['run_started_at'], job['started_at']),
            'steps': steps,
        })
    result['initial_start_delay_seconds'] = min(
        job['start_delay_seconds'] for job in result['jobs'])
    result['job_execution_span_seconds'] = elapsed(
        min(job['started_at'] for job in result['jobs']),
        max(job['completed_at'] for job in result['jobs']))
    try:
        logs = gh('run', 'view', run_id, '--repo', REPO, '--log')
        # Counts establish observed reuse only; absence never proves a cold cache.
        result['cache_evidence'] = {
            'log_available': True,
            'restore_hits': len(re.findall(r'Cache restored from key:', logs)),
            'restore_misses': len(re.findall(r'Cache not found for input keys:|pnpm cache is not found', logs)),
            'buildkit_cached_steps': len(re.findall(r'#\d+ CACHED\b', logs)),
            'buildkit_import_mentions': len(re.findall(r'importing cache manifest', logs)),
            'buildkit_export_mentions': len(re.findall(r'exporting to GitHub Actions Cache', logs)),
        }
    except subprocess.CalledProcessError:
        result['cache_evidence'] = {'log_available': False}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    args = parser.parse_args()
    selected = []
    for workflow in WORKFLOWS:
        runs = json.loads(gh('run', 'list', '--repo', REPO, '--workflow', workflow,
                             '--status', 'success', '--limit', '5', '--json',
                             'databaseId,headSha,headBranch,event,createdAt,updatedAt'))
        selected.extend({**run, 'workflow': workflow} for run in runs)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(collect_run, selected))
    # Match publication to successful CI at the exact revision where available.
    for run in results:
        if run['workflow'] != 'deploy.yml':
            continue
        candidates = json.loads(gh('run', 'list', '--repo', REPO, '--workflow', 'ci.yml',
                                   '--commit', run['headSha'], '--status', 'success',
                                   '--limit', '20', '--json',
                                   'databaseId,headSha,headBranch,event,createdAt,updatedAt'))
        candidates = [ci for ci in candidates
                      if instant(ci['updatedAt']) <= instant(run['createdAt'])]
        if candidates:
            ci = max(candidates, key=lambda candidate: candidate['updatedAt'])
            run['preceding_successful_ci'] = ci
            run['ci_to_publication_seconds'] = elapsed(ci['createdAt'], run['updatedAt'])
            run['ci_to_deploy_start_gap_seconds'] = elapsed(ci['updatedAt'], run['createdAt'])
            run['ci_match_basis'] = 'latest successful CI at same SHA before deployment; trigger run ID not verified'
    pr_checks = []
    for docker_run in results:
        if docker_run['workflow'] != 'docker-publish.yml':
            continue
        # These observed workflow spans are not proof that branch protection passed.
        candidates = json.loads(gh('run', 'list', '--repo', REPO, '--workflow', 'ci.yml',
                                   '--commit', docker_run['headSha'], '--event', 'pull_request',
                                   '--status', 'success', '--limit', '20', '--json',
                                   'databaseId,headSha,headBranch,event,createdAt,updatedAt'))
        if not candidates:
            pr_checks.append({'docker_run_id': docker_run['databaseId'],
                              'status': 'No successful same-SHA PR CI found'})
            continue
        ci = min(candidates, key=lambda candidate: abs(elapsed(
            candidate['createdAt'], docker_run['createdAt'])))
        pr_checks.append({
            'docker_run_id': docker_run['databaseId'], 'ci': ci,
            'observed_ci_and_docker_span_seconds': elapsed(
                min(ci['createdAt'], docker_run['createdAt']),
                max(ci['updatedAt'], docker_run['updatedAt'])),
            'match_basis': 'same SHA and closest workflow creation time; not a controlled trial',
        })
    data = {
        'pr_checks': pr_checks,
        'captured_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'selection': 'Five most recent successful runs per workflow, not controlled trials.',
        'timing_notes': 'Start delay is relative to the latest attempt and includes scheduling/dependencies; workflow elapsed includes earlier attempts; execution span includes inter-job gaps. API timestamps have second precision. Run updatedAt can include finalization after work.',
        'runs': results,
    }
    args.output.write_text(json.dumps(data, indent=2) + '\n')
    print(f'Captured {len(results)} runs to {args.output}')


if __name__ == '__main__':
    main()
