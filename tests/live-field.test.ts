import assert from "node:assert/strict";
import fs from "node:fs";
import {models} from "../lib/mri.ts";
import {applyOverrides} from "../lib/design.ts";
import {sourcesFor,fieldAt,nearMagnet,type Vec3} from "../lib/field.ts";
import {decodeBaseline,solveLiveField,sourceSignature,planePoint,Cancelled,type LiveFieldRequest} from "../lib/live-field.ts";
const norm=(p:Vec3)=>Math.hypot(...p);
for(const model of Object.values(models)){
 const bytes=fs.readFileSync("public/live-field-baseline-"+model.id+".bin"),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),baseline=decodeBaseline(buffer);
 const baseSources=sourcesFor(model);assert.equal(baseline.header.signature,await sourceSignature(baseSources));assert.equal(baseline.header.count,model.magnets.length);
 const id="R07-L1-A"+String(model.repeats).padStart(2,"0"),edited=applyOverrides(model,{[id]:"tangent"}),items=sourcesFor(edited);
 const request:LiveFieldRequest={type:"solve",revision:1,schemeId:model.id,baseline:baseSources,current:items,angle:model.angularOffset};
 const result=await solveLiveField(request,baseline,{cancelled:()=>false});
 assert.equal(result.changedCount,1);assert.deepEqual(result.center,fieldAt([0,0,0],items));assert.ok(Math.abs(result.centerRatio-norm(result.center)/norm(baseline.header.center))<1e-12);
 assert.ok(result.lines3D.length>0);let alignment=1;
 for(const line of result.lines3D)for(let j=0;j<line.length-1;j++){
  const a=line[j],b=line[j+1],p:Vec3=[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],v:Vec3=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],truth=fieldAt(p,items);
  const cosine=v.reduce((sum,value,i)=>sum+value*truth[i],0)/(norm(v)*norm(truth));alignment=Math.min(alignment,cosine);assert.ok(cosine>=.98-1e-12,"Displayed segment must follow full 3D analytical B");
  assert.ok(!nearMagnet(a,.08,items));assert.ok(!nearMagnet(b,.08,items));
 }
 for(const [col,row] of [[30,30],[32,26],[20,35],[40,20]]){
  const i=row*result.plane.n+col;if(result.plane.mask[i])continue;
  const p=planePoint(-result.plane.bound+col*result.plane.step,-result.plane.bound+row*result.plane.step,result.plane.angle),exact=fieldAt(p,items);
  exact.forEach((v,k)=>assert.ok(Math.abs(v-result.plane.values[i*3+k])<1e-8));
 }
 const grouped=applyOverrides(model,Object.fromEntries(model.magnets.filter(m=>m.ring===3&&m.radial===2).map(m=>[m.id,"in"])));
 const mixed=applyOverrides(model,{...Object.fromEntries(grouped.magnets.filter(m=>m.ring===3&&m.radial===2).map(m=>[m.id,m.direction])),["R03-L2-A02"]:"axialUp"});
 for(const current of [sourcesFor(grouped),sourcesFor(mixed)]){
  const batch=await solveLiveField({...request,revision:4,current},baseline,{cancelled:()=>false});
  assert.deepEqual(batch.center,fieldAt([0,0,0],current));
  for(const [col,row] of [[30,30],[32,26],[20,35]]){
   const i=row*batch.plane.n+col;if(batch.plane.mask[i])continue;
   const exact=fieldAt(planePoint(-batch.plane.bound+col*batch.plane.step,-batch.plane.bound+row*batch.plane.step,batch.plane.angle),current);
   exact.forEach((v,k)=>assert.ok(Math.abs(v-batch.plane.values[i*3+k])<1e-8));
  }
  assert.equal(batch.changedCount,model.repeats);
 }
 const reset=await solveLiveField({...request,revision:2,current:baseSources},baseline,{cancelled:()=>false});
 assert.equal(reset.changedCount,0);assert.equal(reset.centerRatio,1);assert.deepEqual(reset.plane.values,baseline.plane);
 let cancel=false;const timer=setTimeout(()=>{cancel=true},40);
 await assert.rejects(solveLiveField({...request,revision:3},baseline,{cancelled:()=>cancel}),Cancelled);clearTimeout(timer);
 console.log(JSON.stringify({scheme:model.id,changedCount:result.changedCount,centerRatio:result.centerRatio,verifiedSegments:true,minimumAlignment:alignment,mapSamples:"PASS",reset:"bit-identical",cancellation:"PASS"}));
}
