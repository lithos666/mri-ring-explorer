import { models, ringName } from "./mri.ts";
import resources from "./teaching-resources.json" with { type: "json" };

export type Bilingual = { zh: string; en: string };
export type PartCategory = "magnet" | "printed" | "structure" | "fastener";
export type ResourceCategory = "cad" | "print" | "placement" | "fastener-reference";
export interface TeachingResource {
  id: string;
  titleZh: string;
  titleEn: string;
  type: string;
  sourceRelativePath: string;
  url: string;
  bytes: number;
  sha256: string;
  category: ResourceCategory;
  layer?: number;
  partIds?: string[];
  stepIds?: string[];
  versionStatus?: string;
}
export interface TeachingPart {
  id: string;
  name: Bilingual;
  category: PartCategory;
  quantity: number | null;
  unit: Bilingual;
  specification: Bilingual;
  note: Bilingual;
  assetIds: string[];
  stepIds: string[];
}
export interface TeachingStep {
  id: string;
  index: number;
  title: Bilingual;
  summary: Bilingual;
  action: Bilingual[];
  checks: { id: string; text: Bilingual }[];
  note?: Bilingual;
  partIds: string[];
}
const text = (zh: string, en: string): Bilingual => ({ zh, en });
export const TEACHING_ID = "io-mri-latest-assembly";
export const TEACHING_VERSION = 1;
export const TEACHING_STORAGE = {
  progress: "mri-hackathon-progress-v1",
  received: "mri-hackathon-received-v1",
  checks: "mri-hackathon-checks-v1",
} as const;
export const teachingResources: TeachingResource[] = resources as TeachingResource[];
const resourcesMatching = (pattern: RegExp, category?: ResourceCategory) => teachingResources
  .filter(resource => (!category || resource.category === category) && pattern.test(resource.sourceRelativePath))
  .map(resource => resource.id);

// All teaching quantities come from the fixed latest configuration. Lab edits
// are independent and cannot change the procurement or assembly baseline.
export const teachingRings = models.latest.rings.map(ring => ({
  id: ring.id,
  label: ringName(ring.id),
  quantity: ring.directions.length * models.latest.repeats,
  directions: ring.directions,
  radiiMM: ring.radiiMM,
}));
export const TEACHING_MAGNET_COUNT = models.latest.magnets.length;
export const teachingParts: TeachingPart[] = [
  {
    id: "magnet-cube", name: text("方块永磁铁", "Permanent-magnet cubes"), category: "magnet",
    quantity: TEACHING_MAGNET_COUNT, unit: text("块 / 台", "cubes / magnet"),
    specification: text("12 × 12 × 12 mm；14 环 × 28 列", "12 × 12 × 12 mm; 14 rings × 28 columns"),
    note: text("逐块辨认 N/S 极。材料牌号、磁化与采购公差需按实际物料确认；网页 Br 是计算输入。", "Identify N/S poles for every cube. Confirm the grade, magnetization and tolerances of the actual supply; web-model Br is a calculation input."),
    assetIds: teachingResources.filter(r => r.category === "placement").map(r => r.id), stepIds: ["step-03", "step-09"],
  },
  {
    id: "printed-ring", name: text("磁环分段底座", "Segmented ring bases"), category: "printed", quantity: null,
    unit: text("套 / 台", "sets / magnet"), specification: text("R01–R14 分层 CAD；现有打印文件按适用范围核对", "Layer-specific CAD, R01–R14; match available print files to their intended use"),
    note: text("已识别 CAD：每环 4 段底座，14 环共 56 段。正式制造清单、打印材料、填充率与公差仍需核对。", "Identified CAD: four base sectors per ring, 56 across 14 rings. Verify the released manufacturing list, print material, infill and tolerances."),
    assetIds: resourcesMatching(/layer\d+|层|底座|base|sector|ring/i).filter(id => teachingResources.find(r => r.id === id)?.category !== "placement"),
    stepIds: ["step-01", "step-02", "step-03", "step-09"],
  },
  {
    id: "ring-cover", name: text("磁环盖板", "Ring covers"), category: "printed", quantity: null,
    unit: text("件 / 台", "pieces / magnet"), specification: text("孔位与对应层底座配合", "Matched to the holes in each layer base"),
    note: text("已识别 CAD：每环 4 段盖板，14 环共 56 段。步骤 4 仅定位，步骤 5 检查亚克力后再紧固；制造数量与盖板材质仍需核对。", "Identified CAD: four cover sectors per ring, 56 across 14 rings. Position in step 4 and secure after checking the acrylic in step 5; verify manufacturing quantity and cover material."),
    assetIds: resourcesMatching(/cover|盖/i), stepIds: ["step-04", "step-05"],
  },
  {
    id: "acrylic", name: text("亚克力限位件", "Acrylic retaining pieces"), category: "structure", quantity: null,
    unit: text("件 / 台", "pieces / magnet"), specification: text("沿圆周弧形导槽装入", "Inserted along the curved circumferential guide"),
    note: text("厚度、分段数量与加工图待确认。截图中的 40° 不作为安装角度。", "Confirm thickness, segment count and machining drawings. The 40° screenshot value is not an installation angle."),
    assetIds: resourcesMatching(/acrylic|亚克力/i), stepIds: ["step-05"],
  },
  {
    id: "ring-support", name: text("磁环支撑件", "Ring supports"), category: "printed", quantity: null,
    unit: text("件 / 台", "pieces / magnet"), specification: text("左、右、下支撑与磁环缺口对位", "Left, right and lower supports aligned to ring notches"),
    note: text("以实际 CAD 和配合检查确认数量及材料，不把磁铁面间净距当成支撑厚度。", "Confirm quantities and material against CAD and fit checks; magnet-face clearance is not support thickness."),
    assetIds: resourcesMatching(/surport|support(?!_layer)|支撑/i), stepIds: ["step-06", "step-08", "step-09"],
  },
  {
    id: "locator", name: text("层间定位件", "Inter-layer locators"), category: "printed", quantity: null,
    unit: text("件 / 台", "pieces / magnet"), specification: text("核对 support_layer 源文件与装配孔轴", "Check the support_layer source and assembly axes"),
    note: text("26 mm 指相邻磁铁面之间的净距，不是该定位件的厚度。定位件尺寸与数量待核实。", "26 mm is the clear gap between adjacent magnet faces, not locator thickness. Verify locator dimensions and quantity."),
    assetIds: resourcesMatching(/support_layer|定位/i), stepIds: ["step-06", "step-09"],
  },
  {
    id: "through-rod", name: text("贯穿螺杆", "Through-rods"), category: "fastener", quantity: null,
    unit: text("根 / 台", "rods / magnet"), specification: text("沿贯穿孔轴线装入；区别于短螺丝", "Inserted along through-hole axes; distinct from short screws"),
    note: text("直径、长度、材料与数量待确认。CAD 实例数不作为采购数量。", "Confirm diameter, length, material and quantity. CAD instance counts are not procurement quantities."),
    assetIds: resourcesMatching(/rod|螺杆|长杆/i), stepIds: ["step-07", "step-09"],
  },
  {
    id: "short-screw", name: text("短螺丝", "Short screws"), category: "fastener", quantity: null,
    unit: text("个 / 台", "screws / magnet"), specification: text("规格存在冲突，采购前核实", "Conflicting specifications: verify before procurement"),
    note: text("CAD 标记 2.9×16 BF，参考图标记 M3×18；二者尚未确认等同。参考图的头径 5.2 mm、头高 1.7 mm，18 mm 不含头部。材料、数量、工具与紧固扭矩待确认。", "CAD names specify 2.9×16 BF while the reference image specifies M3×18; equivalence is unconfirmed. The reference gives a 5.2 mm head diameter and 1.7 mm head height; 18 mm excludes the head. Confirm material, count, tools and tightening torque."),
    assetIds: teachingResources.filter(r => r.category === "fastener-reference" && /螺丝|screw|M3/i.test(r.sourceRelativePath)).map(r => r.id),
    stepIds: ["step-05", "step-08", "step-09"],
  },
  {
    id: "nut", name: text("螺母与配套紧固件", "Nuts and matching hardware"), category: "fastener", quantity: null,
    unit: text("套 / 台", "sets / magnet"), specification: text("与经确认的贯穿螺杆和接口匹配", "Matched to the verified through-rods and interfaces"),
    note: text("参考图：H59 黄铜 M10，17 mm 对边、8 mm 厚；商品 10 个装不是每台数量。与长杆的螺纹匹配、垫片配置及每台数量待确认。", "Reference image: H59 brass M10, 17 mm across flats and 8 mm thick. A pack of 10 is not the quantity per magnet. Confirm rod thread compatibility, washer configuration and quantity per magnet."),
    assetIds: resourcesMatching(/nut|螺母/i), stepIds: ["step-07", "step-09"],
  },
  {
    id: "aluminum-frame", name: text("铝型材框架", "Aluminum profile frame"), category: "structure", quantity: null,
    unit: text("套 / 台", "sets / magnet"), specification: text("预装框架；与三处支撑接口核对", "Preassembled frame; verify the three support interfaces"),
    note: text("型材规格、切割长度、连接件和数量待确认；框架在步骤 8 前准备。", "Confirm profiles, cut lengths, connectors and quantities; prepare the frame before step 8."),
    assetIds: resourcesMatching(/frame|框架|new_genneration/i), stepIds: ["step-08", "step-09"],
  },
];

// The audited resource catalog owns file-to-part relationships. A filename
// such as support_layer must not be interpreted as a ring-base file.
for (const part of teachingParts) {
  part.assetIds = teachingResources.filter(resource => resource.partIds?.includes(part.id)).map(resource => resource.id);
}

export const teachingSteps: TeachingStep[] = [
  {
    id: "step-01", index: 1, title: text("拼接扇形底座", "Join the sectors"),
    summary: text("从一个接口开始，理解卡扣与导槽怎样在环平面内滑合。", "Start with one interface and see how the clip and guide join within the ring plane."),
    action: [text("选定当前环的扇形底座，辨认内缘、外缘和接口。", "Identify the inner edge, outer edge and interfaces of the selected layer's sectors."), text("先对齐卡扣和导槽，再沿环平面内的配合路径滑合。", "Align the clip and guide before sliding along the mating path in the ring plane.")],
    checks: [{ id: "step-01-interface", text: text("卡扣与导槽对应，接口贴合且无强行挤压。", "The clip matches its guide; the interface seats without forced compression.") }],
    note: text("动画用于识别配合关系，实际操作需核对打印件公差与夹具。", "The animation explains the mating relationship; verify print tolerances and fixtures for actual work."), partIds: ["printed-ring"],
  },
  {
    id: "step-02", index: 2, title: text("闭合完整磁环", "Close the ring"),
    summary: text("把两个半环合为一环，核对最后两处接口和内外缘导槽。", "Join the two half-rings and check the last two interfaces and both edge guides."),
    action: [text("确认两个半环属于同一层，并统一正反面。", "Verify that both half-rings belong to the same layer and share the same face orientation."), text("对齐最后两处接口，使内外缘槽缝连续，再检查整环平整度。", "Align the final two interfaces, continue the inner and outer grooves, and check ring flatness.")],
    checks: [{ id: "step-02-seams", text: text("两个闭合接口均到位，内外缘槽缝连续。", "Both closing joints are seated and the inner and outer guides are continuous.") }], partIds: ["printed-ring"],
  },
  {
    id: "step-03", index: 3, title: text("装入磁铁", "Load the magnets"),
    summary: text("先核对一列独立方块的 N/S 与径向顺序，再扩展到 28 列。", "Check N/S polarity and radial order in one column of separate cubes, then repeat over 28 columns."),
    action: [text("选择 R01–R14 中当前要装配的环，按该环初始排布逐块检查磁化方向。", "Select the ring to assemble and check each cube against that ring's initial magnetization sequence."), text("从内到外装入独立的 12 mm 方块；长条示意由多颗磁铁组成。", "Place separate 12 mm cubes from inner to outer positions; a drawn bar represents multiple magnets."), text("按 28 列完成整环；R05–R10 的混合方向逐层核对。", "Complete all 28 columns; verify the mixed directions in R05–R10 layer by layer.")],
    checks: [{ id: "step-03-poles", text: text("每块 N/S 与选定环的径向顺序一致。", "Every cube's N/S orientation matches the selected ring's radial sequence.") }, { id: "step-03-columns", text: text("28 列齐全，方块数量与当前环清单一致。", "All 28 columns are present and the cube count matches the selected ring.") }],
    note: text("教学采用初始排布；实验台里的自定义方向不会改动这里。实际装配的磁铁约束、装载顺序和夹具需另行确认。", "Teaching uses the initial layout; custom Lab directions do not change it. Confirm physical restraint, loading order and fixtures separately."), partIds: ["magnet-cube", "printed-ring"],
  },
  {
    id: "step-04", index: 4, title: text("定位盖板", "Position the cover"),
    summary: text("对齐孔位并下降到位，此时保持未锁紧。", "Align the holes and lower the cover into position, leaving it unfastened."),
    action: [text("辨认盖板正反面，使孔位与当前环对应。", "Identify the cover faces and match its holes to the selected ring."), text("从悬空位置对齐后下降，检查磁铁与盖板之间的干涉。", "Align above the ring, lower the cover and inspect for interference with the magnets.")],
    checks: [{ id: "step-04-holes", text: text("孔位吻合、盖板平整；暂未锁紧。", "The holes align and the cover is flat; it remains unfastened.") }], partIds: ["ring-cover", "printed-ring"],
  },
  {
    id: "step-05", index: 5, title: text("滑入亚克力并锁紧", "Slide acrylic and secure"),
    summary: text("沿弧形导槽进入，透过亚克力检查后再紧固盖板。", "Slide along the curved guide, inspect through the acrylic, then secure the cover."),
    action: [text("使亚克力与圆周弧形导槽匹配，沿导槽进入，不径向穿过磁铁。", "Match the acrylic to the circumferential curved guide and slide along it, without passing radially through magnets."), text("透过透明件检查限位与磁铁位置，再按已确认工艺紧固盖板。", "Inspect retention and magnet positions through the transparent piece, then secure the cover using the verified procedure.")],
    checks: [{ id: "step-05-guide", text: text("亚克力完整进入导槽，磁铁位置与限位可见。", "The acrylic seats in the guide and magnet placement and retention are visible.") }, { id: "step-05-fastener", text: text("实际螺丝规格和紧固要求已核实。", "The actual screw specification and fastening requirements have been verified.") }],
    note: text("蓝色悬浮层仅说明圆周滑动，实际亚克力 CAD、厚度与到位层位待确认。40° 是截图视角信息，不是安装角度；紧固扭矩尚无确认值。", "The floating blue layer explains circumferential sliding only; actual acrylic CAD, thickness and seating remain unconfirmed. 40° describes the screenshot view, not an installation angle; no tightening torque has been confirmed."), partIds: ["acrylic", "ring-cover", "short-screw"],
  },
  {
    id: "step-06", index: 6, title: text("安装支撑与定位件", "Fit supports and locators"),
    summary: text("核对左、右、下三处支撑与层间定位接口。", "Check the left, right and lower support interfaces and the inter-layer locators."),
    action: [text("将左、右、下支撑与磁环缺口对应，检查支撑朝向。", "Match the left, right and lower supports to ring notches and check their orientation."), text("识别层间定位件及贯穿孔，核对与下一层的配合关系。", "Identify the inter-layer locators and through-holes, and check the relationship to the next layer.")],
    checks: [{ id: "step-06-support", text: text("三处支撑对位，定位件与贯穿孔轴线一致。", "All three supports align; locators and through-hole axes correspond.") }],
    note: text("26 mm 是磁铁面间净距，不能用于推断支撑或定位件厚度。", "26 mm is the magnet-face clearance and cannot establish support or locator thickness."), partIds: ["ring-support", "locator"],
  },
  {
    id: "step-07", index: 7, title: text("安装贯穿螺杆", "Insert the through-rods"),
    summary: text("沿贯穿孔轴线插入长杆，区分短螺丝与端部紧固件。", "Insert the long rods along through-hole axes, distinguishing short screws and end hardware."),
    action: [text("确认贯穿螺杆、短螺丝及螺母的实际规格与用途。", "Confirm the actual specifications and roles of through-rods, short screws and nuts."), text("对齐孔轴线后插入贯穿螺杆，检查定位件与后续层的空间。", "Align the hole axes, insert the rods and check space for locators and subsequent layers.")],
    checks: [{ id: "step-07-axes", text: text("长杆贯穿孔轴正确，长度与端部配置已核实。", "Rod axes align with through-holes; rod lengths and end hardware are verified.") }],
    note: text("长杆与短螺丝不是同一物料；未确认的长度、数量和紧固配置不由动画推定。", "Long rods and short screws are different parts; animation does not establish unverified lengths, quantities or fastening configurations."), partIds: ["through-rod", "nut"],
  },
  {
    id: "step-08", index: 8, title: text("放入铝型材框架", "Mount in the frame"),
    summary: text("把已准备的框架与三处支撑接口联系起来。", "Relate the prepared frame to the three support interfaces."),
    action: [text("提前准备铝型材框架，并核实与支撑接口的安装空间。", "Prepare the aluminum frame and verify installation space at the support interfaces."), text("定位磁环组件，检查左、右、下支撑的接触和固定关系。", "Position the ring assembly and inspect contact and fastening at the left, right and lower supports.")],
    checks: [{ id: "step-08-frame", text: text("三处支撑对应框架接口，固定配置已核实。", "All three supports match the frame interfaces and fastening is verified.") }],
    note: text("图中框架表达接口关系；型材切割清单与连接件规格仍需确认。", "The frame view explains interfaces; profile cut lists and connector specifications still require confirmation."), partIds: ["aluminum-frame", "ring-support", "short-screw"],
  },
  {
    id: "step-09", index: 9, title: text("完成十四层装配", "Complete all fourteen layers"),
    summary: text("沿共同中心轴依次定位 R01–R14，展开检查层号与磁化方向。", "Position R01–R14 along the common axis and use the exploded view to check layer IDs and magnetization."),
    action: [text("按 R01–R14 顺序逐层定位，核对层间定位件和支撑配合。", "Position layers in R01–R14 order, checking locators and support fit between layers."), text("逐环核对磁铁数量与初始方向，再进行整体外观和连接检查。", "Check each ring's magnet count and initial directions, then inspect the complete assembly and connections.")],
    checks: [{ id: "step-09-order", text: text("14 层顺序正确，每环 28 列，合计 1,736 块磁铁。", "All 14 layers are in order, with 28 columns per ring and 1,736 magnets in total.") }, { id: "step-09-final", text: text("磁化、约束、定位与紧固完成实际检查并记录。", "Actual magnetization, restraint, positioning and fastening checks have been performed and recorded.") }],
    note: text("完成主磁体装配不等于完成 MRI 成像系统；梯度、RF、电子学与实测验证在原理与实验中继续学习。", "Completing the main magnet does not complete an MRI imaging system; continue with gradients, RF, electronics and measured validation in Principles & Lab."),
    partIds: ["printed-ring", "magnet-cube", "locator", "ring-support", "through-rod", "aluminum-frame"],
  },
];
export const partById = new Map(teachingParts.map(part => [part.id, part]));
export const stepById = new Map(teachingSteps.map(step => [step.id, step]));
export const resourceById = new Map(teachingResources.map(resource => [resource.id, resource]));

export interface TeachingProgress {
  schemaVersion: 1;
  tutorialId: typeof TEACHING_ID;
  currentStep: number;
  currentRing: number;
  completedStepIds: string[];
}
export const initialProgress = (): TeachingProgress => ({ schemaVersion: 1, tutorialId: TEACHING_ID, currentStep: 1, currentRing: 1, completedStepIds: [] });
export function validateProgress(value: unknown): TeachingProgress | null {
  if (!value || typeof value !== "object") return null;
  const doc = value as Record<string, unknown>;
  if (doc.schemaVersion !== TEACHING_VERSION || doc.tutorialId !== TEACHING_ID || !Array.isArray(doc.completedStepIds)) return null;
  return { schemaVersion: 1, tutorialId: TEACHING_ID, currentStep: typeof doc.currentStep === "number" && Number.isInteger(doc.currentStep) && doc.currentStep >= 1 && doc.currentStep <= 9 ? doc.currentStep : 1, currentRing: typeof doc.currentRing === "number" && Number.isInteger(doc.currentRing) && doc.currentRing >= 1 && doc.currentRing <= 14 ? doc.currentRing : 1, completedStepIds: [...new Set(doc.completedStepIds.filter((id): id is string => typeof id === "string" && stepById.has(id)))] };
}
export function validateStoredIds(value: unknown, allowed: Set<string>): string[] | null {
  if (!value || typeof value !== "object") return null;
  const doc = value as Record<string, unknown>;
  if (doc.schemaVersion !== TEACHING_VERSION || doc.tutorialId !== TEACHING_ID || !Array.isArray(doc.ids)) return null;
  return [...new Set(doc.ids.filter((id): id is string => typeof id === "string" && allowed.has(id)))];
}
export function bomCSV(language: "zh" | "en", receivedIds: string[]): string {
  const headers = language === "zh" ? ["物料ID", "物料", "数量/台", "单位", "规格", "已核对收料", "说明", "装配阶段"] : ["Part ID", "Part", "Quantity per magnet", "Unit", "Specification", "Receipt checked", "Notes", "Assembly steps"];
  const pending = language === "zh" ? "待确认" : "To confirm";
  const escape = (value: unknown) => '"' + String(value).replace(/"/g, '""') + '"';
  return "\uFEFF" + [headers, ...teachingParts.map(part => [part.id, part.name[language], part.quantity ?? pending, part.unit[language], part.specification[language], receivedIds.includes(part.id) ? (language === "zh" ? "是" : "Yes") : (language === "zh" ? "否" : "No"), part.note[language], part.stepIds.map(id => stepById.get(id)?.index).join(" / ")])].map(row => row.map(escape).join(",")).join("\r\n");
}
export const teachingReferences = [
  { title: text("IO 磁环研究", "IO-ring research"), note: text("径向磁化、离散磁块与轴向主场。", "Radial magnetization, discrete blocks and the axial main field."), url: "https://arxiv.org/html/2411.03249v1" },
  { title: text("MagTetris", "MagTetris"), note: text("开源有限磁块磁场与磁化表达。", "Open-source finite-block fields and magnetization conventions."), url: "https://github.com/BioMed-EM-Lab/MagTetris" },
  { title: text("OSI² ONE", "OSI² ONE"), note: text("继续了解开源 MRI 系统的完整构成。", "Explore the complete system behind open-source MRI."), url: "https://www.opensourceimaging.org/project/osii-one/" },
];
