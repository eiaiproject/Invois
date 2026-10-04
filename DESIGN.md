# Invois Design Direction

Direction name: **Olive Minimal**, a calm document tool. Invois should feel like
a well-kept paper ledger: warm neutrals, one confident olive action color, and
nothing competing with the numbers on the page.

> Status: drafted by the coding agent from the shipped implementation
> (`src/styles/app.css`, `src/styles/landing.css`) so the direction is written
> down and reviewable. The owner should confirm or amend it; the dial values
> below describe what is already built, not a new proposal.

## Dials

Dial: ENERGY 2 / RHYTHM 2 / MOTION 2 (level scale: 1 calm, 2 balanced, 3 bold)

| Dial | Value | Reason |
|------|-------|--------|
| ENERGY | 2 | The landing opens with a real example invoice and two direct actions; inside the app, surfaces stay quiet so amounts and statuses lead. |
| RHYTHM | 2 | One type scale and spacing system, with section-level breaks: hero, three-step workflow, proof ledger, FAQ, closing call to action. |
| MOTION | 2 | Scroll-triggered reveals and state transitions confirm reading and actions; no loops, no parallax, all reduced-motion aware. |

## Palette

Two core colors and one accent, expressed as CSS custom properties in
`src/styles/app.css`. Both themes are first-class; `lib/theme.ts` resolves
system, light, or dark and writes `data-theme` on `<html>`.

| Token | Light | Dark | Used for |
|-------|-------|------|----------|
| `--color-primary` | `#596949` olive | `#8B9E78` | Primary actions, links, active nav |
| `--color-accent` | `#7A5F3A` clay | `#C4A67E` | Secondary emphasis (greeting, sample notice) |
| `--color-bg` / `--color-surface` | `#F7F6F0` / `#FFFFFF` | `#11120E` / `#1A1B16` | Page and card backgrounds |
| `--color-text` / `--color-text-muted` | `#28251F` / `#595449` | `#EDEBE4` / `#A09B8E` | Body text and supporting text |
| `--color-success` / `--color-danger` | `#3F6B49` / `#7A3F33` | `#7FB884` / `#D4856E` | Paid and destructive states |
| `--color-border-control` | `#857F6E` | `#6A6C5D` | Boundaries of interactive controls (inputs, chips, clickable cards) |
| `--color-on-primary` | `#FFFFFF` | `#11120E` | Text on filled primary surfaces |

Reasons:

- **Olive over blue:** keeps the "ledger" association and avoids the default
  dashboard palette every finance tool ships.
- **Ink-on-olive in dark mode:** white on the lighter dark-mode olive only
  reaches 2.89:1, so filled buttons flip to dark ink (6.5:1).
- **Control borders are darker than containers:** interactive boundaries meet
  WCAG 1.4.11 (3:1); card outlines stay decorative hairlines so the UI does not
  turn into a grid of boxes.
- **The PDF preview is fixed "paper":** `.pdf-page` re-declares the light
  tokens locally, because the preview must match the exported PDF in both themes.

## Typography

- `--font-sans: "Plus Jakarta Sans"` for everything. Its geometric forms read
  clean at small sizes and give the numbers a calm, non-shouty voice.
- `--font-mono` is reserved for document numbers and currency (`tabular-nums`),
  so digits align column to column. The stack starts at `ui-monospace`; the
  earlier `"Plus Jakarta Sans Mono"` entry was dropped because no such webfont
  exists.
- Sizes: 15px body, 11-13px supporting text, `clamp()` headings. Headings use
  `text-wrap: balance`, paragraphs use `text-wrap: pretty`.

## Shape, depth, motion

- Radii: 8px controls, 12px inputs/buttons, 18px cards, 24px sheets, pills for
  chips and toasts. One step per hierarchy level, never mixed within a level.
- Shadows are soft and low-contrast; elevation appears on hover and for floating
  layers only. No glows except the primary landing CTA on hover.
- Motion tokens: 140ms / 220ms / 380ms with `cubic-bezier(0.16, 1, 0.3, 1)`.
  `prefers-reduced-motion` disables entrance animations and hover transforms.
- The landing header is the only glass surface (one blur), and it exists to keep
  nav readable while scrolling over content.

## Accessibility targets

- Text contrast: WCAG AA (4.5:1 normal, 3:1 large) in both themes.
- Interactive control boundaries: 3:1 (WCAG 1.4.11, non-text contrast).
- Touch targets: 44x44px minimum, including icon-only buttons.
- Every async state announces itself: route and page loaders use
  `role="status"`, toasts use `aria-live="polite"`.
- Dialogs close with Escape; focus rings are 2px and visible on keyboard focus.

## Content rules

- No em dashes in UI copy. Use commas, colons, or parentheses.
- Buttons name the action ("Create Invoice", "Add Client", "Save Settings").
- Seeded demo records are ID-prefixed (`sample-`) and labeled by a notice with a
  one-click removal; nothing fabricated may look like real user data.
- Empty, loading, and error states always offer the next action.

## Brand assets

`public/favicon.svg`, `public/apple-touch-icon.png`, and `public/og-image.png`
are the current brand marks used by the app and SEO metadata. They predate this
document and still need explicit owner approval (R-23); replace or confirm them
in a dedicated pass rather than ad hoc edits.

## Non-goals

- No gradient hero, no glassmorphism beyond the landing header, no decorative
  animation loops, no fabricated metrics or testimonials.
- Not an accounting suite: the UI presents one document trail (invoice to
  receipt), not dashboards of charts.
