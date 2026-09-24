# Dropdown Profile — Design QA

- Source visual truth: `/var/folders/qg/nx_dvx1d2zb3l9ft0ld91ddc0000gn/T/codex-clipboard-7b114b73-9136-4655-9ae0-f9296ffd4bba.png`
- Implementation: `src/components/shared/dropdown-profile.tsx`
- Browser-rendered evidence: Codex in-app Browser, local preview capture, tab 2
- Viewport: 651 × 817 CSS px at device scale factor 1
- Source pixels: 600 × 390; reference component is approximately 568 × 348 physical pixels and represents a 284 px-wide high-density UI
- Implementation pixels: 651 × 817 full-view capture; dropdown rendered at 284 CSS px
- State: dropdown open; availability submenu and `Away` selection also tested

## Full-view comparison evidence

The rendered dropdown preserves the reference hierarchy: identity and presence in the header, two primary rows, separator, and sign-out row. Placement correctly opens to the right of the sidebar trigger and above the bottom edge.

## Focused region comparison evidence

The dropdown itself was readable at native browser scale, so a separate focused crop was not needed. Typography, padding, icon sizing, border, radius, shadow, green presence dot, separator, and copy were checked directly against the supplied reference.

## Required fidelity surfaces

- Fonts and typography: existing Plus Jakarta Sans application font retained; hierarchy and weights match the reference closely.
- Spacing and layout rhythm: 284 px menu width, compact header, 40 px action rows, 12 px radius, and bottom-aligned placement match the intended density.
- Colors and visual tokens: white surface, zinc neutrals, emerald online state, and existing primary focus token are consistent with the product.
- Image quality and asset fidelity: no raster assets are required; matching Tabler icons are used as vector library assets.
- Copy and content: `Profile`, `Notification settings`, and `Sign out` match the source. Business name and email use live user data.

## Findings

No actionable P0, P1, or P2 differences remain. The implementation intentionally uses the product's existing font and icon system rather than introducing a one-off visual dependency.

## Interaction checks

- Avatar opens and closes the profile dropdown.
- Availability control expands without dismissing the parent dropdown.
- Selecting `Away` updates the visible state and closes the availability list.
- Profile and notification rows target the existing settings route.
- Sign out uses the existing authenticated server action.
- Browser console: no application errors observed during the checked interactions.

## Comparison history

- Initial pass: no P0/P1/P2 visual issues found.
- Interaction refinement: removed the surrounding avatar tooltip trigger to avoid competing nested popup behavior.
- Post-fix evidence: lint, full test suite, production build, dropdown open state, and availability selection all passed.

## Follow-up polish

- P3: Persist availability through the backend when presence becomes a product capability; it is currently local UI state.

final result: passed
