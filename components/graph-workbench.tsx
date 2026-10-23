"use client";
import DesignDiagram,{type DiagramView} from "./design-diagram";
import DesignFieldStatus from "./design-field-status";
import {FieldSection} from "./field-view";
import {useLanguage} from "@/lib/language-context";
import type {LiveFieldProgress} from "@/lib/live-field";
import type {LiveStatus} from "@/lib/live-field-client";
import type {FieldSnapshot} from "@/lib/use-live-field";
import type {EditScope} from "@/lib/design";
interface Props{ring:number;selected:string|null;scope:EditScope;mode:DiagramView;onMode:(mode:DiagramView)=>void;onSelect:(id:string)=>void;onRing:(ring:number)=>void;reset:number;status:LiveStatus;progress:LiveFieldProgress|null;lastCompleted:FieldSnapshot|null;needsCompute:boolean;}
export default function GraphWorkbench(props:Props){
 const {t}=useLanguage(),snapshot=props.lastCompleted;
 const state=props.status==="loading"?t("载入初始场…","Loading initial field…"):props.status==="computing"?t("计算中","Computing")+(props.progress?" · "+Math.round(props.progress.done/props.progress.total*100)+"%":"…"):props.status==="error"?t("计算失败 · 保留上次结果","Calculation failed · Previous result retained"):!snapshot?t("点击「计算磁场」开始","Click Compute field to start"):props.needsCompute?t("上次结果 · 修改待计算","Previous result · Draft not computed"):snapshot.data.revision===0?t("初始排布磁场","Initial layout field"):t("已计算结果","Computed result");
 return <div className={"graph-workspace"+(!snapshot?" has-no-field":"")}>
  <div className="graph-edit-pane"><DesignDiagram {...props}/></div>
  <section className={"graph-field-pane"+(props.needsCompute&&snapshot?" is-stale":"")} aria-label={t("完整阵列磁场","Full-array field")} data-snapshot-state={snapshot?props.needsCompute?"previous":"current":"empty"}>
   <div className="graph-pane-heading"><strong>{t("磁场","Field")}</strong><span>{t("全 14 层","All 14 layers")}</span></div>
   <DesignFieldStatus quiet data={snapshot?.data??null} status={props.status} progress={props.progress} needsCompute={props.needsCompute}/>
   <p className="field-snapshot-label" role="status">{state}</p>
   {snapshot?<FieldSection compact key={snapshot.model.id} data={snapshot.data} displayModel={snapshot.model} readOnly={props.status==="computing"} onSelect={props.onSelect}/>:<div className="graph-field-placeholder">{t("方向修改不会自动计算。","Orientation edits do not compute automatically.")}</div>}
  </section>
 </div>;
}
