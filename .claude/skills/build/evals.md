# Evals — build skill

Binary checks on a build session's outputs. Grade with a fresh agent that did not
run the build, pointing at the named artifacts. Any fail: fix, then re-grade with
a new fresh agent until all pass. Cap ~12 — to add a check, merge or retire a
weaker one.

1. Every feature in `app/feature-list.json` has a `serves` naming a spec line or
   `evals.md` check, and every What-good-looks-like line and check is served by
   at least one feature.
2. `app/app-spec.json` exists with the shared config, and no required key or
   credential was left unresolved — if one was missing, the trace shows the build
   stopped and asked the user before continuing.
3. The source under `app/` uses only tech-stack choices declared in
   `app/app-spec.json` — no library or framework imported from nowhere.
4. `git log` shows one commit per feature, each commit naming its feature.
5. `app/claude-progress.txt` has one RATIONALE line per feature (timestamp,
   S2 tag, feature name, one-sentence why).
6. Every feature in `app/feature-list.json` is marked done, and none was marked
   done without its trace line.
7. Any irreversible change — a feature that serves no spec line or check, a tech choice not in
   app-spec.json — has a written reason in the trace dated BEFORE the change
   (per `modules/shared-rules.md`).

Gold examples: none yet — this kit ships unbuilt. Aim for a
`app/feature-list.json` where every entry cites what it serves and carries a
status, and an `app/app-spec.json` that states each shared choice once with the
credential status resolved. Replace this line with real references after the
first run.
