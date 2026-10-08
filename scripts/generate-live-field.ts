// Build immutable baseline grids and complete initial results for both configurations.
import fs from "node:fs";
import {createHash} from "node:crypto";
import path from "node:path";
import {models} from "../lib/mri.ts";
import {sourcesFor} from "../lib/field.ts";
import {generateBaseline,encodeBaseline,decodeBaseline,sourceSignature,solveLiveField,DEFAULT_VOLUME,DEFAULT_PLANE,type Baseline} from "../lib/live-field.ts";
import {encodeInitialField,decodeInitialField} from "../lib/initial-field.ts";
const output=process.argv[2]??path.resolve("public");
const generationSignature=createHash("sha256").update(["scripts/generate-live-field.ts","lib/live-field.ts","lib/field.ts","lib/mri.ts","lib/initial-field.ts"].map(p=>fs.readFileSync(p,"utf8")).join("\n")).digest("hex");
fs.mkdirSync(output,{recursive:true});
for(const model of Object.values(models)){
 const sources=sourcesFor(model),signature=await sourceSignature(sources),destination=path.join(output,"live-field-baseline-"+model.id+".bin");
 let baseline:Baseline|undefined;
 try{
  const bytes=fs.readFileSync(destination),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),old=decodeBaseline(buffer);
  const legacy=createHash("sha256").update(JSON.stringify(sources)).digest("hex");
  if((old.header.signature===signature||old.header.signature===legacy)&&old.header.count===sources.length&&old.header.plane.angle===model.angularOffset&&old.header.volume.n===DEFAULT_VOLUME.n&&old.header.volume.bound===DEFAULT_VOLUME.bound&&old.header.plane.n===DEFAULT_PLANE.n&&old.header.plane.bound===DEFAULT_PLANE.bound){
   if(old.header.signature!==signature){old.header.signature=signature;fs.writeFileSync(destination,encodeBaseline(old));}
   baseline=old;console.log("Live baseline cache verified",model.id,sources.length);
  }
 }catch{}
 if(!baseline){
  const began=performance.now();let displayed=-1;
  baseline=await generateBaseline(sources,model.angularOffset,{cancelled:()=>false,progress:p=>{
   const percent=Math.floor(p.done/p.total*10)*10;if(percent!==displayed){displayed=percent;console.log(model.id,percent+"%");}
  }});
  fs.writeFileSync(destination,encodeBaseline(baseline));
  console.log(JSON.stringify({scheme:model.id,count:sources.length,bytes:fs.statSync(destination).size,seconds:(performance.now()-began)/1000,signature}));
 }
 const initialPath=path.join(output,"live-field-initial-"+model.id+".json"),expected={schemeId:model.id,signature,count:sources.length,angle:model.angularOffset,generationSignature};
 try{
  decodeInitialField(JSON.parse(fs.readFileSync(initialPath,"utf8")),expected);
  console.log("Initial field cache verified",model.id,sources.length);continue;
 }catch{}
 const started=performance.now();
 const result=await solveLiveField({type:"solve",revision:0,schemeId:model.id,baseline:sources,current:sources,angle:model.angularOffset},baseline,{cancelled:()=>false});
 const asset=encodeInitialField(result,signature,sources.length,generationSignature);
 decodeInitialField(asset,expected);
 fs.writeFileSync(initialPath,JSON.stringify(asset));
 console.log(JSON.stringify({initialField:model.id,lines:result.lines3D.length,minimumAlignment:result.quality.exactCheckMinimumAlignment,bytes:fs.statSync(initialPath).size,seconds:(performance.now()-started)/1000}));
}
