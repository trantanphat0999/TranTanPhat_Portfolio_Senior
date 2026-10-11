// Admin Mode CSS — extracted from admin/app.js injectStyles().
// Injected once at runtime by injectStyles() in app.js.
export const ADMIN_STYLES = `
    body.admin-mode input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]),body.admin-mode textarea,body.admin-mode select{border-radius:12px!important}
    /* ===== ADMIN MODE OVERLAY ===== */
    .am-overlay {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 100000 !important;
      background: rgba(10, 15, 30, 0.80);
      backdrop-filter: blur(6px);
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .am-overlay.am-visible { display: flex; animation: amFadeIn 0.2s ease; }
    @keyframes amFadeIn { from { opacity: 0; } to { opacity: 1; } }

    /* ===== PASSWORD BOX ===== */
    .am-pw-box {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 2.5rem 2rem;
      width: 100%;
      max-width: 380px;
      text-align: center;
      box-shadow: 0 25px 60px rgba(0,0,0,0.6);
      animation: amSlideUp 0.3s cubic-bezier(.16,1,.3,1);
    }
    @keyframes amSlideUp { from { transform: translateY(30px); opacity:0; } to { transform: translateY(0); opacity:1; } }
    .am-pw-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .am-pw-title { font-family: 'Montserrat', sans-serif; font-size: 1.4rem; font-weight: 700; color: #f1f5f9; margin-bottom: 0.3rem; }
    .am-pw-subtitle { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; }
    .am-pw-input {
      width: 100%; padding: 0.75rem 1rem; border-radius: 10px;
      border: 2px solid #334155; background: #0f172a; color: #f1f5f9;
      font-size: 1rem; outline: none; transition: border-color 0.2s;
      text-align: center; letter-spacing: 0.15em; font-size: 1.2rem;
    }
    .am-pw-input:focus { border-color: #3b82f6; }
    .am-pw-error { color: #f87171; font-size: 0.85rem; min-height: 1.2em; margin: 0.5rem 0; line-height: 1.4; }
    .am-pw-error.am-pw-success { color: #4ade80; }
    .am-pw-btns { display: flex; gap: 0.75rem; margin-top: 1rem; }
    .am-pw-forgot {
      background: none; border: none; color: #60a5fa; cursor: pointer;
      font-size: 0.82rem; margin-top: 0.9rem; padding: 0.25rem;
      text-decoration: underline; transition: color 0.2s;
    }
    .am-pw-forgot:hover:not(:disabled) { color: #93c5fd; }
    .am-pw-forgot:disabled { color: #64748b; cursor: default; text-decoration: none; }
    .am-shake { animation: amShake 0.4s ease; }
    @keyframes amShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }

    /* ===== BUTTONS ===== */
    .am-btn {
      flex: 1; padding: 0.75rem 1.2rem; border-radius: 10px; border: none;
      font-family: 'Open Sans', sans-serif; font-size: 0.9rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
    }
    .am-btn-primary { background: linear-gradient(135deg, #2D5B8E, #1e4063); color: white; }
    .am-btn-primary:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
    .am-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .am-btn-ghost { background: #334155; color: #e2e8f0; }
    .am-btn-ghost:hover { background: #475569; }
    .am-btn-danger-sm {
      padding: 0.4rem 0.9rem; border-radius: 8px; border: none;
      background: #dc2626; color: white; font-size: 0.8rem; font-weight: 600;
      cursor: pointer; transition: background 0.2s;
    }
    .am-btn-danger-sm:hover { background: #b91c1c; }

    /* ===== TOOLBAR ===== */
    .am-toolbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 98000;
      background: linear-gradient(135deg, #1e3a5f, #1e293b);
      border-bottom: 2px solid #2D5B8E;
      padding: 0.6rem 1.5rem;
      box-shadow: 0 4px 20px rgba(45,91,142,0.25);
    }
    .am-toolbar.am-hidden { display: none !important; }
    .am-toolbar-inner { display: flex; align-items: center; gap: 1rem; max-width: 1200px; margin: 0 auto; justify-content: space-between; }
    .am-toolbar-actions { display: flex; align-items: center; gap: 0.75rem; }
    .am-btn-sm {
      padding: 0.4rem 0.9rem; border-radius: 6px; border: none;
      background: rgba(45, 91, 142, 0.1); color: #2D5B8E; font-size: 0.8rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s; font-family: 'Open Sans', sans-serif;
    }
    .am-btn-sm:hover { background: rgba(45, 91, 142, 0.2); }
    .am-firebase-dot {
      width: 10px; height: 10px; border-radius: 50%; display: inline-block;
      margin-right: 0.4rem; background: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.18);
      vertical-align: middle; flex-shrink: 0;
    }
    .am-firebase-dot.is-connected { background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,0.18); }
    .am-firebase-dot.is-syncing { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.2); }
    .am-firebase-status-card {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.9rem 1rem;
      border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;
    }
    .am-firebase-status-card .am-firebase-dot { width: 12px; height: 12px; margin-right: 0; }
    .am-firebase-status-title { font-weight: 700; color: #1e293b; font-size: 0.9rem; }
    .am-toolbar-badge {
      background: #2D5B8E; color: white; padding: 0.3rem 0.9rem;
      border-radius: 999px; font-size: 0.8rem; font-weight: 700; font-family: 'Montserrat', sans-serif;
      white-space: nowrap; animation: amPulse 2s ease-in-out infinite;
    }
    @keyframes amPulse { 0%,100%{box-shadow:0 0 0 0 rgba(45,91,142,0.4)} 50%{box-shadow:0 0 0 6px rgba(45,91,142,0)} }
    .am-toolbar-hint { color: #94a3b8; font-size: 0.85rem; flex: 1; }

    /* ===== EDIT BUTTONS & MENU on sections ===== */
    .am-edit-container {
      position: absolute; top: 1rem; right: 1rem; z-index: 100;
      display: flex; flex-direction: column; align-items: flex-end;
    }
    .am-edit-btn {
      background: #2D5B8E; color: white; border: none; border-radius: 50%;
      width: 40px; height: 40px; justify-content: center;
      cursor: pointer; box-shadow: 0 4px 12px rgba(45,91,142,0.35);
      transition: all 0.2s; display: flex; align-items: center; gap: 0.4rem;
      font-size: 1.2rem; font-family: 'Open Sans', sans-serif;
    }
    .am-edit-btn:hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 6px 20px rgba(45,91,142,0.5); background: #1e4063; }
    
    .am-edit-menu {
      position: absolute; top: calc(100% + 8px); right: 0;
      background: white; border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid #e2e8f0;
      overflow: hidden; min-width: 160px; z-index: 101;
      animation: amSlideDown 0.2s ease;
    }
    @keyframes amSlideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .am-edit-menu-item {
      display: flex; align-items: center; gap: 0.5rem; width: 100%;
      padding: 0.75rem 1rem; border: none; background: transparent;
      text-align: left; font-size: 0.9rem; font-weight: 600; color: #475569;
      cursor: pointer; transition: background 0.2s; font-family: 'Open Sans', sans-serif;
    }
    .am-edit-menu-item:hover { background: #f1f5f9; color: #1e293b; }
    .am-edit-menu-item:not(:last-child) { border-bottom: 1px solid #f1f5f9; }

    /* ===== SORTABLE LIST ===== */
    .am-sortable-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .am-sortable-item {
      display: flex; align-items: center; padding: 1rem 1.25rem;
      background: white; border: 1px solid #e2e8f0; border-radius: 10px;
      cursor: grab; transition: box-shadow 0.2s, border-color 0.2s;
    }
    .am-sortable-item:active { cursor: grabbing; }
    .am-sortable-item:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .am-sortable-ghost { opacity: 0.4; background: #f8fafc; border: 2px dashed #94a3b8; }
    .am-edit-btn:hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 6px 20px rgba(45,91,142,0.5); background: #1e4063; }

    /* ===== ADD NEW BUTTONS on sections ===== */
    .am-add-btn {
      margin-top: 1rem;
      background: rgba(45, 91, 142, 0.1);
      color: #2D5B8E; border: 2px dashed rgba(45, 91, 142, 0.4); border-radius: 12px;
      padding: 0.75rem 1.5rem; font-size: 0.9rem; font-weight: 700;
      cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;
      width: 100%; font-family: 'Open Sans', sans-serif;
    }
    .am-add-btn:hover { background: rgba(45, 91, 142, 0.2); border-color: #2D5B8E; }

    /* Adjust body top when toolbar visible */
    .admin-mode { padding-top: 50px !important; }

    /* ===== EDIT MODAL BOX ===== */
    .am-edit-box {
      background: #fff;
      border-radius: 20px;
      width: 100%;
      max-width: 700px;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 30px 80px rgba(0,0,0,0.4);
      overflow: hidden;
      animation: amSlideUp 0.3s cubic-bezier(.16,1,.3,1);
    }
    .am-edit-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.25rem 1.5rem;
      background: linear-gradient(135deg, #1e3a5f, #1e293b);
      color: white; flex-shrink: 0;
    }
    .am-edit-title { font-family: 'Montserrat', sans-serif; font-size: 1.1rem; font-weight: 700; margin: 0; color: white; }
    .am-close-btn {
      background: rgba(255,255,255,0.15); border: none; color: white;
      width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
      font-size: 0.9rem; display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    .am-close-btn:hover { background: rgba(255,255,255,0.3); }
    .am-edit-body { flex: 1; overflow-y: auto; padding: 1.5rem; background: #f8fafc; }
    .am-edit-footer {
      display: flex; gap: 0.75rem; padding: 1rem 1.5rem;
      background: white; border-top: 1px solid #e2e8f0; flex-shrink: 0;
    }

    /* ===== FORM ELEMENTS ===== */
    .am-form-group { margin-bottom: 1rem; }
    .am-form-group label {
      display: block; font-size: 0.78rem; font-weight: 600; color: #475569;
      text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem;
    }
    .am-input, .am-textarea {
      width: 100%; padding: 0.65rem 0.9rem;
      border: 2px solid #e2e8f0; border-radius: 10px;
      font-family: 'Open Sans', sans-serif; font-size: 0.9rem; color: #1e293b;
      background: white; outline: none; transition: border-color 0.2s;
      box-sizing: border-box;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .am-input:focus, .am-textarea:focus { border-color: #2D5B8E; box-shadow: 0 0 0 3px rgba(45,91,142,0.1); }
    .am-textarea { resize: vertical; min-height: 80px; }
    .am-sub-card {
      background: white; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 1.25rem; margin-bottom: 1rem; border-left: 4px solid #2D5B8E;
    }
    .am-sub-card-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;
      gap: 0.5rem; flex-wrap: wrap;
    }
    .am-sub-card-header .am-sub-label { margin-bottom: 0; flex: 1; min-width: 0; }
    .am-delete-btn {
      background: rgba(220, 38, 38, 0.1); color: #dc2626; border: none; border-radius: 6px;
      padding: 0.3rem 0.6rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
      display: flex; align-items: center; gap: 0.3rem; font-family: 'Open Sans', sans-serif;
    }
    .am-delete-btn:hover { background: #dc2626; color: white; }
    .am-restore-btn {
      background: rgba(34, 197, 94, 0.12); color: #15803d; border: none; border-radius: 6px;
      padding: 0.3rem 0.65rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
      display: flex; align-items: center; gap: 0.3rem; font-family: 'Open Sans', sans-serif;
    }
    .am-restore-btn:hover { background: #15803d; color: white; }
    .am-sub-card-inactive { opacity: 0.88; border-left-color: #94a3b8 !important; background: #f8fafc; }
    .am-badge-inactive {
      display: inline-block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: #64748b; background: #e2e8f0; padding: 0.15rem 0.45rem; border-radius: 6px;
      vertical-align: middle;
    }
    .am-sub-label {
      font-weight: 700; color: #1e3a5f; font-size: 0.85rem; margin-bottom: 1rem;
      font-family: 'Montserrat', sans-serif;
    }
    .am-section-label {
      font-weight: 700; color: #475569; font-size: 0.75rem; text-transform: uppercase;
      letter-spacing: 0.08em; padding: 0.5rem 0; margin: 0.75rem 0 0.5rem;
      border-top: 1px solid #e2e8f0;
    }
    .am-skill-row { display: flex; gap: 0.75rem; margin-bottom: 0.5rem; align-items: flex-start; }
    .am-flex-1 { flex: 1; min-width: 0; }
    .am-flex-2 { flex: 2; min-width: 0; }
    .am-loading { text-align: center; padding: 2rem; color: #64748b; font-size: 1rem; }
    .am-error-msg { color: #dc2626; padding: 1rem; text-align: center; }

    /* ===== SPINNER ===== */
    .am-spinner {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white; border-radius: 50%;
      animation: amSpin 0.7s linear infinite; display: inline-block;
    }
    .am-hidden { display: none !important; }
    @keyframes amSpin { to { transform: rotate(360deg); } }

    /* ===== TOAST ===== */
    .am-toast-container {
      position: fixed; top: 80px; right: 1.5rem; z-index: 999999;
      display: flex; flex-direction: column; gap: 0.5rem; pointer-events: none;
    }
    .am-toast {
      background: #1e293b; color: white; padding: 0.75rem 1.25rem;
      border-radius: 12px; font-size: 0.9rem; font-weight: 500;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      transform: translateX(120%); transition: transform 0.35s cubic-bezier(.16,1,.3,1), opacity 0.35s;
      opacity: 0; max-width: 320px;
    }
    .am-toast-show { transform: translateX(0); opacity: 1; }
    .am-toast-success { border-left: 4px solid #22c55e; }
    .am-toast-error   { border-left: 4px solid #ef4444; }
    .am-toast-info    { border-left: 4px solid #2D5B8E; }
    /* ===== GLOBAL AI WIDGET STYLES ===== */
    .am-global-ai-widget {
      position: fixed; bottom: 20px; right: 20px; z-index: 99999;
      width: 350px; background: white; border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2); border: 1px solid #e2e8f0;
      display: flex; flex-direction: column; overflow: hidden;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      transform-origin: bottom right;
    }
    .am-global-ai-widget.am-minimized {
      transform: scale(0.6) translateY(20px) translateX(20px);
      height: 60px !important; border-radius: 30px; cursor: pointer;
    }
    .am-global-ai-widget.am-minimized:hover { transform: scale(0.65) translateY(15px) translateX(15px); }
    .am-global-ai-widget.am-hidden { display: none !important; }
    
    .am-ai-widget-header {
      background: linear-gradient(135deg, #1e3a5f, #1e293b); color: white;
      padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between;
      cursor: pointer;
    }
    .am-ai-widget-title { font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .am-ai-widget-actions button {
      background: transparent; border: none; color: white; font-size: 1.2rem; cursor: pointer; opacity: 0.8; transition: opacity 0.2s;
    }
    .am-ai-widget-actions button:hover { opacity: 1; }
    
    .am-ai-widget-body {
      display: flex; flex-direction: column; height: 400px; background: #f8fafc;
    }
    .am-minimized .am-ai-widget-body { display: none; }
    
    .am-chat-history {
      flex: 1; overflow-y: auto; padding: 1rem;
      display: flex; flex-direction: column; gap: 0.75rem;
    }
    .am-chat-message {
      display: flex; gap: 0.75rem; padding: 0.75rem; border-radius: 8px;
      max-width: 85%;
    }
    .am-chat-user { align-self: flex-end; background: #2D5B8E; color: white; border-bottom-right-radius: 2px; }
    .am-chat-ai { align-self: flex-start; background: white; border: 1px solid #e2e8f0; border-bottom-left-radius: 2px; }
    .am-chat-error { align-self: flex-start; background: #fee2e2; border: 1px solid #fca5a5; }
    .am-chat-avatar {
      width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 0.9rem; flex-shrink: 0;
    }
    .am-chat-content { flex: 1; font-size: 0.9rem; }
    .am-chat-text { margin-bottom: 0.25rem; line-height: 1.5; }
    .am-chat-meta { display: block; font-size: 0.68rem; opacity: 0.65; }
    .am-chat-time { font-size: 0.7rem; opacity: 0.7; }
    
    .am-chat-input-container {
      display: flex; gap: 0.5rem; align-items: flex-end; padding: 0.75rem; background: white; border-top: 1px solid #e2e8f0;
    }
    .am-chat-input-container textarea {
      flex: 1; resize: none; min-height: 44px; max-height: 120px; padding: 0.5rem 0.75rem;
      border: 1px solid #cbd5e1; border-radius: 8px; font-family: 'Open Sans', sans-serif; font-size: 0.9rem;
      outline: none; transition: border-color 0.2s;
    }
    .am-chat-input-container textarea:focus { border-color: #2D5B8E; }
    .am-chat-input-container button {
      flex-shrink: 0; height: 44px; width: 44px; border-radius: 8px; border: none;
      background: #2D5B8E; color: white; display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background 0.2s; font-size: 1.2rem;
    }
    .am-chat-input-container button:hover:not(:disabled) { background: #1e4063; }
    .am-chat-input-container button:disabled { opacity: 0.6; cursor: not-allowed; }
    .am-img-preview-wrap { position: relative; display: inline-block; margin-bottom: 1rem; }
    .am-img-preview {
      max-width: 140px; max-height: 140px; border-radius: 8px;
      object-fit: cover; border: 2px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    .am-img-preview-label {
      position: absolute; top: -8px; right: -8px; background: #3b82f6; color: white;
      font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    .am-img-no-preview {
      width: 100px; height: 100px; margin: 0 auto 1rem; border-radius: 8px;
      background: #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: #94a3b8; font-size: 0.8rem; border: 1px dashed #cbd5e1;
    }
    .am-img-no-preview i { font-size: 2rem; margin-bottom: 0.25rem; }
    .am-img-upload-btn {
      display: inline-flex; align-items: center; gap: 0.5rem; justify-content: center;
      background: white; border: 1px solid #cbd5e1; color: #475569; padding: 0.5rem 1rem;
      border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .am-img-upload-btn:hover { background: #f1f5f9; border-color: #94a3b8; color: #1e293b; }
    .am-img-new-preview { margin-top: 1rem; }
    .am-hint-text { font-size: 0.8rem; color: #64748b; margin-top: 0.25rem; font-style: italic; }

    .am-ai-suggest-btn {
      background: rgba(45, 91, 142, 0.1); color: #2D5B8E; border: 1px solid rgba(45, 91, 142, 0.3);
      border-radius: 6px; padding: 0.25rem 0.5rem; font-size: 0.75rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.25rem;
      font-family: 'Open Sans', sans-serif;
    }
    .am-ai-suggest-btn:hover { background: rgba(45, 91, 142, 0.2); border-color: #2D5B8E; }

    .am-ai-summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; }
    .am-summary-item { margin-bottom: 0.5rem; color: #475569; font-size: 0.9rem; }
    .am-summary-item:last-child { margin-bottom: 0; }

    /* ===== EXPORT CV BUTTON ===== */
    .am-btn-cv {
      background: linear-gradient(135deg, #16a34a, #15803d) !important;
      color: white !important; border: none !important;
      padding: 0.4rem 0.9rem; border-radius: 8px; font-size: 0.8rem; font-weight: 700;
      cursor: pointer; transition: all 0.2s; font-family: 'Open Sans', sans-serif;
      box-shadow: 0 2px 8px rgba(22,163,74,0.35);
    }
    .am-btn-cv:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(22,163,74,0.45); }

    /* ===== CV EXPORT MODAL ===== */
    .am-cv-export-box {
      background: #fff; border-radius: 20px; width: 100%; max-width: 1100px;
      max-height: 92vh; display: flex; flex-direction: column;
      box-shadow: 0 30px 80px rgba(0,0,0,0.4);
      overflow: hidden; animation: amSlideUp 0.3s cubic-bezier(.16,1,.3,1);
    }
    .am-cv-export-layout {
      display: flex; flex: 1; overflow: hidden; gap: 0;
    }
    .am-cv-preview-panel {
      flex: 1; overflow-y: auto; background: #e8ecf1;
      padding: 1.5rem; display: flex; flex-direction: column; align-items: center;
    }
    .am-cv-ai-panel {
      width: 340px; flex-shrink: 0; background: #1e293b;
      display: flex; flex-direction: column; border-left: 2px solid #2D5B8E;
      overflow: hidden;
    }
    .am-cv-ai-panel-header {
      background: linear-gradient(135deg, #1e3a5f, #1e293b);
      padding: 1rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.1);
      flex-shrink: 0;
    }
    .am-cv-ai-panel-title {
      font-family: 'Montserrat', sans-serif; font-size: 0.95rem; font-weight: 700;
      color: white; display: flex; align-items: center; gap: 0.5rem;
    }
    .am-cv-ai-panel-body {
      flex: 1; overflow-y: auto; padding: 1rem;
      display: flex; flex-direction: column; gap: 0.75rem;
    }
    .am-cv-ai-review-btn {
      width: 100%; padding: 0.75rem; border-radius: 10px; border: none;
      background: linear-gradient(135deg, #2D5B8E, #1e4063); color: white;
      font-size: 0.9rem; font-weight: 700; cursor: pointer;
      font-family: 'Open Sans', sans-serif; transition: all 0.2s;
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    }
    .am-cv-ai-review-btn:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); }
    .am-cv-ai-review-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .am-cv-review-result {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; padding: 0.9rem; font-size: 0.82rem; color: #e2e8f0; line-height: 1.6;
    }
    .am-cv-review-score {
      font-size: 1.8rem; font-weight: 900; text-align: center; margin-bottom: 0.5rem;
      font-family: 'Montserrat', sans-serif;
    }
    .am-cv-review-score.score-high { color: #22c55e; }
    .am-cv-review-score.score-mid  { color: #f59e0b; }
    .am-cv-review-score.score-low  { color: #ef4444; }
    .am-cv-review-item {
      display: flex; align-items: flex-start; gap: 0.5rem;
      padding: 0.4rem 0; border-bottom: 1px solid rgba(255,255,255,0.06);
      font-size: 0.8rem; color: #cbd5e1;
    }
    .am-cv-review-item:last-child { border-bottom: none; }
    .am-cv-review-tag {
      font-size: 0.7rem; font-weight: 700; padding: 0.1rem 0.45rem; border-radius: 4px;
      flex-shrink: 0; margin-top: 0.1rem;
    }
    .am-cv-tag-good { background: rgba(34,197,94,0.2); color: #22c55e; }
    .am-cv-tag-warn { background: rgba(245,158,11,0.2); color: #f59e0b; }
    .am-cv-tag-fix  { background: rgba(239,68,68,0.2);  color: #ef4444; }
    .am-cv-export-footer {
      display: flex; gap: 0.75rem; padding: 1rem 1.5rem;
      background: white; border-top: 1px solid #e2e8f0; flex-shrink: 0; justify-content: flex-end;
    }
    .am-cv-export-btn {
      padding: 0.7rem 1.75rem; border-radius: 10px; border: none;
      background: linear-gradient(135deg, #16a34a, #15803d); color: white;
      font-size: 0.95rem; font-weight: 700; cursor: pointer;
      font-family: 'Open Sans', sans-serif; transition: all 0.2s;
      display: flex; align-items: center; gap: 0.5rem;
      box-shadow: 0 4px 14px rgba(22,163,74,0.35);
    }
    .am-cv-export-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
    .am-cv-export-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    /* CV Page inside preview */
    #cv-preview-frame {
      width: 860px; background: white; transform-origin: top center;
      box-shadow: 0 8px 40px rgba(0,0,0,0.18); border-radius: 4px;
      transform: scale(0.78);
      margin-bottom: -12%;
    }
    @media (max-width: 900px) {
      .am-cv-export-layout { flex-direction: column; }
      .am-cv-ai-panel { width: 100%; height: 280px; border-left: none; border-top: 2px solid #2D5B8E; }
      #cv-preview-frame { width: 100%; transform: scale(1); margin-bottom: 0; }
    }
`;
