import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { models } from '../lib/mri.ts';
import { bomCSV, teachingParts, teachingSteps, finalPrintFiles, totalPrintMinutes, printEstimatePending, formatPrintDuration } from '../lib/teaching.ts';
import { CLEAR_COVER_QUARTERS, CLIPS_PER_QUARTER, TEMPORARY_CLIP_COUNT, RETAINER_LOCATIONS, ringCapQuarterProgress, ringClipArrival } from '../lib/assembly-ring-retainers.ts';

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
assert.equal(teachingParts.length,14,'The reference BOM includes thirteen components and one temporary acrylic-clip tool');
const clipPart=teachingParts.find(part=>part.id==='acrylic-clip');
assert.equal(clipPart.quantity,12,'Four acrylic quarters each use three reusable temporary clips');
assert.match(clipPart.material.en,/to confirm/);
assert.equal(clipPart.cadViews[0].quantity,12);
assert.equal(CLEAR_COVER_QUARTERS,4);assert.equal(CLIPS_PER_QUARTER,3);assert.equal(TEMPORARY_CLIP_COUNT,12);
assert.equal(RETAINER_LOCATIONS.length,12);
for(let quarter=0;quarter<4;quarter++)assert.equal(RETAINER_LOCATIONS.filter(location=>location.quarter===quarter).length,3);
for(const location of RETAINER_LOCATIONS){assert.equal(ringClipArrival(1,location.quarter,location.slot).amount,1);assert.equal(ringClipArrival(1,location.quarter,location.slot).visible,true);}
// Every displayed tool must remain until its own quarter's cap takes over;
// fastening must wait until all three tools of that quarter have departed.
for(let sample=0;sample<=200;sample++)for(let quarter=0;quarter<4;quarter++){
 const state=ringCapQuarterProgress(sample/200,quarter);
 for(let slot=0;slot<3;slot++){
  if(state.clipWithdrawal(slot)>0)assert.equal(state.restrained,true,'A clip cannot leave an unrestrained quarter');
  if(state.fasten>0)assert.equal(state.clipWithdrawal(slot),1,'Fastening follows removal of all three temporary clips');
 }
}
assert.equal(clipPart.cadViews[0].modelURL,'/assembly/tools/acrylic-clip.glb');
assert.deepEqual(clipPart.stepIds,['step-10','step-04']);
assert.deepEqual(teachingSteps.map(step=>[step.id,step.sceneStep]),[['step-01',1],['step-02',2],['step-03',3],['step-05',5],['step-10',10],['step-04',4],['step-06',6],['step-08',8],['step-09',9],['step-07',7]],'Clip the acrylic before cap installation; insert through-rods last');
assert.deepEqual(teachingSteps.map(step=>step.index),Array.from({length:10},(_,i)=>i+1));
assert.ok(teachingSteps.find(step=>step.id==='step-10').partIds.includes('acrylic-clip'));
assert.ok(teachingSteps.find(step=>step.id==='step-04').partIds.includes('short-screw'));
assert.ok(!teachingSteps.find(step=>step.id==='step-05').partIds.includes('ring-cover'),'Do not fit the cap before temporary clipping');
assert.ok(!partIDs.has('m3-nut'),'M3 nuts are not used in the assembly');
assert.ok(partIDs.has('extrusion-bolt')&&partIDs.has('t-slot-nut'),'Extrusion connection hardware is required');
assert.ok(teachingParts.every(part=>part.material.zh.trim()&&part.material.en.trim()),'Every BOM part needs a bilingual material');
assert.equal(teachingParts.find(part=>part.id==='magnet-cube').quantity,1736);
assert.match(teachingParts.find(part=>part.id==='magnet-cube').material.en,/N52.*NdFeB/);
for(const [id,quantity] of [['printed-ring',56],['ring-cover',56],['acrylic',56],['ring-support',42],['locator',32],['through-rod',8],['short-screw',448],['m6-nut',8]])assert.equal(teachingParts.find(part=>part.id===id).quantity,quantity,`Confirmed BOM quantity: ${id}`);
for(const id of ['frame-l-bracket','aluminum-frame','extrusion-bolt','t-slot-nut']){const part=teachingParts.find(part=>part.id===id);assert.equal(part.suppliedBy,'organizer');assert.equal(part.quantity,null,'Organizer-provided items must not invent quantities');}
assert.match(teachingParts.find(part=>part.id==='locator').specification.en,/18 mm.*M6/);assert.match(teachingParts.find(part=>part.id==='locator').specification.en,/Cylindrical/);
for(const language of ['zh','en']){
 const csv=bomCSV(language);assert.equal(csv.split('\r\n').length,15);assert.ok(!/Receipt checked|收料/.test(csv));assert.ok(csv.split('\r\n')[0].includes(language==='en'?'Material':'材料'));assert.ok(csv.split('\r\n')[0].includes(language==='en'?'Quantity breakdown':'数量构成'));assert.ok(csv.split('\r\n')[0].includes(language==='en'?'Supply':'供应方式'));
 const row=id=>csv.split('\r\n').find(line=>line.startsWith(`"${id}",`));assert.ok(row('short-screw').includes('"448"'));assert.ok(row('locator').includes('"32"'));assert.ok(row('ring-support').includes('"42"'));for(const id of ['frame-l-bracket','aluminum-frame','extrusion-bolt','t-slot-nut'])assert.ok(row(id).includes(language==='en'?'Provided by organizers':'官方提供'));
}
const visibleResources=manifest.resources.filter(resource=>resource.visibility==='resources'&&resource.updateStatus==='current');
assert.equal(visibleResources.length,13,'Only the four final print files and unchanged layout references appear in Resources');
assert.equal(manifest.resources.filter(resource=>resource.visibility==='bom'&&resource.category==='fastener-reference').length,6,'Hardware references belong to BOM');
const bomCADResources=manifest.resources.filter(resource=>resource.id.startsWith('bom-cad-'));
assert.deepEqual(bomCADResources.map(resource=>resource.id).sort(),['bom-cad-bottom-support','bom-cad-side-support','bom-cad-spacer']);
assert.ok(manifest.resources.every(resource=>['resources','bom','hidden'].includes(resource.visibility)&&['current','pending-update','retired'].includes(resource.updateStatus)),'Resource publication policy is missing');
assert.ok(teachingSteps.every(step=>step.partIds.every(id=>partIDs.has(id))),'Unknown step-to-part reference');
for(const resource of manifest.resources) {
 if(resource.downloadAvailable===false){
  assert.equal(resource.category,'cad');assert.equal(resource.visibility,'hidden');assert.equal(resource.updateStatus,'retired');
  assert.ok(!fs.existsSync(publicFile(resource.url)),`Retired model download remains: ${resource.id}`);
  continue;
 }
 const bytes=fs.readFileSync(publicFile(resource.url));assert.equal(bytes.length,resource.bytes,resource.id);assert.equal(hash(bytes),resource.sha256,resource.id);
 if(resource.category==='print'){
  assert.equal(resource.packageScope,'complete-final-print-set');assert.deepEqual(resource.partIds,[]);assert.deepEqual(resource.stepIds,[],'Do not invent a per-file BOM or assembly allocation');
 }else assert.ok(resource.partIds.length&&resource.stepIds.length,`Resource linkage missing: ${resource.id}`);
 assert.ok(resource.partIds.every(id=>partIDs.has(id)),`Unknown BOM link: ${resource.id}`);
 assert.ok(resource.stepIds.every(id=>stepIDs.has(id)),`Unknown assembly link: ${resource.id}`);
}
assert.deepEqual(finalPrintFiles.map(resource=>resource.downloadFilename),['Final_1.3mf','Final_2.3mf','Final_3.3mf','Final_4.3mf']);
assert.deepEqual(finalPrintFiles.map(resource=>resource.estimatedPrintMinutes),[8358,5379,2269,undefined]);
assert.equal(finalPrintFiles[3].previousEstimatedPrintMinutes,1008);assert.equal(finalPrintFiles[3].printEstimateStatus,'pending-reestimate');assert.equal(printEstimatePending,true);
assert.equal(totalPrintMinutes,16006,'Only the first three current estimates are known');assert.equal(formatPrintDuration(totalPrintMinutes,'zh'),'11天2小时46分钟');assert.equal(formatPrintDuration(totalPrintMinutes,'zh',true),'266小时46分钟');assert.equal(formatPrintDuration(totalPrintMinutes,'en'),'11d 2h 46min');
assert.deepEqual(fs.readdirSync(path.join(project,'public/resources')).filter(name=>/\.(?:3mf|step|stp|stl|obj|gltf|glb)$/i.test(name)).sort(),['Final_1.3mf','Final_2.3mf','Final_3.3mf','Final_4.3mf'],'Only four model downloads are published');
assert.equal(manifest.resources.filter(r=>r.category==='cad').length,20);assert.ok(manifest.resources.filter(r=>r.category==='cad').every(r=>r.downloadAvailable===false));
for(const filename of ['print-side-support.3mf','print-interlayer-support.3mf','print-holder-v1.3mf','print-layer-01.3mf','print-prototype-v4.3mf'])assert.ok(!fs.existsSync(publicFile(`/resources/${filename}`)),`Old print download remains: ${filename}`);
for(const filename of ['print-prototype-v0.3mf','print-prototype-v1.3mf','print-prototype-v2.3mf','print-prototype-v3.3mf','fastener-nut-reference.png'])assert.ok(!fs.existsSync(publicFile(`/resources/${filename}`)),`Retired publication file remains: ${filename}`);
assert.ok(!manifest.resources.some(r=>/M10/.test(`${r.titleZh} ${r.titleEn}`)),'M10 is not used in this assembly');
for(const id of ['fastener-l-bracket-diagram','fastener-m3-diagram','fastener-m6-diagram','fastener-extrusion-bolt-diagram','fastener-t-slot-nut-diagram'])assert.ok(resourceIDs.has(id),`Missing hardware diagram: ${id}`);
const matlabResources=manifest.resources.filter(r=>r.type==='MATLAB');assert.equal(matlabResources.length,7);
for(const resource of matlabResources){assert.equal(resource.visibility,'hidden');assert.equal(resource.updateStatus,'pending-update');assert.equal(hash(fs.readFileSync(path.join(project,resource.sourceRelativePath))),resource.sha256,`MATLAB download differs from preserved source: ${resource.id}`);}
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
assert.equal(locators.geometryStatus,'historical-block-reference-not-current-cylinder');assert.equal(locators.confirmedQuantity,32);
assert.equal(manifest.rodAxes.length,4);assert.ok(manifest.rodAxes.every(a=>a.diameterMM===null&&a.hardwareThread==='M6'&&a.hardwareStatus==='user-confirmed'&&a.status==='axis-candidate-hole-diameter-pending'));
assert.equal(manifest.hardware.coverAcrylicBase.thread,'M3');assert.equal(manifest.hardware.interLayer.thread,'M6');
assert.deepEqual(manifest.hardware.coverAcrylicBase.partIds,['short-screw']);
assert.deepEqual(manifest.hardware.extrusionConnections.partIds,['extrusion-bolt','t-slot-nut']);assert.equal(manifest.hardware.extrusionConnections.threadStatus,'pending');
assert.equal(manifest.hardware.coverAcrylicBase.quantity,448);assert.equal(manifest.hardware.interLayer.rodQuantity,8);assert.equal(manifest.hardware.interLayer.nutQuantity,8);assert.equal(manifest.hardware.spacers.quantity,32);assert.equal(manifest.hardware.spacers.lengthMM,18);assert.equal(manifest.hardware.spacers.shape,'cylinder');assert.equal(manifest.hardware.spacers.outerDiameterStatus,'provided-cad-nominal');assert.equal(manifest.hardware.spacers.boreDiameterStatus,'provided-cad-nominal');assert.equal(manifest.hardware.frameBrackets.suppliedBy,'organizer');assert.equal(manifest.hardware.extrusionFrame.suppliedBy,'organizer');assert.equal(manifest.hardware.extrusionConnections.suppliedBy,'organizer');
assert.deepEqual([manifest.hardware.spacers.nominalGeometryMM.length,manifest.hardware.spacers.nominalGeometryMM.outerDiameter,manifest.hardware.spacers.nominalGeometryMM.throughHoleDiameter],[18,14,6.2]);
assert.ok(!manifest.parts.some(p=>p.role==='acrylic'),'Do not misidentify independent acrylic CAD');
console.log(JSON.stringify({status:'passed',layers:14,columns:28,magnets:1736,BOMCategories:teachingParts.length,catalogEntries:manifest.resources.length,visibleResourceDownloads:visibleResources.length,finalPrintFiles:finalPrintFiles.length,knownEstimatedPrintMinutes:totalPrintMinutes,printEstimatePending,retiredCADDownloads:manifest.resources.filter(r=>r.downloadAvailable===false).length,bomReferenceDownloads:6,retainedMATLABPrograms:7,CADInstances:manifest.confirmedCADInstanceCounts,nominalPocketConflicts:conflicts,properRigidRegistrations:14},null,2));
