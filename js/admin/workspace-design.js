// Shared workspace design. Scoped to admin so the public portfolio keeps its layout.
export const WORKSPACE_DESIGN_CSS = `
#admin-workspace{--ws-accent:#b8d5fc;--ws-line:#324861;grid-template-columns:212px minmax(0,1fr)}
#admin-workspace .ws-content{padding:28px clamp(20px,3vw,48px) 40px}
#admin-workspace .ws-content>section{max-width:1440px}
body.admin-mode>nav.sticky{top:64px}
#admin-workspace .ws-content:has(#ws-cv-panel:not([hidden]) #am-cv-overlay){padding:0!important;overflow:hidden}
#admin-workspace .ws-top{padding:0 24px;gap:12px}
#admin-workspace .ws-top>div:first-child{display:flex;align-items:center;gap:10px;min-width:0}
#admin-workspace .ws-sidebar{padding:24px 14px 18px}
#admin-workspace .ws-brand{margin-bottom:28px}
#admin-workspace .ws-sidebar nav button{min-height:46px;border-radius:12px}
#admin-workspace .ws-sidebar nav button[aria-current]{box-shadow:inset 3px 0 0 var(--ws-accent)}
#admin-workspace .ws-heading{margin-bottom:24px}
#admin-workspace .ws-card{border-radius:16px}
#admin-workspace .studio-tabs{gap:4px;padding:5px;border:1px solid var(--ws-line);border-radius:12px;background:#101e30;width:fit-content;max-width:100%}
#admin-workspace .studio-tabs button{border:0;min-height:40px;background:transparent}
#admin-workspace .studio-tabs button[aria-selected=true]{background:#2e4b6c!important}
#admin-workspace .studio-form input,#admin-workspace .studio-form select,#admin-workspace .studio-form textarea{min-height:44px;border-radius:10px;min-width:0}
#admin-workspace .studio-form label{line-height:1.6}
#admin-workspace .studio-list{max-height:60dvh;overflow:auto;padding:3px}
#admin-workspace .studio-list button{min-height:48px;overflow-wrap:anywhere}
#admin-workspace .studio-status{padding:10px 0;line-height:1.7}
#admin-workspace .aip-step:has(>.aip-num[hidden]){grid-template-columns:minmax(0,1fr)}
#admin-workspace button:disabled{opacity:.5;cursor:not-allowed}
#admin-workspace .ws-search{max-width:none;min-height:48px}
#admin-workspace .ws-section-row{padding:20px;gap:16px}
#admin-workspace .ws-section-copy p{font-size:12px!important}
#ws-content-results{font-size:12px;color:#b0c5df;margin:-10px 0 14px}
.ws-task-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 24px}
#admin-workspace .ws-task{display:flex;text-align:left;align-items:flex-start;gap:12px;padding:18px;border-radius:14px;background:#17293f}
.ws-task i{font-size:22px;color:#b8d5fc}.ws-task strong{display:block;font-size:13px}.ws-task small{display:block;color:#b0c5df;font-size:12px;margin-top:6px;line-height:1.6}
#admin-workspace .ws-health-row{gap:10px}.ws-health-row>div{flex:1;min-width:0}.ws-health-row small{overflow-wrap:anywhere}
#admin-workspace .ws-health-row button{font-size:11px;padding:7px 10px;flex-shrink:0}
#ws-sidebar-toggle{font-size:18px!important;padding:6px 10px!important}
#admin-workspace.ws-sidebar-collapsed{grid-template-columns:76px minmax(0,1fr)}
.ws-sidebar-collapsed .ws-brand>div,.ws-sidebar-collapsed .ws-nav-label,.ws-sidebar-collapsed .ws-sidebar-bottom,.ws-sidebar-collapsed .ws-nav-text,.ws-sidebar-collapsed .ws-new{display:none}
#admin-workspace.ws-sidebar-collapsed .ws-sidebar nav button{justify-content:center;padding:12px}
.ws-sidebar-collapsed .ws-brand{justify-content:center}
.ws-live #ws-status-dot.disconnected{background:#f28c9b}.ws-live #ws-status-dot.syncing{background:#f4cd82}
@media(max-width:1100px){.ws-task-list{grid-template-columns:1fr}.ws-task small{margin-top:3px}}
@media(max-width:700px){
 #admin-workspace,#admin-workspace.ws-sidebar-collapsed{grid-template-columns:minmax(0,1fr)}
 #admin-workspace .ws-content{padding:20px 14px 32px}#admin-workspace .ws-sidebar{padding:8px}
 #ws-sidebar-toggle{display:none}#admin-workspace .ws-top{padding:0 12px}
 #admin-workspace .ws-sidebar nav button{min-height:42px;font-size:12px}
 .ws-sidebar-collapsed .ws-nav-text{display:inline}#admin-workspace .ws-breadcrumb{display:none}
 #admin-workspace .ws-section-row{padding:16px 12px}.ws-health-row{flex-wrap:wrap}
 #admin-workspace .ws-section-copy p{display:block!important}.ws-section-copy{min-width:150px}
 #ws-fullscreen{display:none}.ws-live{min-width:0}.ws-live #ws-status{max-width:110px}
}
`;
