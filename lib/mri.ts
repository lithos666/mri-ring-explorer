export type Direction="out"|"in"|"axial"|"axialUp"|"tangent"|"tangentNeg";
export const DIRECTIONS:Direction[]=["out","in","axial","axialUp","tangent","tangentNeg"];
export type Grade="Weak"|"Normal"|"Strong"|"Unspecified";
export type ViewMode="design"|"assembly"|"single"|"section"|"rz"|"field";
export type SchemeId="original"|"latest";
export const directionNames:Record<Direction,string>={out:"径向朝外",in:"径向朝内",axial:"轴向朝下（−Z）",axialUp:"轴向朝上（+Z）",tangent:"切向 +θ",tangentNeg:"切向 −θ"};
export const directionShort:Record<Direction,string>={out:"外",in:"内",axial:"轴",axialUp:"轴↑",tangent:"切+",tangentNeg:"切−"};
export const directionColors:Record<Direction,string>={out:"#087f8c",in:"#6356b5",axial:"#b5670d",axialUp:"#af5a12",tangent:"#ae397c",tangentNeg:"#6754af"};
export const gradeNames:Record<Grade,string>={Weak:"Weak",Normal:"Normal",Strong:"Strong",Unspecified:"未标注"};
export interface Ring{id:number;grade:Grade;directions:Direction[];radii:number[];radiiMM:number[];zMM:number;}
export interface Magnet{id:string;ring:number;radial:number;sector:number;radius:number;theta:number;direction:Direction;grade:Grade;normal:[number,number,number];}
export const ringName=(id:number)=>"R"+String(id).padStart(2,"0");
export function countDirections(items:Magnet[]){return items.reduce((s,m)=>{s[m.direction]++;return s;},{out:0,in:0,axial:0,axialUp:0,tangent:0,tangentNeg:0});}
export interface MRIModel{
 id:SchemeId;title:string;repeats:number;repeatsConfirmed:boolean;unitMM:number|null;blockSize:number;blockSizeMM:number|null;pitch:number;pitchMM:number|null;angularOffset:number;
 rings:Ring[];magnets:Magnet[];magnetById:Map<string,Magnet>;radialPositionCount:number;totals:ReturnType<typeof countDirections>;gradeTotals:Record<Grade,number>;
 ringY:(id:number,expansion?:number)=>number;position:(m:Magnet,expansion?:number)=>[number,number,number];assumption:string;dimensionNote:string;
 dimensions:{boreRadiusMM:number;acrylicInnerMM:number;acrylicOuterMM:number;magnetInnerMM:number;magnetOuterMM:number;supportInnerMM:number;supportOuterMM:number}|null;
}
const originalSpec:[Grade,Direction[]][]=[
 ["Weak",["out","out","out","out","out"]],["Strong",["out","out","out","out","out"]],["Strong",["out","out","out","out","out"]],
 ["Normal",["out","out","out","axial"]],["Normal",["axial","axial","out"]],["Normal",["axial","axial"]],["Normal",["axial","axial","axial"]],
 ["Normal",["axial","axial","axial"]],["Normal",["axial","axial"]],["Normal",["axial","axial","in"]],["Normal",["in","in","in","axial"]],
 ["Strong",["in","in","in","in","in"]],["Strong",["in","in","in","in","in"]],["Weak",["in","in","in","in","in"]]
];
const latestSpec:[Direction[],number[]][]=[
 [["out","out","out","out","out"],[128,140,152,164,186]],
 [["out","out","out","out","out","out"],[126,138,150,162,174,186]],
 [["out","out","out","out","out"],[138,150,162,174,186]],
 [["out","out","out","out","out","out"],[126,138,150,162,174,186]],
 [["axial","axial","in"],[126,150,174]],
 [["axial","out","axial"],[130,155,186]],
 [["axial","out","axial"],[126,162,186]],
 [["axial","in","axial"],[126,162,186]],
 [["axial","in","axial"],[130,155,186]],
 [["axial","axial","out"],[126,150,174]],
 [["in","in","in","in","in","in"],[126,138,150,162,174,186]],
 [["in","in","in","in","in"],[138,150,162,174,186]],
 [["in","in","in","in","in","in"],[126,138,150,162,174,186]],
 [["in","in","in","in","in"],[128,140,152,164,186]]
];
// New image confirms occupied radial bounds, not cube center positions.
// Centers remain estimates; near-boundary estimates are aligned inside 120–192 mm.
export function normalFor(theta:number,direction:Direction):[number,number,number]{
 if(direction==="axial")return [0,-1,0];if(direction==="axialUp")return [0,1,0];
 if(direction==="tangent"||direction==="tangentNeg"){const sign=direction==="tangent"?1:-1;return [-sign*Math.sin(theta),0,sign*Math.cos(theta)];}
 const sign=direction==="in"?-1:1;return [sign*Math.cos(theta),0,sign*Math.sin(theta)];
}
export function createMRIModel(id:SchemeId):MRIModel{
 const latest=id==="latest",repeats=latest?28:14,unitMM=latest?25:null,blockSize=latest?12/25:.8,pitch=latest?38/25:1.2,angularOffset=latest?Math.PI/28:0;
 const oldRadii:Record<number,number[]>={2:[4,8],3:[4,6,8],4:[4,5,6,8],5:[4,5,6,7,8]};
 const rings:Ring[]=latest?latestSpec.map(([directions,radiiMM],i)=>({id:i+1,grade:"Unspecified",directions:[...directions],radiiMM:[...radiiMM],radii:radiiMM.map(r=>r/25),zMM:(6.5-i)*38})):
 originalSpec.map(([grade,directions],i)=>({id:i+1,grade,directions:[...directions],radii:[...oldRadii[directions.length]],radiiMM:[],zMM:NaN}));
 const ringY=(ring:number,expansion=0)=>(7.5-ring)*(pitch+expansion*.035);
 const position=(m:Magnet,expansion=0):[number,number,number]=>[m.radius*Math.cos(m.theta),ringY(m.ring,expansion),m.radius*Math.sin(m.theta)];
 const magnets:Magnet[]=rings.flatMap(r=>r.directions.flatMap((direction,radial)=>Array.from({length:repeats},(_,a)=>{
  const theta=angularOffset+a*Math.PI*2/repeats;
  return {id:ringName(r.id)+"-L"+(radial+1)+"-A"+String(a+1).padStart(2,"0"),ring:r.id,radial:radial+1,sector:a+1,radius:r.radii[radial],theta,direction,grade:r.grade,normal:normalFor(theta,direction)};
 })));
 return {id,title:latest?"新版方案":"原方案",repeats,repeatsConfirmed:latest,unitMM,blockSize,blockSizeMM:latest?12:null,pitch,pitchMM:latest?38:null,angularOffset,
 rings,magnets,magnetById:new Map(magnets.map(m=>[m.id,m])),radialPositionCount:rings.reduce((n,r)=>n+r.directions.length,0),totals:countDirections(magnets),
 gradeTotals:Object.fromEntries((["Weak","Normal","Strong","Unspecified"] as Grade[]).map(g=>[g,magnets.filter(m=>m.grade===g).length])) as Record<Grade,number>,ringY,position,
 assumption:latest?"新版方案 · 每层圆周 28 列已确认 · 14 环共 1,736 块":"原方案 · 圆周暂按 14 次重复 · 756 块为推算值",
 dimensionNote:latest?"孔半径 110 mm；磁铁占据半径 120–192 mm。约 12 mm 方块、38 mm 环距和中心坐标仍为读图估计。":"磁铁边长 0.8、环距 1.2 和径向位置均为无单位示意；实际尺寸与圆周次数待确认。",
 dimensions:latest?{boreRadiusMM:110,acrylicInnerMM:115,acrylicOuterMM:200,magnetInnerMM:120,magnetOuterMM:192,supportInnerMM:110,supportOuterMM:205}:null};
}
export const models:Record<SchemeId,MRIModel>={original:createMRIModel("original"),latest:createMRIModel("latest")};
// Default aliases are for offline generation and backwards-compatible domain helpers.
// React views always read the explicitly selected context model.
export const {rings,magnets,magnetById,ringY,position,totals,gradeTotals,radialPositionCount}=models.latest;
export const REPEATS=models.latest.repeats,BLOCK_SIZE=models.latest.blockSize,MODEL_UNIT_MM=25,BLOCK_SIZE_MM=12,PITCH_MM=38,PITCH=models.latest.pitch;
export const ASSUMPTION=models.latest.assumption,DIMENSION_NOTE=models.latest.dimensionNote;
