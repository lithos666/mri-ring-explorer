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

### Confirmed quantities and cylindrical spacer — 2026-10-13

The one-magnet BOM now uses the user's confirmed quantities: 56 segmented housings, 56 housing caps, 56 clear covers, 42 mounting supports (28 side + 14 bottom), 32 spacers (4 × 8), 8 through-rods, 448 M3 short screws (32 × 14) and 8 M6 nuts. The extrusion frame, L-brackets, mounting bolts and T-slot nuts display “Provided by organizers” rather than an invented or pending quantity. List rows, part dialogs and bilingual CSV files use the same quantity, breakdown and supply fields. Historical CAD short-screw instances remain 182 and do not change the confirmed 448-unit BOM.

`public/bom/locator.svg` and the isolated BOM spacer model show a hollow cylinder, confirmed as 18 mm long with a passage for M6. Outer diameter and hole clearance are illustrative and remain unconfirmed. The old block-shaped `support_layer.step` and associated 3MF are retained as clearly labeled historical references, with a bilingual warning that they do not manufacture the current cylinder. The locator installation shortcut is withheld because the mounting distribution of the 32 cylinders and all 8 rod positions is not encoded in the current CAD. Assembly geometry remains historical where these unconfirmed interfaces appear; no parts are silently relocated.

The header and browser icons now use `public/brand/mri-hardware-ai-transparent.png`, an alpha-background derivative made with the built-in Imagegen editor from the user's supplied logo. Original logo artwork is retained as a separate reference at `public/brand/mri-hardware-ai.png`. The new PNG has a transparent background; its prompt, provenance and alpha verification are recorded separately in `docs/logo-transparency.md`.

### Provided STEP previews — 2026-10-13, local draft

The BOM spacer and frame-support illustrations now come directly from the user's `层间隔块.step`, `左右.step` and `下面.step`. Four 800 × 520 white-studio images total about 99 KB; the three centred GLB files load only when their part viewer is opened. Side and bottom supports can be selected independently, with the confirmed 28/14 quantities and matching source-file captions. The isolated viewer supports orbit, zoom, pan and reset, with an image fallback when WebGL is unavailable.

The spacer STEP defines a nominal 18 mm length, 14 mm outer diameter and 6.2 mm bore. These replace the earlier illustrative BOM cylinder dimensions. Its manufacturing fit and placement distribution remain pending. The existing full assembly, old block-shaped historical references and magnetic model remain unchanged. Three byte-identical STEP downloads are added only to the associated BOM dialogs; the Resources page retains its 31 downloads. The transparent logo and confirmed counts remain intact. This draft has not been uploaded or deployed.

### Unified BOM product images — 2026-10-13, local draft

The eleven remaining BOM categories now use 960 × 624 white-studio product illustrations instead of flat SVG drawings or a raw screw reference. The housing and cap retain the actual R01 CAD mesh geometry (`base-05` and `cover-04` from `assembly/layer-01.glb`); each is displayed alone after proper rigid reorientation. Their captions identify R01 and direct users to the corresponding ring file for other layers. The magnet cube keeps true 12 mm outer dimensions, with an illustrative rounded surface treatment; no unconfirmed N/S painting or engraving is added.

The clear cover, extrusion frame, through-rod, short screw, M6 nut, L-bracket, mounting bolt and T-slot nut are explicitly illustrative native Three geometry. They show useful holes, recesses, threads, transparent edges and extrusion channels without defining unconfirmed sizes, finishes, head styles or manufacturing fits. The M3 reference is still available as its original BOM download; it no longer serves as the primary thumbnail. Material descriptions, quantities, supply status, resources and magnetic calculations remain unchanged.

The original three supplied CAD previews and downloads are byte-identical. Product images total 605,032 bytes; only the PNG assets enter the browser, and the offline generator is not part of the runtime rendering path. `lib/bom-product-assets.json` records image checksums, provenance and the underlying CAD hash where applicable. Reproduce with `node scripts/render-bom-products.mjs --browser-toolkit=<playwright/index.mjs path>`. The two scene modules under `scripts/bom-scenes/` define the display geometry. A local Three environment supplies reflections, restrained key/fill lighting and clean PCF contact shadows; there is no external HDR request or AI-generated engineering geometry.

BOM thumbnails are larger (144 × 94 px, 120 × 78 px below 1080 px). Images, bilingual captions and full-size part details share the same asset catalog. This work remains local only, with no GitHub push or deployment.

### T-slot nut reference correction — 2026-10-13, local draft

The supplied `codex-clipboard-cb4f39a4-6f3b-4875-8e7b-0566d7952217.png` identifies a European-style T-slot nut with a rounded elongated silver body, raised rounded central boss, continuous internal thread and serrated pads at both ends. The native illustration now follows these features. Its modelling proportions, thread pitch and mating extrusion dimensions remain illustrative; the picture does not establish a stock series or a thread size. The BOM material field records “nickel-plated carbon steel” as the reference image's label, with verification against the supplied parts still pending. Organizer supply status and all quantities are unchanged.

Only `t-slot-nut.png` was rerendered; the ten other product pictures and the three provided STEP previews are unchanged. Its bilingual caption and description identify the new shape. The existing `fastener-t-slot-nut-diagram` SVG download embeds the corrected PNG, making the downloaded file self-contained and keeping it consistent with the table and detail image. Reproduce the targeted update with `node scripts/render-bom-products.mjs --ids=t-slot-nut`, followed by `node scripts/refresh-teaching-resources.mjs`. Assembly and magnetic geometry are unaffected. No GitHub push or deployment was performed.

### Eight-second assembly and transverse FOV — 2026-10-13, local draft

All nine teaching animations now run for 8 seconds at 1×, with the primary motion starting at 0.44 seconds instead of a long opening wait. Shared timing intervals preserve ordered magnet loading, acrylic insertion before fastening, and support positioning before spacers. The last approximately 0.8 seconds show the seated state. Pause, replay, timeline scrubbing, 0.5× playback and hidden-page pause remain available; CAD paths, registrations and learning-progress data are unchanged.

Mechanical motion and the recommended camera now use Apple's Core Animation [easeInEaseOut](https://developer.apple.com/documentation/quartzcore/camediatimingfunctionname/easeineaseout), `cubic-bezier(0.42, 0, 0.58, 1)`: a gentle start, faster middle and smooth landing with zero endpoint speed. The implementation solves the curve's time coordinate before evaluating displacement. Progress is bounded to the original path, without spring overshoot or changed geometry. Recommended camera poses follow the same deterministic timeline, so pausing or scrubbing does not leave a frame-dependent camera catch-up motion. Real elapsed time preserves the eight-second duration on slower GPUs; hidden scenes reset the playback clock.

Principles & Lab keeps the initial 3D view and adds a transverse/FOV tab. The XY heatmap follows the MATLAB five-slice definition, shows circular ROI mean and ppm statistics, and lets users inspect separate planes or |B|. The FOV selector uses an explicit user-defined sampled field-variation target. A precomputed Float64 baseline avoids a browser solve on first opening; later fields use only completed design snapshots. The map, statistics, unchanged initial reference and pending-state labels remain consistent through manual calculations. Method, limitations and numerical evidence are recorded in [transverse-field-fov.md](transverse-field-fov.md). This remains a local update.


### Temporary acrylic-retainer lesson — 2026-10-22

The current lesson has ten eight-second stages. Clear-cover insertion now precedes a new temporary-retainer stage, then cap fitting and clip removal under continued restraint. The supplied STEP is converted to an exact, independently audited clip mesh; its source is archived for reproduction. The local interface uses explanatory mating surfaces because installed clip coordinates, acrylic thickness, physical retention force and per-ring quantity have not been confirmed. The clip is removed before the completed magnet view. See [the bilingual assembly and migration notes](temporary-acrylic-retainer.md).

The overview places a typographic event-website link above the main headline, while the logo retains its event link. The new reusable clip appears in BOM with unknown quantity/material and an isolated CAD viewer. Resources continues to expose only the four final print models plus the existing nine layout references; this update does not assign the new clip to an unverified print batch. Learning progress migrates by semantic stage, with affected cap/acrylic inspections reopened. The magnetic model and cached fields are unchanged.
