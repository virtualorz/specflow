# specflow

A lightweight spec-driven development workflow for [Claude Code](https://docs.claude.com/en/docs/claude-code).

Inspired by OpenSpec, but stripped down for solo developers and small teams.
Specflow forces you to align on intent **before** writing code, while keeping the ceremony minimal enough that you'll actually use it.

## Why specflow?

If you've used Claude Code on serious work, you've probably hit two failure modes:

1. **Claude over-designs simple changes** — a 30-line edit turns into a 300-line refactor
2. **Claude misunderstands your project conventions** — wrong layer, wrong naming, wrong everything

Specflow solves both by forcing a 3-stage workflow:

```
issue.md  →  /spec:design  →  design.md  →  /spec:task  →  task.md  →  /spec:run  →  code
   ↑                            ↑                          ↑                          ↑
 you write                  Claude proposes              Claude proposes        Claude executes
                            decisions                    fine-grained steps     step by step
```

Each stage has a checkpoint where **you review before Claude proceeds**.

## Quick Start

### Install in your project

```bash
cd /path/to/your/project
npx @virtualorz/specflow init
```

This creates `.claude/` (skill + slash commands) and `specflow/` (project rules + your specs) in the current directory.

### Define your project rules

Edit `specflow/project.md` with your technical stack, architecture constraints, naming conventions, etc.
This file is **the constitution** — Claude reads it before generating any design or task.

### Start your first spec

In Claude Code, run:

```
/spec:new my-first-task
```

This creates `specflow/changes/my-first-task/issue.md`. Edit it with:

- **The problem** you're solving
- **The expected outcome**
- **The scope boundary** (what to touch, what NOT to touch)

Then run:

```
/spec:design my-first-task
```

Claude reads `project.md` + `issue.md` and produces a `design.md` with a checkbox list of design decisions. Review them, check the boxes, then:

```
/spec:task my-first-task
```

Claude produces a `task.md` with concrete checkboxes. Review, then:

```
/spec:run my-first-task
```

Claude executes each task one by one, ticking checkboxes as it goes, and writes a post-execution summary at the end.

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/spec:new <task-name>` | Create a new spec folder + issue.md template |
| `/spec:design <task-name>` | Read issue.md, generate design.md (with decision checklist) |
| `/spec:task <task-name>` | Read design.md, generate task.md (executable checklist). If `design.md` has discussion questions, enters "discussion mode" first |
| `/spec:run <task-name>` | Execute task.md step by step, fill in post-execution notes |

## Discussion Mode

When reviewing `design.md`, you can write questions in the **"待討論問題" (Pending Questions)** section. Re-running `/spec:task` will:

1. Detect the pending questions
2. Answer them based on `project.md` + context
3. Update affected decisions and reset their checkboxes
4. Move the discussion summary to **"已討論問題" (Discussed Questions)** for future reference
5. Stop and ask you to re-review

This gives you a back-and-forth loop without leaving the file.

## File Structure

After `init`, your project has:

```
your-project/
├── .claude/
│   ├── skills/specflow/
│   │   ├── SKILL.md
│   │   └── templates/
│   │       ├── issue.md
│   │       ├── design.md
│   │       └── task.md
│   └── commands/spec/
│       ├── new.md
│       ├── design.md
│       ├── task.md
│       └── run.md
└── specflow/
    ├── project.md              ← edit this
    └── changes/
        └── <task-name>/
            ├── issue.md
            ├── design.md
            └── task.md
```

## Naming Convention

`<task-name>` must match: `^[a-z]+(-[a-z]+)*$`

- ✅ `refactor-controller-and-readme`
- ❌ `Refactor_Controller` (uppercase + underscore)
- ❌ `重構-proxy` (non-ASCII)

## Design Philosophy

- **Use structure to force quality of thought, but keep minimal forms for small changes** — `design.md` for a 30-line patch can be 3 decisions, not 30
- **Every stage stops for human review** — specflow's value is the checkpoints, not automation
- **Don't trust Claude's memory** — slash commands use `cat` instead of the Read tool to bypass file caching
- **State machine over flow control** — gate conditions (decisions checked + questions cleared) decide what `/spec:task` does, not Claude's memory

## Compatibility

- Requires [Claude Code](https://docs.claude.com/en/docs/claude-code)
- Works with any project type (Laravel, React, Node.js, Python, ...) — specflow itself is pure markdown
- Node.js 18+ required for the `init` command (only)

## License

MIT © virtualorz

## Contributing

Issues and PRs welcome at [github.com/virtualorz/specflow](https://github.com/virtualorz/specflow).
