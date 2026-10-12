import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Keep resource preparation separate from CAD tessellation. Source MATLAB is
// copied verbatim into downloads; this function never edits the solver or source.
export function buildTeachingResources({ project, source, matlabDirectory }) {
  const resourceDirectory = path.join(project, 'public/resources');
  fs.mkdirSync(resourceDirectory, { recursive: true });
  const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const resources = [];
  const addFile = (input, id, category, titleZh, titleEn, partIds, stepIds, layer, options = {}) => {
    const bytes = fs.readFileSync(input.filename);
    const extension = path.extname(input.filename).slice(1).toLowerCase();
    const url = input.url || `/resources/${id}.${extension}`;
    if (!input.url) fs.writeFileSync(path.join(resourceDirectory, `${id}.${extension}`), bytes);
    resources.push({ id, titleZh, titleEn, type: extension.toUpperCase(), sourceRelativePath: input.relative.replaceAll('\\', '/'), url, bytes: bytes.length, sha256: sha256(bytes), category, partIds, stepIds, ...(layer ? { layer } : {}), ...options });
  };
  const addSource = (relative, ...args) => addFile({ filename: path.join(source, relative), relative }, ...args);

  // These are generated publication copies, never the participant's originals.
  // Remove retired prototypes and the incompatible M10 illustration so running
  // the asset generator cannot publish the withdrawn files again.
  for (const filename of ['print-prototype-v0.3mf', 'print-prototype-v1.3mf', 'print-prototype-v2.3mf', 'print-prototype-v3.3mf', 'fastener-nut-reference.png']) {
    const target = path.resolve(resourceDirectory, filename);
    if (path.dirname(target) !== path.resolve(resourceDirectory)) throw new Error('Resource cleanup escaped its publication directory');
    if (fs.existsSync(target)) fs.unlinkSync(target);
  }

  for (let ring = 1; ring <= 14; ring++) addSource(`模型/layer${ring}.step`, `cad-layer-${String(ring).padStart(2, '0')}`, 'cad', `R${String(ring).padStart(2, '0')} 原始装配 CAD`, `R${String(ring).padStart(2, '0')} source assembly CAD`, ['printed-ring', 'ring-cover', 'short-screw'], ['step-01', 'step-02', 'step-03', 'step-04', 'step-05', 'step-09'], ring, { versionStatus: 'source-reference' });
  addSource('模型/new_genneration.step', 'cad-template', 'cad', '扇形拼接与盖板模板', 'Sector joint and cover template', ['printed-ring', 'ring-cover'], ['step-01', 'step-02', 'step-04']);
  addSource('模型/surport.step', 'cad-ring-support', 'cad', '左、右、下支撑 CAD', 'Left, right and lower support CAD', ['ring-support'], ['step-06', 'step-08', 'step-09']);
  addSource('模型/support_layer.step', 'cad-locator', 'cad', '层间定位件 CAD', 'Inter-layer locator CAD', ['locator'], ['step-06', 'step-07', 'step-09']);
  for (const [filename, id, zh, en, partIds] of [
    ['侧边支撑.3mf', 'print-side-support', '侧边支撑打印参考', 'Side-support print reference', ['ring-support']],
    ['曾与层之间的支撑.3mf', 'print-interlayer-support', '层间支撑打印参考（原文件名保留）', 'Inter-layer support print reference', ['locator']],
    ['holderv1.3mf', 'print-holder-v1', 'holder v1 打印参考', 'holder v1 print reference', ['ring-support']],
    ['layer1.3mf', 'print-layer-01', 'layer1 打印参考', 'layer1 print reference', ['printed-ring', 'ring-cover']],
    ['prototypev4.3mf', 'print-prototype-v4', 'prototype v4 · 当前教学打印版本', 'prototype v4 · current teaching print version', ['printed-ring', 'ring-cover']],
  ]) addSource(`打印文件/${filename}`, id, 'print', zh, en, partIds, ['step-01', 'step-04', 'step-06'], filename === 'layer1.3mf' ? 1 : undefined, { versionStatus: filename === 'prototypev4.3mf' ? 'user-selected-teaching-version' : 'print-reference-not-release-confirmed' });

  for (const [index, filename] of fs.readdirSync(path.join(source, '磁铁放置信息')).entries()) addSource(`磁铁放置信息/${filename}`, `placement-${String(index + 1).padStart(2, '0')}`, 'placement', filename, filename.includes('1736') ? '1,736 magnet coordinates' : filename.endsWith('.txt') ? '14-layer magnet placement notes' : filename.includes('边缘') ? '14-layer edge dimensions' : 'Magnet-layout source reference', ['magnet-cube'], ['step-03', 'step-09']);
  addSource('M3螺丝尺寸.png', 'fastener-m3-reference', 'fastener-reference', 'M3 螺丝参考图（长度待确认）', 'M3 screw reference (length to confirm)', ['short-screw'], ['step-05'], undefined, { versionStatus: 'reference-thread-confirmed-length-pending', referenceNoteZh: '原图标记 M3×18；M3 螺纹已确认，实际长度尚未确认。', referenceNoteEn: 'The supplied image is labeled M3×18. M3 thread is confirmed; the installed length remains unconfirmed.' });
  for (const [filename, id, zh, en, partIds, stepIds] of [
    ['l-bracket.svg', 'fastener-l-bracket-diagram', '铝型材 L 型角码示意', 'Aluminum-frame L-bracket diagram', ['frame-l-bracket', 'aluminum-frame'], ['step-08']],
    ['m3-hardware.svg', 'fastener-m3-diagram', 'M3 紧固件 · 盖板与亚克力', 'M3 hardware · covers and acrylic', ['short-screw', 'm3-nut', 'ring-cover', 'acrylic'], ['step-04', 'step-05']],
    ['m6-hardware.svg', 'fastener-m6-diagram', 'M6 紧固件 · 层间连接', 'M6 hardware · inter-layer connection', ['through-rod', 'm6-nut', 'locator'], ['step-06', 'step-07', 'step-09']],
  ]) addFile({ filename: path.join(project, 'public/bom', filename), relative: `public/bom/${filename}`, url: `/bom/${filename}` }, id, 'fastener-reference', zh, en, partIds, stepIds, undefined, { versionStatus: 'schematic-thread-usage-confirmed-dimensions-pending' });

  for (const filename of fs.readdirSync(matlabDirectory).filter(f => f.endsWith('.m')).sort()) {
    const id = `matlab-${filename.replace(/\.m$/, '').toLowerCase()}`;
    addFile({ filename: path.join(matlabDirectory, filename), relative: `matlab/${filename}` }, id, 'placement', `MATLAB · ${filename}`, `MATLAB · ${filename}`, ['magnet-cube'], ['step-03', 'step-09'], undefined, { type: 'MATLAB', versionStatus: 'physics-source' });
  }
  for (const language of ['zh', 'en']) {
    const relative = `diagrams/mri-14-layer-edge-dimensions-${language}.svg`;
    addFile({ filename: path.join(project, 'public', relative), relative: `public/${relative}`, url: `/${relative}` }, `edge-dimensions-${language}`, 'placement', language === 'zh' ? '新版十四层边缘尺寸 · 中文' : '新版十四层边缘尺寸 · 英文', language === 'zh' ? '14-layer edge dimensions · Chinese' : '14-layer edge dimensions · English', ['magnet-cube'], ['step-03', 'step-09'], undefined, { versionStatus: 'derived-verified' });
  }
  return resources;
}

export function updateConfirmedHardwareMetadata(manifest) {
  manifest.rodAxes = manifest.rodAxes.map(axis => ({ ...axis, hardwareThread: 'M6', hardwareStatus: 'user-confirmed', status: 'axis-candidate-hole-diameter-pending' }));
  manifest.hardware = {
    confirmation: 'user-confirmed-thread-and-use',
    coverAcrylicBase: { thread: 'M3', partIds: ['short-screw', 'm3-nut'], lengthStatus: 'pending', quantityStatus: 'pending' },
    interLayer: { thread: 'M6', partIds: ['through-rod', 'm6-nut'], rodLengthStatus: 'pending', quantityStatus: 'pending' },
    frameBrackets: { partId: 'frame-l-bracket', dimensionsStatus: 'pending', quantityStatus: 'pending' },
  };
  const obsolete = manifest.pending.filter(item => /Screw conflict|rod specifications|Rod specifications|hardware thread/i.test(item));
  manifest.pending = [...manifest.pending.filter(item => !obsolete.includes(item)), 'M3 thread confirmed; screw length pending (CAD 2.9×16 BF versus supplied M3×18 reference)', 'M6 layer-connection thread confirmed; rod length, hole clearance and quantities pending', 'L-bracket dimensions and procurement quantities'];
  manifest.pending = [...new Set(manifest.pending)];
  return manifest;
}
