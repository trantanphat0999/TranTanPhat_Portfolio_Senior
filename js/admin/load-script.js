const pending=new Map();
export function loadScript(url) {
  if(!pending.has(url))pending.set(url,new Promise((resolve,reject)=>{
    const element=document.createElement('script');element.src=url;element.async=true;
    element.onload=resolve;element.onerror=()=>{element.remove();pending.delete(url);reject(new Error(`Could not load ${url}. Please retry.`));};document.head.appendChild(element);
  }));
  return pending.get(url);
}
