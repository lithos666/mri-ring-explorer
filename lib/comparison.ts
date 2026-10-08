import {sourcesFor,fieldAt,cross,type Source,type Vec3} from "./field.ts";
import {models,type MRIModel,type SchemeId} from "./mri.ts";
import {gradientWindings,type GradientAxis,type Winding} from "./coils.ts";
export type LayoutId="baseline"|"radial"|"flip"|"spread";
export type CoilSize="standard"|"compact"|"large";
export type RFDesign="birdcage"|"saddle"|"array"|"solenoid";
export function layoutsFor(model:MRIModel){
 const spacing=model.pitchMM+" mm";
 return [
 {id:"baseline" as const,title:model.title+" · 14 环基准",short:"基准",text:"保留所选方案的磁化顺序、径向位置及 "+spacing+" 的环中心间距。"},
 {id:"radial" as const,title:"全径向对照",short:"全径向",text:"仅将 "+model.totals.axial+" 块轴向磁铁改为径向：上半部朝外、下半部朝内。总数保持 "+model.magnets.length+" 块。"},
 {id:"flip" as const,title:"轴向磁块反转",short:"轴向反转",text:"仅反转 "+model.totals.axial+" 块轴向磁铁的 N 极；其余位置和方向不变。"},
 {id:"spread" as const,title:"环间距增加 15%",short:"间距 +15%",text:"将 "+spacing+" 的环距增加 15%，其余位置、磁化方向及数量不变。"}
 ];
}
export const layouts=layoutsFor(models.latest);
export function layoutSources(id:LayoutId,model:MRIModel=models.latest):Source[]{const sources=sourcesFor(model),magnets=model.magnets;return sources.map((s,i)=>{
 const n=[...s.n] as Vec3,u=[...s.u] as Vec3,center=[...s.center] as Vec3;
 if(id==="spread")center[1]*=1.15;
 if(id==="flip"&&magnets[i].direction==="axial"){n[1]*=-1;}
 if(id==="radial"&&magnets[i].direction==="axial"){
  const m=magnets[i],sign=m.ring<=7?1:-1;
  n[0]=sign*Math.cos(m.theta);n[1]=0;n[2]=sign*Math.sin(m.theta);
  u[0]=-Math.sin(m.theta);u[1]=0;u[2]=Math.cos(m.theta);
 }
 return {...s,center,n,u,v:cross(u,n)};
});}
export const coilScales:Record<CoilSize,number>={standard:1,compact:.8,large:1.2};
export function comparisonWindings(size:CoilSize,axis:Exclude<GradientAxis,"all">,model:MRIModel=models.latest):Winding[]{
 const scale=coilScales[size];return gradientWindings(model.coilScale).filter(w=>w.axis===axis).map(w=>({...w,points:w.points.map(p=>p.map(v=>v*scale) as Vec3)}));
}
export interface ROIMetric {radius:number;samples:number;spread:number;rms:number;}
export interface LayoutResult {center:number;centerRatio:number;direction:number;metrics:ROIMetric[];profile:number[];plane:number[];}
export interface GradientResult {efficiency:number;relativeEfficiency:number;error:number;samples:number;profile:number[];}
export interface ComparisonData {model:string;schemeId:SchemeId;count:number;generationSignature:string;signature:string;layouts:Record<LayoutId,LayoutResult>;gradients:Record<CoilSize,Record<"gx"|"gy"|"gz",GradientResult>>;planeSize:number;planeBound:number;profileBound:number;gradientRadius:number;}
export function spherePoints(radius:number):Vec3[]{const pts:Vec3[]=[];for(let i=-5;i<=5;i++)for(let j=-5;j<=5;j++)for(let k=-5;k<=5;k++)if(i*i+j*j+k*k<=25)pts.push([i*radius/5,j*radius/5,k*radius/5]);return pts;}
export function roiMetric(items:Source[],radius:number):ROIMetric{
 const values=spherePoints(radius).map(p=>Math.hypot(...fieldAt(p,items))),mean=values.reduce((a,b)=>a+b)/values.length;
 return {radius,samples:values.length,spread:(Math.max(...values)-Math.min(...values))/mean*100,rms:Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/values.length)/mean*100};
}
export const GAMMA_HZ_T=42.57747892e6;
export function imagingMetrics(b0:number,gradient:number,bandwidth:number,offsetPPM:number,slew:number){
 if(![b0,gradient,bandwidth,slew].every(v=>Number.isFinite(v)&&v>0)||!Number.isFinite(offsetPPM))throw new Error("Parameters must be finite and positive");
 return {frequencyMHz:GAMMA_HZ_T*b0/1e6,pixelMM:bandwidth/(GAMMA_HZ_T*gradient/1000)*1000,offsetHz:GAMMA_HZ_T*b0*offsetPPM/1e6,shiftPixels:GAMMA_HZ_T*b0*offsetPPM/1e6/bandwidth,rampMS:gradient/slew,relativeBandwidthSNR:Math.sqrt(200/bandwidth)};
}
export function parallelSNR(r:number,g:number){if(r<1||g<1)throw new Error("R and g must be at least 1");return 1/(g*Math.sqrt(r));}
export const rfOptions=[
 {id:"birdcage" as const,title:"鸟笼 · 收发一体",tag:"当前参考",benefit:"适合围绕轴向 B₀ 产生横向体积激发；收发路径集中。",cost:"需要调谐、匹配与 T/R 切换；实际 B₁ 均匀性取决于负载与尺寸。",measure:"B₁⁺ / 翻转角图、负载 Q 值、S11、接收 SNR。"},
 {id:"saddle" as const,title:"鞍形 · 收发一体",tag:"横向 B₁",benefit:"两侧鞍形导体提供横向激发，便于比较开放方向和线圈覆盖。",cost:"导体跨度与开口影响效率、覆盖和均匀性，不能只按形状判断哪种更好。",measure:"在同一负载、体积、频率下测 B₁⁺、SNR 与匹配。"},
 {id:"array" as const,title:"体积发射 + 局部接收阵列",tag:"收发分离",benefit:"用鸟笼负责激发，贴近目标的独立接收单元提供空间敏感度差异，可支持并行成像。",cost:"需要收发退耦、单元间隔离、多路前置放大和噪声协方差标定；通道增加不保证 SNR 增加。",measure:"本图用 4 个接收回路示意；需测 B₁⁺、敏感度、噪声相关矩阵、g 因子和重建伪影。"},
 {id:"solenoid" as const,title:"同轴螺线管 · 方向对照",tag:"与当前主场不匹配",benefit:"用于说明 RF 选型必须先看 B₀ 方向；螺线管在横向主场的其他系统中可以适用。",cost:"在当前轴向 B₀ 中，同轴螺线管中心 RF 场也沿轴向，缺少有效横向激发分量。",measure:"这是方向反例，不是建议替换方案。需要改变线圈朝向或主场架构后重新适配。"}
];
export const clinicalReferences=[
 {title:"ACR · MRI 体模检验（2026 更新）",url:"https://accreditationsupport.acr.org/support/solutions/articles/11000061035-large-phantom-testing-mri-revised-12-12-19-",text:"以临床图像和体模共同评价系统；本页借鉴评价思路，不给出合格判定。"},
 {title:"Siemens · Bandwidth in MRI?",url:"https://www.magnetomworld.siemens-healthineers.com/clinical-corner/application-tips/bandwidth-mri.html",text:"带宽、像素尺寸、位移及噪声之间的关系，用于独立参数演示。"},
 {title:"Pruessmann 等 · SENSE 原始论文（1999）",url:"https://pubmed.ncbi.nlm.nih.gov/10542355/",text:"并行成像的敏感度编码原理；SNR 比值用给定 R 与 g 演示，不从通道数猜测。"},
 {title:"Feinberg 等 · NexGen 7 T（Nature Methods, 2023）",url:"https://www.nature.com/articles/s41592-023-02068-7",text:"展示梯度、冷却、RF 阵列与成像协同；该研究系统的性能不移植到本装置。"},
 {title:"Zhao 等 · 0.05 T 全身 MRI（Science, 2024）",url:"https://doi.org/10.1126/science.adm7168",text:"低场原型结合硬件、干扰处理、序列与重建；低场与高场的取舍必须结合任务验证。"},
 {title:"Liang 等 · IO Ring（2024）",url:"https://arxiv.org/html/2411.03249v1",text:"用于理解径向磁化与轴向主场；本页四种对照由当前所选用户方案派生，并非文献中的优化解。"}
];
