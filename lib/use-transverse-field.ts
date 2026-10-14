"use client";
import {useEffect,useRef,useState} from "react";
import type {MRIModel} from "./mri";
import type {FieldSnapshot} from "./use-live-field";
import {sourcesFor,FIELD_KERNEL_VERSION} from "./field";
import {sourceSignature} from "./live-field";
import {TransverseFieldClient} from "./transverse-field-client";
import {decodeTransverseField,sameTransverseGrid,type TransverseFieldResult,type TransverseFieldProgress} from "./transverse-field";
import {TRANSVERSE_RANGES,type TransverseRangeId} from "./transverse-ranges";

interface CompletedTransverse {data:TransverseFieldResult;model:MRIModel;}
type Status="idle"|"loading"|"computing"|"ready"|"error";

/** Only the last explicitly computed design is an input; draft edits never solve. */
export function useTransverseField(snapshot:FieldSnapshot|null,active:boolean,rangeId:TransverseRangeId="explore"){
 const [results,setResults]=useState<Partial<Record<TransverseRangeId,CompletedTransverse>>>({});
 const [baselines,setBaselines]=useState<Partial<Record<TransverseRangeId,TransverseFieldResult>>>({});
 const [state,setState]=useState<{rangeId:TransverseRangeId;status:Status}>({rangeId,status:"idle"});
 const [progressState,setProgress]=useState<{rangeId:TransverseRangeId;value:TransverseFieldProgress}|null>(null),[retryCount,setRetryCount]=useState(0);
 const initialRef=useRef(new Map<TransverseRangeId,TransverseFieldResult>()),completedRef=useRef(new Map<TransverseRangeId,CompletedTransverse>());
 const pending=useRef<{model:MRIModel;signature:string;rangeId:TransverseRangeId}|null>(null),client=useRef<TransverseFieldClient|null>(null);
 useEffect(()=>{
  const solver=new TransverseFieldClient(reply=>{
   const request=pending.current;if(!request)return;
   if(reply.type==="result"){
    const config=TRANSVERSE_RANGES[request.rangeId];
    if(reply.sourceSignature!==request.signature||reply.schemeId!==request.model.id||reply.generationSignature!==config.generationSignature||!sameTransverseGrid(reply.grid,config.grid))return;
    const next={data:reply,model:request.model};completedRef.current.set(request.rangeId,next);setResults(previous=>({...previous,[request.rangeId]:next}));pending.current=null;setState({rangeId:request.rangeId,status:"ready"});setProgress(null);
   }else if(reply.type==="progress")setProgress({rangeId:request.rangeId,value:reply});
   else{pending.current=null;setState({rangeId:request.rangeId,status:"error"});setProgress(null);}
  });client.current=solver;
  return()=>{solver.dispose();client.current=null;pending.current=null;};
 },[]);
 useEffect(()=>{
  const solver=client.current;solver?.cancel();pending.current=null;
  if(!active||!snapshot){setState({rangeId,status:completedRef.current.has(rangeId)?"ready":"idle"});setProgress(null);return;}
  let cancelled=false;const controller=new AbortController();
  const current=snapshot.model,baseModel=snapshot.baseline,config=TRANSVERSE_RANGES[rangeId];
  setState({rangeId,status:"loading"});setProgress(null);
  void(async()=>{
   try{
    const [baselineSignature,signature]=await Promise.all([sourceSignature(sourcesFor(baseModel)),sourceSignature(sourcesFor(current))]);
    if(cancelled)return;
    async function loadInitial(id:TransverseRangeId){
     let initial=initialRef.current.get(id);
     if(initial)return initial;
     const target=TRANSVERSE_RANGES[id];
     const response=await fetch(target.assetURL+"?source="+baselineSignature,{signal:controller.signal,cache:"default"});
     if(!response.ok)throw new Error("Initial transverse map is unavailable.");
     initial=decodeTransverseField(await response.arrayBuffer());
     if(initial.sourceSignature!==baselineSignature||initial.sourceCount!==baseModel.magnets.length||initial.schemeId!==baseModel.id||initial.unitMM!==baseModel.unitMM||initial.remanenceT!==baseModel.remanenceT||initial.fieldKernelVersion!==FIELD_KERNEL_VERSION||initial.generationSignature!==target.generationSignature||!sameTransverseGrid(initial.grid,target.grid))throw new Error("Initial transverse map differs from the physical model.");
     if(!cancelled){initialRef.current.set(id,initial);setBaselines(previous=>({...previous,[id]:initial!}));}
     return initial;
    }
    // Both display modes use immutable reference data. MATLAB mode needs the
    // nine-plane reference too; changing FOV must never redefine its limits.
    const [initial]=await Promise.all(rangeId==="explore"?[loadInitial(rangeId)]:[loadInitial(rangeId),loadInitial("explore")]);
    if(cancelled)return;
    const known=completedRef.current.get(rangeId);
    if(signature===initial.sourceSignature||known?.data.sourceSignature===signature){
     const next={data:signature===initial.sourceSignature?initial:known!.data,model:current};completedRef.current.set(rangeId,next);setResults(previous=>({...previous,[rangeId]:next}));setState({rangeId,status:"ready"});return;
    }
    if(!solver||!current.unitMM)throw new Error("Transverse field client is unavailable.");
    pending.current={model:current,signature,rangeId};setState({rangeId,status:"computing"});
    solver.solve({schemeId:current.id,current:sourcesFor(current),baseline:sourcesFor(baseModel),unitMM:current.unitMM,remanenceT:current.remanenceT,spec:config.grid,generationSignature:config.generationSignature,baselineAssetURL:config.assetURL});
   }catch{
    if(!cancelled&&!controller.signal.aborted){pending.current=null;setState({rangeId,status:"error"});setProgress(null);}
   }
  })();
  return()=>{cancelled=true;controller.abort();solver?.cancel();pending.current=null;};
 },[snapshot,active,rangeId,retryCount]);
 const completed=results[rangeId]??null,baseline=baselines[rangeId]??null,status=state.rangeId===rangeId?state.status:"idle";
 return {completed,baseline,baselineWide:baselines.explore??null,status,progress:progressState?.rangeId===rangeId?progressState.value:null,matchesSnapshot:completed?.model===snapshot?.model,retry:()=>setRetryCount(value=>value+1)};
}
