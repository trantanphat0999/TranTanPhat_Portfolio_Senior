/* Local, repeatable scroll measurement. Firebase is replaced with the browser
   regression fixture: this tool never reads or writes production content. */
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const args=process.argv.slice(2);
const number=(name,fallback)=>Number(args.find(arg=>arg.startsWith(`--${name}=`))?.split('=')[1]??fallback);
const cpu=number('cpu',1),runs=number('runs',3),position=number('position',0);
if(!Number.isFinite(cpu)||cpu<1||cpu>20||!Number.isInteger(runs)||runs<1||runs>20||!Number.isFinite(position)||position<0)throw new Error('Use --cpu=1..20 --runs=1..20 --position=0 or a positive scroll offset.');
const mobile=args.includes('--mobile');
const mock=fs.readFileSync(path.join(root,'tests/browser-regression.cjs'),'utf8').match(/const mock=`([\s\S]*?)`;/)[1];
const median=values=>values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const results=[];
  try{
    for(let run=1;run<=runs;run++){
      const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
      try{
        const page=await context.newPage();
        await page.route('**/js/firebase-config.js*',route=>route.fulfill({contentType:'application/javascript',body:mock}));
        await page.route('https://cdn.jsdelivr.net/npm/@emailjs/**',route=>route.abort());
        await page.route('https://fonts.googleapis.com/**',route=>route.abort());
        await page.goto(process.env.PORTFOLIO_TEST_URL||'http://127.0.0.1:5173/',{waitUntil:'load'});
        await page.waitForFunction(()=>window._portfolioData);
        await page.evaluate(top=>scrollTo({top,behavior:'instant'}),position);
        await page.waitForTimeout(1500);
        const cdp=await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
        await page.evaluate(()=>{
          const audit=window.__scrollBenchmark={frames:[],tasks:[],running:true,start:performance.now()};
          audit.observer=new PerformanceObserver(list=>{for(const entry of list.getEntries())audit.tasks.push(entry.duration);});
          audit.observer.observe({type:'longtask'});
          let previous=0;
          function frame(time){if(previous)audit.frames.push(time-previous);previous=time;if(audit.running)requestAnimationFrame(frame);}
          requestAnimationFrame(frame);
        });
        await page.mouse.move(100,400);
        for(const direction of [1,-1])for(let step=0;step<12;step++){
          await page.mouse.wheel(0,direction*120);
          await page.waitForTimeout(55);
        }
        await page.waitForTimeout(600);
        const result=await page.evaluate(()=>{
          const audit=window.__scrollBenchmark;audit.running=false;audit.observer.disconnect();
          const frames=audit.frames.slice().sort((a,b)=>a-b);
          const percentile=p=>frames[Math.floor((frames.length-1)*p)];
          return {durationMs:performance.now()-audit.start,frames:frames.length,p50Ms:percentile(.5),p95Ms:percentile(.95),maxMs:frames.at(-1),over33ms:frames.filter(ms=>ms>33.4).length,longTasks:audit.tasks};
        });
        results.push(result);console.log(JSON.stringify({run,...result}));
      }finally{await context.close();}
    }
    const report={browser:browser.version(),cpu,runs,position,mobile,input:'12 down + 12 up wheel steps, 120px, requested 55ms spacing',medianP95Ms:median(results.map(run=>run.p95Ms)),results};
    const directory=path.join(root,'test-results');fs.mkdirSync(directory,{recursive:true});
    const output=path.join(directory,`scroll-benchmark-${mobile?'mobile':'desktop'}-cpu${cpu}-top${position}.json`);
    fs.writeFileSync(output,JSON.stringify(report,null,2));
    console.log(`Median rAF P95: ${report.medianP95Ms.toFixed(1)}ms. Report: ${output}`);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
