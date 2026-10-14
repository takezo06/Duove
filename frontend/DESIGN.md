# Duove design system

The reference for every UI change. Paths are relative to `frontend/`.

**Feel:** dark, warm, personal. A shared journal for two people, not a SaaS dashboard.

**Reference pages** (follow these when this doc is silent): `components/BentoGrid.tsx` (Dashboard), `pages/Cravings.tsx`, `pages/Partner.tsx`, `pages/Notifications.tsx`, `pages/QAHistory.tsx`, `pages/LoveLetters.tsx` (desk: open letter + recent letters), `pages/AllLoveLetters.tsx` (envelope collection, lazy loading), `components/Sidebar.tsx`. Everything listed under [Known drift](#known-drift) is older code. Do not copy from it.

**Deliberate choices.** These are intentional. Do not "fix" them, even if a generic design skill suggests it:
- **Dark-only.** No light theme.
- **System sans only.** A serif experiment was rejected. No custom fonts, and no Geist or Inter (the `@fontsource-variable/geist` dependency is unused).
- **One accent, rose.** No second brand color.
- **Expressive, never loud.** When a page should feel special (the love letters), the feeling comes from real-object details (stamps, wax seals, signatures, envelopes), color blocks that mean something (the rose "Your turn" card, wine envelopes for the partner's letters) and live, personal copy. It never comes from bigger type: every size, weight and spacing stays on the scales in sections 4 and 5. Inconsistent sizes are what make a page look generated.
- **Tablets are first-class.** Layouts are designed for iPad portrait (820px) and landscape (1180px) as well as phone and desktop: use the extra width (a second column, more grid columns), don't just stretch a phone layout.

---

## 1. Primitives (never re-type them)

All shared styles live in `src/components/Card.tsx`. Import them and never copy their class strings.

| Export | What it is | Use for |
|---|---|---|
| `surface` | `bg-neutral-900 rounded-2xl border border-neutral-800` | Every card, list row card, skeleton block, empty-state box |
| `inset` | `rounded-xl bg-neutral-800/40 border border-neutral-800 px-4 py-3` | A box inside a card (sub-stat, answer bubble) |
| `focusRing` | 2px `rose-400/50` ring, offset 2, offset color `neutral-950` | Every interactive element (`Sidebar.tsx` uses a `neutral-900` offset because it sits on the sidebar) |
| `primaryButton` | Rose fill, `px-5 py-3 rounded-xl font-medium`, rose glow shadow | The one main action of a view |
| `secondaryButton` | `neutral-800` fill, `neutral-700` border, `px-4 py-2.5 rounded-xl text-sm font-medium` | Every other button |
| `inverseButton` | White fill, `text-rose-700`, white focus ring offset on `rose-600` | The primary action when it sits on a rose block (the letters "Your turn" card) |
| `Seal` | 32px initial circle, rose for the partner, neutral for you | The sender on a letter row or envelope |
| `iconClass` | `w-4 h-4 text-rose-400` | The icon in a card header or stat label |
| `Badge` | Status pill, `tone` = `rose` / `emerald` / `neutral` | Status only (see section 3) |
| `CardHeader` | Rose icon + `text-sm text-neutral-400` label, badge on the right | The top line of every summary card |
| `Avatar` | 64px circle with `ring-4 ring-neutral-900`; `dashed` = missing partner | Profile pictures |
| `CategoryPill` | Craving category pill (icon + label in the category tint) | Wherever a craving's category appears |
| `iconButton` | 40px square, `rounded-lg`, `neutral-400` icon that turns white on a `neutral-800` hover | Every icon-only button (add an `aria-label`) |
| `toggleRow` + `toggleRowOn` / `toggleRowOff` | A full-width row button, `p-3 md:p-4 rounded-xl`. On: `bg-rose-500/10 border-rose-400/20`. Off: transparent border, `neutral-800/60` fill and `neutral-700` border on hover | Rows you tap to open and tap again to close (`aria-pressed`). The heading inside turns `group-hover:text-rose-400` while off, and the on row also shows a `Badge` so state is never color alone |
| `field` | The input style in section 7 | Every text input and textarea |
| `Chip` | A `<button>` chip: `active`, optional `cat` for the category tint | Filters (`aria-pressed`) and single choice (`role="radio"`) |
| `Modal` | Overlay, panel, close button, Escape and overlay click to close, focus moved in on open and back on close. `wide` gives `max-w-xl` | Every dialog |

Helpers:
- `src/lib/plural.ts`: `plural(3, 'day')` gives "3 days". Never write `day(s)`.
- `src/lib/relationshipYear.ts`: all anniversary, monthsary and day-count math. Verify changes with `node frontend/scripts/relationshipYear.check.ts` (from the repo root).
- `src/lib/cravingCategories.ts`: `CATEGORIES` and `categoryFor()` give each category's icon, `iconColor` and `tint`.
- `src/lib/apiError.ts`: `apiError(err, fallback)` returns the backend's `{ error }` message or the fallback.
- `src/lib/groupByDate.ts`: `groupByDate(items, { month: 'long', year: 'numeric' })` splits newest-first items under date headings.
- `src/lib/when.ts`: `when(iso)` gives relative times ("3h ago", "Yesterday", "Mon", "3 Mar").
- `components/cycle/constants.ts`: `phaseColors` for cycle phases.

**Adding a new shared style:** add it to `Card.tsx` (styles and components) or `src/lib/` (logic) the first time a second file needs it, then import it everywhere. `Card.tsx` may only export strings and components (fast refresh), so a style that takes arguments becomes a component, like `Chip`.

**Do not use** `src/components/ui/*` (unused shadcn leftovers), the shadcn color tokens in `tailwind.config.js` (`bg-primary`, `border-border`, `bg-card` and so on; the CSS variables behind them are not defined, so they render broken), or `src/App.css` (unused Vite template).

---

## 2. Color

### Neutral ramp (Tailwind `neutral`)

| Token | Role |
|---|---|
| `neutral-950` | Page background (`ProtectedLayout`, auth pages), focus-ring offset |
| `neutral-900` | Cards (`surface`), sidebar, modal panels, the ring around avatars |
| `neutral-900/50` | Quiet footer strip (Partner "joined Duove" footer) |
| `neutral-800` | Card borders, dividers (`border-t`), selected nav item, progress-bar track, secondary button fill, placeholder avatar fill |
| `neutral-800/40` | `inset` box fill |
| `neutral-800/50` | Input fill, list-row hover inside a grouped card |
| `neutral-800/60` | Nav item hover |
| `neutral-700` | Input border, secondary button border and hover fill, hover border on list-row cards, empty-avatar dashed border |
| `neutral-600` | Unchecked circle outline, upcoming timeline dots |

### Text

| Class | Use |
|---|---|
| `text-white` | Headings, values, numbers, primary content |
| `text-neutral-200` | Body text, "You", secondary-button label |
| `text-neutral-300` | Quiet body (an empty line inside a tile, a big-number unit like "days") |
| `text-neutral-400` | Card labels, subtitles, meta, timestamps, captions, inactive nav, form labels |
| `text-neutral-500` | **Only** placeholders, decorative icons and struck-through finished items. Never for text people need to read: on `neutral-900` it is about 3.9:1 and fails WCAG AA. |

`gray`, `zinc`, `slate` and `stone` are never used. Stay on `neutral`.

### Rose (the one accent)

Use rose for meaning, never decoration. One rose-filled primary action per view.

| Class | Use |
|---|---|
| `bg-rose-500` / `hover:bg-rose-600` | Primary button, progress fill, a checked checkbox, unread-count dot, the confirm button of a destructive action |
| `text-rose-400` | Card-header icons, the **partner's name**, the active nav icon, link hover, "needs you" badge text, highlights like "Happy anniversary" |
| `hover:text-rose-300` | Hover on links that are already rose |
| `text-rose-300` | Error text |
| `bg-rose-500/10` + `border-rose-400/20` | Rose badge and error box |
| `hover:border-rose-400/30` | Hover border on a whole-card `Link` |
| `ring-rose-400/50` | Focus ring, input focus |
| `ring-2 ring-rose-400 ring-offset-2 ring-offset-neutral-950` | A temporarily highlighted item (deep link from a notification) |
| `bg-rose-200` | Passed monthsary dots on the year track |

### Other colors (meaning only)

- **Emerald = done or connected:** `text-emerald-400` check icons and `Badge tone="emerald"` ("Connected", "Both answered", "All caught up").
- **Craving categories:** Food is amber, Activity is sky, Emotional is rose, Material is violet, Other is neutral. Always read them from `cravingCategories.ts` (`iconColor` for icons, `tint` for pills and selected chips). A category shows its color wherever it appears, and these colors mean nothing else.
- **Cycle phases:** menstrual is `red-500`, follicular `teal-300`, fertile `rose-300`, luteal `purple-300`. Always read them from `phaseColors`.
- **Destructive actions use rose, not red.** The confirm button is a rose fill (see Cravings Delete/Keep). `red-*` belongs to the menstrual phase only.

### Banned

Gradients of any kind, including gradient text with `bg-clip-text`. Blurred glow blobs, glassmorphism and `backdrop-blur`. Rainbow or decorative color with no meaning. `indigo`, `blue`, `pink` or `purple` as accents.

---

## 3. Status badges (`Badge`)

| Tone | Means | Examples |
|---|---|---|
| `rose` | Needs you now | "Your turn", "3 open", "2 new", "Period soon", "in 5 days" (7 days or fewer) |
| `emerald` | Done or connected | "Both answered", "Connected", "All caught up" |
| `neutral` | Information | "Day 14", "Month 7 of 12", "Waiting on Mika", "in 23 days" |

Badge text is sentence case, short, live (a count or a countdown), and never truncated (`whitespace-nowrap`).

---

## 4. Typography

**Font:** the Tailwind default system sans stack. `font-mono` only for invite codes (`font-mono tracking-widest`). No `font-serif`.

| Role | Classes |
|---|---|
| Page title (h1, header card) | `text-2xl md:text-3xl font-bold text-white` |
| Centered state title (not paired, error, 404) | `text-2xl font-bold text-white mb-2` |
| Hero number (Together counter) | `text-4xl md:text-5xl font-bold text-white tabular-nums`; unit in `text-2xl md:text-3xl font-semibold text-neutral-300` |
| Stat value | `text-2xl font-bold text-white tabular-nums` (Partner activity: `text-2xl md:text-3xl`) |
| Content headline in a card (today's question, letter heading, phase, quote) | `text-lg font-semibold text-white leading-snug`, plus `line-clamp-2` or `line-clamp-3` in previews. An open letter's heading uses the modal title size (`text-xl font-bold`) |
| Card label / stat label | `text-sm text-neutral-400` beside a rose `iconClass` icon (`CardHeader`) |
| Page subtitle (title-only header) | `text-neutral-400 mt-1` (base size) |
| Meta line under a title (date, "Paired on …") | `text-sm text-neutral-400 mt-1` |
| Body | `text-neutral-200` or `text-white` (base) |
| Inline emphasized value | `text-white font-medium tabular-nums` |
| Partner name inline | `text-rose-400 font-semibold` (`font-medium` inside small meta rows) |
| List section heading | `flex items-baseline justify-between text-sm px-1 mb-2`: label in `font-semibold text-white`, count in `text-neutral-400` |
| Caption, small meta | `text-xs text-neutral-400` |
| Form label | `block text-sm text-neutral-400 mb-2` |

**Weights:** `font-bold` for titles and numbers, `font-semibold` for content headlines and names, `font-medium` for buttons, badges and nav, regular for body. No `font-light` or `font-thin`, and never `font-medium` as the heaviest weight on a page.

**Numbers:** every count or value gets `tabular-nums`. Counts use `toLocaleString()`. Words with counts use `plural()`.

**Casing:** sentence case for titles, buttons, badges and labels ("Save changes", "Add a craving"). Nav labels are feature names and keep their current casing. No uppercase tracked eyebrow labels.

---

## 5. Spacing and layout

### Shell

- `ProtectedLayout`: `flex h-screen bg-neutral-950`, sidebar, then `<main className="flex-1 overflow-y-auto p-4 md:p-6">`.
- **Pages add no outer padding** (no `px-4 py-8` on the page root), because `main` already provides it.

### Page

| Element | Classes |
|---|---|
| Page root | `max-w-4xl mx-auto space-y-6` (Dashboard and both love-letter pages: `max-w-6xl`) |
| Card grids | `grid md:grid-cols-2 gap-4 md:gap-6` (3-up stats: `md:grid-cols-3`; Dashboard: `grid-cols-1 md:grid-cols-2 xl:grid-cols-4`; envelopes: `grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6`) |
| Dense number row (3 small stats) | `grid grid-cols-3 gap-3 md:gap-6` |

### Card padding

| Card | Padding |
|---|---|
| Header card / hero card | `p-6 md:p-8` |
| Summary tile, stat card, form card | `p-6` |
| List-row card | `p-4` |
| Grouped list container | `p-2`, rows `p-3 md:p-4 rounded-xl` |
| History article | `p-5 md:p-6` |
| Empty state inside the list area | `px-6 py-14 text-center` |
| Centered full-page state (not paired, error) | `p-8 md:p-12 text-center` |
| `inset` box | `px-4 py-3` (from the primitive) |

### Rhythm inside cards

- **Divider section** (form or extra content under the header): `mt-6 pt-6 border-t border-neutral-800`.
- **Tile footer action:** `mt-5 pt-4 border-t border-neutral-800`.
- `CardHeader` to content: `mt-4`.
- Title to subtitle: `mt-1`. Stat label to value: `mt-3`. Value to sub: `mt-1`. Sub to badge or progress: `mt-4`.
- Lists: `ul.space-y-3` for row cards, `space-y-2` for compact text lists.
- Inline groups: `gap-2` (chips, icon + text), `gap-3` (buttons side by side), `gap-4`/`gap-5` (avatar pair beside the title).
- Avatar pair: `flex -space-x-4`.

### Header card anatomy (first card on every page)

1. Who it's about: an avatar pair, or the title.
2. `h1` plus a one-line personal subtitle.
3. Secondary action (or status `Badge`) in the top right: `flex flex-col sm:flex-row sm:items-center gap-5` or `flex flex-wrap items-start justify-between gap-3`.
4. Any form goes below a `mt-6 pt-6 border-t` divider, with the submit button after the inputs.

### Alignment

- Stat cards are centered: icon + label, value, sub, then badge or progress (`Stat` in `Partner.tsx`).
- Everything else (content cards, lists, forms, headers) is left-aligned.

---

## 6. Borders, radius and elevation

| Radius | Used on |
|---|---|
| `rounded-2xl` | Cards (`surface`), modal panels, the full-page state card |
| `rounded-xl` | Buttons (primary and secondary), inputs, `inset` boxes, nav items, error boxes, rows inside a grouped card, envelopes |
| `rounded-lg` | Icon buttons, small inline buttons (Delete/Keep), tooltips |
| `rounded-full` | Badges, pills, chips, avatars, progress bars, dots, round checkboxes |
| `rounded` | Only as the focus shape of a bare text link |

Never `rounded-md`, `rounded-sm` or `rounded-3xl`.

- **Borders:** always 1px, in `border-neutral-800` (cards, dividers) or `border-neutral-700` (inputs, controls). Dashed only for the missing-partner avatar. **No one-sided colored borders.**
- **Elevation comes from borders and contrast, not shadows.** Cards have no shadow. The only shadows are the rose glow built into `primaryButton`, `shadow-xl` on the sidebar tooltip, and `shadow-2xl` on a modal panel.

---

## 7. Components

### Buttons

| Kind | Spec |
|---|---|
| Primary | `primaryButton`. One per view, placed after the inputs it submits. Add `w-full` only in narrow cards or forms. |
| Secondary | `secondaryButton` for Cancel, Copy, Try again, Load more, and the header action. |
| Text action | `text-sm font-medium text-neutral-400 hover:text-rose-400 transition rounded ${focusRing}`, plus `ArrowRight w-4 h-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none`. Rose variant for a call to action inside a stat: `text-rose-400 hover:text-rose-300`. |
| Icon button | `iconButton` with a `w-4 h-4` or `w-5 h-5` icon and an `aria-label`. Destructive icon: `hover:text-rose-400`. |
| Inline confirm | Delete: `px-3 py-2 min-h-10 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium`. Keep: same size, `text-neutral-400 hover:text-white`. Never `window.confirm`. |

- **Loading:** `Loader2 w-4 h-4 animate-spin` replaces the leading icon, and the label stays or becomes the "-ing" verb ("Saving..."). Disable the button while busy.
- **Disabled:** comes with the primitives (`disabled:opacity-50 disabled:cursor-not-allowed`).
- **Labels:** say the action ("Add craving", "Send letter", "Connect with your partner"), not "Submit" or "Get started".

### Inputs

```
w-full bg-neutral-800/50 text-white placeholder:text-neutral-500 px-4 py-3 rounded-xl
border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-rose-400/50
focus:border-transparent transition
```

- Date inputs add `[color-scheme:dark]`. Code inputs add `font-mono tracking-widest uppercase` (placeholder back to `font-sans normal-case tracking-normal`).
- Every input has a `<label htmlFor>` (or an `aria-label` when there is no visible label).
- Enter submits single-line forms (wrap them in a `<form>`).
- Use `field` from `Card.tsx`; never re-type it.

### Chips (filters and single choice)

Use `Chip` from `Card.tsx` (`active`, optional `cat`, plus any button props):
- Base: `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm`.
- Inactive: `border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700`.
- Active: the category `tint`, or `bg-neutral-800 border-neutral-700 text-white`.

Single choice uses `role="radiogroup"`/`radio` with `aria-checked`. Filters use `aria-pressed`. Counts inside a chip use `text-neutral-500 tabular-nums`.

### Whole-card links (summary of another page)

`Link` with `group ${surface} p-6 flex flex-col hover:border-rose-400/30 transition ${focusRing}`, `CardHeader` at the top, and a footer action (`mt-5 pt-4 border-t` + label + ArrowRight that turns rose on group hover). The footer label is a specific action: "Open tracker", "Answer now", "Write the first one". See `Tile` in `BentoGrid.tsx`.

### Lists

- **Row cards:** `${surface} p-4 flex items-start gap-4 transition hover:border-neutral-700` inside `ul.space-y-3`.
- **Grouped timeline:** one `${surface} p-2` per day, rows `p-3 md:p-4 rounded-xl hover:bg-neutral-800/50`. The leading icon is a 36px circle (`w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700`) with an optional `w-px bg-neutral-800` thread line.
- **Desk (recent list + open item):** for a page whose job is "what's new" (Love letters). The list comes first: you pick, then read. From `lg` up: `grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] gap-6 items-start`, the turn card and a grouped list of `toggleRow`s on the left, the open item in a `${surface} p-6 md:p-8` card on the right. Below `lg` they stack in that order (`md:grid-cols-2` inside the list on tablets). The newest item from the partner is open by default. Tapping a row opens it (with a `Badge tone="rose"` "Reading"), tapping it again returns to the default, and on narrow screens the card scrolls into view. The list ends with a text action to the full collection. Stats go in the header's meta line as inline values ("30 from Mika · 15 from you"), not as big numbers. See `LoveLetters.tsx`.
- **Lazy-loaded list:** for collections that grow forever (all letters). Year or month section headings over a grid, the next page loading as you near the end. The loading rules are in [section 13](#13-data-loading-and-efficiency). See `AllLoveLetters.tsx`.
- **Meta row:** `mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400`, items separated by `<span aria-hidden>·</span>`, with `<time dateTime title>`.

### Progress

- Track: `h-1.5 rounded-full bg-neutral-800 overflow-hidden`. Fill: `h-full rounded-full bg-rose-500` (or the phase `dot` color).
- Include `role="progressbar"` with `aria-label`, `aria-valuenow`, `aria-valuemin` and `aria-valuemax`.
- The year track on the dashboard is the larger `h-2` version, with monthsary dots and a heart marker.

### Modals

Use `Modal` from `Card.tsx`. It renders the parts below. Pass `wide` (`max-w-xl`) for writing or reading long text.


- **Overlay:** `fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 p-4`. No blur.
- **Panel:** `${surface} shadow-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto`.
- **Close button:** top right, `absolute top-3 right-3 p-2.5 rounded-lg text-neutral-400 hover:text-white ${focusRing}`, `aria-label="Close"`.
- **Title:** `text-xl font-bold text-white`.
- Escape and clicking the overlay close it.

### Envelope (letters collection)

`EnvelopeCard` in `components/love-letters/`. A letter shown as the back of a sealed envelope, `aspect-[3/2]`:
- Body (`rounded-xl`): yours are charcoal (`bg-neutral-900 border-neutral-800`, flap `fill-neutral-800` with `stroke-neutral-700` edges). The partner's are wine (`bg-rose-950 border-rose-900`, flap `fill-rose-900` with `stroke-rose-800`, meta `text-rose-200/80`), so the box shows who wrote what. Hover: `border-rose-400/50`. No shadow, no lift.
- Flap: a triangle over the top 42%.
- Seal: a 32px circle on the flap's tip with `ring-4 ring-neutral-900`, holding the initial of the name the letter was signed with. `bg-rose-500` when the partner sent it, `bg-neutral-700` when you did.
- Address, bottom left: the heading (`font-semibold text-white line-clamp-1`) over a meta row ("From Mika · 14 Oct", plus a music icon when a song is attached).
- Opening it is the one choreographed motion in the app (see section 10).

### Letter sheet (`LetterReader`)

How an open letter reads, on the desk and in the envelope box's modal:
- A postage stamp leads the header: `w-14 h-16 -rotate-3 rounded-lg`, the sender's initial (`text-xl font-bold`, like an avatar initial) over the short date in `text-xs`. `bg-rose-600` with a dashed `outline-white/50` perforation for the partner, `bg-neutral-800` with `outline-neutral-600` for you. The perforation is the one other place dashes are allowed.
- Heading `text-xl font-bold leading-snug`. Body at base size, `leading-relaxed`, the greeting in `text-rose-400 font-semibold`, and the signature right-aligned in `font-semibold text-white` under a `w-10 h-px bg-rose-400/60` rule. Sections inside follow the normal `mt-6 pt-6 border-t` rhythm.
- The letter is personal through these details, not through bigger type. Keep every size on the scale in section 4.

### Turn card (Love letters desk)

Live state for whose turn it is to write. When the partner wrote last: a solid `rounded-2xl bg-rose-600 p-6 text-white` block ("Your turn", "Mika wrote to you yesterday.") with a `text-sm` label, a `text-lg font-semibold leading-snug` line and a full-width `inverseButton`. This is the view's one rose primary. When you wrote last: a plain `${surface} p-6` "Waiting on Mika" card with a `secondaryButton`. Use `rose-600`, not `rose-500`, under white body text (4.7:1).

### Avatars

`Avatar` (64px). An overlapping pair (you first, partner second) replaces a "hero icon". A missing partner uses `Avatar dashed`. The sidebar account chip is the one small avatar (`w-9 h-9`).

### Navigation (sidebar)

- Item: `h-10 rounded-xl text-sm font-medium`.
- Active: `bg-neutral-800 text-white`, rose icon, `aria-current="page"`.
- Inactive: `text-neutral-400 hover:text-white hover:bg-neutral-800/60`.
- Icons are `w-5 h-5`.
- Unread count: a `bg-rose-500` pill (`9+` cap), or a dot when collapsed.
- Below 768px the sidebar is a 64px icon rail with tooltips.

---

## 8. States

| State | Pattern |
|---|---|
| **Loading** | Skeleton blocks shaped like the final layout: `${surface} h-* animate-pulse` inside the same page root with `aria-busy="true"`. No "Loading..." text and no spinners for whole pages. |
| **Empty** | Says what to do next and has the button to do it. Inside the header card: `mt-6 pt-6 border-t` + a `text-neutral-200` line + `text-sm text-neutral-400` hint + a primary (and optional secondary) button. In the list area: a `${surface} px-6 py-14 text-center` box with a `text-lg font-semibold` line. Name the partner ("Mika will see it right away"). |
| **Not paired** | A centered `${surface} p-8 md:p-12` card: avatar pair (you + `dashed`), a title saying why it needs two, one line, and `primaryButton` "Connect with your partner" leading to `/partner`. |
| **Error (section)** | `<p role="alert" className="text-sm text-rose-300">`, plus `secondaryButton` "Try again" when it can be retried, shown inside the header card under a `border-t` divider. |
| **Error (page banner)** | `<p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">` |
| **Error source** | `apiError(err, "Plain sentence. Try again.")`. Never only `console.error`. |
| **Success** | Prefer visible state change (the item appears, the badge flips to emerald). For a one-off confirmation: `text-sm text-emerald-400`. |
| **Highlight (deep link)** | `ring-2 ring-rose-400 ring-offset-2 ring-offset-neutral-950` for 5 seconds after `scrollIntoView`. |

---

## 9. Icons

- **lucide-react only.** No emoji, no hand-drawn SVG icons, no `Sparkles`.
- **Sizes:** `w-4 h-4` default (buttons, card headers, inline). `w-5 h-5` for nav and the modal close button. `w-3.5 h-3.5` in chips and small links. `w-3 h-3` in `CategoryPill`.
- **Color:** inherit from the text, `text-rose-400` in headers, category `iconColor` for categories, `text-emerald-400` for done.
- Decorative icons get `aria-hidden`. Icon-only buttons get an `aria-label`.
- No icon inside a tinted rounded square as decoration. The avatar pair fills that role.

---

## 10. Motion

- `transition` (Tailwind default, 150ms) on color, border and background changes. That's all most elements need.
- The only movement allowed is the arrow nudge: `group-hover:translate-x-0.5 motion-reduce:transform-none`.
- `animate-pulse` only on skeletons. `animate-spin` only on `Loader2`.
- `fadeIn` (`.animate-fadeIn` in `index.css`) is the only custom keyframe. Any other `animate-*` class must be defined in `index.css` before it is used. `animate-fade-in`, `animate-scale-up`, `animate-ambient-slow`, `animate-ambient-delayed` and `animate-infinite-loading` are currently used but **not defined**, so they do nothing.
- **Envelope open** is the one exception, and only on `EnvelopeCard`. It runs on tap, never on hover: the flap turns up (`rotateX(180deg)`, 200ms), then the letter slides half out (200ms), then the reader opens in a `Modal` at 420ms. Closing plays it back. Under `prefers-reduced-motion` both the motion and the wait are skipped. Don't copy it anywhere else.
- **Banned:** `hover:scale-*`, `-translate-y` lift on hover, `animate-ping`, pulsing dots, long `duration-300+` choreography, glow shadows on hover.

---

## 11. Copy

- **Personal, with names:** "What you and **Mika** are in the mood for", not "Manage your cravings". The partner's name is rose.
- **Live state, not static labels:** countdowns ("in 5 days"), relative times ("2h ago", "Yesterday"), progress, unread counts, "Your turn".
- **Dates:** `toLocaleDateString(undefined, …)`. Short is `{ day: 'numeric', month: 'short' }`. Long is `{ day: 'numeric', month: 'long', year: 'numeric' }`.
- **Separators:** `·` (middle dot) between meta items. **No em dashes** in UI copy.
- **No machine strings:** never show "588.21 days (588d, 5h)". Show "1 year, 7 months".
- **No filler** ("seamlessly", "dynamic", "elevate", "unlock"). No emoji. Short sentences.
- **Errors:** what happened plus what to do. "Your letter didn't send. Try again."

---

## 12. Accessibility and responsive

- `focusRing` on every interactive element. `aria-label` on icon-only buttons. `aria-hidden` on decorative icons. `aria-current="page"` on the active nav item. Every input is labelled. Errors use `role="alert"`.
- Tap targets are at least 40px (`h-10`, `w-10`, or `p-2.5` around a 20px icon).
- **Tap first, hover second.** Everything a hover shows must also work by tap, so hovers can be generous with color but never carry meaning alone. `tailwind.config.js` sets `future.hoverOnlyWhenSupported`, so `hover:` only applies on devices with a real pointer and a tap never leaves a hover style stuck on a phone.
- **Breakpoints:** `sm` (640) turns stacked header rows into rows. `md` (768) brings 2-column grids, larger padding, and the expanded sidebar (256px, so iPad portrait leaves about 516px of content). `lg` (1024) brings side-by-side layouts (the letters desk) and 3-column collections, which is iPad landscape. `xl` (1280) gives 4-column grids (dashboard, envelopes).
- Check every change at **390px** and **1366px** (`npm run preview:mock`, one screenshot each). No horizontal scroll at 390px. Check iPad portrait (820) and landscape (1180) with `playwright-cli run-code` (column counts, overflow) instead of extra screenshots.

---

## 13. Data loading and efficiency

Load what the view shows, nothing more, and never let a nice-to-have block the page.

### How much to fetch

- **Summary views fetch a small `limit`.** The dashboard tile asks for 1 letter and the letters desk for 6. A summary page never downloads a whole history "just in case"; it links to the collection instead.
- **Collections page and lazy-load.** Never fetch an unbounded list. The letters collection loads 30, then 30 more as you scroll (below).
- **Deep links look locally first.** A notification's `highlightId` is looked up in what's already loaded, and only fetched on its own (`?id=`) when it isn't there.

### Lazy loading (infinite lists)

- **Page size 30, newest first, cursor not offset.** Ask for the next page with `before` = the `created_at` of the oldest item on screen. An offset would skip or repeat items when something new arrives while you scroll.
- **`hasMore` is `page.length === PAGE`.** At worst that costs one extra empty request at the very end, which is cheaper than a count query.
- **Trigger:** an `IntersectionObserver` on a sentinel after the list, `root: el.closest('main')` (the layout's `main` is the scroller, so a viewport root would be clipped by it) and `rootMargin: '0px 0px 600px 0px'`, so the next page arrives before the end is visible.
- **Re-observe after every page.** The observer effect depends on the load function, which changes with the list, so it re-checks after each page and keeps filling a tall screen until it can scroll.
- **One request at a time:** a `useRef` busy flag, not state, guards the load function.
- **Stop on error.** Don't observe while a page has failed. Show the `role="alert"` message and turn the button into "Try again".
- **Always a visible fallback:** the sentinel holds a `secondaryButton` ("Load older letters") for keyboard users and if the observer never fires. While loading, `Loader2` and "Loading...".
- **Say when it's done:** one `text-sm text-neutral-400 text-center` line, ideally with something real ("That's every letter, back to the first one on 2 November 2025.").
- Grouping (`groupByDate`) runs over everything loaded, so a section heading that spans two pages merges by itself. Don't show per-group counts in a lazy list; they'd be wrong until the last page loads.

### Requests

- **Independent requests go in one `Promise.all`** (relationship, list, profile), never one after another.
- **Nice-to-haves can't fail the page.** Totals from `/relationships/stats` are fetched with `.catch(() => null)`, and the UI simply hides what didn't arrive.
- **Fetch in the effect, retry with a counter.** Write the async loader inside `useEffect` and re-run it by bumping an `attempt` state from the "Try again" button (this keeps the `set-state-in-effect` lint rule quiet).
- **Use what a write returns.** After a POST, put the returned row into local state (prepend it, select it) instead of refetching the list.
- **Pass down what the page already knows.** Modals get names and ids as props (`SendLetterModal` gets `myName` and `partnerName`) instead of fetching them again.
- **Third-party embeds load lazily:** Spotify iframes get `loading="lazy"`.

### Backend and mock contract

- List endpoints take a capped `limit` and an optional `before` cursor, validate the cursor (400 on garbage) and keep returning a plain array, so older callers don't break.
- After changing an edge function, deploy it (`supabase functions deploy <name>`) before shipping a frontend that depends on it. A frontend that sends `before` to an old function gets the first page again and shows duplicates.
- `preview/mocks/axios.ts` honors the same params as the real function (`limit`, `before`, `id`) and adds a short delay on later pages, so loading states can be seen in the preview. Mock data should be big enough to exercise paging (the default scenario has 45 letters) and should agree with itself (mock stats count the mock letters).

### Perceived speed

- Skeletons shaped like the final layout (section 8). The envelope collection uses `EnvelopeSkeleton`.
- Timed choreography checks `prefers-reduced-motion` and skips the wait too, not just the motion (the envelope opens the letter at once).

---

## Known drift

This is older code that breaks the rules above. Fix it when you touch the file, and remove the line here once it's fixed.

| File | Problem | Fix |
|---|---|---|
| `layouts/ProtectedLayout.tsx` (loader) | Gradients, gradient text, blurred glow, `animate-ping`, undefined `animate-fade-in` / `animate-infinite-loading`, `tracking-wider` | Plain `neutral-950` screen with the logo and a skeleton or simple spinner |
| `components/qa/QACategoryModal.tsx` | `backdrop-blur` overlay | `Modal` |
| `pages/Profile.tsx` + `components/profile/*` | Icon-in-square heading, `red-*` danger buttons, hand-typed buttons, `text-neutral-500` text, unlabelled icon buttons, page `px-4 py-8`, `max-w-2xl` | Header card with `Avatar`, rose destructive buttons with inline confirm, primitives |
| `pages/QA.tsx` + `components/qa/*` | `Sparkles`, `max-w-lg` page, hand-typed buttons, `rounded` skeleton bars | `max-w-4xl` page with a header card, primitives |
| `pages/CycleTracker.tsx` + `components/cycle/*` | `Sparkles` tip, blur in `CycleCircle`, hand-typed buttons, em dashes in `StatsCards` | Primitives, `CardHeader`, no em dashes |
| `pages/CycleLog.tsx`, `pages/CycleAnalytics.tsx` | `red-*` error box, `max-w-2xl`, page padding, em dashes | Error-box spec, `max-w-4xl` |
| `pages/NotFound.tsx` | Page padding, icon-in-square, `shadow-xl` card, hand-typed primary | Centered state card spec, primitives |
| `pages/Login.tsx`, `pages/Signup.tsx` | `rounded-lg` inputs and buttons, hand-typed primary, logo in a tinted square | Input and button spec (auth pages keep their centered `max-w-md` layout) |
| `pages/Cravings.tsx` | List headings use `mb-3` without the white label. Delete/Keep buttons are 28px tall. The trash button is 32px. | Section-heading spec, inline-confirm and icon-button sizes |
| `components/Sidebar.tsx` | Collapse and sign-out buttons are 32 to 36px | `w-10 h-10` |
