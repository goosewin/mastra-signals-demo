## Model Reference

| model    | cost | intelligence | taste |
|----------|-----:|-------------:|------:|
| gpt-5.5  |    9 |            8 |     5 |
| sonnet-5 |   15 |            5 |     7 |
| opus-4.8 |    4 |            7 |     ? |
| fable-5  |    2 |            9 |     9 |

## Picking the right models for workflows and subagents

Rankings, higher = better. Cost reflects what I actually pay (OpenAI has really generous limits), not list price. Intelligence is how hard a problem you can hand the model unsupervised. Taste covers UI/UX, code quality, API design, and copy.

How to apply:

- These are defaults, not limits. You have standing permission to override them: if a cheaper model's output doesn't meet the bar, rerun or redo the work with a smarter model without asking. Judge the output, not the price tag. Escalating costs less than shipping mediocre work.
- Cost is a tie-breaker only; when axes conflict for anything that ships, intelligence > taste > cost.
- Bulk/mechanical work (clear-spec implementation, data analysis, migrations): gpt-5.5 — it's effectively free.
- Anything user-facing (UI, copy, API design) needs taste >= 7.
- Reviews of plans/implementations: fable-5 or opus-4.8, optionally gpt-5.5 as an extra independent perspective.
- Never use Haiku.
- Mechanics: gpt-5.5 is only reachable through the Codex CLI: `codex exec` / `codex review` (my `~/.codex/config.toml` defaults to gpt-5.5). Use the codex-implementation, codex-review, and codex-computer-use skills; for work they don't cover (investigation, data analysis), run `codex exec -s read-only` directly with a self-contained prompt.
- Claude models (sonnet-5, opus-4.8, fable-5) run via the Agent/Workflow model parameter.

Using gpt-5.5 inside workflows and subagents: the model parameter only takes Claude models, so use a wrapper:

- Spawn a thin Claude wrapper agent with `model: "sonnet"`, `effort: "low"` whose prompt instructs it to write a self-contained Codex prompt, run `codex exec` via Bash, and return the result.

### Codex subagent wrapper protocol

When a workflow needs gpt-5.5, spawn a thin Claude wrapper agent only as an executor/monitor.

The wrapper must:
- Write a self-contained Codex prompt with the task goal, repo path, constraints, files to inspect, expected output, and verification requirements.
- Run Codex through Bash using `codex exec` for implementation/investigation or `codex review` for review.
- Keep a log of the exact command, prompt summary, start time, exit status, and key output.
- Poll or wait for completion; do not assume success from process launch.
- If Codex fails, times out, or returns incomplete work, summarize the failure and either retry once with a clearer prompt or escalate to the orchestrator.
- Return only: status, changed files or findings, tests/verification run, unresolved issues, and recommended next step.

Monitoring rules:
- Treat no output, hanging processes, failed commands, missing tests, or vague summaries as incomplete.
- For implementation work, inspect the diff after Codex finishes.
- For review work, require file/line-specific findings or an explicit “no findings.”
- Do not launch overlapping Codex agents against the same files unless the task is read-only.
