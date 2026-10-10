import { safeUrl } from './admin/data-model.js';

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
