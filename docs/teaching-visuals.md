# Teaching visuals — local hackathon edition

The chapter cover is an illustration, not a fabrication drawing. Assembly scenes use converted STEP geometry; magnet positions and directions use the MATLAB-derived model. Dimensions must be read from the linked engineering files.

## Cover

- Project asset: `public/assembly/hero.png`
- Created with the built-in Imagegen tool on 2026-10-11.
- Reference: the user-supplied complete assembly screenshot, `codex-clipboard-c06fd9d2-c4dc-4304-b3db-6d9a59686bec.png`.
- Original output: `C:/Users/肖楚煜/.codex/generated_images/01a0dbc5-fa7c-7382-a756-3e8b336a6d8d/exec-4f5a3cf0-1def-4797-8bf2-a8c29881af90.png`.

Prompt:

> Use case: sketch-to-render. Asset type: MRI hackathon educational website chapter cover, clean product photograph. Input image is a GEOMETRY REFERENCE of the user's real 14-layer permanent magnet assembly. Transform the CAD screenshot into an informative cinematic white-studio product image. Preserve the circular aperture, fourteen thin parallel annular layer plates along horizontal bore axis, repeating radial slot windows, side support blocks along two rails and bottom support blocks, and rectangular aluminum T-slot extrusion support frame. Material: warm off-white matte printed polymer plates and blocks, brushed natural silver aluminum extrusion frame, subtle clear slightly blue acrylic inserts, dark subtle fasteners. Camera matches reference front three-quarter perspective, whole object clearly visible, landscape 1536x1024, generous clean white surroundings with soft contact shadow. Photographic large diffuse studio lights, fine rim edge contrast, physically plausible materials, elegant precise technical product aesthetic. No text, no software UI, no red annotations, no people, no cables or coils invented, no logos, no magnetic-field glows. This is only an illustrative chapter cover; preserve geometry faithfully and do not add new mechanical details.

All tutorial labels and operating instructions are rendered by the website in the selected language. The original red screenshot annotations are source notes, not displayed teaching artwork.

## Scene refinement — 2026-10-12

This release incorporates the locally reviewed scene refinement. Assembly and Principles & Lab use wider desktop workspaces. Assembly controls sit beside the ring selector, while model notes, pole legends and selection details are outside the 3D canvas. Notes can be expanded for the full explanation.

The illustrative aluminum frame now has four-face T-slots, open central bores and shared lightweight profile geometry. Corner brackets and recessed bolt sockets illustrate connections; they do not confirm hardware or purchasing specifications. The existing frame centerlines and display envelopes are preserved. The STEP parts, MATLAB magnet positions, directions and magnetic-field formulas are unchanged.

Both 3D scenes generate a small studio reflection map locally. No new HDR download or post-processing is required. The assembly's whole view fits its frame and elevated-ring display envelope to the camera's horizontal and vertical field of view, leaving a margin around the model; free camera gestures remain available.

TypeScript and the local production build pass. Desktop browser checks cover 1440×900, 1280×720 and 1024×768 in both languages, with visible controls and no blocking annotations. Cached CAD assets remain reusable after a full refresh. Prototype manufacturing and fit checks continue to use the engineering files and existing pending-parameter notes.

### Cinematic overview and grouped downloads

The overview model uses a separate product-lighting profile: warm ivory display materials, a directional warm key, a restrained cool fill, richer N/S labels, aluminum reflections and stronger contact shadows. Exposure and ambient fill are lower to avoid washed-out surfaces against the white background. This changes the interactive renderer, not the CAD or field model. Teaching-stage highlight and transparency behavior remains intact; no remote HDR or post-processing was added.

Downloads now open as six collapsed categories: ring assembly CAD (14), part CAD (3), print files (9), layout/dimensions (9), MATLAB source (7), and fastener references (2). Search and category/part/ring filters open matching categories automatically; clearing filters restores the compact view. The large edge-dimension drawing is also an optional preview. All 44 original catalog entries, download URLs and file bytes are retained. Bilingual, keyboard and actual-download checks pass.
