import assert from "node:assert/strict";
import fs from "node:fs";
import {models} from "../lib/mri.ts";
import {sourcesFor,fieldAt,nearMagnet,FIELD_KERNEL_VERSION,type Vec3} from "../lib/field.ts";
import {sourceSignature,decodeBaseline,planePoint} from "../lib/live-field.ts";
import {decodeInitialField,encodeInitialField} from "../lib/initial-field.ts";
for(const model of Object.values(models)){
 const sources=sourcesFor(model),signature=await sourceSignature(sources),raw=JSON.parse(fs.readFileSync("public/live-field-initial-"+model.id+".json","utf8"));
 const expected={schemeId:model.id,signature,count:sources.length,angle:model.angularOffset},result=decodeInitialField(raw,expected);
 assert.equal(result.revision,0);assert.equal(result.changedCount,0);
 assert.equal(result.fieldKernelVersion,FIELD_KERNEL_VERSION);
 assert.ok(result.plane.values instanceof Float32Array);assert.ok(result.plane.mask instanceof Uint8Array);
 assert.deepEqual(result.center,fieldAt([0,0,0],sources));assert.deepEqual(result.center,result.baselineCenter);assert.equal(result.centerRatio,1);
 const bytes=fs.readFileSync("public/live-field-baseline-"+model.id+".bin"),base=decodeBaseline(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 assert.equal(base.header.version,2);assert.equal(base.header.domain,"air");assert.equal(base.header.fieldKernelVersion,FIELD_KERNEL_VERSION);
 let materialNodes=0;
 for(let row=0;row<result.plane.n;row++)for(let col=0;col<result.plane.n;col++){
  const i=row*result.plane.n+col,p=planePoint(-result.plane.bound+col*result.plane.step,-result.plane.bound+row*result.plane.step,result.plane.angle);
  if(nearMagnet(p,0,sources)){materialNodes++;assert.equal(result.plane.mask[i],1);assert.deepEqual(Array.from(result.plane.values.slice(i*3,i*3+3)),[0,0,0]);}
 }
 assert.ok(materialNodes>0,"Air-grid placeholders must be masked, never displayed as material B");
 assert.deepEqual(result.plane.values,base.plane);
 const roundTrip=decodeInitialField(JSON.parse(JSON.stringify(encodeInitialField(result,signature,sources.length,raw.generationSignature))),expected);
 assert.deepEqual(roundTrip,result);
 for(const [col,row] of [[30,30],[32,26],[20,35],[40,20]]){
  const i=row*result.plane.n+col;if(result.plane.mask[i])continue;
  const p=planePoint(-result.plane.bound+col*result.plane.step,-result.plane.bound+row*result.plane.step,result.plane.angle),exact=fieldAt(p,sources);
  exact.forEach((v,k)=>assert.ok(Math.abs(v-result.plane.values[i*3+k])<1e-8));
 }
 assert.ok(result.lines3D.length>0);
 for(const line of result.lines3D){
  const j=Math.floor((line.length-1)/2),a=line[j],b=line[j+1],mid:Vec3=a.map((v,k)=>(v+b[k])/2) as Vec3,t:Vec3=a.map((v,k)=>b[k]-v) as Vec3,truth=fieldAt(mid,sources);
  const alignment=t.reduce((sum,v,k)=>sum+v*truth[k],0)/(Math.hypot(...t)*Math.hypot(...truth));assert.ok(alignment>=.98-1e-12);
 }
 assert.throws(()=>decodeInitialField(raw,{...expected,signature:"wrong"}));
 assert.throws(()=>decodeInitialField(raw,{...expected,count:expected.count-1}));
 assert.throws(()=>decodeInitialField(raw,{...expected,schemeId:model.id==="latest"?"original":"latest"}));
 assert.throws(()=>decodeInitialField({...raw,version:1},expected));
 assert.throws(()=>decodeInitialField({...raw,result:{...raw.result,fieldKernelVersion:"old-kernel"}},expected));
 console.log("PASS initial field",model.id,"exact center/grid, lossless typed-array roundtrip, 3D alignment, provenance rejection");
}
