const copy = value => JSON.parse(JSON.stringify(value));
export const STYLE_BOUNDS = {fontSize:[10,12.5],lineHeight:[1.12,1.7],margin:[36,56.7],sectionSpacing:[5,16],itemSpacing:[2,12],bulletSpacing:[1,6]};
export const defaultConfig = () => ({configVersion:1,sectionOrder:[],groupOrder:[],headingLabels:{},contactLabels:{},preset:'custom',language:'en',targetRole:''});
export function normalizeConfig(value={}) {
  if(value.configVersion!==undefined&&value.configVersion!==1)throw new Error('Unsupported CV config version.');
  const result={...defaultConfig(),...copy(value)};
  for(const key of Object.keys(result))if(!Object.hasOwn(defaultConfig(),key))throw new Error(`Unsupported config: ${key}`);
  for(const key of ['sectionOrder','groupOrder'])if(!Array.isArray(result[key])||result[key].length>200||result[key].some(x=>typeof x!=='string')||new Set(result[key]).size!==result[key].length)throw new Error(`Invalid ${key}`);
  for(const key of ['headingLabels','contactLabels']){
    if(!result[key]||typeof result[key]!=='object'||Array.isArray(result[key]))throw new Error(`Invalid ${key}`);
    for(const [id,label] of Object.entries(result[key]))if(['__proto__','constructor','prototype'].includes(id)||typeof label!=='string'||!label.trim()||label.length>100)throw new Error(`Invalid label: ${id}`);
  }
  if(!['custom','senior-qa','full'].includes(result.preset)||!['en','vi'].includes(result.language)||typeof result.targetRole!=='string'||result.targetRole.length>200)throw new Error('Invalid CV preset, language or target role.');
  return result;
}
export function normalizeStyle(style={}) {
  const defaults={fontFamily:'Roboto',fontSize:10.5,lineHeight:1.2,margin:45.35,pageLimit:2,rendererVersion:2,sectionSpacing:9,itemSpacing:6,bulletSpacing:2,headerAlignment:'center',datePlacement:'stacked'};
  for(const key of Object.keys(style))if(!Object.hasOwn(defaults,key)&&!['locked','renderConfig'].includes(key))throw new Error(`Unsupported CV style: ${key}`);
  const result={...defaults,...copy(style)};
  if(!['Roboto','NotoSerif'].includes(result.fontFamily))throw new Error('Unsupported CV font.');
  for(const [key,[min,max]] of Object.entries(STYLE_BOUNDS))if(!Number.isFinite(result[key])||result[key]<min||result[key]>max)throw new Error(`${key} must be between ${min} and ${max}.`);
  if(![0,1,2,3,4].includes(result.pageLimit)||![1,2].includes(result.rendererVersion))throw new Error('Invalid page target or renderer.');
  if(result.headerAlignment!==undefined&&!['left','center'].includes(result.headerAlignment))throw new Error('Invalid header alignment.');
  if(result.datePlacement!==undefined&&!['stacked','inline'].includes(result.datePlacement))throw new Error('Invalid date placement.');
  if(result.renderConfig)result.renderConfig=normalizeConfig(result.renderConfig);
  return result;
}
export function arrangeFields(fields, value={}) {
  const config=normalizeConfig(value),sections=['Header',...config.sectionOrder.filter(x=>x!=='Header'),...new Set(fields.map(x=>x.section).filter(x=>x!=='Header'&&!config.sectionOrder.includes(x)))];
  return sections.flatMap(section=>{
    const rows=fields.filter(x=>x.section===section),groups=[...new Set(rows.map(x=>x.group||x.key))];
    if(section==='Header')return rows;
    const order=[...config.groupOrder.filter(x=>groups.includes(x)),...groups.filter(x=>!config.groupOrder.includes(x))];
    return order.flatMap(group=>rows.filter(x=>(x.group||x.key)===group));
  });
}
export function validateIdentity(fields) {
  for(const key of ['name','role','contact.email'])if(!fields.some(x=>x.key===key&&x.text?.trim()))throw new Error(`Required CV field: ${key}`);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.find(x=>x.key==='contact.email').text))throw new Error('A valid contact email is required.');
}
