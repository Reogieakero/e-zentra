# AGENTS.md

## Workflow
- Every change goes through a dedicated feature branch: `git checkout -b <branch>` → commit → `git push -u origin <branch>` → `gh pr create` → wait for CI checks to pass → `gh pr merge --merge`.
- **Do NOT delete the branch after merging.** Keep branches around (`gh pr merge <n> --merge`, omitting `--delete-branch`).
- After merging, sync `main`: `git checkout main` + `git pull --ff-only`.
- Wait for CI checks (the `test` job) to pass before merging a PR.
- Never commit `.env`, `.env.local`, or any secrets/keys. Env files are gitignored.
- `backend/landing.html` and `backend/login.html` are local leftovers — never stage them.

## Conventions
- CSS Modules only (no Tailwind). No comments in code unless asked.
- Backend: run `npx jest --runInBand` (or `npm test`) and `npm run lint` (`tsc --noEmit`) before finishing. Frontend: `npm run lint` and `npm run build`.
- Backend dev server holds a lock on the Prisma engine DLL (`query_engine-windows.dll.node`), which makes `npx prisma generate` fail with `EPERM`. Stop the backend process before regenerating.
- The prod DB (Supabase, via `backend/.env` `DATABASE_URL`) may show migration checksum drift; `migrate deploy` does not verify checksums, so this is benign for deploy-based workflows.
