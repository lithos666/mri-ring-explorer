"use client";
import {useMemo,useState} from "react";
import {Button} from "@/components/ui/button";
import {directionNames,type ViewMode,type MRIModel} from "@/lib/mri";
import {useMRIModel,useBaselineMRIModel} from "@/lib/mri-context";
import {useLanguage,directionEnglish} from "@/lib/language-context";
import {fieldAt,nearMagnet,sourcesFor,type Vec3} from "@/lib/field";
import {planePoint,planeComponents,type LiveFieldResult} from "@/lib/live-field";
const magnitude=(b:Vec3)=>Math.hypot(...b);
function heatColor(r:number){const v=Math.max(0,Math.min(2,r));return v<1?"rgb("+Math.round(43+202*v)+","+Math.round(113+132*v)+",245)":"rgb(245,"+Math.round(245-164*(v-1))+","+Math.round(245-172*(v-1))+")";}
export function FieldSection({data,onSelect,compact=false,displayModel,readOnly=false}:{data:LiveFieldResult|null;onSelect:(id:string)=>void;compact?:boolean;displayModel?:MRIModel;readOnly?:boolean}){
 const {t}=useLanguage(),contextModel=useMRIModel(),baseline=useBaselineMRIModel(); const model=displayModel??contextModel;
 const [point,setPoint]=useState<[number,number]>([0,0]),[surface,setSurface]=useState(false);
 const sources=useMemo(()=>sourcesFor(model),[model]),baseSources=useMemo(()=>sourcesFor(baseline),[baseline]);
 const angle=model.angularOffset,scale=16,size=model.blockSize*scale,units=model.unitMM??1;
 const world=planePoint(point[0],point[1],angle),b=useMemo(()=>data?fieldAt(world,sources):[0,0,0] as Vec3,[data,sources,point[0],point[1],angle]),baseB=useMemo(()=>data?fieldAt(world,baseSources):[0,0,0] as Vec3,[data,baseSources,point[0],point[1],angle]);
 const projected=planeComponents(b,angle),length=magnitude(b),reference=data?.referenceMagnitude??1;
 const relative=length/reference,delta=magnitude([b[0]-baseB[0],b[1]-baseB[1],b[2]-baseB[2]])/reference*100;
 const perpendicular=length>reference*1e-8?Math.abs(projected[2])/length*100:0;
 const section=model.magnets.filter(m=>m.sector===1||m.sector===model.repeats/2+1);
 function probe(p:[number,number]){if(nearMagnet(planePoint(p[0],p[1],angle),.12,sources)){setSurface(true);return;}setPoint(p);setSurface(false);}
 if(!data)return <div className="scene-message">{t("点击「计算磁场」以计算此排布。","Click Compute field to calculate this design.")}</div>;
 const pixels=[];
 const arrows=[];
 for(let row=0;row<data.plane.n;row++)for(let col=0;col<data.plane.n;col++){
  const i=row*data.plane.n+col;if(data.plane.mask[i])continue;
  const v:Vec3=[data.plane.values[i*3],data.plane.values[i*3+1],data.plane.values[i*3+2]],comp=planeComponents(v,angle),norm=magnitude(v);
  const x=(-data.plane.bound+col*data.plane.step)*scale,y=-(-data.plane.bound+row*data.plane.step)*scale;
  pixels.push(<rect key={i} x={x-data.plane.step*scale/2} y={y-data.plane.step*scale/2} width={data.plane.step*scale+.1} height={data.plane.step*scale+.1} fill={heatColor(norm/reference)} opacity=".55"/>);
  if(row%5===0&&col%5===0&&norm>reference*1e-8){
   const planar=Math.hypot(comp[0],comp[1]);
   arrows.push(planar/norm>.05?<line key={i} x1={x-comp[0]/norm*5} y1={y+comp[1]/norm*5} x2={x+comp[0]/norm*5} y2={y-comp[1]/norm*5} stroke="#255a44" strokeWidth=".9" markerEnd="url(#live-b-arrow)"/>:<text key={i} x={x} y={y+3} fontSize="10" textAnchor="middle" fill="#255a44">{comp[2]>0?"⊙":"⊗"}</text>);
  }
 }
 const px=point[0]*scale,py=-point[1]*scale;
 return <div className={"field-section"+(compact?" field-compact":"")}>
 <div className="field-projection-note">{t("截面场强与 B 矢量投影 · 虚线为三维轨迹投影，不是平面磁感线","Slice magnitude and projected B vectors · Dashed curves are projections of 3D paths, not planar field lines")}</div>
 <svg viewBox="-215 -218 430 450" aria-label={t("已计算排布的磁场截面。点击空气区域，读取三维磁场及截面外分量。","Field slice of the computed layout. Click an air region to read the 3D field and its out-of-plane component.")} onClick={e=>{if(readOnly)return;const svg=e.currentTarget,p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const matrix=svg.getScreenCTM();if(!matrix)return;const c=p.matrixTransform(matrix.inverse());if(Math.abs(c.x)<=192&&Math.abs(c.y)<=192)probe([c.x/scale,-c.y/scale]);}}>
 <defs><marker id="live-b-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0L5 2.5L0 5" fill="#255a44"/></marker><marker id="live-probe-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0L5 2.5L0 5" fill="#1d1d1f"/></marker><clipPath id="live-map-clip"><rect x="-192" y="-192" width="384" height="384"/></clipPath></defs>
 <rect x="-192" y="-192" width="384" height="384" fill="#fff" stroke="#d2d8de"/>
 <g clipPath="url(#live-map-clip)">{pixels}
 {data.lines3D.map((line,i)=><polyline key={i} points={line.map(p=>{const c=planeComponents(p,angle);return c[0]*scale+","+(-c[1]*scale);}).join(" ")} fill="none" stroke="#7e8790" strokeWidth=".8" strokeDasharray="3 4" opacity=".55"/>)}
 {arrows}</g>
 {[-10,-5,0,5,10].map(v=><g key={v}><line x1={v*scale} x2={v*scale} y1="-192" y2="192" stroke="#8f969f" opacity=".3" strokeDasharray="2 5"/><line y1={v*scale} y2={v*scale} x1="-192" x2="192" stroke="#8f969f" opacity=".3" strokeDasharray="2 5"/><text x={v*scale} y="210" fill="#59636f" textAnchor="middle" fontSize="12">{v*units}</text></g>)}
 <text x="-184" y="-201" fill="#59636f" fontSize="12">{t("R01 端 ↑ · 设备 Z 轴 ↑","R01 end ↑ · Device Z axis ↑")}</text>
 {section.map(m=>{
  const x=(m.sector===1?m.radius:-m.radius)*scale,y=-model.ringY(m.ring)*scale,n=planeComponents(m.normal,angle),planar=Math.hypot(n[0],n[1]),rotation=Math.atan2(-n[1],n[0])*180/Math.PI,label=m.id+" · "+t(directionNames[m.direction],directionEnglish[m.direction]);
  return <g key={m.id} className="field-magnet" role="button" tabIndex={readOnly?-1:0} aria-disabled={readOnly} aria-label={label} onClick={e=>{e.stopPropagation();if(!readOnly)onSelect(m.id);}} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();if(!readOnly)onSelect(m.id);}}} transform={"translate("+x+" "+y+") rotate("+(planar>.1?rotation:0)+")"}><title>{label}</title>
   <rect x={-size/2} y={-size/2} width={size} height={size} fill={planar>.1?"#fff":n[2]>0?"#e03d34":"#0071e3"} stroke="#505761" strokeWidth=".5"/>
   {planar>.1?<><rect x={-size/2} y={-size/2} width={size*.2} height={size} fill="#0071e3"/><rect x={size*.3} y={-size/2} width={size*.2} height={size} fill="#e03d34"/><line x1={-size*.2} x2={size*.25} y1="0" y2="0" stroke="#1d1d1f" strokeWidth=".6" markerEnd="url(#live-probe-arrow)"/></>:<text x="0" y={size*.28} fontSize={size*.85} fill="#fff" textAnchor="middle">{n[2]>0?"⊙":"⊗"}</text>}
  </g>;
 })}
 <g pointerEvents="none"><circle cx={px} cy={py} r="5" fill="#fff" stroke="#1d1d1f" strokeWidth="1.5"/>{length>reference*1e-8&&<line x1={px} y1={py} x2={px+projected[0]/length*25} y2={py-projected[1]/length*25} stroke="#1d1d1f" strokeWidth="1.4" markerEnd="url(#live-probe-arrow)"/>}</g>
 <text x="0" y="226" fill="#59636f" fontSize="12" textAnchor="middle">X′ / {model.unitMM?t("mm（估读）","mm (estimated)"):t("示意单位","schematic units")} · {t("R14 端在下","R14 end below")}</text>
 </svg>
 <div className="field-map-legend"><span>0</span><i/><span>1</span><i/><span>≥ 2 · |B| / |Bref|</span></div>
 <div className="probe-readout" aria-live="polite" data-probe-vector={JSON.stringify(b)}>
 <div><span>{t("取点","Probe")} · X′ {(point[0]*units).toFixed(1)} / Z {(point[1]*units).toFixed(1)}</span><strong>|B| / |Bref| = {relative.toFixed(6)}</strong><small>{t("截面外分量占 |B|：","Out-of-plane component / |B|: ")}{perpendicular.toFixed(3)}% · {projected[2]>=0?"⊙":"⊗"}</small><details className="probe-components"><summary>{t("探针分量","Probe components")}</summary><small>{t("相对初始场的矢量变化：","Vector change from initial field: ")}{delta.toFixed(4)}%</small><small>(Bx, By, Bz) / |Bref| = ({[b[0],-b[2],b[1]].map(v=>(v/reference).toFixed(6)).join(", ")})</small></details>{length<=reference*1e-8&&<small>{t("近零场：方向未定义","Near-zero field: direction undefined")}</small>}</div>
 <div className="probe-buttons"><Button variant="ghost" disabled={readOnly} onClick={()=>probe([0,0])}>{t("中心","Center")}</Button><Button variant="ghost" disabled={readOnly} onClick={()=>probe([0,6])}>{t("轴上","On axis")}</Button><Button variant="ghost" disabled={readOnly} onClick={()=>probe([2.5,0])}>{t("孔内侧","Inside bore")}</Button></div>
 {surface&&<p>{t("此处靠近磁体表面，请在通孔或外部空气中取点。","This point is near a magnet surface. Probe in the bore or surrounding air.")}</p>}
 </div>
 <p className="field-projection-note">{t("⊙ 表示指向截面外，⊗ 表示指向截面内。探针使用全部磁铁的解析场；热图是网格采样，色标固定以便比较修改前后。","⊙ points out of the slice; ⊗ points into it. Probes use the analytical field from all magnets. The heatmap is sampled on a grid, with a fixed scale for comparison.")}</p>
 </div>;
}
export function FieldExplanation({data,mode}:{data:LiveFieldResult|null;mode:ViewMode}){
 const {t}=useLanguage(),model=useMRIModel();
 if(!data)return null;
 const max=Math.max(1.15,...data.profile.map(p=>p.relative))*1.08,y=(v:number)=>85-v/max*66;
 return <section className="physics-panel" aria-label={t("已计算磁场说明","Computed field explanation")}>
 <div className="physics-top"><span className="field-dot"/>{t("有限磁块 · 已计算合场","Finite cuboids · Computed field")}<span>{model.magnets.length} · {t("等磁化强度","Equal magnetization")}</span></div>
 <div className="physics-grid"><div><h3>{t("完整三维计算结果","Full 3D calculation result")}</h3><p>{t("磁铁上的 M 箭头表示内部 S → N 磁化方向；绿色 B 箭头表示当前位置的合磁场，两者不必一致。修改单块磁铁后不再强制对称，其他磁铁不会跟随翻转。","M arrows on magnets show internal S → N magnetization. Green B arrows show the total local field. They need not agree. Individual edits do not force symmetry or rotate other magnets.")}</p><p>{t("空气中按有限磁块解析场线性叠加。三维轨迹沿完整 B 矢量积分，在表面、绘图边界和精度不足处截断；截断不是磁场终点。","Air-region fields use analytical finite-cuboid superposition. 3D paths follow the full B vector and are clipped at surfaces, plot boundaries, and where numerical accuracy is insufficient. Clipping is not a physical endpoint.")}</p></div>
 <div className="profile-card"><h3>{t("设备轴上的相对场强","Relative magnitude along the device axis")}</h3><svg viewBox="0 0 270 112" role="img" aria-label={t("已计算轴线场强除以初始中心场，未代表已验证均匀成像区","Computed axial field magnitude divided by the initial center magnitude. This is not a validated uniform imaging region.")}><line x1="25" x2="252" y1={y(1)} y2={y(1)} stroke="#596c7b" strokeDasharray="3 3"/><text x="4" y={y(1)+4} fill="#626973" fontSize="12">1</text><line x1="25" x2="252" y1="85" y2="85" stroke="#4a6374"/><path d={data.profile.map((p,i)=>(i?"L":"M")+(25+(p.p[1]+10)/20*227).toFixed(2)+","+y(p.relative).toFixed(2)).join(" ")} stroke="#32784f" strokeWidth="2" fill="none"/><text x="25" y="105" fill="#626973" fontSize="12">{t("R14 端","R14 end")}</text><text x="138" y="105" textAnchor="middle" fill="#626973" fontSize="12">{t("中心","Center")}</text><text x="252" y="105" textAnchor="end" fill="#626973" fontSize="12">{t("R01 端","R01 end")}</text></svg><p>|B| / |Bref| · {t("参考值为当前方案初始中心场，修改后仍固定。","The reference is the selected scheme's initial center field and remains fixed after edits.")}</p></div></div>
 <div className="field-assumption">{t("假设磁块均匀磁化、磁化强度固定，空气与磁体回线磁导率近似 1；未模拟材料退磁、铁磁外壳、磁体之间的磁化反馈或临床成像性能。Weak / Normal / Strong 仅为标签。","Assumes uniform, fixed magnetization and air and magnet recoil permeability approximately 1. Material demagnetization, ferromagnetic housing, magnetization feedback, and clinical imaging performance are not simulated. Weak / Normal / Strong are labels only.")} {mode==="field"?t("本图为投影，请同时查看截面外分量。","This is a projection; check the out-of-plane component as well."):t("轨迹为三维，不复制假定的对称平面。","Paths are three-dimensional and do not copy assumed symmetry planes.")} <a href="https://magpylib.readthedocs.io/en/latest/_pages/user_guide/guide_resources_01_physics.html" target="_blank" rel="noreferrer">{t("解析模型依据 ↗","Analytical model reference ↗")}</a></div>
 </section>;
}
