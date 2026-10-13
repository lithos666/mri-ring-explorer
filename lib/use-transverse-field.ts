"use client";
import {useEffect,useRef,useState} from "react";
import type {MRIModel} from "./mri";
import type {FieldSnapshot} from "./use-live-field";
import {sourcesFor,FIELD_KERNEL_VERSION} from "./field";
import {sourceSignature} from "./live-field";
import {TransverseFieldClient} from "./transverse-field-client";
import {decodeTransverseField,sameTransverseGrid,DEFAULT_TRANSVERSE_GRID,TRANSVERSE_DATA_VERSION,type TransverseFieldResult,type TransverseFieldProgress} from "./transverse-field";

interface CompletedTransverse {data:TransverseFieldResult;model:MRIModel;}
type Status="idle"|"loading"|"computing"|"ready"|"error";
const INITIAL_URL="/transverse-field-initial-latest.bin";

/** Only the last explicitly computed design is an input; draft edits never solve. */
export function useTransverseField(snapshot:FieldSnapshot|null,active:boolean){
 const [completed,setCompleted]=useState<CompletedTransverse|null>(null),[baseline,setBaseline]=useState<TransverseFieldResult|null>(null);
 const [status,setStatus]=useState<Status>("idle"),[progress,setProgress]=useState<TransverseFieldProgress|null>(null),[retryCount,setRetryCount]=useState(0);
 const initialRef=useRef<TransverseFieldResult|null>(null),completedRef=useRef<CompletedTransverse|null>(null);
 const pending=useRef<{model:MRIModel;signature:string}|null>(null),client=useRef<TransverseFieldClient|null>(null);
 useEffect(()=>{
  const solver=new TransverseFieldClient(reply=>{
   const request=pending.current;if(!request)return;
   if(reply.type==="result"){
    if(reply.sourceSignature!==request.signature||reply.schemeId!==request.model.id)return;
    const next={data:reply,model:request.model};completedRef.current=next;setCompleted(next);pending.current=null;setStatus("ready");setProgress(null);
   }else if(reply.type==="progress")setProgress(reply);
   else{pending.current=null;setStatus("error");setProgress(null);}
  });client.current=solver;
  return()=>{solver.dispose();client.current=null;pending.current=null;};
 },[]);
 useEffect(()=>{
  const solver=client.current;solver?.cancel();pending.current=null;
  if(!active||!snapshot){setStatus(completedRef.current?"ready":"idle");setProgress(null);return;}
  let cancelled=false;const controller=new AbortController();
  const current=snapshot.model,baseModel=snapshot.baseline;
  setStatus("loading");setProgress(null);
  void(async()=>{
   try{
    const [baselineSignature,signature]=await Promise.all([sourceSignature(sourcesFor(baseModel)),sourceSignature(sourcesFor(current))]);
    if(cancelled)return;
    let initial=initialRef.current;
    if(!initial){
     const response=await fetch(INITIAL_URL+"?source="+baselineSignature,{signal:controller.signal,cache:"default"});
     if(!response.ok)throw new Error("Initial transverse map is unavailable.");
     initial=decodeTransverseField(await response.arrayBuffer());
     if(initial.sourceSignature!==baselineSignature||initial.sourceCount!==baseModel.magnets.length||initial.schemeId!==baseModel.id||initial.unitMM!==baseModel.unitMM||initial.remanenceT!==baseModel.remanenceT||initial.fieldKernelVersion!==FIELD_KERNEL_VERSION||initial.generationSignature!==TRANSVERSE_DATA_VERSION||!sameTransverseGrid(initial.grid,DEFAULT_TRANSVERSE_GRID))throw new Error("Initial transverse map differs from the physical model.");
     if(cancelled)return;initialRef.current=initial;setBaseline(initial);
    }
    if(cancelled)return;
    const known=completedRef.current;
    if(signature===initial.sourceSignature||known?.data.sourceSignature===signature){
     const next={data:signature===initial.sourceSignature?initial:known!.data,model:current};completedRef.current=next;setCompleted(next);setStatus("ready");return;
    }
    if(!solver||!current.unitMM)throw new Error("Transverse field client is unavailable.");
    pending.current={model:current,signature};setStatus("computing");
    solver.solve({schemeId:current.id,current:sourcesFor(current),baseline:sourcesFor(baseModel),unitMM:current.unitMM,remanenceT:current.remanenceT,baselineAssetURL:INITIAL_URL});
   }catch{
    if(!cancelled&&!controller.signal.aborted){pending.current=null;setStatus("error");setProgress(null);}
   }
  })();
  return()=>{cancelled=true;controller.abort();solver?.cancel();pending.current=null;};
 },[snapshot,active,retryCount]);
 return {completed,baseline,status,progress,matchesSnapshot:completed?.model===snapshot?.model,retry:()=>setRetryCount(value=>value+1)};
}
