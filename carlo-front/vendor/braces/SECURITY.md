# Local mitigation for braces 3.0.3

This directory contains the npm `braces@3.0.3` sources under their original MIT
license and version, with a local patch for
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
The advisory still lists no released fix as of 2026-10-10 UTC. npm audit can
therefore still flag the unchanged version. An audit alert must remain visible;
this patch is evidence of mitigation, not a claimed upstream release or an audit
exception.

The design follows the depth-bound approach proposed in
[upstream PR 87](https://github.com/micromatch/braces/pull/87), commit
`d44b9b1ee12e7804d4232d5a47a4a0c61d2fbefe`. That proposal is open, not released.
This is a separate minimal patch to npm 3.0.3, not a copy of upstream master or a
claim that the maintainer accepted the proposal.

`PROVENANCE.json` records the original registry URL/integrity and SHA-256 of the
original and patched files. Original npm hashes use raw source bytes. Patched
text and diff hashes normalize CRLF to LF before UTF-8 hashing so that a Windows
checkout cannot change the expected content hash merely by changing line endings.
`SECURITY.patch` contains the exact local source diff with zero unified context.
Reproduce it on the original npm sources with `git apply --unidiff-zero`.
Its SHA-256 is `b3ec90a846ca470f559e10ab0678d82a05843d90b461aebb2f741cfb6c013a80`.
The original `LICENSE`, package metadata, README and unchanged sources are kept.

The parser rejects combined brace and parenthesis nesting above 100 before
building deeper AST nodes. `maxDepth` can lower this cap but cannot raise or
disable it. Escapes, quoted strings and bracket expressions keep their literal
behavior. Compile, expand and stringify validate supplied ASTs with an iterative
child traversal before their recursive walkers: depth is capped, child cycles
and malformed references are rejected. Expansion also bounds parent-chain
traversal and rejects parent cycles. Parent/prev links of normal parsed ASTs are
not traversed as children because they deliberately point back.

This intentionally rejects formerly accepted patterns/ASTs nested above 100. It
addresses recursive stack exhaustion; expansion-size limits retain the upstream
behavior and this is not a claim that all possible glob/regular-expression
resource attacks are eliminated.

Run from `carlo-front` with Node 24:

```
node scripts/check-braces-security.mjs
node scripts/check-braces-security.mjs --package=node_modules/braces
```

The second command checks the package actually selected by dependency resolution
after installation. It is required before accepting the mitigation as operative.

The project pins upstream `braces@3.0.3` normally. Its `postinstall` runs
`scripts/apply-braces-security.mjs`, which validates original/patched SHA-256
values for every lockfile-selected installed copy before applying this backport.
The build runs its `--check` mode and refuses unpatched or unreviewed sources.
It changes source files only, leaving package name/version and npm audit metadata
intact. A local file override was tested and rejected after reproducibility
failures with npm 11; it is not part of the final dependency configuration.
The suite uses ordinary Tailwind globs, ranges, escaping, quoted/bracket literals,
malformed patterns, and public/internal AST entry points. Hostile cases run in
separate local children with `--stack-size=512`, a 3-second deadline, and no
application, HTTP, database or provider. A 3,000-level string is 6,001 characters,
below the original 10,000-character cap. Intended guard errors are asserted;
merely throwing `Maximum call stack size exceeded` does not pass.

Actual RED to GREEN on Node 24.21.0: unpatched npm copy 24 passed / 25 failed;
patched vendor 49 passed / 0 failed. Logs are in the production-closure evidence
folder as `braces-regression-red.log` and `braces-regression-green.log`. A release
must additionally pass the normal frontend checks/build with the operative
dependency. Replace this local patch with an official fixed release once one is
published and regression tests confirm equivalent protection.
