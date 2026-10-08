import {MATLAB_GEOMETRY} from "./matlab-geometry.ts";
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
 id:SchemeId;title:string;repeats:number;repeatsConfirmed:boolean;unitMM:number|null;blockSize:number;blockSizeMM:number|null;pitch:number;pitchMM:number|null;angularOffset:number;remanenceT:number;coilScale:number;parameterSource:string;
 rings:Ring[];magnets:Magnet[];magnetById:Map<string,Magnet>;radialPositionCount:number;totals:ReturnType<typeof countDirections>;gradeTotals:Record<Grade,number>;
 ringY:(id:number,expansion?:number)=>number;position:(m:Magnet,expansion?:number)=>[number,number,number];assumption:string;assumptionEn:string;dimensionNote:string;dimensionNoteEn:string;
 dimensions:{boreRadiusMM:number;acrylicInnerMM:number;acrylicOuterMM:number;magnetInnerMM:number;magnetOuterMM:number;supportInnerMM:number;supportOuterMM:number}|null;
}
const originalSpec:[Grade,Direction[]][]=[
 ["Weak",["out","out","out","out","out"]],["Strong",["out","out","out","out","out"]],["Strong",["out","out","out","out","out"]],
 ["Normal",["out","out","out","axial"]],["Normal",["axial","axial","out"]],["Normal",["axial","axial"]],["Normal",["axial","axial","axial"]],
 ["Normal",["axial","axial","axial"]],["Normal",["axial","axial"]],["Normal",["axial","axial","in"]],["Normal",["in","in","in","axial"]],
 ["Strong",["in","in","in","in","in"]],["Strong",["in","in","in","in","in"]],["Weak",["in","in","in","in","in"]]
];
const latestDirections:Direction[][]=[
 ["out","out","out","out","out"],
 ["out","out","out","out","out","out"],
 ["out","out","out","out","out"],
 ["out","out","out","out","out","out"],
 ["axial","axial","in"],
 ["axial","out","axial"],
 ["axial","out","axial"],
 ["axial","in","axial"],
 ["axial","in","axial"],
 ["axial","axial","out"],
 ["in","in","in","in","in","in"],
 ["in","in","in","in","in"],
 ["in","in","in","in","in","in"],
 ["in","in","in","in","in"]
];
// The MATLAB declarations now supply both schemes' dimensions and center radii.
// The existing displayed azimuth frame and column IDs are retained; this is a
// rigid 90-degree view rotation relative to the MATLAB physical XY axes.
export function normalFor(theta:number,direction:Direction):[number,number,number]{
 if(direction==="axial")return [0,-1,0];if(direction==="axialUp")return [0,1,0];
 if(direction==="tangent"||direction==="tangentNeg"){const sign=direction==="tangent"?1:-1;return [-sign*Math.sin(theta),0,sign*Math.cos(theta)];}
 const sign=direction==="in"?-1:1;return [sign*Math.cos(theta),0,sign*Math.sin(theta)];
}
export function createMRIModel(id:SchemeId):MRIModel{
 const latest=id==="latest",parameters=MATLAB_GEOMETRY[id],repeats=latest?28:14,unitMM=25,blockSize=parameters.edgeMM/unitMM,pitch=parameters.pitchMM/unitMM,angularOffset=latest?Math.PI/28:0;
 const rings:Ring[]=parameters.radiiMM.map((radiiMM,i)=>({id:i+1,grade:latest?"Unspecified":originalSpec[i][0],directions:[...(latest?latestDirections[i]:originalSpec[i][1])],radiiMM:[...radiiMM],radii:radiiMM.map(r=>r/unitMM),zMM:(6.5-i)*parameters.pitchMM}));
 const ringY=(ring:number,expansion=0)=>(7.5-ring)*(pitch+expansion*.035);
 const position=(m:Magnet,expansion=0):[number,number,number]=>[m.radius*Math.cos(m.theta),ringY(m.ring,expansion),m.radius*Math.sin(m.theta)];
 const magnets:Magnet[]=rings.flatMap(r=>r.directions.flatMap((direction,radial)=>Array.from({length:repeats},(_,a)=>{
  const theta=angularOffset+a*Math.PI*2/repeats;
  return {id:ringName(r.id)+"-L"+(radial+1)+"-A"+String(a+1).padStart(2,"0"),ring:r.id,radial:radial+1,sector:a+1,radius:r.radii[radial],theta,direction,grade:r.grade,normal:normalFor(theta,direction)};
 })));
 return {id,title:latest?"新版方案":"原方案",repeats,repeatsConfirmed:true,unitMM,blockSize,blockSizeMM:parameters.edgeMM,pitch,pitchMM:parameters.pitchMM,angularOffset,remanenceT:parameters.remanenceT,coilScale:latest?1:.65,parameterSource:parameters.source,
 rings,magnets,magnetById:new Map(magnets.map(m=>[m.id,m])),radialPositionCount:rings.reduce((n,r)=>n+r.directions.length,0),totals:countDirections(magnets),
 gradeTotals:Object.fromEntries((["Weak","Normal","Strong","Unspecified"] as Grade[]).map(g=>[g,magnets.filter(m=>m.grade===g).length])) as Record<Grade,number>,ringY,position,
 assumption:latest?"新版方案 · 28 列 · 1,736 块 · MATLAB 参数":"原方案 · 14 列 · 756 块 · MATLAB 参数",
 assumptionEn:(latest?"New configuration · 28 columns · 1,736 magnets":"Original configuration · 14 columns · 756 magnets")+" · MATLAB inputs",
 dimensionNote:parameters.edgeMM+" mm 方块；"+parameters.pitchMM+" mm 环距；Br = "+parameters.remanenceT+" T。磁体中心坐标来自 MATLAB；场强为理想计算值。",
 dimensionNoteEn:parameters.edgeMM+" mm cubes; "+parameters.pitchMM+" mm ring spacing; Br = "+parameters.remanenceT+" T. Magnet centers come from MATLAB; field values are ideal predictions.",
 dimensions:latest?{boreRadiusMM:110,acrylicInnerMM:115,acrylicOuterMM:200,magnetInnerMM:120,magnetOuterMM:192,supportInnerMM:110,supportOuterMM:205}:null};
}
export const models:Record<SchemeId,MRIModel>={original:createMRIModel("original"),latest:createMRIModel("latest")};
// Default aliases are for offline generation and backwards-compatible domain helpers.
// React views always read the explicitly selected context model.
export const {rings,magnets,magnetById,ringY,position,totals,gradeTotals,radialPositionCount}=models.latest;
export const REPEATS=models.latest.repeats,BLOCK_SIZE=models.latest.blockSize,MODEL_UNIT_MM=25,BLOCK_SIZE_MM=12,PITCH_MM=38,PITCH=models.latest.pitch;
export const ASSUMPTION=models.latest.assumption,DIMENSION_NOTE=models.latest.dimensionNote;
