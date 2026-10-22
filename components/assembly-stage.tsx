"use client";

import {useEffect,useRef,useState} from "react";
import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {RoomEnvironment} from "three/addons/environments/RoomEnvironment.js";
import {Pause,Play,RotateCcw,Focus,Scan,Box,Layers,Eye,Scissors,Lightbulb} from "lucide-react";
import {models,ringName,type Magnet} from "@/lib/mri";
import {magnetBasis} from "@/lib/field";
import {useLanguage,directionEnglish} from "@/lib/language-context";
import {ASSEMBLY_RUNTIME_MANIFEST_URL} from "@/lib/assembly-assets.generated";
import acrylicClipAsset from "@/lib/acrylic-clip-asset.json";
import {fetchTeachingAsset} from "@/lib/teaching-asset-cache";
import {ASSEMBLY_DURATION_SECONDS,ASSEMBLY_EASING,assemblyTiming,assemblyEaseInOut,assemblyPhaseProgress,assemblyCameraBlend} from "@/lib/assembly-timing";
import "./assembly-stage.css";

export interface AssemblyStageProps {
 step:number;
 ring:number;
 active?:boolean;
 partId?:string;
 initialProgress?:number;
 onMagnetSelect?:(id:string)=>void;
}

type Role="base"|"cover"|"acrylic"|"fastener"|"support"|"locator"|"unknown";
interface CADAsset {ring?:number;id?:string;url:string;gzipURL?:string;sourceToCanonical?:number[];registration?:{axis:number;phaseCorrectionDeg:number};jointGuide?:{direction:number[]};closureGuide?:{direction:number[]};nodes?:{name:string;role?:string;quarter?:number}[];}
interface AssemblyManifest {layers:CADAsset[];parts?:CADAsset[];rodAxes?:{x:number;y:number}[];}
interface CADMesh {name:string;role:Role;geometry:THREE.BufferGeometry;centroid:THREE.Vector3;quarter:number;}
interface DisplayMesh {mesh:THREE.Mesh;edge:THREE.LineSegments|null;role:Role;quarter:number;centroid:THREE.Vector3;home:THREE.Vector3;ring:number;}
interface RuntimeOptions {step:number;ring:number;partId?:string;progress:number;playing:boolean;speed:number;active:boolean;highlight:boolean;transparent:boolean;cutaway:boolean;exploded:boolean;}
interface Runtime {update:(options:RuntimeOptions)=>void;view:(kind:"recommended"|"whole"|"detail")=>void;dispose:()=>void;}

const cubeModel=models.latest;
const duration=ASSEMBLY_DURATION_SECONDS;
let manifestPromise:Promise<AssemblyManifest>|null=null;
const geometryCache=new Map<string,Promise<CADMesh[]>>();
function manifest(){
 if(!manifestPromise)manifestPromise=fetchTeachingAsset(ASSEMBLY_RUNTIME_MANIFEST_URL).then(async response=>{
  if(!response.ok)throw new Error("CAD manifest unavailable");
  return response.json() as Promise<AssemblyManifest>;
 }).catch(error=>{manifestPromise=null;throw error;});
 return manifestPromise;
}
function roleOf(name:string):Role{
 const lower=name.toLowerCase();
 if(/acrylic/.test(lower))return "acrylic";
 if(/cover|盖/.test(lower))return "cover";
 if(/locator|spacer|position/.test(lower))return "locator";
 if(/support|side|bottom|buttom|holder|支撑/.test(lower))return "support";
 if(/fastener|screw|nut|螺/.test(lower))return "fastener";
 if(/base|sector|底/.test(lower))return "base";
 return "unknown";
}
async function loadCAD(asset:CADAsset){
 const cached=geometryCache.get(asset.url);if(cached)return cached;
 const task=(async()=>{
  const loader=new GLTFLoader();
  const loadGLTF=async()=>{
   if(asset.gzipURL&&typeof DecompressionStream!=="undefined"){
    try{
     const response=await fetchTeachingAsset(asset.gzipURL);
     if(!response.ok)throw new Error("Compressed CAD unavailable");
     const received=await response.arrayBuffer();
     const prefix=new Uint8Array(received,0,Math.min(2,received.byteLength));
     // Some static servers attach Content-Encoding:gzip to .gz files, so fetch
     // has already decoded the response. Avoid attempting to decompress twice.
     const bytes=prefix[0]===0x1f&&prefix[1]===0x8b
      ?await new Response(new Blob([received]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer()
      :received;
     return await loader.parseAsync(bytes,new URL(".",new URL(asset.url,window.location.href)).href);
    }catch{/* Older browsers or a failed compressed request use the exact original GLB. */}
   }
   const response=await fetchTeachingAsset(asset.url);
   if(!response.ok)throw new Error("CAD unavailable");
   return loader.parseAsync(await response.arrayBuffer(),new URL(".",new URL(asset.url,window.location.href)).href);
  };
  const gltf=await loadGLTF();
   gltf.scene.updateMatrixWorld(true);
   const conversion=new THREE.Matrix4();
   if(asset.sourceToCanonical?.length===16)conversion.fromArray(asset.sourceToCanonical);
   const meshes:CADMesh[]=[];
   const originalGeometry=new Set<THREE.BufferGeometry>(),originalMaterial=new Set<THREE.Material>();
   gltf.scene.traverse(node=>{
    if(!(node instanceof THREE.Mesh))return;
    let role:Role="unknown";
    for(let ancestor:THREE.Object3D|null=node;ancestor;ancestor=ancestor.parent){
     const stated=ancestor.userData.role||asset.nodes?.find(n=>n.name===ancestor!.name)?.role;
     const candidate=roleOf(stated||ancestor.name);
     if(candidate!=="unknown"){role=candidate;break;}
    }
    if(role==="unknown")role=asset.id?.includes("locator")?"locator":asset.id?.includes("support")?"support":"base";
    const transform=conversion.clone().multiply(node.matrixWorld);
    const geometry=node.geometry.clone().applyMatrix4(transform);geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const centroid=geometry.boundingBox!.getCenter(new THREE.Vector3());
    const declaredQuarter=asset.nodes?.find(n=>n.name===node.name)?.quarter;
    const quarter=declaredQuarter??Math.floor(((Math.atan2(centroid.y,centroid.x)+Math.PI*2)%(Math.PI*2))/(Math.PI/2));
    meshes.push({name:node.name,role,geometry,centroid,quarter});
    originalGeometry.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material])originalMaterial.add(material);
   });
   originalGeometry.forEach(g=>g.dispose());originalMaterial.forEach(m=>m.dispose());return meshes;
 })().catch(error=>{geometryCache.delete(asset.url);throw error;});
 geometryCache.set(asset.url,task);return task;
}

const smooth=assemblyEaseInOut;
const range=assemblyPhaseProgress;
const physical=(v:[number,number,number])=>new THREE.Vector3(v[0]*25,-v[2]*25,v[1]*25);
const physicalDirection=(v:[number,number,number])=>new THREE.Vector3(v[0],-v[2],v[1]);
function partRole(partId:string|undefined){
 if(!partId)return null;
 const id=partId.toLowerCase();
 if(id==="acrylic-clip")return "temporary-clip";
 if(/magnet|磁铁/.test(id))return "magnet";
 if(/acrylic|亚克力/.test(id))return "acrylic";
 if(/locator|spacer|定位|层间/.test(id))return "locator";
 if(/frame|extrusion|铝/.test(id))return "frame";
 if(/rod|螺杆/.test(id))return "rod";
 if(/fastener|screw|nut|m3|m6|螺丝|螺母/.test(id))return "fastener";
 return roleOf(id);
}

export default function AssemblyStage({step,ring,active=true,partId,initialProgress,onMagnetSelect}:AssemblyStageProps){
 const {t}=useLanguage();
 const host=useRef<HTMLDivElement>(null),hotspot=useRef<HTMLButtonElement>(null),runtime=useRef<Runtime|null>(null);
 const startingProgress=initialProgress===undefined?(step===0?1:0):THREE.MathUtils.clamp(initialProgress,0,1);
 const [progress,setProgress]=useState(startingProgress),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1);
 const [highlight,setHighlight]=useState(true),[transparent,setTransparent]=useState(false),[cutaway,setCutaway]=useState(false),[exploded,setExploded]=useState(false);
 const [cameraMode,setCameraMode]=useState<"recommended"|"whole"|"detail">("recommended");
 const [loading,setLoading]=useState(true),[error,setError]=useState(false),[ready,setReady]=useState(false),[selected,setSelected]=useState<Magnet|null>(null);
 const latest=useRef<RuntimeOptions>({step,ring,partId,progress,playing,speed,active,highlight,transparent,cutaway,exploded});
 latest.current={step,ring,partId,progress,playing,speed,active,highlight,transparent,cutaway,exploded};
 const callbacks=useRef({setProgress,setPlaying,onMagnetSelect,t});callbacks.current={setProgress,setPlaying,onMagnetSelect,t};

 useEffect(()=>{
  let cancelled=false;
  queueMicrotask(()=>{if(cancelled)return;setProgress(startingProgress);setPlaying(false);setSelected(null);setCameraMode("recommended");setExploded(false);});
  return()=>{cancelled=true;};
 },[step,ring,partId,startingProgress]);
 useEffect(()=>{runtime.current?.update(latest.current);},[step,ring,partId,progress,playing,speed,active,highlight,transparent,cutaway,exploded]);
 useEffect(()=>{host.current?.querySelector("canvas")?.setAttribute("aria-label",t("可交互 CAD 装配场景。拖动旋转，滚轮缩放，右键平移；磁铁步骤中可点击查看编号。","Interactive CAD assembly. Drag to rotate, scroll to zoom, and right-drag to pan. Select a magnet to inspect its ID."));},[t]);

 useEffect(()=>{
  const container=host.current;if(!container)return;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});}catch{queueMicrotask(()=>{setError(true);setLoading(false);});return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));renderer.setClearColor(0xffffff,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.localClippingEnabled=true;
  container.appendChild(renderer.domElement);renderer.domElement.setAttribute("role","img");
  renderer.domElement.setAttribute("aria-label",callbacks.current.t("可交互 CAD 装配场景。拖动旋转，滚轮缩放，右键平移；磁铁步骤中可点击查看编号。","Interactive CAD assembly. Drag to rotate, scroll to zoom, and right-drag to pan. Select a magnet to inspect its ID."));
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,1,6500);
  // Generate soft studio reflections locally. No HDR downloads or per-frame
  // post-processing are required; the small environment map is made once.
  let studioEnvironment:THREE.WebGLRenderTarget|null=null;
  const studio=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
  try{studioEnvironment=pmrem.fromScene(studio,.05,.1,100,{size:128});scene.environment=studioEnvironment.texture;scene.environmentIntensity=.68;}
  catch{/* Direct lighting remains usable when environment generation is unavailable. */}
  finally{studio.traverse(object=>{if(object instanceof THREE.InstancedMesh)object.dispose();});studio.dispose();pmrem.dispose();}
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=65;controls.maxDistance=2500;
  const key=new THREE.DirectionalLight(0xffffff,2.8);key.position.set(450,780,620);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
  key.shadow.camera.left=-600;key.shadow.camera.right=600;key.shadow.camera.top=600;key.shadow.camera.bottom=-600;key.shadow.camera.near=1;key.shadow.camera.far=2200;key.shadow.bias=-.00025;key.shadow.normalBias=.5;scene.add(key);
  const hemisphere=new THREE.HemisphereLight(0xffffff,0xdce1e7,.7);scene.add(hemisphere);
  const fill=new THREE.DirectionalLight(0xffffff,1);fill.position.set(-550,260,-180);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xf1f6ff,.85);rim.position.set(150,200,-800);scene.add(rim);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),new THREE.ShadowMaterial({opacity:.14}));floor.rotation.x=-Math.PI/2;floor.position.y=-296;floor.receiveShadow=true;scene.add(floor);
  const root=new THREE.Group();scene.add(root);
  const individual=new THREE.Group(),whole=new THREE.Group(),supportGroup=new THREE.Group(),locatorGroup=new THREE.Group(),frameGroup=new THREE.Group(),rodGroup=new THREE.Group(),acrylicGroup=new THREE.Group(),axisGroup=new THREE.Group();
  // Mounting coordinates level the support channels; the solver and cached
  // CAD stay in their original canonical coordinates. Rotate every assembly
  // element together, while the aluminum frame remains level in world space.
  root.add(individual,whole,supportGroup,locatorGroup,rodGroup,acrylicGroup,axisGroup);scene.add(frameGroup);
  const ownedGeometry=new Set<THREE.BufferGeometry>(),ownedMaterial=new Set<THREE.Material>();
  const ownGeo=<T extends THREE.BufferGeometry>(g:T)=>{ownedGeometry.add(g);return g;};
  const ownMat=<T extends THREE.Material>(m:T)=>{ownedMaterial.add(m);return m;};
  // The clip is an isolated supplied part: its installed coordinates and
  // acrylic mating CAD have not been provided. A separate local interface
  // demonstration makes the restraint handover legible without inventing a
  // validated clip location or quantity on the registered ring assembly.
  const interfaceDemo=new THREE.Group();scene.add(interfaceDemo);
  const temporaryClip=new THREE.Group();interfaceDemo.add(temporaryClip);
  const clipMaterial=ownMat(new THREE.MeshStandardMaterial({color:0x1677bb,roughness:.4,metalness:0}));
  const clipEdgeMaterial=ownMat(new THREE.LineBasicMaterial({color:0x064d7b,transparent:true,opacity:.38}));
  const matingBaseMaterial=ownMat(new THREE.MeshStandardMaterial({color:0xd8cebb,roughness:.56}));
  const matingAcrylicMaterial=ownMat(new THREE.MeshPhysicalMaterial({color:0x70bdd8,transparent:true,opacity:.65,roughness:.12,metalness:0,depthWrite:false}));
  const matingCapMaterial=ownMat(new THREE.MeshStandardMaterial({color:0xe9e1d0,roughness:.48}));
  // Coupon proportions are explanatory, not manufacturing dimensions. Only
  // the original clip mesh retains measured geometry and the 17.1 mm gap.
  const jawGap=acrylicClipAsset.jawOpening.clearanceMM,illustrativeClearBand=jawGap*.09;
  const matingBase=new THREE.Mesh(ownGeo(new THREE.BoxGeometry(54,26,jawGap-illustrativeClearBand)),matingBaseMaterial);
  matingBase.position.set(20,0,-illustrativeClearBand/2);matingBase.castShadow=true;matingBase.receiveShadow=true;
  const matingAcrylic=new THREE.Mesh(ownGeo(new THREE.BoxGeometry(54,26,illustrativeClearBand)),matingAcrylicMaterial);
  matingAcrylic.position.set(20,0,jawGap/2-illustrativeClearBand/2);
  const matingCap=new THREE.Mesh(ownGeo(new THREE.BoxGeometry(21,30,5)),matingCapMaterial);
  matingCap.position.set(37,0,jawGap/2+2.5);matingCap.castShadow=true;matingCap.receiveShadow=true;
  const demoFastener=new THREE.Group();
  const demoFastenerMaterial=ownMat(new THREE.MeshStandardMaterial({color:0x9c824e,roughness:.32,metalness:.68}));
  const demoShaft=new THREE.Mesh(ownGeo(new THREE.CylinderGeometry(1.5,1.5,14,16)),demoFastenerMaterial);demoShaft.rotation.x=Math.PI/2;demoShaft.position.z=-3;
  const demoHead=new THREE.Mesh(ownGeo(new THREE.CylinderGeometry(2.6,2.6,1.8,24)),demoFastenerMaterial);demoHead.rotation.x=Math.PI/2;demoHead.position.z=4.9;
  demoFastener.add(demoShaft,demoHead);demoFastener.position.set(38,0,13.1);
  const restraintContact=new THREE.LineSegments(ownGeo(new THREE.EdgesGeometry(new THREE.BoxGeometry(20,29,.25))),ownMat(new THREE.LineBasicMaterial({color:0x339775,transparent:true,opacity:.9})));
  restraintContact.position.set(37,0,jawGap/2+.03);
  interfaceDemo.add(matingBase,matingAcrylic,matingCap,demoFastener,restraintContact);interfaceDemo.visible=false;
  let clipReady=false,clipLoading=false,requestedView:"recommended"|"whole"|"detail"="recommended";
  const isInterfaceDemo=()=>!current.partId&&[4,10].includes(current.step)&&requestedView!=="whole";
  async function loadTemporaryClip(){
   if(clipReady||clipLoading)return;clipLoading=true;
   try{
    const meshes=await loadCAD({id:"temporary-acrylic-retaining-clip",url:acrylicClipAsset.url});
    if(disposed)return;
    // STEP Y/Z are the preview XY plane; rotate the measured opening toward
    // +X so the illustrative mating coupon enters between both original jaws.
    const opening=acrylicClipAsset.jawOpening.insertionOpeningDirection;
    const openingAngle=-Math.atan2(opening[1],opening[0]);
    for(const item of meshes){
     const mesh=new THREE.Mesh(item.geometry,clipMaterial);mesh.rotation.z=openingAngle;mesh.castShadow=true;mesh.receiveShadow=true;temporaryClip.add(mesh);
     const edge=new THREE.LineSegments(ownGeo(new THREE.EdgesGeometry(item.geometry,28)),clipEdgeMaterial);edge.rotation.z=openingAngle;temporaryClip.add(edge);
    }
    clipReady=true;clipLoading=false;apply();cameraTargets();updateReady();
   }catch{if(!disposed){clipLoading=false;setError(true);toggleLoading(false);}}
  }
  const edgeMat=ownMat(new THREE.LineBasicMaterial({color:0x74736f,transparent:true,opacity:.18}));
  const highlightMat=ownMat(new THREE.MeshStandardMaterial({color:0xbddcff,metalness:.03,roughness:.4}));
  const clippingPlane=new THREE.Plane(new THREE.Vector3(-1,0,0),0);
  const materials:Record<Role,THREE.MeshStandardMaterial>={
   base:ownMat(new THREE.MeshStandardMaterial({color:0xd7d6d0,roughness:.63,metalness:0})),
   cover:ownMat(new THREE.MeshStandardMaterial({color:0xf0eee8,roughness:.47,metalness:.02})),
   acrylic:ownMat(new THREE.MeshPhysicalMaterial({color:0x91c6da,transparent:true,opacity:.22,roughness:.1,metalness:0,depthWrite:false,side:THREE.DoubleSide})),
   fastener:ownMat(new THREE.MeshStandardMaterial({color:0xb89859,roughness:.34,metalness:.65})),
   support:ownMat(new THREE.MeshStandardMaterial({color:0xdcdad3,roughness:.57,metalness:0})),
   locator:ownMat(new THREE.MeshStandardMaterial({color:0xcac6bb,roughness:.65,metalness:0})),
   unknown:ownMat(new THREE.MeshStandardMaterial({color:0xc6c9cf,roughness:.6,metalness:.02}))
  };
  // A lower-fill product-lighting profile retains the polymer's warm body
  // color, slot depth and metal reflections against the white page. These are
  // display materials only; CAD geometry and the magnetic solver are unchanged.
  const cinematicColors:Record<Role,THREE.Color>={
   base:new THREE.Color(0xd9cbb5),cover:new THREE.Color(0xe3d9c6),
   acrylic:materials.acrylic.color.clone(),fastener:new THREE.Color(0xc19b58),
   support:new THREE.Color(0xd5c6af),locator:new THREE.Color(0xb9ab96),
   unknown:new THREE.Color(0xadbac6)
  };
  // The confirmed spacer is an 18 mm hollow cylinder. Only its axial length
  // is dimensioned here: the 14 mm outside and 6.6 mm bore are display-only
  // proportions until the actual diameters and clearance are supplied.
  const spacerPreview=new THREE.Group();root.add(spacerPreview);
  const spacerSection=new THREE.Shape();spacerSection.absarc(0,0,7,0,Math.PI*2,false);
  const spacerPassage=new THREE.Path();spacerPassage.absarc(0,0,3.3,0,Math.PI*2,true);spacerSection.holes.push(spacerPassage);
  const spacerGeometry=ownGeo(new THREE.ExtrudeGeometry(spacerSection,{depth:18,bevelEnabled:false,curveSegments:64,steps:1}));spacerGeometry.translate(0,0,-9);
  const spacerMaterial=ownMat(materials.locator.clone());
  const spacerCylinder=new THREE.Mesh(spacerGeometry,spacerMaterial);spacerCylinder.name="confirmed-cylinder-spacer-preview";spacerCylinder.castShadow=true;spacerCylinder.receiveShadow=true;
  spacerPreview.add(spacerCylinder,new THREE.LineSegments(ownGeo(new THREE.EdgesGeometry(spacerGeometry,35)),edgeMat));spacerPreview.visible=false;
  const display:DisplayMesh[]=[],wholeDisplay:DisplayMesh[]=[];
  let localToken=0,fullToken=0,disposed=false,currentRing=-1,fullLoaded=false,fullComplete=false,ringComplete=-1,assetManifest:AssemblyManifest|null=null;
  let current={...latest.current},raf=0,previousTime=0,reportTime=0,autoCamera=true,lastRodCameraProgress=-1;
  const targetWhole=new THREE.Vector3(),targetDetail=new THREE.Vector3(),eyeWhole=new THREE.Vector3(),eyeDetail=new THREE.Vector3();
  let focusedId:string|null=null;
  const jointDirection=new THREE.Vector3(0,1,0),closureDirection=new THREE.Vector3(1,0,0);
  const liftDirection=new THREE.Vector3(0,1,0);
  function alignMountingFrame(){
   const phase=assetManifest?.layers[1]?.registration?.phaseCorrectionDeg??0;
   root.rotation.z=THREE.MathUtils.degToRad(-phase);
   liftDirection.set(Math.sin(root.rotation.z),Math.cos(root.rotation.z),0);
   clippingPlane.normal.set(-Math.cos(root.rotation.z),-Math.sin(root.rotation.z),0);
   root.updateMatrixWorld(true);
   container!.dataset.mountingRotationDeg=String(-phase);
   container!.dataset.frameSupportChannels="3";
  }
  const insertionArrow=new THREE.ArrowHelper(new THREE.Vector3(0,-1,0),new THREE.Vector3(),53,0x0071e3,13,7);root.add(insertionArrow);

  function makeCAD(meshes:CADMesh[],parent:THREE.Group,destination:DisplayMesh[],layer:number,shift:number,edges=true){
   for(const item of meshes){
    const material=materials[item.role].clone();ownedMaterial.add(material);
    const mesh=new THREE.Mesh(item.geometry,material);mesh.name=item.name;mesh.castShadow=item.role!=="acrylic";mesh.receiveShadow=true;mesh.userData={role:item.role,ring:layer};
    mesh.position.z=shift;parent.add(mesh);
    let edge:THREE.LineSegments|null=null;
    if(edges&&item.role!=="fastener"&&item.role!=="acrylic"){
     edge=new THREE.LineSegments(ownGeo(new THREE.EdgesGeometry(item.geometry,24)),edgeMat);edge.position.z=shift;parent.add(edge);
    }
    destination.push({mesh,edge,role:item.role,quarter:item.quarter,centroid:item.centroid.clone(),home:mesh.position.clone(),ring:layer});
   }
  }
  function clearCAD(parent:THREE.Group,items:DisplayMesh[]){
   for(const item of items){item.mesh.removeFromParent();if(item.edge){item.edge.removeFromParent();ownedGeometry.delete(item.edge.geometry);item.edge.geometry.dispose();}const material=item.mesh.material as THREE.Material;ownedMaterial.delete(material);material.dispose();}
   items.length=0;
  }
  function toggleLoading(value:boolean){if(!disposed)setLoading(value);}
  function updateReady(){
   if(disposed)return;
   const full=(current.step===0&&!current.partId)||current.step===7||current.step===9;
   const needsClip=isInterfaceDemo()||partRole(current.partId)==="temporary-clip";
   const ready=(full?fullComplete:ringComplete===current.ring)&&(!needsClip||clipReady);
   setReady(ready);toggleLoading(!ready);
  }
  async function loadRing(layer:number){
   const token=++localToken;currentRing=layer;toggleLoading(true);setError(false);setReady(false);
   try{
    assetManifest=await manifest();alignMountingFrame();
    const asset=assetManifest.layers.find(item=>item.ring===layer)??assetManifest.layers[layer-1];
    if(!asset)throw new Error("Layer CAD missing");
    if(asset.jointGuide?.direction.length===3)jointDirection.fromArray(asset.jointGuide.direction);
    else{const angle=THREE.MathUtils.degToRad((asset.registration?.axis===2?90:135)+(asset.registration?.phaseCorrectionDeg??0));jointDirection.set(Math.cos(angle),Math.sin(angle),0);}
    if(asset.closureGuide?.direction.length===3)closureDirection.fromArray(asset.closureGuide.direction);
    else{const angle=THREE.MathUtils.degToRad((asset.registration?.axis===2?0:45)+(asset.registration?.phaseCorrectionDeg??0));closureDirection.set(Math.cos(angle),Math.sin(angle),0);}
    const geometries=await loadCAD(asset);if(disposed||token!==localToken)return;
    clearCAD(individual,display);makeCAD(geometries.filter(item=>item.role!=="support"&&item.role!=="locator"),individual,display,layer,cubeModel.rings[layer-1].zMM-9);
    await loadSupports(layer,token);if(disposed||token!==localToken)return;
    ringComplete=layer;cameraTargets();apply();updateReady();
   }catch{if(!disposed&&token===localToken){toggleLoading(false);setError(true);}}
  }
  async function loadSupports(layer:number,token:number){
   for(const [role,parent] of [["support",supportGroup],["locator",locatorGroup]] as const){
    const asset=assetManifest?.parts?.find(item=>(item.id??"").includes(role));if(!asset)continue;
    const meshes=await loadCAD(asset);if(disposed||token!==localToken)return;
    const old=display.filter(item=>item.mesh.parent===parent);for(const item of old){item.mesh.removeFromParent();if(item.edge)item.edge.removeFromParent();const index=display.indexOf(item);if(index>=0)display.splice(index,1);ownedMaterial.delete(item.mesh.material as THREE.Material);(item.mesh.material as THREE.Material).dispose();if(item.edge){ownedGeometry.delete(item.edge.geometry);item.edge.geometry.dispose();}}
    makeCAD(meshes,parent,display,layer,cubeModel.rings[layer-1].zMM-9);
   }
   rebuildRods();
  }
  async function loadWhole(){
   if(fullLoaded)return;fullLoaded=true;const token=++fullToken;toggleLoading(true);
   try{
    assetManifest=await manifest();alignMountingFrame();
    const queue=[...assetManifest.layers];
    const next=async()=>{
     for(;;){const asset=queue.shift();if(!asset)return;const meshes=await loadCAD(asset);if(disposed||token!==fullToken)return;
      const layer=asset.ring??assetManifest!.layers.indexOf(asset)+1;makeCAD(meshes.filter(item=>item.role!=="support"&&item.role!=="locator"),whole,wholeDisplay,layer,cubeModel.rings[layer-1].zMM-9,false);apply();
     }
    };
    await Promise.all([next(),next(),next()]);if(disposed||token!==fullToken)return;
    await loadWholeSupports();rebuildRods();fullComplete=true;cameraTargets();apply();updateReady();
   }catch{if(!disposed&&token===fullToken){fullLoaded=false;toggleLoading(false);setError(true);}}
  }
  async function loadWholeSupports(){
   const assets=assetManifest?.parts??[];
   for(const role of ["support","locator"]){
    const asset=assets.find(item=>(item.id??"").includes(role));if(!asset)continue;
    const geometries=await loadCAD(asset);if(disposed)return;
    for(const layer of cubeModel.rings){
     if(role==="locator"&&layer.id===14)continue;
     makeCAD(geometries,whole,wholeDisplay,layer.id,layer.zMM-9,false);
    }
   }
  }

  // M6 is confirmed for the inter-layer rods. Their lengths and quantities,
  // along with the frame cut list, remain illustrative rather than inferred.
  const frameMaterial=ownMat(new THREE.MeshPhysicalMaterial({color:0xb9c0c7,metalness:.8,roughness:.3,clearcoat:.16,clearcoatRoughness:.24}));
  const frameEdges=ownMat(new THREE.LineBasicMaterial({color:0x59616b,transparent:true,opacity:.25}));
  const profileCache=new Map<string,{body:THREE.BufferGeometry;edges:THREE.EdgesGeometry}>();
  function extrusion(width:number,height:number,length:number){
   const id=width+":"+height+":"+length,cached=profileCache.get(id);if(cached)return cached;
   // Four open T-slots and a through-bore make the extrusion legible from
   // its sides and ends. These proportions are illustrative, not stock specs.
   const minor=Math.min(width,height),opening=minor*.105,chamber=minor*.23,lip=minor*.075,depth=minor*.23,radius=4.5;
   const shape=new THREE.Shape();shape.moveTo(-width/2+radius,height/2);
   for(let face=0;face<4;face++){
    const span=(face%2?height:width)/2,reach=(face%2?width:height)/2;
    const tangent=new THREE.Vector2(Math.cos(-face*Math.PI/2),Math.sin(-face*Math.PI/2));
    const normal=new THREE.Vector2(-tangent.y,tangent.x);
    const side:[number,number][]=[[-opening,reach],[-opening,reach-lip],[-chamber,reach-lip],[-chamber,reach-depth],[chamber,reach-depth],[chamber,reach-lip],[opening,reach-lip],[opening,reach],[span-radius,reach]];
    for(const [a,b] of side)shape.lineTo(tangent.x*a+normal.x*b,tangent.y*a+normal.y*b);
    const center=tangent.clone().multiplyScalar(span-radius).addScaledVector(normal,reach-radius);
    shape.absarc(center.x,center.y,radius,Math.PI/2-face*Math.PI/2,-face*Math.PI/2,true);
   }
   shape.closePath();
   const bore=new THREE.Path();bore.absarc(0,0,minor*.105,0,Math.PI*2,false);shape.holes.push(bore);
   const body=ownGeo(new THREE.ExtrudeGeometry(shape,{depth:length,bevelEnabled:false,curveSegments:12,steps:1}));body.translate(0,0,-length/2);body.computeBoundingBox();
   const result={body,edges:ownGeo(new THREE.EdgesGeometry(body,35))};profileCache.set(id,result);return result;
  }
  function beam(x:number,y:number,z:number,sx:number,sy:number,sz:number){
   const axis=sx>sy&&sx>sz?"x":sy>sz?"y":"z",length=Math.max(sx,sy,sz),width=axis==="x"?sz:sx,height=axis==="z"?sy:axis==="y"?sz:sy;
   const profile=extrusion(width,height,length),mesh=new THREE.Mesh(profile.body,frameMaterial);mesh.position.set(x,y,z);
   if(axis==="x")mesh.rotation.y=Math.PI/2;else if(axis==="y")mesh.rotation.x=-Math.PI/2;
   mesh.castShadow=true;mesh.receiveShadow=true;frameGroup.add(mesh);
   const line=new THREE.LineSegments(profile.edges,frameEdges);line.position.copy(mesh.position);line.quaternion.copy(mesh.quaternion);frameGroup.add(line);
  }
  for(const z of [-295,295]){
   for(const x of [-235.1,235.1])beam(x,-87.5,z,40,335,40);
   beam(0,-275,z,510.2,40,40);
  }
  // Nominal support-channel coordinates measured in the supplied support CAD:
  // side walls |X|=215..255.2, upper seat Y=40.1; lower seat Y=-215.
  // These rounded illustrative guides fit the channel, rather than a narrow
  // floating square beam. They are not an approved profile/cut-list release.
  for(const x of [-235.1,235.1])beam(x,.1,0,40,80,550);
  beam(0,-235,0,80,40,590);
  // Lightweight corner connections: shared geometry and three instanced
  // draws for all eight brackets and their heads. Fastening is schematic.
  const bracketShape=new THREE.Shape();bracketShape.moveTo(0,0);bracketShape.lineTo(30,0);bracketShape.lineTo(30,3);bracketShape.lineTo(3,3);bracketShape.lineTo(3,30);bracketShape.lineTo(0,30);bracketShape.closePath();
  const bracketGeometry=ownGeo(new THREE.ExtrudeGeometry(bracketShape,{depth:16,bevelEnabled:false,steps:1}));bracketGeometry.translate(0,0,-8);
  const bracketMaterial=ownMat(new THREE.MeshStandardMaterial({color:0xc5cbd1,metalness:.75,roughness:.36}));
  const headMaterial=ownMat(new THREE.MeshStandardMaterial({color:0x838d98,metalness:.85,roughness:.26}));
  const socketMaterial=ownMat(new THREE.MeshStandardMaterial({color:0x26313c,metalness:.2,roughness:.65}));
  const brackets=new THREE.InstancedMesh(bracketGeometry,bracketMaterial,8);
  const headShape=new THREE.Shape();headShape.absarc(0,0,2.65,0,Math.PI*2,false);
  const hexSocket=new THREE.Path();hexSocket.moveTo(1.2,0);for(let i=1;i<=6;i++)hexSocket.lineTo(1.2*Math.cos(i*Math.PI/3),1.2*Math.sin(i*Math.PI/3));hexSocket.closePath();headShape.holes.push(hexSocket);
  const headGeometry=ownGeo(new THREE.ExtrudeGeometry(headShape,{depth:1.8,bevelEnabled:false,curveSegments:8}));headGeometry.translate(0,0,-.9);headGeometry.rotateX(-Math.PI/2);
  const boltHeads=new THREE.InstancedMesh(headGeometry,headMaterial,16);
  const boltSockets=new THREE.InstancedMesh(ownGeo(new THREE.CylinderGeometry(1.2,1.2,.05,6)),socketMaterial,16);
  const connection=new THREE.Object3D(),head=new THREE.Object3D(),matrix=new THREE.Matrix4();let bracketIndex=0;
  for(const x of [-215.1,215.1])for(const y of [-255,40.1])for(const z of [-275,275]){
   connection.position.set(x,y,z);connection.rotation.set(0,z<0?-Math.PI/2:Math.PI/2,0);connection.updateMatrix();brackets.setMatrixAt(bracketIndex,connection.matrix);
   for(let face=0;face<2;face++){
    head.position.set(face===0?3.9:19,face===0?19:3.9,0);head.rotation.set(0,0,face===0?-Math.PI/2:0);head.updateMatrix();matrix.multiplyMatrices(connection.matrix,head.matrix);boltHeads.setMatrixAt(bracketIndex*2+face,matrix);
    head.position.set(face===0?4:19,face===0?19:4,0);head.updateMatrix();matrix.multiplyMatrices(connection.matrix,head.matrix);boltSockets.setMatrixAt(bracketIndex*2+face,matrix);
   }
   bracketIndex++;
  }
  for(const mesh of [brackets,boltHeads,boltSockets]){mesh.castShadow=mesh!==boltSockets;mesh.receiveShadow=true;mesh.computeBoundingSphere();frameGroup.add(mesh);}
  container.dataset.frameProfiles="9";container.dataset.frameGeometryVariants=String(profileCache.size);container.dataset.frameBrackets=String(bracketIndex);container.dataset.studioEnvironment=studioEnvironment?"procedural":"direct";
  const rodMaterial=ownMat(new THREE.MeshStandardMaterial({color:0x9d855b,roughness:.36,metalness:.72}));
  const rodGeometry=ownGeo(new THREE.CylinderGeometry(3,3,570,14));
  const axisMaterial=ownMat(new THREE.LineDashedMaterial({color:0x6a9dd4,dashSize:7,gapSize:6,transparent:true,opacity:.65}));
  function rebuildRods(){
   rodGroup.clear();for(const child of [...axisGroup.children]){if(child instanceof THREE.Line){ownedGeometry.delete(child.geometry);child.geometry.dispose();}}axisGroup.clear();
   const axes=assetManifest?.rodAxes?.length?assetManifest.rodAxes:[];
   for(const axis of axes){
    const rod=new THREE.Mesh(rodGeometry,rodMaterial);rod.rotation.x=Math.PI/2;rod.position.set(axis.x,axis.y,0);rod.castShadow=true;rodGroup.add(rod);
    const line=new THREE.Line(ownGeo(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(axis.x,axis.y,-340),new THREE.Vector3(axis.x,axis.y,340)])),axisMaterial);line.computeLineDistances();axisGroup.add(line);
   }
  }
  const acrylicMaterial=ownMat(new THREE.MeshPhysicalMaterial({color:0x83bdd0,transparent:true,opacity:.24,roughness:.08,metalness:0,depthWrite:false,side:THREE.DoubleSide}));
  function acrylicSector(start:number,end:number){
   const shape=new THREE.Shape();shape.absarc(0,0,200,start,end,false);shape.lineTo(115*Math.cos(end),115*Math.sin(end));shape.absarc(0,0,115,end,start,true);shape.closePath();
   const geometry=ownGeo(new THREE.ExtrudeGeometry(shape,{depth:1.4,bevelEnabled:false,curveSegments:36}));
   const mesh=new THREE.Mesh(geometry,acrylicMaterial);acrylicGroup.add(mesh);return mesh;
  }
  const acrylic=acrylicSector(-Math.PI/4,Math.PI/4);
  const guideGeometry=ownGeo(new THREE.BufferGeometry().setFromPoints(Array.from({length:121},(_,i)=>new THREE.Vector3(202*Math.cos(i/120*Math.PI*1.3-.65*Math.PI),202*Math.sin(i/120*Math.PI*1.3-.65*Math.PI),0))));
  const guideMaterial=ownMat(new THREE.LineDashedMaterial({color:0x087fc1,dashSize:6,gapSize:4,transparent:true,opacity:.6}));
  const acrylicGuide=new THREE.Line(guideGeometry,guideMaterial);acrylicGuide.computeLineDistances();acrylicGroup.add(acrylicGuide);
  const acrylicArrow=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(205,0,0),32,0x0071e3,10,5);acrylicGroup.add(acrylicArrow);

  const count=cubeModel.magnets.length,block=12;
  const bodyMaterial=ownMat(new THREE.MeshStandardMaterial({color:0x8b929c,metalness:.6,roughness:.32}));
  const northMaterial=ownMat(new THREE.MeshStandardMaterial({color:0xe84b49,metalness:.08,roughness:.46}));
  const southMaterial=ownMat(new THREE.MeshStandardMaterial({color:0x1675d9,metalness:.08,roughness:.46}));
  const magnetBody=new THREE.InstancedMesh(ownGeo(new THREE.BoxGeometry(block*.997,block*.997,block*.997)),bodyMaterial,count);
  const magnetNorth=new THREE.InstancedMesh(ownGeo(new THREE.BoxGeometry(block,block*.5,block)),northMaterial,count);
  const magnetSouth=new THREE.InstancedMesh(ownGeo(new THREE.BoxGeometry(block,block*.5,block)),southMaterial,count);
  root.add(magnetBody,magnetNorth,magnetSouth);
  for(const mesh of [magnetBody,magnetNorth,magnetSouth]){mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=true;mesh.receiveShadow=true;}
  const glyphTextures:THREE.CanvasTexture[]=[];
  const ringLabels=new THREE.Group();root.add(ringLabels);
  for(const ring of cubeModel.rings){
   const canvas=document.createElement("canvas");canvas.width=128;canvas.height=64;const ctx=canvas.getContext("2d")!;
   ctx.font="600 44px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.lineWidth=7;ctx.strokeStyle="#fff";ctx.strokeText(ringName(ring.id),64,34);ctx.fillStyle="#596572";ctx.fillText(ringName(ring.id),64,34);
   const texture=new THREE.CanvasTexture(canvas);glyphTextures.push(texture);
   const sprite=new THREE.Sprite(ownMat(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false})));sprite.scale.set(37,18.5,1);sprite.position.set(-230,214,ring.zMM);sprite.userData.ring=ring.id;ringLabels.add(sprite);
  }
  function glyphTexture(letter:string){
   const canvas=document.createElement("canvas");canvas.width=64;canvas.height=64;const ctx=canvas.getContext("2d")!;ctx.fillStyle="#fff";ctx.font="bold 42px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(letter,32,34);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;glyphTextures.push(texture);return texture;
  }
  const glyphGeometry=ownGeo(new THREE.PlaneGeometry(6.5,6.5));
  const glyphN=new THREE.InstancedMesh(glyphGeometry,ownMat(new THREE.MeshBasicMaterial({map:glyphTexture("N"),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2})),count);
  const glyphS=new THREE.InstancedMesh(glyphGeometry,ownMat(new THREE.MeshBasicMaterial({map:glyphTexture("S"),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2})),count);
  root.add(glyphN,glyphS);for(const glyph of [glyphN,glyphS])glyph.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const outline=new THREE.LineSegments(ownGeo(new THREE.EdgesGeometry(new THREE.BoxGeometry(13.1,13.1,13.1))),ownMat(new THREE.LineBasicMaterial({color:0xffa700})));root.add(outline);outline.visible=false;
  const columnHighlight=new THREE.Group();root.add(columnHighlight);
  const columnMaterial=ownMat(new THREE.LineBasicMaterial({color:0x0071e3,transparent:true,opacity:.68}));
  for(let i=0;i<6;i++)columnHighlight.add(new THREE.LineSegments(outline.geometry,columnMaterial));
  const polarArrow=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(),27,0xe53335,8,4);root.add(polarArrow);polarArrow.visible=false;
  const dummy=new THREE.Object3D(),basis=new THREE.Matrix4(),q=new THREE.Quaternion();
  let magnetIds:Magnet[]=[];
  const displayedMagnetPositions=new Map<string,THREE.Vector3>();
  function orient(magnet:Magnet){const [u,n,w]=magnetBasis(magnet);return q.setFromRotationMatrix(basis.makeBasis(physicalDirection(u),physicalDirection(n),physicalDirection(w)));}
  function buildMagnets(){
   const preview=partRole(current.partId),full=(current.step===0&&!preview)||current.step===7||current.step===9;
   const magnets=preview==="magnet"?cubeModel.magnets.filter(m=>m.ring===current.ring&&m.sector===1):full?cubeModel.magnets:cubeModel.magnets.filter(m=>m.ring===current.ring).sort((a,b)=>a.sector-b.sector||a.radial-b.radial);
   let k=0;magnetIds=[];displayedMagnetPositions.clear();
   for(const magnet of magnets){
    let visible=(full||current.step>=3||preview==="magnet")&&(!preview||preview==="magnet")&&!isInterfaceDemo();
    const position=physical(cubeModel.position(magnet));
    if(current.step===3&&!preview){
     const rowSize=cubeModel.rings[current.ring-1].radii.length;
     const order=magnet.sector===1?magnet.radial-1:rowSize+(magnet.sector-2)*rowSize+magnet.radial-1;
     const first=range(current.progress,...assemblyTiming.firstMagnetColumn)*rowSize;
     const rest=range(current.progress,...assemblyTiming.remainingMagnetColumns)*(magnets.length-rowSize);
     const filled=magnet.sector===1?first:rowSize+rest;
     visible=order<filled+.8;
     if(visible){const arrival=smooth(filled-order);position.z+=(1-arrival)*56;}
    }
    if(current.step===9&&!preview){
     const arrived=1+range(current.progress,...assemblyTiming.layers)*13;
     visible=magnet.ring<=Math.ceil(arrived);
     if(visible&&magnet.ring>Math.floor(arrived))position.z-=smooth(Math.ceil(arrived)-arrived)*65;
    }
    if(current.cutaway&&position.x>0&&!preview)visible=false;
    if(!visible)continue;
    if(current.exploded&&full)position.z+=(7.5-magnet.ring)*18;
    if(current.step===8&&!preview)position.addScaledVector(liftDirection,(1-range(current.progress,...assemblyTiming.frameMount))*82);
    const orientation=orient(magnet).clone(),normal=physicalDirection(magnet.normal);
    dummy.scale.setScalar(1);dummy.position.copy(position);dummy.quaternion.copy(orientation);dummy.updateMatrix();magnetBody.setMatrixAt(k,dummy.matrix);
    dummy.position.copy(position).addScaledVector(normal,3);dummy.updateMatrix();magnetNorth.setMatrixAt(k,dummy.matrix);
    dummy.position.copy(position).addScaledVector(normal,-3);dummy.updateMatrix();magnetSouth.setMatrixAt(k,dummy.matrix);
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);dummy.position.copy(position).addScaledVector(normal,6.09);dummy.updateMatrix();glyphN.setMatrixAt(k,dummy.matrix);
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal.clone().negate());dummy.position.copy(position).addScaledVector(normal,-6.09);dummy.updateMatrix();glyphS.setMatrixAt(k,dummy.matrix);
    magnetIds.push(magnet);displayedMagnetPositions.set(magnet.id,position.clone());k++;
   }
   for(const mesh of [magnetBody,magnetNorth,magnetSouth,glyphN,glyphS]){mesh.count=k;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
   const selectedMagnet=focusedId?cubeModel.magnetById.get(focusedId):undefined;
   columnHighlight.visible=current.highlight&&current.step===3&&!current.partId;
   const firstColumn=magnetIds.filter(m=>m.sector===1);
   columnHighlight.children.forEach((child,index)=>{const magnet=firstColumn[index];child.visible=!!magnet;if(magnet){child.position.copy(displayedMagnetPositions.get(magnet.id)!);child.quaternion.copy(orient(magnet));}});
   outline.visible=!!selectedMagnet&&magnetIds.some(m=>m.id===focusedId);polarArrow.visible=outline.visible;
   if(selectedMagnet&&outline.visible){outline.position.copy(displayedMagnetPositions.get(selectedMagnet.id)!);outline.quaternion.copy(orient(selectedMagnet));polarArrow.position.copy(outline.position);polarArrow.setDirection(physicalDirection(selectedMagnet.normal));}
  }

  function roleTarget():Role|null{
   if(current.step===1||current.step===2)return "base";
   if(current.step===4)return "cover";
   if(current.step===5)return "acrylic";
   if(current.step===6)return "support";
   return null;
  }
  function apply(){
   const preview=partRole(current.partId),full=(current.step===0&&!preview)||current.step===7||current.step===9;
   const localInterface=isInterfaceDemo(),clipOnly=preview==="temporary-clip";
   interfaceDemo.visible=localInterface||clipOnly;
   temporaryClip.visible=clipReady&&(clipOnly||localInterface&&(current.step===10||current.progress<assemblyTiming.temporaryClipRemoval[1]));
   temporaryClip.position.x=clipOnly?0:current.step===10?-55*(1-range(current.progress,...assemblyTiming.temporaryClip)):-55*range(current.progress,...assemblyTiming.temporaryClipRemoval);
   matingBase.visible=matingAcrylic.visible=localInterface;
   matingCap.visible=demoFastener.visible=localInterface&&current.step===4;
   matingCap.position.z=jawGap/2+2.5+36*(1-range(current.progress,...assemblyTiming.capApproach));
   demoFastener.position.z=13.1+22*(1-range(current.progress,...assemblyTiming.coverFasteners));
   const capRestrains=localInterface&&current.step===4&&current.progress>=assemblyTiming.capApproach[1];
   restraintContact.visible=capRestrains&&current.highlight;
   clipMaterial.color.setHex(current.highlight?0x1677bb:0x496b82);
   matingBaseMaterial.transparent=current.transparent;matingBaseMaterial.opacity=current.transparent?.3:1;matingBaseMaterial.depthWrite=!current.transparent;
   matingBase.position.z=-illustrativeClearBand/2-(current.exploded?8:0);
   matingAcrylic.position.z=jawGap/2-illustrativeClearBand/2+(current.exploded?6:0);
   clipMaterial.clippingPlanes=current.cutaway?[clippingPlane]:[];clipMaterial.clipShadows=true;
   const cinematic=current.step===0&&!preview;
   renderer.toneMappingExposure=cinematic?.82:1;
   scene.environmentIntensity=cinematic?.56:.68;
   key.intensity=cinematic?1.8:2.8;key.color.setHex(cinematic?0xfff0dc:0xffffff);
   hemisphere.intensity=cinematic?.28:.7;
   fill.intensity=cinematic?.3:1;fill.color.setHex(cinematic?0xcbdfff:0xffffff);
   rim.intensity=cinematic?1.3:.85;
   (floor.material as THREE.ShadowMaterial).opacity=cinematic?.27:.14;
   frameMaterial.roughness=cinematic?.23:.3;
   frameMaterial.envMapIntensity=cinematic?1.25:1;
   frameEdges.opacity=cinematic?.33:.25;
   northMaterial.color.setHex(cinematic?0xed292d:0xe84b49);
   southMaterial.color.setHex(cinematic?0x006be5:0x1675d9);
   individual.visible=!full&&!localInterface&&!clipOnly;whole.visible=full;frameGroup.visible=(!preview&&[0,7,8,9].includes(current.step))||preview==="frame";
   floor.visible=full||current.step===8||preview==="frame"||interfaceDemo.visible;floor.position.y=interfaceDemo.visible?-20:-296;
   supportGroup.visible=(!full&&!preview&&[6,7,8,9].includes(current.step))||preview==="support";
   locatorGroup.visible=!full&&!preview&&[6,7,8,9].includes(current.step);
   spacerPreview.visible=preview==="locator";
   spacerMaterial.opacity=current.transparent?.5:1;spacerMaterial.transparent=current.transparent;spacerMaterial.depthWrite=!current.transparent;
   // Semantic phase 7 is now the final lesson: mount the frame (8), then all
   // layers (9), and only then insert rods. Never show rods in those two phases.
   rodGroup.visible=(!preview&&(current.step===0||current.step===7))||preview==="rod";
   axisGroup.visible=!preview&&current.step===7;
   acrylicGroup.visible=(!preview&&!localInterface&&[4,5,6,8,10].includes(current.step))||preview==="acrylic";
   const z=cubeModel.rings[current.ring-1]?.zMM??247;
   insertionArrow.visible=!preview&&(current.step===1||current.step===2)&&current.highlight&&current.progress<assemblyTiming.primary[1];
   if(insertionArrow.visible){const direction=current.step===1?jointDirection:closureDirection;insertionArrow.setDirection(direction.clone().negate());insertionArrow.position.copy(direction).multiplyScalar(238+(1-range(current.progress,...assemblyTiming.primary))*70);insertionArrow.position.z=z+20;}
   ringLabels.visible=full&&current.exploded;
   for(const label of ringLabels.children){const ring=Number(label.userData.ring);label.position.z=cubeModel.rings[ring-1].zMM+(current.exploded?(7.5-ring)*18:0);label.visible=current.step!==9||ring<=Math.ceil(1+range(current.progress,...assemblyTiming.layers)*13);}
   // Keep the unverified acrylic guide outside the physical CAD solids. Its
   // floating overlay is not presented as a measured seated layer position.
   acrylicGroup.position.z=z+17;acrylic.rotation.z=current.step===5?-(1-range(current.progress,...assemblyTiming.acrylicSlide))*Math.PI*.55:0;acrylicGuide.visible=!preview&&current.step===5;acrylicArrow.visible=!preview&&current.step===5;
   for(const object of [...display,...wholeDisplay]){
    let visible=true;
    if(preview)visible=object.role===preview&&preview!=="locator";
    else if(!full){
     if(object.role==="base")visible=current.step!==1||object.quarter===0||object.quarter===1;
     else if(object.role==="cover")visible=[4,6,7,8,9].includes(current.step);
     else if(object.role==="fastener")visible=[4,6,7,8,9].includes(current.step);
     else if(object.role==="acrylic")visible=[4,5,6,7,8,9,10].includes(current.step);
     else if(object.role==="support"||object.role==="locator")visible=[6,7,8,9].includes(current.step);
    }
    if(full&&current.step===9){const n=1+range(current.progress,...assemblyTiming.layers)*13;visible=object.ring<=Math.ceil(n);}
    object.mesh.visible=visible;if(object.edge)object.edge.visible=visible&&!full;
    object.mesh.position.copy(object.home);object.mesh.rotation.set(0,0,0);
    if(current.step===1&&object.role==="base"&&object.quarter===0){
     const distance=(1-range(current.progress,...assemblyTiming.primary))*100;
     object.mesh.position.addScaledVector(jointDirection,distance);
    }
    if(current.step===2&&object.role==="base"){
     // The two final dovetails share the same radial rail axis. Keep the
     // first half fixed and translate the second half along that axis.
     if(object.quarter>=2)object.mesh.position.addScaledVector(closureDirection,(1-range(current.progress,...assemblyTiming.primary))*100);
    }
    if(current.step===4&&object.role==="cover")object.mesh.position.z+=(1-range(current.progress,...assemblyTiming.capApproach))*58;
    if(current.step===4&&object.role==="fastener")object.mesh.position.z+=(1-range(current.progress,...assemblyTiming.coverFasteners))*20;
    if(current.step===6&&(object.role==="support"||object.role==="locator")){
     const v=new THREE.Vector3(object.centroid.x,object.centroid.y,0).normalize();
     if(object.role==="support")object.mesh.position.addScaledVector(v,(1-range(current.progress,...assemblyTiming.supports))*65);
     else object.mesh.position.z-=(1-range(current.progress,...assemblyTiming.spacers))*52;
    }
    if(full&&current.step===9){const n=1+range(current.progress,...assemblyTiming.layers)*13;if(object.ring>Math.floor(n))object.mesh.position.z-=smooth(Math.ceil(n)-n)*65;}
    if(current.exploded&&full)object.mesh.position.z+=(7.5-object.ring)*18;
    if(current.exploded&&!full&&object.role==="base")object.mesh.position.addScaledVector(new THREE.Vector3(object.centroid.x,object.centroid.y,0).normalize(),23);
    if(current.exploded&&!full&&(object.role==="cover"||object.role==="fastener"))object.mesh.position.z+=object.role==="cover"?42:70;
    if(current.exploded&&!full&&object.role==="support")object.mesh.position.addScaledVector(new THREE.Vector3(object.centroid.x,object.centroid.y,0).normalize(),35);
    if(current.exploded&&!full&&object.role==="locator")object.mesh.position.z-=35;
    if(object.edge)object.edge.position.copy(object.mesh.position);
    const material=object.mesh.material as THREE.MeshStandardMaterial;
    const original=cinematic?cinematicColors[object.role]:materials[object.role].color;
    const highlight=current.highlight&&roleTarget()===object.role&&(current.step!==1||object.quarter===0)&&(current.step!==2||object.quarter>=2);
    material.color.copy(highlight?highlightMat.color:original);
    material.transparent=current.transparent&&["base","cover","support"].includes(object.role)||object.role==="acrylic";
    material.opacity=material.transparent?(object.role==="acrylic"?.22:.24):1;material.depthWrite=!material.transparent;
    material.clippingPlanes=current.cutaway&&!preview?[clippingPlane]:[];material.clipShadows=true;
    if(object.edge){(object.edge.material as THREE.LineBasicMaterial).clippingPlanes=current.cutaway&&!preview?[clippingPlane]:[];object.edge.visible=visible&&!full&&!current.transparent;}
   }
   const insertion=1-range(current.progress,...assemblyTiming.primary);
   if(current.step===7)rodGroup.position.z=-insertion*570;else rodGroup.position.z=0;
   if(current.step===7&&current.progress!==lastRodCameraProgress){lastRodCameraProgress=current.progress;cameraTargets(false);}
   const drop=current.step===8?(1-range(current.progress,...assemblyTiming.frameMount))*82:0;
   for(const group of [individual,supportGroup,locatorGroup])group.position.copy(liftDirection).multiplyScalar(drop);
   buildMagnets();
   container!.dataset.magnetCount=String(magnetBody.count);container!.dataset.ring=String(current.ring);container!.dataset.step=String(current.step);
   container!.dataset.cadMeshes=String((full?wholeDisplay:display).filter(d=>d.mesh.visible).length);container!.dataset.progress=current.progress.toFixed(3);
   container!.dataset.durationSeconds=String(duration);container!.dataset.primaryMotionStartsAtSeconds=String(assemblyTiming.primary[0]*duration);container!.dataset.motionEasing=ASSEMBLY_EASING;
   const firstAction=current.step===3?assemblyTiming.firstMagnetColumn:current.step===4?assemblyTiming.capApproach:current.step===5?assemblyTiming.acrylicSlide:current.step===10?assemblyTiming.temporaryClip:current.step===6?assemblyTiming.supports:current.step===8?assemblyTiming.frameMount:current.step===9?assemblyTiming.layers:assemblyTiming.primary;
   container!.dataset.firstActionProgress=range(current.progress,firstAction[0],firstAction[1]).toFixed(4);
   container!.dataset.rodsVisible=String(rodGroup.visible);container!.dataset.rodDiameterMM="6";container!.dataset.rodCount=String(rodGroup.children.length);container!.dataset.rodOffsetMM=String(rodGroup.position.z);
   container!.dataset.clipVisible=String(interfaceDemo.visible&&temporaryClip.visible);
   container!.dataset.clipCount=String(interfaceDemo.visible&&temporaryClip.visible?1:0);
   container!.dataset.clipPhase=clipOnly?"isolated-part":!localInterface?"absent":current.step===10?(current.progress>=assemblyTiming.temporaryClip[1]?"clamped":"approaching"):current.progress<assemblyTiming.capApproach[1]?"clamped-cap-approaching":current.progress<assemblyTiming.temporaryClipRemoval[0]?"restraint-handover":current.progress<assemblyTiming.temporaryClipRemoval[1]?"withdrawing":"removed";
   container!.dataset.capRestraint=String(capRestrains);
   container!.dataset.interfaceDemo=String(localInterface);
   container!.dataset.clipPlacementStatus="local-interface-schematic-not-registered-to-ring";
   if(localInterface)cameraTargets(false);
   if(preview==="locator"){container!.dataset.spacerShape="cylinder";container!.dataset.spacerLengthMM="18";container!.dataset.spacerDiameters="illustrative";}
   else{delete container!.dataset.spacerShape;delete container!.dataset.spacerLengthMM;delete container!.dataset.spacerDiameters;}
  }

  function cameraTargets(snap=true){
   const preview=partRole(current.partId),full=(current.step===0&&!preview)||current.step===7||current.step===9,z=cubeModel.rings[current.ring-1]?.zMM??247;
   targetWhole.set(0,-8,full?0:z);eyeWhole.set(full?660:420,full?430:300,full?910:z+720);
   if(preview){
    const relevant=display.filter(item=>item.role===preview),bounds=new THREE.Box3();
    if(relevant.length){for(const item of relevant)bounds.expandByObject(item.mesh);const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());targetWhole.copy(center);const distance=Math.max(60,Math.max(size.x,size.y,size.z)*2.05);eyeWhole.copy(center).add(new THREE.Vector3(.6,.35,1).normalize().multiplyScalar(distance));}
    if(preview==="magnet"){targetWhole.set(150,-18,z);eyeWhole.set(220,95,z+250);}
    if(preview==="acrylic"){targetWhole.set(130,0,z);eyeWhole.set(350,180,z+390);}
    if(preview==="frame"){targetWhole.set(0,0,0);eyeWhole.set(720,480,990);}
    if(preview==="rod"){targetWhole.set(0,0,0);eyeWhole.set(670,410,830);}
    if(preview==="locator"){targetWhole.set(0,0,0);eyeWhole.set(31,21,53);}
   }
   if(preview==="frame"||!preview&&[0,7,8,9].includes(current.step)){
    // Fit the display envelope, including the ring's lifted start position.
    // These bounds describe the illustration, not manufacturing dimensions.
    const direction=eyeWhole.clone().sub(targetWhole).normalize();
    const low=new THREE.Vector3(-270,-305,current.step===7?Math.min(-315,rodGroup.position.z-285):-315),high=new THREE.Vector3(270,current.step===8?290:210,315);
    const center=low.clone().add(high).multiplyScalar(.5);
    const right=new THREE.Vector3(0,1,0).cross(direction).normalize(),up=direction.clone().cross(right).normalize();
    const tanY=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*.88,tanX=tanY*camera.aspect;
    let distance=0;
    for(const x of [low.x,high.x])for(const y of [low.y,high.y])for(const z of [low.z,high.z]){
     const point=new THREE.Vector3(x,y,z).sub(center),depth=point.dot(direction);
     distance=Math.max(distance,depth+Math.abs(point.dot(right))/tanX,depth+Math.abs(point.dot(up))/tanY);
    }
    targetWhole.copy(center);eyeWhole.copy(center).addScaledVector(direction,distance);
   }
   targetDetail.set(171,0,z);eyeDetail.set(295,105,z+310);
   if(current.step===1){targetDetail.copy(jointDirection).multiplyScalar(179);targetDetail.z=z;eyeDetail.copy(targetDetail).add(new THREE.Vector3(110,100,295));}
   if(current.step===2){targetDetail.copy(closureDirection).multiplyScalar(174);targetDetail.z=z;eyeDetail.copy(targetDetail).add(new THREE.Vector3(120,95,310));}
   if(current.step===3){const m=cubeModel.magnets.find(m=>m.ring===current.ring&&m.sector===1&&m.radial===Math.ceil(cubeModel.rings[current.ring-1].radii.length/2));if(m){targetDetail.copy(physical(cubeModel.position(m)));eyeDetail.copy(targetDetail).add(new THREE.Vector3(95,105,230));}}
   if(current.step===5){targetDetail.set(159,0,z+7);eyeDetail.set(310,105,z+285);}
   if(current.step===6){targetDetail.set(205,0,z);eyeDetail.set(350,110,z+305);}
   if(current.step===7){const first=assetManifest?.rodAxes?.[0];if(first){targetDetail.set(first.x,first.y,cubeModel.rings[13].zMM);eyeDetail.copy(targetDetail).add(new THREE.Vector3(160,90,-350));}}
   if(current.step===8){targetDetail.set(215,0,z);eyeDetail.set(445,110,z+480);}
   if(current.step===9){targetDetail.set(0,0,120);eyeDetail.set(520,300,690);}
   // Detail coordinates are assembly-local; orbit cameras and hotspots use
   // world mounting coordinates. Whole-frame bounds above are already world.
   const mountingRotation=new THREE.Matrix4().makeRotationZ(root.rotation.z);
   targetDetail.applyMatrix4(mountingRotation);eyeDetail.applyMatrix4(mountingRotation);
   if(!full&&current.step!==8&&!preview){targetWhole.applyMatrix4(mountingRotation);eyeWhole.applyMatrix4(mountingRotation);}
   if(preview){targetDetail.copy(targetWhole);eyeDetail.copy(eyeWhole);}
   if(isInterfaceDemo()){
    // This enlarged interface uses its own world coordinates. It is not an
    // installed transform applied to the physical ring or magnetic geometry.
    // Fit the actual current envelope, including the incoming clip and raised
    // cap. This keeps start/mid/end poses legible without cropping either tool.
    interfaceDemo.updateMatrixWorld(true);
    const bounds=new THREE.Box3();
    for(const child of interfaceDemo.children)if(child.visible)bounds.expandByObject(child);
    if(bounds.isEmpty())bounds.set(new THREE.Vector3(-75,-20,-14),new THREE.Vector3(49,20,51));
    if(current.step===4&&clipReady&&!temporaryClip.visible){
     // The tool leaves at .64. Relax its camera envelope smoothly afterward;
     // deleting its bounds immediately would make the camera jump at handover.
     const departingBounds=new THREE.Box3().setFromObject(temporaryClip);
     const settle=range(current.progress,assemblyTiming.temporaryClipRemoval[1],assemblyTiming.finalCheckStart);
     const focus=bounds.getCenter(new THREE.Vector3());
     departingBounds.min.lerp(focus,settle);departingBounds.max.lerp(focus,settle);bounds.union(departingBounds);
    }
    const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
    const direction=new THREE.Vector3(1.05,.62,1.6).normalize();
    const right=new THREE.Vector3(0,1,0).cross(direction).normalize(),up=direction.clone().cross(right).normalize();
    // Lift the demonstration slightly above the short explanatory caption.
    center.addScaledVector(up,-Math.max(size.y,size.z)*.08);
    const fit=(coverage:number)=>{
     const tanY=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*coverage,tanX=tanY*camera.aspect;
     let distance=65;
     for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      const point=new THREE.Vector3(x,y,z).sub(center),depth=point.dot(direction);
      distance=Math.max(distance,depth+Math.abs(point.dot(right))/tanX,depth+Math.abs(point.dot(up))/tanY);
     }
     return distance;
    };
    targetWhole.copy(center);eyeWhole.copy(center).addScaledVector(direction,fit(.72));
    targetDetail.copy(center);eyeDetail.copy(center).addScaledVector(direction,fit(.8));
   }
   if(preview==="temporary-clip"){targetWhole.set(0,0,0);eyeWhole.set(80,52,110);targetDetail.copy(targetWhole);eyeDetail.copy(eyeWhole);}
   if(snap&&autoCamera){const blend=current.step===0?0:assemblyCameraBlend(current.progress);camera.position.copy(eyeWhole).lerp(eyeDetail,blend);controls.target.copy(targetWhole).lerp(targetDetail,blend);controls.update();}
  }
  function chooseView(kind:"recommended"|"whole"|"detail"){
   requestedView=kind;apply();updateReady();
   autoCamera=kind==="recommended";
   cameraTargets(false);
   const blend=kind==="recommended"&&current.step!==0?assemblyCameraBlend(current.progress):kind==="detail"?1:0;
   camera.position.copy(eyeWhole).lerp(eyeDetail,blend);controls.target.copy(targetWhole).lerp(targetDetail,blend);controls.update();
  }
  const gesture=()=>{autoCamera=false;setCameraMode(isInterfaceDemo()?"detail":"whole");};controls.addEventListener("start",gesture);
  let downPoint:[number,number]=[0,0];
  const pointerDown=(event:PointerEvent)=>{downPoint=[event.clientX,event.clientY];};
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const pointerUp=(event:PointerEvent)=>{
   if(!current.active||event.button!==0||Math.hypot(event.clientX-downPoint[0],event.clientY-downPoint[1])>5)return;
   const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
   const hit=raycaster.intersectObjects([magnetBody,magnetNorth,magnetSouth])[0];
   if(hit?.instanceId===undefined)return;const magnet=magnetIds[hit.instanceId];if(!magnet)return;
   focusedId=magnet.id;setSelected(magnet);callbacks.current.onMagnetSelect?.(magnet.id);apply();
  };
  renderer.domElement.addEventListener("pointerdown",pointerDown);renderer.domElement.addEventListener("pointerup",pointerUp);
  const lost=(event:Event)=>{event.preventDefault();setError(true);};renderer.domElement.addEventListener("webglcontextlost",lost);
  let resizeFrame=0,lastWidth=0,lastHeight=0;
  function resize(){const w=container!.clientWidth,h=container!.clientHeight;if(disposed||w<2||h<2||w===lastWidth&&h===lastHeight)return;lastWidth=w;lastHeight=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(autoCamera)cameraTargets();}
  // Updating the canvas during ResizeObserver delivery can trigger another
  // layout notification in the same cycle. Coalesce writes into the next frame.
  const observer=new ResizeObserver(()=>{if(!resizeFrame&&!disposed)resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;resize();});});observer.observe(container);
  function animate(time:number){
   raf=0;if(disposed||!current.active)return;
   // Use real elapsed playback time so a slower GPU does not stretch an
   // eight-second lesson. Hidden scenes reset previousTime in update().
   const dt=previousTime?Math.max((time-previousTime)/1000,0):0;previousTime=time;
   if(current.playing&&current.step!==0){
    current.progress=Math.min(1,current.progress+dt*current.speed/duration);apply();
    if(time-reportTime>90||current.progress===1){callbacks.current.setProgress(current.progress);reportTime=time;}
    if(current.progress===1){current.playing=false;callbacks.current.setPlaying(false);}
   }
   if(autoCamera&&current.step!==0){
    const close=assemblyCameraBlend(current.progress);
    // The same paused or scrubbed time produces the same recommended camera
    // pose, instead of a frame-rate-dependent trailing interpolation.
    camera.position.copy(eyeWhole).lerp(eyeDetail,close);controls.target.copy(targetWhole).lerp(targetDetail,close);
   }
   controls.update();renderer.render(scene,camera);
   if(hotspot.current){
    const p=targetDetail.clone().project(camera),width=container!.clientWidth,height=container!.clientHeight;
    const px=(p.x*.5+.5)*width,py=(-p.y*.5+.5)*height;
    const labelX=current.step===9?width-92:THREE.MathUtils.clamp(px+106,82,width-82);
    const labelY=current.step===9?100:THREE.MathUtils.clamp(py<106?py+52:py-52,88,height-76);
    const dx=px-labelX,dy=py-labelY;
    hotspot.current.style.display=current.step>0&&!current.partId&&p.z>-1&&p.z<1?"flex":"none";
    hotspot.current.style.left=labelX+"px";hotspot.current.style.top=labelY+"px";
    hotspot.current.style.setProperty("--leader-dx",dx+"px");hotspot.current.style.setProperty("--leader-dy",dy+"px");
    hotspot.current.style.setProperty("--leader-length",Math.hypot(dx,dy)+"px");hotspot.current.style.setProperty("--leader-angle",Math.atan2(dy,dx)+"rad");
   }
   raf=requestAnimationFrame(animate);
  }
  const update=(next:RuntimeOptions)=>{
   const changed=next.step!==current.step||next.ring!==current.ring||next.partId!==current.partId;
   current={...next};controls.enabled=next.active;
   if(changed){autoCamera=true;requestedView="recommended";focusedId=null;cameraTargets();}
   const full=(next.step===0&&!next.partId)||next.step===7||next.step===9;
   if(isInterfaceDemo()||partRole(next.partId)==="temporary-clip")void loadTemporaryClip();
   if(full)void loadWhole();else if(currentRing!==next.ring)void loadRing(next.ring);
   updateReady();
   apply();
   if(next.active&&!raf){previousTime=0;raf=requestAnimationFrame(animate);}else if(!next.active&&raf){cancelAnimationFrame(raf);raf=0;previousTime=0;}
  };
  runtime.current={update,view:chooseView,dispose:()=>{
   disposed=true;localToken++;fullToken++;if(raf)cancelAnimationFrame(raf);if(resizeFrame)cancelAnimationFrame(resizeFrame);observer.disconnect();controls.removeEventListener("start",gesture);controls.dispose();
   renderer.domElement.removeEventListener("pointerdown",pointerDown);renderer.domElement.removeEventListener("pointerup",pointerUp);renderer.domElement.removeEventListener("webglcontextlost",lost);
   for(const mesh of [magnetBody,magnetNorth,magnetSouth,glyphN,glyphS])mesh.dispose();
   for(const mesh of [brackets,boltHeads,boltSockets])mesh.dispose();
   for(const object of [...display,...wholeDisplay]){if(!ownedMaterial.has(object.mesh.material as THREE.Material))(object.mesh.material as THREE.Material).dispose();}
   ownedGeometry.forEach(geometry=>geometry.dispose());ownedMaterial.forEach(material=>material.dispose());glyphTextures.forEach(texture=>texture.dispose());floor.geometry.dispose();(floor.material as THREE.Material).dispose();scene.environment=null;studioEnvironment?.dispose();key.shadow.dispose();renderer.dispose();renderer.domElement.remove();
  }};
  cameraTargets();resize();runtime.current.update(latest.current);
  return ()=>{runtime.current?.dispose();runtime.current=null;};
 },[]);

 const chooseView=(kind:"recommended"|"whole"|"detail")=>{setCameraMode(kind);runtime.current?.view(kind);};
 const phase=progress<assemblyTiming.orientationEnd?t("整体定位","Locate"):progress<assemblyTiming.inspectionEnd?t("接口特写","Inspect"):progress<assemblyTiming.finalCheckStart?t("动作演示","Move"):t("到位检查","Check");
 const part=partRole(partId),interfaceStep=!part&&[4,10].includes(step),localInterfaceView=interfaceStep&&cameraMode!=="whole",schematic=[4,5,7,8,10].includes(step)||step===0&&(!part||["acrylic","rod","frame"].includes(part));
 const fitIssue=(ring===5||ring===10)&&!part&&step>=3&&step<=5;
 const note=part==="locator"?t("层间隔块为长 18 mm 的中空圆柱，中间供 M6 螺杆通过。此视图的外径和孔径仅为示意，实际尺寸及安装位置待确认。","The inter-layer spacer is an 18 mm hollow cylinder for an M6 rod to pass through. Outside and hole diameters are illustrative; actual diameters and mounting positions await confirmation."):
  part==="temporary-clip"||step===10?t("卡扣外形直接来自提供的 STEP。此处为放大的单个接口关系示意，不代表实际卡点、数量或已验证配合。先以临时卡扣约束亚克力和底盖，再安装上盖；不可仅依靠亚克力限制相互吸引的磁铁。","The clip shape comes directly from the supplied STEP. This enlarged single-interface demonstration does not specify actual mounting points, quantity or validated fit. Temporarily retain the clear cover against the housing base before fitting the cap; acrylic alone may not restrain attracting magnets."):
  part==="acrylic"||step===5?t("蓝色悬浮层演示圆周滑动，不表示实际层位。独立亚克力 CAD、厚度及到位位置待确认；滑入后必须先使用临时卡扣，下一步再安装壳体盖板。","The floating blue guide shows circumferential sliding, not a measured layer position. Acrylic CAD, thickness and seating await confirmation. After sliding it in, fit the temporary retaining clip before installing the housing cap."):
  part==="frame"||step===8?t("铝型材框架为位置示意；具体截面、长度与固定规格待确认。三处支撑接触应在实物中核对。","Frame positioning is schematic; extrusion sections, lengths and fixings await confirmation. Verify all three support contacts on the real assembly."):
  part==="rod"||step===7?t("十四层全部安装后，最后插入 M6 贯穿螺杆并用 M6 螺母紧固。已确认共 8 根螺杆、8 个螺母；图中轴线仍是旧 CAD 候选位置，不代表已核定的全部安装点。杆长、材料和扭矩待确认。","After mounting all fourteen layers, insert the M6 through-rods last and secure with M6 nuts. The confirmed BOM contains 8 rods and 8 nuts. Shown axes remain legacy CAD candidates, not a validated set of all mounting positions. Rod lengths, material and torque await confirmation."):
  step===1?t("蓝色扇形的卡扣沿灰色导槽的径向滑入；路径遵循 CAD 轨道方向，实际夹持与操作需现场确认。","The blue sector's clip slides radially into the grey guide, following the CAD rail direction. Confirm physical restraint and handling at the bench."):
  step===2?t("灰色半环保持固定，蓝色半环沿两处卡扣的共同径向导轨滑入。100 mm 仅为展示行程，现场夹持与闭合工艺待核对。","Keep the grey half fixed and slide the blue half along the common radial axis of both dovetails. The 100 mm travel is for demonstration; confirm workshop restraint and procedure."):
  step===3?t("每个长条由独立 12 mm 方块组成。红／蓝和 N／S 为教学标识；逐块核对环号、层位和磁化方向。","Every strip contains separate 12 mm cubes. Red/blue and N/S are teaching labels. Check each ID, radial position and magnetization."):
  step===4?t("先让壳体盖板接替约束，再退出临时卡扣，最后用 M3 螺丝紧固。卡扣采用实际 STEP；接触板和单个螺丝仅作动作关系示意，不表示实际厚度、卡点、数量或已验证配合。实物操作中持续保持磁铁受约束。","Let the housing cap take over restraint before withdrawing the temporary clip, then fasten with M3 screws. The clip uses the supplied STEP; contact plates and one screw explain the sequence, not actual thicknesses, locations, quantities or validated fit. Keep the magnets restrained throughout actual handling."):
  step===6&&(ring===1||ring===14)?t("支撑件使用实际 CAD；R01／R14 的支撑与缺口配合待确认。场景中的块状隔块是旧 CAD 参考，新隔块为 18 mm 中空圆柱，见 BOM；安装位置待确认。","Supports use actual CAD; R01/R14 support-to-notch registration awaits confirmation. Block spacers in this scene are legacy CAD. The current 18 mm hollow cylinder appears in BOM; mounting positions await confirmation."):
  step===6?t("左、右、下支撑使用实际 CAD。场景中的块状隔块是旧 CAD 参考，新隔块为 18 mm 中空圆柱，见 BOM；安装位置待确认。","Left, right and bottom supports use actual CAD. Block spacers in this scene are legacy CAD. The current 18 mm hollow cylinder appears in BOM; mounting positions await confirmation."):
  step===9?t("按 R01 → R14 安装全部十四层，每层 28 列，共 1,736 颗磁铁。此时不装贯穿螺杆；所有层到位后，在最后一步插入 M6 螺杆。","Mount all fourteen layers in R01 → R14 order, with 28 columns each and 1,736 magnets total. Do not fit through-rods yet; insert the M6 rods in the final stage after every layer is seated."):
  schematic?t("环体与支撑来自实际 CAD；框架、贯穿螺杆为位置示意。块状隔块为旧 CAD 参考，已确认的新隔块是 18 mm 中空圆柱，见 BOM；安装位置待确认。","Ring parts and supports use actual CAD; the frame and through rods are positioning guides. Block spacers are legacy CAD. The confirmed spacer is an 18 mm hollow cylinder shown in BOM; mounting positions await confirmation."):t("毫米单位的 CAD 视图；拖动自由观察，滚轮放大。","CAD in millimetres. Drag to inspect and scroll to zoom.");
 const selectedDirection=selected?t(({out:"径向朝外",in:"径向朝内",axial:"轴向 −Z",axialUp:"轴向 +Z",tangent:"切向 +θ",tangentNeg:"切向 −θ"})[selected.direction],directionEnglish[selected.direction]):"";
 const hotspots=["",t("卡扣与导槽","Clip and guide"),t("最后两处接口","Final two joints"),t("A01 · 磁化方向","A01 · Magnetization"),t("上盖接替约束","Cap takes over restraint"),t("弧形导向示意","Curved slide guide"),t("支撑与缺口","Support and notch"),t("M6 螺杆插入轴线","M6 rod insertion axis"),t("支撑接触位置","Support contacts"),"R01 → R14",t("临时固定接口","Temporary retaining interface")];
 const interfaceState=step===10?(progress>=assemblyTiming.temporaryClip[1]?t("卡紧亚克力与底盖，保持临时约束","Retain the clear cover against the base"):t("对齐开口，将卡扣装入接口","Align the opening and fit the clip")):progress<assemblyTiming.capApproach[1]?t("卡扣保持约束，上盖接近","Clip retained · cap approaching"):progress<assemblyTiming.temporaryClipRemoval[0]?t("上盖接替约束，准备退出卡扣","Cap takes over restraint"):progress<assemblyTiming.temporaryClipRemoval[1]?t("保持上盖约束，退出临时卡扣","Maintain cap restraint · remove the clip"):t("卡扣已取下，使用 M3 螺丝紧固","Clip removed · fasten with M3 screws");
 return <div className="assembly-stage" data-assembly-stage={step} data-active={active} data-duration-seconds={duration} data-motion-easing={ASSEMBLY_EASING} data-playing={playing} data-speed={speed}>
   <div className="assembly-stage__toolbar">
    <div className="assembly-stage__views">
     <button type="button" aria-pressed={cameraMode==="recommended"} onClick={()=>chooseView("recommended")} title={t("返回本步骤推荐镜头","Restore the recommended step camera")}><Focus size={14}/>{t("推荐视角","Recommended")}</button>
     <button type="button" aria-pressed={cameraMode==="whole"} onClick={()=>chooseView("whole")}><Box size={14}/>{t("整体","Whole")}</button>
     {step!==0&&<button type="button" aria-pressed={cameraMode==="detail"} onClick={()=>chooseView("detail")}><Scan size={14}/>{t("特写","Detail")}</button>}
    </div>
    {step!==0&&<span className="assembly-stage__phase">{phase}</span>}
   </div>
  <div className="assembly-stage__canvas" ref={host} data-scene-ready={ready} data-webgl-error={error}>
   {step>0&&<button type="button" className="assembly-stage__hotspot" ref={hotspot} onClick={()=>chooseView("detail")} title={t("放大查看该接口","Inspect this interface closely")}><Focus size={12}/>{hotspots[step]}</button>}
   {loading&&!error&&<div className="assembly-stage__loading"><span className="assembly-stage__spinner"/>{t("正在载入 CAD 零件…","Loading CAD parts…")}</div>}
   {error&&<div className="assembly-stage__error"><Box size={28}/>{t("三维场景暂时无法显示，请查看右侧步骤与文件资料。","The 3D scene is unavailable. Assembly instructions and resources remain accessible.")}</div>}
   {interfaceStep&&<div className="assembly-stage__interface-status"><strong>{interfaceState}</strong><span>{localInterfaceView?t("局部接口示意 · 实际卡扣 CAD，卡点、数量与配合待核对","Local interface illustration · supplied clip CAD; verify mounting points, quantity and fit"):t("整环 CAD 定位 · 临时卡扣的实际卡点尚未注册；请切回特写查看约束交接","Whole-ring CAD context · clip positions are not registered; use Detail to inspect restraint handover")}</span>{localInterfaceView&&<div><i data-material="clip"/>{t("临时卡扣","Temporary clip")}<i data-material="acrylic"/>{t("透明盖板","Clear cover")}<i data-material="housing"/>{t(step===4?"底盖与上盖":"底盖",step===4?"Base and cap":"Base")}</div>}</div>}
  </div>
   {selected&&<div className="assembly-stage__selected"><b>{selected.id}</b>{selectedDirection} · {t("中心半径","Center radius")} {Math.round(selected.radius*25)} mm<br/>{t("N 极箭头表示磁化方向，不是该处合场方向。","The N arrow indicates magnetization, not the local resultant field.")}</div>}
   <div className="assembly-stage__callout">
    <details className={"assembly-stage__note"+(fitIssue?" assembly-stage__note--warning":"")}>
     <summary>{fitIssue?`${ringName(ring)} · ${t("槽位需复核","Slot clearance review")}`:t("模型说明","Model notes")}{(part==="frame"||step===8)&&<span> · {t("型材截面为示意，制造规格待确认","Illustrative profiles; manufacturing specifications pending")}</span>}</summary>
     <div>
     {fitIssue?<><strong>{ringName(ring)} · {t("槽位复核","Slot review")}</strong><br/>{t("CAD 与 12 mm 磁块存在约 0.2 mm 名义干涉。保持真实尺寸展示；加工前须确认槽位与余量。","CAD and 12 mm cubes show approximately 0.2 mm nominal interference. True dimensions are preserved; confirm slot clearances before fabrication.")}</>:note}
     {!part&&[7,8,9].includes(step)&&<p>{t("块状隔块为旧 CAD 参考，不能作为当前清单数量或制造外形的依据。已确认的新隔块为 32 个、长 18 mm 的中空圆柱，详见 BOM；具体安装位置待确认。","Block spacers are legacy CAD, not a source for current quantities or manufacturing geometry. The confirmed BOM contains 32 hollow cylinders, each 18 mm long; see BOM. Exact mounting positions await confirmation.")}</p>}
     </div>
    </details>
    {!localInterfaceView&&(!part||part==="magnet")&&(step>=3||step===0)&&<div className="assembly-stage__legend"><span><i/>N</span><span><i data-pole="S"/>S</span>{t("磁极标识","Pole labels")}</div>}
   </div>
  <div className="assembly-stage__controls">
   {step!==0&&<div className="assembly-stage__transport">
    <button type="button" data-primary="true" onClick={()=>setPlaying(value=>!value)} aria-label={playing?t("暂停演示","Pause demonstration"):t("播放演示","Play demonstration")} disabled={error}>{playing?<Pause size={16}/>:<Play size={16}/>}</button>
    <button type="button" onClick={()=>{setProgress(0);setPlaying(true);chooseView("recommended");}} aria-label={t("重播本步骤","Replay this step")} disabled={error}><RotateCcw size={15}/></button>
    <input type="range" min={0} max={1} step={.001} value={progress} onChange={event=>{setPlaying(false);setProgress(Number(event.target.value));}} aria-label={t("装配演示进度","Assembly demonstration progress")}/>
    <span className="assembly-stage__time">{(progress*duration).toFixed(1)} / {duration}s</span>
    <select value={speed} onChange={event=>setSpeed(Number(event.target.value))} aria-label={t("播放速度","Playback speed")}><option value={.5}>0.5×</option><option value={1}>1×</option></select>
   </div>}
   <div className="assembly-stage__options">
    <button type="button" aria-pressed={highlight} onClick={()=>setHighlight(value=>!value)}><Lightbulb size={12}/>{t("零件高亮","Highlight")}</button>
    <button type="button" aria-pressed={transparent} onClick={()=>setTransparent(value=>!value)}><Eye size={12}/>{t("局部透明","Transparent")}</button>
    <button type="button" aria-pressed={cutaway} onClick={()=>setCutaway(value=>!value)}><Scissors size={12}/>{t("剖视","Cutaway")}</button>
    <button type="button" aria-pressed={exploded} onClick={()=>setExploded(value=>!value)}><Layers size={12}/>{t("展开","Explode")}</button>
   </div>
  </div>
 </div>;
}
