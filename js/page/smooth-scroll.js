/* Ease discrete mouse-wheel steps; precision trackpads and nested panels keep
   their native scrolling. Never intercept zoom, horizontal gestures or touch. */
(function(){
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,target=0,previousTime=0;
  const maximum=()=>Math.max(0,document.documentElement.scrollHeight-innerHeight);
  function stop(){cancelAnimationFrame(frame);frame=0;previousTime=0;}
  function animate(time){
    const elapsed=previousTime?Math.min(50,time-previousTime):16;
    previousTime=time;target=Math.max(0,Math.min(maximum(),target));
    const delta=target-scrollY;
    window.scrollTo({top:Math.abs(delta)<.75?target:scrollY+delta*(1-Math.exp(-elapsed/85)),behavior:'instant'});
    if(Math.abs(target-scrollY)<1){stop();return;}
    frame=requestAnimationFrame(animate);
  }
  addEventListener('wheel',event=>{
    if(event.defaultPrevented||!event.cancelable||reducedMotion.matches||event.ctrlKey||event.metaKey||event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
    if(event.deltaMode===0&&(Math.abs(event.deltaY)<60||!Number.isInteger(event.deltaY)))return;
    let element=event.target instanceof Element?event.target:null;
    if(element?.closest('input,textarea,select,[contenteditable="true"],.modal,.am-overlay,#lightbox-overlay,#profile-modal-overlay'))return;
    for(;element&&element!==document.body;element=element.parentElement){
      if(element.scrollHeight>element.clientHeight+1&&/(auto|scroll)/.test(getComputedStyle(element).overflowY))return;
    }
    const delta=event.deltaY*(event.deltaMode===1?20:event.deltaMode===2?innerHeight:1);
    if(!delta||!maximum())return;
    event.preventDefault();
    if(!frame)target=scrollY;
    target=Math.max(0,Math.min(maximum(),target+delta));
    if(!frame)frame=requestAnimationFrame(animate);
  },{passive:false});
  for(const type of ['pointerdown','touchstart','keydown','resize'])addEventListener(type,stop,{passive:true});
  addEventListener('click',stop,{capture:true,passive:true});
  reducedMotion.addEventListener('change',stop);
})();
