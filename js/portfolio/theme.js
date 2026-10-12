export const DEFAULT_THEME={version:1,colors:{primary:'#3f3f46',accent:'#71717a',background:'#f7f7f8',surface:'#ffffff',text:'#18181b',border:'#e4e4e7'}};
export const THEME_ROLES={primary:'Primary',accent:'Accent',background:'Page background',surface:'Cards & fields',text:'Text',border:'Borders'};
export const THEME_PALETTES=[
 ['graphite','Graphite',DEFAULT_THEME.colors],
 ['ocean','Ocean',{primary:'#2563eb',accent:'#0891b2',background:'#f3f7fc',surface:'#ffffff',text:'#172554',border:'#cbd9ec'}],
 ['emerald','Emerald',{primary:'#047857',accent:'#0d9488',background:'#f0f8f5',surface:'#ffffff',text:'#12372c',border:'#c3ddd2'}],
 ['violet','Violet',{primary:'#7c3aed',accent:'#a855f7',background:'#f7f4fc',surface:'#ffffff',text:'#2e1065',border:'#ddd1f0'}],
 ['terracotta','Terracotta',{primary:'#b45309',accent:'#c2410c',background:'#fcf7f0',surface:'#ffffff',text:'#431407',border:'#e8d5bf'}],
 ['rose','Rose',{primary:'#be185d',accent:'#e11d48',background:'#fcf3f6',surface:'#ffffff',text:'#4c0519',border:'#edccd9'}],
 ['midnight','Midnight',{primary:'#93c5fd',accent:'#67e8f9',background:'#0f172a',surface:'#1e293b',text:'#f1f5f9',border:'#475569'}]
].map(([id,name,colors])=>({id,name,theme:{version:1,colors:{...colors}}}));
export function normalizeTheme(value){
 if(value===undefined||value===null)return structuredClone(DEFAULT_THEME);
 if(value.version!==1||!value.colors||typeof value.colors!=='object'||Array.isArray(value.colors))throw new Error('Unsupported theme configuration.');
 const colors={};for(const key of Object.keys(THEME_ROLES)){const color=value.colors[key];if(typeof color!=='string'||!/^#[a-f0-9]{6}$/i.test(color))throw new Error(`${THEME_ROLES[key]} needs a six-digit HEX color.`);colors[key]=color.toLowerCase();}
 return {version:1,colors};
}
export const hexRgb=color=>[1,3,5].map(index=>parseInt(color.slice(index,index+2),16));
const rgbHex=values=>'#'+values.map(value=>Math.round(Math.min(255,Math.max(0,value))).toString(16).padStart(2,'0')).join('');
export const mixColor=(a,b,amount)=>rgbHex(hexRgb(a).map((value,index)=>value+(hexRgb(b)[index]-value)*amount));
const luminance=color=>hexRgb(color).map(value=>{const n=value/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((sum,n,index)=>sum+n*[.2126,.7152,.0722][index],0);
export const contrastRatio=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
export function readableColor(preferred,background,target=4.5){
 if(contrastRatio(preferred,background)>=target)return preferred;
 const destination=contrastRatio('#000000',background)>contrastRatio('#ffffff',background)?'#000000':'#ffffff';
 for(let i=1;i<=100;i++){const candidate=mixColor(preferred,destination,i/100);if(contrastRatio(candidate,background)>=target)return candidate;}
 return destination;
}
function readableOn(preferred,backgrounds,target=4.5){
 const score=color=>Math.min(...backgrounds.map(background=>contrastRatio(color,background)));
 if(score(preferred)>=target)return preferred;
 const destination=score('#000000')>score('#ffffff')?'#000000':'#ffffff';
 for(let i=1;i<=100;i++){const candidate=mixColor(preferred,destination,i/100);if(score(candidate)>=target)return candidate;}
 return destination;
}
export function hexHsl(color){
 const [r,g,b]=hexRgb(color).map(n=>n/255),max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min,l=(max+min)/2;
 let h=0;if(delta)h=(max===r?(g-b)/delta+(g<b?6:0):max===g?(b-r)/delta+2:(r-g)/delta+4)*60;
 return {h:Math.round(h),s:Math.round((delta?delta/(1-Math.abs(2*l-1)):0)*100),l:Math.round(l*100)};
}
export function hslHex(h,s,l){
 s/=100;l/=100;const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return (l-a*Math.max(-1,Math.min(k-3,9-k,1)))*255;};return rgbHex([f(0),f(8),f(4)]);
}
export function themeTokens(value){
 const {colors:c}=normalizeTheme(value),tint=mixColor(c.surface,c.primary,.08),surfaces=[c.surface,tint],surfaceText=readableOn(c.text,surfaces),pageText=readableColor(c.text,c.background),brandInk=readableOn(c.primary,surfaces),accentInk=readableOn(c.accent,surfaces),muted=readableOn(mixColor(surfaceText,c.surface,.3),surfaces);
 return {
  '--theme-primary':c.primary,'--theme-primary-rgb':hexRgb(c.primary).join(' '),'--theme-accent':c.accent,'--theme-accent-rgb':hexRgb(c.accent).join(' '),
  '--theme-background':c.background,'--theme-surface':c.surface,'--theme-border':c.border,'--theme-page-ink':pageText,'--theme-ink':surfaceText,
  '--theme-muted':muted,'--theme-brand-ink':brandInk,'--theme-accent-ink':accentInk,
  '--theme-on-primary':contrastRatio('#ffffff',c.primary)>=contrastRatio('#000000',c.primary)?'#ffffff':'#000000',
  '--theme-on-accent':contrastRatio('#ffffff',c.accent)>=contrastRatio('#000000',c.accent)?'#ffffff':'#000000',
  '--theme-tint':tint,'--theme-control-border':readableColor(c.border,c.surface,3),
  '--brand-blue':brandInk,'--brand-sky':accentInk,'--brand-cyan':accentInk,'--brand-indigo':brandInk,'--ink':surfaceText,'--ink-soft':surfaceText,'--muted':muted,
  '--surface':c.surface,'--surface-soft':c.background,'--line':c.border,'--brand-grad':`linear-gradient(135deg, ${c.primary}, ${c.accent})`,'--brand-grad-soft':`linear-gradient(135deg, ${mixColor(c.surface,c.primary,.08)}, ${mixColor(c.surface,c.accent,.06)})`
 };
}
export function applyTheme(value){
 const theme=normalizeTheme(value);for(const [name,color]of Object.entries(themeTokens(theme)))document.documentElement.style.setProperty(name,color);
 document.documentElement.dataset.themeCustom=JSON.stringify(theme)!==JSON.stringify(DEFAULT_THEME);
 window.dispatchEvent(new CustomEvent('portfolio-theme-applied',{detail:{theme}}));return theme;
}
export function applyPublishedTheme(metadata){
 try{return applyTheme(metadata?.theme);}catch(error){console.warn('[Theme] Invalid saved theme; using default.',error.message);return applyTheme(DEFAULT_THEME);}
}
