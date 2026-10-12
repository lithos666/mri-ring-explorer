import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { models } from '../lib/mri.ts';
import { teachingParts, teachingSteps } from '../lib/teaching.ts';

const project=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(project,'lib/cad-manifest.json'),'utf8'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const near=(actual,expected,tolerance=1e-6)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} differs from ${expected}`);
const point=(p,m)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
const publicFile=url=>path.join(project,'public',url.replace(/^\//,''));
function glbJSON(file) {
 const bytes=fs.readFileSync(file);assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const jsonLength=bytes.readUInt32LE(12);assert.equal(bytes.readUInt32LE(16),0x4e4f534a);
 return JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8'));
}
assert.deepEqual(manifest.target,{rings:14,columns:28,magnetCount:1736,magnetEdgeMM:12,magnetPitchMM:38,magnetLocalCenterZMM:9});
assert.equal(models.latest.magnets.length,1736);assert.equal(models.latest.repeats,28);
assert.equal(manifest.layers.length,14);
const resourceIDs=new Set(manifest.resources.map(r=>r.id));assert.equal(resourceIDs.size,manifest.resources.length);
assert.deepEqual(manifest.resources,JSON.parse(fs.readFileSync(path.join(project,'lib/teaching-resources.json'),'utf8')),'CAD and teaching resource catalogs differ');
const partIDs=new Set(teachingParts.map(p=>p.id)),stepIDs=new Set(teachingSteps.map(s=>s.id));
for(const resource of manifest.resources) {
 const bytes=fs.readFileSync(publicFile(resource.url));assert.equal(bytes.length,resource.bytes,resource.id);assert.equal(hash(bytes),resource.sha256,resource.id);
 assert.ok(resource.partIds.length&&resource.stepIds.length,`Resource linkage missing: ${resource.id}`);
 assert.ok(resource.partIds.every(id=>partIDs.has(id)),`Unknown BOM link: ${resource.id}`);
 assert.ok(resource.stepIds.every(id=>stepIDs.has(id)),`Unknown assembly link: ${resource.id}`);
}
assert.deepEqual(manifest.resources.filter(r=>r.id.startsWith('print-prototype-')).map(r=>r.id),['print-prototype-v4']);
assert.equal(manifest.resources.filter(r=>r.category==='print').length,5);
for(const filename of ['print-prototype-v0.3mf','print-prototype-v1.3mf','print-prototype-v2.3mf','print-prototype-v3.3mf','fastener-nut-reference.png'])assert.ok(!fs.existsSync(publicFile(`/resources/${filename}`)),`Retired publication file remains: ${filename}`);
assert.ok(!manifest.resources.some(r=>/M10/.test(`${r.titleZh} ${r.titleEn}`)),'M10 is not used in this assembly');
for(const id of ['fastener-l-bracket-diagram','fastener-m3-diagram','fastener-m6-diagram'])assert.ok(resourceIDs.has(id),`Missing hardware diagram: ${id}`);
const matlabResources=manifest.resources.filter(r=>r.type==='MATLAB');assert.equal(matlabResources.length,7);
for(const resource of matlabResources)assert.equal(hash(fs.readFileSync(path.join(project,resource.sourceRelativePath))),resource.sha256,`MATLAB download differs from preserved source: ${resource.id}`);
const conflicts=[];
for(const layer of manifest.layers) {
 const m=layer.sourceToCanonical;assert.equal(m.length,16);
 for(let c=0;c<3;c++){near(Math.hypot(...m.slice(4*c,4*c+3)),1);for(let d=c+1;d<3;d++)near(m[4*c]*m[4*d]+m[4*c+1]*m[4*d+1]+m[4*c+2]*m[4*d+2],0);}
 const det=m[0]*(m[5]*m[10]-m[9]*m[6])-m[4]*(m[1]*m[10]-m[9]*m[2])+m[8]*(m[1]*m[6]-m[5]*m[2]);near(det,1);
 assert.equal(layer.nodes.filter(n=>n.role==='base').length,4);assert.equal(layer.nodes.filter(n=>n.role==='cover').length,4);
 for(const n of layer.nodes.filter(n=>n.role==='base'))near(n.canonicalBounds.size[2],15);
 for(const n of layer.nodes.filter(n=>n.role==='cover'))near(n.canonicalBounds.size[2],7);
 const bytes=fs.readFileSync(publicFile(layer.url));assert.equal(hash(bytes),layer.sha256);
 const gltf=glbJSON(publicFile(layer.url));assert.equal(gltf.nodes.length,layer.nodes.length);assert.equal(gltf.asset.extras.unit,'millimeter');assert.equal(gltf.asset.extras.sourceSha256,layer.sourceSha256);
 near(Math.hypot(...layer.jointGuide.direction),1);near(Math.hypot(...layer.closureGuide.direction),1);near(layer.jointGuide.direction.reduce((v,a,d)=>v+a*layer.closureGuide.direction[d],0),0);
 assert.equal(layer.jointGuide.maleQuarter,0);assert.equal(layer.jointGuide.femaleQuarter,1);assert.equal(layer.jointGuide.railSpanMM,85);assert.equal(layer.jointGuide.demonstrationTravelMM,100);assert.ok(layer.jointGuide.travelMeaning.includes('not a manufacturing'));
 assert.deepEqual(layer.closureGuide.movingQuarters,[2,3]);assert.deepEqual(layer.closureGuide.stationaryQuarters,[0,1]);assert.equal(layer.closureGuide.demonstrationTravelMM,100);assert.equal(layer.jointGuide.sourceSha256,layer.sourceSha256);assert.equal(layer.closureGuide.sourceSha256,layer.sourceSha256);
 for(const [name,quarter] of [[layer.jointGuide.maleNode,0],[layer.jointGuide.femaleNode,1]])assert.equal(layer.nodes.find(n=>n.name===name)?.quarter,quarter,`R${layer.ring} joint identity`);
 const resource=manifest.resources.find(r=>r.id===layer.id);assert.equal(resource.sha256,layer.sourceSha256);
 const angles=[...new Set(layer.pockets.map(p=>((p.canonicalAngleDeg%360)+360)%360).map(v=>v.toFixed(7)))];assert.equal(angles.length,28,`R${layer.ring} slot count`);
 for(const p of layer.pockets){near(p.canonicalCentroid[2],3);const theta=p.canonicalAngleDeg*Math.PI/180;const nearest=Math.round((theta+Math.PI/28)/(2*Math.PI/28));near(theta,-Math.PI/28+nearest*2*Math.PI/28,1e-10);const transformed=point(p.sourceCentroid,m);for(let d=0;d<3;d++)near(transformed[d],p.canonicalCentroid[d]);}
 const ring=models.latest.rings.find(r=>r.id===layer.ring),firstColumn=layer.pockets.filter(p=>Math.abs((((p.canonicalAngleDeg+360+180/28)%360)+180)%360-180)<1e-7);
 for(let radial=0;radial<ring.radiiMM.length;radial++) {
  const center=ring.radiiMM[radial],lo=center-6,hi=center+6;
  const candidates=firstColumn.map(p=>({p,under:Math.max(p.radialIntervalMM[0]-lo,0),over:Math.max(hi-p.radialIntervalMM[1],0)})).sort((a,b)=>a.under+a.over-b.under-b.over);
  assert.ok(candidates.length,`R${layer.ring} no first-column slot`);
  // R01/R14 include sub-micron endpoint differences in native tessellation;
  // reserve conflict reporting for differences above 0.001 mm, still much
  // tighter than the 0.15 mm display-mesh chord tolerance.
  const candidate=candidates[0];if(candidate.under+candidate.over>1e-3)conflicts.push({ring:layer.ring,radial:radial+1,interferenceMM:candidate.under+candidate.over});
  assert.ok(candidate.under+candidate.over<=0.200001,`Unexpected CAD/MATLAB interference R${layer.ring} L${radial+1}`);
 }
}
assert.deepEqual(conflicts.map(c=>[c.ring,c.radial]),[[5,3],[10,3]]);for(const c of conflicts)near(c.interferenceMM,0.2);
assert.deepEqual(manifest.confirmedCADInstanceCounts,{base:56,cover:56,shortScrew:182});
for(const part of manifest.parts){const gltf=glbJSON(publicFile(part.url));assert.equal(gltf.nodes.length,part.nodes.length);assert.equal(hash(fs.readFileSync(publicFile(part.url))),part.sha256);}
const supports=manifest.parts.find(p=>p.role==='support');assert.equal(supports.nodes.length,3);assert.equal(supports.nodes.filter(n=>n.role==='side-support').length,2);assert.equal(supports.nodes.filter(n=>n.role==='bottom-support').length,1);
const locators=manifest.parts.find(p=>p.role==='locator');assert.equal(locators.nodes.length,4);for(const n of locators.nodes){near(n.canonicalBounds.size[2],18);near(n.canonicalBounds.min[2],-18);near(n.canonicalBounds.max[2],0);}
assert.equal(manifest.rodAxes.length,4);assert.ok(manifest.rodAxes.every(a=>a.diameterMM===null&&a.hardwareThread==='M6'&&a.hardwareStatus==='user-confirmed'&&a.status==='axis-candidate-hole-diameter-pending'));
assert.equal(manifest.hardware.coverAcrylicBase.thread,'M3');assert.equal(manifest.hardware.interLayer.thread,'M6');
assert.ok(!manifest.parts.some(p=>p.role==='acrylic'),'Do not misidentify independent acrylic CAD');
console.log(JSON.stringify({status:'passed',layers:14,columns:28,magnets:1736,downloads:manifest.resources.length,CADInstances:manifest.confirmedCADInstanceCounts,nominalPocketConflicts:conflicts,properRigidRegistrations:14},null,2));
