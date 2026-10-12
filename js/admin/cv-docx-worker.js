// Text only: no HTML conversion, image loading or external relationships.
importScripts('/vendor/mammoth.browser.min.js');
self.onmessage=async event=>{
  try{const result=await self.mammoth.extractRawText({arrayBuffer:event.data});self.postMessage({text:result.value,warnings:result.messages.map(message=>message.message)});}
  catch{self.postMessage({error:'Không thể đọc DOCX. Kiểm tra file hoặc xuất lại thành Markdown.'});}
};
