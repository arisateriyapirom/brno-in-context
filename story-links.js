/* One shared journal catalogue connects observations and modelled access. */
(() => {
    const published=()=>journalEntries.filter(e=>!e.draft);
    const validLocation=e=>Number.isFinite(e.location?.lat)&&Number.isFinite(e.location?.lng);
    const byId=id=>published().find(e=>e.id===id);
    const thumbnail=e=>/^data\/images_life\/02-0[1-5]\.jpe?g$/.test(e.image||'')?e.image.replace('images_life/','images_life/mobile/').replace(/\.jpeg$/,'.jpg'):e.image;
    const storyLink=e=>`life-in-brno.html?story=${encodeURIComponent(e.id)}`;
    const mapLink=e=>`brno-livability.html?story=${encodeURIComponent(e.id)}`;
    const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    let contextPromise,request=0;
    function loadContext(){
        if(!contextPromise)contextPromise=fetch('data/journal-context.json?v=20261113').then(r=>{if(!r.ok)throw Error('Context unavailable');return r.json();}).catch(error=>{contextPromise=null;throw error;});
        return contextPromise;
    }
    async function locationContext(entry){
        const token=++request,box=document.getElementById('entry-neighbourhood');
        if(!box)return;
        box.innerHTML=`<h3>Explore this neighbourhood</h3><p>${esc(entry.area)}</p><p role="status">Loading nearby access and rental context…</p>`;
        const link=`<a class="story-map-link" href="${mapLink(entry)}">Explore ${esc(entry.area)} on the livability map ↗</a>`;
        try{
            const data=await loadContext();if(token!==request)return;
            const record=data.stories[entry.id];
            // Never reuse saved distances after the entry's location has changed.
            const sameLocation=record&&record.location?.lat===entry.location?.lat&&record.location?.lng===entry.location?.lng;
            let html='';
            if(validLocation(entry)&&sameLocation&&record.nearby){
                html='<ul class="story-access">'+[['transit','Transit'],['parks','Park'],['grocery','Groceries']].map(([key,label])=>{
                    const destination=record.nearby[key];
                    return `<li><strong>${label}</strong><span>${destination?`${destination.distance_m.toLocaleString()} m walk · ${esc(destination.name)}`:'No reachable destination found within 5 km'}</span></li>`;
                }).join('')+'</ul><p class="story-note">Estimated walks from the mapped visit location, not from every home in the area. Entrances and connections are approximate; these are not verified step-free routes.</p>';
            }else html='<p>Nearby walking estimates are not available for this entry yet. Explore the map to choose a starting point.</p>';
            if(record?.area_name===entry.area&&record.rent){
                const band=rentBand(record.rent);
                html+=`<p><strong>Relative rental cost: ${esc(band?.label||'Unavailable')}</strong><br>${esc(entry.area)} · ${esc(data.rent_snapshot)} snapshot</p><p class="story-note">Area-level reference rents compared with the median across Brno’s cadastral areas. This does not describe the venue’s prices or a specific apartment.</p>`;
            }else html+='<p>Area rental estimate unavailable.</p>';
            box.innerHTML=`<h3>Explore this neighbourhood</h3>${html}${link}`;
        }catch(error){if(token!==request)return;box.innerHTML=`<h3>Explore this neighbourhood</h3><p>Nearby context could not load.</p>${link}<button type="button" id="retry-story-context">Retry</button>`;document.getElementById('retry-story-context').addEventListener('click',()=>locationContext(entry));}
    }
    function renderAreas(){
        const box=document.getElementById('area-stories');if(!box)return;
        box.hidden=!selectedAreas.length||(locationMode&&currentFactor!=='affordability');
        if(box.hidden)return;
        box.innerHTML='<h3>Visits & stories from this area</h3><p class="story-note">A growing collection of personal visits, food, activities and moments—not an account of living in every neighbourhood. Story coverage does not affect scores.</p>'+selectedAreas.map(id=>{
            const name=areaLayers.get(id).feature.properties.Name,entries=published().filter(e=>e.area===name);
            return `<section><h4>${esc(name)}</h4>${entries.length?entries.map(e=>`<a class="area-story" href="${storyLink(e)}">${e.image?`<img src="${esc(thumbnail(e))}" alt="" loading="lazy">`:''}<span><strong>${esc(e.title)}</strong><small>${esc(e.categories.join(' · '))}</small></span></a>`).join(''):'<p class="story-note">Not yet documented in the journal. This reflects where I have visited and written about, not the quality of this area.</p>'}</section>`;
        }).join('');
    }
    function openLinkedStory(){
        const entry=byId(new URLSearchParams(location.search).get('story'));if(!entry)return;
        const area=[...areaLayers.values()].find(l=>l.feature.properties.Name===entry.area);
        if(area)selectArea(areaId(area.feature.properties),true);
        if(validLocation(entry)){
            walkingExplorer.setOrigin(entry.location,`Visit location · ${entry.title} · ${entry.area}`);
            map.setView(entry.location,16);
        }
    }
    window.BrnoStories={locationContext,renderAreas,openLinkedStory,byId,storyLink,mapLink};
})();
