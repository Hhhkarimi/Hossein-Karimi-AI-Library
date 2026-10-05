# Image generation playbook

## Primary principle

Generate the cover first. The cover is the visual reference for every subsequent slide.

## Prompt composition

Each prompt should include:

- slide index and total,
- language/direction,
- exact copy,
- palette roles with HEX values,
- style preset and concrete visual rules,
- card count and layout,
- icon concept,
- portrait instructions if any,
- slide-number badge,
- negative constraints.

## Portrait preservation

When editing or compositing a supplied portrait:

- preserve identity,
- preserve glasses,
- preserve hair and face geometry,
- do not de-age or heavily retouch,
- modify only crop, lighting integration, background separation, and color harmony unless otherwise requested.

## OpenAI image models

As of the package build date, OpenAI supports GPT Image models through the Image API and the Responses image-generation tool. Use a current model rather than hard-coding an obsolete one. At package build time, `gpt-image-2.5-sunburst` is the precision-oriented choice for reference-image/editing work and `gpt-image-2.5-flare` is the faster high-quality choice for iteration. Re-check current model availability before relying on a specific model name.

When direct API control is available, a high-resolution 4:5 generation such as 1088×1360 can be post-processed to exact 1080×1350.

## Text risk

Generative image models can still make typography errors. For Persian-heavy slides, prefer exact-layout hybrid rendering when correctness is critical.
