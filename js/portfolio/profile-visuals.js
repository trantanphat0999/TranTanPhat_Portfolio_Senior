const THEMES={technology:{color:'#2563eb',icon:'ri-code-box-line',motif:'M6 8 2 12l4 4m12-8 4 4-4 4m-4-11-4 14'},design:{color:'#9333ea',icon:'ri-palette-line',motif:'M4 18 9 3l12 9-17 6Zm5-15 3 11 9-2'},business:{color:'#08916e',icon:'ri-bar-chart-line',motif:'M4 20V12h4v8m2 0V7h4v13m2 0V3h4v17'},health:{color:'#db2777',icon:'ri-heart-pulse-line',motif:'M2 12h5l3-8 4 16 3-8h5'},education:{color:'#b45309',icon:'ri-book-open-line',motif:'M12 5v16M3 3l9 2 9-2v16l-9 2-9-2V3Z'},general:{color:'#475569',icon:'ri-briefcase-line',motif:'M3 7h18v14H3V7Zm5 0V3h8v4M3 12h18'}};
export function illustrationSvg(theme='general',variant=0){
  const {color,motif}=THEMES[theme]||THEMES.general;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs><rect width="800" height="480" rx="28" fill="url(#g)"/><g fill="none" stroke="#fff" opacity=".12"><circle cx="${600-variant%4*50}" cy="120" r="230"/><circle cx="160" cy="400" r="180"/><path d="M0 360 800 100M0 400 800 140"/></g><g transform="translate(304 144) scale(8)" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${motif}"/></g></svg>`;
}
export function applyProfileVisuals(data,analysis){
  const theme=analysis?.visualTheme||'general',icon=(THEMES[theme]||THEMES.general).icon;
  // SVG artwork is declarative and generated from an allowlisted semantic theme;
  // never execute model SVG/HTML or replace an uploaded photo/logo.
  data.metadata.visuals={theme,industry:String(analysis?.industry||'')};
  data.skills.categories.forEach(category=>{category.icon||=icon;category.skills.forEach(skill=>{skill.icon||=icon;});});
  data.projects.items.forEach((project,i)=>{project.imageIcon||=icon;if(!project.image&&!project.cardImage){project.generatedVisual={theme,variant:i};}});
  return data;
}
export function generatedImage(value){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(illustrationSvg(value?.theme,value?.variant));}
