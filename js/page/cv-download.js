/* The public CV is the official snapshot saved in Admin; no public tailoring. */
(function(){
  let session=null;
  function close(){
    if(!session)return;
    session.closed=true;
    if(session.url)URL.revokeObjectURL(session.url);
    document.getElementById('public-cv-dialog')?.remove();
    session=null;window.portfolioDialogs?.remove('public-cv');
  }
  window.exportInformation=async function(){
    if(session)return;
    const current=session={closed:false,url:null,result:null,generation:0};
    document.body.insertAdjacentHTML('beforeend',`<div id="public-cv-dialog" class="modal public-cv-dialog" style="display:block" role="dialog" aria-modal="true" aria-labelledby="public-cv-title"><div class="public-cv-panel"><div class="public-cv-toolbar"><h2 id="public-cv-title">Official CV</h2><button id="public-cv-close" aria-label="Close CV preview">×</button></div><div class="public-cv-options"><button id="public-cv-download" disabled>Download PDF</button><a id="public-cv-open" hidden target="_blank" rel="noopener">Open PDF preview</a><button id="public-cv-retry" hidden>Retry</button></div><p id="public-cv-status" role="status" aria-live="polite">Loading official CV…</p><iframe id="public-cv-preview" title="CV PDF preview"></iframe></div></div>`);
    document.getElementById('public-cv-close').onclick=close;
    window.portfolioDialogs?.add('public-cv',document.getElementById('public-cv-dialog'),close);
    const button=document.getElementById('public-cv-download'),status=document.getElementById('public-cv-status'),retry=document.getElementById('public-cv-retry');
    current.preview=async()=>{
      const token=++current.generation;
      retry.hidden=true;button.disabled=true;current.result=null;
      document.getElementById('public-cv-open').hidden=true;
      document.getElementById('public-cv-preview').removeAttribute('src');
      status.textContent='Loading official CV…';
      try{
        const [service,pdf]=await Promise.all([import('../cv/service.js'),import('../cv/pdf.js')]);
        const cv=await service.loadOfficialCv();
        if(current.closed||token!==current.generation)return;
        if(!cv){status.textContent='The official CV has not been published yet.';return;}
        if(cv.version===4&&cv.rendererVersion!==1)throw new Error('This CV uses a different renderer version and needs an Admin review');
        const source=cv.version===4?{cv}:{...await service.loadCvSource(),cv};
        const resolved=await service.resolvePublicCv(source);
        const result=await pdf.createCvPdf(resolved.fields,resolved.style);
        if(current.closed||token!==current.generation)return;
        if(!result.fits)throw new Error('The saved CV needs an Admin review of its page count');
        if(cv.version===4&&result.pages!==cv.pageCount)throw new Error('The saved CV pagination changed and needs an Admin review');
        current.result=result;
        if(current.url)URL.revokeObjectURL(current.url);
        current.url=URL.createObjectURL(result.blob);
        document.getElementById('public-cv-preview').src=current.url;
        const open=document.getElementById('public-cv-open');open.href=current.url;open.hidden=false;
        status.textContent=`${result.pages} page${result.pages===1?'':'s'} · A4 PDF · official version ${cv._revision||0}`;
        button.disabled=false;
        button.onclick=()=>{
          if(!current.result?.fits)return;
          const name=resolved.fields.find(x=>x.key==='name')?.text||'Portfolio';
          pdf.downloadPdf(current.result.blob,`CV_${name.replace(/[^\p{L}\p{N}_-]/gu,'_')}.pdf`);
        };
      }catch(error){
        if(current.closed||token!==current.generation)return;
        status.textContent=`Unable to prepare CV: ${error.message}. Please retry.`;retry.hidden=false;
      }
    };
    retry.onclick=current.preview;
    await current.preview();
  };
  window.addEventListener('cv-published-changed',()=>session?.preview());
  window.addEventListener('storage',event=>{if(event.key==='portfolio.officialCv.v4')session?.preview();});
  window.addEventListener('focus',()=>session?.preview());
  document.getElementById('export-btn')?.addEventListener('click',window.exportInformation);
})();
