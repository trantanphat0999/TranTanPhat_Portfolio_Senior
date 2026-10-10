const fs=require('node:fs');
(async()=>{
 const {BRANDS,SYMBOLS,renderIcon}=await import('../js/icons.js');
 const brands=Object.values(BRANDS).map(brand=>`<div class="sample">${renderIcon(brand.name)}<span>${brand.name}</span></div>`).join('');
 const symbols=Object.entries(SYMBOLS).map(([name,paths])=>`<div class="sample"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg><span>${name}</span></div>`).join('');
 fs.mkdirSync('test-results',{recursive:true});
 fs.writeFileSync('test-results/icon-gallery.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="/"><title>Portfolio icon review</title><style>body{margin:0;padding:32px;font:14px system-ui;color:#1f2937;background:#f8fafc}h1{font-size:26px}h2{margin-top:32px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.sample{min-height:90px;border:1px solid #e2e8f0;border-radius:12px;background:white;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}.sample svg,.sample img{width:32px;height:32px;object-fit:contain}.sample i{display:flex}.sample .portfolio-icon-cluster{display:flex;gap:6px}.sample span{font-size:12px}</style><h1>Portfolio icon review</h1><p>Original product marks and functional symbols on a consistent grid.</p><h2>Product marks (${Object.keys(BRANDS).length})</h2><div class="grid">${brands}</div><h2>Functional symbols (${Object.keys(SYMBOLS).length})</h2><div class="grid">${symbols}</div></html>`);
 console.log(`Generated ${Object.keys(BRANDS).length} product marks and ${Object.keys(SYMBOLS).length} functional symbols.`);
})();
