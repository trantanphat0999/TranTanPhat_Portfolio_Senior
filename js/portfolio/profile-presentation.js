// Adapt the original QA template when an imported CV describes another field.
// Store template copy once so loading an old archived profile restores it.
const originals=new Map();
const copy={'.summary-intro-label .summary-eyebrow':'PROFESSIONAL APPROACH','.summary-intro-label h3':'Experience. Skills. Perspective.','.summary-direction .summary-eyebrow':'CAREER DIRECTION','.summary-direction h3':'The next chapter.'};
export function applyProfilePresentation(data){
  const imported=!!data.metadata?.visuals;
  for(const [selector,text]of Object.entries(copy)){
    const element=document.querySelector(selector);if(!element)continue;
    if(!originals.has(element))originals.set(element,element.innerHTML);
    if(imported)element.textContent=text;else element.innerHTML=originals.get(element);
  }
  const ambient=document.querySelector('.falling-text-container');
  if(ambient){
    if(!originals.has(ambient))originals.set(ambient,ambient.innerHTML);
    if(imported){ambient.replaceChildren();for(const text of [...(data.header?.heroTags||[]),data.header?.title].filter(Boolean).slice(0,14)){const label=document.createElement('span');label.className='falling-text';label.textContent=text;ambient.append(label);}}
    else if(ambient.innerHTML!==originals.get(ambient))ambient.innerHTML=originals.get(ambient);
  }
  for(const [key,selector]of [['coreExpertise','.summary-expertise'],['leadership','.summary-team'],['careerObjective','.summary-direction']]){
    const element=document.querySelector(selector);if(element)element.hidden=imported&&!(data.summary?.[key]?.length);
  }
}
