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
  visibility: "resources" | "bom" | "hidden";
  updateStatus: "current" | "pending-update";
}
export interface TeachingPart {
  id: string;
  name: Bilingual;
  category: PartCategory;
  quantity: number | null;
  unit: Bilingual;
  specification: Bilingual;
  material: Bilingual;
  note: Bilingual;
  assetIds: string[];
  stepIds: string[];
  image?: { src: string; alt: Bilingual; kind: "illustration" | "reference" };
}
export interface TeachingStep {
  id: string;
  index: number;
  // Animation phases retain their original identities when the visible order changes.
  sceneStep: number;
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
    id: "magnet-cube", name: text("N52 钕铁硼方块永磁铁", "N52 grade NdFeB permanent-magnet cubes"), category: "magnet",
    quantity: TEACHING_MAGNET_COUNT, unit: text("块 / 台", "cubes / magnet"),
    specification: text("12 × 12 × 12 mm；14 环 × 28 列", "12 × 12 × 12 mm; 14 rings × 28 columns"),
    material: text("N52 牌号钕铁硼（NdFeB）", "N52 grade neodymium–iron–boron (NdFeB)"),
    note: text("逐块辨认 N/S 极，按对应磁环排布装填。网页 Br = 1.43 T 是现有计算输入；材料牌号标识不会自动改变它。实际磁化与采购公差按供应物料核对。", "Identify N/S poles and load each cube to its ring layout. Br = 1.43 T remains the existing calculation input; adding the grade label does not change it. Check magnetization and procurement tolerances against the supplied magnets."),
    assetIds: teachingResources.filter(r => r.category === "placement").map(r => r.id), stepIds: ["step-03", "step-09"],
  },
  {
    id: "printed-ring", name: text("分段磁铁壳体", "Segmented magnet housing"), category: "printed", quantity: null,
    unit: text("套 / 台", "sets / magnet"), specification: text("R01–R14 分层 CAD；现有打印文件按适用范围核对", "Layer-specific CAD, R01–R14; match available print files to their intended use"),
    material: text("PLA（当前打印文件设置；实际制造材料待确认）", "PLA (current print-file setting; actual manufacturing material to confirm)"),
    note: text("容纳每层的径向磁铁列。CAD 每环有 4 段壳体，14 环共 56 段；正式制造清单、填充率与公差仍需核对。", "Holds each layer's radial magnet columns. CAD contains four housing sectors per ring, 56 across 14 rings; verify the released manufacturing list, infill and tolerances."),
    assetIds: resourcesMatching(/layer\d+|层|底座|base|sector|ring/i).filter(id => teachingResources.find(r => r.id === id)?.category !== "placement"),
    stepIds: ["step-01", "step-02", "step-03", "step-09"],
  },
  {
    id: "ring-cover", name: text("壳体盖板", "Housing cap"), category: "printed", quantity: null,
    unit: text("件 / 台", "pieces / magnet"), specification: text("孔位与对应层底座配合", "Matched to the holes in each layer base"),
    material: text("PLA（当前打印文件设置；实际制造材料待确认）", "PLA (current print-file setting; actual manufacturing material to confirm)"),
    note: text("定位并封盖磁铁壳体。CAD 每环有 4 段盖板，14 环共 56 段；阶段 4 定位，阶段 5 检查透明盖板后用 M3 螺丝紧固。制造数量仍需核对。", "Positions and closes the magnet housing. CAD contains four cap sectors per ring, 56 across 14 rings; position in stage 4 and secure with M3 screws after checking the clear cover in stage 5. Verify manufacturing quantities."),
    assetIds: resourcesMatching(/cover|盖/i), stepIds: ["step-04", "step-05"],
  },
  {
    id: "acrylic", name: text("透明盖板", "Clear cover"), category: "structure", quantity: null,
    unit: text("件 / 台", "pieces / magnet"), specification: text("沿圆周弧形导槽装入", "Inserted along the curved circumferential guide"),
    material: text("亚克力（PMMA）", "Acrylic (PMMA)"),
    note: text("厚度、分段数量与加工图待确认。截图中的 40° 不作为安装角度。", "Confirm thickness, segment count and machining drawings. The 40° screenshot value is not an installation angle."),
    assetIds: resourcesMatching(/acrylic|亚克力/i), stepIds: ["step-05"],
  },
  {
    id: "ring-support", name: text("框架安装支撑", "Frame mounting supports"), category: "printed", quantity: null,
    unit: text("件 / 台", "pieces / magnet"), specification: text("左、右、下支撑与磁环缺口对位", "Left, right and lower supports aligned to ring notches"),
    material: text("PLA（当前打印文件设置；实际制造材料待确认）", "PLA (current print-file setting; actual manufacturing material to confirm)"),
    note: text("位于磁环左、右及下方，连接磁环与铝型材导轨，提供安装支撑。按 CAD 和实物配合核对数量；磁铁面间净距不能当成支撑厚度。", "Located at the left, right and underside of the ring, these supports connect the ring to the aluminium extrusion rails. Verify quantities against CAD and fit checks; magnet-face clearance is not support thickness."),
    assetIds: resourcesMatching(/surport|support(?!_layer)|支撑/i), stepIds: ["step-06", "step-08", "step-09"],
  },
  {
    id: "locator", name: text("层间隔块", "Inter-layer spacers"), category: "printed", quantity: null,
    unit: text("件 / 台", "pieces / magnet"), specification: text("核对 support_layer 源文件与装配孔轴", "Check the support_layer source and assembly axes"),
    material: text("PETG（当前打印文件设置；实际制造材料待确认）", "PETG (current print-file setting; actual manufacturing material to confirm)"),
    note: text("位于相邻层组件之间，维持层间定位与间隔，配合贯穿孔轴线。26 mm 指磁铁面间净距，不是隔块厚度；隔块尺寸及数量待核实。", "Located between adjacent layer assemblies, these spacers maintain layer separation and registration around the through-hole axes. The 26 mm magnet-face gap is not spacer thickness; verify spacer dimensions and quantities."),
    assetIds: resourcesMatching(/support_layer|定位/i), stepIds: ["step-06", "step-09"],
  },
  {
    id: "through-rod", name: text("贯穿螺杆", "Through-rods"), category: "fastener", quantity: null,
    unit: text("根 / 台", "rods / magnet"), specification: text("M6；十四层安装完成后沿贯穿孔装入", "M6; insert through aligned holes after all fourteen layers are mounted"),
    material: text("待确认", "To confirm"),
    note: text("已确认层间使用 M6。杆长、材料与每台数量待确认；CAD 候选孔轴及动画不等于采购清单。", "M6 is confirmed for inter-layer fastening. Confirm rod lengths, material and quantity per magnet; CAD candidate axes and animation are not a procurement list."),
    assetIds: resourcesMatching(/rod|螺杆|长杆/i), stepIds: ["step-07"],
  },
  {
    id: "short-screw", name: text("M3 短螺丝", "M3 short screws"), category: "fastener", quantity: null,
    unit: text("个 / 台", "screws / magnet"), specification: text("M3；紧固壳体盖板、透明盖板与壳体", "M3; fastens the housing cap, clear cover and housing"),
    material: text("待确认", "To confirm"),
    note: text("已确认该连接使用 M3。螺丝长度、材料、数量、工具与扭矩待确认。旧 CAD 标记 2.9×16 BF，仅保留其展示外形；M3×18 参考图不等于已确认的安装长度。", "M3 is confirmed for this connection. Confirm screw length, material, quantity, tools and torque. The older CAD label 2.9×16 BF supplies display geometry only; the M3×18 reference does not confirm installation length."),
    assetIds: teachingResources.filter(r => r.category === "fastener-reference" && /螺丝|screw|M3/i.test(r.sourceRelativePath)).map(r => r.id),
    stepIds: ["step-05"],
  },
  {
    id: "m6-nut", name: text("M6 螺母", "M6 nuts"), category: "fastener", quantity: null,
    unit: text("个 / 台", "nuts / magnet"), specification: text("M6；层间连接与贯穿螺杆紧固", "M6; inter-layer connections and through-rod fastening"),
    material: text("待确认", "To confirm"),
    note: text("螺纹规格和层间用途已确认。十四层安装后再完成贯穿杆紧固；螺母形式、材料、垫片、数量及扭矩待确认。", "Thread size and inter-layer use are confirmed. Fasten through-rods after mounting all fourteen layers; confirm nut type, material, washers, quantity and torque."),
    assetIds: [], stepIds: ["step-07", "step-09"],
  },
  {
    id: "frame-l-bracket", name: text("铝型材 L 型角码", "Aluminum-frame L-brackets"), category: "structure", quantity: null,
    unit: text("件 / 台", "brackets / magnet"), specification: text("连接铝型材框架的直角接口", "Connects right-angle joints in the aluminum profile frame"),
    material: text("待确认", "To confirm"),
    note: text("按实际型材和安装位置选择角码及配套连接件；型号、孔距、材料和每台数量待确认。模型中的角码数量仅用于说明连接关系。", "Match brackets and associated hardware to the actual profiles and mounting positions. Confirm type, hole spacing, material and quantity per magnet. Rendered bracket counts illustrate joint relationships only."),
    assetIds: [], stepIds: ["step-08"],
  },
  {
    id: "aluminum-frame", name: text("铝型材框架", "Aluminum profile frame"), category: "structure", quantity: null,
    unit: text("套 / 台", "sets / magnet"), specification: text("预装框架；与三处支撑接口核对", "Preassembled frame; verify the three support interfaces"),
    material: text("铝；具体合金牌号待确认", "Aluminium; alloy grade to confirm"),
    note: text("型材规格、切割长度、连接件和数量待确认；在步骤 7 放入磁环前预装框架，并核对 L 型角码连接。", "Confirm profiles, cut lengths, connectors and quantities. Preassemble the frame before mounting the ring in step 7 and check the L-bracket joints."),
    assetIds: resourcesMatching(/frame|框架|new_genneration/i), stepIds: ["step-08", "step-09"],
  },
  {
    id: "extrusion-bolt", name: text("铝型材连接螺栓", "Extrusion mounting bolts"), category: "fastener", quantity: null,
    unit: text("个 / 台", "bolts / magnet"), specification: text("配合角码与 T 型槽螺母连接铝型材", "Connects extrusion joints with L-brackets and T-slot nuts"),
    material: text("待确认", "To confirm"),
    note: text("用于铝型材框架的安装连接。螺纹、长度、头型和数量按实际型材与角码确认；层间连接的 M6 不作为这里的默认规格。", "Used to assemble the aluminium extrusion frame. Confirm thread, length, head type and quantity for the actual extrusions and brackets; the inter-layer M6 size does not set this specification."),
    assetIds: [], stepIds: ["step-08"],
  },
  {
    id: "t-slot-nut", name: text("T 型槽螺母", "T-slot nuts"), category: "fastener", quantity: null,
    unit: text("个 / 台", "nuts / magnet"), specification: text("装入铝型材 T 型槽，与连接螺栓配合", "Fits the aluminium extrusion T-slot and mates with the mounting bolt"),
    material: text("待确认", "To confirm"),
    note: text("在型材槽内提供螺纹连接。槽系列、螺纹、螺母类型和数量需与实际型材及连接螺栓匹配。", "Provides a threaded connection inside the extrusion slot. Match the slot series, thread, nut type and quantity to the actual extrusions and mounting bolts."),
    assetIds: [], stepIds: ["step-08"],
  },
];

// The audited resource catalog owns file-to-part relationships. A filename
// such as support_layer must not be interpreted as a ring-base file.
for (const part of teachingParts) {
  part.assetIds = teachingResources.filter(resource => resource.partIds?.includes(part.id)).map(resource => resource.id);
  const imageIds: Record<string, string> = { "m6-nut": "m6-hardware", "frame-l-bracket": "l-bracket" };
  part.image = { src: `/bom/${imageIds[part.id] ?? part.id}.svg`, alt: text(`${part.name.zh}的用途示意图`, `Illustration of ${part.name.en.toLowerCase()} and their purpose`), kind: "illustration" };
}
const shortScrewPart = teachingParts.find(part => part.id === "short-screw");
const shortScrewReference = teachingResources.find(resource => resource.id === "fastener-m3-reference");
if (shortScrewPart && shortScrewReference) shortScrewPart.image = { src: shortScrewReference.url, alt: text("M3×18 螺丝原始参考图；实际安装长度待确认", "Original M3×18 screw reference; installation length remains to be confirmed"), kind: "reference" };

export const teachingSteps: TeachingStep[] = [
  {
    id: "step-01", index: 1, sceneStep: 1, title: text("拼接扇形壳体", "Join the sectors"),
    summary: text("从一个接口开始，理解卡扣与导槽怎样在环平面内滑合。", "Start with one interface and see how the clip and guide join within the ring plane."),
    action: [text("选定当前环的扇形壳体，辨认内缘、外缘和接口。", "Identify the inner edge, outer edge and interfaces of the selected layer's sectors."), text("先对齐卡扣和导槽，再沿环平面内的配合路径滑合。", "Align the clip and guide before sliding along the mating path in the ring plane.")],
    checks: [{ id: "step-01-interface", text: text("卡扣与导槽对应，接口贴合且无强行挤压。", "The clip matches its guide; the interface seats without forced compression.") }],
    note: text("动画用于识别配合关系，实际操作需核对打印件公差与夹具。", "The animation explains the mating relationship; verify print tolerances and fixtures for actual work."), partIds: ["printed-ring"],
  },
  {
    id: "step-02", index: 2, sceneStep: 2, title: text("闭合完整磁环", "Close the ring"),
    summary: text("把两个半环合为一环，核对最后两处接口和内外缘导槽。", "Join the two half-rings and check the last two interfaces and both edge guides."),
    action: [text("确认两个半环属于同一层，并统一正反面。", "Verify that both half-rings belong to the same layer and share the same face orientation."), text("对齐最后两处接口，使内外缘槽缝连续，再检查整环平整度。", "Align the final two interfaces, continue the inner and outer grooves, and check ring flatness.")],
    checks: [{ id: "step-02-seams", text: text("两个闭合接口均到位，内外缘槽缝连续。", "Both closing joints are seated and the inner and outer guides are continuous.") }], partIds: ["printed-ring"],
  },
  {
    id: "step-03", index: 3, sceneStep: 3, title: text("装入磁铁", "Load the magnets"),
    summary: text("先核对一列独立方块的 N/S 与径向顺序，再扩展到 28 列。", "Check N/S polarity and radial order in one column of separate cubes, then repeat over 28 columns."),
    action: [text("选择 R01–R14 中当前要装配的环，按该环初始排布逐块检查磁化方向。", "Select the ring to assemble and check each cube against that ring's initial magnetization sequence."), text("从内到外装入独立的 12 mm 方块；长条示意由多颗磁铁组成。", "Place separate 12 mm cubes from inner to outer positions; a drawn bar represents multiple magnets."), text("按 28 列完成整环；R05–R10 的混合方向逐层核对。", "Complete all 28 columns; verify the mixed directions in R05–R10 layer by layer.")],
    checks: [{ id: "step-03-poles", text: text("每块 N/S 与选定环的径向顺序一致。", "Every cube's N/S orientation matches the selected ring's radial sequence.") }, { id: "step-03-columns", text: text("28 列齐全，方块数量与当前环清单一致。", "All 28 columns are present and the cube count matches the selected ring.") }],
    note: text("教学采用初始排布；实验台里的自定义方向不会改动这里。实际装配的磁铁约束、装载顺序和夹具需另行确认。", "Teaching uses the initial layout; custom Lab directions do not change it. Confirm physical restraint, loading order and fixtures separately."), partIds: ["magnet-cube", "printed-ring"],
  },
  {
    id: "step-04", index: 4, sceneStep: 4, title: text("定位壳体盖板", "Position the housing cap"),
    summary: text("对齐孔位并下降到位，此时保持未锁紧。", "Align the holes and lower the cover into position, leaving it unfastened."),
    action: [text("辨认盖板正反面，使孔位与当前环对应。", "Identify the cover faces and match its holes to the selected ring."), text("从悬空位置对齐后下降，检查磁铁与盖板之间的干涉。", "Align above the ring, lower the cover and inspect for interference with the magnets.")],
    checks: [{ id: "step-04-holes", text: text("孔位吻合、盖板平整；暂未锁紧。", "The holes align and the cover is flat; it remains unfastened.") }], partIds: ["ring-cover", "printed-ring"],
  },
  {
    id: "step-05", index: 5, sceneStep: 5, title: text("滑入透明盖板并锁紧", "Slide clear cover and secure"),
    summary: text("沿弧形导槽进入，透过亚克力检查后再紧固盖板。", "Slide along the curved guide, inspect through the acrylic, then secure the cover."),
    action: [text("使透明盖板与圆周弧形导槽匹配，沿导槽进入，不径向穿过磁铁。", "Match the clear cover to the circumferential curved guide and slide along it, without passing radially through magnets."), text("透过透明盖板检查限位与磁铁位置，再用 M3 螺丝紧固壳体盖板、透明盖板与壳体。", "Inspect retention and magnet positions through the clear cover, then fasten the housing cap, clear cover and housing with M3 screws.")],
    checks: [{ id: "step-05-guide", text: text("亚克力完整进入导槽，磁铁位置与限位可见。", "The acrylic seats in the guide and magnet placement and retention are visible.") }, { id: "step-05-fastener", text: text("实际螺丝规格和紧固要求已核实。", "The actual screw specification and fastening requirements have been verified.") }],
    note: text("已确认此处使用 M3 螺丝。蓝色悬浮层仅说明圆周滑动，透明盖板的实际 CAD、厚度与到位层位待确认。40° 是截图视角信息，不是安装角度；螺丝长度和扭矩待确认。", "M3 screws are confirmed here. The floating blue layer explains circumferential sliding only; actual clear-cover CAD, thickness and seating remain unconfirmed. 40° describes the screenshot view, not an installation angle; screw lengths and torque await confirmation."), partIds: ["acrylic", "ring-cover", "short-screw"],
  },
  {
    id: "step-06", index: 6, sceneStep: 6, title: text("安装框架支撑与层间隔块", "Fit mounting supports and spacers"),
    summary: text("核对左、右、下三处框架安装支撑与层间隔块接口。", "Check the left, right and lower mounting-support interfaces and the inter-layer spacers."),
    action: [text("将框架安装支撑与磁环左、右、下方缺口对应，检查支撑朝向。", "Match the mounting supports to the left, right and lower ring notches and check their orientation."), text("识别相邻层组件之间的层间隔块及贯穿孔，核对与下一层的配合关系。", "Identify the spacers between adjacent layer assemblies and the through-holes, and check the relationship to the next layer.")],
    checks: [{ id: "step-06-support", text: text("三处支撑对位，定位件与贯穿孔轴线一致。", "All three supports align; spacers and through-hole axes correspond.") }],
    note: text("26 mm 是磁铁面间净距，不能用于推断支撑或定位件厚度。", "26 mm is the magnet-face clearance and cannot establish support or spacer thickness."), partIds: ["ring-support", "locator"],
  },
  {
    id: "step-07", index: 9, sceneStep: 7, title: text("最后安装贯穿螺杆", "Insert the through-rods last"),
    summary: text("十四层全部装到框架后，再沿对齐的贯穿孔插入 M6 螺杆并紧固。", "After mounting all fourteen layers in the frame, insert the M6 through-rods along the aligned holes and fasten them."),
    action: [text("先确认 R01–R14 已全部安装到框架，支撑与层间隔块均到位，贯穿孔轴线连续。", "First confirm that R01–R14 are all mounted in the frame, supports and inter-layer spacers are seated, and the through-hole axes line up."), text("沿已对齐的孔轴插入 M6 贯穿螺杆；用 M6 螺母按确认工艺紧固，再完成最终检查。", "Insert the M6 through-rods along the aligned axes; fasten with M6 nuts using the confirmed procedure, then perform the final inspection.")],
    checks: [{ id: "step-07-axes", text: text("十四层已装到框架；M6 长杆沿正确轴线贯穿，杆长与端部配置已核实。", "All fourteen layers are mounted in the frame; M6 rods pass along the correct axes, with rod lengths and end hardware verified.") }, { id: "step-07-final", text: text("所有层的约束、定位与最终紧固均已完成实物检查并记录。", "Restraint, positioning and final fastening of every layer have been physically checked and recorded.") }],
    note: text("这是最后一个装配阶段。M6 用于层间连接，M3 用于上盖、亚克力与下盖；杆长、数量、材料和扭矩仍按实际配置确认。完成主磁体不等于完成 MRI 成像系统。", "This is the final assembly stage. M6 is used between layers; M3 secures the upper cover, acrylic and lower cover. Confirm rod lengths, quantities, material and torque against the actual configuration. A completed main magnet is not yet a complete MRI imaging system."), partIds: ["through-rod", "m6-nut"],
  },
  {
    id: "step-08", index: 7, sceneStep: 8, title: text("放入铝型材框架", "Mount in the frame"),
    summary: text("把已准备的框架与三处支撑接口联系起来。", "Relate the prepared frame to the three support interfaces."),
    action: [text("提前准备铝型材框架，核对 L 型角码、连接螺栓与 T 型槽螺母，并核实支撑接口的安装空间。", "Prepare the aluminium frame, check its L-brackets, mounting bolts and T-slot nuts, and verify installation space at the support interfaces."), text("定位磁环组件，检查左、右、下框架安装支撑的接触和固定关系；此时尚不插入贯穿螺杆。", "Position the ring assembly and inspect contact and fastening at the left, right and lower mounting supports; do not insert the through-rods yet.")],
    checks: [{ id: "step-08-frame", text: text("三处支撑对应框架接口，固定配置已核实。", "All three supports match the frame interfaces and fastening is verified.") }],
    note: text("图中框架表达接口关系；型材切割清单、L 型角码数量、连接螺栓与 T 型槽螺母规格仍需确认。", "The frame view explains interfaces; profile cut lists, L-bracket quantities, mounting-bolt and T-slot-nut specifications still require confirmation."), partIds: ["aluminum-frame", "frame-l-bracket", "extrusion-bolt", "t-slot-nut", "ring-support"],
  },
  {
    id: "step-09", index: 8, sceneStep: 9, title: text("安装全部十四层", "Mount all fourteen layers"),
    summary: text("沿共同中心轴依次定位 R01–R14，展开检查层号与磁化方向。", "Position R01–R14 along the common axis and use the exploded view to check layer IDs and magnetization."),
    action: [text("按 R01–R14 顺序把全部磁环安装到框架，核对层间隔块和支撑配合。", "Mount all rings in the frame in R01–R14 order, checking inter-layer spacers and support fit."), text("逐环核对磁铁数量与初始方向，确认各层孔轴连续；十四层全部安装后，下一步再插入 M6 贯穿螺杆。", "Check each ring's magnet count and initial directions and confirm alignment of the holes; after all fourteen layers are mounted, insert the M6 through-rods in the next stage.")],
    checks: [{ id: "step-09-order", text: text("14 层顺序正确，每环 28 列，合计 1,736 块磁铁。", "All 14 layers are in order, with 28 columns per ring and 1,736 magnets in total.") }, { id: "step-09-final", text: text("全部磁环已装到框架，层间定位到位，孔轴对齐，准备最后插入贯穿螺杆。", "All rings are mounted in the frame, inter-layer spacers are seated and hole axes align, ready for final through-rod insertion.") }],
    note: text("层间紧固规格为 M6。此阶段演示逐层安装与定位，不提前显示贯穿螺杆；最终贯穿与锁紧放在下一步。", "Inter-layer hardware is M6. This stage demonstrates layer mounting and positioning without showing the through-rods prematurely; through-rod insertion and final fastening follow next."),
    partIds: ["printed-ring", "magnet-cube", "locator", "ring-support", "m6-nut", "aluminum-frame"],
  },
].sort((a, b) => a.index - b.index);
export const partById = new Map(teachingParts.map(part => [part.id, part]));
export const stepById = new Map(teachingSteps.map(step => [step.id, step]));
export const resourceById = new Map(teachingResources.map(resource => [resource.id, resource]));

export interface TeachingProgress {
  schemaVersion: 1;
  tutorialId: typeof TEACHING_ID;
  currentStep: number;
  stepOrderVersion?: 2;
  currentRing: number;
  completedStepIds: string[];
}
export const initialProgress = (): TeachingProgress => ({ schemaVersion: 1, tutorialId: TEACHING_ID, currentStep: 1, stepOrderVersion: 2, currentRing: 1, completedStepIds: [] });
export function validateProgress(value: unknown): TeachingProgress | null {
  if (!value || typeof value !== "object") return null;
  const doc = value as Record<string, unknown>;
  if (doc.schemaVersion !== TEACHING_VERSION || doc.tutorialId !== TEACHING_ID || !Array.isArray(doc.completedStepIds)) return null;
  const storedStep = typeof doc.currentStep === "number" && Number.isInteger(doc.currentStep) && doc.currentStep >= 1 && doc.currentStep <= 9 ? doc.currentStep : 1;
  // Preserve the selected semantic stage from the former rod/frame/layers order.
  const currentStep = doc.stepOrderVersion === 2 ? storedStep : ({ 7: 9, 8: 7, 9: 8 } as Record<number, number>)[storedStep] ?? storedStep;
  return { schemaVersion: 1, tutorialId: TEACHING_ID, currentStep, stepOrderVersion: 2, currentRing: typeof doc.currentRing === "number" && Number.isInteger(doc.currentRing) && doc.currentRing >= 1 && doc.currentRing <= 14 ? doc.currentRing : 1, completedStepIds: [...new Set(doc.completedStepIds.filter((id): id is string => typeof id === "string" && stepById.has(id)))] };
}
export function validateStoredIds(value: unknown, allowed: Set<string>): string[] | null {
  if (!value || typeof value !== "object") return null;
  const doc = value as Record<string, unknown>;
  if (doc.schemaVersion !== TEACHING_VERSION || doc.tutorialId !== TEACHING_ID || !Array.isArray(doc.ids)) return null;
  return [...new Set(doc.ids.filter((id): id is string => typeof id === "string" && allowed.has(id)))];
}
export function bomCSV(language: "zh" | "en"): string {
  const headers = language === "zh" ? ["物料ID", "物料", "数量/台", "单位", "规格", "材料", "说明", "装配阶段"] : ["Part ID", "Part", "Quantity per magnet", "Unit", "Specification", "Material", "Notes", "Assembly steps"];
  const pending = language === "zh" ? "待确认" : "To confirm";
  const escape = (value: unknown) => '"' + String(value).replace(/"/g, '""') + '"';
  return "\uFEFF" + [headers, ...teachingParts.map(part => [part.id, part.name[language], part.quantity ?? pending, part.unit[language], part.specification[language], part.material[language], part.note[language], part.stepIds.map(id => stepById.get(id)?.index).join(" / ")])].map(row => row.map(escape).join(",")).join("\r\n");
}
export const teachingReferences = [
  { title: text("IO 磁环研究", "IO-ring research"), note: text("径向磁化、离散磁块与轴向主场。", "Radial magnetization, discrete blocks and the axial main field."), url: "https://arxiv.org/html/2411.03249v1" },
  { title: text("MagTetris", "MagTetris"), note: text("开源有限磁块磁场与磁化表达。", "Open-source finite-block fields and magnetization conventions."), url: "https://github.com/BioMed-EM-Lab/MagTetris" },
  { title: text("OSI² ONE", "OSI² ONE"), note: text("继续了解开源 MRI 系统的完整构成。", "Explore the complete system behind open-source MRI."), url: "https://www.opensourceimaging.org/project/osii-one/" },
];
