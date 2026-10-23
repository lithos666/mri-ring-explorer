import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import crypto from "node:crypto";
import {models} from "../lib/mri.ts";
import {ASSEMBLY_DURATION_SECONDS,assemblyEaseInOut,assemblyPhaseProgress} from "../lib/assembly-timing.ts";
import {RETAINER_LOCATIONS,TEMPORARY_CLIP_COUNT} from "../lib/assembly-ring-retainers.ts";
import {isAssemblySequenceStage,legacyAssemblyScene,sequenceBaseQuarters,sequenceColumnCycle,sequenceColumnPose,sequenceCoveredColumns,sequenceCapPose,sequenceClipPose,sequenceCoverFraction} from "../lib/assembly-sequence.ts";
import {ACRYLIC_THICKNESS_MM,ASSEMBLY_BORE_DIAMETER_MM,ASSEMBLY_ROD_DIAMETER_MM,CONFIRMED_ROD_QUANTITY,ROD_LAYER_GROUPS,VERIFIED_ROD_AXES,SPACER_GAPS,rodBankExtentMM,assemblyCADBoreCorrectionRadians} from "../lib/assembly-sequence-geometry.ts";

const samples=Array.from({length:2001},(_,i)=>i/2000);
const close=(actual:number,expected:number,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected}`);
function threshold(predicate:(progress:number)=>boolean){
 let low=0,high=1;
 assert.ok(predicate(high),"The expected operation must finish within the lesson");
 for(let iteration=0;iteration<48;iteration++){const middle=(low+high)/2;if(predicate(middle))high=middle;else low=middle;}
 return high;
}

test("the eleven teaching stages retain the intended mechanical order",()=>{
 const order=[11,12,13,14,15,16,17,18,19,20,21];
 assert.ok(order.every(isAssemblySequenceStage));
 assert.ok(!isAssemblySequenceStage(10)&&!isAssemblySequenceStage(22));
 assert.deepEqual(order.map(legacyAssemblyScene),[1,3,4,3,2,4,6,8,9,7,0]);
 assert.deepEqual(sequenceBaseQuarters(12),[0,1]);
 assert.deepEqual(sequenceBaseQuarters(14),[2,3]);
 assert.deepEqual(sequenceBaseQuarters(15),[0,1,2,3]);
});

test("each half receives exactly fourteen columns with monotone seating and release",()=>{
 for(const stage of [12,14]){
  close(sequenceColumnCycle(stage,0),0);close(sequenceColumnCycle(stage,1),14);
  for(let index=0;index<14;index++){
   let previous=sequenceColumnPose(stage,0,index);
   assert.ok(!previous.visible&&!previous.seated&&!previous.released);
   for(const progress of samples){
    const pose=sequenceColumnPose(stage,progress,index);
    assert.ok(pose.drop>=0&&pose.drop<=32);
    assert.ok(pose.drop<=previous.drop+1e-9,"A loaded column must not rise again");
    assert.ok(!previous.visible||pose.visible);
    assert.ok(!previous.seated||pose.seated);
    assert.ok(!previous.released||pose.released);
    assert.ok(!pose.released||pose.seated);
    previous=pose;
   }
   assert.ok(previous.visible&&previous.seated&&previous.released);close(previous.drop,0);
  }
 }
});

test("acrylic covers a column before that column's hold is released",()=>{
 for(const stage of [12,14]){
  let previous=0;
  for(const progress of samples){
   const covered=sequenceCoveredColumns(stage,progress);
   assert.ok(covered>=previous-1e-9&&covered>=0&&covered<=14);
   for(let index=0;index<14;index++)if(sequenceColumnPose(stage,progress,index).released)assert.ok(covered>=index+1-1e-9);
   const half=stage===12?0:1;
   close((sequenceCoverFraction(stage,progress,half*2)+sequenceCoverFraction(stage,progress,half*2+1))*7,covered);
   previous=covered;
  }
  for(let index=0;index<14;index++){
   const release=threshold(progress=>sequenceColumnPose(stage,progress,index).released);
   const before=sequenceCoveredColumns(stage,Math.max(0,release-1e-5));
   assert.ok(before>index,"Acrylic must advance while this column is still held");
   assert.ok(sequenceCoveredColumns(stage,release)>=index+1-1e-9);
  }
 }
});

test("a temporary clip arrives only behind the advancing acrylic edge",()=>{
 for(const stage of [12,14])for(const progress of samples)for(const location of RETAINER_LOCATIONS){
  const clip=sequenceClipPose(stage,progress,location);
  if(!clip.visible)continue;
  const covered=sequenceCoverFraction(stage,progress,location.quarter);
  const position=(location.slot+.5)/3;
  assert.ok(covered>=position-1e-9,`Stage ${stage}, progress ${progress}, clip ${location.index}: cover ${covered} has not reached ${position}`);
 }
});

test("each clip withdrawal waits for its own cap's restraint",()=>{
 // These fixtures describe which cap bridges each clip position, independently
 // of the helper's remaining-cap lookup: seam pairs first, outer clips last.
 const removals=[
  {stage:13,indices:[2,3],cap:1},
  {stage:14,indices:[8,9],cap:3},
  {stage:16,indices:[0,1,10,11],cap:0},
  {stage:16,indices:[4,5,6,7],cap:2},
 ];
 for(const operation of removals)for(const index of operation.indices){
  const location=RETAINER_LOCATIONS[index];
  let wasVisible=false,removed=false,previousOffset=Infinity;
  for(const progress of samples){
   const clip=sequenceClipPose(operation.stage,progress,location);
   const cap=sequenceCapPose(operation.stage,progress,operation.cap);
   if((wasVisible&&clip.visible&&clip.radialOffset>previousOffset+1e-8)||wasVisible&&!clip.visible){
    assert.ok(cap.visible&&cap.restrained,`Clip ${index} withdrawn without cap ${operation.cap} restraint in stage ${operation.stage}`);
    close(cap.approach,1);
   }
   if(wasVisible&&!clip.visible)removed=true;
   if(clip.visible){wasVisible=true;previousOffset=clip.radialOffset;}
  }
  assert.ok(wasVisible&&removed,`Clip ${index} must be present before it is removed`);
 }
});

test("outer clips remain after the first central cap and all leave before completion",()=>{
 assert.equal(TEMPORARY_CLIP_COUNT,12);
 const visible=(stage:number,progress:number)=>RETAINER_LOCATIONS.filter(location=>sequenceClipPose(stage,progress,location).visible).map(location=>location.index);
 assert.deepEqual(visible(12,1),[0,1,2,3,4,5]);
 assert.deepEqual(visible(13,1),[0,1,4,5]);
 assert.deepEqual(visible(14,1),[6,7,10,11]);
 assert.deepEqual(visible(15,1),[0,1,4,5,6,7,10,11]);
 assert.deepEqual(visible(16,1),[]);
 assert.deepEqual(visible(17,0),[]);
 for(const stage of [13,14,15,16,17])for(const progress of samples)for(let quarter=0;quarter<4;quarter++){
  const cap=sequenceCapPose(stage,progress,quarter);
  if(cap.seat>0)close(cap.approach,1);
  if(cap.fasten>0)close(cap.seat,1);
 }
});

test("eight rods form two five-layer banks and thirty-two spacers occupy only their eight gaps",()=>{
 assert.deepEqual(ROD_LAYER_GROUPS,[[1,2,3,4,5],[10,11,12,13,14]]);
 assert.equal(CONFIRMED_ROD_QUANTITY,8);
 assert.equal(VERIFIED_ROD_AXES.length*ROD_LAYER_GROUPS.length,CONFIRMED_ROD_QUANTITY);
 const expectedGaps=ROD_LAYER_GROUPS.flatMap(group=>group.slice(0,-1));
 assert.deepEqual([...SPACER_GAPS],expectedGaps);
 assert.equal(SPACER_GAPS.length*VERIFIED_ROD_AXES.length,32);
 for(const group of ROD_LAYER_GROUPS){
  const first=models.latest.rings[group[0]-1].zMM,last=models.latest.rings[group[group.length-1]-1].zMM;
  const extent=rodBankExtentMM(first,last);
  assert.ok(extent.low<extent.high&&extent.endAllowance>0);
  close(extent.center,(extent.low+extent.high)/2);
  close(extent.displayLength,extent.high-extent.low+2*extent.endAllowance);
  for(const layer of models.latest.rings){
   const inBank=layer.zMM>=extent.low&&layer.zMM<=extent.high;
   assert.equal(inBank,(group as readonly number[]).includes(layer.id));
  }
 }
 close(ASSEMBLY_ROD_DIAMETER_MM,6);assert.ok(ASSEMBLY_BORE_DIAMETER_MM>ASSEMBLY_ROD_DIAMETER_MM);
 close(ACRYLIC_THICKNESS_MM,2);
});

test("the four rod axes are evidenced by matching registered CAD sources across all fourteen layers",()=>{
 const read=(filename:string)=>fs.readFileSync(new URL(filename,import.meta.url));
 const auditText=read("../lib/assembly-bore-audit.json").toString("utf8");
 assert.ok(!/[A-Za-z]:[\\/]|OneDrive|Users[\\/]/.test(auditText),"The shared audit must not contain absolute private paths");
 const audit=JSON.parse(auditText);
 const manifest=JSON.parse(read("../public/assembly/manifest.json").toString("utf8"));
 assert.equal(audit.layers.length,14);close(audit.nominalBoreDiameterMM,6.2);
 for(const evidence of audit.layers){
  const registered=manifest.layers.find((layer:{ring:number})=>layer.ring===evidence.ring);
  assert.ok(registered);assert.match(evidence.sourceSha256,/^[a-f0-9]{64}$/);
  assert.equal(evidence.sourceSha256,registered.sourceSha256);
  const glb=read(`../public${registered.url}`),jsonLength=glb.readUInt32LE(12),gltf=JSON.parse(glb.subarray(20,20+jsonLength).toString("utf8"));
  assert.equal(crypto.createHash("sha256").update(glb).digest("hex"),registered.sha256);
  assert.equal(gltf.asset.extras.sourceSha256,evidence.sourceSha256);
  assert.equal(evidence.axes.length,4);
  const correction=assemblyCADBoreCorrectionRadians(evidence.ring);
  for(const axis of evidence.axes){
   assert.ok(axis.baseFaces>=1&&axis.capFaces>=1,"A rod axis requires coaxial walls in both base and cap");
   assert.ok(axis.maxRadialResidualMM<1e-8);close(axis.radius*2,ASSEMBLY_BORE_DIAMETER_MM,1e-8);
   const x=axis.x*Math.cos(correction)-axis.y*Math.sin(correction),y=axis.x*Math.sin(correction)+axis.y*Math.cos(correction);
   assert.ok(Math.min(...VERIFIED_ROD_AXES.map(target=>Math.hypot(target.x-x,target.y-y)))<1e-8,`R${evidence.ring} rod axis is misregistered`);
  }
  const columns=correction/(2*Math.PI/28);
  close(columns,Math.round(columns));
  assert.equal(Math.round(columns),evidence.ring===1||evidence.ring===14?3:0);
 }
});

test("all stages share an eight-second monotone playback without overshoot",()=>{
 assert.equal(ASSEMBLY_DURATION_SECONDS,8);
 close(assemblyEaseInOut(0),0);close(assemblyEaseInOut(1),1);
 let previous=0;
 for(const value of samples){
  const eased=assemblyEaseInOut(value);
  assert.ok(eased>=previous-1e-12&&eased>=0&&eased<=1);
  close(eased,1-assemblyEaseInOut(1-value),1e-10);
  previous=eased;
 }
 close(assemblyPhaseProgress(-1,.1,.9),0);close(assemblyPhaseProgress(2,.1,.9),1);
});
