"use client";
import {Button} from "@/components/ui/button";
import {useLanguage} from "@/lib/language-context";
import type {LiveFieldResult,LiveFieldProgress} from "@/lib/live-field";
import type {LiveStatus} from "@/lib/live-field-client";
export default function DesignFieldStatus({data,status,progress,needsCompute,quiet=false,onView}:{data:LiveFieldResult|null;status:LiveStatus;progress:LiveFieldProgress|null;needsCompute:boolean;quiet?:boolean;onView?:()=>void}){
 const {t}=useLanguage(),b=data?.center,reference=data?.referenceMagnitude??1;
 const delta=data?Math.hypot(...data.center.map((v,i)=>v-data.baselineCenter[i]))/reference*100:null;
 const angle=data?.centerAngleDegrees;
 const message=status==="loading"?t("载入初始场…","Loading initial field…"):status==="computing"?t("计算中","Computing")+(progress?" · "+Math.round(progress.done/progress.total*100)+"%":"…"):status==="error"?t("计算失败，请重试","Calculation failed; retry"):!data?t("尚未计算","Not computed"):needsCompute?t("修改待计算","Draft changes · Compute again"):data.revision===0?t("初始场","Initial field"):t("已计算","Computed");
 return <section className="design-field-status" aria-label={t("已计算磁场","Computed field")} data-status={status} data-needs-compute={needsCompute} data-center-ratio={data?.centerRatio??""} data-vector-delta={delta??""} data-center-vector={b?JSON.stringify(b):""}>
  <div className="design-field-metrics">
   <div><span title={t("中心场大小除以此方案初始中心场","Center magnitude divided by the scheme's initial center magnitude")}>{t("中心场比","Center ratio")}</span><strong>{data?data.centerRatio.toFixed(4)+"×":"—"}</strong></div>
   <div><span title={t("中心矢量变化除以初始中心场","Center vector change divided by the initial center magnitude")}>ΔB / ref</span><strong>{delta!==null?delta.toFixed(2)+"%":"—"}</strong></div>
   <div><span title={t("中心磁场相对初始场的偏转","Center field angle from the initial field")}>{t("偏转","Angle")}</span><strong title={data&&angle===null?t("近零场，方向未定义","Near-zero field; direction undefined"):undefined}>{angle!=null?angle.toFixed(2)+"°":"—"}</strong></div>
  </div>
  {!quiet&&<div className="design-field-job" role="status"><span>{message}</span>{onView&&data&&<Button variant="outline" onClick={onView}>{t("查看场图","View field")}</Button>}</div>}
 </section>;
}
