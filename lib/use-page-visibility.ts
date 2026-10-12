"use client";
import {useSyncExternalStore} from "react";

function subscribe(onChange:()=>void){
 document.addEventListener("visibilitychange",onChange);
 return ()=>document.removeEventListener("visibilitychange",onChange);
}
const snapshot=()=>document.visibilityState!=="hidden";
const serverSnapshot=()=>true;

export function usePageVisibility(){
 return useSyncExternalStore(subscribe,snapshot,serverSnapshot);
}
