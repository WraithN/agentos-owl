<!-- AGENTS.user.md — User-defined Rules (Language-agnostic) -->

> This document is intended for AI coding assistants. It serves as a **language-agnostic refinement and dimensional merge** of the hard constraints in `AGENTS.md`. The original `AGENTS.md` must not be modified; this file exists as a supplementary layer.

---

## Rule 1: Build Verification & Quality Gate

After every feature development or bug fix, the following quality gates must be passed before delivery:

1. **Build Success** — Run the project's build command and ensure compilation passes
2. **Zero Warnings** — Resolve all compiler/analyzer warnings; no unresolved warnings may be left in production
3. **Tests Pass** — Run the project's test command and ensure all tests pass
4. **Real Environment Validation** — Start and verify functionality in the target runtime environment

**Exception Handling:** For code that genuinely needs to be kept (e.g., reserved public APIs, future extension points), explicit suppression annotations are allowed, but the reason must be documented in comments. Bulk addition of global suppression directives to mask real code quality issues is prohibited.

---

## Rule 2: Code Structure & Maintainability

Code must maintain high cohesion, low coupling, and be quickly understandable:

| Constraint | Specific Requirement |
|------------|---------------------|
| **File Size** | Single source file ≤ 600 effective lines (excluding comments and blank lines); if exceeded, split by functional domain or abstraction level |
| **Nesting Depth** | Maximum 3 levels of nesting; use early returns (Guard Clauses) or extract small functions when exceeded |
| **Duplicate Logic** | Any logic fragment appearing ≥ 2 times in the project must be extracted into a semantically clear named function |
| **Magic Values** | All literals must be extracted into named constants (numbers, strings, boolean combinations); use UPPER_SNAKE_CASE naming |

**Splitting Principles:** Separate by functional domain (data processing / UI rendering / network requests), separate by abstraction level (interface definition / implementation details / utility functions), extract shared logic into common modules.

**Exceptions:** `0`, `1`, `-1` in obvious contexts like array indexing; temporary strings for pure UI display; `true`/`false` in simple conditional checks.

---

## Rule 3: Documentation Standards & Design Consistency

### 3.1 Complex Logic Comments

Detailed comments must be added for the following scenarios:
- Processes involving multi-step state transitions
- Non-intuitive algorithms or calculation logic
- Boundary handling for interactions with external systems
- Code blocks with special cases or fault tolerance handling

**Comment Requirements:** Provide contextual explanations for key variables and conditional checks; known limitations or TODOs must be explicitly labeled.

### 3.2 Design Standards Compliance

- **Default Compliance:** Unless the user explicitly requests style changes, any UI design, style adjustments, new components, or layout modifications must first read and strictly follow the project's design specification document (e.g., `DESIGN.md`)
- **Mandatory Update:** If the user explicitly requests style changes, the design document must be synchronized after completion to ensure it always matches the actual code
- The design document is the single source of truth for the project's UI/UX, covering color system, typography system, spacing layout, component specifications, icon system, etc.

---

## Rule 4: Debugging Protocol & Defect Documentation

### 4.1 Debugging Protocol

If the root cause of a defect cannot be located within 5 steps:
1. Add detailed log output in the relevant code paths
2. Request the user to perform test operations in the real environment
3. Analyze and troubleshoot by observing the logs generated from user testing
4. Iterate fixes based on log feedback

### 4.2 Defect Documentation

All defect fixes must be simultaneously recorded in the `docs/bugs/` directory:
- **File Name Format:** `YYYY-MM-DD-<brief-description>.md`
- **Must Contain Three Parts:**
  1. **Phenomenon** — Specific manifestation and impact scope of the defect
  2. **Root Cause** — Analysis of the fundamental cause of the defect
  3. **Solution** — Fix measures and verification results

---

## Rule 5: TODO List Management

### 5.1 When to Write

The following situations must have related items written to `TODO.md` in the project root:
- Items pending decision, splitting, or review identified during the design phase
- Incomplete tasks left during the coding process (unimplemented features, unadded tests, unperformed refactoring, etc.)
- Subsequent requirements or deferred items explicitly raised by the user

### 5.2 Format & Status Markers

`TODO.md` uses the following format:

```markdown
# Project Todo List

## [Date] <Category>
- [ ] <Task Description> — Status: `PENDING` / `IN_PROGRESS` / `COMPLETED`
- [x] <Task Description> — Status: `COMPLETED`
```

Status Definitions:
| Status | Meaning | When to Use |
|--------|---------|-------------|
| `PENDING` | Recorded, not yet started | When first written |
| `IN_PROGRESS` | Being processed | Update when starting the task |
| `COMPLETED` | Delivered and verified | Update after task completion and passing quality gates |

### 5.3 Completion & Updates

When the user explicitly requests completion of items in `TODO.md`:
1. Process items one by one, updating the corresponding status to `IN_PROGRESS` during processing
2. For each completed item, Rule 1 quality gates must be passed (build, zero warnings, tests pass, real environment validation)
3. After verification, mark the item as `COMPLETED` and check the checkbox `[x]`
4. If all items in `TODO.md` are completed, append a completion timestamp at the end of the file, and archive or clear as appropriate

---

## Rule 6: Rule Governance

The above six rules (Rule 1–6) must be retained when modifying `AGENTS.md` or `AGENTS.user.md`. They may not be overwritten, deleted, or modified. Any updates to the agent guidelines should append or adjust other content on the premise of retaining these rules.

---

## Appendix: Language-Specific Command Reference (For Reference in Specific Projects)

> The following commands are examples only; actual execution should use equivalent commands according to the project's tech stack.

| Goal | Rust Example | TypeScript Example |
|------|-------------|-------------------|
| Build Check | `cargo check -p <package>` | `npx tsc --noEmit -p tsconfig.check.json` |
| Run Tests | `cargo test -p <package>` | `vitest run` |
| Static Analysis | `cargo clippy -p <package> -- -D warnings` | `npx biome lint` |
| Explicit Suppression | `#[allow(dead_code)]` + comment | `// @ts-ignore` + comment |
| Startup Validation | `./target/release/<binary>` | `pnpm build && pnpm preview` |
