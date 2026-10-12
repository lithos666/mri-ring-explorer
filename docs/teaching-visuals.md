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

The illustrative aluminum frame has four-face T-slots, open central bores and shared lightweight profile geometry. Corner brackets and recessed bolt sockets illustrate connections; they do not confirm hardware or purchasing specifications. The STEP parts, MATLAB magnet positions, directions and magnetic-field formulas are unchanged.

Both 3D scenes generate a small studio reflection map locally. No new HDR download or post-processing is required. The assembly's whole view fits its frame and elevated-ring display envelope to the camera's horizontal and vertical field of view, leaving a margin around the model; free camera gestures remain available.

TypeScript and the local production build pass. Desktop browser checks cover 1440×900, 1280×720 and 1024×768 in both languages, with visible controls and no blocking annotations. Cached CAD assets remain reusable after a full refresh. Prototype manufacturing and fit checks continue to use the engineering files and existing pending-parameter notes.

### Cinematic overview and grouped downloads

The overview model uses a separate product-lighting profile: warm ivory display materials, a directional warm key, a restrained cool fill, richer N/S labels, aluminum reflections and stronger contact shadows. Exposure and ambient fill are lower to avoid washed-out surfaces against the white background. This changes the interactive renderer, not the CAD or field model. Teaching-stage highlight and transparency behavior remains intact; no remote HDR or post-processing was added.

The earlier grouped-download release used six collapsed categories. Search and category/part/ring filters open matching categories automatically; clearing filters restores the compact view. The large edge-dimension drawing is an optional preview. The current download counts and visibility policy are recorded in the simplified teaching release below.

### Support and rail alignment

The assembled display now uses a level mounting frame. A common rigid rotation of +6.2068965517 degrees reverses the support CAD's slot-lattice phase registration for presentation only. Ring parts, magnetic meshes and pole markers, supports, locators, rods, labels, selection outlines and assembly guides move together. Original CAD assets and magnetic calculation coordinates remain unchanged. Stage 8's lift still follows world vertical, and cutaway planes and detail cameras follow the same display transform.

The supplied support CAD has side-channel radial walls at |X|=215–255.2 mm, upper seating faces at Y=40.1 mm, and a lower central channel whose seat is Y=-215 mm. The illustrative longitudinal guides therefore use rounded 40×80 mm sections centered at (±235.1, 0.1), and a central 80×40 mm guide at (0, -235). A 4.5 mm corner radius follows the internal channel corners. The lower guide seats above transverse frame members, and posts terminate on their upper faces instead of passing through them. The scene has nine frame profiles with shared geometry. These nominal display dimensions are not a released stock specification or cut list; actual tolerances, fasteners, loading and manufacturing fit still require confirmation.

### Hardware, illustrations and user logo

The preceding hardware release contained 42 catalog entries. Prototype v0–v3 and the obsolete nut image were withdrawn from the published file set; prototype v4 and unrelated part references remain. The seven MATLAB source programs and magnetic calculation baseline have not been changed. The current catalog adds two extrusion-hardware illustrations and records teaching visibility separately.

`public/bom/` contains code-native SVG illustrations. They show the shape and purpose of cubes, ring sectors, covers, acrylic, supports, spacers, through-rods, the frame, L-brackets and hardware. They are labeled as illustrations in both languages, and are not photographs or dimensioned manufacturing drawings. The supplied M3 screw reference remains explicitly a length reference, with installation length unconfirmed. M3 screws secure the housing cap/clear cover/housing; M6 is used for inter-layer fastening.

The header and browser icon use the user's image unchanged at `public/brand/mri-hardware-ai.png`, from the supplied `codex-clipboard-09a53f5f-d9b8-435b-b7c3-7865e3195e17.png`. Its artwork and text are retained; CSS only scales the image. Assembly mounts the frame and all fourteen layers before the final through-rod lesson. Earlier mounting phases hide rods; the final insertion phase shows the complete fourteen-layer geometry. Stored learning steps migrate by semantic identity, preserving completed checks.

### Simplified teaching release — 2026-10-13

The BOM is a thirteen-category reference list with bilingual material descriptions. Material receipts are no longer read, written or displayed. Existing browser receipt data is left unused; assembly inspection progress and magnet designs remain independent. N52 NdFeB identifies the supplied magnet grade without changing the model's existing Br input.

Two new 600 × 400 code-native illustrations, `public/bom/extrusion-bolt.svg` and `public/bom/t-slot-nut.svg`, explain the extrusion mounting-bolt and T-slot-nut relationships. Their geometry is schematic and does not specify thread size, stock dimensions or material. `public/bom/m3-hardware.svg` now shows an M3 screw only; the discontinued M3 nut has been removed from active content and catalog links.

Frame mounting supports and inter-layer spacers keep their stable internal IDs, show their purpose in the BOM and offer an installation view using the existing CAD scene. Printing material descriptions use the current file settings: PLA for housing/cap/supports and PETG for spacers, with actual manufacturing material unconfirmed. Acrylic is identified as PMMA; the extrusion frame is aluminium with alloy grade unconfirmed. Hardware and bracket materials remain pending.

Resources offers four file groups and 31 current downloads. Six hardware references download directly from BOM dialogs. Seven old MATLAB files remain byte-identical in the project but are marked hidden / update pending and have no teaching download entry. The nine layout-and-dimension downloads and their file bytes remain unchanged. The catalog generator preserves these display policies on future resource refreshes.

The Lab shows the latest 14-ring, 28-column model, manual field calculation after layer edits and two main views. The principles below use three short concepts plus gradient/RF explanations. The displayed baseline 37.344 mT remains a centre-field value; region-average field and homogeneity metrics require a defined imaging volume.
