import type {TransverseFieldResult} from "./transverse-field.ts";
import {TRANSVERSE_RANGES,type TransverseRangeId} from "./transverse-ranges.ts";
import type {ColorLimits,TransverseColorMode} from "./transverse-display.ts";

export type TransverseQuantity="bz"|"magnitude";
export type TransversePlotSelection="average"|number;
export interface TransverseProbeXY {x:number;y:number}
/** Owned by the lab, so changing a teaching tab or lab view does not reset it. */
export interface TransverseDisplayState {
 diameter:number;quantity:TransverseQuantity;colorMode:TransverseColorMode;
 selections:Record<TransverseRangeId,TransversePlotSelection>;
 axialOpen:Record<TransverseRangeId,boolean>;threshold:string;
 lockedLimits:Partial<Record<TransverseQuantity,ColorLimits>>;
 probe:TransverseProbeXY|null;
}
export function createInitialTransverseDisplayState():TransverseDisplayState {
 return {diameter:150,quantity:"bz",colorMode:"local",threshold:"",lockedLimits:{},probe:null,
  selections:{explore:TRANSVERSE_RANGES.explore.grid.slicesMM.indexOf(0),matlab:"average"},
  axialOpen:{explore:true,matlab:false}};
}
export function transverseMapValues(result:TransverseFieldResult,selection:TransversePlotSelection,quantity:TransverseQuantity):Float64Array {
 if(selection==="average")return quantity==="bz"?result.averageBz:result.averageMagnitude;
 if(!Number.isInteger(selection)||selection<0||selection>=result.grid.slicesMM.length)throw new Error("Invalid transverse slice.");
 const count=result.grid.n**2,offset=selection*count*3,values=new Float64Array(count);
 for(let i=0;i<count;i++)values[i]=quantity==="bz"?result.values[offset+i*3+2]:Math.hypot(result.values[offset+i*3],result.values[offset+i*3+1],result.values[offset+i*3+2]);
 return values;
}
/** These reference limits are computed from initial data only, never a draft/result. */
export function transverseLimits(result:TransverseFieldResult,quantity:TransverseQuantity,diameter:number,selection:TransversePlotSelection|"all"):ColorLimits {
 const {n,radiusMM,stepMM}=result.grid,radius2=(diameter/2)**2;
 let min=Infinity,max=-Infinity;
 const maps=selection==="all"?result.grid.slicesMM.map((_,i)=>transverseMapValues(result,i,quantity)):[transverseMapValues(result,selection,quantity)];
 for(const values of maps)for(let i=0;i<result.mask.length;i++)if(!result.mask[i]){
  const x=-radiusMM+i%n*stepMM,y=-radiusMM+Math.floor(i/n)*stepMM;
  if(x*x+y*y>radius2+1e-9)continue;
  min=Math.min(min,values[i]);max=Math.max(max,values[i]);
 }
 if(!Number.isFinite(min)||!Number.isFinite(max))throw new Error("No valid samples in the reference region.");
 return {min,max};
}
export function initialTransverseDetailLimits(result:TransverseFieldResult,quantity:TransverseQuantity):ColorLimits {
 const z0=result.grid.slicesMM.indexOf(0);if(z0<0)throw new Error("The initial color reference requires Z=0.");
 return transverseLimits(result,quantity,150,z0);
}
/** Read the current completed map at a persistent coordinate; FOV is only a label. */
export function transverseProbeSample(result:TransverseFieldResult,values:Float64Array,probe:TransverseProbeXY,diameter:number):{x:number;y:number;value:number;outsideROI:boolean}|null {
 const {n,radiusMM,stepMM}=result.grid;
 const col=Math.round((probe.x+radiusMM)/stepMM),row=Math.round((probe.y+radiusMM)/stepMM);
 if(col<0||col>=n||row<0||row>=n)return null;
 const x=-radiusMM+col*stepMM,y=-radiusMM+row*stepMM,index=row*n+col;
 if(Math.abs(x-probe.x)>1e-9||Math.abs(y-probe.y)>1e-9||result.mask[index]||!Number.isFinite(values[index]))return null;
 return {x,y,value:values[index],outsideROI:x*x+y*y>(diameter/2)**2+1e-9};
}
