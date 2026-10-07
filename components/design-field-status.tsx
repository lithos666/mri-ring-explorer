"use client";
import {useMemo} from "react";
import {Button} from "@/components/ui/button";
import {useMRIModel,useBaselineMRIModel} from "@/lib/mri-context";
import {useLanguage} from "@/lib/language-context";
import {sourcesFor,fieldAt} from "@/lib/field";
import type {LiveFieldResult,LiveFieldProgress} from "@/lib/live-field";
import type {LiveStatus} from "@/lib/live-field-client";
export default function DesignFieldStatus({data,status,progress,onView}:{data:LiveFieldResult|null;status:LiveStatus;progress:LiveFieldProgress|null;onView:()=>void}){
 const {t}=useLanguage(),model=useMRIModel(),baseline=useBaselineMRIModel();
 const b=useMemo(()=>fieldAt([0,0,0],sourcesFor(model)),[model]);
 const base=useMemo(()=>fieldAt([0,0,0],sourcesFor(baseline)),[baseline]);
 const reference=Math.hypot(...base),length=Math.hypot(...b),ratio=length/reference;
 const delta=Math.hypot(...b.map((v,i)=>v-base[i]))/reference*100;
 const angle=length>reference*1e-8?Math.acos(Math.max(-1,Math.min(1,b.reduce((s,v,i)=>s+v*base[i],0)/(length*reference))))*180/Math.PI:null;
 const stage=progress?.stage==="baseline"?t("载入基准网格","Preparing baseline grid"):progress?.stage==="delta"?t("更新磁场","Updating field"):t("验证三维轨迹","Checking 3D paths");
 return <section className="design-field-status" aria-label={t("设计磁场变化","Design field change")} data-status={status} data-center-ratio={ratio} data-vector-delta={delta} data-center-vector={JSON.stringify(b.map(v=>Math.round(v*1e12)/1e12))}>
 <div className="design-field-metrics">
 <div><span title={t("中心场大小除以初始中心场","Center magnitude divided by the initial center magnitude")}><span className="feedback-label-full">{t("中心场 / 初始场","Center / initial |B|")}</span><span className="feedback-label-short">{t("中心场比","|B| / ref")}</span></span><strong>{ratio.toFixed(6)}×</strong></div>
 <div><span title={t("中心矢量变化除以初始中心场","Center vector change divided by the initial center magnitude")}><span className="feedback-label-full">{t("矢量变化 / 初始场","Vector change / initial |B|")}</span><span className="feedback-label-short">{t("矢量变化","|ΔB| / ref")}</span></span><strong>{delta.toFixed(4)}%</strong></div>
 <div><span><span className="feedback-label-full">{t("方向偏转","Direction change")}</span><span className="feedback-label-short">{t("偏转","Angle")}</span></span><strong>{angle===null?t("近零：方向未定义","Near zero: undefined"):angle.toFixed(3)+"°"}</strong></div>
 </div>
 <p className="design-field-vector" title={t("相对初始中心场的三维分量","3D components relative to the initial center field")}>B / |Bref| · (Bx, By, Bz) = ({[b[0],-b[2],b[1]].map(v=>(v/reference).toFixed(6)).join(", ")})</p>
 <div className="design-field-job" role="status"><span>{status==="ready"?t("当前设计已更新","Current design updated"):status==="error"?t("三维场计算失败，请重试或刷新；中心读数仍由解析式计算","3D field calculation failed. Retry or refresh; center readings still use the analytical formula"):stage+(progress?" · "+Math.round(progress.done/progress.total*100)+"%":"…")}</span><Button variant="outline" onClick={onView} aria-label={t("查看磁场变化","View field changes")}><span className="feedback-label-full">{t("查看磁场变化","View field changes")}</span><span className="feedback-label-short">{t("截面场图","Field slice")}</span></Button></div>
 <p className="design-field-method sr-only">{t("数值读数为有限磁块解析叠加；分母固定为此方案初始中心场。三维轨迹用网格插值与 RK4 绘制，并逐段核对方向。","Numerical readings use analytical finite-cuboid superposition and a fixed initial-center reference. 3D paths use grid interpolation and RK4, with every plotted segment checked against the analytical field.")}{data&&<> {t("绘图网格步长：","Plot grid step: ")}{(data.volume.step*(model.unitMM??1)).toFixed(1)} {model.unitMM?"mm":t("示意单位","illustrative units")}{data.quality.exactCheckMinimumAlignment!==null&&<> · cos ∠ ≥ {data.quality.exactCheckMinimumAlignment.toFixed(4)}</>}</>}</p>
 </section>;
}
