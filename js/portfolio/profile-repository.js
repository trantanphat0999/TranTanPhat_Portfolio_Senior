import {PROFILE_SECTIONS, emptyPortfolio, profileSummary, validatePortfolio} from './profile-model.js';

const checkId=id=>{if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('Profile ID không hợp lệ.');};
const manifestId=id=>`profile-${id}`;
const sectionId=(id,key)=>`${manifestId(id)}-${key}`;
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
function checkSize(value){if(bytes(value)>900000)throw new Error('Dữ liệu vượt dung lượng lưu trữ. Dùng URL cho ảnh lớn; dữ liệu hiện tại chưa bị thay đổi.');}
function indexEntry(profile){return {id:profile.id,name:profile.name,createdAt:profile.createdAt,kind:profile.kind,summary:profileSummary(profile.data||{}),industry:profile.analysis?.industry||''};}
function addEntry(index,entry){if(index.items.length>=2000)throw new Error('Thư viện có 2.000 profile. Xuất và xóa profile không cần trước khi tiếp tục.');index.items.unshift(entry);checkSize(index);}
export function createProfileRepository({get,transaction,assertOwner,pending=()=>[],fallback=()=>emptyPortfolio(),committed=()=>{}}){
  const ref=(collection,id)=>({collection,id});
  const admin=id=>ref('admin',id),publicRef=key=>ref('portfolio',key);
  const requireOnline=()=>{assertOwner();if(pending().length)throw new Error('Hãy đồng bộ hoặc xử lý thay đổi đang chờ trước khi quản lý profile.');};
  function writeProfile(tx,profile){
    const {data,...manifest}=profile;checkSize(manifest);tx.set(admin(manifestId(profile.id)),manifest);
    for(const key of PROFILE_SECTIONS){const value=data[key]||emptyPortfolio()[key];checkSize(value);tx.set(admin(sectionId(profile.id,key)),value);}
    if(data.cv){checkSize(data.cv);tx.set(admin(sectionId(profile.id,'cv')),data.cv);}
  }
  return {
    async list(){assertOwner();const index=await get(admin('profile-library'))||{version:1,items:[],activeId:null,_revision:0};assertOwner();return index;},
    async read(id){assertOwner();checkId(id);const manifest=await get(admin(manifestId(id)));if(!manifest)throw new Error('Profile đã bị xóa. Hãy tải lại thư viện.');const keys=[...PROFILE_SECTIONS,'cv'];const values=await Promise.all(keys.map(key=>get(admin(sectionId(id,key)))));assertOwner();return {...manifest,data:Object.fromEntries(keys.flatMap((key,i)=>values[i]?[[key,values[i]]]:[]))};},
    async save({name,data,source=null,analysis=null,kind='manual'}){
      requireOnline();name=String(name||'').trim();if(!name||name.length>120)throw new Error('Tên profile từ 1 đến 120 ký tự.');
      const cv=data?.cv;data=validatePortfolio(data);if(cv)data.cv=structuredClone(cv);const profile={id:crypto.randomUUID(),name,data,source,analysis,kind,createdAt:new Date().toISOString()};
      await transaction(async tx=>{const index=await tx.get(admin('profile-library'))||{version:1,items:[],activeId:null,_revision:0};requireOnline();addEntry(index,indexEntry(profile));writeProfile(tx,profile);tx.set(admin('profile-library'),{...index,_revision:Number(index._revision||0)+1});});return profile;
    },
    async rename(id,name){requireOnline();checkId(id);name=String(name||'').trim();if(!name||name.length>120)throw new Error('Tên profile từ 1 đến 120 ký tự.');await transaction(async tx=>{const index=await tx.get(admin('profile-library')),profile=await tx.get(admin(manifestId(id)));if(!profile||!index?.items.some(x=>x.id===id))throw new Error('Profile đã bị xóa.');profile.name=name;index.items.find(x=>x.id===id).name=name;tx.set(admin(manifestId(id)),profile);tx.set(admin('profile-library'),{...index,_revision:Number(index._revision||0)+1});});},
    async remove(id){requireOnline();checkId(id);await transaction(async tx=>{const index=await tx.get(admin('profile-library'));if(index?.activeId===id)throw new Error('Không thể xóa profile đang dùng. Chuyển profile trước.');if(!index?.items.some(x=>x.id===id))throw new Error('Profile đã bị xóa.');index.items=index.items.filter(x=>x.id!==id);tx.delete(admin(manifestId(id)));for(const key of [...PROFILE_SECTIONS,'cv'])tx.delete(admin(sectionId(id,key)));tx.set(admin('profile-library'),{...index,_revision:Number(index._revision||0)+1});});},
    async activate(id,expectedCurrent){
      requireOnline();checkId(id);
      const backupId=crypto.randomUUID(),createdAt=new Date().toISOString(),local=fallback();
      const saved=await transaction(async tx=>{
        const index=await tx.get(admin('profile-library')),manifest=await tx.get(admin(manifestId(id)));
        if(!manifest||!index?.items.some(x=>x.id===id))throw new Error('Profile đã bị xóa.');
        const previous=index.activeId&&index.activeId!==id?await tx.get(admin(manifestId(index.activeId))):null;
        const target={},current={};
        // Read every participating document before the first write. Firestore
        // retries this transaction on concurrent edits; expected revisions then
        // stop a stale preview from replacing newer data.
        for(const key of PROFILE_SECTIONS){
          target[key]=await tx.get(admin(sectionId(id,key)));
          const value=await tx.get(publicRef(key));
          if(Number(value?._revision||0)!==Number(expectedCurrent?.[key]?._revision||0))throw new Error('Portfolio đã thay đổi từ lúc review. Tải lại và kiểm tra trước khi kích hoạt.');
          current[key]=value||local[key]||emptyPortfolio()[key];
        }
        const cv=await tx.get(publicRef('cv'));if(cv)current.cv=cv;
        requireOnline();
        validatePortfolio(target);
        const backup={id:backupId,name:`${current.header?.name||'Portfolio'} · trước khi chuyển`,kind:'backup',createdAt,data:current,source:null,analysis:null};
        addEntry(index,indexEntry(backup));writeProfile(tx,backup);
        // Keep the outgoing named profile up to date as well as retaining its
        // immutable pre-switch backup, so selecting its name restores edits.
        if(previous){const outgoing={...previous,data:current};writeProfile(tx,outgoing);const entry=index.items.find(x=>x.id===previous.id);if(entry)entry.summary=profileSummary(current);}
        for(const key of PROFILE_SECTIONS){
          const next={...target[key],_revision:Number(current[key]?._revision||0)+1};
          if(key==='metadata')Object.assign(next,{activeProfileId:id,lastUpdatedAt:createdAt,lastUpdatedSection:'profile-switch'});
          tx.set(publicRef(key),next);target[key]=next;
        }
        tx.set(admin('profile-library'),{...index,activeId:id,_revision:Number(index._revision||0)+1});
        return {data:target,backupId};
      });
      await committed(saved.data);return saved;
    },
  };
}
