document.addEventListener('DOMContentLoaded',()=>{
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  if(window.AOS)AOS.init({disable:reducedMotion.matches,offset:100,once:true,duration:650,easing:'ease-out-cubic'});
  else document.querySelectorAll('[data-aos]').forEach(el=>{el.style.opacity='1';el.style.transform='none';});
  const nav=document.querySelector('nav'),links=[...document.querySelectorAll('.nav-link')];
  const sections=[...document.querySelectorAll('section[id]')];
  let scheduled=false,activeSection=null;
  links.forEach(link=>link.addEventListener('click',event=>{
    const target=document.getElementById(link.dataset.target);
    if(!target)return;
    event.preventDefault();
    const top=target.getBoundingClientRect().top+scrollY-(nav?.offsetHeight||0)-12;
    window.scrollTo({top,behavior:reducedMotion.matches?'instant':'smooth'});
  }));
  function update(){
    scheduled=false;
    const navHeight=(nav?.offsetHeight||0)+16;
    let current='';
    for(const section of sections)if(section.getBoundingClientRect().top<=navHeight)current=section.id;
    if(innerHeight+scrollY>=document.documentElement.scrollHeight-2)current=sections.at(-1)?.id||'';
    if(current===activeSection)return;
    activeSection=current;
    links.forEach(link=>link.classList.toggle('active',link.dataset.target===current));
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  update();
});
