import { models, ringName } from "./mri.ts";
import resources from "./teaching-resources.json" with { type: "json" };
import bomCADAssets from "./bom-cad-assets.json" with { type: "json" };
import bomProductAssets from "./bom-product-assets.json" with { type: "json" };
import acrylicClipAsset from "./acrylic-clip-asset.json" with { type: "json" };

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
  referenceNoteZh?: string;
  referenceNoteEn?: string;
  downloadFilename?: string;
  estimatedPrintMinutes?: number;
  downloadAvailable?: boolean;
  visibility: "resources" | "bom" | "hidden";
  updateStatus: "current" | "pending-update" | "retired";
}
export interface BOMCADView {
  id: string;
  label: Bilingual;
  quantity: number | null;
  modelURL: string;
  imageURL: string;
  sourceName: string;
}
export interface TeachingPart {
  id: string;
  name: Bilingual;
  category: PartCategory;
  quantity: number | null;
  quantityBreakdown?: Bilingual;
  suppliedBy?: "organizer";
  unit: Bilingual;
  specification: Bilingual;
  material: Bilingual;
  note: Bilingual;
  assetIds: string[];
  stepIds: string[];
  image?: { src: string; alt: Bilingual; kind: "illustration" | "reference" | "cad-render" | "product-render"; caption?: Bilingual };
  cadViews?: BOMCADView[];
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
export const finalPrintFiles = teachingResources.filter(resource => resource.category === "print" && resource.updateStatus === "current");
export const totalPrintMinutes = finalPrintFiles.reduce((sum, resource) => sum + (resource.estimatedPrintMinutes ?? 0), 0);
export function formatPrintDuration(minutes:number, language:"zh"|"en", asHours=false):string {
  const days=asHours?0:Math.floor(minutes/1440),hours=asHours?Math.floor(minutes/60):Math.floor(minutes%1440/60),remainder=minutes%60;
  return language==="zh" ? `${days?days+"天":""}${hours?hours+"小时":""}${remainder}分钟` : `${days?days+"d ":""}${hours?hours+"h ":""}${remainder}min`;
}
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
    id: "printed-ring", name: text("分段磁铁壳体", "Segmented magnet housing"), category: "printed", quantity: 56,
    quantityBreakdown: text("4 件 × 14 层", "4 pieces × 14 layers"),
    unit: text("件 / 台", "pieces / magnet"), specification: text("R01–R14 分层 CAD；每层 4 件", "Layer-specific CAD, R01–R14; 4 pieces per layer"),
    material: text("PLA（当前打印文件设置；实际制造材料待确认）", "PLA (current print-file setting; actual manufacturing material to confirm)"),
    note: text("容纳每层的径向磁铁列。已确认每层 4 件，14 层共 56 件；打印填充率与公差按制造文件核对。", "Holds each layer's radial magnet columns. Confirmed: 4 pieces per layer, 56 across 14 layers. Check print infill and tolerances against the manufacturing files."),
    assetIds: resourcesMatching(/layer\d+|层|底座|base|sector|ring/i).filter(id => teachingResources.find(r => r.id === id)?.category !== "placement"),
    stepIds: ["step-01", "step-02", "step-03", "step-09"],
  },
  {
    id: "ring-cover", name: text("壳体盖板", "Housing cap"), category: "printed", quantity: 56,
    quantityBreakdown: text("4 件 × 14 层", "4 pieces × 14 layers"),
    unit: text("件 / 台", "pieces / magnet"), specification: text("孔位与对应层底座配合", "Matched to the holes in each layer base"),
    material: text("PLA（当前打印文件设置；实际制造材料待确认）", "PLA (current print-file setting; actual manufacturing material to confirm)"),
    note: text("定位并封盖磁铁壳体。已确认每层 4 件，14 层共 56 件；先覆盖亚克力并用临时卡扣夹住透明盖板与底盖，阶段 6 安装壳体盖板时逐个取下卡扣，保持磁铁受约束，再用 M3 螺丝紧固。", "Positions and closes the magnet housing. Confirmed: 4 pieces per layer, 56 across 14 layers. First fit the acrylic and temporarily clip it to the lower housing; in stage 6, remove clips one at a time as the housing cap takes over restraint, then secure with M3 screws."),
    assetIds: resourcesMatching(/cover|盖/i), stepIds: ["step-04"],
  },
  {
    id: "acrylic", name: text("透明盖板", "Clear cover"), category: "structure", quantity: 56,
    quantityBreakdown: text("4 件 × 14 层", "4 pieces × 14 layers"),
    unit: text("件 / 台", "pieces / magnet"), specification: text("沿圆周弧形导槽装入", "Inserted along the curved circumferential guide"),
    material: text("亚克力（PMMA）", "Acrylic (PMMA)"),
    note: text("已确认每层 4 件，14 层共 56 件。覆盖后需用临时卡扣与底盖夹紧：相互吸引的磁铁不能仅靠亚克力盖住。安装壳体盖板时再取下卡扣并完成 M3 紧固。厚度与加工图待确认；截图中的 40° 不是安装角度。", "Confirmed: 4 pieces per layer, 56 across 14 layers. After fitting, temporarily clip the acrylic to the lower housing: the clear cover alone does not retain mutually attracting magnets. Remove the clips during housing-cap installation, then complete M3 fastening. Thickness and machining drawings remain unconfirmed; the screenshot's 40° is not an installation angle."),
    assetIds: resourcesMatching(/acrylic|亚克力/i), stepIds: ["step-05", "step-10", "step-04"],
  },
  {
    id: "acrylic-clip", name: text("亚克力临时固定卡扣", "Temporary acrylic retaining clip"), category: "printed", quantity: null,
    unit: text("个（可复用工装）", "clips (reusable assembly tool)"), specification: text("夹住透明盖板与底盖；安装壳体盖板时取下", "Clips the clear cover to the lower housing; remove during housing-cap installation"),
    material: text("3D 打印材料待确认", "3D-print material to confirm"),
    note: text("按提供的用于固定亚克力卡扣.step 展示实际卡扣外形。亚克力覆盖后先卡紧，防止相互吸引的磁铁使盖板失去约束；下一步安装壳体盖板时逐个取下并回收。卡扣是临时工装，不留在成品中。每环用量、夹持位置、打印材料和实际夹持配合待确认；四份 Final 打印包不新增未核对的零件分配。", "The supplied 用于固定亚克力卡扣.step defines the displayed clip shape. Clip the fitted acrylic to the lower housing to restrain the mutually attracting magnets; remove and recover clips one at a time during the next housing-cap stage. This is a temporary tool, not a component left in the finished magnet. Per-ring quantity, mounting positions, print material and physical fit remain to be confirmed. No unverified allocation is added to the four Final print batches."),
    assetIds: [], stepIds: ["step-10", "step-04"],
  },
  {
    id: "ring-support", name: text("框架安装支撑", "Frame mounting supports"), category: "printed", quantity: 42,
    quantityBreakdown: text("左右：2 × 14 = 28 件；底部：14 件", "Sides: 2 × 14 = 28 pieces; bottom: 14 pieces"),
    unit: text("件 / 台", "pieces / magnet"), specification: text("左、右、下支撑与磁环缺口对位", "Left, right and lower supports aligned to ring notches"),
    material: text("PLA（当前打印文件设置；实际制造材料待确认）", "PLA (current print-file setting; actual manufacturing material to confirm)"),
    note: text("每层左右各 1 件、底部 1 件，14 层共 28 件侧支撑和 14 件底部支撑。左右.step 对应侧支撑，下面.step 对应底部支撑；图片和单件 3D 展示这两种不同形状。它们连接磁环与铝型材导轨。", "Each layer has one support on each side and one at the bottom: 28 side supports and 14 bottom supports across 14 layers. 左右.step provides the side support and 下面.step the bottom support; their images and isolated 3D show the two distinct shapes. They connect the rings to the aluminium extrusion rails."),
    assetIds: resourcesMatching(/surport|support(?!_layer)|支撑/i), stepIds: ["step-06", "step-08", "step-09"],
  },
  {
    id: "locator", name: text("层间隔块", "Inter-layer spacers"), category: "printed", quantity: 32,
    quantityBreakdown: text("4 × 8 = 32 件", "4 × 8 = 32 pieces"),
    unit: text("件 / 台", "pieces / magnet"), specification: text("圆柱形 3D 打印件；长度 18 mm；外径 14 mm；通孔直径 6.2 mm（供 M6 穿过）", "Cylindrical 3D-printed piece; 18 mm long; 14 mm outer diameter; 6.2 mm through-hole for M6"),
    material: text("3D 打印材料待确认（历史打印文件设置为 PETG）", "3D-print material to confirm (historical print-file setting: PETG)"),
    note: text("共 32 件（4 × 8）。图片和单件 3D 根据提供的层间隔块.step 生成；该模型长度 18 mm、外径 14 mm、通孔直径 6.2 mm。打印公差与具体安装分布按装配设计核对。26 mm 是磁铁端面净距。", "32 pieces (4 × 8). The image and isolated 3D are generated from the supplied 层间隔块.step: 18 mm length, 14 mm outer diameter and 6.2 mm through-hole diameter. Check print tolerances and mounting distribution against the assembly design. 26 mm is the magnet-face gap."),
    assetIds: resourcesMatching(/support_layer|定位/i), stepIds: ["step-06", "step-09"],
  },
  {
    id: "through-rod", name: text("贯穿螺杆", "Through-rods"), category: "fastener", quantity: 8,
    unit: text("根 / 台", "rods / magnet"), specification: text("M6；十四层安装完成后沿贯穿孔装入", "M6; insert through aligned holes after all fourteen layers are mounted"),
    material: text("待确认", "To confirm"),
    note: text("已确认每台 8 根，层间使用 M6；杆长与材料待确认。现有 CAD 只有 4 条候选孔轴，尚不能据此确定 8 根的完整安装位置。", "Confirmed: 8 rods per magnet, with M6 used between layers. Rod lengths and material remain unconfirmed. Existing CAD provides only 4 candidate hole axes and does not establish all 8 mounting positions."),
    assetIds: resourcesMatching(/rod|螺杆|长杆/i), stepIds: ["step-07"],
  },
  {
    id: "short-screw", name: text("M3 短螺丝", "M3 short screws"), category: "fastener", quantity: 448,
    quantityBreakdown: text("32 个 × 14 层", "32 screws × 14 layers"),
    unit: text("个 / 台", "screws / magnet"), specification: text("M3；紧固壳体盖板、透明盖板与壳体", "M3; fastens the housing cap, clear cover and housing"),
    material: text("待确认", "To confirm"),
    note: text("已确认每层 32 个，14 层共 448 个；螺丝长度、材料、工具与扭矩待确认。旧 CAD 的 182 个螺丝实例及 2.9×16 BF 名称仅为历史展示几何；M3×18 参考图不等于已确认的安装长度。", "Confirmed: 32 screws per layer, 448 across 14 layers. Screw length, material, tools and torque remain unconfirmed. The old CAD's 182 screw instances and 2.9×16 BF names are historical display geometry only; the M3×18 reference does not confirm installation length."),
    assetIds: teachingResources.filter(r => r.category === "fastener-reference" && /螺丝|screw|M3/i.test(r.sourceRelativePath)).map(r => r.id),
    stepIds: ["step-04"],
  },
  {
    id: "m6-nut", name: text("M6 螺母", "M6 nuts"), category: "fastener", quantity: 8,
    unit: text("个 / 台", "nuts / magnet"), specification: text("M6；层间连接与贯穿螺杆紧固", "M6; inter-layer connections and through-rod fastening"),
    material: text("待确认", "To confirm"),
    note: text("已确认每台 8 个 M6 螺母。十四层安装后再完成贯穿杆紧固；螺母形式、材料、垫片与扭矩待确认。", "Confirmed: 8 M6 nuts per magnet. Fasten through-rods after mounting all fourteen layers; nut type, material, washers and torque remain unconfirmed."),
    assetIds: [], stepIds: ["step-07", "step-09"],
  },
  {
    id: "frame-l-bracket", name: text("铝型材 L 型角码", "Aluminum-frame L-brackets"), category: "structure", quantity: null, suppliedBy: "organizer",
    unit: text("件 / 台", "brackets / magnet"), specification: text("连接铝型材框架的直角接口", "Connects right-angle joints in the aluminum profile frame"),
    material: text("待确认", "To confirm"),
    note: text("官方提供，与现场铝型材及连接件配套使用。型号、孔距和材料按提供物料核对；模型中的角码数量仅用于说明连接关系。", "Provided by the organizers for use with the supplied extrusions and hardware. Check type, hole spacing and material against those parts; rendered bracket counts illustrate joint relationships only."),
    assetIds: [], stepIds: ["step-08"],
  },
  {
    id: "aluminum-frame", name: text("铝型材框架", "Aluminum profile frame"), category: "structure", quantity: null, suppliedBy: "organizer",
    unit: text("套 / 台", "sets / magnet"), specification: text("预装框架；与三处支撑接口核对", "Preassembled frame; verify the three support interfaces"),
    material: text("铝；具体合金牌号待确认", "Aluminium; alloy grade to confirm"),
    note: text("官方提供。按现场提供的型材规格、切割长度与连接件准备框架；在步骤 8 放入磁环前预装，并核对 L 型角码连接。", "Provided by the organizers. Prepare the frame with the supplied profiles, cut lengths and connectors; preassemble before mounting the ring in step 8 and check the L-bracket joints."),
    assetIds: resourcesMatching(/frame|框架|new_genneration/i), stepIds: ["step-08", "step-09"],
  },
  {
    id: "extrusion-bolt", name: text("铝型材连接螺栓", "Extrusion mounting bolts"), category: "fastener", quantity: null, suppliedBy: "organizer",
    unit: text("个 / 台", "bolts / magnet"), specification: text("配合角码与 T 型槽螺母连接铝型材", "Connects extrusion joints with L-brackets and T-slot nuts"),
    material: text("待确认", "To confirm"),
    note: text("官方提供，用于铝型材框架的安装连接。螺纹、长度与头型按提供物料核对；层间连接的 M6 不作为这里的默认规格。", "Provided by the organizers to assemble the aluminium extrusion frame. Check thread, length and head type against the supplied hardware; the inter-layer M6 size does not set this specification."),
    assetIds: [], stepIds: ["step-08"],
  },
  {
    id: "t-slot-nut", name: text("T 型槽螺母", "T-slot nuts"), category: "fastener", quantity: null, suppliedBy: "organizer",
    unit: text("个 / 台", "nuts / magnet"), specification: text("参考图中的欧式 T 型槽螺母；中央螺纹孔，两端防滑齿纹", "European-style T-slot nut from the supplied reference; central threaded hole and serrated ends"),
    material: text("镀镍碳钢（参考图标注；实际提供物料待核对）", "Nickel-plated carbon steel (reference-image label; verify supplied parts)"),
    note: text("官方提供，装入铝型材 T 型槽，与连接螺栓配合。示意图按提供的参考图展示圆滑长条底座、中央凸起螺纹孔和两端齿纹。槽系列、螺纹、尺寸及装入方式按实际提供的型材与螺母核对。", "Provided by the organizers; fits the extrusion T-slot and mates with the mounting bolt. The illustration follows the supplied reference's rounded elongated base, raised threaded centre and serrated ends. Check slot series, thread, dimensions and insertion method against the supplied extrusions and nut."),
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
// Attractive native 3D illustrations replace the old flat icons. Procurement
// descriptions and raw reference downloads stay independent of display shapes.
for (const asset of bomProductAssets.assets) {
  const part = teachingParts.find(value => value.id === asset.id);
  if (!part || ["ring-support", "locator"].includes(part.id)) throw new Error(`Invalid BOM product image: ${asset.id}`);
  const fromCAD = asset.provenance === "cad";
  let caption = fromCAD
    ? text("R01 单件 CAD 渲染；各环的槽位与孔位以对应文件为准。展示颜色不代表实际制造材料。", "Rendered from one R01 CAD part; use each ring's files for its slots and holes. Display colour does not specify the manufacturing material.")
    : text("立体用途示意；具体外形、表面处理和未确认规格以提供物料为准。", "3D product illustration; confirm shape, finish and unspecified dimensions against the supplied parts.");
  if (part.id === "magnet-cube") caption = text("12 mm 方块外形示意；表面处理仅用于展示。装配时需逐块辨认 N/S 极。", "12 mm cube illustration; surface finish is for presentation. Identify each magnet's N/S poles during assembly.");
  if (part.id === "acrylic") caption = text("透明盖板的外观示意；厚度、加工尺寸与配合以制造文件为准。", "Clear-cover appearance illustration; verify thickness, machining dimensions and fit against manufacturing files.");
  if (part.id === "t-slot-nut") caption = text("按提供的欧式 T 型槽螺母参考图绘制；齿纹、凸起螺纹孔与圆滑外形为识别示意，尺寸和螺纹规格待核对。", "Illustrated from the supplied European-style T-slot nut reference. Serrations, raised threaded centre and rounded outline aid identification; confirm dimensions and thread size.");
  part.image = { src: asset.url, alt: text(`${part.name.zh}的立体${fromCAD ? " CAD 渲染图" : "用途示意图"}`, `${fromCAD ? "CAD render" : "3D product illustration"} of ${part.name.en.toLowerCase()}`), kind: fromCAD ? "cad-render" : "product-render", caption };
}

// The supplied standalone STEP models are isolated BOM previews; they do not
// replace the registered assembly meshes or change magnetic geometry.
type BOMCADAsset = { id: string; url?: string; sourceFilename?: string; thumbnail: { url: string } };
const bomCADCatalog = (bomCADAssets as unknown as { assets: BOMCADAsset[] }).assets;
const cadView = (id: string, label: Bilingual, quantity: number): BOMCADView => {
  const asset = bomCADCatalog.find(value => value.id === id);
  if (!asset?.url || !asset.sourceFilename) throw new Error(`Missing supplied BOM CAD: ${id}`);
  return { id, label, quantity, modelURL: asset.url, imageURL: asset.thumbnail.url, sourceName: asset.sourceFilename };
};
const supportPart = teachingParts.find(part => part.id === "ring-support")!;
supportPart.cadViews = [cadView("side-support", text("左右支撑", "Side support"), 28), cadView("bottom-support", text("底部支撑", "Bottom support"), 14)];
supportPart.image = { src: bomCADCatalog.find(asset => asset.id === "frame-supports")!.thumbnail.url, alt: text("左右.step 与下面.step 生成的左右及底部框架安装支撑渲染图", "Side and bottom frame mounting supports rendered from the supplied 左右.step and 下面.step"), kind: "cad-render" };
const spacerPart = teachingParts.find(part => part.id === "locator")!;
spacerPart.cadViews = [cadView("spacer", text("层间隔块", "Inter-layer spacer"), 32)];
spacerPart.image = { src: spacerPart.cadViews[0].imageURL, alt: text("层间隔块.step 生成的 18 mm 圆柱形隔块渲染图", "18 mm cylindrical spacer rendered from the supplied 层间隔块.step"), kind: "cad-render" };
const acrylicClipPart = teachingParts.find(part => part.id === "acrylic-clip")!;
acrylicClipPart.cadViews = [{ id: "acrylic-clip", label: acrylicClipPart.name, quantity: null, modelURL: acrylicClipAsset.url, imageURL: acrylicClipAsset.thumbnail.url, sourceName: acrylicClipAsset.sourceFilename }];
acrylicClipPart.image = { src: acrylicClipAsset.thumbnail.url, alt: text("提供的用于固定亚克力卡扣.step 生成的临时固定卡扣渲染图", "Temporary acrylic retaining clip rendered from the supplied STEP"), kind: "cad-render", caption: text("卡扣外形来自提供的 STEP；安装位置和运动为教学示意，实际夹持配合需实物核对。", "Clip geometry comes from the supplied STEP; placement and motion are instructional illustrations. Verify physical clamping fit on the real parts.") };

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
    note: text("教学采用初始排布；实验台里的自定义方向不会改动这里。接下来覆盖亚克力，再用临时卡扣夹住亚克力与底盖。磁铁相互吸引，不能把亚克力本身当作可靠的最终约束；装填和转移时的夹持方式需按现场工艺核对。", "Teaching uses the initial layout; custom Lab directions do not change it. Next fit the acrylic, then temporarily clip it to the lower housing. Mutually attracting magnets cannot be retained by the acrylic alone; verify the loading and transfer restraint against the workshop procedure."), partIds: ["magnet-cube", "printed-ring"],
  },
  {
    id: "step-04", index: 6, sceneStep: 4, title: text("安装上盖并取下临时卡扣", "Fit the cap and remove temporary clips"),
    summary: text("保持磁铁受约束，使上盖接替卡扣，再取下卡扣并用 M3 螺丝锁紧。", "Keep the magnets restrained as the cap takes over from the clips, then remove the clips and secure with M3 screws."),
    action: [text("先确认透明盖板已与底盖卡紧，再辨认壳体盖板正反面并对齐孔位。", "First confirm the acrylic is clipped to the lower housing, then orient the housing cap and align its holes."), text("在上盖能接替对应位置约束时逐个取下临时卡扣；不要先全部取下，避免磁铁因相互吸引移位。", "Remove temporary clips one at a time as the cap takes over restraint at each position. Do not remove all clips first: magnetic attraction can displace the magnets."), text("确认上盖、亚克力与底盖到位后，用 M3 短螺丝紧固，并回收全部临时卡扣。", "Once the cap, acrylic and lower housing are seated, secure with M3 short screws and recover every temporary clip.")],
    checks: [{ id: "step-04-cap-holes-v3", text: text("上盖孔位吻合、盖板平整，磁铁及透明盖板保持到位。", "The cap holes align, the cap sits flat and the magnets and acrylic remain seated.") }, { id: "step-04-restraint-v3", text: text("卡扣仅在上盖接替约束时取下；全部已回收，成品内无遗留卡扣。", "Clips were removed only as the cap took over restraint; all are recovered and none remain in the assembly.") }, { id: "step-04-fasteners-v3", text: text("M3 螺丝紧固已检查，实际长度与紧固要求已核实。", "M3 fastening is checked and the actual screw length and fastening requirements are verified.") }],
    note: text("临时卡扣的取下时机是本步骤的关键。准确夹持位置、上盖与卡扣的过渡配合、工具及紧固顺序须以实物核对，动画不代表已经验证夹持力或装配公差。已确认使用 M3 螺丝；长度与扭矩待确认。", "The timing of clip removal is critical. Verify the clamping positions, cap-to-clip restraint transfer, tools and fastening sequence on the real assembly; the animation does not validate clamping force or fit tolerances. M3 screws are confirmed; lengths and torque remain unconfirmed."), partIds: ["ring-cover", "acrylic", "printed-ring", "acrylic-clip", "short-screw"],
  },
  {
    id: "step-05", index: 4, sceneStep: 5, title: text("覆盖透明亚克力盖板", "Fit the clear acrylic cover"),
    summary: text("先覆盖亚克力并核对磁铁位置；下一步立即用临时卡扣固定到底盖。", "Fit the acrylic and check the magnet positions, then temporarily clip it to the lower housing in the next stage."),
    action: [text("使透明盖板与圆周弧形导槽匹配，沿导槽进入，不径向穿过磁铁。", "Match the clear cover to the circumferential curved guide and slide along it, without passing radially through magnets."), text("透过亚克力检查每颗磁铁和盖板到位情况，保持约束，准备下一步卡紧；此时尚不安装壳体上盖。", "Inspect each magnet and the acrylic seating through the clear cover. Maintain restraint and prepare to clip it in the next stage; do not install the housing cap yet.")],
    checks: [{ id: "step-05-guide-v3", text: text("亚克力进入对应导槽，磁铁位置与限位可见。", "The acrylic seats in its guide and magnet placement and retention are visible.") }, { id: "step-05-restraint-v3", text: text("已准备临时卡扣；未将仅覆盖亚克力视为锁紧完成。", "Temporary clips are ready; acrylic coverage alone has not been treated as completed fastening.") }],
    note: text("相互吸引的磁铁不能仅靠亚克力盖住，下一步的临时卡紧不可省略。蓝色悬浮层仅说明圆周滑动；亚克力实际 CAD、厚度与到位层位待确认。40° 是截图视角信息，不是安装角度。", "The acrylic alone cannot restrain mutually attracting magnets, so do not skip temporary clipping in the next stage. The floating blue layer explains circumferential sliding only; actual clear-cover CAD, thickness and seating remain unconfirmed. 40° describes the screenshot view, not an installation angle."), partIds: ["acrylic", "printed-ring"],
  },
  {
    id: "step-10", index: 5, sceneStep: 10, title: text("临时卡紧亚克力与底盖", "Temporarily clip acrylic to the base"),
    summary: text("用提供的卡扣夹住亚克力与底盖，暂时约束相互吸引的磁铁。", "Use the supplied clip to hold the acrylic against the lower housing and temporarily restrain the mutually attracting magnets."),
    action: [text("确认亚克力已覆盖到位，辨认卡扣开口与亚克力、底盖之间的夹持关系。", "Confirm the acrylic is seated and identify how the clip opening captures the acrylic and lower housing."), text("在经实物核对的夹持位置装上卡扣，使亚克力与底盖先卡紧，检查磁铁没有移位。", "Fit clips at the physically verified clamping positions to hold the acrylic to the lower housing, and check that the magnets have not shifted."), text("保持卡扣到位进入下一步；安装上盖时再逐个取下，不把卡扣留在成品内。", "Keep clips fitted for the next stage; remove them one at a time during cap installation and leave none in the finished assembly.")],
    checks: [{ id: "step-10-capture", text: text("卡扣同时夹住亚克力与底盖，盖板及磁铁均保持到位。", "Clips capture both the acrylic and lower housing, keeping the cover and magnets seated.") }, { id: "step-10-transfer", text: text("已理解下一步由上盖接替约束后再移除卡扣。", "The clips will be removed only as the housing cap takes over restraint in the next stage.") }],
    note: text("此步骤是必要的临时固定，不是最终紧固。卡扣外形取自提供的 STEP；动画中的安装位置和路径用于解释动作，实际用量、材料、夹持位置及夹持力尚待实物核对。", "This temporary restraint is essential and is not final fastening. The clip shape comes from the supplied STEP; animated placement and paths explain the action. Verify the actual quantity, material, clamping positions and holding force on the real assembly."), partIds: ["acrylic-clip", "acrylic", "printed-ring"],
  },
  {
    id: "step-06", index: 7, sceneStep: 6, title: text("安装框架支撑与层间隔块", "Fit mounting supports and spacers"),
    summary: text("核对左、右、下三处框架安装支撑与层间隔块接口。", "Check the left, right and lower mounting-support interfaces and the inter-layer spacers."),
    action: [text("将框架安装支撑与磁环左、右、下方缺口对应，检查支撑朝向。", "Match the mounting supports to the left, right and lower ring notches and check their orientation."), text("识别相邻层组件之间的层间隔块及贯穿孔，核对与下一层的配合关系。", "Identify the spacers between adjacent layer assemblies and the through-holes, and check the relationship to the next layer.")],
    checks: [{ id: "step-06-support", text: text("三处支撑对位，定位件与贯穿孔轴线一致。", "All three supports align; spacers and through-hole axes correspond.") }],
    note: text("当前层间隔块已确认为长度 18 mm 的圆柱，共 32 件（4 × 8）；外径、孔径与安装分布待确认。场景中的旧方块 CAD 仅作历史接口参考；请在 BOM 查看新圆柱示意。26 mm 是磁铁面间净距。", "Current spacers are confirmed as 18 mm-long cylinders, 32 pieces (4 × 8); outer diameter, bore diameter and mounting distribution remain unconfirmed. Old block CAD in the scene is a historical interface reference; see the cylindrical illustration in BOM. 26 mm is the magnet-face gap."), partIds: ["ring-support", "locator"],
  },
  {
    id: "step-07", index: 10, sceneStep: 7, title: text("最后安装贯穿螺杆", "Insert the through-rods last"),
    summary: text("十四层全部装到框架后，再沿对齐的贯穿孔插入 M6 螺杆并紧固。", "After mounting all fourteen layers in the frame, insert the M6 through-rods along the aligned holes and fasten them."),
    action: [text("先确认 R01–R14 已全部安装到框架，支撑与层间隔块均到位，贯穿孔轴线连续。", "First confirm that R01–R14 are all mounted in the frame, supports and inter-layer spacers are seated, and the through-hole axes line up."), text("沿已对齐的孔轴插入 M6 贯穿螺杆；用 M6 螺母按确认工艺紧固，再完成最终检查。", "Insert the M6 through-rods along the aligned axes; fasten with M6 nuts using the confirmed procedure, then perform the final inspection.")],
    checks: [{ id: "step-07-axes", text: text("十四层已装到框架；M6 长杆沿正确轴线贯穿，杆长与端部配置已核实。", "All fourteen layers are mounted in the frame; M6 rods pass along the correct axes, with rod lengths and end hardware verified.") }, { id: "step-07-final", text: text("所有层的约束、定位与最终紧固均已完成实物检查并记录。", "Restraint, positioning and final fastening of every layer have been physically checked and recorded.") }],
    note: text("这是最后一个装配阶段。每台已确认 8 根 M6 贯穿螺杆、8 个 M6 螺母；现有 CAD 仅提供 4 条候选孔轴，完整安装位置、杆长、材料和扭矩待确认。M3 短螺丝为每层 32 个，共 448 个。完成主磁体不等于完成 MRI 成像系统。", "This is the final assembly stage. Confirmed per magnet: 8 M6 through-rods and 8 M6 nuts. Existing CAD has only 4 candidate hole axes; complete mounting positions, rod lengths, material and torque remain unconfirmed. M3 short screws total 448, 32 per layer. A completed main magnet is not yet a complete MRI imaging system."), partIds: ["through-rod", "m6-nut"],
  },
  {
    id: "step-08", index: 8, sceneStep: 8, title: text("放入铝型材框架", "Mount in the frame"),
    summary: text("把已准备的框架与三处支撑接口联系起来。", "Relate the prepared frame to the three support interfaces."),
    action: [text("提前准备铝型材框架，核对 L 型角码、连接螺栓与 T 型槽螺母，并核实支撑接口的安装空间。", "Prepare the aluminium frame, check its L-brackets, mounting bolts and T-slot nuts, and verify installation space at the support interfaces."), text("定位磁环组件，检查左、右、下框架安装支撑的接触和固定关系；此时尚不插入贯穿螺杆。", "Position the ring assembly and inspect contact and fastening at the left, right and lower mounting supports; do not insert the through-rods yet.")],
    checks: [{ id: "step-08-frame", text: text("三处支撑对应框架接口，固定配置已核实。", "All three supports match the frame interfaces and fastening is verified.") }],
    note: text("铝型材框架、L 型角码、连接螺栓与 T 型槽螺母由官方提供；按现场物料核对规格和连接。图中框架表达接口关系，不作为型材切割清单。", "The aluminium frame, L-brackets, mounting bolts and T-slot nuts are provided by the organizers; check specifications and joints against the supplied parts. The displayed frame explains interfaces rather than providing a cut list."), partIds: ["aluminum-frame", "frame-l-bracket", "extrusion-bolt", "t-slot-nut", "ring-support"],
  },
  {
    id: "step-09", index: 9, sceneStep: 9, title: text("安装全部十四层", "Mount all fourteen layers"),
    summary: text("沿共同中心轴依次定位 R01–R14，展开检查层号与磁化方向。", "Position R01–R14 along the common axis and use the exploded view to check layer IDs and magnetization."),
    action: [text("按 R01–R14 顺序把全部磁环安装到框架，核对层间隔块和支撑配合。", "Mount all rings in the frame in R01–R14 order, checking inter-layer spacers and support fit."), text("逐环核对磁铁数量与初始方向，确认各层孔轴连续；十四层全部安装后，下一步再插入 M6 贯穿螺杆。", "Check each ring's magnet count and initial directions and confirm alignment of the holes; after all fourteen layers are mounted, insert the M6 through-rods in the next stage.")],
    checks: [{ id: "step-09-order", text: text("14 层顺序正确，每环 28 列，合计 1,736 块磁铁。", "All 14 layers are in order, with 28 columns per ring and 1,736 magnets in total.") }, { id: "step-09-final", text: text("全部磁环已装到框架，层间定位到位，孔轴对齐，准备最后插入贯穿螺杆。", "All rings are mounted in the frame, inter-layer spacers are seated and hole axes align, ready for final through-rod insertion.") }],
    note: text("层间紧固规格为 M6。此阶段演示逐层安装与定位，不提前显示贯穿螺杆；最终贯穿与锁紧放在下一步。", "Inter-layer hardware is M6. This stage demonstrates layer mounting and positioning without showing the through-rods prematurely; through-rod insertion and final fastening follow next."),
    partIds: ["printed-ring", "magnet-cube", "locator", "ring-support", "m6-nut", "aluminum-frame"],
  },
].sort((a, b) => a.index - b.index);
export const TEACHING_STAGE_COUNT = teachingSteps.length;
export const partById = new Map(teachingParts.map(part => [part.id, part]));
export const stepById = new Map(teachingSteps.map(step => [step.id, step]));
export const resourceById = new Map(teachingResources.map(resource => [resource.id, resource]));

export interface TeachingProgress {
  schemaVersion: 1;
  tutorialId: typeof TEACHING_ID;
  currentStep: number;
  stepOrderVersion?: 2 | 3;
  currentRing: number;
  completedStepIds: string[];
}
export const initialProgress = (): TeachingProgress => ({ schemaVersion: 1, tutorialId: TEACHING_ID, currentStep: 1, stepOrderVersion: 3, currentRing: 1, completedStepIds: [] });
export function validateProgress(value: unknown): TeachingProgress | null {
  if (!value || typeof value !== "object") return null;
  const doc = value as Record<string, unknown>;
  if (doc.schemaVersion !== TEACHING_VERSION || doc.tutorialId !== TEACHING_ID || !Array.isArray(doc.completedStepIds)) return null;
  const currentOrder = doc.stepOrderVersion === 3;
  const storedStep = typeof doc.currentStep === "number" && Number.isInteger(doc.currentStep) && doc.currentStep >= 1 && doc.currentStep <= (currentOrder ? TEACHING_STAGE_COUNT : 9) ? doc.currentStep : 1;
  // First normalize the former rod/frame/layers order, then preserve the
  // selected semantic stage through the acrylic/clip/cap sequence change.
  const previousStep = doc.stepOrderVersion === 2 || currentOrder ? storedStep : ({ 7: 9, 8: 7, 9: 8 } as Record<number, number>)[storedStep] ?? storedStep;
  const currentStep = currentOrder ? storedStep : ({ 4: 6, 5: 4, 6: 7, 7: 8, 8: 9, 9: 10 } as Record<number, number>)[previousStep] ?? previousStep;
  const changedStages = new Set(["step-04", "step-05", "step-10"]);
  return { schemaVersion: 1, tutorialId: TEACHING_ID, currentStep, stepOrderVersion: 3, currentRing: typeof doc.currentRing === "number" && Number.isInteger(doc.currentRing) && doc.currentRing >= 1 && doc.currentRing <= 14 ? doc.currentRing : 1, completedStepIds: [...new Set(doc.completedStepIds.filter((id): id is string => typeof id === "string" && stepById.has(id) && (currentOrder || !changedStages.has(id))))] };
}
export function validateStoredIds(value: unknown, allowed: Set<string>): string[] | null {
  if (!value || typeof value !== "object") return null;
  const doc = value as Record<string, unknown>;
  if (doc.schemaVersion !== TEACHING_VERSION || doc.tutorialId !== TEACHING_ID || !Array.isArray(doc.ids)) return null;
  return [...new Set(doc.ids.filter((id): id is string => typeof id === "string" && allowed.has(id)))];
}
export function bomCSV(language: "zh" | "en"): string {
  const headers = language === "zh" ? ["物料ID", "物料", "数量/台", "单位", "数量构成", "供应方式", "规格", "材料", "说明", "装配阶段"] : ["Part ID", "Part", "Quantity per magnet", "Unit", "Quantity breakdown", "Supply", "Specification", "Material", "Notes", "Assembly steps"];
  const pending = language === "zh" ? "待确认" : "To confirm";
  const organizerProvided = language === "zh" ? "官方提供" : "Provided by organizers";
  const escape = (value: unknown) => '"' + String(value).replace(/"/g, '""') + '"';
  return "\uFEFF" + [headers, ...teachingParts.map(part => [part.id, part.name[language], part.quantity ?? (part.suppliedBy === "organizer" ? organizerProvided : pending), part.suppliedBy === "organizer" ? "" : part.unit[language], part.quantityBreakdown?.[language] ?? "", part.suppliedBy === "organizer" ? organizerProvided : "", part.specification[language], part.material[language], part.note[language], part.stepIds.map(id => stepById.get(id)?.index).join(" / ")])].map(row => row.map(escape).join(",")).join("\r\n");
}
export const teachingReferences = [
  { title: text("IO 磁环研究", "IO-ring research"), note: text("径向磁化、离散磁块与轴向主场。", "Radial magnetization, discrete blocks and the axial main field."), url: "https://arxiv.org/html/2411.03249v1" },
  { title: text("MagTetris", "MagTetris"), note: text("开源有限磁块磁场与磁化表达。", "Open-source finite-block fields and magnetization conventions."), url: "https://github.com/BioMed-EM-Lab/MagTetris" },
  { title: text("OSI² ONE", "OSI² ONE"), note: text("继续了解开源 MRI 系统的完整构成。", "Explore the complete system behind open-source MRI."), url: "https://www.opensourceimaging.org/project/osii-one/" },
  { title: text("AAPM TG 325 · 磁场均匀性评估", "AAPM TG 325 · Field-homogeneity evaluation"), note: text("说明评估区域、统计定义与成像用途之间的关系。", "Defines evaluation regions, metric conventions and their relation to imaging applications."), url: "https://www.aapm.org/pubs/MPPG/detail.asp?docid=289" },
];
