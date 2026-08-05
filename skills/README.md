# skills/

This directory is the canonical, versioned home of the five managed CTRL chain skills
(`ctrl-intake`, `ctrl-compile`, `ctrl-build`, `ctrl-check`, `ctrl-capture`).
Runtime skill directories, such as `~/.claude/skills`, are ephemeral copies that sync FROM here,
so edit here first and push the change outward; an edit made only in a runtime copy is lost
the next time that environment is rebuilt. `registry.md` beside these directories records
what each skill is for, who owns it, and when it was last reviewed.
