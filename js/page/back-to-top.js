document.addEventListener('DOMContentLoaded',()=>{
  const button=document.getElementById('back-to-top');
  if(!button)return;
  const icon=button.querySelector('i');
  let scheduled=false,followBottom=false;
  function update(){
    scheduled=false;
    const maximum=Math.max(0,document.documentElement.scrollHeight-innerHeight);
    const direction=maximum&&scrollY<maximum/2?'down':'up';
    button.classList.toggle('visible',maximum>0);
    if(button.dataset.direction===direction)return;
    button.dataset.direction=direction;
    const label=direction==='down'?'Go to bottom':'Back to top';
    button.setAttribute('aria-label',label);button.title=label;
    icon.className=`ri-arrow-${direction}-line ri-lg`;
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  function reflow(){
    if(followBottom)window.scrollTo({top:document.documentElement.scrollHeight-innerHeight,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    schedule();
  }
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',reflow,{passive:true});
  new ResizeObserver(reflow).observe(document.body);
  for(const type of ['wheel','pointerdown','touchstart','keydown'])addEventListener(type,()=>{followBottom=false;},{passive:true});
  addEventListener('click',event=>{if(!button.contains(event.target))followBottom=false;});
  button.addEventListener('click',()=>{
    update();
    const top=button.dataset.direction==='down'?document.documentElement.scrollHeight-innerHeight:0;
    followBottom=button.dataset.direction==='down';
    window.scrollTo({top,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
  update();
});
