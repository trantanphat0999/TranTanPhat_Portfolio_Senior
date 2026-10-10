import test from 'node:test';
import assert from 'node:assert/strict';
import { educationLogo, projectCardImage } from '../js/portfolio-media.js';
import { validateItem } from '../js/admin/data-model.js';

test('Legacy HUIT degrees get their logo; explicit removal and other schools do not',()=>{
  const degree={institution:'Ho Chi Minh City University of Industry and Trade'};
  assert.equal(educationLogo(degree),'image/HUIT.svg');
  assert.equal(educationLogo({...degree,logo:''}),'');
  assert.equal(educationLogo({...degree,logo:'image/SS1.png'}),'image/SS1.png');
  assert.equal(educationLogo({institution:'Another university'}),'');
  assert.equal(educationLogo({...degree,logo:'javascript:alert(1)'}),'');
  assert.throws(()=>validateItem('education',{title:'Degree',institution:'University',period:'2026',logo:'javascript:alert(1)'}),/logo/);
});

test('Company project cards are independent of their detail images',()=>{
  assert.equal(projectCardImage({title:'CRM - SiliconStack',image:'image/CRM.png'}),'image/SS1.png');
  assert.equal(projectCardImage({title:'Time Keeper - Silicon Stack',image:'image/TKP.png'}),'image/SS1.png');
  assert.equal(projectCardImage({title:'Project',detailClient:'Kraft Heinz Company',image:'image/SCbanner.png'}),'image/KraftHeinz.webp');
  assert.equal(projectCardImage({title:'Independent project',image:'image/TKP.png'}),'image/TKP.png');
});
