import { safeUrl } from './admin/data-model.js';

export function profilePhotoAssets(source) {
  const src=safeUrl(source,{image:true});
  if(src==='image/1217VUTP0792.JPG')return {
    src:'image/avatar-640.jpg',
    srcset:'image/avatar-320.jpg 320w, image/avatar-640.jpg 640w',
    webp:'image/avatar-320.webp 320w, image/avatar-640.webp 640w'
  };
  return {src,srcset:'',webp:''};
}

export function educationLogo(degree) {
  // An explicit empty value means the administrator removed the logo.
  if(Object.hasOwn(degree,'logo'))return safeUrl(degree.logo,{image:true});
  return /HUIT|HUFI|Ho Chi Minh City University of (?:Industry and Trade|Food Industry)|Công Thương/i.test(degree.institution||'')?'image/HUIT.svg':'';
}

export function projectCardImage(project) {
  const company=[project.title,project.detailClient,project.company].filter(Boolean).join(' ');
  if(/silicon\s*stack/i.test(company))return 'image/SS1.png';
  if(/kraft\s*heinz/i.test(company))return 'image/KraftHeinz.webp';
  return safeUrl(project.cardImage||project.image,{image:true});
}
