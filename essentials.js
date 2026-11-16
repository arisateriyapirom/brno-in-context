(() => {
    const labels={grocery:'Groceries',parks:'Parks',transit:'Transit',kg:'Kindergarten',sklcol:'School / college',uni:'University',food:'Cafés & restaurants',learning:'Learning',socialservice:'Social services',cultural:'Culture',fitness:'Fitness & wellness',cycling:'Cycling-route access'};
    const thresholds={grocery:500,parks:500,transit:400,kg:800,sklcol:1500,uni:2000,food:500,learning:800,socialservice:400,cultural:1000,fitness:800,cycling:500};
    const chosen=new Set(['grocery','parks','transit']);
    let active=false,data=null,layer=null,loading=null,cell=null,savedOverlay=false,pinResult=null,pinError='';
    const selectedIndices=()=>data?data.keys.flatMap((key,index)=>chosen.has(key)?[index]:[]):[];
    const stats=bins=>calculateEssentials(bins,selectedIndices());
    const visible=()=>active&&Boolean(layer)&&chosen.size>0&&showScoreOverlay;
    function resultHTML(bins,title){
        const value=stats(bins);
        if(value.percent===null)return `<section class="essentials-result"><h3>${escapeHtml(title)}</h3><p>No residential data available.</p></section>`;
        const worst=value.missing[0];
        const ties=worst?.weight>0?value.missing.filter(v=>Math.abs(v.weight-worst.weight)<1e-6).map(v=>labels[data.keys[v.index]]):[];
        return `<section class="essentials-result"><h3>${escapeHtml(title)}</h3>
            <p class="essential-number">${value.percent.toFixed(1)}%</p><p>of recorded housing floor area meets all ${chosen.size} selected ${chosen.size===1?'need':'needs'}.</p>
            <p>${worst?.weight>0?`${escapeHtml(ties.join(' and '))} ${ties.length>1?'are the joint most common missing needs':'is the most common missing need'} (${worst.percent.toFixed(1)}% without confirmed access).`:'All selected needs are met for the surveyed housing here.'}</p>
            <details><summary>See individual needs</summary><ul>${value.missing.map(v=>`<li>${labels[data.keys[v.index]]}: ${(100-v.percent).toFixed(1)}% has access within ${thresholds[data.keys[v.index]]} m</li>`).join('')}</ul></details></section>`;
    }
    function render(){
        if(!active)return;
        const target=document.getElementById('essentials-results');
        if(!chosen.size){target.innerHTML='<p>Select at least one need to see combined coverage.</p>';return;}
        if(locationMode){
            if(!pinResult){target.innerHTML=`<p>${pinError?'Walking access could not be calculated for this location.':'Calculating walks from this location…'}</p>${pinError?'<button type="button" id="retry-essential-pin">Try walking calculation again</button>':''}`;document.getElementById('retry-essential-pin')?.addEventListener('click',()=>document.getElementById('retry-routing').click());return;}
            const needs=[...chosen].map(key=>({key,distance:pinResult.groups[key]?.[0]?.distance}));
            const passed=needs.filter(n=>Number.isFinite(n.distance)&&n.distance<=thresholds[n.key]).length;
            target.innerHTML=`<section class="essentials-result"><h3>This address or pin</h3><p class="essential-number">${passed} / ${chosen.size}</p><p>Selected needs within their walking thresholds from this location. This is a point result, not a housing-coverage percentage.</p><details open><summary>See individual needs</summary><ul>${needs.map(n=>`<li>${labels[n.key]}: ${Number.isFinite(n.distance)?`${Math.round(n.distance)} m · ${n.distance<=thresholds[n.key]?'met':'beyond threshold'}`:'no destination found within 5 km'} (limit ${thresholds[n.key]} m)</li>`).join('')}</ul></details></section>`;return;
        }
        if(!data){target.innerHTML='';return;}
        if(cell){target.innerHTML=`<button type="button" id="clear-essential-cell">Back to area summary</button>${resultHTML(data.cells[cell.id],'Selected residential cell · ~250 m')}<p>Cells summarise homes with origins inside them; some cells cross cadastral boundaries.</p>`;document.getElementById('clear-essential-cell').addEventListener('click',()=>{cell=null;render();});}
        else if(selectedAreas.length)target.innerHTML=selectedAreas.map(id=>resultHTML(data.areas[id],areaLayers.get(id).feature.properties.Name)).join('');
        else target.innerHTML=resultHTML(data.city,'Brno · surveyed housing')+'<p>Select an area or a coloured cell to explore local differences.</p>';
    }
    function legend(){
        document.querySelector('.method-note').hidden=true;
        const box=document.getElementById('score-legend');box.hidden=!showScoreOverlay||!chosen.size;
        const colors=['#d73027','#fc8d59','#fee08b','#91cf60','#1a9850'];
        box.innerHTML=`<div class="legend-scale">${colors.map(color=>`<div class="legend-group-color">${Array.from({length:4},()=>`<span class="legend-square" style="background:${color}"></span>`).join('')}</div>`).join('')}</div><div class="legend-labels">${['0–<20%','20–<40%','40–<60%','60–<80%','80–100%'].map(label=>`<span>${label}</span>`).join('')}</div><p class="story-note">Housing floor area meeting all selected needs · grey: no data</p>`;
    }
    function refresh(){
        if(layer){if(visible()&&!map.hasLayer(layer))layer.addTo(map);if(!visible()&&map.hasLayer(layer))map.removeLayer(layer);if(visible())layer.setStyle(f=>{const percent=stats(data.cells[f.properties.id]).percent;return {fillColor:getColor(percent===null?null:percent/100),fillOpacity:.7,weight:.4,color:'#fff'};});}
        if(!active)return;
        document.getElementById('analysis-basis').disabled=true;
        document.getElementById('map-title').textContent='Everyday essentials · all selected needs';
        document.getElementById('factor-description').textContent='Share of housing floor area whose estimated home origin can reach every selected need. This is a combination at the same home, not an average of separate coverages. The map shows residential cells; a searched pin has its own point result.';
        document.getElementById('map-status').textContent='My essentials · combined residential access · ~250 m cells';
        legend();render();
    }
    async function load(){
        if(data)return;
        if(!loading){loading=Promise.all(['data/residential/essentials.json?v=20261115','data/residential/cells.geojson?v=20261113-north-grid'].map(async url=>{const r=await fetch(url);if(!r.ok)throw Error('Essentials unavailable');return r.json();})).then(([joint,geometry])=>{
            if(joint.method!=='joint_access_at_same_residential_origin'||Object.entries(thresholds).some(([k,v])=>joint.thresholds_m[k]!==v)||geometry.features.some(f=>!joint.cells[f.properties.id]))throw Error('Mismatched essentials data');
            data=joint;
            map.createPane('essentialCells').style.zIndex=411;
            layer=L.geoJSON(geometry,{pane:'essentialCells',renderer:L.canvas({pane:'essentialCells'}),onEachFeature(f,l){l.on('click',e=>{
                if(document.getElementById('drop-pin').getAttribute('aria-pressed')==='true')return;
                L.DomEvent.stopPropagation(e);
                if(locationMode)document.getElementById('clear-pin').click();
                const compare=globalThis.BrnoMobile?.comparing;
                selectArea(f.properties.area_id);
                if(!compare){cell=f.properties;render();const value=stats(data.cells[cell.id]);l.bindPopup(`<strong>All selected essentials</strong><p>${value.percent?.toFixed(1)}% of housing floor area</p><small>~250 m residential cell · details in the panel</small>`).openPopup();}
                globalThis.BrnoMobile?.selected();
            });}});
        }).catch(error=>{data=null;loading=null;throw error;});}
        await loading;
    }
    async function startLoad(){
        document.getElementById('essentials-status').textContent='Loading combined-needs analysis…';document.getElementById('essentials-retry').hidden=true;
        try{await load();document.getElementById('essentials-status').textContent='Based on housing floor area, not resident counts.';if(active)refreshSelectionStyles();}
        catch(error){document.getElementById('essentials-status').textContent='Combined-needs data could not load. You can retry or return to Overview.';document.getElementById('essentials-retry').hidden=false;}
    }
    window.BrnoEssentials={get active(){return active;},get visible(){return visible();},legend,render,refresh,
        clearCell(){cell=null;},setLocation(result,error=''){pinResult=result;pinError=error;render();},
        popup(l){const p=l.feature.properties;l.setPopupContent(data&&chosen.size?resultHTML(data.areas[areaId(p)],p.Name):'Select needs or wait for the combined analysis to load.');l.openPopup();},
        enter(){active=true;savedOverlay=showScoreOverlay;showScoreOverlay=true;document.getElementById('show-score-overlay').checked=true;factorLocations.update('__essentials__');walkingExplorer.setRoutesVisible(false);refreshSelectionStyles();startLoad();},
        leave(){active=false;cell=null;showScoreOverlay=savedOverlay;document.getElementById('show-score-overlay').checked=savedOverlay;document.getElementById('analysis-basis').disabled=false;factorLocations.update(currentFactor);walkingExplorer.setRoutesVisible(true);refresh();updateRentLegend();refreshSelectionStyles();document.getElementById('factor-description').textContent=factorDescriptions[currentFactor];document.getElementById('map-title').textContent=document.querySelector(`.filters [data-factor="${currentFactor}"]`).dataset.label;document.getElementById('map-status').textContent='Walking-network analysis · 48 cadastral areas';ResidentialAccess.refreshText();},
        init(){
            const common=['grocery','transit','kg','sklcol','fitness','food'];
            for(const key of [...common,...Object.keys(labels).filter(key=>!common.includes(key))]){const label=labels[key];const box=document.getElementById(common.includes(key)?'essentials-choices':'essentials-more-choices');const button=document.createElement('button');button.type='button';button.setAttribute('aria-pressed',String(chosen.has(key)));button.innerHTML=`${label}<small>${thresholds[key].toLocaleString()} m</small>`;button.addEventListener('click',()=>{if(chosen.has(key))chosen.delete(key);else chosen.add(key);button.setAttribute('aria-pressed',String(chosen.has(key)));const extra=[...chosen].filter(k=>!common.includes(k)).length;document.getElementById('essentials-more-label').textContent=extra?`More needs · ${extra} selected`:'More needs';map.closePopup();refreshSelectionStyles();render();});box.append(button);}
            const extra=[...chosen].filter(key=>!common.includes(key)).length;
            document.getElementById('essentials-more-label').textContent=extra?`More needs · ${extra} selected`:'More needs';
            document.getElementById('essentials-retry').addEventListener('click',startLoad);
        }
    };
})();
