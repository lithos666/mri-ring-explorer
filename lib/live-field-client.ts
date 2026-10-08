"use client";
// No worker starts at import time or during server rendering.
import FieldWorker from "./live-field.worker.ts?worker";
import type {LiveFieldRequest,LiveFieldResult,LiveFieldProgress} from "./live-field.ts";
export type LiveStatus="idle"|"loading"|"computing"|"ready"|"error";
export type LiveReply=LiveFieldProgress|LiveFieldResult|{type:"error";revision:number;schemeId:string;message:string};
export class LiveFieldClient {
 private worker:Worker|null=null;private revision=0;private disposed=false;
 private receive:(reply:LiveReply)=>void;
 constructor(receive:(reply:LiveReply)=>void){this.receive=receive;}
 solve(request:Omit<LiveFieldRequest,"type"|"revision">):number {
  if(this.disposed)throw new Error("Live-field client was disposed.");
  if(!this.worker){
   this.worker=new FieldWorker();
   this.worker.onmessage=(event:MessageEvent<LiveReply>)=>{
    if(!this.disposed&&event.data.revision===this.revision)this.receive(event.data);
   };
   this.worker.onerror=event=>{
    if(!this.disposed)this.receive({type:"error",revision:this.revision,schemeId:request.schemeId,message:event.message||"Field worker failed."});
   };
  }
  const revision=++this.revision;
  this.worker.postMessage({...request,type:"solve",revision} satisfies LiveFieldRequest);
  return revision;
 }
 cancel(){
  this.revision++;this.worker?.postMessage({type:"cancel",revision:this.revision});
 }
 dispose(){this.disposed=true;this.revision++;this.worker?.terminate();this.worker=null;}
}
// Root's React hook should own one LiveFieldClient per mounted active-scheme editor.
// Clear stale "ready" state immediately before solve, keep old imagery under a visible
// "previous result / recalculating" label, and accept result only at returned revision.
// Exact probe reads may be cheap enough on main thread via fieldAt, but worker results
// already accept requested probes. Debounce drag controls; presets generally need none.
