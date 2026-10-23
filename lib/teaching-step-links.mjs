/** Stable part IDs resolve to the current eleven-stage assembly lesson.
 * This module is shared by the browser data and resource generators. */
/** @type {Record<string, readonly string[]>} */
export const TEACHING_PART_STEP_IDS = {
  'magnet-cube': ['step-12', 'step-14', 'step-19'],
  'printed-ring': ['step-11', 'step-12', 'step-13', 'step-14', 'step-15', 'step-16', 'step-19', 'step-21'],
  'ring-cover': ['step-13', 'step-14', 'step-16'],
  acrylic: ['step-12', 'step-13', 'step-14', 'step-16'],
  'acrylic-clip': ['step-12', 'step-13', 'step-14', 'step-16'],
  'ring-support': ['step-17', 'step-18', 'step-19'],
  locator: ['step-20'], 'through-rod': ['step-20'], 'm6-nut': ['step-20'],
  'short-screw': ['step-13', 'step-14', 'step-16'],
  'frame-l-bracket': ['step-18'], 'aluminum-frame': ['step-18', 'step-19'],
  'extrusion-bolt': ['step-18'], 't-slot-nut': ['step-18'],
};
/** @type {Record<string, readonly string[]>} */
const legacyResourceStepIds = {
  'step-01': ['step-11', 'step-14'], 'step-02': ['step-15'],
  'step-03': ['step-12', 'step-14'], 'step-04': ['step-13', 'step-14', 'step-16'],
  'step-05': ['step-12', 'step-14'], 'step-06': ['step-17', 'step-20'],
  'step-07': ['step-20'], 'step-08': ['step-18'], 'step-09': ['step-19'],
  'step-10': ['step-12', 'step-13', 'step-14', 'step-16'],
};
/** @param {readonly string[]=} ids @param {readonly string[]=} partIds */
export function normalizeTeachingStepIds(ids = [], partIds = []) {
  const linkedSteps = new Set(partIds.flatMap(id => TEACHING_PART_STEP_IDS[id] || []));
  const candidates = ids.flatMap(id => legacyResourceStepIds[id] || [id]);
  return [...new Set(candidates.filter(id => /^step-(?:1[1-9]|2[01])$/.test(id) && (!linkedSteps.size || linkedSteps.has(id))))].sort();
}
export const normalizeLegacyResourceStepIds = normalizeTeachingStepIds;
/** @template {{id: string, titleZh: string, titleEn: string, stepIds?: string[], partIds?: string[]}} T
 * @param {T} resource */
export function normalizeTeachingResource(resource) {
  const steps = /^fastener-m3-/.test(resource.id) ? ['step-13', 'step-14', 'step-16'] : resource.stepIds;
  return { ...resource, titleZh: resource.titleZh.replaceAll('磁环', '磁层'), titleEn: resource.titleEn.replace(/\brings\b/gi, 'layers').replace(/\bring\b/gi, 'layer'), stepIds: normalizeTeachingStepIds(steps, resource.partIds) };
}
