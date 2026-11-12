/* Residential analysis is separate from the original land-area scores. */
(() => {
    const accessFields = ['transit_cov_score','socialservice_cov_score','food_cov_score','edu_score','learning_cov_score','grocery_cov_score','cultural_cov_score','fitness_cov_score'];
    let active = false, data = null, cells = null, layer = null, selectedCell = null;
    const factorKey = {transit_cov_score:'transit',socialservice_cov_score:'socialservice',food_cov_score:'food',learning_cov_score:'learning',grocery_cov_score:'grocery',cultural_cov_score:'cultural',fitness_cov_score:'fitness'};
    const label = {transit:'Transit',socialservice:'Social services',food:'Cafés & restaurants',kg:'Kindergarten',sklcol:'School / college',uni:'University',learning:'Learning',grocery:'Groceries',cultural:'Culture',fitness:'Fitness & wellness'};
    const thresholds = {transit:400,socialservice:400,food:500,kg:800,sklcol:1500,uni:2000,learning:800,grocery:500,cultural:1000,fitness:800};
    const select = () => document.getElementById('analysis-basis');
    const isAccess = () => currentFactor === 'overall_score' || accessFields.includes(currentFactor);
    const summary = p => data?.areas[String(p.CadastralArea_id)];
    function overall(s, weights) {
        let total=0, denominator=0;
        for (const f of accessFields) if (weights[f]>0 && Number.isFinite(s?.scores[f])) { total+=s.scores[f]*weights[f]; denominator+=weights[f]; }
        return denominator ? total/denominator : null;
    }
    function score(s) { return currentFactor==='overall_score' ? overall(s,factorWeights) : s?.scores[currentFactor]; }
    function details(s, title) {
        if (!s) return `<p>No residential survey data for ${escapeHtml(title)}.</p>`;
        const keys=currentFactor==='edu_score' ? ['kg','sklcol','uni'] : factorKey[currentFactor] ? [factorKey[currentFactor]] : Object.keys(label);
        const rows=keys.map(key=>{const f=s.factors[key];return `<tr><th scope="row">${label[key]}<small>${thresholds[key].toLocaleString()} m walk</small></th><td>${f.coverage_pct.toFixed(1)}%</td></tr>`;}).join('');
        const selected=factorKey[currentFactor] && s.factors[factorKey[currentFactor]];
        const cellAreas=s.area_ids ? `<p>Cell spans: ${s.area_ids.map(id=>escapeHtml(areaLayers.get(id)?.feature.properties.Name||id)).join(', ')}. Area selection follows the largest housing-floor-area share.</p>` : '';
        return `<h3>${escapeHtml(title)}</h3><p>${s.buildings.toLocaleString()} surveyed building features · ${(s.housing_m2/1000).toLocaleString(undefined,{maximumFractionDigits:1})} thousand m² of housing</p>
            ${cellAreas}<table class="residential-table"><caption>Housing floor area with confirmed walking access</caption><thead><tr><th>Destination</th><th>Coverage</th></tr></thead><tbody>${rows}</tbody></table>
            ${selected ? `<p>${Number.isFinite(selected.median_m_within_5km) ? `Median distance: <strong>${Math.round(selected.median_m_within_5km).toLocaleString()} m</strong>` : 'No destination found within 5 km'}. Median covers only the ${selected.within_5km_pct.toFixed(1)}% of housing floor area with a reachable destination within 5 km.</p>` : ''}
            <p class="residential-note">${s.connected_pct.toFixed(2)}% of housing floor area connects to the network within 100 m. Unconnected origins count as no confirmed access. These are floor-area shares, not resident counts.</p>`;
    }
    function refreshText() {
        if (!active) return;
        for(const field of ['tree_score','park_score','cycling_dens_score']) document.getElementById(`weight-${field}`).disabled=true;
        const context=!isAccess();
        document.getElementById('factor-description').textContent=context
            ? `${factorDescriptions[currentFactor]} This is cadastral context; no residential-grid estimate is available for this factor.`
            : currentFactor==='overall_score'
                ? 'Residential access combines eight walking-access factors using Your Priority. It excludes trees, park area and cycling density. Cells summarise surveyed residential origins within 250 m squares; cadastral summaries use the same housing floor-area weights.'
                : currentFactor==='edu_score'
                    ? 'Residential education access combines kindergarten within 800 m (50%), school/college within 1,500 m (35%) and university within 2,000 m (15%). Coverage is weighted by housing floor area; origins are estimated, not verified entrances.'
                    : `${label[factorKey[currentFactor]]} within ${thresholds[factorKey[currentFactor]].toLocaleString()} m: share of surveyed housing floor area with walking access. Origins are estimated internal building points, not verified entrances.${currentFactor==='socialservice_cov_score'?' This is absolute coverage, not rescaled against the best area.':''}`;
        document.getElementById('map-title').textContent=currentFactor==='overall_score' ? 'Residential Access Score' : `${factorLabels[currentFactor]}${context?' · cadastral context':' · residential access'}`;
        document.getElementById('map-status').textContent=context ? 'Residential mode · cadastral context for this factor' : 'Residential access · 250 m cells · KAM survey 2018–2020';
        document.getElementById('priority-status').textContent=(accessFields.every(f=>factorWeights[f]===0)?'All walking-access factors are off. Enable one to see residential scores. ':'Residential overall uses eight walking-access factors. ')+'Tree, park-area and cycling-density weights apply only in the land-area view.';
    }
    function render() {
        const panel=document.getElementById('residential-results');
        if (!panel) return;
        panel.hidden=!active || (locationMode && currentFactor!=='affordability') || !isAccess();
        if (panel.hidden) return;
        if (selectedCell) panel.innerHTML=`<button type="button" id="clear-residential-cell">Back to area summary</button>${details(selectedCell,'Selected residential cell · 250 m')}`;
        else if (selectedAreas.length) panel.innerHTML=selectedAreas.map(id=>details(data.areas[id],areaLayers.get(id).feature.properties.Name)).join('');
        else panel.innerHTML=`<p>Select an area to compare residential access, or turn on the score overlay and click a coloured cell for local detail.</p><details><summary>Brno residential summary</summary>${details(data.city,'Brno · surveyed housing')}</details>`;
        document.getElementById('clear-residential-cell')?.addEventListener('click',()=>{selectedCell=null;render();});
    }
    function refresh() {
        if (!layer) return;
        const visible=active && isAccess() && showScoreOverlay;
        if (visible && !map.hasLayer(layer)) layer.addTo(map);
        if (!visible && map.hasLayer(layer)) map.removeLayer(layer);
        if (visible) layer.setStyle(f=>({fillColor:getColor(score(f.properties)),fillOpacity:.7,color:'#fff',weight:.4}));
        refreshText();
    }
    async function change() {
        select().disabled=true;
        try {
            if (select().value==='residential' && !data) {
                document.getElementById('residential-load-status').textContent='Loading residential analysis…';
                const results=await Promise.all(['summary.json','cells.geojson'].map(async file=>{const r=await fetch(`data/residential/${file}`);if(!r.ok)throw Error('Residential data unavailable');return r.json();}));
                [data,cells]=results;
                if(data.metadata?.method!=='residential_floor_area_weighted_network'||!cells.features?.length)throw Error('Invalid residential dataset');
                map.createPane('residentialCells');map.getPane('residentialCells').style.zIndex=410;
                layer=L.geoJSON(cells,{pane:'residentialCells',renderer:L.canvas({pane:'residentialCells'}),onEachFeature(f,l){
                    l.on('click',e=>{
                        if(document.getElementById('drop-pin').getAttribute('aria-pressed')==='true')return;
                        L.DomEvent.stopPropagation(e);
                        if(globalThis.BrnoMobile?.comparing){selectArea(f.properties.area_id);return;}
                        selectArea(f.properties.area_id);
                        selectedCell=f.properties;render();globalThis.BrnoMobile?.selected();
                        l.bindPopup(`<strong>Residential cell · 250 m</strong><p>${f.properties.buildings.toLocaleString()} surveyed building features</p><p>${Number.isFinite(score(f.properties))?(score(f.properties)*5).toFixed(1)+' / 5':'No enabled factors'} · ${currentFactor==='overall_score'?'Residential access':escapeHtml(factorLabels[currentFactor])}</p><small>Housing floor-area weighted; estimated origins. Full detail in the side panel.</small>`).openPopup();
                    });
                }});
            }
            active=select().value==='residential';selectedCell=null;map.closePopup();
            document.getElementById('residential-load-status').textContent=active?'Residential floor-area weighting · estimated building origins':'';
            if (!active) {
                for(const field of ['tree_score','park_score','cycling_dens_score']) document.getElementById(`weight-${field}`).disabled=false;
                document.getElementById('factor-description').textContent=factorDescriptions[currentFactor];
                document.getElementById('map-title').textContent=document.querySelector(`.filters [data-factor="${currentFactor}"]`).dataset.label;
                document.getElementById('map-status').textContent='Walking-network analysis · 48 cadastral areas';
            }
            updatePriorities();
        } catch(error) {
            console.error(error);active=false;data=null;select().value='land';
            document.getElementById('residential-load-status').textContent='Residential data could not load. Choose Residential access to retry.';
        } finally {select().disabled=false;}
    }
    window.ResidentialAccess={get active(){return active;},get gridVisible(){return active&&isAccess()&&showScoreOverlay;},
        init(){select().disabled=false;select().addEventListener('change',change);if(select().value==='residential')return change();},
        score(p,field){return summary(p)?.scores[field]??null;},
        overall(p,weights){return overall(summary(p),weights);},
        applies(field){return active&&(field==='overall_score'||accessFields.includes(field));},
        clearCell(){selectedCell=null;},render,refresh,refreshText,
        coverage(p){const s=summary(p);const key=factorKey[currentFactor];return key&&s ? `${s.factors[key].coverage_pct.toFixed(1)}% of housing floor area within ${thresholds[key]} m` : 'Residential access · housing floor-area weighted';},
        caption(){return active?'Residential access scores out of 5 · trees, parks and cycling are separate cadastral context':'Livability scores out of 5';}
    };
})();
