/*
 * Surfaces flaky tests from a Playwright JSON report as job annotations.
 *
 * CI retries twice, so a flaky test leaves the job green and the only record of
 * it is a `1 flaky` line partway up the log. Five PRs were merged on all-green
 * checks while one of them carried a live flake (#75). This makes that visible
 * without making it fail the build — a flake is worth reading, not worth
 * blocking a merge on.
 */
import { appendFile, readFile } from 'node:fs/promises'
import process from 'node:process'

// stdout is this script's interface: GitHub reads `::warning::` commands from it.
/* eslint-disable no-console */

const [reportPath, label = ''] = process.argv.slice(2)

/** A spec runs once per project, so the same title can flake under one book and not another. */
function collect(suite, out) {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      if (test.status !== 'flaky') continue
      out.push({
        title: spec.title,
        file: spec.file,
        line: spec.line,
        project: test.projectName ?? '',
        retries: Math.max(0, (test.results?.length ?? 1) - 1),
      })
    }
  }
  for (const child of suite.suites ?? []) collect(child, out)
}

let report
try {
  report = JSON.parse(await readFile(reportPath, 'utf8'))
}
catch {
  // No report means the run never reached the reporter. The failing step already
  // said so, and an annotation here would only add noise to a red job.
  process.exit(0)
}

const flaky = []
for (const suite of report.suites ?? []) collect(suite, flaky)

// `stats.flaky` is counted independently of the tree walk. A mismatch means the
// report shape moved under us and the walk is missing tests — say so rather than
// quietly under-reporting.
const claimed = report.stats?.flaky
if (typeof claimed === 'number' && claimed !== flaky.length) {
  console.log(`::warning::annotate-flaky found ${flaky.length} flaky test(s) but the report claims ${claimed}; the JSON shape may have changed.`)
}

if (flaky.length === 0) process.exit(0)

const where = label ? ` [${label}]` : ''
for (const { title, file, line, project, retries } of flaky) {
  const attempts = retries === 1 ? '1 retry' : `${retries} retries`
  const scope = project ? `${project} › ` : ''
  console.log(`::warning file=${file},line=${line},title=Flaky test${where}::${scope}${title} — passed only after ${attempts}`)
}

const summary = process.env.GITHUB_STEP_SUMMARY
if (summary) {
  const rows = flaky
    .map(f => `| \`${f.file}:${f.line}\` | ${f.project} | ${f.title} | ${f.retries} |`)
    .join('\n')
  await appendFile(
    summary,
    `\n### Flaky${where}: ${flaky.length}\n\n| spec | project | test | retries |\n| --- | --- | --- | --- |\n${rows}\n`,
  )
}

console.log(`\n${flaky.length} flaky test(s)${where}. The job is green; the traces are in the artifact.`)
