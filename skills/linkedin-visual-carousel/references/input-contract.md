# Input contract

## Required or inferable

| Field | Type | Default | Notes |
|---|---|---|---|
| source | text/file/url | required | Never invent source claims. |
| language | string | infer | `fa` when user/source is Persian. |
| slide_count | integer | 6 | Usually 5–10. |
| palette_preference | object/string | recommend | Accept HEX, color names, brand palette. |
| style | string | executive-tech | Freeform or preset. |

## Optional identity fields

- `name`
- `role`
- `company`
- `portrait_path`
- `logo_path`
- `handle`

## Optional strategic fields

- `audience`
- `goal`
- `cta`
- `approval_mode`: `autopilot` or `review`
- `render_mode`: `art-directed`, `exact-layout`, or `auto`

## Rule

If the user already provided a field, use it without asking again.
