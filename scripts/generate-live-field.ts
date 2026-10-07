// Build or validate immutable vector grids for both supplied configurations.
// Legacy exact-source fingerprints can be upgraded only after a full source/spec match.
import fs from "node:fs";
import {createHash} from "node:crypto";
import path from "node:path";
import {models} from "../lib/mri.ts";
import {sourcesFor} from "../lib/field.ts";
import {generateBaseline,encodeBaseline,decodeBaseline,sourceSignature,DEFAULT_VOLUME,DEFAULT_PLANE} from "../lib/live-field.ts";
const output=process.argv[2]??path.resolve("public");
fs.mkdirSync(output,{recursive:true});
for(const model of Object.values(models)){
 const sources=sourcesFor(model),signature=await sourceSignature(sources),destination=path.join(output,"live-field-baseline-"+model.id+".bin");
 try{
  const bytes=fs.readFileSync(destination),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),old=decodeBaseline(buffer);
  const legacy=createHash("sha256").update(JSON.stringify(sources)).digest("hex");
  if((old.header.signature===signature||old.header.signature===legacy)&&old.header.count===sources.length&&old.header.plane.angle===model.angularOffset&&old.header.volume.n===DEFAULT_VOLUME.n&&old.header.volume.bound===DEFAULT_VOLUME.bound&&old.header.plane.n===DEFAULT_PLANE.n&&old.header.plane.bound===DEFAULT_PLANE.bound){
   if(old.header.signature!==signature){old.header.signature=signature;fs.writeFileSync(destination,encodeBaseline(old));}
   console.log("Live baseline cache verified",model.id,sources.length);continue;
  }
 }catch{}
 const began=performance.now();let displayed=-1;
 const baseline=await generateBaseline(sources,model.angularOffset,{cancelled:()=>false,progress:p=>{
  const percent=Math.floor(p.done/p.total*10)*10;if(percent!==displayed){displayed=percent;console.log(model.id,percent+"%");}
 }});
 fs.writeFileSync(destination,encodeBaseline(baseline));
 console.log(JSON.stringify({scheme:model.id,count:sources.length,center:baseline.header.center,bytes:fs.statSync(destination).size,seconds:(performance.now()-began)/1000,signature}));
}
