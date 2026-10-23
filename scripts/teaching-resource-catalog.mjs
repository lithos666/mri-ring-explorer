import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { normalizeTeachingResource } from '../lib/teaching-step-links.mjs';

export const FINAL_PRINT_FILES = [
  { filename: 'Final_1.3mf', id: 'print-final-1', estimatedPrintMinutes: 8358 },
  { filename: 'Final_2.3mf', id: 'print-final-2', estimatedPrintMinutes: 5379 },
  { filename: 'Final_3.3mf', id: 'print-final-3', estimatedPrintMinutes: 2269 },
  { filename: 'Final_4.3mf', id: 'print-final-4', estimatedPrintMinutes: 1169, previousEstimatedPrintMinutes: 1008 },
];
const retiredCAD = resource => ({ ...resource, visibility: 'hidden', updateStatus: 'retired', downloadAvailable: false });

// Keep resource preparation separate from CAD tessellation. Source MATLAB is
// copied verbatim into downloads; this function never edits the solver or source.
export function buildTeachingResources({ project, source, matlabDirectory, preservePublishedCAD = false }) {
  const resourceDirectory = path.join(project, 'public/resources');
  fs.mkdirSync(resourceDirectory, { recursive: true });
  const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const resources = [];
  const previousFile = path.join(project, 'lib/teaching-resources.json');
  const previousResources = fs.existsSync(previousFile) ? JSON.parse(fs.readFileSync(previousFile, 'utf8')) : [];
  const addFile = (input, id, category, titleZh, titleEn, partIds, stepIds, layer, options = {}) => {
    const bytes = fs.readFileSync(input.filename);
    const extension = path.extname(input.filename).slice(1).toLowerCase();
    const publishedName = options.downloadFilename || `${id}.${extension}`;
    if (path.basename(publishedName) !== publishedName) throw new Error('Invalid download filename');
    const url = input.url || `/resources/${publishedName}`;
    if (!input.url && category !== 'cad') fs.writeFileSync(path.join(resourceDirectory, publishedName), bytes);
    const resource = { id, titleZh, titleEn, type: extension.toUpperCase(), sourceRelativePath: input.relative.replaceAll('\\', '/'), url, bytes: bytes.length, sha256: sha256(bytes), category, partIds, stepIds, visibility: category === 'fastener-reference' ? 'bom' : 'resources', updateStatus: 'current', ...(layer ? { layer } : {}), ...options };
    resources.push(category === 'cad' ? retiredCAD(resource) : resource);
  };
  const addSource = (relative, ...args) => {
    const previous = previousResources.find(resource => resource.id === args[0]);
    if (args[1] === 'cad' && preservePublishedCAD && previous) {
      // Keep source identities for the existing GLB lesson; retired CAD is
      // provenance only and must not be reintroduced as a public download.
      resources.push(retiredCAD(previous));
      return;
    }
    const publishedFile = path.join(resourceDirectory, `${args[0]}.${path.extname(relative).slice(1).toLowerCase()}`);
    // A resource-only refresh must not silently replace the CAD behind the
    // already converted lesson scene with an unreviewed source draft.
    const sourceFile = path.join(source, relative);
    const publishedMatches = fs.existsSync(publishedFile) && previous && sha256(fs.readFileSync(publishedFile)) === previous.sha256;
    // Updating the final print package must keep unrelated checked references
    // intact, including when their original source has since been relocated.
    const filename = args[1] !== 'print' && publishedMatches && (preservePublishedCAD || !fs.existsSync(sourceFile)) ? publishedFile : sourceFile;
    addFile({ filename, relative }, ...args);
  };

  // These are generated publication copies, never the participant's originals.
  // Remove retired prototypes and the incompatible M10 illustration so running
  // the asset generator cannot publish the withdrawn files again.
  for (const filename of ['print-prototype-v0.3mf', 'print-prototype-v1.3mf', 'print-prototype-v2.3mf', 'print-prototype-v3.3mf', 'fastener-nut-reference.png']) {
    const target = path.resolve(resourceDirectory, filename);
    if (path.dirname(target) !== path.resolve(resourceDirectory)) throw new Error('Resource cleanup escaped its publication directory');
    if (fs.existsSync(target)) fs.unlinkSync(target);
  }

  for (let ring = 1; ring <= 14; ring++) addSource(`模型/layer${ring}.step`, `cad-layer-${String(ring).padStart(2, '0')}`, 'cad', `R${String(ring).padStart(2, '0')} 原始装配 CAD`, `R${String(ring).padStart(2, '0')} source assembly CAD`, ['printed-ring', 'ring-cover', 'short-screw'], ['step-01', 'step-02', 'step-03', 'step-04', 'step-05', 'step-09'], ring, { versionStatus: 'source-reference' });
  addSource('模型/new_genneration.step', 'cad-template', 'cad', '分段磁铁壳体与盖板模板', 'Segmented magnet housing and cap template', ['printed-ring', 'ring-cover'], ['step-01', 'step-02', 'step-04']);
  addSource('模型/surport.step', 'cad-ring-support', 'cad', '框架安装支撑 CAD', 'Frame mounting support CAD', ['ring-support'], ['step-06', 'step-08', 'step-09']);
  const legacySpacer = { versionStatus: 'legacy-block-reference-not-release-confirmed', referenceNoteZh: '历史文件是方块形隔块，不符合当前已确认的 18 mm 长圆柱形隔块。仅供旧接口参考；不能据此制造当前圆柱。', referenceNoteEn: 'This historical file contains block-shaped spacers, not the confirmed 18 mm-long cylinders. Use it only as an old interface reference, not to manufacture the current cylinder.' };
  addSource('模型/support_layer.step', 'cad-locator', 'cad', '历史方块层间隔块 CAD（非当前圆柱）', 'Historical block-spacer CAD (not the current cylinder)', ['locator'], ['step-06', 'step-07', 'step-09'], undefined, legacySpacer);
  for (const { filename, id, ...printEstimate } of FINAL_PRINT_FILES) {
    // These are complete print batches. Their per-file BOM allocation has
    // not been supplied, so do not invent part or assembly-stage mappings.
    addSource(`打印文件/${filename}`, id, 'print', filename, filename, [], [], undefined, {
      versionStatus: 'user-confirmed-final-print-batch', downloadFilename: filename,
      ...printEstimate, estimateSource: typeof printEstimate.estimatedPrintMinutes === 'number' ? 'user-provided' : 'previous-version-user-provided', packageScope: 'complete-final-print-set',
    });
  }

  for (const [index, filename] of fs.readdirSync(path.join(source, '磁铁放置信息')).entries()) addSource(`磁铁放置信息/${filename}`, `placement-${String(index + 1).padStart(2, '0')}`, 'placement', filename, filename.includes('1736') ? '1,736 magnet coordinates' : filename.endsWith('.txt') ? '14-layer magnet placement notes' : filename.includes('边缘') ? '14-layer edge dimensions' : 'Magnet-layout source reference', ['magnet-cube'], ['step-03', 'step-09']);
  addSource('M3螺丝尺寸.png', 'fastener-m3-reference', 'fastener-reference', 'M3 螺丝参考图（长度待确认）', 'M3 screw reference (length to confirm)', ['short-screw'], ['step-04'], undefined, { versionStatus: 'reference-thread-confirmed-length-pending', referenceNoteZh: '原图标记 M3×18；M3 螺纹已确认，实际长度尚未确认。', referenceNoteEn: 'The supplied image is labeled M3×18. M3 thread is confirmed; the installed length remains unconfirmed.' });
  for (const [filename, id, zh, en, partIds, stepIds] of [
    ['l-bracket.svg', 'fastener-l-bracket-diagram', '铝型材 L 型角码示意', 'Aluminum-frame L-bracket diagram', ['frame-l-bracket', 'aluminum-frame'], ['step-08']],
    ['m3-hardware.svg', 'fastener-m3-diagram', 'M3 螺丝 · 壳体盖板与透明盖板', 'M3 screws · housing cap and clear cover', ['short-screw', 'ring-cover', 'acrylic'], ['step-04']],
    ['m6-hardware.svg', 'fastener-m6-diagram', 'M6 紧固件 · 层间连接', 'M6 hardware · inter-layer connection', ['through-rod', 'm6-nut', 'locator'], ['step-06', 'step-07', 'step-09']],
    ['extrusion-bolt.svg', 'fastener-extrusion-bolt-diagram', '铝型材连接螺栓示意', 'Extrusion mounting bolt diagram', ['extrusion-bolt', 'frame-l-bracket', 'aluminum-frame'], ['step-08']],
    ['t-slot-nut.svg', 'fastener-t-slot-nut-diagram', 'T 型槽螺母示意', 'T-slot nut diagram', ['t-slot-nut', 'extrusion-bolt', 'aluminum-frame'], ['step-08']],
  ]) addFile({ filename: path.join(project, 'public/bom', filename), relative: `public/bom/${filename}`, url: `/bom/${filename}` }, id, 'fastener-reference', zh, en, partIds, stepIds, undefined, { versionStatus: 'schematic-thread-usage-confirmed-dimensions-pending' });

  for (const filename of fs.readdirSync(matlabDirectory).filter(f => f.endsWith('.m')).sort()) {
    const id = `matlab-${filename.replace(/\.m$/, '').toLowerCase()}`;
    addFile({ filename: path.join(matlabDirectory, filename), relative: `matlab/${filename}` }, id, 'placement', `MATLAB · ${filename}`, `MATLAB · ${filename}`, ['magnet-cube'], ['step-03', 'step-09'], undefined, { type: 'MATLAB', versionStatus: 'physics-source', visibility: 'hidden', updateStatus: 'pending-update' });
  }
  for (const language of ['zh', 'en']) {
    const relative = `diagrams/mri-14-layer-edge-dimensions-${language}.svg`;
    addFile({ filename: path.join(project, 'public', relative), relative: `public/${relative}`, url: `/${relative}` }, `edge-dimensions-${language}`, 'placement', language === 'zh' ? '新版十四层边缘尺寸 · 中文' : '新版十四层边缘尺寸 · 英文', language === 'zh' ? '14-layer edge dimensions · Chinese' : '14-layer edge dimensions · English', ['magnet-cube'], ['step-03', 'step-09'], undefined, { versionStatus: 'derived-verified' });
  }
  const bomCADFile = path.join(project, 'lib/bom-cad-assets.json');
  if (fs.existsSync(bomCADFile)) {
    const bomCAD = JSON.parse(fs.readFileSync(bomCADFile, 'utf8'));
    for (const asset of bomCAD.assets.filter(item => item.sourceFilename)) {
      const id = `bom-cad-${asset.id}`;
      const previous = previousResources.find(resource => resource.id === id && resource.sha256 === asset.sourceSha256);
      if (previous) { resources.push(retiredCAD(previous)); continue; }
      const relative = `模型/${asset.sourceFilename}`;
      const original = path.join(source, relative);
      const published = path.join(resourceDirectory, `${id}.step`);
      // Downloads must match the exact source used for this BOM render. A
      // later draft with the same filename must not silently replace it.
      const matches = file => fs.existsSync(file) && sha256(fs.readFileSync(file)) === asset.sourceSha256;
      const input = matches(original) ? original : matches(published) ? published : null;
      if (!input) throw new Error(`Matching source CAD is unavailable for ${asset.id}; regenerate its BOM render first.`);
      const labels = {
        spacer: ['层间隔块 · 提供的 STEP', 'Inter-layer spacer · supplied STEP', ['locator'], ['step-06', 'step-09']],
        'side-support': ['左右框架支撑 · 提供的 STEP', 'Side frame support · supplied STEP', ['ring-support'], ['step-06', 'step-08', 'step-09']],
        'bottom-support': ['底部框架支撑 · 提供的 STEP', 'Bottom frame support · supplied STEP', ['ring-support'], ['step-06', 'step-08', 'step-09']],
      };
      const label = labels[asset.id];
      if (!label) throw new Error(`Unknown BOM CAD asset ${asset.id}`);
      addFile({ filename: input, relative }, id, 'cad', ...label, undefined, { visibility: 'bom', versionStatus: 'user-provided-bom-cad', referenceNoteZh: '与 BOM 示意图采用同一份提供的 STEP；完整装配位置与打印工艺须另行核对。', referenceNoteEn: 'The same supplied STEP used for the BOM rendering; verify full-assembly placement and printing separately.' });
    }
  }
  // Clean only generated website download copies. GLB scene/BOM assets and
  // all files in the participant's original engineering directory stay intact.
  const allowedModels = new Set(FINAL_PRINT_FILES.map(file => file.filename));
  for (const filename of fs.readdirSync(resourceDirectory)) {
    if (!/\.(?:3mf|step|stp|stl|obj|gltf|glb)$/i.test(filename) || allowedModels.has(filename)) continue;
    const target = path.resolve(resourceDirectory, filename);
    if (path.dirname(target) !== path.resolve(resourceDirectory)) throw new Error('Resource cleanup escaped its publication directory');
    if (fs.statSync(target).isFile()) fs.unlinkSync(target);
  }
  return resources.map(normalizeTeachingResource);
}

export function updateConfirmedHardwareMetadata(manifest) {
  manifest.rodAxes = manifest.rodAxes.map(axis => ({ ...axis, hardwareThread: 'M6', hardwareStatus: 'user-confirmed', status: 'axis-candidate-hole-diameter-pending' }));
  manifest.confirmedBOMQuantities = { magnetCube: 1736, segmentedHousing: 56, housingCap: 56, clearCover: 56, mountingSupports: { total: 42, side: 28, bottom: 14 }, cylindricalSpacers: { total: 32, breakdown: [4, 8], lengthMM: 18 }, throughRods: 8, m3ShortScrews: 448, m6Nuts: 8, frameLBrackets: 20, extrusionFrames: 1, extrusionMountingBolts: 112, tSlotNuts: 112 };
  for (const part of manifest.parts) {
    if (part.role === 'support') { part.procurementQuantityStatus = 'user-confirmed'; part.confirmedQuantity = 42; }
    if (part.role === 'locator') { part.procurementQuantityStatus = 'user-confirmed'; part.confirmedQuantity = 32; part.geometryStatus = 'historical-block-reference-not-current-cylinder'; }
  }
  manifest.hardware = {
    confirmation: 'user-confirmed-thread-use-and-quantities',
    coverAcrylicBase: { thread: 'M3', partIds: ['short-screw'], lengthStatus: 'pending', quantity: 448, quantityPerLayer: 32, quantityStatus: 'user-confirmed', material: 'brass', materialStatus: 'user-confirmed' },
    clearCover: { partId: 'acrylic', material: 'PMMA', thicknessMM: 2, thicknessStatus: 'user-confirmed', holeDrawingStatus: 'awaiting-user-dxf' },
    interLayer: { thread: 'M6', partIds: ['through-rod', 'm6-nut'], rodLengthStatus: 'pending', rodQuantity: 8, nutQuantity: 8, quantityStatus: 'user-confirmed', material: 'brass', materialStatus: 'user-confirmed', rodGroups: [{ layers: [1,2,3,4,5], rodQuantity: 4 }, { layers: [10,11,12,13,14], rodQuantity: 4 }], completePlacementStatus: 'user-confirmed-two-five-layer-groups' },
    spacers: { partId: 'locator', shape: 'cylinder', lengthMM: 18, passageFor: 'M6', quantity: 32, quantityBreakdown: [4, 8], quantityStatus: 'user-confirmed', outerDiameterStatus: 'pending', boreDiameterStatus: 'pending', mountingDistributionStatus: 'user-confirmed', gapsAfterLayers: [1,2,3,4,10,11,12,13], sourceCADStatus: 'historical-block-reference-not-current-cylinder' },
    frameBrackets: { partId: 'frame-l-bracket', suppliedBy: 'organizer', dimensionsStatus: 'supplied-part-reference', quantity: 20, quantityStatus: 'user-confirmed', materialStatus: 'pending' },
    extrusionFrame: { partId: 'aluminum-frame', suppliedBy: 'organizer', quantity: 1, quantityStatus: 'user-confirmed', material: 'aluminium', alloyGradeStatus: 'pending' },
    extrusionConnections: { partIds: ['extrusion-bolt', 't-slot-nut'], suppliedBy: 'organizer', threadStatus: 'pending', slotSeriesStatus: 'pending', boltQuantity: 112, tSlotNutQuantity: 112, quantityStatus: 'user-confirmed', materialStatus: 'pending' },
  };
  const bomCADFile = path.join(path.resolve(import.meta.dirname, '..'), 'lib/bom-cad-assets.json');
  if (fs.existsSync(bomCADFile)) {
    const spacerCAD = JSON.parse(fs.readFileSync(bomCADFile, 'utf8')).assets.find(asset => asset.id === 'spacer');
    if (spacerCAD?.confirmedGeometryMM) {
      manifest.hardware.spacers.nominalGeometryMM = spacerCAD.confirmedGeometryMM;
      manifest.hardware.spacers.bomSourceCADStatus = 'provided-cylindrical-cad-render';
      manifest.hardware.spacers.outerDiameterStatus = 'provided-cad-nominal';
      manifest.hardware.spacers.boreDiameterStatus = 'provided-cad-nominal';
      manifest.hardware.spacers.manufacturingFitStatus = 'pending';
    }
  }
  const obsolete = manifest.pending.filter(item => /Screw conflict|rod specifications|hardware thread|M3 thread confirmed|M6 layer-connection thread confirmed|L-bracket dimensions|Procurement quantities|Profile cut list and connectors|Cylindrical spacers|Eight M6 rods|M3 quantity confirmed|Organizer provides|Independent acrylic|Clear cover|R05\/R10/i.test(item));
  const spacerPending = manifest.hardware.spacers.nominalGeometryMM
    ? 'Cylindrical spacers: supplied CAD has 18 mm length, 14 mm outer diameter and 6.2 mm passage; four spacers in each internal gap of R01–R05 and R10–R14 confirmed; physical printing fit pending'
    : 'Cylindrical spacers: 32 pieces (4 × 8), length 18 mm, passage for M6 confirmed; OD, bore diameter, mounting distribution and current manufacturing file pending';
  manifest.pending = [...manifest.pending.filter(item => !obsolete.includes(item)), 'M3 brass screws confirmed at 448 (32 per layer); screw length and torque pending (historical CAD 2.9×16 BF versus M3×18 reference)', 'Eight brass M6 rods: four across R01–R05 and four across R10–R14; eight brass M6 nuts confirmed; rod cut lengths and tightening requirements pending', spacerPending, 'Clear cover: PMMA, 2 mm thick confirmed; hole-pattern DXF and comb-like alignment-device CAD not yet completed by the user', 'Organizer provides 20 L-brackets, one aluminium frame, 112 extrusion bolts and 112 T-slot nuts; use supplied specifications', 'Manufacturing materials and tolerances not established by BOM quantity confirmation'];
  manifest.pending = [...new Set(manifest.pending)];
  return manifest;
}
