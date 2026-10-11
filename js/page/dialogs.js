/* A single stack owns Escape, focus and scroll locking for public/admin dialogs. */
(function(){
  const stack=[],callbacks=new Map();let originalOverflow='',syncing=false;
  const selector='.modal,#lightbox-overlay,#profile-modal-overlay,.am-overlay';
  const dialogs=new Set();
  function collect(root){
    if(!(root instanceof Element)||root.namespaceURI==='http://www.w3.org/2000/svg')return false;
    let changed=false;
    if(root.matches(selector)){dialogs.add(root);changed=true;}
    root.querySelectorAll(selector).forEach(node=>{dialogs.add(node);changed=true;});
    return changed;
  }
  function visible(node){return node.isConnected&&(node.classList.contains('lb-open')||node.classList.contains('pm-open')||node.classList.contains('am-visible')||(node.classList.contains('modal')&&node.style.display==='block'));}
  function focusables(node){return [...node.querySelectorAll('a[href],button,input,select,textarea,[tabindex],[contenteditable],iframe')].filter(el=>!el.disabled&&el.tabIndex!==-1&&el.getClientRects().length&&!el.closest('[hidden]'));}
  function sync(){
    if(syncing)return;syncing=true;
    try{
      for(let i=stack.length-1;i>=0;i--)if(!visible(stack[i].node)){const [item]=stack.splice(i,1);if(item.previous?.isConnected)item.previous.focus({preventScroll:true});}
      dialogs.forEach(node=>{
        if(!node.isConnected){dialogs.delete(node);return;}
        if(!visible(node)||stack.some(item=>item.node===node))return;
        if(!stack.length&&document.body.style.overflow!=='hidden')originalOverflow=document.body.style.overflow;
        const item={node,previous:document.activeElement};stack.push(item);
        node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');
        if(!node.hasAttribute('aria-label'))node.setAttribute('aria-label',node.querySelector('h2,h3')?.textContent||'Dialog');
        node.tabIndex=-1;(focusables(node)[0]||node).focus({preventScroll:true});
      });
      const overflow=stack.length?'hidden':originalOverflow;if(document.body.style.overflow!==overflow)document.body.style.overflow=overflow;
    }finally{syncing=false;}
  }
  document.addEventListener('keydown',event=>{
    sync();const top=stack.at(-1);if(!top)return;
    if(event.key==='Escape'){
      event.preventDefault();event.stopImmediatePropagation();
      const callback=callbacks.get(top.node.id);if(callback){callback();sync();return;}
      if(top.node.id==='lightbox-overlay')window._lb?.close();
      else if(top.node.id==='profile-modal-overlay')document.getElementById('pm-close-btn')?.click();
      else if(top.node.classList.contains('modal'))top.node.style.display='none';
      else (top.node.querySelector('#am-confirm-cancel,#admin-edit-cancel,#admin-pw-cancel,.am-cv-close,.am-close-btn')||top.node).click();
      sync();
    }else if(event.key==='Tab'){
      const elements=focusables(top.node),first=elements[0],last=elements.at(-1);
      if(!first){event.preventDefault();top.node.focus();}
      else if(event.shiftKey&&(document.activeElement===first||!top.node.contains(document.activeElement))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!top.node.contains(document.activeElement))){event.preventDefault();first.focus();}
    }
  },true);
  window.portfolioDialogs={add:(id,node,close)=>{dialogs.add(node);callbacks.set(node.id,close);sync();},remove:()=>sync(),sync};
  document.addEventListener('DOMContentLoaded',()=>{
    collect(document.body);
    new MutationObserver(records=>{
      let changed=false;
      for(const record of records){
        if(record.type==='attributes'){
          if(dialogs.has(record.target)||record.target.matches(selector)){
            dialogs.add(record.target);changed=true;
          }
        }else{
          for(const node of record.addedNodes)if(collect(node))changed=true;
          if(record.removedNodes.length&&[...dialogs].some(node=>!node.isConnected))changed=true;
        }
      }
      if(changed)sync();
    }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']});
    sync();
  });
})();
