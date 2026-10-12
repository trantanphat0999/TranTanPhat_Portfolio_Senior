document.addEventListener('DOMContentLoaded',()=>{
  const nav=document.querySelector('nav');let links=[];
  let positions=[],navHeight=0,maximum=0;
  const navOffset=()=>Number.parseFloat(nav?getComputedStyle(nav).top:'0')||0;
  let scheduled=false,activeSection=null,geometryDirty=true;
  function measure(){
    links=[...(nav?.querySelectorAll('.nav-link')||[])];
    navHeight=(nav?.offsetHeight||0)+navOffset()+16;
    maximum=Math.max(0,document.documentElement.scrollHeight-innerHeight);
    positions=links.map(link=>document.getElementById(link.dataset.target)).filter(Boolean)
      .map(section=>({id:section.id,top:section.getBoundingClientRect().top+scrollY})).sort((a,b)=>a.top-b.top);
    geometryDirty=false;
  }
  nav?.addEventListener('click',event=>{
    const link=event.target.closest('.nav-link');if(!link||!nav.contains(link))return;
    const target=document.getElementById(link.dataset.target);
    if(!target)return;
    event.preventDefault();
    const top=target.getBoundingClientRect().top+scrollY-(nav?.offsetHeight||0)-navOffset()-12;
    window.portfolioScroll.to(top);
  });
  function update(){
    scheduled=false;
    if(geometryDirty)measure();
    let current='';
    for(const section of positions)if(section.top<=scrollY+navHeight)current=section.id;
    if(maximum>0&&scrollY>=maximum-2)current=positions.at(-1)?.id||'';
    if(current===activeSection&&!links.some(link=>link.classList.contains('active')!==(link.dataset.target===current)))return;
    activeSection=current;
    links.forEach(link=>link.classList.toggle('active',link.dataset.target===current));
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  addEventListener('scroll',schedule,{passive:true});
  function invalidate(){geometryDirty=true;schedule();}
  addEventListener('resize',invalidate,{passive:true});
  addEventListener('portfolio:render',invalidate);
  document.addEventListener('load',invalidate,true);
  const observer=new ResizeObserver(invalidate);
  observer.observe(document.body);
  if(nav)observer.observe(nav);
  update();
});
