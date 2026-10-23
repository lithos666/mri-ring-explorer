/** Actual Ø6.2 mm BREP wall axes audited across all fourteen layer files.
 * End-layer registration was ambiguous modulo the 28-column pocket lattice:
 * a rigid three-pitch correction aligns its bores without changing that lattice.
 */
export const ASSEMBLY_BORE_DIAMETER_MM=6.2;
export const ASSEMBLY_ROD_DIAMETER_MM=6;
export const CONFIRMED_ROD_QUANTITY=8;
export const ROD_LAYER_GROUPS=[[1,2,3,4,5],[10,11,12,13,14]] as const;
export function rodBankExtentMM(firstLayerCenter:number,lastLayerCenter:number){
 const low=lastLayerCenter-9,high=firstLayerCenter+11;
 return {low,high,center:(low+high)/2,displayLength:high-low+16,endAllowance:8};
}
export const VERIFIED_ROD_AXES=[
 {x:-105.33592581311594,y:84.00259772925136},
 {x:-84.00259772925135,y:-105.3359258131159},
 {x:105.3359258131164,y:-84.00259772925196},
 {x:84.00259772925138,y:105.33592581311613},
] as const;
export function assemblyCADBoreCorrectionRadians(layer:number){return layer===1||layer===14?3*2*Math.PI/28:0;}
export const SPACER_GAPS=[1,2,3,4,10,11,12,13] as const;
export const ACRYLIC_THICKNESS_MM=2;
