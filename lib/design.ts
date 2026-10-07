import {models,normalFor,countDirections,type Direction,type MRIModel,type SchemeId} from "./mri.ts";

export const DESIGN_SCHEMA_VERSION=1 as const;
export const MAX_IMPORT_BYTES=512*1024;
export const MAX_HISTORY=100;
export const EDIT_DIRECTIONS:readonly Direction[]=["out","in","axial","axialUp","tangent","tangentNeg"];
export type DirectionOverrides=Record<string,Direction>;
export interface DesignDocument{
 schemaVersion:typeof DESIGN_SCHEMA_VERSION;schemeId:SchemeId;geometrySignature:string;createdAt:string;
 overrides:{id:string;direction:Direction}[];
}
export interface DesignEntry{
 overrides:DirectionOverrides;past:DirectionOverrides[];future:DirectionOverrides[];
 savedOverrides:DirectionOverrides|null;savedAt:string|null;
}
export type DesignState=Record<SchemeId,DesignEntry>;
export type DesignAction=
 |{type:"edit";scheme:SchemeId;id:string;direction:Direction}
 |{type:"replace";scheme:SchemeId;overrides:DirectionOverrides}
 |{type:"undo"|"redo"|"reset";scheme:SchemeId}
 |{type:"saved";scheme:SchemeId;overrides:DirectionOverrides;at:string};

export class DesignValidationError extends Error{
 zh:string;en:string;constructor(zh:string,en:string){super(en);this.zh=zh;this.en=en;this.name="DesignValidationError";}
}
function reject(zh:string,en:string):never{throw new DesignValidationError(zh,en);}
function record(value:unknown):value is Record<string,unknown>{
 return !!value&&typeof value==="object"&&!Array.isArray(value);
}
function exactKeys(value:Record<string,unknown>,allowed:string[]){
 return Object.keys(value).every(k=>allowed.includes(k));
}
export function sameOverrides(a:DirectionOverrides,b:DirectionOverrides){
 const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>a[k]===b[k]);
}
export function normalizeOverrides(base:MRIModel,overrides:DirectionOverrides):DirectionOverrides{
 const normalized:DirectionOverrides={};
 for(const [id,direction] of Object.entries(overrides)){
  const magnet=base.magnetById.get(id);
  if(!magnet)reject("设计包含未知磁铁编号："+id,"The design contains an unknown magnet ID: "+id);
  if(!EDIT_DIRECTIONS.includes(direction))reject("设计包含不支持的方向。","The design contains an unsupported direction.");
  if(direction!==magnet.direction)normalized[id]=direction;
 }
 return normalized;
}
function hashString(value:string,seed:number){
 let h=seed>>>0;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}
 return (h>>>0).toString(16).padStart(8,"0");
}
export function geometrySignature(base:MRIModel){
 // This deterministic compatibility fingerprint is not a cryptographic signature.
 // It includes the immutable geometry and supplied baseline directions.
 const num=(v:number)=>Math.round(v*1e12)/1e12;
 const geometry=JSON.stringify({
  version:1,id:base.id,repeats:base.repeats,unitMM:base.unitMM,blockSize:num(base.blockSize),
  pitch:num(base.pitch),angularOffset:num(base.angularOffset),
  magnets:base.magnets.map(m=>[m.id,m.ring,m.radial,m.sector,num(m.radius),num(m.theta),
   ...base.position(m).map(num),m.direction,...m.normal.map(num)])
 });
 return "mri-geometry-v1-"+hashString(geometry,2166136261)+hashString(geometry,2246822519);
}
export function applyOverrides(base:MRIModel,overrides:DirectionOverrides):MRIModel{
 if(Object.keys(overrides).length===0)return base;
 const magnets=base.magnets.map(m=>{
  const direction=overrides[m.id];return direction?{...m,direction,normal:normalFor(m.theta,direction)}:m;
 });
 return {...base,magnets,magnetById:new Map(magnets.map(m=>[m.id,m])),totals:countDirections(magnets)};
}
export function exportDesign(base:MRIModel,overrides:DirectionOverrides,createdAt=new Date().toISOString()){
 const normalized=normalizeOverrides(base,overrides);
 const document:DesignDocument={
  schemaVersion:DESIGN_SCHEMA_VERSION,schemeId:base.id,geometrySignature:geometrySignature(base),createdAt,
  overrides:base.magnets.filter(m=>normalized[m.id]!==undefined).map(m=>({id:m.id,direction:normalized[m.id]}))
 };
 return JSON.stringify(document,null,2);
}
export function validateDesign(text:string,base:MRIModel):{document:DesignDocument;overrides:DirectionOverrides}{
 if(typeof text!=="string"||text.length>MAX_IMPORT_BYTES)reject("设计文件过大，最大为 512 KB。","The design file is too large; the maximum size is 512 KB.");
 let parsed:unknown;try{parsed=JSON.parse(text);}catch{reject("设计文件不是有效的 JSON。","The design file is not valid JSON.");}
 if(!record(parsed)||!exactKeys(parsed,["schemaVersion","schemeId","geometrySignature","createdAt","overrides"]))
  reject("设计文件结构不正确，或包含未支持的字段。","The design file has an invalid structure or unsupported fields.");
 if(parsed.schemaVersion!==DESIGN_SCHEMA_VERSION)reject("设计文件版本不支持。","This design-file version is not supported.");
 if(parsed.schemeId!==base.id)reject("设计文件属于另一套方案，请先切换对应方案。","This file belongs to the other configuration. Select that configuration before importing.");
 if(parsed.geometrySignature!==geometrySignature(base))reject("设计文件的几何参数与当前版本不一致，未进行导入。","The file geometry does not match the current version. Nothing was imported.");
 if(typeof parsed.createdAt!=="string"||parsed.createdAt.length>40||!Number.isFinite(Date.parse(parsed.createdAt)))
  reject("设计文件保存时间无效。","The design file has an invalid save timestamp.");
 if(!Array.isArray(parsed.overrides)||parsed.overrides.length>base.magnets.length)
  reject("设计文件中的修改数量无效。","The design file contains an invalid number of modifications.");
 const seen=new Set<string>(),overrides:DirectionOverrides={};
 for(const item of parsed.overrides){
  if(!record(item)||!exactKeys(item,["id","direction"])||typeof item.id!=="string"||typeof item.direction!=="string")
   reject("每项修改必须只包含磁铁编号和方向。","Each modification must contain only a magnet ID and direction.");
  if(seen.has(item.id))reject("设计文件包含重复的磁铁编号："+item.id,"The design file contains a duplicate magnet ID: "+item.id);
  seen.add(item.id);
  if(!base.magnetById.has(item.id))reject("设计包含未知磁铁编号："+item.id,"The design contains an unknown magnet ID: "+item.id);
  if(!(EDIT_DIRECTIONS as readonly string[]).includes(item.direction))
   reject("设计包含不支持的方向。","The design contains an unsupported direction.");
  overrides[item.id]=item.direction as Direction;
 }
 return {document:parsed as unknown as DesignDocument,overrides:normalizeOverrides(base,overrides)};
}
function emptyEntry():DesignEntry{return {overrides:{},past:[],future:[],savedOverrides:null,savedAt:null};}
export function initialDesignState():DesignState{return {original:emptyEntry(),latest:emptyEntry()};}
function commit(entry:DesignEntry,next:DirectionOverrides):DesignEntry{
 if(sameOverrides(entry.overrides,next))return entry;
 return {...entry,overrides:next,past:[...entry.past,entry.overrides].slice(-MAX_HISTORY),future:[]};
}
export function designReducer(state:DesignState,action:DesignAction):DesignState{
 const entry=state[action.scheme],base=models[action.scheme];let next=entry;
 if(action.type==="edit"){
  const original=base.magnetById.get(action.id);if(!original||!EDIT_DIRECTIONS.includes(action.direction))return state;
  const overrides={...entry.overrides};if(action.direction===original.direction)delete overrides[action.id];else overrides[action.id]=action.direction;
  next=commit(entry,overrides);
 }else if(action.type==="replace"){
  next=commit(entry,normalizeOverrides(base,action.overrides));
 }else if(action.type==="reset"){
  next=commit(entry,{});
 }else if(action.type==="undo"&&entry.past.length){
  next={...entry,overrides:entry.past[entry.past.length-1],past:entry.past.slice(0,-1),future:[entry.overrides,...entry.future].slice(0,MAX_HISTORY)};
 }else if(action.type==="redo"&&entry.future.length){
  next={...entry,overrides:entry.future[0],past:[...entry.past,entry.overrides].slice(-MAX_HISTORY),future:entry.future.slice(1)};
 }else if(action.type==="saved"){
  next={...entry,savedOverrides:{...action.overrides},savedAt:action.at};
 }
 return next===entry?state:{...state,[action.scheme]:next};
}
