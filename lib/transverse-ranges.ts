import {DEFAULT_TRANSVERSE_GRID,TRANSVERSE_DATA_VERSION,type TransverseGridSpec} from "./transverse-field.ts";

export type TransverseRangeId="explore"|"matlab";

export const TRANSVERSE_RANGES:Record<TransverseRangeId,{grid:TransverseGridSpec;assetURL:string;generationSignature:string}>={
 explore:{
  grid:{radiusMM:100,stepMM:1,slicesMM:[-100,-75,-50,-25,0,25,50,75,100]},
  assetURL:"/transverse-field-initial-wide.bin",
  generationSignature:"device-xy-full-cuboids-wide-nine-planes-mt-v1",
 },
 matlab:{
  grid:DEFAULT_TRANSVERSE_GRID,
  assetURL:"/transverse-field-initial-latest.bin",
  generationSignature:TRANSVERSE_DATA_VERSION,
 },
};
