# Input contract — interactive image carousel

## Required or inferable

| Field | Type | Default | Interaction rule |
|---|---|---|---|
| source | text/file/url | required | Reuse attached/pasted source; never ask twice. |
| language | string | infer | `fa` when user/source is Persian. |
| slide_count | integer | recommend / 6 | If absent, suggest a count based on content. |
| workflow_mode | string | interactive | `interactive` or explicit `express`. |
| palette_preference | object/string | recommend | If absent, propose 3 and recommend 1. |
| style | string | recommend | If absent, propose 3 concrete art directions. |

## Optional identity fields

- `name`
- `role`
- `company`
- `portrait_path`
- `logo_path`
- `handle`

If the user wants personal-brand treatment and `name` or portrait intent is unclear, ask for them in the discovery step.

## Optional strategic fields

- `audience`
- `goal`
- `cta`
- `render_mode`: `art-directed`, `exact-layout`, or `auto`

## Approval gates in interactive mode

1. Visual direction: style/palette choice when not already locked.
2. Content map: slide structure/title confirmation.
3. Cover proof: actual cover image approval.
4. Full render: remaining images generated after cover approval.

The user may bypass gates by explicitly requesting express/no-checkpoint execution.

## Delivery contract

Primary and required deliverable: ordered individual carousel images, preferably PNG at 1080×1350.

Do not produce PDF.
Do not substitute prompts/specs/contact sheets for actual slide images.
