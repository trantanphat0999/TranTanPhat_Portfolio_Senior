import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { BRANDS, brandsForLabel, semanticIcon, renderIcon, legacyName } from '../js/icons.js';

test('Product identities override unrelated legacy glyphs, without confusing GitHub Actions and GitHub',()=>{
  assert.deepEqual(brandsForLabel('Postman Tool'),['postman']);
  assert.deepEqual(brandsForLabel('GitHub Actions - CI/CD Automation'),['githubactions']);
  assert.deepEqual(brandsForLabel('GitHub'),['github']);
  assert.match(renderIcon('OWASP ZAP Tool','ri-shield-line'),/data-brand="zap"/);
  assert.match(renderIcon('AkaAT Studio','ri-macbook-line'),/data-brand="akaat"/);
  assert.deepEqual(brandsForLabel('Database — SQL / SQL Server'),['sqlserver']);
  assert.deepEqual(brandsForLabel('AI Tools - ChatGPT, Claude, Grok'),['chatgpt','claude','grok']);
});

test('Abstract QA concepts get functional symbols rather than invented company marks',()=>{
  for(const [label,name] of [['API Automation','api'],['Security Testing','security'],['CI/CD Pipeline Automation','cicd'],['Manual Testing','manual'],['UI Testing','ui'],['Team Mentorship','mentorship']]){
    assert.equal(semanticIcon(label),name);
    assert.doesNotMatch(renderIcon(label),/data-brand=/);
  }
  assert.match(renderIcon('GitHub Actions Pipeline','ri-git-branch-line',{brands:false}),/data-symbol="cicd"/);
});

test('Registry assets exist locally and label text cannot inject markup',()=>{
  for(const brand of Object.values(BRANDS))assert.ok(existsSync(new URL(`../image/tools/${brand.file}`,import.meta.url)),brand.file);
  const icon=renderIcon('Postman " onerror="alert(1) <script>', 'ri-send-plane-line');
  assert.doesNotMatch(icon,/<script>|data-icon-label="Postman " onerror/);
  assert.match(icon,/&lt;script&gt;/);
  assert.equal(legacyName('ri-arrow-up-s-line ri-lg'),'arrow-up-s');
  assert.equal(legacyName('ri-loader-4-line animate-spin'),'loader');
});

test('Every icon class currently used by the app can render as a local SVG or logo',()=>{
  const files=['../index.html','../js/admin/app.js','../js/admin/cv-tools.js','../js/admin/cv-export.js','../js/page/contact-form.js'];
  for(const file of files){
    const source=readFileSync(new URL(file,import.meta.url),'utf8');
    const icons=new Set(source.match(/ri-[a-z0-9-]+-(?:line|fill)/g));
    for(const name of icons)assert.match(renderIcon('',name),/<svg|<img/);
  }
});
