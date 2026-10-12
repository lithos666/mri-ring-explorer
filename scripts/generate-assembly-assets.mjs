import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

// Offline-only CAD conversion. Browser assets retain the original STEP world
// coordinates in millimetres; a separate rigid transform registers every layer.
const project = path.resolve(import.meta.dirname, '..');
const argv = Object.fromEntries(process.argv.slice(2).map(arg => { const [key, ...rest] = arg.split('='); return [key.replace(/^--/, ''), rest.join('=')]; }));
const source = path.resolve(argv.source || 'G:/OneDrive/桌面/MRI/new_generation_prototype');
const parsedDirectory = argv.parsed ? path.resolve(argv.parsed) : null;
const toolkit = argv.toolkit ? path.resolve(argv.toolkit) : path.resolve(project, '../qa/cad-toolkit/node_modules/occt-import-js/dist/occt-import-js.js');
const assemblyDirectory = path.join(project, 'public/assembly');
const resourceDirectory = path.join(project, 'public/resources');
fs.mkdirSync(assemblyDirectory, { recursive: true });
fs.mkdirSync(resourceDirectory, { recursive: true });
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const boundsOf = array => {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < array.length; i++) { const axis = i % 3; min[axis] = Math.min(min[axis], array[i]); max[axis] = Math.max(max[axis], array[i]); }
  return { min, max, size: min.map((value, axis) => max[axis] - value) };
};
const transformPoint = (p, m) => [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12], m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13], m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
const transformArray = (array, matrix) => { const output=[]; for(let i=0;i<array.length;i+=3) output.push(...transformPoint(array.slice(i,i+3),matrix)); return output; };
const expectedPhase = -180/28;
let occt;
async function readCAD(filename) {
  const file = path.join(source, '模型', filename);
  const data = fs.readFileSync(file);
  const cached = parsedDirectory && path.join(parsedDirectory, `${filename}.json`);
  const cacheHashesFile = parsedDirectory && path.join(parsedDirectory, 'source-hashes.json');
  const cacheHashes = cacheHashesFile && fs.existsSync(cacheHashesFile) ? JSON.parse(fs.readFileSync(cacheHashesFile, 'utf8')) : {};
  let parsed;
  if (cached && fs.existsSync(cached) && cacheHashes[filename] === hash(data)) parsed = JSON.parse(fs.readFileSync(cached, 'utf8'));
  else {
    if (!occt) { const { default: factory } = await import(pathToFileURL(toolkit).href); occt = await factory(); }
    parsed = occt.ReadStepFile(data, { linearUnit:'millimeter', linearDeflectionType:'absolute_value', linearDeflection:0.15, angularDeflection:0.35 });
  }
  if (!parsed.success || !parsed.meshes.length) throw new Error(`CAD import failed: ${filename}`);
  return { parsed, sha256:hash(data), sourceBytes:data.length, sourceRelativePath:`模型/${filename}` };
}
function registration(axis, back, center, phaseCorrectionDeg) {
  const angle=phaseCorrectionDeg*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  // Column-major THREE.Matrix4. Permuting X,Y,Z to Y,Z,X is proper rotation.
  if(axis===2) return [c,s,0,0, -s,c,0,0, 0,0,1,0, -c*center[0]+s*center[1],-s*center[0]-c*center[1],-back,1];
  return [0,0,1,0, c,s,0,0, -s,c,0,0, -c*center[0]+s*center[1],-s*center[0]-c*center[1],-back,1];
}
function deriveLayerRegistration(parsed, ring) {
  const axis=[1,14].includes(ring)?2:0;
  const bases=parsed.meshes.filter(m=>Math.abs(boundsOf(m.attributes.position.array).size[axis]-15)<1e-5);
  const covers=parsed.meshes.filter(m=>Math.abs(boundsOf(m.attributes.position.array).size[axis]-7)<1e-5);
  if(bases.length!==4||covers.length!==4) throw new Error(`R${ring}: expected four actual base and cover instances`);
  const dims=axis===2?[0,1]:[1,2],cp=covers.flatMap(m=>m.attributes.position.array),cb=boundsOf(cp);
  const center=dims.map(d=>(cb.min[d]+cb.max[d])/2);
  const back=Math.min(...bases.map(m=>boundsOf(m.attributes.position.array).min[axis]));
  const angles=[],pockets=[];
  for(const m of bases) {
    const p=m.attributes.position.array,ix=m.index.array;
    for(const face of m.brep_faces) {
      let area=0,weighted=[0,0,0],planar=true;
      for(let t=face.first;t<=face.last;t++) {
        const ids=ix.slice(3*t,3*t+3).map(v=>3*v),a=p.slice(ids[0],ids[0]+3),b=p.slice(ids[1],ids[1]+3),c=p.slice(ids[2],ids[2]+3);
        if([a,b,c].some(v=>Math.abs(v[axis]-back-3)>1e-5)){planar=false;break;}
        const u=b.map((v,d)=>v-a[d]),v=c.map((x,d)=>x-a[d]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],ta=Math.hypot(...cross)/2;
        area+=ta;for(let d=0;d<3;d++)weighted[d]+=(a[d]+b[d]+c[d])*ta/3;
      }
      if(planar&&area>140){
        const centroid=weighted.map(v=>v/area),angle=Math.atan2(centroid[dims[1]]-center[1],centroid[dims[0]]-center[0]); angles.push(angle);
        const radial=[],tangential=[];
        for(let t=face.first;t<=face.last;t++)for(const vertex of ix.slice(3*t,3*t+3)){
          const x=p[3*vertex+dims[0]]-center[0],y=p[3*vertex+dims[1]]-center[1];
          radial.push(x*Math.cos(angle)+y*Math.sin(angle));tangential.push(-x*Math.sin(angle)+y*Math.cos(angle));
        }
        pockets.push({sourceMeshIndex:parsed.meshes.indexOf(m),sourceFaceFirstTriangle:face.first,sourceAngleDeg:angle*180/Math.PI,sourceCentroid:centroid,radialIntervalMM:[Math.min(...radial),Math.max(...radial)],tangentialIntervalMM:[Math.min(...tangential),Math.max(...tangential)],floorLocalZMM:3});
      }
    }
  }
  const phase=Math.atan2(angles.reduce((v,a)=>v+Math.sin(a*28),0),angles.reduce((v,a)=>v+Math.cos(a*28),0))*180/Math.PI/28;
  const pitch=360/28;
  const phaseCorrectionDeg=((expectedPhase-phase+pitch/2)%pitch+pitch)%pitch-pitch/2;
  return { axis,back,center,phaseDeg:phase,phaseCorrectionDeg,matrix:registration(axis,back,center,phaseCorrectionDeg),floorFaces:angles.length,pockets };
}

// Minimal glTF 2.0 writer, one named node per actual imported mesh. No browsers,
// native CAD executables or physics approximation are needed for this export.
function writeGLB(filename, parsed, metadata, transform, classify) {
  const chunks=[],views=[],accessors=[],meshes=[],nodes=[],materials=[];let byteLength=0;
  const append=(array,target,componentType,type,count,min,max)=>{
    const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength),offset=byteLength;
    chunks.push(bytes);byteLength+=bytes.length;const padding=(4-byteLength%4)%4;if(padding){chunks.push(Buffer.alloc(padding));byteLength+=padding;}
    const view=views.length;views.push({buffer:0,byteOffset:offset,byteLength:bytes.length,target});
    const accessor=accessors.length;accessors.push({bufferView:view,byteOffset:0,componentType,count,type,...(min?{min,max}:{})});return accessor;
  };
  const nodeMetadata=[];
  parsed.meshes.forEach((mesh,index)=>{
    const sourceBounds=boundsOf(mesh.attributes.position.array),canonical=boundsOf(transformArray(mesh.attributes.position.array,transform));
    const centroid=canonical.min.map((v,d)=>(v+canonical.max[d])/2),role=classify(mesh,index,sourceBounds),quarter=Math.floor(((Math.atan2(centroid[1],centroid[0])*180/Math.PI+360)%360)/90);
    const name=`${role}-${String(index).padStart(2,'0')}`;
    const details={name,role,sourceMeshIndex:index,sourceName:mesh.name||'',sourceBounds,canonicalBounds:canonical,canonicalCentroid:centroid,quarter,identityStatus:role==='unidentified'?'pending':'geometry-identified'};
    nodeMetadata.push(details);
    const p=new Float32Array(mesh.attributes.position.array),n=new Float32Array(mesh.attributes.normal?.array||[]),ix=new Uint32Array(mesh.index.array);
    const pa=append(p,34962,5126,'VEC3',p.length/3,sourceBounds.min,sourceBounds.max),ia=append(ix,34963,5125,'SCALAR',ix.length);
    const attributes={POSITION:pa};if(n.length)attributes.NORMAL=append(n,34962,5126,'VEC3',n.length/3);
    const baseColor=mesh.color||[0.71,0.72,0.74];
    materials.push({name:role,pbrMetallicRoughness:{baseColorFactor:[...baseColor,1],metallicFactor:role==='fastener'?0.7:0,roughnessFactor:role==='fastener'?0.32:0.7},doubleSided:false});
    meshes.push({name,primitives:[{attributes,indices:ia,material:index}],extras:details});nodes.push({name,mesh:index,extras:details});
  });
  const gltf={asset:{version:'2.0',generator:'MRI Hackathon offline CAD conversion',extras:{unit:'millimeter',...metadata}},scene:0,scenes:[{nodes:nodes.map((_,i)=>i)}],nodes,meshes,materials,buffers:[{byteLength}],bufferViews:views,accessors};
  let json=Buffer.from(JSON.stringify(gltf));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);const binary=Buffer.concat(chunks);
  const header=Buffer.alloc(12);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+json.length+8+binary.length,8);
  const jh=Buffer.alloc(8);jh.writeUInt32LE(json.length);jh.writeUInt32LE(0x4e4f534a,4);const bh=Buffer.alloc(8);bh.writeUInt32LE(binary.length);bh.writeUInt32LE(0x004e4942,4);
  const output=Buffer.concat([header,jh,json,bh,binary]);fs.writeFileSync(path.join(assemblyDirectory,filename),output);
  return {url:`/assembly/${filename}`,bytes:output.length,sha256:hash(output),nodes:nodeMetadata};
}
const layers=[];
for(let ring=1;ring<=14;ring++) {
  const filename=`layer${ring}.step`,cad=await readCAD(filename),r=deriveLayerRegistration(cad.parsed,ring);
  const glb=writeGLB(`layer-${String(ring).padStart(2,'0')}.glb`,cad.parsed,{sourceRelativePath:cad.sourceRelativePath,sourceSha256:cad.sha256},r.matrix,(m,i,b)=>{
    if(/螺钉|screw/i.test(m.name))return 'fastener';
    if(Math.abs(b.size[r.axis]-15)<1e-5)return 'base';
    if(Math.abs(b.size[r.axis]-7)<1e-5)return 'cover';
    if(Math.abs(b.size[r.axis]-38)<1e-5)return 'side-support';
    return 'unidentified';
  });
  const registeredPockets=r.pockets.map(p=>({...p,canonicalCentroid:transformPoint(p.sourceCentroid,r.matrix),canonicalAngleDeg:p.sourceAngleDeg+r.phaseCorrectionDeg}));
  const sharedSeamAngleDeg=([1,14].includes(ring)?90:135)+r.phaseCorrectionDeg;
  const closingSeamAngleDeg=([1,14].includes(ring)?0:45)+r.phaseCorrectionDeg;
  const axisAt=angle=>[Math.cos(angle*Math.PI/180),Math.sin(angle*Math.PI/180),0];
  const jointGuide={maleQuarter:0,femaleQuarter:1,maleNode:[1,14].includes(ring)?'base-05':'base-03',femaleNode:[1,14].includes(ring)?'base-02':'base-00',direction:axisAt(sharedSeamAngleDeg),angleDeg:sharedSeamAngleDeg,railIntervalMM:[120,205],railSpanMM:85,demonstrationTravelMM:100,status:'geometry-guided-path-for-rigid-visualization',travelMeaning:'Temporary animation separation; not a manufacturing or installation specification',evidence:'Matching male/female undercut profiles are extruded along the shared radial seam. Move the male outward along this axis, then slide inward into the female outer opening; do not translate across the undercut walls.',sourceSha256:cad.sha256};
  const closureGuide={movingQuarters:[2,3],stationaryQuarters:[0,1],direction:axisAt(closingSeamAngleDeg),angleDeg:closingSeamAngleDeg,railIntervalsMM:[[120,205],[-205,-120]],railSpanMM:85,demonstrationTravelMM:100,status:'geometry-guided-path-for-rigid-visualization',travelMeaning:'Temporary animation separation; not a manufacturing or installation specification',evidence:'The two opposite closing interfaces share one straight radial axis. One interface has a moving male and stationary female; the opposite has a moving female and stationary male. Translate the same half-ring along the shared axis to enter both open rail ends. A transverse closure would cross the dovetail undercuts.',sourceSha256:cad.sha256};
  layers.push({id:`cad-layer-${String(ring).padStart(2,'0')}`,ring,sourceRelativePath:cad.sourceRelativePath,sourceSha256:cad.sha256,...glb,sourceToCanonical:r.matrix,registration:{axis:r.axis,sourceBackMM:r.back,sourceTransverseCenterMM:r.center,pocketPhaseDeg:r.phaseDeg,phaseCorrectionDeg:r.phaseCorrectionDeg,targetPhaseDeg:expectedPhase},jointGuide,closureGuide,pockets:registeredPockets,unit:'millimeter',baseThicknessMM:15,coverThicknessMM:7,pocketFloorMM:3,magnetCenterLocalZMM:9,counts:{base:4,cover:4,fastener:glb.nodes.filter(n=>n.role==='fastener').length,sideSupport:glb.nodes.filter(n=>n.role==='side-support').length},notes:['World-coordinate instances are already assembled; do not multiply by four.','Acrylic material identity is not independently established in this STEP.']});
  console.log(`R${String(ring).padStart(2,'0')}: ${glb.nodes.length} nodes; ${Math.round(glb.bytes/1024)} KiB`);
}
const reference=layers[1].registration,ring01Back=reference.sourceBackMM+38;
const supportTransform=registration(0,ring01Back,reference.sourceTransverseCenterMM,reference.phaseCorrectionDeg);
const parts=[];
for(const [id,filename,role] of [['cad-ring-support','surport.step','support'],['cad-locator','support_layer.step','locator'],['cad-template','new_genneration.step','template']]) {
  const cad=await readCAD(filename),matrix=role==='template'?registration(2,0,[0,0],layers[0].registration.phaseCorrectionDeg):supportTransform;
  const glb=writeGLB(`${role}.glb`,cad.parsed,{sourceRelativePath:cad.sourceRelativePath,sourceSha256:cad.sha256},matrix,(mesh,i,b)=>role==='support'?(i===2?'bottom-support':'side-support'):role==='locator'?'locator':b.size[2]===7?'cover-variant':'base');
  parts.push({id,role,sourceRelativePath:cad.sourceRelativePath,sourceSha256:cad.sha256,...glb,sourceToCanonical:matrix,unit:'millimeter',placement:role==='locator'?'ring-local-negative-z-gap':role==='support'?'ring-local':'template-reference',procurementQuantityStatus:'pending'});
}
const resources=[];
function addResource(relative,id,category,titleZh,titleEn,partIds,stepIds,layer,options={}) {
  const input=path.join(source,relative),bytes=fs.readFileSync(input),extension=path.extname(relative).slice(1).toLowerCase(),output=`${id}.${extension}`;
  fs.writeFileSync(path.join(resourceDirectory,output),bytes);
  resources.push({id,titleZh,titleEn,type:extension.toUpperCase(),sourceRelativePath:relative.replaceAll('\\','/'),url:`/resources/${output}`,bytes:bytes.length,sha256:hash(bytes),category,partIds,stepIds,...(layer?{layer}:{}),...options});
}
for(let ring=1;ring<=14;ring++)addResource(`模型/layer${ring}.step`,`cad-layer-${String(ring).padStart(2,'0')}`,'cad',`R${String(ring).padStart(2,'0')} 原始装配 CAD`,`R${String(ring).padStart(2,'0')} source assembly CAD`,['printed-ring','ring-cover','short-screw'],['step-01','step-02','step-03','step-04','step-05','step-09'],ring,{versionStatus:'source-reference'});
addResource('模型/new_genneration.step','cad-template','cad','扇形拼接与盖板模板','Sector joint and cover template',['printed-ring','ring-cover'],['step-01','step-02','step-04']);
addResource('模型/surport.step','cad-ring-support','cad','左、右、下支撑 CAD','Left, right and lower support CAD',['ring-support'],['step-06','step-08','step-09']);
addResource('模型/support_layer.step','cad-locator','cad','层间定位件 CAD','Inter-layer locator CAD',['locator'],['step-06','step-07','step-09']);
for(const [filename,id,zh,en,partIds] of [
 ['侧边支撑.3mf','print-side-support','侧边支撑打印参考','Side-support print reference',['ring-support']],
 ['曾与层之间的支撑.3mf','print-interlayer-support','层间支撑打印参考（原文件名保留）','Inter-layer support print reference',['locator']],
 ['holderv1.3mf','print-holder-v1','holder v1 打印参考','holder v1 print reference',['ring-support']],
 ['layer1.3mf','print-layer-01','layer1 打印参考','layer1 print reference',['printed-ring','ring-cover']],
 ...[0,1,2,3,4].map(v=>[`prototypev${v}.3mf`,`print-prototype-v${v}`,`prototype v${v} 版本参考`,`prototype v${v} version reference`,['printed-ring','ring-cover']])
])addResource(`打印文件/${filename}`,id,'print',zh,en,partIds,['step-01','step-04','step-06'],filename==='layer1.3mf'?1:undefined,{versionStatus:filename.startsWith('prototypev')?'version-reference-not-release-confirmed':'print-reference-not-release-confirmed'});
const placementFiles=fs.readdirSync(path.join(source,'磁铁放置信息'));
for(const [index,filename] of placementFiles.entries())addResource(`磁铁放置信息/${filename}`,`placement-${String(index+1).padStart(2,'0')}`,'placement',filename,filename.includes('1736')?'1,736 magnet coordinates':filename.endsWith('.txt')?'14-layer magnet placement notes':filename.includes('边缘')?'14-layer edge dimensions':'Magnet-layout source reference',['magnet-cube'],['step-03','step-09']);
addResource('M3螺丝尺寸.png','fastener-m3-reference','fastener-reference','M3×18 螺丝参考图（与 CAD 标记不一致）','M3×18 screw reference (conflicts with CAD label)',['short-screw'],['step-05']);
addResource('螺母.png','fastener-nut-reference','fastener-reference','M10 黄铜螺母参考图','M10 brass-nut reference',['nut'],['step-07']);
const matlabDirectory=path.resolve(argv.matlab||'G:/OneDrive/桌面/MRI/Mri-ring-explorer/matlab');
for(const filename of fs.readdirSync(matlabDirectory).filter(f=>f.endsWith('.m'))) {
 const bytes=fs.readFileSync(path.join(matlabDirectory,filename)),id=`matlab-${filename.replace(/\.m$/,'').toLowerCase()}`;fs.writeFileSync(path.join(resourceDirectory,`${id}.m`),bytes);
 resources.push({id,titleZh:`MATLAB · ${filename}`,titleEn:`MATLAB · ${filename}`,type:'MATLAB',sourceRelativePath:`matlab/${filename}`,url:`/resources/${id}.m`,bytes:bytes.length,sha256:hash(bytes),category:'placement',partIds:['magnet-cube'],stepIds:['step-03','step-09'],versionStatus:'physics-source'});
}
for(const language of ['zh','en']) {
 const relative=`diagrams/mri-14-layer-edge-dimensions-${language}.svg`,filename=path.join(project,'public',relative),bytes=fs.readFileSync(filename);
 resources.push({id:`edge-dimensions-${language}`,titleZh:language==='zh'?'新版十四层边缘尺寸 · 中文':'新版十四层边缘尺寸 · 英文',titleEn:language==='zh'?'14-layer edge dimensions · Chinese':'14-layer edge dimensions · English',type:'SVG',sourceRelativePath:`public/${relative}`,url:`/${relative}`,bytes:bytes.length,sha256:hash(bytes),category:'placement',partIds:['magnet-cube'],stepIds:['step-03','step-09'],versionStatus:'derived-verified'});
}
const rodAxes=parts.find(p=>p.role==='locator').nodes.map(n=>({x:n.canonicalCentroid[0],y:n.canonicalCentroid[1],xMM:n.canonicalCentroid[0],yMM:n.canonicalCentroid[1],source:'locator CAD hole-axis candidate',diameterMM:null,status:'axis-candidate-diameter-and-hardware-pending'}));
const manifest={schemaVersion:1,unit:'millimeter',geometryVersion:'hackathon-local-v1',target:{rings:14,columns:28,magnetCount:1736,magnetEdgeMM:12,magnetPitchMM:38,magnetLocalCenterZMM:9},layers,parts,rodAxes,resources,confirmedCADInstanceCounts:{base:56,cover:56,shortScrew:layers.reduce((s,l)=>s+l.counts.fastener,0)},pending:['Independent acrylic CAD and thickness','Profile cut list and connectors','Procurement quantities and materials','Screw conflict: CAD 2.9×16 BF versus reference M3×18','R05/R10 outer-pocket nominal 0.2 mm radial interference','R01/R14 support-notch mating registration','Physical fixtures, insertion paths and fastening sequence'],registrationNotes:['Layer1 and layer14 are standalone XY-plane exports; other layers are YZ-plane exports with assembly translations.','A proper rigid transform preserves millimetre sizes while registering the slot lattice to the MATLAB displayed azimuth frame.','Slot-lattice phase fixes rotation only modulo the column pitch; it does not validate R01/R14 support-notch mating.','Displayed magnets remain at MATLAB radii; nominal pocket discrepancies are reported, never hidden by shifting magnets.']};
fs.writeFileSync(path.join(project,'lib/cad-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(project,'lib/teaching-resources.json'),JSON.stringify(resources,null,2)+'\n');
fs.writeFileSync(path.join(assemblyDirectory,'manifest.json'),JSON.stringify(manifest)+'\n');
console.log(`Wrote ${layers.length+parts.length} GLB assets and ${resources.length} source downloads.`);
