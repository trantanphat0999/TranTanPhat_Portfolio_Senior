/* Wheel/trackpad/touch keep browser-native scrolling. Smooth motion is reserved
   for explicit navigation and is interrupted by the user's next scroll input. */
(function(){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let navigating=false,fallback=0;
  function done(){navigating=false;clearTimeout(fallback);}
  function cancel(){
    if(!navigating)return;
    done();
    window.scrollTo({top:scrollY,left:scrollX,behavior:'instant'});
  }
  window.portfolioScroll={
    to(top){
      done();
      navigating=!reduced.matches;
      window.scrollTo({top,behavior:navigating?'smooth':'instant'});
      if(navigating)fallback=setTimeout(done,2000);
    },
    cancel
  };
  addEventListener('scrollend',done,{passive:true});
  addEventListener('wheel',event=>{if(!event.ctrlKey&&!event.metaKey)cancel();},{passive:true});
  for(const type of ['pointerdown','touchstart'])addEventListener(type,cancel,{passive:true});
  addEventListener('keydown',event=>{
    if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)&&
       !event.target.closest?.('input,textarea,select,[contenteditable="true"]'))cancel();
  });
  reduced.addEventListener('change',cancel);
})();
