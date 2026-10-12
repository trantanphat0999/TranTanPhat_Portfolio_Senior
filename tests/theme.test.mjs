import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_THEME,THEME_PALETTES,normalizeTheme,themeTokens,contrastRatio,hslHex,hexHsl} from '../js/portfolio/theme.js';
import {partitionSkills,aiSkillCardMarkup} from '../js/portfolio/skill-presentation.js';
import {getSeedPortfolioData} from '../js/db-seed.js';
import {emptyPortfolio,validatePortfolio} from '../js/portfolio/profile-model.js';

test('Theme schema accepts canonical HEX only, rejects CSS injection and survives profile archives',()=>{
 assert.deepEqual(normalizeTheme(undefined),DEFAULT_THEME);
 const profile=emptyPortfolio();profile.header.name='Owner';profile.metadata.theme=THEME_PALETTES[1].theme;
 assert.deepEqual(validatePortfolio(profile).metadata.theme,profile.metadata.theme);
 for(const color of ['red','#123','var(--secret)','url(https://evil.example)','#fff;display:none'])assert.throws(()=>normalizeTheme({version:1,colors:{...DEFAULT_THEME.colors,primary:color}}));
 assert.throws(()=>normalizeTheme({version:2,colors:DEFAULT_THEME.colors}));
});
test('Every palette and extreme custom colors get readable surface/page text, buttons, links and input borders',()=>{
 const extremes=['#ffffff','#000000','#777777','#ffff00','#00ff00'].map(color=>({version:1,colors:{primary:color,accent:color,background:color,surface:color,text:color,border:color}}));
 for(const theme of [...THEME_PALETTES.map(p=>p.theme),...extremes]){
  const t=themeTokens(theme),c=theme.colors;
  for(const [ink,bg,target]of [[t['--theme-ink'],c.surface,4.5],[t['--theme-page-ink'],c.background,4.5],[t['--theme-muted'],c.surface,4.5],[t['--theme-brand-ink'],c.surface,4.5],[t['--theme-on-primary'],c.primary,4.5],[t['--theme-on-accent'],c.accent,4.5],[t['--theme-control-border'],c.surface,3]])assert.ok(contrastRatio(ink,bg)>=target,`${ink} on ${bg}`);
  for(const ink of [t['--theme-ink'],t['--theme-muted'],t['--theme-brand-ink']])assert.ok(contrastRatio(ink,t['--theme-tint'])>=4.5);
 }
});
test('HSL sliders preserve the chosen color with bounded rounding',()=>{
 for(const color of ['#ff0000','#00ff00','#0000ff','#ffffff','#000000','#2563eb','#047857']){
  const hsl=hexHsl(color),roundtrip=hslHex(hsl.h,hsl.s,hsl.l);
  for(const index of [1,3,5])assert.ok(Math.abs(parseInt(color.slice(index,index+2),16)-parseInt(roundtrip.slice(index,index+2),16))<=4);
 }
});
test('AI skills get one separate card without mutating persisted fields/IDs or moving API/non-AI tools',()=>{
 const source=getSeedPortfolioData().skills.categories,original=JSON.stringify(source),grouped=partitionSkills(source);
 assert.equal(JSON.stringify(source),original);assert.equal(grouped.ai.length,5);
 assert.ok(grouped.ai.some(skill=>skill.title.includes('ChatGPT')));assert.ok(grouped.core.some(category=>category.skills.some(skill=>skill.title==='API Testing')));
 assert.ok(grouped.core.some(category=>category.skills.some(skill=>skill.title.includes('n8n'))));
 assert.ok(!grouped.core.some(category=>category.skills.some(skill=>skill.title.includes('ChatGPT'))));
 const markup=aiSkillCardMarkup(grouped);assert.match(markup,/ai-skills-studio.png/);assert.match(markup,/loading="lazy"/);
 assert.equal(aiSkillCardMarkup(partitionSkills([{name:'Other',skills:[{title:'SQL',desc:'Queries'}]}])), '');
 assert.ok(!aiSkillCardMarkup({ai:[{title:'<script>bad</script>',desc:'<img src=x>'}],name:'<script>Title</script>'}).includes('<script>'));
});
