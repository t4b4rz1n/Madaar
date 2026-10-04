# Heledone workspace design

The workspace extends the warm home-page design to projects, Kanban, attendance, reports, finances, teams, members, organizations, roles, support, notifications, automations, settings and profile pages.

Use `PageHeading` for a title, description and actions. Its optional `coastal-house` or `palm-sunset` artwork is appropriate for account and setup screens. Existing feature headings use `heledone-page-heading` to keep their own filters and permission-gated actions.

Keep task boards, timesheets and financial tables free of scene illustrations. Workflow colors and text labels remain independent from decorative project colors. White cards sit on the warm canvas; controls retain solid focus indicators. Tables scroll inside their own containers on small screens.

The shared shell uses a workspace search control, the existing command menu, an RTL/LTR sidebar and a compact account link. `heledone-page-content` separates lists and cards from the old full-page glass panels. Forms and modal surfaces use the same typography, field radius and brand palette.

Language changes continue to come from the registered locale catalogs and preserve feature state. New visible strings, including avatar selection labels, must be added to both catalogs. Use logical spacing and positioning properties for all directional layouts.

Generated images live under `apps/web/public/images/heledone-assets/`. Decorative images use empty alt text. Avatar buttons have numbered accessible labels, selected state and a loading lock; selecting one prepares the existing profile upload and the user saves it through the account form.

Validation: production build, ESLint, locale checks and browser review of Persian/English desktop and mobile layouts. Browser previews use local mock data; account profile changes are not submitted as part of visual review.
