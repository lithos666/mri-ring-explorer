import { models, ringName } from "./mri.ts";
import { TEACHING_PART_STEP_IDS, normalizeTeachingResource } from "./teaching-step-links.mjs";
export { TEACHING_PART_STEP_IDS, normalizeTeachingStepIds, normalizeLegacyResourceStepIds, normalizeTeachingResource } from "./teaching-step-links.mjs";
import resources from "./teaching-resources.json" with { type: "json" };
import bomCADAssets from "./bom-cad-assets.json" with { type: "json" };
import bomProductAssets from "./bom-product-assets.json" with { type: "json" };
import { CLEAR_COVER_QUARTERS, CLIPS_PER_QUARTER, TEMPORARY_CLIP_COUNT } from "./assembly-ring-retainers.ts";
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
  previousEstimatedPrintMinutes?: number;
  printEstimateStatus?: "pending-reestimate";
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
  kind?: "cad" | "product";
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
  status?: "pending-design";
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
export const TEACHING_BOM_SCOPE = text("一套完整的 14 层磁体阵列", "One complete 14-layer magnet array");
export const teachingResources: TeachingResource[] = (resources as TeachingResource[]).map(normalizeTeachingResource);
export const finalPrintFiles = teachingResources.filter(resource => resource.category === "print" && resource.updateStatus === "current");
export const totalPrintMinutes = finalPrintFiles.reduce((sum, resource) => sum + (resource.estimatedPrintMinutes ?? 0), 0);
export const printEstimatePending = finalPrintFiles.some(resource => typeof resource.estimatedPrintMinutes !== "number");
export function formatPrintDuration(minutes:number, language:"zh"|"en", asHours=false):string {
  const days=asHours?0:Math.floor(minutes/1440),hours=asHours?Math.floor(minutes/60):Math.floor(minutes%1440/60),remainder=minutes%60;
  return language==="zh" ? `${days?days+"天":""}${hours?hours+"小时":""}${remainder}分钟` : `${days?days+"d ":""}${hours?hours+"h ":""}${remainder}min`;
}

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
    "id": "magnet-cube",
    "name": {
      "zh": "N52 钕铁硼方块永磁铁",
      "en": "N52 grade NdFeB permanent-magnet cubes"
    },
    "category": "magnet",
    "quantity": 1736,
    "unit": {
      "zh": "块 / 完整阵列",
      "en": "cubes / array"
    },
    "specification": {
      "zh": "12 × 12 × 12 mm；14 层 × 每层 28 列",
      "en": "12 × 12 × 12 mm; 14 layers × 28 columns per layer"
    },
    "material": {
      "zh": "N52 牌号钕铁硼（NdFeB）",
      "en": "N52 grade neodymium–iron–boron (NdFeB)"
    },
    "note": {
      "zh": "数量对应一套完整的 14 层磁体阵列。逐块辨认 N/S 极，按当前层排布逐列装填，并随装填推进透明盖板与临时卡扣。Br = 1.43 T 仍是现有计算输入，材料标识不改变求场参数。",
      "en": "Quantity is for one complete 14-layer magnet array. Identify each cube's N/S poles, load one column at a time and advance the clear cover and temporary clips as loading proceeds. Br = 1.43 T remains the existing calculation input; the material label does not change the field model."
    },
    "assetIds": [],
    "stepIds": [
      "step-12",
      "step-14",
      "step-19"
    ]
  },
  {
    "id": "printed-ring",
    "name": {
      "zh": "分段磁铁壳体",
      "en": "Segmented magnet housing"
    },
    "category": "printed",
    "quantity": 56,
    "quantityBreakdown": {
      "zh": "4 件 × 14 层",
      "en": "4 pieces × 14 layers"
    },
    "unit": {
      "zh": "件 / 完整阵列",
      "en": "pieces / array"
    },
    "specification": {
      "zh": "R01–R14 分层 CAD；每层 4 件，先拼成两个半圆",
      "en": "Layer-specific CAD, R01–R14; 4 quarters per layer, first assembled into two semicircles"
    },
    "material": {
      "zh": "PLA（当前打印文件设置；实际制造材料待确认）",
      "en": "PLA (current print-file setting; actual manufacturing material to confirm)"
    },
    "note": {
      "zh": "两件壳体先拼成一个半圆，逐列装填并固定盖板；另一半圆重复该过程，再将两半合成一层。数量按一套完整阵列统计，打印填充率和公差按制造文件核对。",
      "en": "Join two housing quarters into a semicircle, load columns and secure its covers; repeat for the other semicircle before joining both into one layer. Quantities cover one complete array. Check print infill and tolerances against manufacturing files."
    },
    "assetIds": [],
    "stepIds": [
      "step-11",
      "step-12",
      "step-13",
      "step-14",
      "step-15",
      "step-16",
      "step-19",
      "step-21"
    ]
  },
  {
    "id": "ring-cover",
    "name": {
      "zh": "壳体盖板",
      "en": "Housing cap"
    },
    "category": "printed",
    "quantity": 56,
    "quantityBreakdown": {
      "zh": "4 件 × 14 层",
      "en": "4 pieces × 14 layers"
    },
    "unit": {
      "zh": "件 / 完整阵列",
      "en": "pieces / array"
    },
    "specification": {
      "zh": "先紧固半圆中间盖板，两半合拢后再紧固其余盖板",
      "en": "Secure each semicircle's central cap first; fit the remaining caps after joining the halves"
    },
    "material": {
      "zh": "PLA（当前打印文件设置；实际制造材料待确认）",
      "en": "PLA (current print-file setting; actual manufacturing material to confirm)"
    },
    "note": {
      "zh": "每层 4 件，共 56 件。先紧固半圆中间的盖板，同时让外侧临时卡扣继续保持约束。两个装好磁铁的半圆合拢后，再用 M3 螺丝紧固其余盖板，并在约束交接后取下卡扣。",
      "en": "Four caps per layer, 56 for the complete array. Secure the central cap of each semicircle while its outer temporary clips retain restraint. After joining both loaded halves, secure the remaining caps with M3 screws and remove clips as restraint transfers to the caps."
    },
    "assetIds": [],
    "stepIds": [
      "step-13",
      "step-14",
      "step-16"
    ]
  },
  {
    "id": "acrylic",
    "name": {
      "zh": "透明盖板",
      "en": "Clear cover"
    },
    "category": "structure",
    "quantity": 56,
    "quantityBreakdown": {
      "zh": "4 件 × 14 层",
      "en": "4 pieces × 14 layers"
    },
    "unit": {
      "zh": "件 / 完整阵列",
      "en": "pieces / array"
    },
    "specification": {
      "zh": "2 mm 厚；沿弧形导槽随磁铁装填推进",
      "en": "2 mm thick; advance along the curved guide as magnet columns are loaded"
    },
    "material": {
      "zh": "亚克力（PMMA）",
      "en": "Acrylic (PMMA)"
    },
    "note": {
      "zh": "厚度已确认为 2 mm，每层 4 件，共 56 件。每装好一列磁铁即推进亚克力覆盖，并用临时卡扣与底盖夹紧。DXF 加工图尚未完成，示意图暂不包含未确认的孔位。截图中的 40° 不是安装角度。",
      "en": "Confirmed thickness: 2 mm. Four covers per layer, 56 for the complete array. Advance the acrylic over each newly loaded magnet column and retain it against the lower housing with temporary clips. The DXF machining drawing is not complete, so the illustration omits unconfirmed holes. The screenshot's 40° is not an installation angle."
    },
    "assetIds": [],
    "stepIds": [
      "step-12",
      "step-13",
      "step-14",
      "step-16"
    ]
  },
  {
    "id": "acrylic-clip",
    "name": {
      "zh": "亚克力临时固定卡扣",
      "en": "Temporary acrylic retaining clip"
    },
    "category": "printed",
    "quantity": 12,
    "quantityBreakdown": {
      "zh": "每片亚克力 3 个；12 个工装取下后复用",
      "en": "3 per acrylic quarter; recover and reuse the 12-clip tool set"
    },
    "unit": {
      "zh": "个 / 完整阵列（可复用工装）",
      "en": "clips / array (reusable tools)"
    },
    "specification": {
      "zh": "随装填夹紧亚克力与底盖；盖板接替约束后取下",
      "en": "Retains acrylic against the base during loading; remove as caps take over restraint"
    },
    "material": {
      "zh": "3D 打印材料待确认",
      "en": "3D-print material to confirm"
    },
    "note": {
      "zh": "采用提供的 STEP 卡扣，每片亚克力使用 3 个。半圆装填时随盖板推进安装；紧固中间盖板时外侧卡扣继续夹紧。所有盖板固定后回收卡扣，供下一层复用。卡点按教学展示排布，打印材料和实际夹持配合待核对。",
      "en": "Use the supplied STEP clip, three per acrylic quarter. Fit clips as the cover advances during semicircle loading; outer clips keep holding while its central cap is secured. Recover the clips after all caps are secured and reuse them for the next layer. Display positions illustrate the procedure; verify print material and physical fit."
    },
    "assetIds": [],
    "stepIds": [
      "step-12",
      "step-13",
      "step-14",
      "step-16"
    ]
  },
  {
    "id": "ring-support",
    "name": {
      "zh": "框架安装支撑",
      "en": "Frame mounting supports"
    },
    "category": "printed",
    "quantity": 42,
    "quantityBreakdown": {
      "zh": "左右：2 × 14 = 28 件；底部：14 件",
      "en": "Sides: 2 × 14 = 28 pieces; bottom: 14 pieces"
    },
    "unit": {
      "zh": "件 / 完整阵列",
      "en": "pieces / array"
    },
    "specification": {
      "zh": "左右支撑先与完整层连接并紧固；底部支撑与框架配合",
      "en": "Attach and fasten the side supports to the completed layer; match the lower support to the frame"
    },
    "material": {
      "zh": "PLA（当前打印文件设置；实际制造材料待确认）",
      "en": "PLA (current print-file setting; actual manufacturing material to confirm)"
    },
    "note": {
      "zh": "每层左右各 1 件、底部 1 件，共 28 件侧支撑与 14 件底部支撑。左右.step 和下面.step 分别定义两种外形。完整磁层盖板固定后安装并紧固左右支撑，再核对三处支撑与铝型材的配合。",
      "en": "One support at each side and one at the bottom of every layer: 28 side supports and 14 bottom supports. 左右.step and 下面.step define the two shapes. After securing the layer caps, attach and fasten the side supports, then check all three support interfaces against the aluminium frame."
    },
    "assetIds": [],
    "stepIds": [
      "step-17",
      "step-18",
      "step-19"
    ]
  },
  {
    "id": "locator",
    "name": {
      "zh": "层间隔块",
      "en": "Inter-layer spacers"
    },
    "category": "printed",
    "quantity": 32,
    "quantityBreakdown": {
      "zh": "8 个层间间隙 × 4 件 = 32 件",
      "en": "8 inter-layer gaps × 4 spacers = 32 pieces"
    },
    "unit": {
      "zh": "件 / 完整阵列",
      "en": "pieces / array"
    },
    "specification": {
      "zh": "18 mm 长；外径 14 mm；6.2 mm 通孔供 M6 穿过",
      "en": "18 mm long; 14 mm outer diameter; 6.2 mm through-hole for M6"
    },
    "material": {
      "zh": "3D 打印材料待确认（历史打印文件设置为 PETG）",
      "en": "3D-print material to confirm (historical print-file setting: PETG)"
    },
    "note": {
      "zh": "前五层及后五层各有四个相邻层间间隙，每个间隙 4 件，共 32 件。十四层安装完成后，按这一分布与贯穿螺杆一起装入。形状来自提供的圆柱 STEP；26 mm 是磁铁端面净距，不是隔块长度。",
      "en": "The first five and last five layers each contain four internal adjacent-layer gaps. Four spacers per gap give 32 in total. Fit these with the through-rods after mounting all fourteen layers. The supplied cylindrical STEP defines the shape; 26 mm is the magnet-face gap, not the spacer length."
    },
    "assetIds": [],
    "stepIds": [
      "step-20"
    ]
  },
  {
    "id": "through-rod",
    "name": {
      "zh": "贯穿螺杆",
      "en": "Through-rods"
    },
    "category": "fastener",
    "quantity": 8,
    "quantityBreakdown": {
      "zh": "前组 R01–R05：4 根；后组 R10–R14：4 根",
      "en": "Front R01–R05: 4 rods; rear R10–R14: 4 rods"
    },
    "unit": {
      "zh": "根 / 完整阵列",
      "en": "rods / array"
    },
    "specification": {
      "zh": "M6；前后各 4 根，分别贯穿首五层与尾五层",
      "en": "M6; four rods through the first five layers and four through the last five"
    },
    "material": {
      "zh": "黄铜",
      "en": "Brass"
    },
    "note": {
      "zh": "一套完整阵列使用 8 根 M6 黄铜螺杆，前组 4 根贯穿 R01–R05，后组 4 根贯穿 R10–R14，中间四层不穿杆。与 32 个隔块在十四层安装后一起装入；杆长、端部配置与紧固要求按装配文件核对。",
      "en": "One complete array uses 8 M6 brass rods: 4 through R01–R05 and 4 through R10–R14, leaving the middle four layers clear. Insert these with the 32 spacers after mounting all fourteen layers. Verify rod lengths, end hardware and fastening requirements against the assembly files."
    },
    "assetIds": [],
    "stepIds": [
      "step-20"
    ]
  },
  {
    "id": "short-screw",
    "name": {
      "zh": "M3 短螺丝",
      "en": "M3 short screws"
    },
    "category": "fastener",
    "quantity": 448,
    "quantityBreakdown": {
      "zh": "32 个 × 14 层",
      "en": "32 screws × 14 layers"
    },
    "unit": {
      "zh": "个 / 完整阵列",
      "en": "screws / array"
    },
    "specification": {
      "zh": "M3；紧固壳体盖板、透明盖板与壳体",
      "en": "M3; fastens the housing cap, clear cover and housing"
    },
    "material": {
      "zh": "黄铜",
      "en": "Brass"
    },
    "note": {
      "zh": "每层 32 个，共 448 个 M3 黄铜短螺丝。先紧固每个半圆中间的盖板，合拢后再紧固其余盖板；螺丝长度、工具和扭矩按实际装配要求核对。旧 CAD 螺丝名称和 M3×18 参考图不作为当前安装长度的确认。",
      "en": "32 M3 brass short screws per layer, 448 for the complete array. Secure each semicircle's central cap first, then the remaining caps after joining the halves. Verify screw lengths, tools and torque against the assembly requirements; old CAD names and the M3×18 reference do not confirm the installed length."
    },
    "assetIds": [],
    "stepIds": [
      "step-13",
      "step-14",
      "step-16"
    ]
  },
  {
    "id": "m6-nut",
    "name": {
      "zh": "M6 螺母",
      "en": "M6 nuts"
    },
    "category": "fastener",
    "quantity": 8,
    "unit": {
      "zh": "个 / 完整阵列",
      "en": "nuts / array"
    },
    "specification": {
      "zh": "M6；贯穿螺杆端部紧固",
      "en": "M6; fastens the through-rod ends"
    },
    "material": {
      "zh": "黄铜",
      "en": "Brass"
    },
    "note": {
      "zh": "一套完整阵列使用 8 个 M6 黄铜螺母；安装十四层后，与贯穿杆和隔块工序配合完成紧固。螺母形式、垫片和扭矩按装配要求核对。",
      "en": "One complete array uses 8 M6 brass nuts. Fasten them during the through-rod and spacer stage after all fourteen layers are mounted. Verify nut type, washers and torque against the assembly requirements."
    },
    "assetIds": [],
    "stepIds": [
      "step-20"
    ]
  },
  {
    "id": "frame-l-bracket",
    "name": {
      "zh": "铝型材 L 型角码",
      "en": "Aluminum-frame L-brackets"
    },
    "category": "structure",
    "quantity": 20,
    "suppliedBy": "organizer",
    "unit": {
      "zh": "件 / 完整阵列",
      "en": "brackets / array"
    },
    "specification": {
      "zh": "连接铝型材框架的直角接口",
      "en": "Connects right-angle joints in the aluminum profile frame"
    },
    "material": {
      "zh": "待确认",
      "en": "To confirm"
    },
    "note": {
      "zh": "官方提供，每套完整阵列 20 件。与提供的铝型材、连接螺栓和 T 型槽螺母配套使用；型号、孔距和材料按实物核对。",
      "en": "Provided by the organizers: 20 per complete array. Use with the supplied aluminium profiles, mounting bolts and T-slot nuts; check type, hole spacing and material against the supplied parts."
    },
    "assetIds": [],
    "stepIds": [
      "step-18"
    ]
  },
  {
    "id": "aluminum-frame",
    "name": {
      "zh": "铝型材框架",
      "en": "Aluminum profile frame"
    },
    "category": "structure",
    "quantity": 1,
    "suppliedBy": "organizer",
    "unit": {
      "zh": "套 / 完整阵列",
      "en": "frame / array"
    },
    "specification": {
      "zh": "预装框架；与安装支撑接口核对",
      "en": "Preassembled frame; verify the mounting-support interfaces"
    },
    "material": {
      "zh": "铝；具体合金牌号待确认",
      "en": "Aluminium; alloy grade to confirm"
    },
    "note": {
      "zh": "官方提供，每套完整磁体阵列 1 套。提前按型材规格、切割长度和连接件准备框架，核对 20 个角码及连接，再放入完成并固定支撑的磁层。",
      "en": "Provided by the organizers: one frame per complete magnet array. Prepare it using the supplied profiles, cut lengths and connectors; check the 20 brackets and joints before mounting the completed layer with its supports."
    },
    "assetIds": [],
    "stepIds": [
      "step-18",
      "step-19"
    ]
  },
  {
    "id": "extrusion-bolt",
    "name": {
      "zh": "铝型材连接螺栓",
      "en": "Extrusion mounting bolts"
    },
    "category": "fastener",
    "quantity": 112,
    "suppliedBy": "organizer",
    "unit": {
      "zh": "个 / 完整阵列",
      "en": "bolts / array"
    },
    "specification": {
      "zh": "配合角码与 T 型槽螺母连接铝型材",
      "en": "Connects extrusion joints with L-brackets and T-slot nuts"
    },
    "material": {
      "zh": "待确认",
      "en": "To confirm"
    },
    "note": {
      "zh": "官方提供，每套完整阵列 112 个。螺纹、长度和头型按提供物料核对；其规格不由层间 M6 贯穿杆决定。",
      "en": "Provided by the organizers: 112 per complete array. Check thread, length and head type against the supplied hardware; inter-layer M6 through-rods do not determine this specification."
    },
    "assetIds": [],
    "stepIds": [
      "step-18"
    ]
  },
  {
    "id": "t-slot-nut",
    "name": {
      "zh": "T 型槽螺母",
      "en": "T-slot nuts"
    },
    "category": "fastener",
    "quantity": 112,
    "suppliedBy": "organizer",
    "unit": {
      "zh": "个 / 完整阵列",
      "en": "nuts / array"
    },
    "specification": {
      "zh": "欧式 T 型槽螺母；中央螺纹孔，两端防滑齿纹",
      "en": "European-style T-slot nut; central threaded hole and serrated ends"
    },
    "material": {
      "zh": "镀镍碳钢（参考图标注；实际提供物料待核对）",
      "en": "Nickel-plated carbon steel (reference-image label; verify supplied parts)"
    },
    "note": {
      "zh": "官方提供，每套完整阵列 112 个。装入铝型材 T 型槽，与连接螺栓配合；槽系列、螺纹、尺寸和安装方式按实际型材与螺母核对。",
      "en": "Provided by the organizers: 112 per complete array. Fits the extrusion T-slot and mates with the mounting bolt. Check slot series, thread, dimensions and insertion method against the supplied extrusions and nuts."
    },
    "assetIds": [],
    "stepIds": [
      "step-18"
    ]
  }
];

// The audited resource catalog owns file-to-part relationships. A filename
// such as support_layer must not be interpreted as a ring-base file.
for (const part of teachingParts) {
  part.stepIds = [...(TEACHING_PART_STEP_IDS[part.id] || part.stepIds)];
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
    ? text("R01 单件 CAD 渲染；各层的槽位与孔位以对应文件为准。展示颜色不代表实际制造材料。", "Rendered from one R01 CAD part; use each layer's files for its slots and holes. Display colour does not specify the manufacturing material.")
    : text("立体用途示意；具体外形、表面处理和未确认规格以提供物料为准。", "3D product illustration; confirm shape, finish and unspecified dimensions against the supplied parts.");
  if (part.id === "magnet-cube") caption = text("红色表示 N 极、蓝色表示 S 极；教学配色，不代表实物涂装。装配时逐块辨认磁极。", "Red indicates N and blue indicates S; teaching colours, not the supplied finish. Identify each magnet's poles during assembly.");
  if (part.id === "acrylic") caption = text("2 mm 厚亚克力（PMMA）透明盖板示意；DXF 加工图尚未完成，孔位待确认。", "Illustration of the 2 mm acrylic (PMMA) clear cover; the DXF machining drawing is not complete and hole positions are pending confirmation.");
  if (part.id === "t-slot-nut") caption = text("按提供的欧式 T 型槽螺母参考图绘制；齿纹、凸起螺纹孔与圆滑外形为识别示意，尺寸和螺纹规格待核对。", "Illustrated from the supplied European-style T-slot nut reference. Serrations, raised threaded centre and rounded outline aid identification; confirm dimensions and thread size.");
  const imageURL = `${asset.url}?v=${asset.sha256}`;
  part.image = { src: imageURL, alt: text(`${part.name.zh}的立体${fromCAD ? " CAD 渲染图" : "用途示意图"}`, `${fromCAD ? "CAD render" : "3D product illustration"} of ${part.name.en.toLowerCase()}`), kind: fromCAD ? "cad-render" : "product-render", caption };
  const modelURL = "modelURL" in asset && typeof asset.modelURL === "string" ? asset.modelURL : undefined;
  if (modelURL && ["magnet-cube", "acrylic", "through-rod", "short-screw", "m6-nut"].includes(part.id)) {
    const modelSha = "modelSha256" in asset && typeof asset.modelSha256 === "string" ? asset.modelSha256 : "";
    part.cadViews = [{ id: `product-${part.id}`, label: part.name, quantity: part.quantity, modelURL: `${modelURL}?v=${modelSha}`, imageURL, sourceName: "Illustrative product geometry", kind: "product" }];
  }
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
acrylicClipPart.cadViews = [{ id: "acrylic-clip", label: acrylicClipPart.name, quantity: TEMPORARY_CLIP_COUNT, modelURL: acrylicClipAsset.url, imageURL: acrylicClipAsset.thumbnail.url, sourceName: acrylicClipAsset.sourceFilename }];
acrylicClipPart.image = { src: acrylicClipAsset.thumbnail.url, alt: text("提供的用于固定亚克力卡扣.step 生成的临时固定卡扣渲染图", "Temporary acrylic retaining clip rendered from the supplied STEP"), kind: "cad-render", caption: text("卡扣外形来自提供的 STEP；安装位置和运动为教学示意，实际夹持配合需实物核对。", "Clip geometry comes from the supplied STEP; placement and motion are instructional illustrations. Verify physical clamping fit on the real parts.") };

export const teachingSteps: TeachingStep[] = [
  {
    id: "step-11", index: 1, sceneStep: 11, title: text("拼接第一个半圆壳体", "Join the first housing semicircle"),
    summary: text("先用两件分段壳体拼成当前层的第一个半圆。", "Join two segmented housings to form the first semicircle of the selected layer."),
    action: [text("选择当前层，辨认两件壳体的内外缘、正反面和连接接口。", "Select the layer and identify the inner and outer edges, faces and mating interfaces of its two housing quarters."), text("对齐卡扣与导槽，沿配合方向拼成一个半圆，检查接缝与磁铁槽连续。", "Align the clips and guides, join along the mating direction and check continuity of the seam and magnet slots.")],
    checks: [{ id: "step-11-check-1-v4", text: text("两件壳体属于同一层，接口到位且半圆平整。", "Both housings belong to the same layer; the joint is seated and the semicircle is flat.") }],
    note: text("这一阶段只准备第一个半圆。另一半圆在完成其装填和中间盖板后再合拢；打印件公差及实际夹持按现场工艺核对。", "This stage prepares the first semicircle. The other semicircle is loaded and centrally capped before the two halves are joined. Verify print tolerances and handling against the workshop procedure."), partIds: ["printed-ring"],
  },
  {
    id: "step-12", index: 2, sceneStep: 12, title: text("逐列装填并同步覆盖亚克力", "Load columns and advance the acrylic cover"),
    summary: text("每装好一列磁铁就推进亚克力覆盖，并用临时卡扣保持约束。", "Cover each newly loaded magnet column with acrylic and keep it restrained with temporary clips."),
    action: [text("按当前层的初始排布逐块核对 N/S 极与径向位置，装入第一列 12 mm 方块。", "Check each cube's N/S orientation and radial position against the selected layer's baseline layout, then load the first column of 12 mm cubes."), text("随装填逐列推进 2 mm 亚克力盖板，及时盖住已装磁铁，不等整个半圆装完再覆盖。", "Advance the 2 mm acrylic as each column is loaded, covering the loaded magnets immediately rather than waiting for the whole semicircle."), text("每片亚克力配合 3 个临时卡扣，夹住亚克力和底盖；半圆的两片盖板共使用 6 个卡扣。", "Use 3 temporary clips per acrylic quarter to capture the acrylic and base; the semicircle's two covers use 6 clips.")],
    checks: [{ id: "step-12-check-1-v4", text: text("已装磁铁的极性与当前层一致，每列装好后均及时覆盖。", "Loaded magnets match the selected layer's polarity sequence, and each completed column is covered promptly.") }, { id: "step-12-check-2-v4", text: text("半圆两片 2 mm 亚克力均到位，每片 3 个卡扣保持约束。", "Both 2 mm acrylic quarters are seated, each retained by 3 clips.") }],
    note: text("相互吸引的磁铁不能仅靠松放的亚克力盖住。装填、覆盖与临时夹持同步进行；R05–R10 的混合方向按各层数据核对。", "Mutually attracting magnets cannot be retained by loosely placed acrylic alone. Loading, coverage and temporary restraint proceed together; check the mixed directions in R05–R10 against each layer's data."), partIds: ["magnet-cube","printed-ring","acrylic","acrylic-clip"],
  },
  {
    id: "step-13", index: 3, sceneStep: 13, title: text("紧固半圆中间盖板", "Secure the semicircle's central cap"),
    summary: text("紧固中间壳体盖板，同时让外侧卡扣继续夹紧。", "Secure the central housing cap while the outer temporary clips keep holding."),
    action: [text("将半圆中间的壳体盖板对齐孔位，保持外侧亚克力与底盖仍由卡扣夹紧。", "Align the central cap with its holes while the outer acrylic and base remain clipped together."), text("只有在盖板接替相应位置的约束后，才移除影响该盖板落位的卡扣；用 M3 黄铜螺丝紧固中间盖板。", "Remove clips that obstruct this cap only as it takes over restraint at their positions, then secure the central cap with M3 brass screws."), text("检查中间盖板已固定、外侧卡扣仍有效夹持，准备装配另一个半圆。", "Check that the central cap is secure and the outer clips still retain the covers before preparing the other semicircle.")],
    checks: [{ id: "step-13-check-1-v4", text: text("中间盖板紧固到位，外侧卡扣继续夹紧亚克力与底盖。", "The central cap is secured, and outer clips continue to hold the acrylic against the base.") }],
    note: text("在已有孔位使用合适螺丝紧固盖板。卡扣只在盖板已接替约束的位置退出；实际螺丝长度、工具和扭矩按装配要求核对。", "Secure the cap at its provided holes using suitable screws. Remove clips only where the cap has taken over restraint. Verify screw lengths, tools and torque against the assembly requirements."), partIds: ["printed-ring","ring-cover","acrylic","acrylic-clip","short-screw"],
  },
  {
    id: "step-14", index: 4, sceneStep: 14, title: text("重复前三步，完成另一半圆", "Repeat stages 1–3 for the other semicircle"),
    summary: text("为另一半圆重复拼接、逐列装填和中间盖板紧固。", "Repeat housing assembly, column loading and central-cap fastening for the other semicircle."),
    action: [text("选取当前层剩余的两件壳体，按步骤 1 拼成第二个半圆。", "Join the selected layer's other two housing quarters into its second semicircle as in stage 1."), text("按步骤 2 逐列装入磁铁，同步覆盖亚克力并安装临时卡扣。", "Repeat stage 2: load columns, advance the acrylic and fit temporary clips together."), text("按步骤 3 紧固第二个半圆的中间盖板，保留外侧临时约束。", "Repeat stage 3: secure the second semicircle's central cap and retain its outer temporary restraints.")],
    checks: [{ id: "step-14-check-1-v4", text: text("两个半圆均已完成装填和中间盖板紧固，属于同一层且方向对应。", "Both semicircles are loaded and centrally capped, belong to the same layer and have matching orientations.") }],
    note: text("使用当前层自己的磁铁数量与方向序列；不同层的径向排布可能不同。已完成半圆的外侧卡扣在合拢前保持到位。", "Use the selected layer's own magnet count and direction sequence; radial layouts differ between layers. Keep the completed semicircles' outer clips fitted before joining."), partIds: ["printed-ring","magnet-cube","acrylic","acrylic-clip","ring-cover","short-screw"],
  },
  {
    id: "step-15", index: 5, sceneStep: 15, title: text("合拢两个已装填半圆", "Join the two loaded semicircles"),
    summary: text("将已装好磁铁和中间盖板的两个半圆合为完整一层。", "Join the two loaded, centrally capped semicircles into one complete layer."),
    action: [text("核对两半属于同一层，统一正反面与装配朝向，保持外侧卡扣到位。", "Confirm both halves belong to the same layer, align their face orientations and keep the outer clips fitted."), text("对齐最后两处壳体接口，沿配合方向合拢，检查整层接缝、内外缘和亚克力导槽连续。", "Align the final two housing interfaces, join along the mating direction and inspect the seams, edges and acrylic guides around the complete layer.")],
    checks: [{ id: "step-15-check-1-v4", text: text("两处接口均到位，磁铁及亚克力未移位，临时约束保持有效。", "Both joints are seated, the magnets and acrylic have not shifted, and temporary restraint remains effective.") }],
    partIds: ["printed-ring","ring-cover","acrylic","acrylic-clip"],
  },
  {
    id: "step-16", index: 6, sceneStep: 16, title: text("紧固其余盖板并回收卡扣", "Secure the remaining caps and recover clips"),
    summary: text("先让其余盖板接替约束，再取下外侧卡扣并完成紧固。", "Let the remaining caps take over restraint, then remove outer clips and complete fastening."),
    action: [text("对齐剩余壳体盖板，持续保持外侧亚克力与磁铁受约束。", "Align the remaining housing caps while maintaining restraint of the outer acrylic and magnets."), text("在对应盖板能接替约束时逐个取下卡扣，用 M3 黄铜螺丝紧固盖板。", "Remove clips one at a time as the corresponding caps take over restraint, and secure the caps with M3 brass screws."), text("检查四件盖板与全部螺丝，回收卡扣供下一层复用。", "Check all four caps and their screws, and recover the clips for reuse on the next layer.")],
    checks: [{ id: "step-16-check-1-v4", text: text("四件壳体盖板均已固定，透明盖板与磁铁保持到位。", "All four housing caps are secured, keeping the acrylic and magnets seated.") }, { id: "step-16-check-2-v4", text: text("所有临时卡扣均已取下并回收，成品层内无遗留工装。", "All temporary clips are removed and recovered; no temporary tools remain in the completed layer.") }],
    note: text("M3 黄铜螺丝用于壳体盖板、透明盖板和壳体之间的紧固。每层清单为 32 个；实际安装长度和紧固要求按提供文件核对。", "M3 brass screws fasten the housing caps, clear covers and housing. The confirmed list contains 32 per layer; verify installed lengths and fastening requirements against the supplied files."), partIds: ["printed-ring","ring-cover","acrylic","acrylic-clip","short-screw"],
  },
  {
    id: "step-17", index: 7, sceneStep: 17, title: text("安装并紧固左右支撑", "Attach and fasten the side supports"),
    summary: text("将左右支撑与完整磁层对齐，并完成支撑连接。", "Align and fasten the left and right supports to the completed layer."),
    action: [text("辨认左右支撑与磁层缺口，检查支撑朝向及已有孔位。", "Identify the left and right supports, match the layer notches and inspect orientation and provided holes."), text("按装配要求安装并紧固左右支撑，再检查其与铝型材框架的配合。", "Attach and fasten both side supports following the assembly requirements, then check their fit to the aluminium frame.")],
    checks: [{ id: "step-17-check-1-v4", text: text("左右支撑方向正确、连接已紧固，磁层盖板保持固定。", "Both side supports are correctly oriented and fastened, with the layer caps still secured.") }],
    note: text("BOM 中每层还包括一个底部支撑；在放入框架时一起核对三处支撑接口。支撑紧固件的具体配置按提供的装配设计核对。", "The BOM also includes a lower support for each layer; check all three support interfaces during frame mounting. Verify the support-fastener configuration against the supplied assembly design."), partIds: ["ring-support","printed-ring"],
  },
  {
    id: "step-18", index: 8, sceneStep: 18, title: text("放入铝型材框架", "Mount the layer in the frame"),
    summary: text("将完成盖板与支撑紧固的磁层安装到预装框架。", "Mount the capped layer with its fastened supports in the prepared frame."),
    action: [text("检查预装框架、20 个 L 型角码以及配套连接螺栓和 T 型槽螺母。", "Check the prepared frame, its 20 L-brackets and the supplied mounting bolts and T-slot nuts."), text("对齐左右及底部支撑与框架接口，定位并固定当前磁层。", "Align the side and lower supports with the frame interfaces, then position and secure the selected layer.")],
    checks: [{ id: "step-18-check-1-v4", text: text("三处支撑与框架对应、当前磁层固定可靠，孔轴方向正确。", "All three support interfaces match the frame, the layer is secure and through-hole axes are correctly oriented.") }],
    note: text("每套完整阵列由官方提供 1 套框架、20 个角码、112 个连接螺栓和 112 个 T 型槽螺母。图中框架展示安装关系，型材切割及连接规格以提供文件为准。", "The organizers supply one frame, 20 brackets, 112 mounting bolts and 112 T-slot nuts per complete array. The displayed frame explains mounting relationships; use the supplied files for profile cuts and connection specifications."), partIds: ["aluminum-frame","frame-l-bracket","extrusion-bolt","t-slot-nut","ring-support"],
  },
  {
    id: "step-19", index: 9, sceneStep: 19, title: text("安装全部十四层", "Mount all fourteen layers"),
    summary: text("按 R01–R14 顺序重复装配并安装所有磁层。", "Repeat assembly and mounting for all layers in R01–R14 order."),
    action: [text("对每一层完成前面的半圆装填、盖板紧固、支撑固定与框架安装。", "For each layer, complete semicircle loading, cap fastening, support attachment and frame mounting."), text("核对层号、朝向、数量与共同中心轴，保持安装位置与设计一致。", "Check layer IDs, orientations, quantities and the common centre axis against the design.")],
    checks: [{ id: "step-19-check-1-v4", text: text("14 层顺序正确，每层 28 列，整套阵列合计 1,736 颗磁铁。", "All 14 layers are correctly ordered, with 28 columns per layer and 1,736 magnets in the complete array.") }],
    note: text("贯穿螺杆和隔块在下一阶段安装。不同层使用各自的磁铁排布；实验台自定义方向不改变这里的教学初始排布。", "Install through-rods and spacers in the next stage. Each layer uses its own magnet layout; custom Lab directions do not change this teaching baseline."), partIds: ["printed-ring","magnet-cube","ring-support","aluminum-frame"],
  },
  {
    id: "step-20", index: 10, sceneStep: 20, title: text("安装前后分组螺杆与隔块", "Fit the front and rear rods with spacers"),
    summary: text("前五层四根、后五层四根；中间四层保持无杆贯穿。", "Fit four rods through the first five layers and four through the last five, leaving the middle four clear."),
    action: [text("核对 R01–R05 的四条孔轴和 R10–R14 的四条孔轴，分别准备 4 根 M6 黄铜螺杆。", "Check the four hole axes through R01–R05 and the four through R10–R14, preparing 4 M6 brass rods for each group."), text("沿每组真实对齐的孔轴穿杆；在前后各四个相邻层间间隙，每处放入 4 个 18 mm 圆柱隔块。", "Insert rods along each group's aligned hole axes. Fit 4 cylindrical 18 mm spacers in each of the four internal gaps of the front and rear groups."), text("用已确认的 8 个 M6 黄铜螺母完成端部紧固，检查孔轴、隔块与各层定位。", "Fasten the rod ends with the confirmed 8 M6 brass nuts, then inspect hole alignment, spacers and layer positioning.")],
    checks: [{ id: "step-20-check-1-v4", text: text("前组 R01–R05 和后组 R10–R14 各有 4 根螺杆，中间四层未被贯穿。", "R01–R05 and R10–R14 each have 4 rods; the middle four layers are not traversed.") }, { id: "step-20-check-2-v4", text: text("8 个层间间隙各有 4 个隔块，共 32 个；杆、隔块与孔轴对应。", "Each of the 8 inter-layer gaps has 4 spacers, giving 32 total; rods, spacers and hole axes correspond.") }],
    note: text("8 根螺杆分前后两组，不是一组长杆贯穿全部十四层。杆长、端部配置和紧固要求按提供的机械设计核对。26 mm 是磁铁端面净距，18 mm 是隔块长度。", "The 8 rods form separate front and rear groups rather than traversing all fourteen layers. Verify rod lengths, end hardware and fastening requirements against the supplied mechanical design. The magnet-face gap is 26 mm; spacer length is 18 mm."), partIds: ["through-rod","locator","m6-nut"],
  },
  {
    id: "step-21", index: 11, sceneStep: 21, status: "pending-design", title: text("梳状对齐件：等待设计文件", "Comb-like alignment devices: design pending"),
    summary: text("最终需要梳状对齐件；模型尚未完成，此阶段暂作设计准备。", "Comb-like alignment devices are required at the end; their unfinished model leaves this stage pending design."),
    action: [text("记录梳状对齐件与已装十四层的配合位置，等待定版模型和安装说明。", "Record where the comb-like devices will mate with the assembled fourteen layers and await the final model and installation instructions."), text("模型与尺寸确认后再展示和执行安装；当前不提供虚构模型或制造尺寸。", "Show and perform installation after the model and dimensions are confirmed; no invented model or manufacturing dimensions are supplied.")],
    checks: [{ id: "step-21-check-1-v4", text: text("已识别此阶段等待设计文件，未将待设计状态记作实物安装完成。", "This stage is recognized as awaiting design files and has not been marked as physically installed.") }],
    note: text("用户确认梳状对齐件模型与 DXF 尚未完成。收到并核对文件后，再补充模型、零件数量、安装路径与完成检查。当前清单不增加未经确认的梳状件数量。", "The user confirmed that the comb-like device model and DXF are not complete. Add the model, quantity, installation path and completion checks after receiving and reviewing the files. No unconfirmed comb-device quantity is added to the BOM."), partIds: ["printed-ring"],
  }
];
export const TEACHING_STAGE_COUNT = teachingSteps.length;
export const partById = new Map(teachingParts.map(part => [part.id, part]));
export const stepById = new Map(teachingSteps.map(step => [step.id, step]));
export const resourceById = new Map(teachingResources.map(resource => [resource.id, resource]));

export interface TeachingProgress {
  schemaVersion: 1;
  tutorialId: typeof TEACHING_ID;
  currentStep: number;
  stepOrderVersion?: 2 | 3 | 4;
  currentRing: number;
  completedStepIds: string[];
}
export const initialProgress = (): TeachingProgress => ({ schemaVersion: 1, tutorialId: TEACHING_ID, currentStep: 1, stepOrderVersion: 4, currentRing: 1, completedStepIds: [] });
export function validateProgress(value: unknown): TeachingProgress | null {
  if (!value || typeof value !== "object") return null;
  const doc = value as Record<string, unknown>;
  if (doc.schemaVersion !== TEACHING_VERSION || doc.tutorialId !== TEACHING_ID || !Array.isArray(doc.completedStepIds)) return null;
  const currentOrder = doc.stepOrderVersion === 4;
  const currentStep = currentOrder && typeof doc.currentStep === "number" && Number.isInteger(doc.currentStep) && doc.currentStep >= 1 && doc.currentStep <= TEACHING_STAGE_COUNT ? doc.currentStep : 1;
  // The semicircle-first process is materially different. Keep the selected
  // layer, but require participants with an older lesson to review it from
  // stage 1 rather than treating old full-layer checks as new completions.
  const completedStepIds = currentOrder ? [...new Set(doc.completedStepIds.filter((id): id is string => typeof id === "string" && stepById.has(id) && stepById.get(id)?.status !== "pending-design"))] : [];
  return { schemaVersion: 1, tutorialId: TEACHING_ID, currentStep, stepOrderVersion: 4, currentRing: typeof doc.currentRing === "number" && Number.isInteger(doc.currentRing) && doc.currentRing >= 1 && doc.currentRing <= 14 ? doc.currentRing : 1, completedStepIds };
}
export function validateStoredIds(value: unknown, allowed: Set<string>): string[] | null {
  if (!value || typeof value !== "object") return null;
  const doc = value as Record<string, unknown>;
  if (doc.schemaVersion !== TEACHING_VERSION || doc.tutorialId !== TEACHING_ID || !Array.isArray(doc.ids)) return null;
  return [...new Set(doc.ids.filter((id): id is string => typeof id === "string" && allowed.has(id)))];
}
export function bomCSV(language: "zh" | "en"): string {
  const headers = language === "zh" ? ["物料ID", "物料", "数量/完整阵列", "单位", "数量构成", "供应方式", "规格", "材料", "说明", "装配阶段"] : ["Part ID", "Part", "Quantity / complete array", "Unit", "Quantity breakdown", "Supply", "Specification", "Material", "Notes", "Assembly steps"];
  const pending = language === "zh" ? "待确认" : "To confirm";
  const organizerProvided = language === "zh" ? "官方提供" : "Provided by organizers";
  const escape = (value: unknown) => '"' + String(value).replace(/"/g, '""') + '"';
  return "\uFEFF" + [headers, ...teachingParts.map(part => [part.id, part.name[language], part.quantity ?? (part.suppliedBy === "organizer" ? organizerProvided : pending), part.unit[language], part.quantityBreakdown?.[language] ?? "", part.suppliedBy === "organizer" ? organizerProvided : "", part.specification[language], part.material[language], part.note[language], part.stepIds.map(id => stepById.get(id)?.index).join(" / ")])].map(row => row.map(escape).join(",")).join("\r\n");
}
export const teachingReferences = [
  { title: text("IO 磁体阵列研究", "IO magnet-array research"), note: text("径向磁化、离散磁块与轴向主场。", "Radial magnetization, discrete blocks and the axial main field."), url: "https://arxiv.org/html/2411.03249v1" },
  { title: text("MagTetris", "MagTetris"), note: text("开源有限磁块磁场与磁化表达。", "Open-source finite-block fields and magnetization conventions."), url: "https://github.com/BioMed-EM-Lab/MagTetris" },
  { title: text("OSI² ONE", "OSI² ONE"), note: text("继续了解开源 MRI 系统的完整构成。", "Explore the complete system behind open-source MRI."), url: "https://www.opensourceimaging.org/project/osii-one/" },
  { title: text("AAPM TG 325 · 磁场均匀性评估", "AAPM TG 325 · Field-homogeneity evaluation"), note: text("说明评估区域、统计定义与成像用途之间的关系。", "Defines evaluation regions, metric conventions and their relation to imaging applications."), url: "https://www.aapm.org/pubs/MPPG/detail.asp?docid=289" },
];
