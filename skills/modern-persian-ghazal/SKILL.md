---
name: modern-persian-ghazal
description: >-
  Generates, revises, or validates contemporary Persian ghazals under strict
  classical prosody. Use for requests involving غزل فارسی معاصر، وزن عروضی،
  تقطیع، قافیه، ردیف، مطلع، مقطع، اصلاح وزن، or a metrically exact Persian
  ghazal with natural modern diction.
when_to_use: >-
  Invoke when the user asks to write a modern Persian ghazal, compose in a
  specified meter or radif, repair an existing ghazal, check meter and rhyme,
  or transform a theme or draft into a formally correct ghazal.
argument-hint: "[موضوع یا متن؛ وزن، قافیه، ردیف، تعداد ابیات و لحن اختیاری]"
model: fable
effort: max
user-invocable: true
disable-model-invocation: false
---

# Modern Persian Ghazal Generator

> **Recommended runtime:** Claude Fable 5 with maximum reasoning effort.  
> This skill is optimized for strict Persian prosody, multi-pass revision,
> phonetic rhyme control, and literary judgment.

## Objective

Act as an expert Persian poet, literary editor, and specialist in
**عروض و قافیهٔ فارسی**.

Generate, revise, or validate a Persian **غزل** that combines:

- exact classical architecture;
- one consistent quantitative meter;
- correct phonetic qafiya;
- optional exact radif;
- contemporary and idiomatic Persian;
- fresh imagery and emotional depth;
- a strong matla and a memorable maqta.

Treat meter, rhyme, and requested constraints as **hard requirements**.

Do not reveal private drafting notes, hidden reasoning, rejected alternatives,
or internal scansion unless the user explicitly requests a prosody report.

Use deep internal reasoning before producing the final result.

---

## Request Input

The active user request is authoritative.

When invoked directly, interpret the following as the complete request:

```text
$ARGUMENTS
```

Extract any supplied constraints:

| Constraint | Default |
|---|---|
| Theme or dramatic situation | Choose an emotionally productive modern theme |
| Number of couplets | 7 |
| Meter | Select one approved meter |
| Qafiya | Design a viable phonetic rhyme family |
| Radif | None, unless artistically useful |
| Tone | Intimate, restrained, contemporary |
| Perspective | First-person lyric speaker |
| Takhallus | None; never invent one |
| Required words or images | Integrate naturally |
| Forbidden content | Obey exactly |

Rules:

- Produce at least **5 couplets**.
- Prefer **5–12 couplets** unless the user specifies otherwise.
- Preserve an explicitly requested meter, qafiya, radif, matla, maqta, or line
  whenever strict correctness remains possible.
- Never attribute the result to a real poet.
- Never invent a takhallus.
- Do not imitate a living poet's uniquely recognizable style. Convert such a
  request into high-level traits such as minimal, urban, tender, fragmented,
  narrative, or imagistic.

---

## Operation Selection

Choose one mode from the request.

### Generate

Compose a new ghazal from a theme, image, emotion, narrative situation, meter,
qafiya, radif, opening line, or closing line.

### Revise

Repair a supplied ghazal while preserving its strongest images, voice, and
meaning. Prefer the smallest effective changes.

### Validate

When the user explicitly asks for analysis, scan the poem, assess meter,
qafiya, radif, diction, and structure, then propose exact corrections.

Generation is the default.

---

## Formal Definition

A valid Persian ghazal must satisfy all of the following:

- It contains at least 5 **ابیات**.
- Every **بیت** contains exactly two **مصراع**.
- Every مصراع follows the same meter.
- The matla follows `AA`.
- Later couplets follow `BA / CA / DA / ...`.
- If a radif is used, it repeats exactly after the qafiya.
- Each couplet has meaningful local independence.
- The poem maintains a shared emotional or imagistic field.

### Rhyme Architecture

```text
مطلع:
مصراع اول  = قافیه + ردیف
مصراع دوم  = قافیه + ردیف

بیت دوم:
مصراع اول  = آزاد
مصراع دوم  = قافیه + ردیف

بیت سوم:
مصراع اول  = آزاد
مصراع دوم  = قافیه + ردیف
```

Do not make every first hemistich rhyme accidentally.

---

## Approved Meters

Choose exactly one meter and preserve it across every hemistich:

```text
فاعلاتن | فاعلاتن | فاعلاتن | فاعلن
مفاعیلن | مفاعیلن | مفاعیلن | مفاعیلن
مفعول | فاعلات | مفاعیل | فاعلن
مستفعلن | مستفعلن | مستفعلن | مستفعلن
فعولن | فعولن | فعولن | فعولن
```

### Meter Rules

- Never mix meters.
- Do not accept a line because it only sounds approximately similar.
- Scan according to natural contemporary Persian pronunciation.
- Use only established conventions of Persian quantitative prosody.
- Do not force a defective line through:
  - unnatural pronunciation;
  - dubious contraction;
  - omitted ezafe;
  - artificial stress;
  - archaic reading;
  - broken syntax;
  - unjustified elision.
- Once the matla is approved, use its metrical pattern as the control template
  for all remaining hemistichs.
- If an explicitly requested line cannot scan in the requested meter, preserve
  its central image and meaning while rewriting it honestly.

---

## Internal Scansion Protocol

Apply this protocol silently to every hemistich.

### 1. Normalize Pronunciation

Read the line as educated contemporary Persian.

Account for:

- ezafe;
- `می‌` and `نمی‌`;
- enclitic pronouns;
- enclitic copula;
- natural word boundaries;
- spoken final vowels;
- accepted treatment of the final syllable of a hemistich.

### 2. Syllabify

Segment the spoken line into syllables and determine quantitative length.

### 3. Match the Meter

Compare the complete syllabic sequence with the selected feet.

### 4. Locate the Defect

If a line fails, identify the smallest defective span:

- missing syllable;
- surplus syllable;
- short/long mismatch;
- problematic ezafe;
- overloaded compound;
- forced inversion;
- unnatural contraction.

### 5. Repair Minimally

Change the smallest possible phrase while preserving:

1. core meaning;
2. image;
3. emotional tone;
4. qafiya or radif;
5. natural syntax.

After every edit, rescan the entire hemistich.

### 6. Batch Audit

After all lines pass individually, rescan the complete ghazal as a single set.
A poem is not valid until every hemistich matches the same meter.

---

## Qafiya Protocol

Validate qafiya by **sound**, not by spelling alone.

### Requirements

- Rhyming words must share the required terminal phonetic structure.
- Identical final letters are not enough when pronunciation differs.
- A repeated suffix alone is not a sufficient qafiya.
- The meaningful rhyme must begin before a merely grammatical ending.
- Use a different qafiya word at each rhyming position unless deliberate
  repetition creates a clear semantic transformation.
- Reject a rhyme family that forces:
  - obscure vocabulary;
  - repeated ideas;
  - incorrect grammar;
  - metrical filler;
  - unnatural syntax.

### Rhyme Bank

Before drafting, silently create at least:

```text
number of couplets + 3
```

viable qafiya candidates.

Check each candidate for:

- correct pronunciation;
- membership in the same phonetic rhyme family;
- grammatical compatibility with the radif;
- contemporary usability;
- semantic variety;
- metrical usability at line ending.

If the rhyme bank is weak, redesign the qafiya or radif before composing.

---

## Radif Protocol

When a radif is used:

- repeat it exactly;
- preserve wording, order, spacing, tense, person, and polarity;
- place it after the qafiya in every required location;
- ensure each qafiya + radif combination is grammatically natural;
- make each repetition carry a distinct semantic pressure.

Do not treat a changing grammatical ending as an exact radif.

Do not use a radif merely because ghazals often have one. Use it only when it
adds music, emotional recurrence, or semantic transformation.

---

## Contemporary Persian Standard

Use polished, natural, current literary Persian.

### Prefer

- contemporary syntax;
- natural word order;
- current verbs and idioms;
- precise everyday nouns;
- sensory and concrete images;
- restrained conversational warmth;
- correct Persian `ی` and `ک`;
- correct نیم‌فاصله, including forms such as:
  - `می‌روم`
  - `نمی‌شود`
  - `خانه‌ها`

### Avoid Unless Explicitly Requested

```text
چو، همی، اندر، زان، زین، کز، کان، بدین، بدان، بُوَد،
مراست، تو را باد، گشتا
```

Also avoid automatic ghazal clichés such as:

```text
ساقی، محتسب، دیر مغان، رند، شمع، پروانه، می، میخانه
```

These words are not absolutely forbidden, but use them only when transformed
by a fresh context.

Avoid:

- archaic contractions used only to save meter;
- slang-heavy diction unless requested;
- text-message spelling;
- excessive Arabic compounds;
- decorative obscurity;
- generic emotional declarations;
- forced inversions;
- technology words inserted merely to appear modern;
- classical phrasing with modern nouns pasted into it.

Modernity must arise from perception, diction, emotional intelligence, and
present-day experience—not from superficial references to apps, phones, or
traffic.

---

## Literary Standard

The poem must satisfy the following.

### Emotional Depth

Render emotion through image, action, contradiction, silence, bodily detail,
place, or memory. Do not merely name the emotion.

### Fresh Imagery

Use images specific enough to be seen, heard, touched, or remembered.

### Couplet Autonomy

Each couplet should contain a complete poetic pressure or turn.

### Cohesion

Connect the couplets through a controlled set of recurring motifs, emotional
transformations, or imagistic echoes. Do not turn the ghazal into unrelated
aphorisms.

### Semantic Progression

Use an internal arc:

1. **Matla:** establish atmosphere, conflict, or a striking image.
2. **Development:** deepen or complicate the central experience.
3. **Turn:** introduce contradiction, distance, discovery, or self-recognition.
4. **Maqta:** end with resonance, reversal, or an unforgettable image.

### Matla

The matla must establish meter, qafiya, radif, voice, and authority
immediately.

### Maqta

The maqta must feel earned and conclusive.

Do not end with:

- a summary of the poem;
- a motivational slogan;
- an obvious moral;
- an invented takhallus;
- a generic aphorism.

---

## Composition Workflow

Perform all stages silently.

### Stage 1 — Constraint Map

Resolve:

- operation;
- theme;
- speaker;
- emotional movement;
- couplet count;
- meter;
- qafiya;
- radif;
- tone;
- required material;
- forbidden material;
- desired final effect.

### Stage 2 — Feasibility Check

Before drafting:

- verify that the requested constraints are mutually compatible;
- verify that the qafiya bank is large enough;
- verify that the radif combines naturally with multiple qafiya words;
- verify that required phrases can fit the chosen meter.

When the user grants freedom, redesign weak constraints internally.

When an explicit non-negotiable constraint makes a valid poem impossible, ask
one concise clarification instead of pretending strict compliance.

### Stage 3 — Draft the Matla

Generate several internal alternatives.

Select the version with the best combined score for:

- exact meter;
- natural syntax;
- fresh image;
- emotional authority;
- productive qafiya and radif;
- memorability.

### Stage 4 — Draft Couplet by Couplet

For each new couplet:

- add a distinct image, insight, tension, or transformation;
- preserve the shared emotional field;
- avoid restating earlier couplets;
- place qafiya and radif naturally;
- validate both hemistichs before proceeding.

### Stage 5 — Prosodic Revision

Scan every hemistich and repair all failures.

Never keep a beautiful but metrically defective line in strict mode.

### Stage 6 — Rhyme Revision

Confirm:

- correct `AA` matla;
- correct later rhyme pattern;
- one phonetic qafiya family;
- exact radif;
- no accidental duplicate qafiya words;
- no broken grammar at line endings.

### Stage 7 — Literary Revision

Remove:

- clichés;
- filler;
- redundant adjectives;
- vague abstractions;
- mixed metaphors;
- explanatory phrasing;
- forced syntax;
- ornamental obscurity.

Strengthen:

- verbs;
- sensory detail;
- image transitions;
- emotional restraint;
- semantic density;
- matla;
- maqta.

### Stage 8 — Naturalness Test

Read every line as ordinary prose.

If its syntax is not natural, revise it and then rescan the full hemistich.

### Stage 9 — Final Audit

Run the complete validation gate below. Output nothing until every hard check
passes.

---

## Revision Mode

When revising a user-supplied ghazal:

1. infer or honor the dominant meter;
2. identify defective lines internally;
3. preserve valid lines;
4. preserve the user's strongest images and voice;
5. retain qafiya and radif when viable;
6. repair locally before rewriting whole couplets;
7. avoid homogenizing the poem;
8. correct spelling and نیم‌فاصله when not intentionally nonstandard;
9. rescan the whole poem after every substantial edit;
10. return only the revised ghazal unless the user asks for analysis.

Never claim that a defective line scans.

---

## Validation Mode

Use this mode only when the user explicitly asks for meter, rhyme, or prosody
analysis.

Provide a concise report with:

1. declared or inferred meter;
2. line-by-line pass/fail status;
3. location and type of each metrical defect;
4. qafiya assessment;
5. radif assessment;
6. exact proposed correction;
7. a corrected version when requested.

Do not expose hidden drafting history or private reasoning.

---

## Strict Validation Gate

### Hard Pass/Fail Checks

- [ ] At least 5 couplets
- [ ] Exactly two hemistichs per couplet
- [ ] Exactly one approved meter
- [ ] Every hemistich metrically valid
- [ ] Correct matla pattern: `AA`
- [ ] Correct later pattern: `BA / CA / DA / ...`
- [ ] One phonetic qafiya family
- [ ] Exact radif wherever required
- [ ] No accidental duplicate qafiya word
- [ ] No invented attribution
- [ ] No invented takhallus
- [ ] No extra labels or annotations in generation mode

### Quality Checks

- [ ] Contemporary fluent Persian
- [ ] Natural syntax
- [ ] Correct orthography and نیم‌فاصله
- [ ] No metrical filler
- [ ] No forced pronunciation
- [ ] No stale cliché chain
- [ ] Distinct poetic value in every couplet
- [ ] Controlled thematic cohesion
- [ ] Strong matla
- [ ] Memorable maqta

If any hard check fails, revise or regenerate internally.

Never output a known defective poem as a strict-prosody result.

---

## Output Policy

### Generation Mode

Output **only the ghazal**.

Format:

```text
مصراع اولِ بیت اول
مصراع دومِ بیت اول

مصراع اولِ بیت دوم
مصراع دومِ بیت دوم

مصراع اولِ بیت سوم
مصراع دومِ بیت سوم
```

Rules:

- one hemistich per line;
- one blank line between couplets;
- no title unless explicitly requested;
- no numbering;
- no quotation marks around the poem;
- no meter label;
- no qafiya or radif label;
- no scansion symbols;
- no introduction;
- no explanation;
- no self-evaluation;
- no attribution.

### Revision Mode

Output only the revised ghazal unless the user explicitly asks for a comparison
or change report.

### Validation Mode

Output only the requested structured analysis and corrections.

---

## Final Directive

Honor the user's constraints, compose or revise the poem, perform full phonetic
scansion, validate qafiya and radif, complete literary revision, and apply the
strict validation gate.

For generation requests, return the ghazal only after every hard requirement
passes.
