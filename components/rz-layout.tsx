"use client";
import {ringName,directionNames,directionColors} from "@/lib/mri";
import {useMRIModel} from "@/lib/mri-context";
import {useLanguage,directionEnglish} from "@/lib/language-context";
interface Props {ring:number;selected:string|null;onSelect:(id:string)=>void;twoSides?:boolean;}
export default function RZLayout({ring,selected,onSelect,twoSides=false}:Props){
 const {t}=useLanguage();
 const model=useMRIModel(),rings=model.rings;
 const modelTitle=t(model.title,model.id==="latest"?"New configuration":"Original configuration");
 const dimensionNote=t(model.dimensionNote,model.dimensionNoteEn);
 const direction=(d:keyof typeof directionNames)=>t(directionNames[d],directionEnglish[d]);
 const latest=model.unitMM!==null,scale=latest?.82:29,offsetX=twoSides?0:-90;
 const radius=(r:typeof rings[number],i:number)=>latest?r.radiiMM[i]:r.radii[i];
 const axial=(r:typeof rings[number])=>latest?r.zMM:model.ringY(r.id);
 const opposite=model.repeats/2+1;
 const BLOCK_SIZE_MM=latest?model.blockSizeMM!:model.blockSize;
 const x=(radius:number,side=1)=>radius*side*scale+offsetX;
 const y=(z:number)=>-z*scale;
 const sides=twoSides?[1,-1]:[1];
 const start=twoSides?(latest?-186:-253):8,end=twoSides?(latest?186:253):(latest?80:150);
 const viewBox=twoSides?(latest?"-222 -245 444 490":"-285 -266 570 532"):"-30 -245 250 490";
 return <div className={"rz-view "+(twoSides?"rz-two-sides":"")}>
 <svg viewBox={viewBox} role="img" aria-label={modelTitle+(twoSides?t("中心轴剖面，"+model.radialPositionCount*2+"个位置"," longitudinal section, "+model.radialPositionCount*2+" positions"):t("R–Z排布，"+model.radialPositionCount+"个径向位置"," R–Z layout, "+model.radialPositionCount+" radial positions"))}>
 <defs><marker id={twoSides?"rz-arrow-both":"rz-arrow"} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L6 3L0 6" fill="#1d1d1f"/></marker></defs>
 {twoSides&&<rect x="-95" y="-216" width="190" height="432" fill="#f5f5f7" rx="5"/>}
 {(latest?[-250,-200,-150,-100,-50,0,50,100,150,200,250]:[-8,-4,0,4,8]).map(z=><g key={z}><line x1={start} x2={end} y1={y(z)} y2={y(z)} stroke={z===0?"#afb9c1":"#e0e4e8"} strokeDasharray={z===0?"5 4":"2 5"}/><text x={twoSides?(latest?-210:-276):0} y={y(z)+4} fontSize="10" fill="#65707a" textAnchor={twoSides?"middle":"end"}>{z}</text></g>)}
 {!twoSides&&(latest?[120,150,180]:[4,6,8]).map(r=><g key={r}><line x1={x(r)} x2={x(r)} y1="-216" y2="216" stroke="#e0e4e8" strokeDasharray="2 5"/><text x={x(r)} y="226" fontSize="10" fill="#65707a" textAnchor="middle">{r}</text></g>)}
 {twoSides&&<line x1="0" x2="0" y1="-216" y2="216" stroke="#afb9c1" strokeDasharray="5 4"/>}
 {rings.map(r=><g key={r.id}>{r.id===ring&&<rect x={twoSides?(latest?-190:-253):9} y={y(axial(r))-12} width={twoSides?(latest?380:506):151} height="24" fill="#6fe0d312" stroke="#6fe0d340" rx="3"/>}
 <text x={twoSides?(latest?198:257):175} y={y(axial(r))+4} fontSize="11" fill={r.id===ring?"#0071e3":"#65707a"}>{ringName(r.id)}</text>
 {sides.flatMap(side=>r.directions.map((_,i)=>{
  const id=ringName(r.id)+"-L"+(i+1)+"-A"+String(side===1?1:opposite).padStart(2,"0");
  const centerX=x(radius(r,i),side),centerY=y(axial(r)),size=BLOCK_SIZE_MM*scale;
  const m=model.magnetById.get(id)!,d=m.direction;
  const n=m.normal,nx=n[0]*Math.cos(model.angularOffset)+n[2]*Math.sin(model.angularOffset),up=-n[1],perp=-n[0]*Math.sin(model.angularOffset)+n[2]*Math.cos(model.angularOffset),planar=Math.hypot(nx,up),angle=planar>.1?Math.atan2(up,nx)*180/Math.PI:0;
  return <g key={id} tabIndex={0} role="button" aria-label={id+" "+direction(d)} onClick={()=>onSelect(id)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onSelect(id);}}} className="rz-magnet">
  <title>{id+" · "+direction(d)+" · R="+radius(r,i)+(latest?" mm":t(" 示意单位"," schematic units"))+" · Z="+axial(r)+(latest?" mm":t(" 示意单位"," schematic units"))}</title>
  <g transform={"translate("+centerX+" "+centerY+") rotate("+angle+")"}>
  <rect x={-size/2} y={-size/2} width={size} height={size} rx=".6" fill="#fff" stroke={selected===id?"#ffe093":directionColors[d]} strokeWidth={selected===id?1.8:.7}/>
  {planar>.1?<><rect x={-size/2+.7} y={-size/2+.7} width={size*.18} height={size-1.4} fill="#0071e3"/>
  <rect x={size/2-size*.18-.7} y={-size/2+.7} width={size*.18} height={size-1.4} fill="#e03d34"/>
  <line x1={-size*.2} x2={size*.3} y1="0" y2="0" stroke="#1d1d1f" strokeWidth=".9" markerEnd={"url(#"+(twoSides?"rz-arrow-both":"rz-arrow")+")"}/></>:<><rect x={-size/2+.7} y={-size/2+.7} width={size-1.4} height={size-1.4} fill={perp>0?"#e03d34":"#0071e3"}/><text x="0" y={size*.29} textAnchor="middle" fontSize={size*.85} fill="#fff">{perp>0?"⊙":"⊗"}</text></>}
  </g></g>;
 }))}
 </g>)}
 <text x={twoSides?0:110} y="-228" fontSize="12" fill="#33383e" textAnchor="middle">{twoSides?t("中心轴剖面 · 列1 / "+opposite,"Longitudinal section · Columns 1 / "+opposite):t("R–Z · 由内圈到外圈","R–Z · Inner to outer")}</text>
 <text x={twoSides?(latest?-210:-276):-22} y="-225" fontSize="10" fill="#65707a">Z / {latest?"mm":t("示意","a.u.")}</text>
 <text x={twoSides?0:100} y="241" fontSize="11" fill="#65707a" textAnchor="middle">{twoSides?t("Z=0 参考面 · 显示实际列方向","Z=0 reference plane · Actual column directions"):(latest?t("R / mm · MATLAB 中心坐标","R / mm · MATLAB centers"):t("R / 示意单位","R / schematic units"))}</text>
 </svg>
 <p className="rz-caption">{twoSides?t("左右两侧属于同一圆环，不额外翻倍。","Both sides belong to the same layer; they are not counted twice."):t("每层圆周 "+model.repeats+" 列"+(model.repeatsConfirmed?"（已确认）":"（暂定）")+"；共 "+model.radialPositionCount+" 个径向位置。",model.repeats+" circumferential columns per layer ("+(model.repeatsConfirmed?"confirmed":"provisional")+"); "+model.radialPositionCount+" radial positions in total.")} {dimensionNote} {t("⊙：N 指向截面外；⊗：N 指向截面内。","⊙: N points out of the slice; ⊗: N points into it.")}</p>
 </div>;
}
