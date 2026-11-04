/* Small-screen enhancements. Original controls are restored to their exact slots on desktop. */
(() => {
    const media=matchMedia('(max-width: 760px)');
    const header=document.querySelector('.site-header'),nav=document.querySelector('.top-nav');
    const menu=document.createElement('button');menu.type='button';menu.className='mobile-menu';
    nav.id=nav.id||'main-navigation';menu.setAttribute('aria-controls',nav.id);menu.setAttribute('aria-expanded','false');
    const page=nav.querySelector('[aria-current="page"],.active-page')?.textContent.trim()||'Menu';
    menu.textContent=`${page} · Menu`;header.append(menu);
    const closeMenu=()=>{header.classList.remove('mobile-nav-open');menu.setAttribute('aria-expanded','false');};
    menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';header.classList.toggle('mobile-nav-open',open);menu.setAttribute('aria-expanded',String(open));});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&header.classList.contains('mobile-nav-open')){closeMenu();menu.focus();}});
    media.addEventListener('change',closeMenu);
    if(!document.body.classList.contains('livability-page'))return;
    const sidebar=document.querySelector('.sidebar'),column=document.querySelector('.map-column');
    const toolbar=document.createElement('div');toolbar.className='mobile-map-toolbar';
    toolbar.innerHTML='<button type="button" data-tool="search">Search</button><button type="button" data-tool="factors" id="mobile-factor">Viewing: Overall</button><button type="button" data-tool="priorities">Priorities</button><button type="button" data-tool="details">Map details</button>';
    column.prepend(toolbar);
    const dialog=document.createElement('dialog');dialog.className='mobile-tools';dialog.setAttribute('aria-labelledby','mobile-tool-title');
    dialog.innerHTML='<header><h2 id="mobile-tool-title"></h2><button type="button" id="mobile-tool-close" aria-label="Close panel">×</button></header><div class="mobile-search-tabs"><button type="button" data-search="area" aria-pressed="true">Cadastral area</button><button type="button" data-search="address" aria-pressed="false">Address / pin</button></div><div data-slot="search"></div><div data-slot="factors"></div><div data-slot="priorities"></div><div data-slot="details"></div>';
    document.body.append(dialog);
    const handle=document.createElement('div');handle.className='mobile-sheet-controls';
    handle.innerHTML='<button type="button" id="mobile-sheet-toggle" aria-expanded="false">Area details ↑</button><button type="button" id="mobile-sheet-expand">Expand</button><button type="button" id="mobile-sheet-map">Map ↓</button>';
    sidebar.prepend(handle);
    const compare=document.createElement('button');compare.type='button';compare.className='mobile-compare';compare.textContent='Compare with another area';compare.hidden=true;
    document.getElementById('area-results').prepend(compare);
    const hint=document.createElement('p');hint.className='mobile-map-hint';hint.hidden=true;hint.setAttribute('role','status');toolbar.after(hint);
    const targets=[['#area-search-form','search'],['.walking-explorer','search'],['.filters','factors'],['.priorities','priorities'],['.map-footer','details']].map(([selector,slot])=>{
        const el=document.querySelector(selector),mark=document.createComment(`desktop slot ${selector}`);el.before(mark);return {el,mark,slot,open:el.open};
    });
    let toolOpener=null,compareArmed=false;
    const sheet=level=>{
        sidebar.dataset.sheet=level;
        const open=level!=='peek';
        document.getElementById('mobile-sheet-toggle').setAttribute('aria-expanded',String(open));
        document.getElementById('mobile-sheet-toggle').textContent=open?'Area details ↓':'Area details ↑';
    };
    const closeTool=()=>{if(dialog.open)dialog.close();};
    function searchMode(mode){
        dialog.dataset.search=mode;
        dialog.querySelectorAll('[data-search]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.search===mode)));
    }
    function openTool(tool,opener){
        if(!media.matches)return;
        toolOpener=opener;dialog.dataset.tool=tool;
        dialog.querySelectorAll('[data-slot]').forEach(el=>el.hidden=el.dataset.slot!==tool);
        dialog.querySelector('.mobile-search-tabs').hidden=tool!=='search';
        document.getElementById('mobile-tool-title').textContent={search:'Find a place',factors:'Choose a factor',priorities:'Your priorities',details:'Map details'}[tool];
        if(!dialog.open)dialog.showModal();
        document.getElementById('mobile-tool-close').focus();
    }
    toolbar.addEventListener('click',e=>{const b=e.target.closest('[data-tool]');if(b)openTool(b.dataset.tool,b);});
    dialog.addEventListener('click',e=>{const b=e.target.closest('[data-search]');if(b)searchMode(b.dataset.search);});
    document.getElementById('mobile-tool-close').addEventListener('click',closeTool);
    dialog.addEventListener('close',()=>{if(media.matches)toolOpener?.focus();});
    document.getElementById('mobile-sheet-toggle').addEventListener('click',()=>sheet(sidebar.dataset.sheet==='peek'?'half':'peek'));
    document.getElementById('mobile-sheet-expand').addEventListener('click',()=>sheet('full'));
    document.getElementById('mobile-sheet-map').addEventListener('click',()=>sheet('peek'));
    compare.addEventListener('click',()=>{compareArmed=true;sheet('peek');hint.hidden=false;hint.textContent='Choose a second area on the map, or use Search.';});
    document.querySelector('.filters').addEventListener('click',e=>{
        const b=e.target.closest('[data-factor]');if(!b||b.disabled)return;
        document.getElementById('mobile-factor').textContent=`Viewing: ${b.textContent.trim()}`;
        if(media.matches){closeTool();if(selectedAreas.length||locationMode)sheet('half');}
    });
    document.getElementById('drop-pin').addEventListener('click',()=>{
        if(media.matches&&document.getElementById('drop-pin').getAttribute('aria-pressed')==='true'){
            closeTool();sheet('peek');hint.hidden=false;hint.textContent='Tap the map to place your walking start.';
        }
    });
    document.getElementById('walk-results').addEventListener('click',e=>{if(media.matches&&e.target.closest('[data-group]'))sheet('peek');});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){compareArmed=false;hint.hidden=true;}});
    window.BrnoMobile={
        get active(){return media.matches;},get comparing(){return compareArmed;},
        selected(){if(!media.matches)return;compareArmed=false;hint.hidden=true;closeTool();sheet('half');sidebar.scrollTop=0;},
        location(active){if(!media.matches)return;compareArmed=false;hint.hidden=true;if(active){closeTool();sheet('half');}},
        sync(){if(!media.matches)return;compare.hidden=selectedAreas.length!==1||(locationMode&&currentFactor!=='affordability');if(!selectedAreas.length)compareArmed=false;},
    };
    function layout(){
        if(media.matches){
            targets.forEach(target=>{const {el,slot}=target;if(el.tagName==='DETAILS')target.open=el.open;dialog.querySelector(`[data-slot="${slot}"]`).append(el);if(el.tagName==='DETAILS')el.open=true;});
            searchMode('area');sheet('peek');window.BrnoMobile.sync();
        }else{
            closeTool();targets.forEach(({el,mark,open})=>{mark.after(el);if(el.tagName==='DETAILS')el.open=open;});
            compareArmed=false;hint.hidden=true;delete sidebar.dataset.sheet;
        }
        if(typeof livabilityLayer!=='undefined'&&livabilityLayer)renderComparison();
        if(typeof map!=='undefined')requestAnimationFrame(()=>map.invalidateSize({pan:false}));
    }
    media.addEventListener('change',layout);layout();
})();
