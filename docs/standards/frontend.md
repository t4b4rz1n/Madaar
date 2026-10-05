---
name: heledone-frontend-brand
description: Design, implement, and refine HeleDone frontend screens and brand assets with a warm Persian, southern Iranian coastal identity. Use for HeleDone bilingual Persian/English interfaces and future locale expansion, landing pages, onboarding, home dashboards, Kanban boards, task details, time tracking, HR and payroll interfaces, shared components, CSS tokens, typography, responsive layouts, RTL behavior, illustration direction, and visual polish. Apply to HeleDone work only; follow the project's existing framework and component system.
---

# HeleDone Frontend and Brand

Implement an inviting Persian workspace whose visual identity expresses the team's shared rhythm. Combine southern Iranian warmth with clear information, reliable interaction, and comfortable daily use. Ship Persian and English from the start and make additional locales a configuration-and-translation task. Treat these rules as the default design contract; follow explicit user instructions and existing approved project decisions when they differ.

## 1. Establish the implementation context

1. Read the project's instructions, current theme, locale setup, routes, shared components, package manifest, and relevant screens before changing code.
2. Identify the screen's audience, primary action, data source, available features, and required states in both launch languages. Distinguish shipped functionality from prototypes and roadmap items.
3. Reuse the existing framework, router, component primitives, icon library, and styling conventions. Add a dependency only when the task needs it.
4. Map this skill's semantic tokens into the existing theme. Update shared primitives before introducing local styling exceptions.
5. Implement the requested screen and its meaningful states. Preserve working behavior, permissions, localization, and navigation.
6. Inspect the rendered result at relevant widths with realistic content in both launch languages. Run existing checks appropriate to the actual code change.
7. Report the changed surfaces, important design choices, verification, and remaining limitations concisely.

Proceed with reasonable visual decisions when the brief leaves room for judgment. Keep business-rule changes and unrelated rewrites outside a visual-polish task.

## 2. Preserve the brand

| Element            | Contract                                                                      |
| ------------------ | ----------------------------------------------------------------------------- |
| Persian name       | هله‌دان                                                                       |
| Latin name         | HeleDone; retain heledone where an existing identifier requires it            |
| Primary phrase     | ریتم مشترک تیم                                                                |
| English phrase     | The team's shared rhythm                                                      |
| Launch languages   | Persian and English; retain the Iranian identity in both                      |
| Personality        | Warm, cheerful, collaborative, clear, grounded, dependable                    |
| Cultural direction | Persian and southern Iranian coastal life, especially Bandari warmth          |
| Product purpose    | Help teams coordinate tasks, time, people, knowledge, and organizational work |

Use the musical origin as inspiration for rhythm, repetition, pacing, and shared progress. Express it through spacing, grouped information, illustration, and restrained celebration.

- Preserve the chosen name and approved logo. Reuse supplied wordmarks and variants.
- If no logo asset exists, use a clean text wordmark as a temporary implementation. Treat a new logo as a separate design deliverable.
- Preserve Persian letterforms and joining. Apply no letter spacing to Persian text.
- Convey confidence through readable content, accurate states, and predictable controls.
- Keep ordinary navigation and action labels explicit: tasks, projects, time, requests, payroll, settings.
- Use music metaphors selectively in brand copy and recognition; keep operational language literal.
- Keep audio off by default. Provide a clear opt-in and mute control if audio is requested.

## 3. Adjust brand expression to the surface

| Surface                      | Expression                                                             | Functional priority                                  |
| ---------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| Landing page                 | Expressive coastal illustration, warm composition, generous typography | Explain the product and lead to a real next step     |
| Onboarding                   | Small welcoming vignette and clear progress                            | Reach the first meaningful action                    |
| Employee home                | Compact coastal greeting and a few warm accents                        | Surface today's work and the active timer            |
| Kanban and task detail       | Quiet surfaces, readable cards, limited decorative detail              | Scan, edit, coordinate, and change status            |
| Time and requests            | Minimal ornament and clear state labels                                | Understand entries, approvals, and next actions      |
| Payroll and administration   | Calm surfaces, precise typography, restrained accents                  | Verify figures, periods, permissions, and decisions  |
| Recognition and empty states | Small joyful illustrations or badges                                   | Explain the achievement or help the user get started |

Place cultural detail around content. Keep illustrations out of the reading area of forms, tables, boards, and financial figures.

## 4. Use a specific visual vocabulary

Draw from sea teal, warm ivory, coral, sunlight, coastal balconies and shanasheer latticework, palms, wooden details, simple waves, sails, and the geometry of local woven patterns.

- Choose one dominant illustration idea per composition.
- Use rounded geometric shapes, soft architectural lines, and lightly textured illustration.
- Show contemporary Iranian team life with natural people, clothing, and work situations.
- Keep a visible connection to the product in marketing artwork.
- Use lattice or wave motifs in separators, small corners, illustration frames, or empty states.
- Keep decorative patterns low in contrast and low in density.
- Use gradients sparingly in marketing artwork; keep operational surfaces mostly solid.
- Avoid filling every card with a different pastel, decorative pattern, or illustration.
- Avoid generic purple SaaS gradients, neon glow, excessive glass effects, and unrelated stock imagery.
- Preserve approved illustration style across assets. Use SVG for simple vector ornaments and existing icons; use optimized raster assets for detailed illustrations.
- Use live HTML text for interface copy. Treat image mockups as visual references, never as the implemented interface.

## 5. Centralize semantic color tokens

Use this palette as the starting point. Keep one source of truth and expose semantic names to components.

```css
:root {
  --hd-canvas: #fff8ee;
  --hd-surface: #ffffff;
  --hd-surface-soft: #f0f7f4;
  --hd-ink: #173c46;
  --hd-muted: #52666c;

  --hd-brand: #087f83;
  --hd-brand-hover: #006d73;
  --hd-brand-soft: #e3f3f0;
  --hd-on-brand: #ffffff;

  --hd-coral: #df765b;
  --hd-coral-soft: #fceee7;
  --hd-sun: #f2ba49;
  --hd-sun-soft: #fff3d6;

  --hd-border: #dce6e2;
  --hd-control-border: #738c90;
  --hd-focus: #006d73;

  --hd-success: #23764b;
  --hd-success-soft: #eaf5ed;
  --hd-warning: #895b12;
  --hd-warning-soft: #fff3d6;
  --hd-danger: #b83e3e;
  --hd-danger-soft: #fdecec;
  --hd-info: #22638b;
  --hd-info-soft: #eaf3fa;

  --hd-space-1: 0.25rem;
  --hd-space-2: 0.5rem;
  --hd-space-3: 0.75rem;
  --hd-space-4: 1rem;
  --hd-space-6: 1.5rem;
  --hd-space-8: 2rem;
  --hd-space-12: 3rem;

  --hd-radius-control: 0.625rem;
  --hd-radius-card: 0.875rem;
  --hd-radius-dialog: 1rem;

  --hd-shadow-card: 0 2px 12px rgb(23 60 70 / 5%);
  --hd-shadow-overlay: 0 12px 36px rgb(23 60 70 / 14%);

  --hd-font-fa: "Vazirmatn", system-ui, sans-serif;
  --hd-font-latin: "Vazirmatn", system-ui, sans-serif;
  --hd-font-ui: var(--hd-font-fa);
  --hd-motion-fast: 150ms;
  --hd-motion-base: 200ms;
  --hd-motion-slow: 250ms;
}
```

- Use ivory for the page canvas, white for main surfaces, and petrol for primary text.
- Use teal for primary actions, active navigation, and selected controls.
- Use coral and sunlight mainly for brand decoration and recognition.
- Use petrol text on sunlight when appropriate. Avoid small text on coral; check any proposed pairing.
- Use the subtle border for decorative separation. Use the stronger control border, or an equally accessible treatment, when a boundary identifies an input.
- Pair semantic status color with a visible label or icon. Keep status meanings consistent.
- Check actual foreground/background pairs in default, hover, selected, focus, and error states. White on the default teal is approximately 4.8:1; this does not validate the whole palette.
- Target WCAG 2.2 AA: at least 4.5:1 for ordinary text, 3:1 for qualifying large text, and 3:1 where required for meaningful non-text interface information.
- Preserve an existing approved theme mapping when it already expresses this identity. Add a dark palette only when requested or already supported; review its pairs independently.

## 6. Set readable multilingual typography

Prefer Vazirmatn for Persian unless the project has an approved font. Reuse its Latin glyphs or the approved English face, and review the metrics of both. Resolve the UI font from locale metadata; add suitable script coverage for future languages. Use available, properly licensed local font assets. Configure only the weight ranges the supplied font supports and use font-display: swap.

| Role                  | Starting size                                 | Weight  | Line height                               |
| --------------------- | --------------------------------------------- | ------- | ----------------------------------------- |
| Body and forms        | 16px / 1rem                                   | 400     | Persian 1.65–1.8; English around 1.5–1.65 |
| Dense table and list  | 14–15px                                       | 400–500 | 1.5–1.7                                   |
| Supporting text       | 14px                                          | 400     | 1.6                                       |
| Card or section title | 18–20px                                       | 600–700 | 1.4–1.5                                   |
| Page title            | 24–32px                                       | 700     | 1.35–1.45                                 |
| Marketing hero        | 44–64px on wide screens; scale down on mobile | 700–800 | 1.25–1.4                                  |

Use these sizes as initial specifications and evaluate actual font metrics in each language. Keep essential information legible; reserve smaller text for limited, secondary metadata.

- Use natural line wrapping and adequate vertical space for each script. Keep Persian letter spacing normal; review English metrics separately.
- Use weight and size to establish hierarchy before adding color.
- Avoid justified interface text, narrow line spacing, and decorative fonts in operational content.
- Use a display or calligraphic face only for an explicitly requested, limited marketing treatment.
- Use consistent number formatting and tabular numerals where the font supports them.
- Preserve exact Latin identifiers, code, emails, URLs, and user-entered data.
- Avoid transforming digits in raw values merely to style the display.

## 7. Make localization extensible and direction-aware

Support Persian and English throughout the public site and application from launch. Keep the product's identity consistent in both, and enable future languages without redesigning the component system.

### Locale registry and language switching

Use the existing i18n stack. If none exists, select a framework-compatible solution with message interpolation, pluralization, server rendering where needed, and locale-aware formatting.

Model supported locales as data. Example metadata; adapt it to the existing locale provider:

```js
const localeRegistry = {
  fa: {
    languageTag: "fa-IR",
    direction: "rtl",
    nativeLabel: "فارسی",
    fontToken: "--hd-font-fa",
  },
  en: {
    languageTag: "en",
    direction: "ltr",
    nativeLabel: "English",
    fontToken: "--hd-font-latin",
  },
};
// Resolve a supported locale through the project's locale provider.
// Derive document lang, dir, and the UI font from its registry entry.
```

- Keep language tag, text direction, native label, resources, and script/font support in a central registry.
- Avoid component-level branches that assume every non-Persian language is English or LTR.
- Use explicit supported-locale validation and a documented fallback locale. Prefer Persian as the initial default unless the project defines another policy.
- Persist an explicit user choice through the existing preference mechanism; keep it stable across navigation and reloads.
- Provide an accessible language selector using native names such as فارسی and English; avoid flags as the sole labels.
- Keep the user on the equivalent route and entity when switching. Preserve query/filter state, drafts, authentication, and active timers.
- Derive language and direction before the initial render when the framework supports server rendering; avoid hydration mismatch and direction flashes.
- Localize public page titles, descriptions, navigation, and product copy. Follow the project's locale-aware URL and metadata strategy.

### Translation resources

- Use stable, locale-independent keys and namespaces such as common, navigation, tasks, time, requests, payroll, and marketing.
- Extract headings, labels, placeholders, validation, dialogs, toasts, status labels, accessible names, image descriptions, and empty/error messages.
- Use parameterized full messages and the i18n engine's plural/select handling; avoid concatenating translated sentence fragments.
- Keep domain enums and identifiers independent of translated display labels.
- Keep user-created titles, names, and comments in their original language unless translation is explicitly requested.
- Define fallback behavior and detect missing translations during development. Avoid exposing raw translation keys in production.
- Keep both launch catalogs complete for critical flows. Review semantic key coverage and interpolation parameters; allow locale-specific plural forms.
- Add a language through registry metadata, its catalog, relevant formatting rules, and font coverage. Avoid duplicating components per language.

### Layout and mixed-direction content

Set document lang and dir from the resolved locale: fa-IR/rtl for Persian and en/ltr for English.

- Use logical CSS: margin-inline, padding-inline, inset-inline-start, border-inline-start, and text-align: start.
- Keep DOM order aligned with reading and keyboard order. Avoid blanket row reversal.
- Place primary desktop navigation at inline-start: right in RTL, left in LTR.
- Mirror direction-dependent navigation icons only. Preserve logos, playback symbols, charts, and non-directional icons.
- Isolate emails, task IDs, file names, code, and URLs with bdi or an explicitly LTR element.
- Use dir="auto" for user-generated text of unknown direction; keep code blocks LTR.
- Keep overlays, breadcrumbs, drawer placement, menus, validation icons, and keyboard focus correct in either direction.
- Design for longer translations. Avoid fixed-width labels, forced single-line buttons, and clipping.
- Localize text outside illustration assets so artwork can be reused.

### Formatting and business meaning

- Use the project's formatting layer and Intl-compatible utilities for numbers, dates, times, relative time, and plural-sensitive messages.
- Keep raw amounts, timestamps, IDs, and status values independent of display language.
- Treat language, timezone, display calendar, week start, holiday rules, and currency as separate settings with explicit defaults.
- Support Jalali display where required and the chosen English display calendar. Preserve the same underlying instant or business date when switching.
- Respect the organizational or user timezone policy; changing language must not silently change scheduling or payroll periods.
- Show the currency unit clearly. Switching language changes formatting and labels, not the currency, amount, or rial/toman conversion rule.
- Verify both launch locales and a synthetic future-locale case for text expansion, direction, missing translations, and font fallback.

## 8. Build a coherent layout system

Use a 4px spacing foundation and an 8px rhythm for most layouts. Start with 24–32px desktop content padding and 16px mobile padding.

- Use a desktop sidebar around 240px, an optional collapsed state around 72px, and a top bar around 64px.
- Keep the app canvas warm and the work surfaces quiet.
- Use card radii around 12–16px, control radii around 8–12px, and restrained shadows.
- Keep a page header with title, concise context, and one clear primary action.
- Place filters next to the content they affect. Preserve meaningful filter state through the project's existing navigation behavior.
- Use a consistent component scale rather than increasing padding independently on every screen.
- Bound marketing paragraphs to comfortable reading widths. Let boards and tables use the space their content needs.
- Use min-width: 0 or min-inline-size: 0 where grid and flex children must shrink.
- Keep sticky headers and controls from covering content or keyboard focus.
- Use side panels for contextual task detail when helpful, with a direct route to the same entity.
- Use dialogs for short decisions; prefer a full page or substantial panel for complex editing.

Treat dimensions as starting values. Adapt them to real content and the existing application shell.

## 9. Define component appearance and behavior

| Component          | Appearance                                        | Required behavior                                               |
| ------------------ | ------------------------------------------------- | --------------------------------------------------------------- |
| Primary button     | Teal, white label, compact rounding               | Visible hover, focus, pending, and disabled states              |
| Secondary button   | Quiet surface or outlined treatment               | Clear hierarchy and sufficient boundary contrast                |
| Destructive action | Danger color used deliberately                    | Explain the affected item and use the real confirmation flow    |
| Input or select    | White surface, readable label, defined boundary   | Helper/error association; preserve valid input after failure    |
| Navigation item    | Icon plus label; soft teal selected surface       | Active state and keyboard focus remain distinct                 |
| Card               | White, gentle border, subtle or no shadow         | Reserve strong emphasis for actionable content                  |
| Table              | Quiet header, consistent alignment, readable rows | Sort/filter state, empty/error state, contained overflow        |
| Status badge       | Semantic tint, dark label, optional icon          | Status stays understandable without color                       |
| Avatar             | Consistent shape and size                         | Fallback initials or approved placeholder                       |
| Dialog or drawer   | Calm surface, restrained shadow                   | Focus entry, containment where modal, Escape, focus restoration |
| Toast              | Concise, unobtrusive feedback                     | Use confirmed outcomes; keep actionable errors in context       |
| Empty state        | Small brand illustration and helpful text         | Explain the situation and provide a relevant next action        |

Use an existing icon set consistently, typically at 20–24px with a coherent stroke weight. Keep icon-only controls named accessibly.

Prefer a 44px touch-control target. Distinguish this product recommendation from WCAG 2.2 AA's 24px minimum target requirement and its defined exceptions.

Example CSS; adapt class names and primitives to the project:

```css
.hd-card {
  background: var(--hd-surface);
  border: 1px solid var(--hd-border);
  border-radius: var(--hd-radius-card);
  padding: var(--hd-space-6);
  box-shadow: var(--hd-shadow-card);
}

.hd-button-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--hd-space-2);
  min-block-size: 2.75rem;
  padding-inline: var(--hd-space-4);
  border: 1px solid transparent;
  border-radius: var(--hd-radius-control);
  background: var(--hd-brand);
  color: var(--hd-on-brand);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--hd-motion-fast);
}

.hd-button-primary:hover:not(:disabled) {
  background: var(--hd-brand-hover);
}

.hd-button-primary:focus-visible {
  outline: 3px solid var(--hd-focus);
  outline-offset: 3px;
}

.hd-button-primary:disabled {
  background: var(--hd-border);
  color: var(--hd-muted);
  cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
  .hd-button-primary {
    transition: none;
  }
}
```

Extend this example to the actual component's pending state and every supported variant. Preserve focus visibility and prevent unintended repeat submissions.

## 10. Compose the key screens

### Landing page

- Lead with the brand phrase, a concrete product explanation, a visible product representation, and one primary CTA.
- Use an expressive but controlled coastal scene. Preserve a clear text area and usable contrast.
- Introduce tasks, time, and collaboration through actual available capabilities.
- Show a short, believable workflow: assign work, coordinate, review, and see progress.
- Connect the CTA to the real registration or demo flow.
- Use genuine testimonials and evidence only when provided. Label sample data or demonstrations.
- Describe upcoming modules truthfully. Avoid presenting the roadmap as shipped functionality.

### Home

- Keep the greeting short and the coastal illustration compact.
- Put the next action and today's tasks near the top.
- Make counters navigable to the items behind them.
- Surface the active timer and its associated task.
- Show relevant projects, requests, and team information only when the feature and permission exist.
- Adjust priorities for employee, team lead, HR/finance, and executive views.
- Keep the page composed of a few clear work areas. Avoid turning it into a decorative widget wall.

### Kanban and task detail

- Make title, assignee, due date, and blockers scannable on the card.
- Put secondary information in task detail.
- Provide an explicit status-change control in addition to drag-and-drop.
- Show a placeholder and clear destination feedback during dragging.
- Preserve access to comments, subtasks, attachments, dependencies, and history when available.
- Preserve draft comments on failure. Avoid overwriting the user's text during live updates.
- Offer a mobile list or column selector with the same status actions.
- Do not start a timer implicitly when moving a card unless the product explicitly defines that rule.

### Time, requests, and payroll

- Show the active task, elapsed time, and explicit timer controls consistently across pages.
- Use the project's defined timer policy; prefer one active timer per person as the initial design assumption.
- Distinguish local draft, syncing, server-confirmed save, failed save, and offline state when supported.
- Show each request's current stage, responsible reviewer, next action, and decision reason.
- Show payroll period, components, deductions, net amount, currency, and payment state precisely.
- Keep "payslip issued" separate from "payment completed."
- Keep approval and financial actions aligned with real permissions and confirmed server results.
- Use restrained brand accents and exact language.

### Recognition, knowledge, and analytics

- Use small coastal-inspired badges and restrained celebration for real achievements.
- Explain how points were earned. Keep points, approved rewards, and payable amounts distinct.
- Keep wiki pages and search results readable and content-focused.
- Provide chart titles, time ranges, units, legends, and relevant empty states.
- Represent missing data distinctly from zero. Explain uncertainty in forecasts.
- Use cultural imagery outside the data area; preserve chart meaning and category distinction.

## 11. Design all meaningful states

Provide default, hover, focus-visible, selected, expanded, pending, disabled, empty, error, success, and permission-limited states as appropriate.

- Match loading placeholders to the eventual layout and avoid large content jumps.
- Keep empty states actionable and specific to the user's situation.
- Explain errors near the field or failed action; retain recoverable input.
- Show a success message only for the outcome actually confirmed.
- Offer queued/offline behavior only when implemented. Keep financial approvals truthful during connection failure.
- Expose edit conflicts without silently discarding either contribution.
- Keep notifications relevant, permission-aware, and linked to an actionable destination.
- Avoid revealing restricted payroll, personal, or review content through previews or search results.

## 12. Keep motion purposeful

Use 150–250ms as the starting range for small interaction transitions. Animate opacity or transform where useful, and keep the hierarchy stable.

- Use motion to explain opening, selection, relocation, and confirmed achievement.
- Keep timers and financial values legible and independent of animation.
- Avoid perpetual waves, bouncing controls, auto-playing scenery, and repeated confetti in daily work.
- Respect prefers-reduced-motion in each animated component and illustration.
- Preserve functionality when decorative motion is removed.
- Keep celebration small and dismissible; avoid delaying the next action.

## 13. Write warm and precise localized copy

Keep the skill instructions in English. Provide complete Persian and English UI catalogs from launch. Use short sentences, familiar terms, and respectful direct language in both. Keep the cultural identity consistent while adapting phrasing naturally; load examples through translation keys.

| Context            | Persian                                                        | English                                                       |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------------------- |
| Home greeting      | سلام، روزت بخیر! کارهای امروزت اینجاست.                        | Hello! Here's your work for today.                            |
| Create task        | ایجاد تسک                                                      | Create task                                                   |
| Empty project list | اولین پروژه‌تان را بسازید و کارها را بین اعضای تیم تقسیم کنید. | Create your first project and share the work with your team.  |
| Comment failure    | نظر ارسال نشد. متن شما حفظ شده است؛ دوباره تلاش کنید.          | Your comment wasn't sent. Your text is still here; try again. |
| Request submitted  | درخواست ثبت شد و در انتظار تأیید است.                          | Request submitted. Awaiting approval.                         |
| Payslip issued     | فیش این دوره صادر شد.                                          | This period's payslip has been issued.                        |

Use each example only when the system actually supports and confirms that behavior. Keep legal, financial, HR, and review messages exact. Avoid slogans in errors, exaggerated encouragement, invented dialect, and unexplained terminology.

## 14. Implement responsive and accessible behavior

- Review Persian RTL and English LTR at narrow mobile, tablet, desktop, and wide desktop; start with 360, 768, 1280, and 1440px widths, then include the project's actual breakpoints.
- Collapse desktop navigation without hiding necessary actions.
- Stack home work areas according to priority; keep the active timer reachable.
- Move complex detail editing to a full mobile screen when space requires it.
- Keep horizontal board/table overflow contained and discoverable.
- Support touch and keyboard status changes, editing, navigation, and dialogs.
- Associate localized labels, descriptions, and errors with fields; localize accessible names for icon controls.
- Preserve visible focus, logical focus order, zoom usability, and sufficient contrast.
- Apply live announcements selectively to important outcomes; avoid continuously announcing a ticking timer.
- Keep meaningful images described and purely decorative imagery out of the accessibility tree.

## 15. Keep the implementation maintainable

- Integrate tokens with the project's CSS variables, theme configuration, or existing design system.
- Reuse shared components instead of copying a library template with its default visual identity.
- Keep business data and calculations outside decorative components.
- Bind interactive controls to implemented behavior; mark mock/demo data clearly in prototypes.
- Preserve permission checks and server authority. Treat hidden buttons as presentation, not authorization.
- Optimize illustration dimensions and formats, reserve image space, and defer offscreen decorative assets.
- Prefer local assets where practical; avoid making basic rendering depend on third-party font or image requests.
- Preserve the working application's architecture. Keep visual changes reviewable.
- Add or extend tests for meaningful behavior changes; use existing checks and visual inspection for styling-only changes.

## 16. Complete the visual review

Before claiming completion, verify:

- The screen reads as HeleDone through color, typography, and measured coastal detail.
- The main action and information hierarchy are clear with realistic data.
- Persian RTL, English LTR, mixed-direction identifiers, long labels, and empty values render correctly.
- Switching language preserves the current entity, unsaved input, and active timer; document language and direction update together.
- Both launch catalogs cover user-facing and accessible copy; pluralization and formatting work for zero, one, multiple, and large values.
- A future locale can be registered without scattered two-language conditionals.
- Components use shared semantic tokens and consistent radii, spacing, icons, and state styling.
- Status, permission, offline, and financial messages reflect implemented outcomes.
- Mobile interactions remain complete and touch controls are usable.
- Focus, contrast, reduced motion, and non-drag alternatives have been checked.
- Artwork supports the content and does not dominate daily work.
- Existing checks appropriate to the change pass, or unresolved failures are reported accurately.

Present the implemented result with a short explanation of what changed and how it was verified. State any missing assets or unimplemented states explicitly. Avoid claiming full accessibility compliance from a visual review alone.

## 17. Consult primary implementation references

Use these sources for technical details; keep the brand decisions in this skill as the project defaults.

- Vazirmatn source and license: https://github.com/rastikerdar/vazirmatn
- Internationalized formatting: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl
- HTML direction and mixed text: https://www.w3.org/International/questions/qa-html-dir
- CSS logical properties: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Logical_properties_and_values
- Text contrast: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- Non-text contrast: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- Target size: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- Dragging alternatives: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
- Modal dialog behavior: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- Reduced motion: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion

## Localization

Interface language is a separate browser preference from the account's calendar preference. Persian and English catalogs, direction handling, and the process for adding another language are documented in [localization.md](./localization.md).
