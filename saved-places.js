(() => {
    const key='brno-saved-places-v1';
    let entries=[],ready=false,busy=false;
    const el=id=>document.getElementById(id);
    const status=text=>{el('saved-status').textContent=text;};
    function valid(e){return e&&typeof e.id==='string'&&typeof e.name==='string'&&Array.isArray(e.areas)&&e.areas.every(v=>typeof v==='string')&&e.weights&&typeof e.weights==='object'&&Array.isArray(e.needs)&&(!e.point||(Number.isFinite(e.point.lat)&&Number.isFinite(e.point.lng)&&e.point.lat>=49&&e.point.lat<=49.4&&e.point.lng>=16.3&&e.point.lng<=16.9));}
    function persist(next){try{localStorage.setItem(key,JSON.stringify(next));entries=next;render();return true;}catch{status('Your browser could not save this change. Check its storage settings.');return false;}}
    function render(){
        el('saved-count').textContent=String(entries.length);
        el('saved-list').replaceChildren();
        el('saved-empty').hidden=entries.length>0;
        for(const entry of entries){
            const item=document.createElement('li'),open=document.createElement('button'),note=document.createElement('textarea'),remove=document.createElement('button');
            open.type='button';open.textContent=entry.name;open.className='saved-open';open.disabled=!ready||busy;open.addEventListener('click',()=>restore(entry));
            note.rows=2;note.maxLength=500;note.placeholder='Optional note, e.g. near work';note.value=typeof entry.note==='string'?entry.note:'';note.setAttribute('aria-label',`Note for ${entry.name}`);
            note.addEventListener('change',()=>{if(persist(entries.map(e=>e.id===entry.id?{...e,note:note.value}:e)))status('Note saved.');});
            remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label',`Remove ${entry.name}`);remove.addEventListener('click',()=>{if(persist(entries.filter(e=>e.id!==entry.id)))status('Place removed.');});
            item.append(open,note,remove);el('saved-list').append(item);
        }
        sync();
    }
    function sync(){if(!el('save-place'))return;el('save-place').disabled=!ready||busy||(!locationMode&&!selectedAreas.length);}
    function save(){
        const point=locationMode?walkingExplorer.getOrigin():null;
        if(locationMode&&!point)return;
        const areas=point?[]:[...selectedAreas];
        if(!point&&!areas.length)return;
        const name=point?(el('walk-origin').textContent||'Dropped pin'):areas.map(id=>areaLayers.get(id)?.feature.properties.Name).join(' + ');
        const id=point?`pin:${point.lat.toFixed(6)},${point.lng.toFixed(6)}`:`areas:${[...areas].sort().join(',')}`;
        const previous=entries.find(e=>e.id===id);
        const entry={id,name,point,areas,weights:{...factorWeights},needs:BrnoEssentials.getSelected(),basis:el('analysis-basis').value,factor:currentFactor,tab:ExplorerTabs.active,overlay:showScoreOverlay,note:previous?.note||''};
        if(persist([...entries.filter(e=>e.id!==id),entry])){el('saved-places').open=true;status(previous?'Saved place updated with your current preferences.':'Place saved on this browser. Add a note below if you like.');}
    }
    async function restore(entry){
        if(!ready||busy)return;
        if(entry.areas.some(id=>!areaLayers.has(id))){status('This area is no longer available in the current map data.');return;}
        busy=true;render();
        try{
            ExplorerTabs.select('overview');
            if(locationMode)el('clear-pin').click();
            selectedAreas=[];ResidentialAccess.clearCell();BrnoEssentials.clearCell();
            await ResidentialAccess.setBasis(entry.basis==='land'?'land':'residential');
            for(const field of Object.keys(factorWeights)){const v=entry.weights[field];factorWeights[field]=Number.isInteger(v)&&v>=0&&v<=3?v:1;}
            BrnoEssentials.setSelected(entry.needs);
            const factor=[...document.querySelectorAll('.filters [data-factor]')].find(b=>b.dataset.factor===entry.factor);
            (factor||document.querySelector('.filters [data-factor="overall_score"]')).click();
            showScoreOverlay=Boolean(entry.overlay);el('show-score-overlay').checked=showScoreOverlay;
            selectedAreas=[...entry.areas];
            if(entry.point){walkingExplorer.setOrigin(entry.point,entry.name);map.setView(entry.point,16);}
            else if(selectedAreas.length){const bounds=areaLayers.get(selectedAreas[0]).getBounds();for(const id of selectedAreas.slice(1))bounds.extend(areaLayers.get(id).getBounds());map.fitBounds(bounds,{padding:[35,35],maxZoom:14});}
            updatePriorities();ExplorerTabs.select(['overview','essentials','life'].includes(entry.tab)?entry.tab:'overview');
            status('Restored with current map data and your saved preferences.');
            globalThis.BrnoMobile?.selected();
        }catch(error){console.error(error);status('Could not fully restore this place. Please try again.');}
        finally{busy=false;render();}
    }
    window.BrnoSavedPlaces={sync,init(){
        ready=true;
        try{const stored=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(stored)||!stored.every(valid))throw Error('Invalid saved places');entries=stored;}
        catch{status('Saved places could not be read. New saves will replace unavailable data.');}
        el('save-place').addEventListener('click',save);render();
    }};
})();
