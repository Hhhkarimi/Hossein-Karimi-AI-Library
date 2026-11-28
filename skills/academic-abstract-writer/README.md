# Academic Abstract Writer | v2.0.0
Portable Agent Skill for ChatGPT and Codex. One folder, one SKILL.md, focused references, templates, optional local Python utilities and evaluation fixtures. No API keys, network access, third-party Python packages or model-specific SDKs required for the utilities. The host language model generates the abstract; scripts validate mechanics only.

## Install
- Codex: extract this ZIP; place the `academic-abstract-writer` folder under the repository `.agents/skills/` or your personal `~/.agents/skills/` location. Start a new session if needed; invoke `$academic-abstract-writer` with a manuscript.
- ChatGPT: if Skills upload is available, upload the ZIP from the Skills interface. Otherwise extract locally, attach the SKILL.md and relevant references, and explicitly request that they be followed; attach the manuscript separately. Some hosts cannot execute local scripts or read all bundled files; use manual checks in those cases. Installation availability depends on the host and workspace.
- OpenAI API: the ZIP has a single top-level skill directory; see https://developers.openai.com/api/docs/guides/tools-skills for the host-specific upload workflow.

## Use
“Use $academic-abstract-writer to write a single-paragraph abstract in the manuscript's language, with six keywords.”
“Write an abstract of at most 180 words; use the attached journal's author instructions.”
“Revise this Persian abstract without changing any findings.”

## Validate locally
From the extracted skill root: `python3 -m unittest discover -s tests -v`.
Run `python3 scripts/validate_abstract.py assets/sample-output-en.txt --language en --min-words 50 --max-words 150 --keyword-count 5` for a short synthetic formatting fixture. See `scripts/USAGE.md` for options. Tests verify deterministic utilities, not language-model scientific performance. Behavioral scenarios in `evals/cases.json` are for manual or host-based evaluation and are not automatically executed by unittest.

## Design and privacy
Defaults are editorial choices (one paragraph, 180–250 words where appropriate, 5–7 keywords). User constraints override defaults. Manuscripts are treated as data; no automatic network calls or modification of source files. Only create temporary draft files when authorized by host workflow. Synthetic examples are teaching fixtures, not published research. See `references/scientific-sources.md` for guidance.

## Documentation
`SKILL.md` routes the workflow; `references/` contains specialized knowledge; `assets/` contains reusable templates and JSON schemas; `scripts/` contains local tools; `tests/` contains executable unit tests; `evals/` contains model behavior scenarios; `agents/` contains optional Codex metadata.
