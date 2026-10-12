import {validateSource} from '../portfolio/profile-model.js';
export const MAX_CV_BYTES=10*1024*1024;
export function inspectDocxBuffer(buffer){
  const view=new DataView(buffer);let end=-1;
  for(let i=view.byteLength-22;i>=Math.max(0,view.byteLength-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
  if(end<0)throw new Error('File DOCX không hợp lệ.');
  const entries=view.getUint16(end+10,true);let offset=view.getUint32(end+16,true),total=0;
  if(entries>1000||offset>=view.byteLength)throw new Error('DOCX quá phức tạp hoặc dùng ZIP64. Hãy xuất lại file.');
  for(let i=0;i<entries;i++){
    if(offset+46>view.byteLength||view.getUint32(offset,true)!==0x02014b50)throw new Error('File DOCX bị hỏng.');
    const size=view.getUint32(offset+24,true);total+=size;
    if(size>10*1024*1024||total>30*1024*1024)throw new Error('DOCX vượt 30 MB sau giải nén. Hãy giảm ảnh hoặc xuất thành Markdown.');
    if(view.getUint16(offset+8,true)&1)throw new Error('DOCX có mật khẩu. Hãy xuất bản không mã hóa.');
    offset+=46+view.getUint16(offset+28,true)+view.getUint16(offset+30,true)+view.getUint16(offset+32,true);
  }
}
function docxText(buffer,signal){
  inspectDocxBuffer(buffer);
  return new Promise((resolve,reject)=>{
    const worker=new Worker('/js/admin/cv-docx-worker.js'),timer=setTimeout(()=>finish(new Error('Đọc DOCX quá lâu. Hãy xuất thành Markdown hoặc PDF văn bản.')),30000);
    function finish(error,result){clearTimeout(timer);signal?.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve(result);}
    const abort=()=>finish(new DOMException('Đã hủy đọc CV.','AbortError'));signal?.addEventListener('abort',abort,{once:true});
    worker.onmessage=event=>event.data.error?finish(new Error(event.data.error)):finish(null,event.data);worker.onerror=()=>finish(new Error('Không thể khởi động bộ đọc DOCX.'));
    if(signal?.aborted){abort();return;}const copy=buffer.slice(0);worker.postMessage(copy,[copy]);
  });
}
export async function extractCvFile(file,{signal,onProgress=()=>{}}={}){
  if(!file||!file.size)throw new Error('Hãy chọn file CV có nội dung.');
  if(file.size>MAX_CV_BYTES)throw new Error('File tối đa 10 MB.');
  const extension=file.name.split('.').pop().toLowerCase();
  if(!['pdf','docx','md'].includes(extension))throw new Error('Chỉ hỗ trợ PDF, DOCX và Markdown (.md).');
  const check=()=>{if(signal?.aborted)throw new DOMException('Đã hủy đọc CV.','AbortError');};
  check();onProgress('Đang đọc file trên thiết bị…');
  const buffer=await file.arrayBuffer();check();let text='',warnings=[];
  if(extension==='md')text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);
  if(extension==='docx'){
    if(new Uint8Array(buffer)[0]!==0x50||new Uint8Array(buffer)[1]!==0x4b)throw new Error('File DOCX không hợp lệ.');
    const result=await docxText(buffer,signal);text=result.text;warnings=result.warnings;
  }
  if(extension==='pdf'){
    if(!new TextDecoder().decode(buffer.slice(0,5)).startsWith('%PDF-'))throw new Error('File PDF không hợp lệ.');
    const pdfjs=await import('/vendor/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/vendor/pdf.worker.min.mjs';
    const task=pdfjs.getDocument({data:new Uint8Array(buffer),isEvalSupported:false});
    const abort=()=>{task.destroy().catch(()=>{});};signal?.addEventListener('abort',abort,{once:true});
    try{
      const pdf=await task.promise;check();if(pdf.numPages>40)throw new Error('CV tối đa 40 trang.');
      const pages=[];
      for(let i=1;i<=pdf.numPages;i++){
        check();onProgress(`Đang đọc PDF: ${i}/${pdf.numPages} trang…`);
        const page=await pdf.getPage(i),content=await page.getTextContent();
        pages.push(content.items.map(item=>item.str+(item.hasEOL?'\n':' ')).join(''));page.cleanup();
      }
      text=pages.join('\n\n');
      warnings.push('PDF nhiều cột có thể làm sai thứ tự đọc. Kiểm tra văn bản trước khi phân tích.');
    }finally{signal?.removeEventListener('abort',abort);await task.destroy();}
  }
  check();validateSource(text);
  const digest=await crypto.subtle.digest('SHA-256',buffer);
  return {text,name:file.name,type:extension,bytes:file.size,hash:[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join(''),warnings};
}
