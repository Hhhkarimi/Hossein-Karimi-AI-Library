# Sculpted Storybook — Input Examples

These examples demonstrate intake and art direction. They are not claims of generated or visually verified images.

All instructions are English. User-facing input fields and selectable options are bilingual Persian–English.

## 1. Transform a Portrait

Attach a subject photograph. A separate style reference is optional.

```text
روش / Method: Transform photo
تصاویر و نقش‌ها / Images and roles: Image 1 = subject; Image 2, if attached = style only
ویژگی‌های ثابت / Locked features: Recognizable facial structure, apparent age, skin tone, hairstyle, glasses, and clothing colors
تغییرات مطلوب / Requested changes: Replace photographic textures with matte sculptural surfaces; simplify clothing into broad angular folds
شدت سبک / Style intensity: 4
وفاداری به مرجع / Reference fidelity: 5
اغراق تناسبات / Proportion exaggeration: 2
حس‌وحال / Mood: Thoughtful and composed
پس‌زمینه / Background: Simple cream studio
کادر و زاویه / Framing and angle: Waist-up, three-quarter view
نسبت تصویر / Aspect ratio: 4:5
نوع خروجی / Output mode: Generate image
سایر تنظیمات / Remaining settings: Defaults
```

Expected behavior: preserve visible identity cues while changing geometry, texture, and lighting. Use softer facial modeling than clothing. Do not import a style reference's head covering, props, body shape, or tired expression. Do not invent a full-body identity match from a cropped portrait.

## 2. Transform an Animal Photo

```text
روش / Method: Transform photo
تصاویر و نقش‌ها / Images and roles: Image 1 = subject photo of a cat
ویژگی‌های ثابت / Locked features: Species, coat markings, eye color, ear shape, and curled tail
تغییرات مطلوب / Requested changes: Simplify fur into broad matte volumes; subtly elongate the silhouette
حس‌وحال / Mood: Curious and alert
شدت سبک / Style intensity: Balanced
اغراق تناسبات / Proportion exaggeration: 2
پس‌زمینه / Background: Minimal geometric teal form in a cream studio
نسبت تصویر / Aspect ratio: 1:1
نوع خروجی / Output mode: Generate image
سایر تنظیمات / Remaining settings: Defaults
```

Expected behavior: produce a recognizable stylized cat, using the uploaded coat pattern. No clothing, human hands, human face, bipedal stance, lettering, or promotional composition.

## 3. Create an Environment from Text

```text
روش / Method: Create from text
موضوع یا صحنه / Subject or scene: A quiet hillside village after rain, narrow stone stairs, three tall cypress trees, and a small arched doorway catching warm evening light
ویژگی‌های ثابت / Locked features: Stairway leading toward the doorway; exactly three cypress trees
شدت سبک / Style intensity: 4
چندوجهی‌بودن / Faceting: 4
اغراق تناسبات / Proportion exaggeration: 3
پالت / Palette: Warm limestone, muted teal foliage, ochre light, charcoal shadows
حس‌وحال / Mood: Quiet and inviting
پس‌زمینه / Background: Narrative environment
جزئیات محیط / Environment detail: Medium
کادر و زاویه / Framing and angle: Wide three-quarter scene
نسبت تصویر / Aspect ratio: 16:9
نوع خروجی / Output mode: Generate image
عناصر همراه / Supporting elements: No people or animals
سایر تنظیمات / Remaining settings: Defaults
```

Expected behavior: apply faceting consistently to buildings, stairs, trees, and terrain; preserve coherent perspective. Express elongation through architectural and tree silhouettes. Do not insert the reference character or leave a space for a title.

## 4. Visualize an Abstract Concept

```text
روش / Method: Create from text
موضوع یا صحنه / Subject or scene: The feeling of slowly recovering creative energy, represented by a small folded-paper seed opening into a sculptural tree with a few warm ochre leaves
ویژگی‌های ثابت / Locked features: One seed, one tree, one continuous transformation
شدت سبک / Style intensity: 4
جنس / Material: Matte sculpted paper
حس‌وحال / Mood: Hopeful and gentle
پس‌زمینه / Background: Minimal cream studio
نور / Lighting: Soft morning light
نسبت تصویر / Aspect ratio: 4:5
نوع خروجی / Output mode: Prompt only
عناصر همراه / Supporting elements: None
سایر تنظیمات / Remaining settings: Defaults
```

Expected behavior: communicate the metaphor through form, growth, color, and light. Return one resolved rendering prompt and an Avoid section. No explanatory words, diagram, human character, or unfinished placeholders.

## 5. Follow-up Revision

```text
اصلاح درخواستی / Requested revision: Keep the subject, identity, framing, materials, and reference roles unchanged. Reduce proportion exaggeration to 1 and use cooler lighting.
نوع خروجی / Output mode: Generate image
```

Expected behavior: update only exaggeration and lighting; preserve prior established decisions. Use the previous generated image as an editing reference when available.

## 6. Missing Image or Ambiguous References

```text
روش / Method: Multiple references
تصاویر و نقش‌ها / Images and roles: Two attached images; roles not specified
موضوع یا صحنه / Subject or scene: Transform this using the other image
نوع خروجی / Output mode: Generate image
```

Expected input question:

> نقش تصاویر / Image roles: کدام تصویر سوژه است و کدام فقط مرجع سبک؟ / Which image is the subject, and which is the style reference?

If an essential attachment is unavailable, request the missing image instead of claiming to have inspected it.

## 7. Transparency Request

```text
روش / Method: Create from text
موضوع یا صحنه / Subject or scene: A small ceramic teapot with a curved handle and short spout
پس‌زمینه / Background: Transparent
شدت سبک / Style intensity: Bold
اغراق تناسبات / Proportion exaggeration: 2
نوع خروجی / Output mode: Generate image
سایر تنظیمات / Remaining settings: Defaults
```

Expected behavior: use actual transparency when supported. Never paint a checkerboard. If unsupported, briefly explain the limitation and ask a bilingual background-preference question.

## Manual Acceptance Checks

- A usable brief proceeds without a repeated questionnaire.
- An absent subject triggers a short bilingual intake.
- An uploaded image is assigned a clear role.
- A style reference does not overwrite the requested subject.
- People retain requested identity cues; animals and objects gain no unrequested human features.
- Environments use the style throughout the scene.
- Prompt-only output contains no unresolved variables or interview instructions.
- Image-generation output contains no added captions or prose, except a necessary capability limitation.
- No output image contains text, pseudo-text, logos, branding, or poster layout.
- A follow-up changes only the requested settings.

These are review criteria, not automated tests or a guarantee of image-model behavior.
