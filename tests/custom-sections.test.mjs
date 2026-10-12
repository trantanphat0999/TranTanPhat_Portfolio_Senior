import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {normalizeBlock,validateBlocks,publicBlocksDocument,customCvFields} from '../js/portfolio/custom-blocks.js';
import {validateGeneratedIcon,validateSectionFields} from '../js/portfolio/section-model.js';
import {blockMarkup,renderCustomBlocks} from '../js/portfolio/custom-renderer.js';
import {parseStructured} from '../js/ai/tasks.js';
import {validatePortfolio,emptyPortfolio} from '../js/portfolio/profile-model.js';
const icon={label:'Research',paths:['M 4 4 L 20 4 L 20 20 L 4 20 Z','M 8 8 L 16 8']};
const section=()=>normalizeBlock({id:'section-123',kind:'section',title:'Research',body:'Reviewed work',placement:'projects',showInNav:true,includeInCv:true,generatedIcon:icon,iconBrief:'PRIVATE_BRIEF',fields:[{id:'field-title',label:'Paper',type:'text',required:true,options:[]},{id:'field-link',label:'Evidence',type:'url',required:false,options:[]}],items:[{id:'item-paper',values:{'field-title':'System study','field-link':'https://example.com/research'}}]});

test('Custom sections preserve stable fields through rename/order, profile validation and private/public boundaries',()=>{
 const b=section(),keys=customCvFields({blocks:[b]}).map(field=>field.key);
 b.fields[0].label='Renamed paper';b.title='Renamed section';b.fields.reverse();
 assert.deepEqual(customCvFields({blocks:[b]}).map(field=>field.key).sort(),keys.sort());
 const doc=publicBlocksDocument([b,{...b,id:'private-123',visibility:'private',body:'PRIVATE_DATA'}]);
 assert.equal(doc.blocks.length,1);assert.ok(!JSON.stringify(doc).includes('PRIVATE_'));
 const profile=emptyPortfolio();profile.header.name='Owner';profile['custom-blocks']=doc;
 assert.equal(validatePortfolio(profile)['custom-blocks'].blocks[0].fields[0].id,'field-link');
 assert.equal(customCvFields({blocks:[{...b,visibility:'private'}]}).length,0);
 assert.equal(customCvFields({blocks:[{...b,status:'inactive'}]}).length,0);
});
test('Publication requires custom schema, required values and a reviewed generated icon',()=>{
 const b=section();assert.equal(validateBlocks([b]).length,1);
 assert.throws(()=>validateBlocks([{...b,generatedIcon:null}]),/AI icon/);
 assert.throws(()=>validateBlocks([{...b,fields:[]}]),/unknown field|at least one/);
 assert.throws(()=>validateBlocks([{...b,items:[{...b.items[0],values:{}}]}]),/required/);
 assert.throws(()=>validateBlocks([{...b,fields:[...b.fields,b.fields[0]]}]),/unique/);
 assert.throws(()=>validateSectionFields(b.fields,[{values:{unknown:'lost data'}}]),/unknown/);
});
test('Typed values validate numbers, calendar dates, links, email, choices and checkbox false',()=>{
 const check=(type,value,extra={})=>validateSectionFields([{id:'field-type',label:'Typed field',type,required:true,options:[],...extra}],[{values:{'field-type':value}}]);
 for(const [type,value]of [['number','-1.5'],['date','2024-02-29'],['url','https://example.com'],['email','owner@example.com'],['boolean',false],['tags','QA, API']])assert.doesNotThrow(()=>check(type,value));
 for(const [type,value]of [['number','Infinity'],['number','1e999'],['date','2025-02-29'],['url','javascript:alert(1)'],['email','bad'],['boolean','true']])assert.throws(()=>check(type,value));
 assert.doesNotThrow(()=>check('select','One',{options:['One','Two']}));assert.throws(()=>check('select','Three',{options:['One','Two']}));
});
test('AI icons accept bounded vector geometry and reject markup, attributes, unsupported commands and oversized output',()=>{
 assert.deepEqual(validateGeneratedIcon(icon),icon);
 assert.ok(parseStructured(JSON.stringify({...icon,reason:'Meaningful'}),'icon-create').paths.length);
 for(const paths of [['M 2 2 L 40 40'],['<script>alert(1)</script>'],['M 2 2" onload="alert(1)'],['M 2 2 A 2 2 0 0 1 4 4'],['M 2 2 3 3'],['M'],Array(13).fill('M 2 2 L 3 3')])assert.throws(()=>validateGeneratedIcon({paths}));
});
test('Public renderer creates independent ordered sections/nav, escapes values and cleans hidden/deleted sections',()=>{
 const dom=new JSDOM('<nav><div><button class="nav-link" data-target="projects">Projects</button></div></nav><main><section id="projects"></section><section id="contact"></section></main>');
 const oldDocument=globalThis.document,oldWindow=globalThis.window,oldEvent=globalThis.Event;
 globalThis.document=dom.window.document;globalThis.window=dom.window;globalThis.Event=dom.window.Event;
 try{
  const b=section();b.items[0].values['field-title']='<img src=x onerror=alert(1)>';
  assert.ok(!blockMarkup(b).includes('<img'));
  renderCustomBlocks({blocks:[b,{...b,id:'section-456',title:'Second'}, {...b,id:'private-456',visibility:'private'}]});
  assert.deepEqual([...document.querySelectorAll('[data-dynamic-section]')].map(node=>node.dataset.dynamicSection),['section-123','section-456']);
  assert.equal(document.getElementById('projects').nextElementSibling.id,'portfolio-section-section-123');
  assert.equal(document.querySelectorAll('[data-dynamic-nav]').length,2);
  assert.match(document.querySelector('[data-dynamic-section]').textContent,/<img/);assert.equal(document.querySelector('[data-dynamic-section] img'),null);
  renderCustomBlocks({blocks:[{...b,id:'broken-123',fields:{}},b]});assert.equal(document.querySelectorAll('[data-dynamic-section]').length,1);
  renderCustomBlocks({blocks:[{...b,status:'inactive'}]});assert.equal(document.querySelectorAll('[data-dynamic-section],[data-dynamic-nav]').length,0);
 }finally{globalThis.document=oldDocument;globalThis.window=oldWindow;globalThis.Event=oldEvent;dom.window.close();}
});
