import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

// Offline, code-native product illustrations. This never rewrites the supplied
// standalone STEP previews or the registered teaching/field geometry.
const project = path.resolve(import.meta.dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, ...value] = arg.split('='); return [key.replace(/^--/, ''), value.join('=')];
}));
const browserToolkit = path.resolve(args['browser-toolkit'] || path.join(project, '../qa/node_modules/playwright/index.mjs'));
const { ids: coreIds } = await import('./bom-scenes/teaching-parts.mjs');
const { ids: hardwareIds } = await import('./bom-scenes/hardware.mjs');
const allIds = [...coreIds, ...hardwareIds];
const selectedIds = args.ids ? args.ids.split(',') : allIds;
if (!selectedIds.every(id => allIds.includes(id))) throw new Error('Unknown BOM product illustration');
const output = path.join(project, 'public/bom/products');
fs.mkdirSync(output, { recursive: true });
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const renderHTML = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:white;overflow:hidden}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script></head><body>
<script type="module">
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {ids as coreIds,buildPart as buildCore} from '/bom-scenes/teaching-parts.mjs';
import {buildPart as buildHardware} from '/bom-scenes/hardware.mjs';
const id=new URL(location.href).searchParams.get('id');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,alpha:false});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.setClearColor(0xffffff);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.62;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0xffffff);
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
const environment=pmrem.fromScene(room,.08);room.dispose();scene.environment=environment.texture;scene.environmentIntensity=.7;
const key=new THREE.DirectionalLight(0xfff7ec,2.3);key.position.set(-2.8,5.5,4.2);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-2,right:2,top:2,bottom:-2,near:.1,far:14});
key.shadow.normalBias=.0015;key.shadow.bias=-.00004;key.shadow.radius=5;key.shadow.blurSamples=12;scene.add(key);
const fill=new THREE.DirectionalLight(0xe6efff,.55);fill.position.set(4,2.5,-2);scene.add(fill);
const rim=new THREE.DirectionalLight(0xffffff,1.25);rim.position.set(-3,2,-4);scene.add(rim);
scene.add(new THREE.HemisphereLight(0xffffff,0xd8d8da,.16));
const loadGLB=async url => (await new GLTFLoader().loadAsync(url)).scene;
const result=await (coreIds.includes(id)?buildCore:buildHardware)(THREE,id,{loadGLB});
const root=new THREE.Group();root.add(result.object);scene.add(root);root.updateMatrixWorld(true);
const initialBox=new THREE.Box3().setFromObject(root),initialSize=initialBox.getSize(new THREE.Vector3());
const scale=1/Math.max(initialSize.x,initialSize.y,initialSize.z);root.scale.setScalar(scale);root.updateMatrixWorld(true);
const scaledBox=new THREE.Box3().setFromObject(root),centre=scaledBox.getCenter(new THREE.Vector3());
root.position.set(-centre.x,-scaledBox.min.y,-centre.z);root.updateMatrixWorld(true);
const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());
const aspect=innerWidth/innerHeight,camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,30);
const target=new THREE.Vector3(0,size.y*.5,0),direction=new THREE.Vector3(4.8,4.0,6.2).normalize();
camera.position.copy(target).addScaledVector(direction,4);camera.lookAt(target);camera.updateMatrixWorld();
let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
for(let i=0;i<8;i++){const p=new THREE.Vector3(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z).applyMatrix4(camera.matrixWorldInverse);minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
const offset=new THREE.Vector3((minX+maxX)/2,(minY+maxY)/2,0).applyQuaternion(camera.quaternion);
camera.position.add(offset);target.add(offset);camera.lookAt(target);
const span=Math.max((maxX-minX)/aspect,maxY-minY)*1.20;
Object.assign(camera,{left:-span*aspect/2,right:span*aspect/2,top:span/2,bottom:-span/2});camera.updateProjectionMatrix();
const floor=new THREE.Mesh(new THREE.PlaneGeometry(12,12),new THREE.ShadowMaterial({color:0x536072,opacity:.085}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.0005;floor.receiveShadow=true;scene.add(floor);
key.target.position.set(0,size.y*.25,0);scene.add(key.target);key.shadow.camera.updateProjectionMatrix();
renderer.render(scene,camera);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));renderer.render(scene,camera);
let triangles=0,meshes=0;root.traverse(node=>{if(node.isMesh){meshes++;triangles+=(node.geometry.index?.count||node.geometry.attributes.position.count)/3;}});
window.renderFacts={id,provenance:result.provenance,source:result.source||null,note:result.note||null,meshes,triangles,sourceDimensions:initialSize.toArray(),sourceURL:result.object.userData.sourceURL||null};
document.body.dataset.ready='true';
</script></body></html>`;
const roots = { '/three/': path.join(project, 'node_modules/three'), '/bom-scenes/': path.join(project, 'scripts/bom-scenes'), '/assembly/': path.join(project, 'public/assembly') };
const server = http.createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (pathname === '/') { response.setHeader('Content-Type', 'text/html;charset=utf-8'); response.end(renderHTML); return; }
    const prefix = Object.keys(roots).find(value => pathname.startsWith(value));
    if (!prefix) throw new Error('Not found');
    const filename = path.resolve(roots[prefix], pathname.slice(prefix.length));
    if (!filename.startsWith(roots[prefix] + path.sep)) throw new Error('Invalid path');
    response.setHeader('Content-Type', /\.m?js$/.test(filename) ? 'text/javascript' : 'model/gltf-binary');
    response.end(fs.readFileSync(filename));
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { chromium } = await import(pathToFileURL(browserToolkit).href);
let browser;
const previousFile = path.join(project, 'lib/bom-product-assets.json');
const assets = fs.existsSync(previousFile) ? JSON.parse(fs.readFileSync(previousFile, 'utf8')).assets.filter(asset => !selectedIds.includes(asset.id)) : [];
try {
  browser = await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
  const page = await browser.newPage({viewport:{width:960,height:624},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for (const id of selectedIds) {
    await page.goto('http://127.0.0.1:'+server.address().port+'/?id='+id,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('body[data-ready="true"]',{timeout:45000});
    if(errors.length) throw new Error(errors.join('\n'));
    const filename=path.join(output,id+'.png');await page.locator('canvas').screenshot({path:filename});
    const facts=await page.evaluate(()=>window.renderFacts),bytes=fs.readFileSync(filename);
    const sourceURL=facts.sourceURL,sourceSha256=sourceURL?digest(fs.readFileSync(path.join(project,'public',sourceURL))):null;
    assets.push({...facts,sourceSha256,url:'/bom/products/'+id+'.png',bytes:bytes.length,sha256:digest(bytes),width:960,height:624});
  }
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
assets.sort((a,b)=>allIds.indexOf(a.id)-allIds.indexOf(b.id));
if (selectedIds.includes('t-slot-nut')) {
  // Keep the existing standalone SVG download consistent with the new picture.
  // Embedding the PNG lets downloaded SVGs open offline without external URLs.
  const bytes=fs.readFileSync(path.join(output,'t-slot-nut.png'));
  fs.writeFileSync(path.join(project,'public/bom/t-slot-nut.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 624" width="960" height="624" role="img" aria-label="European-style T-slot nut: rounded elongated base, raised threaded centre and serrated end pads"><title>European-style T-slot nut illustration</title><desc>Drawn from the supplied product reference. Shape and finish are illustrative; dimensions, thread size and extrusion fit must be checked against supplied parts.</desc><image width="960" height="624" href="data:image/png;base64,'+bytes.toString('base64')+'"/></svg>\n');
}
fs.writeFileSync(previousFile,JSON.stringify({schemaVersion:1,presentation:'Offline white-studio product renders from exact CAD or explicitly illustrative native geometry. Colour, finish and unconfirmed hardware geometry are illustrative. The three supplied CAD previews remain independent and unchanged.',assets},null,2)+'\n');
console.log(JSON.stringify({rendered:selectedIds.length,assets:assets.length,bytes:assets.reduce((sum,asset)=>sum+asset.bytes,0),protectedSuppliedCAD:'unchanged'}));
