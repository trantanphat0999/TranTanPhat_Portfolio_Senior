import {candidateFields,applyProposal,validateEvidenceText} from './proposal.js';
import {validateStructured,TASK_SCHEMAS} from '../ai/tasks.js';

export const JD_LIMIT=30000;
export function preparationOptions(value={}){
  const answerLanguage=value.answerLanguage||'vi',questionCount=Number(value.questionCount||12);
  if(!['vi','en'].includes(answerLanguage)||![8,12,16].includes(questionCount))throw new Error('Chọn ngôn ngữ và số câu hỏi hợp lệ.');
  return {answerLanguage,questionCount};
}
export function validateJd(value){
  if(typeof value!=='string'||value.trim().length<30)throw new Error('Hãy nhập JD ít nhất 30 ký tự để xác định yêu cầu và keyword.');
  if(value.length>JD_LIMIT)throw new Error('JD tối đa 30.000 ký tự. Hãy rút gọn phần không liên quan; nội dung không được cắt ngầm.');
  return value.trim();
}
const idPattern=/^[a-zA-Z0-9_-]{1,80}$/;
const normalize=value=>value.normalize('NFC').replace(/\s+/g,' ').trim();
const editable=new Set(['summary','paragraph','bullet','skills']);
export const suggestionOperation=item=>({type:'rewriteField',key:item.key,value:item.text,sourceKeys:item.sourceKeys,reason:item.reason});
export function validatePreparation(value,{draft,evidence,options}){
  validateStructured(value,TASK_SCHEMAS['jd-preparation']);
  options=preparationOptions(options);const jd=normalize(validateJd(draft.job)),packet=structuredClone(value),warnings=[];
  const input=candidateFields(draft),sources=new Map(evidence.map(field=>[field.key,field]));
  const keywordIds=new Set(),questionIds=new Set();
  if(!packet.keywords.length||packet.keywords.length>25)throw new Error('AI phải cung cấp từ 1 đến 25 keyword trọng tâm.');
  if(packet.questions.length<3||packet.questions.length>options.questionCount)throw new Error('Số câu hỏi AI trả về không đúng giới hạn đã chọn.');
  const checkSources=keys=>{if(keys.some(key=>!sources.has(key)))throw new Error('AI tham chiếu dữ kiện không tồn tại. Hãy tạo lại bộ chuẩn bị.');};
  for(const keyword of packet.keywords){
    if(!idPattern.test(keyword.id)||keywordIds.has(keyword.id)||!keyword.keyword.trim()||!keyword.requirement.trim())throw new Error('Keyword ID hoặc nội dung không hợp lệ.');
    if(!jd.includes(normalize(keyword.keyword)))throw new Error('AI đưa keyword không có trong JD. Hãy tạo lại.');
    keywordIds.add(keyword.id);checkSources(keyword.sourceKeys);
    if(keyword.status==='matched'&&!keyword.sourceKeys.length){keyword.status='unknown';warnings.push(`“${keyword.keyword}” chưa có nguồn, được đánh dấu chưa rõ.`);}
  }
  const checkKeywords=ids=>{if(!ids.length||ids.some(id=>!keywordIds.has(id)))throw new Error('Đề xuất hoặc câu hỏi không bám vào keyword của JD.');};
  const seen=new Set(),valid=[];
  if(packet.suggestions.length>12)throw new Error('AI trả quá nhiều thay đổi CV trong một lượt.');
  for(const item of packet.suggestions){
    try{
      checkSources(item.sourceKeys);checkKeywords(item.keywordIds);
      if(!item.reason.trim()||seen.has(item.key)||!input.some(field=>field.key===item.key&&editable.has(field.kind)))throw new Error('Trường này không được AI viết lại hoặc bị trùng.');
      applyProposal(draft,[suggestionOperation(item)],evidence);
      seen.add(item.key);valid.push(item);
    }catch(error){warnings.push(`Bỏ đề xuất ${item.key}: ${error.message}`);}
  }
  packet.suggestions=valid;
  for(const question of packet.questions){
    if(!idPattern.test(question.id)||questionIds.has(question.id)||!question.question.trim()||!question.answer.trim()||question.answer.length>4000||question.talkingPoints.length<1||question.talkingPoints.length>6||question.followUps.length>3)throw new Error('Câu hỏi hoặc câu trả lời AI chưa đầy đủ.');
    questionIds.add(question.id);checkSources(question.sourceKeys);checkKeywords(question.keywordIds);
    if(question.answerType==='evidence'&&!question.sourceKeys.length)throw new Error('Câu trả lời về kinh nghiệm thực tế phải có nguồn CV.');
    if(question.answerType==='evidence')validateEvidenceText([question.answer,...question.talkingPoints].join(' '),question.sourceKeys.map(key=>sources.get(key).text).join(' '));
    if(question.answerType==='hypothetical'&&!question.caution.trim())throw new Error('Câu trả lời giả định phải nêu rõ phần cần cá nhân hóa.');
  }
  if(!packet.summary.trim()||packet.studyPlan.length>10)throw new Error('Bản tóm tắt hoặc kế hoạch ôn tập không hợp lệ.');
  return {packet,warnings};
}
export function preparationBinding(draft,careerRevision=0){
  return JSON.stringify({job:draft.job,fields:candidateFields(draft).map(({key,text,kind})=>({key,text,kind})),source:draft.fields,config:draft.config,style:draft.style,contextIds:draft.contextIds||[],careerRevision});
}
export async function preparationHash(value){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value)));
  return [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
}
export function savedPreparation(value){
  if(!value)return null;
  if(value.version!==1||!idPattern.test(value.id)||!Array.isArray(value.evidence)||!Array.isArray(value.before)||!Array.isArray(value.warnings)||!Array.isArray(value.studiedIds)||!value.aiMeta||typeof value.jobDescription!=='string'||typeof value.generatedAt!=='string'||typeof value.provider!=='string'||typeof value.model!=='string'||!Array.isArray(value.contextIds)||!Number.isFinite(value.careerRevision)||!/^[a-f0-9]{64}$/.test(value.basis||'')||!/^[a-f0-9]{64}$/.test(value.sourceHash||''))throw new Error('Bộ chuẩn bị đã lưu không hợp lệ. Hãy tạo lại từ JD.');
  preparationOptions(value.options);validateStructured(value.packet,TASK_SCHEMAS['jd-preparation']);
  if(value.evidence.some(field=>typeof field?.key!=='string'||typeof field?.text!=='string')||value.before.some(field=>typeof field?.key!=='string'||typeof field?.text!=='string'))throw new Error('Nguồn dữ kiện đã lưu không hợp lệ.');
  const ids=new Set(value.packet.questions.map(x=>x.id));
  return {...structuredClone(value),studiedIds:[...new Set((value.studiedIds||[]).filter(id=>ids.has(id)))]};
}
export function preparationMarkdown(pack,{stale=false}={}){
  const {packet,options}=pack,keywords=new Map(packet.keywords.map(x=>[x.id,x.keyword]));
  const refs=ids=>ids.map(id=>keywords.get(id)||id).join(', ');
  return [`# Bộ chuẩn bị ứng tuyển theo JD`,stale?'⚠ JD / CV / nguồn dữ liệu đã thay đổi. Đây là bộ kết quả đã lưu trước đó.':'',`Ngôn ngữ: ${options.answerLanguage} · Tạo lúc: ${pack.generatedAt}`,`Provider: ${pack.provider} / ${pack.model}`,'## Tóm tắt',packet.summary,'## Keyword và bằng chứng',...packet.keywords.map(x=>`- **${x.keyword}** (${x.priority}; ${x.status}): ${x.requirement}\n  ${x.reason}\n  Nguồn: ${x.sourceKeys.join(', ')||'Chưa có'}`),'## Đề xuất CV',...packet.suggestions.map(x=>`### ${x.key}\nKeyword: ${refs(x.keywordIds)}\n\n${x.text}\n\nLý do: ${x.reason}\nNguồn: ${x.sourceKeys.join(', ')}`),'## Phỏng vấn thử',...packet.questions.map((x,i)=>`### ${i+1}. ${x.question}\nNhóm: ${x.category} · Keyword: ${refs(x.keywordIds)}\nLoại: ${x.answerType==='evidence'?'Theo dữ kiện CV':'Phương án giả định, cần cá nhân hóa'}\n\n${x.answer}\n\nÝ chính:\n${x.talkingPoints.map(p=>'- '+p).join('\n')}\n\nCâu hỏi đào sâu:\n${x.followUps.map(p=>'- '+p).join('\n')}\n\n${x.caution}\nNguồn: ${x.sourceKeys.join(', ')||'Kiến thức tham khảo / chưa có bằng chứng kinh nghiệm'}`),'## Ưu tiên ôn tập',...packet.studyPlan.map(x=>'- '+x),'## JD nguồn (riêng tư)',pack.jobDescription].filter(Boolean).join('\n\n');
}
