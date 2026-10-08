"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {useMRIModel,useBaselineMRIModel,useMRIDesign} from "./mri-context";
import {sameOverrides,type DirectionOverrides} from "./design";
import {sourcesFor} from "./field";
import {LiveFieldClient,type LiveStatus} from "./live-field-client";
import type {MRIModel} from "./mri";
import type {LiveFieldResult,LiveFieldProgress} from "./live-field";
export interface FieldSnapshot{model:MRIModel;baseline:MRIModel;overrides:DirectionOverrides;data:LiveFieldResult;}
interface FieldRequestSnapshot{model:MRIModel;baseline:MRIModel;overrides:DirectionOverrides;}
export function useLiveField(){
 const model=useMRIModel(),baseline=useBaselineMRIModel(),{overrides}=useMRIDesign();
 const scheme=useRef(model.id);scheme.current=model.id;
 const pending=useRef<FieldRequestSnapshot|null>(null),client=useRef<LiveFieldClient|null>(null);
 const [lastCompleted,setLastCompleted]=useState<FieldSnapshot|null>(null);
 const [status,setStatus]=useState<LiveStatus>("idle"),[progress,setProgress]=useState<LiveFieldProgress|null>(null);
 useEffect(()=>{
  const solver=new LiveFieldClient(reply=>{
   const requested=pending.current;
   if(!requested||requested.model.id!==scheme.current)return;
   if(reply.type==="result"){
    if(reply.schemeId!==requested.model.id)return;
    setLastCompleted({...requested,data:reply});pending.current=null;setStatus("ready");setProgress(null);
   }else if(reply.type==="progress")setProgress(reply);
   else {pending.current=null;setStatus("error");setProgress(null);}
  });client.current=solver;
  return ()=>{solver.dispose();client.current=null;pending.current=null;};
 },[]);
 const compute=useCallback(()=>{
  if(pending.current)return;
  const requested={model,baseline,overrides:{...overrides}};
  pending.current=requested;setStatus("computing");setProgress(null);
  try{
   if(!client.current)throw new Error("Field client is not ready.");
   client.current.solve({schemeId:model.id,baseline:sourcesFor(baseline),current:sourcesFor(model),angle:model.angularOffset,baselineAssetURL:"/live-field-baseline-"+model.id+".bin"});
  }catch{pending.current=null;setStatus("error");setProgress(null);}
 },[model,baseline,overrides]);
 const snapshot=lastCompleted?.model.id===model.id?lastCompleted:null;
 return {data:snapshot?.data??null,status,progress,lastCompleted:snapshot,needsCompute:!snapshot||!sameOverrides(overrides,snapshot.overrides),compute};
}
