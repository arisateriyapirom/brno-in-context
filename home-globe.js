/* Orthographic 3D globe: a short looping journey with a pause at Brno. */
const HOME_BRNO = [16.6068, 49.1951];
const HOME_STOPS = [
    {t:0, center:[-65,15], zoom:1},
    {t:1, center:[-5,28], zoom:1},
    {t:2.5, center:[13,49], zoom:4.5},
    {t:4, center:[15.4,49.7], zoom:24},
    {t:6, center:HOME_BRNO, zoom:125}
];
function homeCameraAt(seconds) {
    const t=Math.max(0,Math.min(6,seconds));
    let i=0;
    while(i<HOME_STOPS.length-2 && t>HOME_STOPS[i+1].t) i++;
    const a=HOME_STOPS[i],b=HOME_STOPS[i+1],u=(t-a.t)/(b.t-a.t);
    const eased=u*u*(3-2*u);
    return {center:a.center.map((v,j)=>v+(b.center[j]-v)*eased),
        zoom:Math.exp(Math.log(a.zoom)+(Math.log(b.zoom)-Math.log(a.zoom))*eased),
        stage:t<1.5?0:t<3.3?1:t<5?2:3,done:t>=6};
}
async function startHomeGlobe() {
    const canvas=document.getElementById('home-globe');
    const stage=document.getElementById('globe-stage');
    const pin=document.getElementById('brno-pin');
    const pause=document.getElementById('globe-pause');
    const replay=document.getElementById('globe-replay');
    const skip=document.getElementById('globe-skip');
    const status=document.getElementById('globe-status');
    try {
        if(typeof d3==='undefined') throw Error('Globe renderer unavailable');
        const response=await fetch('data/home/world.json');
        if(!response.ok) throw Error('Globe geometry unavailable');
        const data=await response.json();
        const ctx=canvas.getContext('2d');
        if(!ctx) throw Error('Canvas unavailable');
        const czech=data.countries.features.find(f=>f.properties.code==='CZE');
        const sphere={type:'Sphere'},graticule=d3.geoGraticule10();
        const projection=d3.geoOrthographic().clipAngle(90).precision(.35);
        const path=d3.geoPath(projection,ctx);
        const reduced=matchMedia('(prefers-reduced-motion: reduce)');
        let seconds=reduced.matches?6:0,paused=reduced.matches,frame=0,last=0,lastPaint=0,currentStage=-1;
        let width=0,height=0,dpr=1;
        const clamp=v=>Math.max(0,Math.min(1,v));
        function drawGeometry(geometry,fill,stroke,lineWidth=1) {
            ctx.beginPath();path(geometry);
            if(fill){ctx.fillStyle=fill;ctx.fill();}
            if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
        }
        function draw() {
            if(!width||!height)return;
            const camera=homeCameraAt(seconds),base=Math.min(width,height)*.42;
            const scale=base*camera.zoom,cx=width/2,cy=height/2;
            projection.translate([cx,cy]).scale(scale).rotate([-camera.center[0],-camera.center[1],0])
                .clipExtent([[0,0],[width,height]]);
            ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
            drawGeometry(sphere,null,'#333333',.35);
            ctx.globalAlpha=1-clamp((camera.zoom-8)/12);
            drawGeometry(graticule,null,'#cccccc',.4);
            ctx.globalAlpha=1;
            drawGeometry(data.countries,null,'#333333',.4);
            if(camera.zoom>7) {
                ctx.globalAlpha=clamp((camera.zoom-7)/8);
                drawGeometry(czech,null,'#111111',.6);
                ctx.globalAlpha=1;
            }
            if(camera.zoom>35) {
                ctx.globalAlpha=clamp((camera.zoom-35)/35);
                drawGeometry(data.brno,null,'#111111',.6);
                ctx.globalAlpha=1;
            }
            const xy=projection(HOME_BRNO);
            pin.hidden=!camera.done;
            if(camera.done){
                pin.style.left=`${xy[0]}px`;pin.style.top=`${xy[1]}px`;
                const bounds=path.bounds(data.brno);
                pin.querySelector('span').style.top=`${Math.max(24,bounds[1][1]-xy[1]+26)}px`;
            }
            // Briefly fade out before returning to the world, then fade back in.
            const opacity=seconds>8?clamp((8.4-seconds)/.4):clamp(seconds/.3);
            canvas.style.opacity=String(paused ? 1 : opacity);
            pin.style.opacity=String(paused ? 1 : opacity);
            if(camera.stage!==currentStage){
                currentStage=camera.stage;
                document.querySelectorAll('[data-stage]').forEach(el=>{
                    const active=Number(el.dataset.stage)===currentStage;
                    el.classList.toggle('is-current',active);
                    if(active)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
                });
                status.textContent=['The world.','Zooming into Europe.','Zooming into the Czech Republic.','Approaching Brno.'][currentStage];
            }
            if(camera.done)status.textContent='Brno, Czech Republic. The red pin marks the city.';
            pause.disabled=false;pause.textContent=paused?'Resume':'Pause';
            skip.disabled=camera.done;
        }
        function tick(now) {
            frame=0;
            if(paused||document.hidden){last=0;return;}
            if(last)seconds=(seconds+(now-last)/1000)%8.4;
            last=now;
            if(now-lastPaint>=32){draw();lastPaint=now;}
            frame=requestAnimationFrame(tick);
        }
        function schedule(){if(!frame&&!paused&&!document.hidden)frame=requestAnimationFrame(tick);}
        function stop(){cancelAnimationFrame(frame);frame=0;last=0;}
        function resize(){
            width=stage.clientWidth;height=stage.clientHeight;dpr=Math.min(devicePixelRatio||1,2);
            canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);draw();
        }
        pause.addEventListener('click',()=>{paused=!paused;stop();draw();schedule();});
        replay.addEventListener('click',()=>{seconds=0;paused=false;stop();draw();schedule();});
        skip.addEventListener('click',()=>{seconds=6;paused=true;stop();draw();});
        document.addEventListener('visibilitychange',()=>{stop();schedule();});
        reduced.addEventListener('change',()=>{if(reduced.matches){seconds=6;paused=true;stop();draw();}});
        window.addEventListener('pagehide',stop);
        new ResizeObserver(resize).observe(stage);
        const titleBlock=document.querySelector('.home-intro');
        if(titleBlock){
            const matchTitleHeight=()=>{
                const size=`${titleBlock.getBoundingClientRect().height}px`;
                stage.style.height=size;
                stage.style.setProperty('--globe-size',size);
            };
            new ResizeObserver(matchTitleHeight).observe(titleBlock);
            matchTitleHeight();
        }
        replay.disabled=false;pause.disabled=false;skip.disabled=false;
        resize();schedule();
    } catch(error) {
        console.warn('Homepage globe:',error);
        canvas.hidden=true;pin.hidden=true;
        document.getElementById('globe-fallback').hidden=false;
        status.textContent='Globe unavailable. The links to Brno Livability and Life in Brno remain available.';
    }
}
if(typeof document!=='undefined')startHomeGlobe();
