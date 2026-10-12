import {escape} from './studio-ui.js';
import {clone} from './data-model.js';
import {extractCvFile} from './cv-import-file.js';
import {emptyPortfolio,PROFILE_SECTIONS,leafFields,importProposal,validatePortfolio,validateOriginal,validateSource,profileSummary} from '../portfolio/profile-model.js';
import {applyProfileVisuals,generatedImage} from '../portfolio/profile-visuals.js';
import {runAi,assertAiCurrent} from '../ai/service.js';

const titles={header:'Thông tin cá nhân',summary:'Giới thiệu',experience:'Kinh nghiệm',skills:'Kỹ năng',projects:'Dự án',achievements:'Thành tích',education:'Học vấn & chứng chỉ',contact:'Liên hệ','custom-blocks':'Nội dung bổ sung',metadata:'Bố cục & hình ảnh'};
const labels={name:'Tên',title:'Chức danh / tiêu đề',tagline:'Lời giới thiệu',email:'Email',phone:'Điện thoại',location:'Địa điểm',experience:'Kinh nghiệm',availability:'Trạng thái',overview:'Tổng quan',careerObjective:'Định hướng',company:'Công ty',role:'Vai trò',period:'Thời gian',description:'Mô tả',desc:'Nội dung',institution:'Trường',issuer:'Đơn vị cấp',year:'Năm',url:'Đường dẫn',linkedin:'LinkedIn',github:'GitHub',badge:'Nhãn',detailDuration:'Thời gian',detailClient:'Khách hàng',detailRole:'Vai trò',detailOverview:'Tổng quan dự án',subtitle:'Phụ đề'};
const editableFields=data=>leafFields(data).filter(f=>!f.path.startsWith('metadata.')&&!/\.(icon|imageIcon|modalId|avatar|logo|image|cardImage|profilePhoto)$/.test(f.path)&&!f.path.includes('.generatedVisual.')&&!/^custom-blocks\.blocks\.\d+\.(id|type|iconId|placement|status)$/.test(f.path));
function setPath(data,path,value){const keys=path.split('.'),last=keys.pop();keys.reduce((node,key)=>node[key],data)[last]=value;}
function template(){const p=emptyPortfolio();p.experience.jobs=[{company:'',role:'',period:'',badge:'',description:'',logo:'',highlights:[{title:'',desc:'',icon:''}]}];p.skills.categories=[{name:'',icon:'',skills:[{title:'',desc:'',icon:''}]}];p.projects.items=[{title:'',description:'',tags:[],detailDuration:'',detailClient:'',detailRole:'',detailOverview:[],detailResponsibilities:[],detailTechnologies:[],detailResults:[],image:'',imageIcon:''}];p.achievements.items=[{title:'',subtitle:'',description:'',icon:''}];p.education.degrees=[{title:'',institution:'',period:'',logo:''}];p.education.certifications=[{title:'',issuer:'',year:'',link:''}];p.contact.socials=[{name:'',url:'',icon:''}];return p;}
function download(value,name,type='application/json'){const blob=new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function session(){if(!document.body.classList.contains('admin-mode'))throw new Error('Phiên admin đã kết thúc.');}
async function deviceDraft(action,value){
  session();const api=await import('../firebase-config.js'),owner=api.getAdminUser()?.email;if(!owner)throw new Error('Hãy đăng nhập admin.');
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('portfolio-import-drafts',1);request.onupgradeneeded=()=>request.result.createObjectStore('drafts');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction('drafts',action==='get'?'readonly':'readwrite'),store=tx.objectStore('drafts'),request=action==='get'?store.get(owner):action==='delete'?store.delete(owner):store.put(value,owner);tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Không lưu được nháp.'));});}finally{db.close();}
}

export async function mountImportStudio(host){
  if(host.dataset.mounted)return;host.dataset.mounted='true';
  host.innerHTML=`<div class="ws-heading"><div><span class="ws-eyebrow">CV → PORTFOLIO</span><h1>Nhập CV. Sắp xếp câu chuyện của bạn.</h1><p>Tạo profile mới, review nội dung rồi chọn khi nào đưa lên portfolio.</p></div><button data-import-library>Thư viện profile →</button></div><ol class="import-steps" aria-label="Các bước nhập CV"><li data-import-step="file" aria-current="step">1. Đọc CV</li><li data-import-step="analyze">2. AI phân tích</li><li data-import-step="review">3. Review & lưu</li></ol><div class="import-grid"><article class="ws-card studio-form"><h2>CV đầu vào</h2><label class="import-drop">Chọn PDF, DOCX hoặc Markdown<input id="import-file" type="file" accept=".pdf,.docx,.md"><small>Tối đa 10 MB · PDF 40 trang · văn bản 60.000 ký tự</small></label><div class="studio-actions"><button id="import-draft-restore">Khôi phục nháp thiết bị</button><button id="import-draft-save">Lưu nháp thiết bị</button><button id="import-draft-delete">Xóa nháp</button></div><label>Văn bản trích xuất — kiểm tra thứ tự và độ đầy đủ<textarea id="import-source" rows="15" placeholder="Chọn file hoặc dán nội dung CV tại đây"></textarea></label><small id="import-source-info"></small><p id="import-file-warnings" class="studio-warning"></p><button id="import-source-download">Tải văn bản nguồn</button></article><article class="ws-card studio-form"><h2>Cách nhập dữ liệu</h2><fieldset class="import-modes"><legend>Chọn một chế độ</legend><label><input type="radio" name="import-mode" value="original" checked><span><strong>Import nguyên bản</strong><small>AI phân loại và sắp xếp. Nội dung giữ nguyên theo văn bản nguồn, trường thiếu để trống.</small></span></label><label><input type="radio" name="import-mode" value="optimize"><span><strong>Import optimize</strong><small>AI viết lại mô tả, tổng hợp giới thiệu và đề xuất điền trường thiếu từ bằng chứng trong CV. Bạn review trước khi dùng.</small></span></label></fieldset><label>Tên profile<input id="import-profile-name" maxlength="120" placeholder="VD: Nguyễn An · Product Designer"></label><p>Văn bản CV sẽ được gửi đến provider AI đang chọn trong Settings. Ảnh minh họa SVG và icon được tạo theo lĩnh vực AI nhận diện; ảnh cá nhân không được suy đoán.</p><div class="studio-actions"><button class="ws-primary" id="import-analyze">Phân tích CV</button><button id="import-cancel" hidden>Hủy phân tích</button><button id="import-settings">Cài đặt AI</button></div><p id="import-status" class="studio-status" role="status" aria-live="polite"></p><div id="import-analysis"></div></article></div><section id="import-review" hidden><div class="ws-section-heading"><h2>Review dữ liệu sẽ hiển thị</h2><span id="import-review-count"></span></div><p>Chọn từng mục để sửa. Trường thiếu vẫn để trống; toàn bộ văn bản nguồn được lưu riêng để tra cứu.</p><div id="import-review-fields" class="profile-review-grid"></div><div class="profile-action-bar"><label><input type="checkbox" id="import-reviewed"> Tôi đã kiểm tra nội dung, phần AI viết lại và các trường thiếu</label><button id="import-save" class="ws-primary" disabled>Lưu vào thư viện profile</button></div></section>`;
  const $=id=>host.querySelector('#'+id);let source=null,proposal=null,aiResult=null,controller=null,epoch=0,busy=false;
  const status=text=>$('import-status').textContent=text;
  const mode=()=>host.querySelector('[name="import-mode"]:checked').value;
  function step(key){host.querySelectorAll('[data-import-step]').forEach(el=>{if(el.dataset.importStep===key)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});}
  function clearProposal(){proposal=null;aiResult=null;$('import-review').hidden=true;$('import-analysis').textContent='';$('import-reviewed').checked=false;$('import-save').disabled=true;}
  function invalidate(){epoch++;controller?.abort();clearProposal();}
  function working(value){busy=value;for(const id of ['import-file','import-source','import-analyze','import-draft-restore','import-save','import-draft-delete'])$(id).disabled=value;host.querySelectorAll('[name="import-mode"]').forEach(el=>el.disabled=value);$('import-cancel').hidden=!value;if(!value)$('import-save').disabled=!proposal||!$('import-reviewed').checked;}
  function sourceInfo(){$('import-source-info').textContent=`${$('import-source').value.length.toLocaleString('vi-VN')} / 60.000 ký tự`;}
  function renderReview(){
    $('import-review').hidden=false;step('review');
    const fields=editableFields(proposal.data),generated=new Set(proposal.analysis.generatedFields);
    $('import-review-count').textContent=profileSummary(proposal.data);
    const warnings=[...proposal.analysis.warnings,...(!proposal.data.header.title?['Chưa có chức danh.']:[]),...(!proposal.data.header.email?['Chưa có email.']:[])];
    $('import-analysis').innerHTML=`<h2>${escape(proposal.analysis.industry||'Chưa rõ lĩnh vực')}</h2><p>${escape(proposal.analysis.summary)}</p><img class="profile-art" src="${escape(generatedImage({theme:proposal.analysis.visualTheme}))}" alt="Minh họa theo lĩnh vực"><ul class="studio-warning">${warnings.map(text=>`<li>${escape(text)}</li>`).join('')}</ul><p>${generated.size} trường được AI viết lại / đề xuất.</p>`;
    $('import-review-fields').innerHTML=PROFILE_SECTIONS.filter(key=>key!=='metadata').map(section=>{
      const rows=fields.filter(field=>field.path.startsWith(section+'.'));
      if(section==='header')for(const key of ['name','title','email','phone','location','tagline'])if(!rows.some(x=>x.path===`header.${key}`))rows.push({path:`header.${key}`,text:''});
      return `<details class="ws-card studio-form" ${section==='header'?'open':''}><summary>${escape(titles[section])}<span>${rows.length} trường</span></summary>${rows.map(field=>`<label>${escape(labels[field.path.split('.').pop()]||field.path.split('.').slice(1).join(' › '))}${generated.has(field.path)?'<small class="profile-generated">AI đề xuất — cần review</small>':''}<textarea data-import-field="${escape(field.path)}" rows="${field.text.length>180?4:2}">${escape(field.text)}</textarea></label>`).join('')||'<p>CV chưa có nội dung cho mục này. Có thể bổ sung sau trong Content.</p>'}</details>`;
    }).join('');
    host.querySelectorAll('[data-import-field]').forEach(el=>el.oninput=()=>{setPath(proposal.data,el.dataset.importField,el.value);$('import-reviewed').checked=false;$('import-save').disabled=true;});
    $('import-reviewed').checked=false;$('import-save').disabled=true;
  }
  $('import-file').onchange=async()=>{
    if(busy)return;invalidate();source=null;$('import-source').value='';$('import-file-warnings').textContent='';sourceInfo();controller=new AbortController();const token=epoch;working(true);step('file');
    try{const file=await extractCvFile($('import-file').files[0],{signal:controller.signal,onProgress:status});if(token!==epoch)return;source=file;$('import-source').value=file.text;$('import-file-warnings').textContent=file.warnings.join('\n');$('import-profile-name').value=file.name.replace(/\.(pdf|docx|md)$/i,'');sourceInfo();status('Đã đọc CV. Kiểm tra văn bản, chọn chế độ rồi phân tích.');}
    catch(error){if(token===epoch){$('import-file').value='';status(error.message);}}
    finally{controller=null;working(false);}
  };
  $('import-source').oninput=()=>{invalidate();sourceInfo();step('file');status('Văn bản đã thay đổi. Phân tích lại để có bản review mới.');};
  host.querySelectorAll('[name="import-mode"]').forEach(el=>el.onchange=()=>{invalidate();step('analyze');status('Chế độ đã thay đổi. Hãy phân tích lại.');});
  $('import-cancel').onclick=()=>{epoch++;controller?.abort();status('Đã hủy. Dữ liệu portfolio chưa thay đổi.');};
  $('import-analyze').onclick=async()=>{
    if(busy)return;const text=$('import-source').value;
    try{validateSource(text);session();}catch(error){status(error.message);$('import-source').focus();return;}
    clearProposal();const token=++epoch,selectedMode=mode();controller=new AbortController();working(true);step('analyze');status('AI đang phân tích và sắp xếp CV…');
    try{
      const result=await runAi({task:'portfolio-import',input:{sourceText:text,mode:selectedMode,portfolioTemplate:template()},contextIds:[],signal:controller.signal});
      session();if(token!==epoch)return;
      proposal=importProposal(result.structured,text,selectedMode);proposal.source={...source,text,mode:selectedMode};aiResult=result;
      renderReview();status('Phân tích hoàn tất. Review từng mục và xác nhận trước khi lưu.');
    }catch(error){if(token===epoch)status(error.message);}
    finally{controller=null;working(false);}
  };
  $('import-reviewed').onchange=()=>{$('import-save').disabled=busy||!proposal||!$('import-reviewed').checked;};
  $('import-save').onclick=async()=>{
    if(busy||!proposal||!$('import-reviewed').checked)return;working(true);
    try{
      session();if(aiResult)await assertAiCurrent(aiResult,[]);
      let data=validatePortfolio(proposal.data);if(proposal.source.mode==='original')validateOriginal(data,proposal.source.text);
      data=applyProfileVisuals(data,proposal.analysis);
      const api=await import('../firebase-config.js');const saved=await api.profileRepository.save({name:$('import-profile-name').value,data,source:proposal.source,analysis:{...proposal.analysis,provider:aiResult?.provider||null,model:aiResult?.model||null},kind:'import'});
      clearProposal();status(`Đã lưu “${saved.name}”. Mở thư viện để review và kích hoạt.`);window.dispatchEvent(new CustomEvent('portfolio-library-changed'));
    }catch(error){status(error.message);}
    finally{working(false);}
  };
  $('import-settings').onclick=()=>window._adminNavigate('settings');host.querySelector('[data-import-library]').onclick=()=>window._adminNavigate('profiles');
  $('import-source-download').onclick=()=>download($('import-source').value,'cv-source.md','text/markdown;charset=utf-8');
  $('import-draft-save').onclick=async()=>{try{session();await deviceDraft('put',{source:{...source,text:$('import-source').value,mode:mode()},name:$('import-profile-name').value,proposal,at:new Date().toISOString()});status('Đã lưu nháp riêng trên thiết bị này.');}catch(error){status(error.message);}};
  $('import-draft-restore').onclick=async()=>{
    if(busy)return;
    try{const draft=await deviceDraft('get');if(!draft){status('Chưa có nháp trên thiết bị này.');return;}invalidate();source=draft.source;$('import-source').value=source.text;$('import-profile-name').value=draft.name;host.querySelector(`[name="import-mode"][value="${source.mode==='optimize'?'optimize':'original'}"]`).checked=true;sourceInfo();proposal=draft.proposal||null;if(proposal){proposal.data=validatePortfolio(proposal.data);renderReview();}status('Đã khôi phục nháp. Kiểm tra lại trước khi lưu vào thư viện.');}catch(error){clearProposal();status(error.message);}
  };
  $('import-draft-delete').onclick=async()=>{try{await deviceDraft('delete');status('Đã xóa nháp thiết bị.');}catch(error){status(error.message);}};
  window.addEventListener('portfolio-auth-state',event=>{if(!event.detail.signedIn){invalidate();source=null;$('import-source').value='';$('import-profile-name').value='';$('import-file').value='';sourceInfo();}});
  window.addEventListener('beforeunload',event=>{if(proposal||busy){event.preventDefault();event.returnValue='';}});
}

export async function mountProfileLibrary(host){
  if(host.dataset.mounted){await host._refresh?.();return;}host.dataset.mounted='true';
  host.innerHTML=`<div class="ws-heading"><div><span class="ws-eyebrow">PORTFOLIO LIBRARY</span><h1>Mọi phiên bản. Một nơi quản lý.</h1><p>Lưu, review và chuyển profile. Mỗi lần chuyển tự lưu toàn bộ dữ liệu đang dùng, kể cả ảnh và bố cục.</p></div><button class="ws-primary" id="profiles-import">Nhập CV mới</button></div><div class="studio-actions"><button id="profiles-snapshot">Lưu portfolio hiện tại</button><button id="profiles-refresh">Tải lại thư viện</button></div><p id="profiles-status" role="status" aria-live="polite" class="studio-status"></p><div class="profile-library-grid"><aside class="ws-card studio-form"><label>Tìm profile<input id="profiles-search" type="search" placeholder="Tên, chức danh hoặc lĩnh vực"></label><div id="profiles-list" class="studio-list"></div></aside><article id="profiles-detail" class="ws-card studio-form"><h2>Chọn profile để review</h2><p>Profile lưu riêng tư. Chỉ dữ liệu được kích hoạt mới hiển thị trên portfolio.</p></article></div>`;
  const $=id=>host.querySelector('#'+id);let api,index={items:[]},selected=null,expected=null,busy=false,seq=0;
  const status=text=>$('profiles-status').textContent=text;
  function lock(value){busy=value;host.querySelectorAll('button').forEach(button=>button.disabled=value);guarded();}
  function list(){const query=$('profiles-search').value.toLowerCase(),items=index.items.filter(x=>`${x.name} ${x.summary} ${x.industry}`.toLowerCase().includes(query));$('profiles-list').innerHTML=items.map(x=>`<button data-profile-id="${x.id}" aria-pressed="${selected?.id===x.id}"><strong>${escape(x.name)}</strong><small>${escape(x.summary)}${index.activeId===x.id?' · Đang dùng':''}${x.kind==='backup'?' · Bản lưu tự động':''}</small><time>${escape(new Date(x.createdAt).toLocaleString('vi-VN',{timeZone:'Asia/Saigon'}))}</time></button>`).join('')||'<p>Chưa có profile phù hợp. Lưu portfolio hiện tại hoặc nhập CV mới.</p>';host.querySelectorAll('[data-profile-id]').forEach(button=>{button.disabled=busy;button.onclick=()=>select(button.dataset.profileId);});}
  async function refresh(){api=await import('../firebase-config.js');const next=await api.profileRepository.list();session();index=next;list();}
  host._refresh=refresh;
  async function select(id){
    if(busy)return;const token=++seq;lock(true);status('Đang tải profile…');
    try{session();const profile=await api.profileRepository.read(id),current=await api.readAllPortfolioDocs();session();if(token!==seq)return;selected=profile;expected=current;detail();list();status('Review nội dung và ảnh trước khi kích hoạt.');}
    catch(error){status(error.message);}
    finally{lock(false);}
  }
  function detail(){
    const data=selected.data;
    $('profiles-detail').innerHTML=`<h2>${escape(selected.name)}</h2><p>${escape(profileSummary(data))}</p><div class="studio-actions"><button id="profiles-export">Xuất JSON đầy đủ</button>${selected.source?.text?'<button id="profiles-source">Tải nguồn CV</button>':''}</div><div class="profile-preview">${data.header?.avatar?`<img src="${escape(data.header.avatar)}" alt="Ảnh profile đã lưu" class="profile-avatar">`:''}${PROFILE_SECTIONS.filter(key=>!['metadata','custom-blocks'].includes(key)).map(key=>`<details ${key==='header'?'open':''}><summary>${escape(titles[key])}</summary>${editableFields(data[key]).map(field=>`<p><strong>${escape(labels[field.path.split('.').pop()]||field.path)}:</strong> ${escape(field.text)}</p>`).join('')||'<p>Chưa có dữ liệu</p>'}</details>`).join('')}<details><summary>Ảnh, bố cục & nội dung bổ sung</summary><pre>${escape(JSON.stringify({'custom-blocks':data['custom-blocks'],metadata:data.metadata},null,2))}</pre></details></div><div class="profile-switch-note"><strong>Khi kích hoạt</strong><p>Thay dữ liệu và ảnh của 8 section, custom blocks và bố cục. Portfolio hiện tại được lưu thành bản tự động trước khi chuyển. Official CV PDF được quản lý riêng tại CV Studio; hãy review và publish CV tương ứng sau khi chuyển.</p><label><input id="profiles-reviewed" type="checkbox"> Tôi đã review profile và đồng ý đưa dữ liệu này lên portfolio</label><button id="profiles-activate" class="ws-primary" disabled>Kích hoạt profile</button></div><details><summary>Đổi tên / xóa profile</summary><div class="studio-form"><label>Tên mới<input id="profiles-rename-name" maxlength="120" value="${escape(selected.name)}"></label><button id="profiles-rename">Lưu tên</button><p>Xóa chỉ gỡ profile khỏi thư viện. Ảnh dùng chung và portfolio đang hiển thị được giữ lại.</p><label>Nhập chính xác tên profile để xóa<input id="profiles-delete-name" autocomplete="off"></label><button id="profiles-delete" class="profile-danger" ${index.activeId===selected.id?'disabled':''}>Xóa vĩnh viễn profile đã chọn</button></div></details>`;
    $('profiles-export').onclick=()=>download(selected,'portfolio-profile.json');
    if($('profiles-source'))$('profiles-source').onclick=()=>download(selected.source.text,'cv-source.md','text/markdown;charset=utf-8');
    $('profiles-reviewed').onchange=guarded;
    $('profiles-activate').onclick=async()=>{
      if(busy||!$('profiles-reviewed').checked||index.activeId===selected?.id)return;lock(true);status('Đang lưu bản sao và kích hoạt profile…');
      try{session();await api.profileRepository.activate(selected.id,expected);await refresh();expected=await api.readAllPortfolioDocs();$('profiles-reviewed').checked=false;status(`Đã kích hoạt “${selected.name}”. Dữ liệu trước đó đã nằm trong thư viện.`);window.dispatchEvent(new CustomEvent('portfolio-library-changed'));}
      catch(error){status(error.message+' Dữ liệu chưa được thay đổi. Tải lại profile để review lần nữa.');$('profiles-reviewed').checked=false;}
      finally{lock(false);$('profiles-activate').disabled=true;}
    };
    $('profiles-rename').onclick=async()=>{if(busy)return;lock(true);try{await api.profileRepository.rename(selected.id,$('profiles-rename-name').value);selected.name=$('profiles-rename-name').value.trim();await refresh();detail();status('Đã đổi tên profile.');}catch(error){status(error.message);}finally{lock(false);}};
    $('profiles-delete').onclick=async()=>{if(busy)return;if($('profiles-delete-name').value!==selected.name){status('Nhập đúng tên profile để xác nhận xóa.');$('profiles-delete-name').focus();return;}lock(true);try{await api.profileRepository.remove(selected.id);selected=null;expected=null;$('profiles-detail').innerHTML='<h2>Đã xóa profile</h2><p>Chọn một profile khác để review.</p>';await refresh();status('Đã xóa profile đã chọn.');}catch(error){status(error.message);}finally{lock(false);}};
  }
  // Restoring disabled states after a request must not enable guarded actions.
  function guarded(){if($('profiles-activate')){$('profiles-activate').disabled=busy||!$('profiles-reviewed')?.checked||index.activeId===selected?.id;$('profiles-activate').textContent=index.activeId===selected?.id?'Profile đang dùng':'Kích hoạt profile';}if($('profiles-delete'))$('profiles-delete').disabled=busy||index.activeId===selected?.id;}
  $('profiles-import').onclick=()=>window._adminNavigate('import');$('profiles-search').oninput=list;
  $('profiles-refresh').onclick=async()=>{if(busy)return;lock(true);try{await refresh();status('Đã tải lại thư viện.');}catch(error){status(error.message);}finally{lock(false);}};
  $('profiles-snapshot').onclick=async()=>{if(busy)return;lock(true);try{session();const data=await api.readAllPortfolioDocs(),defaults=emptyPortfolio();for(const key of PROFILE_SECTIONS)data[key]||=defaults[key];await api.profileRepository.save({name:`${data.header.name} · bản lưu`,data,kind:'snapshot'});await refresh();status('Đã lưu portfolio hiện tại.');}catch(error){status(error.message);}finally{lock(false);}};
  window.addEventListener('portfolio-library-changed',()=>{if(!host.hidden&&!busy)refresh().catch(error=>status(error.message));});
  window.addEventListener('portfolio-auth-state',event=>{if(!event.detail.signedIn){seq++;selected=null;expected=null;index={items:[]};$('profiles-list').textContent='';$('profiles-detail').textContent='Đăng nhập để xem profile.';}});
  await refresh();
}
