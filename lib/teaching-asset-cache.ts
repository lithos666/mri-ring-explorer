import {ASSEMBLY_RUNTIME_MANIFEST_URL} from "./assembly-assets.generated";

// The public hosting layer may override HTTP cache headers. Only immutable,
// same-origin, content-hashed CAD assets belong in this application cache.
const PREFIX="mri-teaching-cad-v1-";
const CACHE_NAME=PREFIX+ASSEMBLY_RUNTIME_MANIFEST_URL.match(/\.([a-f0-9]{64})\.json$/)![1];
let cachePromise:Promise<Cache|null>|null=null;

function openCache(){
 if(!cachePromise)cachePromise=(async()=>{
  try{
   if(typeof window==="undefined"||!window.isSecureContext||!("caches" in window))return null;
   const cache=await window.caches.open(CACHE_NAME);
   const names=(await window.caches.keys()).filter(name=>name.startsWith(PREFIX));
   // Keep the current catalog and the most recently created other catalog.
   // Older tabs can still load their exact hash URLs after an update.
   const previous=names.filter(name=>name!==CACHE_NAME).at(-1);
   await Promise.all(names.filter(name=>name!==CACHE_NAME&&name!==previous).map(name=>window.caches.delete(name)));
   return cache;
  }catch{return null;}
 })();
 return cachePromise;
}

export async function fetchTeachingAsset(url:string):Promise<Response>{
 const target=new URL(url,window.location.href);
 const eligible=target.origin===window.location.origin&&!target.search&&
  /^\/assembly\/cache\/[^/]+\.[a-f0-9]{64}\.(?:json|glb(?:\.gz)?)$/.test(target.pathname);
 if(!eligible)return fetch(url);
 const cache=await openCache();
 try{
  const saved=await cache?.match(target.href);
  if(saved?.ok)return saved;
 }catch{/* Storage denial does not prevent network loading. */}
 const response=await fetch(target.href);
 if(response.ok&&!response.headers.get("content-type")?.includes("text/html")){
  try{await cache?.put(target.href,response.clone());}
  catch{/* Browser storage limits do not affect the fetched model. */}
 }
 return response;
}
