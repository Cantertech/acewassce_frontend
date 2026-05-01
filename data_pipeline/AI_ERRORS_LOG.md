# AI Extraction Error Log

This document tracks all the consistent hallucination patterns and formatting errors we encountered during the 2025 WASSCE Mathematics test extraction, and how we resolved them.

We use this file as a strict prompt guide for future extraction scripts (`extract.py`) and as a sanity check for database cleanup tools.

### 1. The "Dollar Sign Parity" Bug (Math Context Flipping)
**Description:** The AI often pulls currency values (e.g. `$64,000.00`) directly from the test paper. However, because it only uses a single `$` symbol, it flips the math-mode context parity. From that word onwards, the entire paragraph gets rendered as a continuous, giant math equation causing horizontal side-scrolling. 
**Fix:** The AI must wrap currencies directly as string decimals or use properly enclosed escaped math blocks (e.g. `$\\$64,000.00$`).

### 2. The `\text` Invisible Character Bug
**Description:** The AI commonly injects `\text{%}` or `\textper cent` to try formatting text strings within mathematical expressions. During JSON stringification in python, `\t` translates into an invisible "Horizontal Tab" (`\x09`) while `\f` (as in `\frac`) translates into an invisible "Form Feed" (`\x0c`). This completely corrupted the characters into `$x   extpercent$` and `$3rac{1}{2}$`.
**Fix:** We explicitly banned the `\text{...}` command from the System Prompts and implemented a script that sweeps the database restoring tabs (`\x09`) to `\t` and form feeds (`\x0c`) to `\f`.

### 3. The `is_mcq` Flag Hallucination
**Description:** For specific Objective questions (like Q24), the AI hallucinated that `is_mcq = false` because the answer options (A, B, C, D) were slightly cropped or disjointed in the scan. This caused the platform to silently skip the question since it only renders boolean `true`.
**Fix:** Force the AI to trust the paper title over formatting ambiguities. If the filename says "CORE 1", `is_mcq` is overwhelmingly likely to be true.

### 4. The `%` Comment Rendering Crash
**Description:** Under strict rendering environments like KaTeX or MathJax, an unescaped `%` character explicitly means "Code Comment." When the AI writes `$10%$`, KaTeX comments out the closing `$` and literally crashes with a React error: `comment has no terminating newline`.
**Fix:** We built an interceptor within the frontend `LatexRenderer.tsx` that uses regex to safely convert any unescaped `%` into `\%` directly before it passes to the math engine.

### 5. Inline Math Tag Confusion `\(` vs `$`
**Description:** Despite strict instructions, the AI occasionally defaults to Markdown/HTML formatted latex bounds `\(` and `\)` instead of `$`. 
**Fix:** Our formatting pipeline aggressively detects and replaces `\(` and `\)` hooks into proper `$` hooks.
