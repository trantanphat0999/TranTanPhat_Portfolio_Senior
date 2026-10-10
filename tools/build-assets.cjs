const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
execFileSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-c','tailwind.config.cjs','-i','css/tailwind.input.css','-o','css/tailwind.css','--minify'],{cwd:root,stdio:'inherit'});
const vendor=path.join(root,'vendor');fs.mkdirSync(vendor,{recursive:true});
for(const name of ['pdfmake.min.js','vfs_fonts.js'])fs.copyFileSync(require.resolve(`pdfmake/build/${name}`),path.join(vendor,name));
fs.copyFileSync(require.resolve('pdfmake/LICENSE'),path.join(vendor,'pdfmake-LICENSE.txt'));
for(const name of ['pdf.min.mjs','pdf.worker.min.mjs'])fs.copyFileSync(require.resolve(`pdfjs-dist/build/${name}`),path.join(vendor,name));
fs.copyFileSync(require.resolve('pdfjs-dist/LICENSE'),path.join(vendor,'pdfjs-LICENSE.txt'));
const fonts=require('pdfmake/build/vfs_fonts.js');
fs.mkdirSync(path.join(vendor,'fonts'),{recursive:true});
for(const [name,data] of Object.entries(fonts))fs.writeFileSync(path.join(vendor,'fonts',name),Buffer.from(data,'base64'));

const serif={};for(const name of fs.readdirSync(path.join(vendor,'fonts')))if(name.startsWith('NotoSerif-')&&name.endsWith('.ttf'))serif[name]=fs.readFileSync(path.join(vendor,'fonts',name)).toString('base64');
fs.writeFileSync(path.join(vendor,'noto_vfs.js'),'window.notoVfs='+JSON.stringify(serif)+';');
