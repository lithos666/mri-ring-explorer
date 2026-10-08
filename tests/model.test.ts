import assert from "node:assert/strict";
import {models,type Magnet} from "../lib/mri.ts";
import {MATLAB_GEOMETRY} from "../lib/matlab-geometry.ts";
for(const model of Object.values(models)){
 const latest=model.id==="latest",expected=latest?1736:756;
 assert.equal(model.rings.length,14);assert.equal(model.magnets.length,expected);assert.equal(model.magnetById.size,expected);
 assert.equal(model.radialPositionCount,latest?62:54);
 assert.equal(model.repeats,latest?28:14);assert.equal(model.repeatsConfirmed,true);
 assert.equal(model.unitMM,25);assert.equal(model.blockSizeMM,latest?12:10);assert.equal(model.pitchMM,latest?38:26);assert.equal(model.remanenceT,1.43);
 assert.deepEqual(model.rings.map(r=>r.radiiMM),MATLAB_GEOMETRY[model.id].radiiMM);
 for(const r of model.rings)assert.ok(Math.abs(r.zMM-model.ringY(r.id)*25)<1e-10);
 assert.deepEqual(model.totals,latest?{out:700,in:700,axial:336,axialUp:0,tangent:0,tangentNeg:0}:{out:266,in:266,axial:224,axialUp:0,tangent:0,tangentNeg:0});
 assert.deepEqual(model.rings.map(r=>r.directions.length*model.repeats),latest?[140,168,140,168,84,84,84,84,84,84,168,140,168,140]:[70,70,70,56,42,28,42,42,28,42,56,70,70,70]);
 assert.deepEqual(model.gradeTotals,latest?{Weak:0,Normal:0,Strong:0,Unspecified:1736}:{Weak:140,Normal:336,Strong:280,Unspecified:0});
 for(const m of model.magnets){
  const p=model.position(m),n=m.normal;
  assert.ok(Math.abs(Math.hypot(...n)-1)<1e-12);
  const radialDot=(p[0]*n[0]+p[2]*n[2])/m.radius;
  if(m.direction==="out")assert.ok(Math.abs(radialDot-1)<1e-12);
  if(m.direction==="in")assert.ok(Math.abs(radialDot+1)<1e-12);
  if(m.direction==="axial")assert.deepEqual(n,[0,-1,0]);
  const oppositeSector:number=(m.sector-1+model.repeats/2)%model.repeats+1;
  const opposite:Magnet=model.magnets.find(o=>o.ring===m.ring&&o.radial===m.radial&&o.sector===oppositeSector)!;
  assert.ok(opposite);const op=model.position(opposite);
  assert.ok(Math.abs(op[0]+p[0])<1e-12&&Math.abs(op[2]+p[2])<1e-12);assert.equal(op[1],p[1]);assert.equal(opposite.direction,m.direction);
 }
 for(const r of model.rings){
  const mirror=model.rings[14-r.id];assert.ok(Math.abs(model.ringY(r.id)+model.ringY(mirror.id))<1e-12);
  assert.deepEqual(r.radii,mirror.radii);
  assert.deepEqual(r.directions.map(d=>d==="out"?"in":d==="in"?"out":"axial"),mirror.directions);
 }
 assert.equal(model.magnets.filter(m=>m.sector===1||m.sector===model.repeats/2+1).length,model.radialPositionCount*2);
 if(latest){
  assert.ok(Math.abs(model.angularOffset*180/Math.PI-360/56)<1e-12);
  for(const m of model.magnets)assert.ok(Math.abs(Math.sin(2*m.theta))>1e-6,"Columns avoid the four support axes");
  assert.ok(Math.abs(model.ringY(1)*model.unitMM!-247)<1e-10);
  assert.equal(model.dimensions!.boreRadiusMM,110);assert.equal(model.dimensions!.magnetInnerMM,120);assert.equal(model.dimensions!.magnetOuterMM,192);
  for(const r of model.rings)for(const radius of r.radiiMM){assert.ok(radius-6>=120&&radius+6<=192);}
  assert.deepEqual(model.rings.slice(4,10).map(r=>r.directions),[["axial","axial","in"],["axial","out","axial"],["axial","out","axial"],["axial","in","axial"],["axial","in","axial"],["axial","axial","out"]]);
 }else{assert.equal(model.dimensions,null);assert.ok(Math.abs(model.rings[0].zMM-169)<1e-10);}
}
console.log("PASS: MATLAB geometry, Br, physical units, 756/1736 counts, 14/28 columns, opposite pairs, mirrored magnetization and preserved column phase.");
