export type V3=[number,number,number];
export type GradientAxis="all"|"gx"|"gy"|"gz";
export interface SystemLayers {magnet:boolean;gradient:boolean;rf:boolean;}
export const DEFAULT_LAYERS:SystemLayers={magnet:true,gradient:false,rf:false};
export const coilColors={gx:"#56d8da",gy:"#f5ad66",gz:"#86a8ff",rf:"#df9afa"};
export const COIL_DIMENSIONS={gx:3.25,gy:3,gz:2.75,rf:2.2,rfHalfLength:2.6,gradientHalfLength:4.6,wireRadius:.045,rungs:16};
// MRI coordinates are right-handed: z follows bore/B0. The renderer uses world Y up.
export const toWorld=([x,y,z]:V3):V3=>[x,z,-y];
export const toMRI=([x,y,z]:V3):V3=>[x,-z,y];
export interface Winding {id:string;axis:Exclude<GradientAxis,"all">;points:V3[];current:number;}
const cyl=(r:number,phi:number,z:number):V3=>toWorld([r*Math.cos(phi),r*Math.sin(phi),z]);
function saddle(r:number,phi:number,side:number):V3[]{
 const a=Math.PI/3,near=.9,far=COIL_DIMENSIONS.gradientHalfLength,p:V3[]=[];
 for(let i=0;i<=48;i++)p.push(cyl(r,phi-a+2*a*i/48,side*near));
 for(let i=1;i<=30;i++)p.push(cyl(r,phi+a,side*(near+(far-near)*i/30)));
 for(let i=1;i<=48;i++)p.push(cyl(r,phi+a-2*a*i/48,side*far));
 for(let i=1;i<=30;i++)p.push(cyl(r,phi-a,side*(far-(far-near)*i/30)));
 return p;
}
export function gradientWindings():Winding[]{
 const out:Winding[]=[];
 for(const axis of ["gx","gy"] as const)for(const side of [-1,1])for(let half=0;half<2;half++){
  out.push({id:axis+"-"+side+"-"+half,axis,current:half?-1:1,points:saddle(COIL_DIMENSIONS[axis],(axis==="gy"?Math.PI/2:0)+half*Math.PI,side)});
 }
 const r=COIL_DIMENSIONS.gz,a=Math.sqrt(3)*r/2;
 for(const side of [-1,1])out.push({id:"gz-"+side,axis:"gz",current:side,points:Array.from({length:193},(_,i)=>cyl(r,i/192*2*Math.PI,side*a))});
 // Orient the conceptual positive channel using the field derivative, independent of drawing order.
 for(const axis of ["gx","gy"] as const){
  const subset=out.filter(w=>w.axis===axis),p:V3=axis==="gx"?[.01,0,0]:[0,.01,0];
  if(wireField(toWorld(p),subset)[1]<0)for(const w of subset)w.current*=-1;
 }
 return out;
}
// Midpoint Biot-Savart, shared path used only for topology checks; dimensionless mu0/(4 pi) omitted.
export function wireField(p:V3,windings:Winding[]):V3{
 const b:V3=[0,0,0];
 for(const w of windings)for(let i=0;i<w.points.length-1;i++){
  const a=w.points[i],c=w.points[i+1],d=c.map((v,k)=>v-a[k]),r=p.map((v,k)=>v-(a[k]+c[k])/2);
  const f=w.current/Math.hypot(...r)**3;
  b[0]+=(d[1]*r[2]-d[2]*r[1])*f;b[1]+=(d[2]*r[0]-d[0]*r[2])*f;b[2]+=(d[0]*r[1]-d[1]*r[0])*f;
 }
 return b;
}
export function rfDirection(phase:number):V3{const t=phase*Math.PI/180;return toWorld([Math.cos(t),Math.sin(t),0]);}
export const coilReferences=[
 {title:"Zanovello 等 · Birth of the Coil",titleEn:"Zanovello et al. · Birth of the Coil",date:"2026.08 · 预印本",dateEn:"2026.08 · Preprint",url:"https://arxiv.org/html/2608.14139v1",text:"RF 拓扑须适配 B₀ 方向；低场还需考虑导体损耗、调谐、负载和可重复性。本页据轴向主场选择鸟笼式示意，不移植其螺线管参数。",textEn:"RF topology must match the B₀ direction. At low field, conductor loss, tuning, loading and reproducibility also matter. This page uses an illustrative birdcage coil for the axial main field; it does not reuse the paper's solenoid parameters."},
 {title:"Littin 等 · 开源梯度系统",titleEn:"Littin et al. · Open-source gradient system",date:"ISMRM 2025 · 会议摘要",dateEn:"ISMRM 2025 · Conference abstract",url:"https://archive.ismrm.org/2025/3290_FX6HlbPy3.html",text:"采用 CoilGen 设计、三维载体与后处理，并比较通道效率和电感。说明最终绕组需按目标场优化，不能只凭外观决定。",textEn:"Uses CoilGen design, a 3D support and post-processing, with comparisons of channel efficiency and inductance. Final windings must be optimized for the target field; their appearance alone does not determine performance."},
 {title:"Block 等 · MRI4ALL",titleEn:"Block et al. · MRI4ALL",date:"JMRI 2025 · 研究论文",dateEn:"JMRI 2025 · Research paper",url:"https://onlinelibrary.wiley.com/doi/10.1002/jmri.29771",text:"完整系统分别包含主磁体、三轴梯度、RF 收发与控制链。本页加入梯度层和 RF 层的空间关系。",textEn:"A complete system includes the main magnet, three-axis gradients, RF transmission and reception, and the control chain. This page shows the spatial relationship of the gradient and RF layers."},
 {title:"Amrein 等 · CoilGen",titleEn:"Amrein et al. · CoilGen",date:"MRM 2022 · 开源方法",dateEn:"MRM 2022 · Open-source method",url:"https://www.opensourceimaging.org/project/coilgen-an-open-source-mr-coil-layout-generator/",text:"以目标 Bz 场和线圈支撑面为输入，生成可连接绕线；本页的 Golay / Maxwell 参考拓扑尚未经过该优化。",textEn:"Uses a target Bz field and coil support surface to generate connected windings. The illustrative Golay / Maxwell topologies on this page have not undergone that optimization."},
 {title:"FENCE · 低场 RF 干扰抑制",titleEn:"FENCE · Low-field RF interference suppression",date:"2025.12 · 预印本",dateEn:"2025.12 · Preprint",url:"https://arxiv.org/html/2512.04889v1",text:"提示 RF 分段与电磁干扰控制的重要性。本页显示电容间隙，未虚构电容值、屏蔽层或抗干扰性能。",textEn:"Highlights RF segmentation and electromagnetic interference control. This page shows capacitor gaps without assuming capacitor values, shielding layers or interference-suppression performance."}
];
