export function injectCvStyles() {
  if(document.getElementById('am-cv-modal-style'))return;
  const style=document.createElement('style');style.id='am-cv-modal-style';
  style.textContent=`
  #am-cv-overlay{height:100%;width:100%;color:#dce5f2;font:14px/1.5 system-ui,sans-serif;background:#111c2d}
  #am-cv-overlay [hidden]{display:none!important}
  #am-cv-overlay *{box-sizing:border-box}
  #am-cv-overlay button,#am-cv-overlay input,#am-cv-overlay textarea,#am-cv-overlay select{font:inherit}
  #am-cv-overlay button{border:1px solid #354359;background:#202e43;color:#e2ebf9;border-radius:8px;padding:9px 13px;cursor:pointer;transition:background .15s}
  #am-cv-overlay button:hover:not(:disabled){background:#304563}
  #am-cv-overlay button:disabled{opacity:.45;cursor:default}
  #am-cv-overlay :focus-visible{outline:3px solid #9cc5ff;outline-offset:3px}
  #am-cv-overlay h2,#am-cv-overlay h3,#am-cv-overlay p{margin:0}
  #am-cv-overlay h3{font-size:14px;font-weight:700;margin:18px 0 12px;color:#edf3ff}
  .am-cv-modal{width:100%;height:100%;background:#111c2d;overflow:hidden;display:flex;flex-direction:column}
  .cv-studio-header{padding:20px 26px;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:1px solid #2b3b52;background:#152238;flex-shrink:0}
  .cv-eyebrow{font-size:10px;letter-spacing:2px;font-weight:700;color:#9fbbe0}
  #am-cv-overlay .cv-studio-header h2{font-size:25px;letter-spacing:-.6px;color:#fff;margin:3px 0}
  #am-cv-overlay .cv-studio-header p{color:#aebdd1;font-size:12px}
  #am-cv-close{font-size:12px!important;line-height:1.5;padding:7px 12px!important;white-space:nowrap}
  .cv-studio-toolbar{padding:10px 24px;display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid #2b3b52;flex-shrink:0}
  .cv-studio-toolbar>div{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  #am-cv-target{font-size:12px;color:#d5e1f3;font-weight:650}
  #am-cv-preview-state{font-size:9px;font-weight:700;letter-spacing:.6px;padding:4px 8px;border:1px solid #40658a;border-radius:4px;color:#acd4ff;background:#1e3651}
  .cv-studio-toolbar button{font-size:12px!important;padding:6px 10px!important}
  #am-cv-open{color:#a8ccff;font-size:12px;text-decoration:underline}
  .am-cv-body{display:grid;grid-template-columns:minmax(0,1fr) 340px;flex:1;min-height:0;overflow:hidden}
  .cv-preview-column{display:flex;flex-direction:column;min-width:0;min-height:0;background:#273448}
  #am-cv-left{position:relative;flex:1;min-height:0;overflow:auto;padding:16px;display:flex;flex-direction:column}
  #am-cv-pdf-preview{width:100%;flex:1;min-width:0;min-height:0;overflow:auto;padding:10px 0;border:0;background:#273448}
  .cv-pdf-page{width:max-content;margin:0 auto 24px;position:relative}
  #am-cv-overlay .cv-pdf-page-label{font-size:10px;letter-spacing:1px;color:#b6c8de;text-align:center;margin-bottom:9px}
  .cv-pdf-sheet{position:relative;background:#fff;box-shadow:0 5px 18px #0004}
  .cv-pdf-sheet canvas{display:block}
  .cv-pdf-sheet a:focus-visible{outline:2px solid #2563eb!important}
  .cv-pdf-accessible{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
  .cv-zoom-control{display:flex;align-items:center;gap:7px;font-size:11px;color:#c7d9ee}
  #am-cv-zoom{background:#203149;color:#e6f0ff;border:1px solid #3b526e;border-radius:6px;padding:5px;font-size:11px}
  .cv-inspector-hidden .am-cv-body{grid-template-columns:minmax(0,1fr)}
  .cv-inspector-hidden .am-cv-tools{display:none}
  #am-cv-preview-message{margin:auto!important;padding:36px;max-width:540px;text-align:center;color:#dae7f9;line-height:1.8}
  .am-cv-tools{border-left:1px solid #354359;padding:20px;overflow:auto;min-height:0;background:#142034;color:#d4dff0}
  #am-cv-overlay .am-cv-tools p{color:#aebdd1;font-size:12px;line-height:1.65;margin:10px 0 14px}
  .cv-control-block{padding-bottom:18px;border-bottom:1px solid #354359}
  .am-cv-control{display:flex;flex-direction:column;gap:8px;margin-bottom:18px;font-size:12px;color:#cbd9ed}
  .am-cv-control>span{display:flex;justify-content:space-between;font-weight:650}
  #am-cv-overlay .am-cv-control select,#am-cv-overlay textarea,#am-cv-search{width:100%;min-width:0;background:#0e1829;color:#edf4ff;border:1px solid #3c4d68;border-radius:8px;padding:10px 12px;resize:vertical}
  .am-cv-control input[type=range]{width:100%;accent-color:#9fc5ff}
  .am-cv-page-meter{display:flex;justify-content:space-between;align-items:center;background:#21334d;border:1px solid #3c587b;border-radius:8px;padding:12px 14px;font-size:12px;color:#c3d6ef}
  .am-cv-page-meter strong{font-size:18px;color:#fff}
  .cv-tabs{display:flex;gap:4px;margin:20px 0 6px;background:#0e1829;padding:4px;border-radius:9px}
  #am-cv-overlay .cv-tabs button{flex:1;border:0;background:transparent;padding:8px 6px;font-size:12px}
  #am-cv-overlay .cv-tabs button[aria-selected=true]{background:#304867;color:#fff}
  #am-cv-analysis{white-space:pre-wrap;font-size:12px;line-height:1.8;color:#bdcde3;background:#0f1b2d;padding:14px;border-radius:8px}
  .am-cv-tools section>button{display:block;width:100%;margin:9px 0;text-align:center}
  #am-cv-opt-btn{background:#45336d!important;border-color:#6e569c!important}
  #am-cv-ai-out{white-space:pre-wrap;line-height:1.7;font-size:12px;color:#cfdef2}
  .cv-draft-actions{margin-top:24px;border-bottom:0;border-top:1px solid #354359}
  .cv-studio-footer{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:15px 24px;background:#152238;border-top:1px solid #354359;flex-shrink:0}
  .cv-studio-footer>div:last-child{display:flex;gap:8px;align-items:center;flex-shrink:0}
  #am-cv-draft-status{font-weight:600;font-size:12px;display:block;color:#dce9fa}
  #am-cv-overlay .cv-studio-footer p{font-size:11px;color:#aebdd1;margin-top:3px}
  #am-cv-overlay #am-cv-publish,#am-cv-overlay .cv-primary{background:#b8d5fc;color:#10233f;border-color:#b8d5fc;font-weight:700}
  #am-cv-overlay #am-cv-dl{background:#236850;color:#edfff6;border-color:#398c6f;font-weight:700}
  #am-cv-fit{padding:14px 20px;background:#1a3551;border-bottom:1px solid #4c7398;color:#e0edff;flex-shrink:0}
  .cv-fit-title{display:flex;justify-content:space-between;gap:10px;font-size:13px}
  .cv-fit-title span{font-size:11px;color:#bacde8}
  #am-cv-overlay #am-cv-fit>p{font-size:12px;margin:5px 0 8px;color:#c3d7ee}
  #am-cv-fit details{font-size:12px;max-height:170px;overflow:auto;margin-bottom:10px}
  #am-cv-fit summary{cursor:pointer;color:#cbe1ff;padding:4px 0}
  #am-cv-fit article,.cv-ai-proposal{padding:12px 0;border-top:1px solid #4a6483;margin-top:8px}
  #am-cv-overlay #am-cv-fit article p{margin:6px 0;color:#c9d7e9}
  #am-cv-fit .cv-after,.cv-after{color:#b8ecd8!important}
  #am-cv-source-warning{background:#463b24;color:#ffe3aa;padding:10px 18px;font-size:12px;display:flex;justify-content:space-between;align-items:center;gap:10px}
  #am-cv-source-warning button{font-size:11px!important}
  #am-cv-editor{background:#fff;border-radius:8px;padding:26px;width:100%;color:#1e293b}
  #am-cv-overlay .cv-section h3{color:#263f60;border-bottom:1px solid #d2dce9;padding-bottom:10px;margin:18px 0}
  .cv-section h3 small{float:right;font-size:11px;font-weight:400;color:#687d97}
  .am-cv-field{border:1px solid #d5dfed;border-radius:8px;margin-bottom:12px;padding:12px}
  .am-cv-field label{display:flex;gap:8px;align-items:center;color:#263f60;font-size:12px;font-weight:600}
  .am-cv-field label small{margin-left:auto;font-size:10px;color:#687d97}
  .am-cv-field [contenteditable]{font-size:13px;line-height:1.7;color:#25364a;margin-top:8px;padding:8px;background:#f7f9fc;border-radius:4px;min-height:32px;white-space:pre-wrap;overflow-wrap:anywhere}
  #am-cv-overlay .am-cv-field button{background:#edf3fa;color:#395778;border-color:#cad9e9;margin-top:7px;font-size:11px;padding:5px 8px}
  .cv-excluded{opacity:.6}
  @media(max-width:1000px){.am-cv-body{grid-template-columns:minmax(0,1fr) 300px}.cv-studio-footer>div:first-child{max-width:300px}}
  @media(max-width:700px){
    #am-cv-overlay{padding:0}.am-cv-modal{height:100%;border:0;border-radius:0}
    .cv-studio-header{padding:14px 16px}.cv-studio-header h2{font-size:20px!important}
    .cv-studio-toolbar{padding:8px 12px;align-items:flex-start;flex-wrap:wrap}.cv-studio-toolbar button{font-size:11px!important}
    .am-cv-body{display:block;overflow:auto}.cv-preview-column{min-height:330px}#am-cv-left{padding:10px;min-height:310px}#am-cv-pdf-preview{height:470px;flex:none}
    .am-cv-tools{border-left:0;border-top:1px solid #354359;overflow:visible;padding:16px}
    .cv-studio-footer{padding:10px 12px;display:block}.cv-studio-footer>div:first-child{max-width:none;margin-bottom:8px}.cv-studio-footer>div:last-child{display:grid;grid-template-columns:auto 1fr 1fr;gap:6px}
    .cv-studio-footer button{font-size:11px!important;padding:9px 6px!important}
    #am-cv-fit{padding:12px}#am-cv-editor{padding:16px}#am-cv-overlay .cv-studio-footer p{display:none}
  }
  @media(prefers-reduced-motion:reduce){#am-cv-overlay *{animation:none!important;transition:none!important}}
  `;
  document.head.appendChild(style);
}
