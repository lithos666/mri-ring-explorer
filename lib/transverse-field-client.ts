"use client";
import TransverseFieldWorker from "./transverse-field.worker.ts?worker";
import type {TransverseFieldRequest,TransverseFieldProgress,TransverseFieldResult} from "./transverse-field.ts";
export type TransverseStatus="idle"|"loading"|"computing"|"ready"|"error";
export type TransverseReply=TransverseFieldProgress|TransverseFieldResult|{type:"error";revision:number;schemeId:string;message:string};
/** The caller passes the last completed model only; editing draft directions never calls solve(). */
export class TransverseFieldClient {
 private worker:Worker|null=null;private revision=0;private disposed=false;private schemeId="";
 private receive:(reply:TransverseReply)=>void;
 constructor(receive:(reply:TransverseReply)=>void){this.receive=receive;}
 solve(request:Omit<TransverseFieldRequest,"type"|"revision">):number {
  if(this.disposed)throw new Error("Transverse field client is disposed.");
  this.schemeId=request.schemeId;
  if(!this.worker){
   this.worker=new TransverseFieldWorker();
   this.worker.onmessage=(event:MessageEvent<TransverseReply>)=>{if(!this.disposed&&event.data.revision===this.revision&&event.data.schemeId===this.schemeId)this.receive(event.data);};
   this.worker.onerror=event=>{if(!this.disposed)this.receive({type:"error",revision:this.revision,schemeId:this.schemeId,message:event.message||"Transverse field worker failed."});};
  }
  const revision=++this.revision;this.worker.postMessage({...request,type:"solve",revision} satisfies TransverseFieldRequest);return revision;
 }
 cancel(){this.revision++;this.worker?.postMessage({type:"cancel",revision:this.revision});}
 dispose(){this.disposed=true;this.revision++;this.worker?.terminate();this.worker=null;}
}
