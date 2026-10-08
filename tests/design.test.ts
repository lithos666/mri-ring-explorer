import assert from "node:assert/strict";
import {models,normalFor,DIRECTIONS,type Direction,type SchemeId,type MRIModel} from "../lib/mri.ts";
import {
 selectionTargets,applyOverrides,designReducer,initialDesignState,normalizeOverrides,sameOverrides,
 geometrySignature,exportDesign,validateDesign,MAX_HISTORY,MAX_IMPORT_BYTES,
 type DirectionOverrides,type DesignState
} from "../lib/design.ts";
import {sourcesFor,fieldAt,cuboidField,dot,cross,type Vec3} from "../lib/field.ts";

let passed=0;
function test(name:string,run:()=>void){try{run();passed++;}catch(error){console.error("FAIL: "+name);throw error;}}
function close(a:number,b:number,tolerance=1e-11){assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b)),a+" != "+b);}
function vectorClose(a:Vec3,b:Vec3,tolerance=1e-11){for(let k=0;k<3;k++)close(a[k],b[k],tolerance);}
const opposite:Record<Direction,Direction>={out:"in",in:"out",axial:"axialUp",axialUp:"axial",tangent:"tangentNeg",tangentNeg:"tangent"};
const probe:Vec3=[1.73,2.11,-.91];

for(const scheme of ["original","latest"] as SchemeId[]){
 const base=models[scheme],target=base.magnets[base.magnets.length-1],index=base.magnets.length-1;
 test(scheme+": single magnet edit leaves every other magnet and geometry unchanged",()=>{
  const old=JSON.stringify(base.magnets),edited=applyOverrides(base,{[target.id]:"axialUp"});
  assert.notEqual(edited,base);assert.equal(edited.magnets.length,base.magnets.length);
  assert.equal(edited.magnetById.get(target.id)!.direction,"axialUp");
  assert.deepEqual(edited.magnetById.get(target.id)!.normal,[0,1,0]);
  assert.equal(base.magnetById.get(target.id)!.direction,target.direction);
  assert.equal(JSON.stringify(base.magnets),old);
  assert.equal(edited.rings,base.rings);assert.equal(edited.dimensions,base.dimensions);
  assert.equal(edited.blockSize,base.blockSize);assert.equal(edited.unitMM,base.unitMM);
  for(let i=0;i<base.magnets.length;i++){
   const oldMagnet=base.magnets[i],newMagnet=edited.magnets[i];
   if(i!==index)assert.equal(newMagnet,oldMagnet);
   assert.deepEqual(edited.position(newMagnet),base.position(oldMagnet));
   assert.equal(newMagnet.theta,oldMagnet.theta);assert.equal(newMagnet.radius,oldMagnet.radius);
  }
  assert.equal(Object.values(edited.totals).reduce((a,b)=>a+b,0),base.magnets.length);
 });
 test(scheme+": restoring the original orientation removes the override",()=>{
  let state=initialDesignState();
  state=designReducer(state,{type:"edit",scheme,id:target.id,direction:"axialUp"});
  state=designReducer(state,{type:"edit",scheme,id:target.id,direction:target.direction});
  assert.deepEqual(state[scheme].overrides,{});assert.equal(state[scheme].past.length,2);
  assert.equal(applyOverrides(base,{}),base);
 });
 test(scheme+": source cache follows edited model identity and field delta",()=>{
  const initialSources=sourcesFor(base),originalField=fieldAt(probe,initialSources);
  assert.equal(sourcesFor(base),initialSources);
  for(const direction of DIRECTIONS){
   const edited=applyOverrides(base,{[target.id]:direction}),editedSources=sourcesFor(edited);
   assert.notEqual(editedSources,initialSources);
   assert.equal(sourcesFor(edited),editedSources);
   assert.deepEqual(editedSources[index].n,normalFor(target.theta,direction));
   const expected=originalField.map((v,i)=>v+cuboidField(probe,editedSources[index])[i]-cuboidField(probe,initialSources[index])[i]) as Vec3;
   vectorClose(fieldAt(probe,editedSources),expected,2e-12);
  }
  vectorClose(fieldAt(probe,sourcesFor(base)),originalField,1e-13);
 });
 test(scheme+": six presets have orthonormal frames and polarity reversal",()=>{
  for(const direction of DIRECTIONS){
   const edited=applyOverrides(base,{[target.id]:direction}),source=sourcesFor(edited)[index];
   close(dot(source.u,source.u),1);close(dot(source.v,source.v),1);close(dot(source.n,source.n),1);
   close(dot(source.u,source.v),0);close(dot(source.u,source.n),0);close(dot(source.v,source.n),0);
   vectorClose(cross(source.u,source.n),source.v);
   const reversed=applyOverrides(base,{[target.id]:opposite[direction]}),reversedSource=sourcesFor(reversed)[index];
   vectorClose(cuboidField(probe,reversedSource),cuboidField(probe,source).map(v=>-v) as Vec3,2e-12);
  }
 });
 test(scheme+": reversing every N pole reverses the complete field",()=>{
  const overrides=Object.fromEntries(base.magnets.map(m=>[m.id,opposite[m.direction]])) as DirectionOverrides;
  const reversed=applyOverrides(base,overrides);
  for(const point of [probe,[0,0,0],[0,-1,1]] as Vec3[])
   vectorClose(fieldAt(point,sourcesFor(reversed)),fieldAt(point,sourcesFor(base)).map(v=>-v) as Vec3,2e-11);
 });
 test(scheme+": save/export/import round trip includes remote circumferential columns",()=>{
  const remote=base.magnets.find(m=>m.sector===base.repeats)!;
  const overrides={[target.id]:"tangentNeg" as Direction,[remote.id]:"axialUp" as Direction};
  const exported=exportDesign(base,overrides,"2026-10-07T12:00:00.000Z"),result=validateDesign(exported,base);
  assert.equal(result.document.schemeId,scheme);assert.equal(result.document.schemaVersion,1);
  assert.equal(result.document.geometrySignature,geometrySignature(base));assert.equal(result.document.overrides.length,2);
  assert.deepEqual(result.overrides,overrides);
  const withNoOp=exportDesign(base,{...overrides,[base.magnets[0].id]:base.magnets[0].direction});
  assert.deepEqual(validateDesign(withNoOp,base).overrides,overrides);
 });
 test(scheme+": known pre-calibration files migrate orientations by ID and re-export the new geometry",()=>{
  const legacy=scheme==="original"?"mri-geometry-v1-5dcf4af15e147bc7":"mri-geometry-v1-54bb73676fa86225";
  const overrides:DirectionOverrides={};
  DIRECTIONS.forEach((direction,i)=>{const m=base.magnets[base.magnets.length-1-i];if(direction!==m.direction)overrides[m.id]=direction;});
  const doc=JSON.parse(exportDesign(base,overrides));doc.geometrySignature=legacy;
  const valid=validateDesign(JSON.stringify(doc),base);assert.equal(valid.migrated,true);assert.deepEqual(valid.overrides,overrides);assert.equal(valid.document.geometrySignature,geometrySignature(base));
  const next=validateDesign(exportDesign(base,valid.overrides),base);assert.equal(next.migrated,false);assert.deepEqual(next.overrides,overrides);
  assert.throws(()=>validateDesign(JSON.stringify(doc),{...base,blockSize:base.blockSize*1.01}));
 });
 test(scheme+": incompatible or malformed import cannot alter state or baseline",()=>{
  const exported=JSON.parse(exportDesign(base,{[target.id]:"tangent"})),before=JSON.stringify(base.magnets);
  const invalidCases:Array<(doc:any)=>void>=[
   doc=>{doc.schemaVersion=2;},doc=>{doc.schemeId=scheme==="original"?"latest":"original";},
   doc=>{doc.geometrySignature="wrong";},doc=>{delete doc.createdAt;},doc=>{doc.createdAt="invalid";},
   doc=>{doc.overrides.push({...doc.overrides[0]});},doc=>{doc.overrides[0].id="R99-L0-A00";},
   doc=>{doc.overrides[0].direction="bad";},doc=>{doc.overrides[0].theta=0;},
   doc=>{doc.overrides[0].normal=[0,0,0];},doc=>{doc.overrides[0].radius=999;},
   doc=>{doc.magnets=[];},doc=>{doc.overrides=null;},doc=>{doc.overrides=new Array(base.magnets.length+1).fill(exported.overrides[0]);}
  ];
  for(const mutate of invalidCases){
   const invalid=structuredClone(exported);mutate(invalid);
   assert.throws(()=>validateDesign(JSON.stringify(invalid),base));
  }
  assert.throws(()=>validateDesign("{",base));assert.throws(()=>validateDesign(" ".repeat(MAX_IMPORT_BYTES+1),base));
  assert.throws(()=>normalizeOverrides(base,{"unknown":"in"}));
  assert.equal(JSON.stringify(base.magnets),before);
 });
 test(scheme+": history records one action per actual change and supports reset/import undo",()=>{
  let state=initialDesignState();
  state=designReducer(state,{type:"edit",scheme,id:target.id,direction:"tangent"});
  assert.equal(state[scheme].past.length,1);
  const noOp=designReducer(state,{type:"edit",scheme,id:target.id,direction:"tangent"});assert.equal(noOp,state);
  const beforeReset=state[scheme].overrides;
  state=designReducer(state,{type:"reset",scheme});assert.deepEqual(state[scheme].overrides,{});
  state=designReducer(state,{type:"undo",scheme});assert.deepEqual(state[scheme].overrides,beforeReset);
  state=designReducer(state,{type:"redo",scheme});assert.deepEqual(state[scheme].overrides,{});
  state=designReducer(state,{type:"undo",scheme});
  const imported=validateDesign(exportDesign(base,{[target.id]:"axialUp"}),base).overrides;
  state=designReducer(state,{type:"replace",scheme,overrides:imported});
  assert.equal(state[scheme].future.length,0);
  state=designReducer(state,{type:"undo",scheme});assert.deepEqual(state[scheme].overrides,beforeReset);
  state=designReducer(state,{type:"redo",scheme});assert.deepEqual(state[scheme].overrides,imported);
 });
 test(scheme+": save metadata preserves undo history and does not load a design",()=>{
  let state=initialDesignState();
  const saved={[target.id]:"tangent" as Direction};
  state=designReducer(state,{type:"saved",scheme,overrides:saved,at:"2026-10-07T12:00:00.000Z"});
  assert.deepEqual(state[scheme].overrides,{});assert.equal(state[scheme].past.length,0);
  assert.equal(state[scheme].savedAt,"2026-10-07T12:00:00.000Z");
  state=designReducer(state,{type:"replace",scheme,overrides:saved});
  const history=state[scheme].past;
  state=designReducer(state,{type:"saved",scheme,overrides:state[scheme].overrides,at:"2026-10-07T12:01:00.000Z"});
  assert.equal(state[scheme].past,history);assert.ok(sameOverrides(state[scheme].overrides,state[scheme].savedOverrides!));
  state=designReducer(state,{type:"undo",scheme});assert.ok(!sameOverrides(state[scheme].overrides,state[scheme].savedOverrides!));
 });
}
test("two schemes retain independent edits, undo, redo and saves",()=>{
 let state=initialDesignState();const a=models.original.magnets[0].id,b=models.latest.magnets[1].id;
 state=designReducer(state,{type:"edit",scheme:"original",id:a,direction:"axialUp"});
 const original=state.original;
 state=designReducer(state,{type:"edit",scheme:"latest",id:b,direction:"tangentNeg"});
 assert.equal(state.original,original);
 state=designReducer(state,{type:"undo",scheme:"latest"});assert.equal(state.original,original);
 assert.equal(state.original.overrides[a],"axialUp");assert.deepEqual(state.latest.overrides,{});
 state=designReducer(state,{type:"redo",scheme:"latest"});assert.equal(state.latest.overrides[b],"tangentNeg");
 state=designReducer(state,{type:"reset",scheme:"original"});assert.equal(state.latest.overrides[b],"tangentNeg");
 assert.notEqual(geometrySignature(models.original),geometrySignature(models.latest));
});
test("history is bounded and an edit after undo invalidates redo",()=>{
 let state=initialDesignState();const id=models.latest.magnets[0].id;
 for(let i=0;i<MAX_HISTORY+20;i++)state=designReducer(state,{type:"edit",scheme:"latest",id,direction:i%2?"in":"axialUp"});
 assert.equal(state.latest.past.length,MAX_HISTORY);
 state=designReducer(state,{type:"undo",scheme:"latest"});assert.equal(state.latest.future.length,1);
 state=designReducer(state,{type:"edit",scheme:"latest",id,direction:"tangent"});assert.equal(state.latest.future.length,0);
});
console.log(JSON.stringify({result:"PASS",tests:passed,schemes:2,sourceCacheAndAnalyticalDelta:true,individualAndGlobalPolarityReversal:true,perSchemeHistory:true,atomicImportValidation:true}));

for(const scheme of ["original","latest"] as SchemeId[]){
 const base=models[scheme],group=selectionTargets(base,"R03-L2-A02","layer"),id="R03-L2-A02",outside="R09-L1-A01";
 test(scheme+": group targets, local angles, and geometry",()=>{
  assert.equal(group.length,base.repeats);assert.deepEqual(selectionTargets(base,id,"magnet").map(m=>m.id),[id]);assert.deepEqual(selectionTargets(base,"unknown","layer"),[]);
  for(const direction of DIRECTIONS){
   const state=designReducer(initialDesignState(),{type:"batch",scheme,updates:group.map(m=>({id:m.id,direction}))});
   const edited=applyOverrides(base,state[scheme].overrides);
   for(let i=0;i<base.magnets.length;i++){
    const m=edited.magnets[i],old=base.magnets[i];assert.equal(m.id,old.id);assert.deepEqual(edited.position(m),base.position(old));
    if(m.ring===3&&m.radial===2){assert.equal(m.direction,direction);vectorClose(m.normal,normalFor(m.theta,direction));}
    else assert.equal(m,old);
   }
   const a=edited.magnetById.get("R03-L2-A01")!,b=edited.magnetById.get("R03-L2-A"+String(base.repeats/2+1).padStart(2,"0"))!;
   vectorClose(b.normal,direction==="axial"||direction==="axialUp"?a.normal:a.normal.map(v=>-v) as Vec3);
  }
 });
 test(scheme+": atomic batch, mixed edits, single undo and redo",()=>{
  let state=designReducer(initialDesignState(),{type:"edit",scheme,id,direction:"axialUp"});
  state=designReducer(state,{type:"edit",scheme,id:outside,direction:"tangentNeg"});
  const before=state,updates=group.map(m=>({id:m.id,direction:"in" as Direction}));
  state=designReducer(state,{type:"batch",scheme,updates});const after=state;
  assert.equal(state[scheme].past.length,before[scheme].past.length+1);
  assert.equal(state[scheme].overrides[outside],"tangentNeg");assert.equal(Object.keys(state[scheme].overrides).length,base.repeats+1);
  assert.equal(designReducer(after,{type:"batch",scheme,updates}),after);
  state=designReducer(state,{type:"undo",scheme});assert.deepEqual(state[scheme].overrides,before[scheme].overrides);
  const current=applyOverrides(base,state[scheme].overrides);
  assert.equal(designReducer(state,{type:"batch",scheme,updates:group.map(m=>({id:m.id,direction:current.magnetById.get(m.id)!.direction}))}),state);
  state=designReducer(state,{type:"redo",scheme});assert.deepEqual(state[scheme].overrides,after[scheme].overrides);
  assert.deepEqual(designReducer(after,{type:"batch",scheme,updates:group.map(m=>({id:m.id,direction:"out"}))})[scheme].overrides,{[outside]:"tangentNeg"});
  for(const invalid of [
   [{id,direction:"out" as Direction},{id:"unknown",direction:"in" as Direction}],
   [{id,direction:"out" as Direction},{id,direction:"in" as Direction}],
   [{id,direction:"out" as Direction},{id:group[0].id,direction:"invalid" as Direction}]
  ])assert.equal(designReducer(after,{type:"batch",scheme,updates:invalid}),after);
 });
 test(scheme+": group field equals exact delta and is rotationally covariant",()=>{
  const state=designReducer(initialDesignState(),{type:"batch",scheme,updates:group.map(m=>({id:m.id,direction:"in"}))});
  const edited=applyOverrides(base,state[scheme].overrides),old=sourcesFor(base),next=sourcesFor(edited);
  for(const p of [probe,[0,0,0]] as Vec3[]){
   const expected=fieldAt(p,old);
   for(let i=0;i<base.magnets.length;i++)if(base.magnets[i].ring===3&&base.magnets[i].radial===2){
    const a=cuboidField(p,old[i]),b=cuboidField(p,next[i]);for(let k=0;k<3;k++)expected[k]+=b[k]-a[k];
   }
   vectorClose(fieldAt(p,next),expected,2e-11);
  }
  const angle=2*Math.PI/base.repeats,rotate=(v:Vec3):Vec3=>[v[0]*Math.cos(angle)-v[2]*Math.sin(angle),v[1],v[0]*Math.sin(angle)+v[2]*Math.cos(angle)];
  vectorClose(fieldAt(rotate(probe),next),rotate(fieldAt(probe,next)),2e-11);
 });
}
console.log("Grouped editing checks passed for both configurations.");
