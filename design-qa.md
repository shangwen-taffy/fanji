# Design QA — 尚文番迹 UI refresh

## Evidence

- Source visual truth: `C:\Users\HUAWEI\AppData\Local\Temp\codex-clipboard-82d58b36-e4fd-4c02-b47e-972de77b7cc0.png`
- Desktop implementation: `C:\Users\HUAWEI\Desktop\软件\fanji\tmp\design-qa\implementation-desktop.png`
- Mobile implementation: `C:\Users\HUAWEI\Desktop\软件\fanji\tmp\design-qa\implementation-mobile-500.png`
- Full comparison: `C:\Users\HUAWEI\Desktop\软件\fanji\tmp\design-qa\comparison-pass1.png`
- Desktop viewport/CSS size: 1440 × 1024 at device scale factor 1.
- Mobile verification viewport: 500 × 844 at device scale factor 1. This exercises the `<640px` mobile layout. A 390px Chrome command-line capture was rejected as comparison evidence because the desktop Chrome window minimum produced a wider layout viewport and cropped the screenshot.
- State: logged-out search landing/empty state. The source mock shows populated search results, so result-card fidelity was also checked against component styling and the existing product screenshots.

## Required fidelity surfaces

- Fonts and typography: passed. The implementation uses a restrained Chinese serif display face with a readable system sans-serif UI face, matching the source hierarchy without introducing more than two families.
- Spacing and layout rhythm: passed. Wide rounded hero, overlapping pill search, two-column desktop result layout, generous whitespace, and floating capsule navigation follow the selected source. Mobile collapses grids and preserves the primary controls.
- Colors and visual tokens: passed. Cream, nude beige, milk-tea brown, cocoa text, caramel actions, and dusty sakura accents are consistently tokenized.
- Image quality and asset fidelity: passed. Three project-owned generated raster assets are used for the hero, empty state, and profile banner. The empty-state asset's first version had dark edge contamination and was regenerated with a continuous cream background before final capture.
- Copy and content: passed. Product-facing branding is now “尚文番迹”; the four core navigation labels and existing workflow copy are preserved.

## Full-view comparison evidence

The side-by-side comparison confirms the same primary visual hierarchy as the source: compact brand header, warm illustrated hero, large rounded search control, content region, and fixed capsule navigation. The implementation intentionally shows the real initial empty state rather than fabricated search data.

## Focused-region evidence

- Hero: character age, cocoa hair, cherry blossoms, cat/dog companionship, warm palette, left-side text area, and soft crop match the selected direction.
- Search control: high contrast, large touch target, pill silhouette, and overlapping hero position match the source.
- Mobile: headline remains readable; artwork is softened behind copy; search and all four navigation destinations remain visible at the verified mobile breakpoint.

## Comparison history

### Pass 1

- P2 — Empty-state art showed black outer edges in direct asset inspection.
  - Fix: regenerated the asset with a full cream background and replaced the project file.
  - Post-fix evidence: desktop and mobile captures show a clean rounded crop with no dark halo.
- P2 — Initial narrow command-line screenshot cropped the right edge because desktop Chrome enforced a minimum layout width.
  - Fix: normalized the mobile comparison at 500 × 844, still inside the app's mobile breakpoint, with device scale factor 1.
  - Post-fix evidence: `implementation-mobile-500.png` shows the full search button and all four navigation items with no horizontal clipping.

## Interaction and technical checks

- Next.js production build: passed.
- ESLint: passed.
- Home route and all three generated assets: HTTP 200.
- Navigation buttons remain wired to the existing four React states.
- Search API returned a temporary upstream-service error during local verification; this is not a UI regression and the existing error state remains intact.
- No browser-render load failure appeared during desktop or mobile captures.

## Findings

- No actionable P0, P1, or P2 visual differences remain.
- P3: a future pass could add a dedicated mobile crop of the hero illustration for even tighter art direction below 400px.

## Implementation checklist

- [x] Rename the product to 尚文番迹.
- [x] Apply the selected warm anime visual system.
- [x] Integrate original hero, empty-state, and profile art.
- [x] Replace the icon family with rounded Phosphor icons.
- [x] Preserve search, collections, profile, auth, upload, settings, and dialogs.
- [x] Verify desktop and mobile responsive states.

final result: passed
