export const ADMIN_USABILITY_CSS=`
#admin-workspace .ws-content>section{max-width:none}
#admin-workspace button:disabled{opacity:.45;cursor:not-allowed}
#admin-workspace h1:focus{outline:none}
#ws-fullscreen{margin-left:18px;font-size:11px!important}
.import-steps{display:flex;gap:12px;list-style:none;padding:0;margin:0 0 24px;flex-wrap:wrap}.import-steps li{padding:9px 18px;border:1px solid #425674;border-radius:30px;color:#a7bad3}.import-steps li[aria-current]{background:#294b64;color:#dafff0;border-color:#80c7aa}
.import-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:24px;align-items:start}.import-grid .ws-card{padding:24px}.import-drop{border:1px dashed #7595bc;border-radius:12px;background:#142b43;padding:24px;cursor:pointer}.import-drop input{border:0!important;background:none!important;padding:8px 0!important}.import-drop small{color:#9db6d5}.import-modes{border:0;margin:0;padding:0;display:grid;gap:12px}.import-modes legend{margin-bottom:12px;font-weight:650}.import-modes label{display:flex;align-items:flex-start;gap:12px;border:1px solid #46607e;border-radius:12px;padding:16px;cursor:pointer}.import-modes label:has(input:checked){background:#244a49;border-color:#87d5b5}.import-modes input{width:auto!important;margin-top:5px}.import-modes strong{font-size:15px;display:block}.import-modes small{display:block;margin-top:8px;line-height:1.8;color:#b9cbe0}
.profile-review-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start}.profile-review-grid summary,.profile-preview summary,#profiles-detail>details>summary{cursor:pointer;display:flex;justify-content:space-between;gap:12px;font-weight:650;padding:8px 0}.profile-review-grid summary>span{font-size:11px;color:#abc0d8;font-weight:400}.profile-review-grid label{margin-top:16px}.profile-generated{color:#ffd49c}.profile-art{width:100%;height:160px;object-fit:cover;border-radius:12px;margin:12px 0}.profile-action-bar{position:sticky;bottom:-50px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;background:#152a40;border:1px solid #567291;border-radius:12px;padding:18px;margin-top:24px;z-index:2}.profile-action-bar label,.profile-switch-note label{display:flex;align-items:center;gap:10px;font-size:13px}
.profile-library-grid{display:grid;grid-template-columns:minmax(240px,.7fr) minmax(0,1.5fr);gap:24px;align-items:start;margin-top:20px}.profile-library-grid aside{position:sticky;top:0;max-height:calc(100dvh - 180px);overflow:auto}.profile-library-grid .studio-list button{display:grid;gap:6px;overflow-wrap:anywhere}.profile-library-grid .studio-list button[aria-pressed=true]{border-color:#9bcdb8;background:#254a4a!important}.profile-library-grid small,.profile-library-grid time{font-size:11px;color:#a7bad3}.profile-preview{max-height:60dvh;overflow:auto;border:1px solid #46607e;border-radius:12px;padding:18px}.profile-preview details+details{border-top:1px solid #344d69}.profile-preview pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px}.profile-avatar{width:96px;height:96px;border-radius:16px;object-fit:cover}.profile-switch-note{padding:20px;border:1px solid #567291;background:#1a354c;border-radius:12px;display:grid;gap:14px}.profile-danger{color:#ffbdc7!important;border-color:#915266!important;background:#432932!important}
#admin-workspace .ws-row-actions button{min-height:40px;min-width:40px}.ws-row-actions button:first-child{min-width:70px}
#admin-edit-overlay{padding:0!important;backdrop-filter:none!important;background:#0f1928!important}
#admin-edit-overlay .am-edit-box{width:100%!important;max-width:none!important;height:100dvh!important;max-height:100dvh!important;border:0!important;border-radius:0!important;display:flex;flex-direction:column}
#admin-edit-overlay .am-edit-header{flex-shrink:0;padding:18px 32px!important}
#admin-edit-overlay .am-edit-body{padding:24px max(24px,calc((100vw - 1400px)/2))!important;min-height:0;scroll-padding:40px}
#admin-edit-overlay .am-edit-footer{flex-shrink:0;padding:16px 32px!important;gap:12px}
#admin-edit-overlay .am-edit-footer button{min-height:44px;min-width:100px}
#admin-edit-overlay .am-form-group{scroll-margin:32px}
#admin-edit-overlay .am-input:focus,#admin-edit-overlay .am-textarea:focus{outline:3px solid #80b8d4;outline-offset:2px}
#admin-edit-overlay [aria-invalid=true]{border:2px solid #b32948!important;background:#fff0f3!important}
#admin-form-errors{padding:12px 24px;background:#ffe7ed;border-bottom:1px solid #d88597;color:#8a1531;flex-shrink:0;font:600 13px system-ui}
#admin-form-tools{padding:10px 32px;background:#eaf0f8;color:#304863;border-bottom:1px solid #c5d5e6;display:flex;align-items:center;gap:12px;flex-wrap:wrap;flex-shrink:0}
#admin-form-filter{padding:8px 12px;border:1px solid #a4bdd4;border-radius:8px;font:13px system-ui;background:white;min-width:0;width:min(340px,100%)}
#admin-form-jump{padding:8px 12px;border:1px solid #a4bdd4;border-radius:8px;font:13px system-ui;background:white;max-width:280px;min-width:0}
#admin-edit-overlay .am-form-group[hidden]{display:none!important}
@media(min-width:1400px){.ws-content{padding:32px 44px!important}.profile-review-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:900px){.import-grid,.profile-library-grid{grid-template-columns:1fr}.profile-library-grid aside{position:static;max-height:350px}.profile-review-grid{grid-template-columns:1fr}.profile-action-bar{bottom:-50px}#ws-fullscreen{margin-left:8px;padding:6px!important}.ws-top{padding:0 14px!important}}
@media(max-width:700px){.ws-live{font-size:10px}.ws-breadcrumb{display:none}.ws-content{padding:20px 14px!important}.profile-action-bar{bottom:-30px}.profile-action-bar button{width:100%}.import-grid .ws-card{padding:18px}.import-steps{gap:6px}.import-steps li{font-size:11px;padding:8px 10px}#admin-edit-overlay .am-edit-header,#admin-edit-overlay .am-edit-footer,#admin-form-tools{padding:12px 16px!important}#admin-edit-overlay .am-edit-title{font-size:15px!important}#admin-edit-overlay .am-edit-body{padding:18px 16px!important}#admin-form-tools small{display:none}}
`;

export function initFormUsability(){
  const overlay=document.getElementById('admin-edit-overlay'),box=document.getElementById('admin-edit-box');if(!overlay||box.dataset.usability)return;box.dataset.usability='true';
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','admin-edit-title');document.getElementById('admin-edit-close').setAttribute('aria-label','Close editor');
  box.querySelector('.am-edit-header').insertAdjacentHTML('afterend','<div id="admin-form-errors" role="alert" hidden></div><div id="admin-form-tools"><input id="admin-form-filter" type="search" placeholder="Tìm trường cần chỉnh sửa…" aria-label="Search editor fields"><select id="admin-form-jump" aria-label="Jump to editor field"><option value="">Đi đến trường…</option></select><small>Ctrl + Enter để lưu · Esc để đóng</small></div>');
  const filter=document.getElementById('admin-form-filter'),jump=document.getElementById('admin-form-jump');let returnFocus=null,index=0;
  function fields(){return [...box.querySelectorAll('.am-form-group')];}
  function decorate(){
    fields().forEach(group=>{const input=group.querySelector('input,textarea,select'),label=group.querySelector('label');if(input&&!input.id)input.id=`admin-field-${++index}`;if(input&&label&&!label.htmlFor)label.htmlFor=input.id;});
    jump.replaceChildren(new Option('Đi đến trường…',''));fields().forEach((group,i)=>{const text=group.querySelector('label')?.textContent?.trim();if(text)jump.add(new Option(text,String(i)));});search();
  }
  function search(){const query=filter.value.trim().toLowerCase();fields().forEach(group=>{group.hidden=!!query&&!`${group.textContent} ${[...group.querySelectorAll('input,textarea')].map(x=>x.value).join(' ')}`.toLowerCase().includes(query);});}
  filter.oninput=search;jump.onchange=()=>{if(jump.value==='')return;filter.value='';search();const group=fields()[Number(jump.value)];group?.scrollIntoView({block:'center',behavior:'smooth'});group?.querySelector('input,textarea,select')?.focus({preventScroll:true});};
  const observer=new MutationObserver(decorate);observer.observe(document.getElementById('admin-edit-body'),{childList:true,subtree:true});
  // app.js replaces the form body for event isolation; observe its parent too.
  new MutationObserver(records=>{if(records.some(record=>[...record.addedNodes].some(node=>node.id==='admin-edit-body'))){observer.disconnect();observer.observe(document.getElementById('admin-edit-body'),{childList:true,subtree:true});decorate();}}).observe(box,{childList:true});
  new MutationObserver(()=>{if(overlay.classList.contains('am-visible')){returnFocus=document.activeElement;filter.value='';document.getElementById('admin-form-errors').hidden=true;setTimeout(()=>{decorate();box.querySelector('#admin-edit-body input,#admin-edit-body textarea,#admin-edit-close')?.focus();},0);}else{returnFocus?.focus?.({preventScroll:true});}}).observe(overlay,{attributes:true,attributeFilter:['class']});
  overlay.addEventListener('input',event=>{if(event.target.getAttribute('aria-invalid')==='true')event.target.removeAttribute('aria-invalid');});
  overlay.addEventListener('keydown',event=>{
    if(event.ctrlKey&&event.key==='Enter'){event.preventDefault();document.getElementById('admin-edit-save').click();}
    if(event.key==='Tab'){const items=[...box.querySelectorAll('button,input,textarea,select,a[href]')].filter(el=>!el.disabled&&el.getClientRects().length),first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
  });
}
export function showFormError(message){
  const box=document.getElementById('admin-edit-box'),error=document.getElementById('admin-form-errors');if(!error)return;
  error.hidden=false;error.textContent=message;
  const key=String(message).match(/^([a-zA-Z]+) is required/)?.[1]||(/email/i.test(message)?'email':String(message).match(/Invalid ([a-z]+)/)?.[1]);
  const inputs=[...box.querySelectorAll('#admin-edit-body input,#admin-edit-body textarea')];
  const input=inputs.find(el=>{const path=el.dataset.key||el.dataset.new||el.dataset.path||el.dataset.imgResult||'';return key&&path.split('.').at(-1)===key&&(!el.value.trim()||!message.includes('required'));});
  if(input){document.getElementById('admin-form-filter').value='';box.querySelectorAll('.am-form-group').forEach(group=>group.hidden=false);input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby','admin-form-errors');input.focus();}else{error.tabIndex=-1;error.focus();}
}
