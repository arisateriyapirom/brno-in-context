function createWalkingExplorer(map, { onLocationChange = () => {} } = {}) {
    map.createPane('walkingRoutes').style.zIndex = 460;
    const labels={transit:'Transit stops',food:'Cafés & restaurants',socialservice:'Social services',kg:'Kindergartens',sklcol:'Schools / colleges',uni:'Universities',learning:'Learning locations',grocery:'Grocery stores',fitness:'Fitness & wellness',cultural:'Cultural locations',parks:'Parks & green spaces',cycling:'Cycling-route access'};
    const thresholds={transit:400,food:500,socialservice:400,kg:800,sklcol:1500,uni:2000,learning:800,grocery:500,fitness:800,cultural:1000};
    const factors={transit_cov_score:['transit'],food_cov_score:['food'],socialservice_cov_score:['socialservice'],edu_score:['kg','sklcol','uni'],learning_cov_score:['learning'],grocery_cov_score:['grocery'],fitness_cov_score:['fitness'],cultural_cov_score:['cultural'],park_score:['parks'],cycling_dens_score:['cycling']};
    const status=document.getElementById('walk-status'),results=document.getElementById('walk-results');
    const pinButton=document.getElementById('drop-pin'),clearButton=document.getElementById('clear-pin');
    const retry=document.getElementById('retry-routing');
    const pinStatus=document.getElementById('pin-status');
    let worker,origin,pin,routeLayer,routeResult,currentFactor='overall_score',pinMode=false,requestId=0;
    let searchId=0,lastSearch=0,searchBusy=false;
    const searchCache=new Map();
    const escape=value=>{const e=document.createElement('span');e.textContent=value;return e.innerHTML;};
    const latlng=coord=>[coord[1],coord[0]];
    function clearRoute(){if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}}
    function setPinMode(enabled){
        pinMode=enabled;pinButton.textContent=enabled?'Cancel placing pin':'Drop a pin';
        pinButton.setAttribute('aria-pressed',String(enabled));
        map.getContainer().classList.toggle('placing-pin',enabled);
        pinStatus.textContent=enabled?'Click the map to set your walking start. Press Escape to cancel.':'';
    }
    function showRoute(group,index,fit=true){
        const route=routeResult?.groups[group]?.[index];if(!route)return;
        clearRoute();
        const line=L.polyline(route.path.map(latlng),{pane:'walkingRoutes',color:'#005cb9',weight:5,opacity:0.95,interactive:false});
        const connectors=route.connectors.map(points=>L.polyline(points.map(latlng),{pane:'walkingRoutes',color:'#005cb9',weight:3,dashArray:'5 7',interactive:false}));
        const destination=L.circleMarker(latlng(route.destination),{pane:'walkingRoutes',radius:8,color:'#fff',weight:2,fillColor:'#005cb9',fillOpacity:1});
        const text=document.createElement('div');text.textContent=`${route.name} · ${Math.round(route.distance)} m walk`;
        destination.bindPopup(text);
        routeLayer=L.featureGroup([line,...connectors,destination]).addTo(map);
        document.querySelectorAll('#walk-results button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.group===group&&Number(b.dataset.index)===index)));
        document.getElementById('route-caption').textContent=`${route.name}: ${Math.round(route.distance)} m estimated walk. Solid blue: network route. Dashed blue: approximate connections to the path.`;
        if(fit)map.fitBounds(routeLayer.getBounds(),{padding:[45,45],maxZoom:16});
    }
    function render(){
        clearRoute();results.innerHTML='';document.getElementById('route-caption').textContent='';
        if(!routeResult)return;
        const groups=currentFactor==='overall_score'?Object.keys(labels):(factors[currentFactor]||[]);
        if(!groups.length){results.textContent='Choose Parks, Cycling or another destination factor to explore walking routes from your pin. Tree inventory has no destination routing.';return;}
        results.innerHTML=groups.map(group=>`<section class="walk-group"><h4>${labels[group]}</h4>${routeResult.groups[group].length
            ?routeResult.groups[group].slice(0,2).map((r,i)=>`<button type="button" data-group="${group}" data-index="${i}" aria-pressed="false"><span>${escape(r.name)}</span><strong>${Math.round(r.distance)} m</strong><small>${Number.isFinite(thresholds[group]) ? `${r.distance<=thresholds[group]?'Within':'Beyond'} the ${thresholds[group].toLocaleString()} m study threshold` : group==='cycling' ? 'Walk to a mapped cycling-route segment' : 'Walk to a mapped park access point'}</small></button>`).join('')
            :'<p>No reachable source destination found within 5 km on this network.</p>'}</section>`).join('');
        const first=groups.find(g=>routeResult.groups[g].length);if(first)showRoute(first,0,false);
    }
    function startWorker(){
        if(worker)return;
        worker=new Worker('routing-worker.js');
        worker.onmessage=({data})=>{
            if(data.id!==requestId)return;
            if(data.error){status.textContent=data.error;retry.hidden=false;return;}
            routeResult=data.result;
            status.textContent='The two closest reachable destinations per category, within 5 km. Select a destination to show its route.';
            retry.hidden=true;render();
        };
        worker.onerror=()=>{worker.terminate();worker=null;status.textContent='Walking routes could not be calculated. Try again.';retry.hidden=false;};
    }
    function calculate(){
        if(!origin)return;
        routeResult=null;clearRoute();results.innerHTML='';document.getElementById('route-caption').textContent='';retry.hidden=true;
        status.textContent='Loading the walking network and calculating routes…';
        const id=++requestId;
        try{startWorker();worker.postMessage({id,point:[origin.lng,origin.lat]});}
        catch(error){status.textContent='Routing is unavailable in this browser. Please try a browser with Web Worker support.';retry.hidden=false;}
    }
    function setOrigin(point,label='Dropped pin'){
        setPinMode(false);origin={lat:point.lat,lng:point.lng};
        if(pin)map.removeLayer(pin);
        pin=L.marker(origin,{draggable:true,title:'Walking start — drag to move'}).addTo(map);
        pin.on('dragend',()=>{origin=pin.getLatLng();document.getElementById('walk-origin').textContent=`Pin: ${origin.lat.toFixed(5)}, ${origin.lng.toFixed(5)}`;calculate();});
        document.getElementById('walk-origin').textContent=label;
        clearButton.hidden=false;onLocationChange(true);calculate();
    }
    pinButton.addEventListener('click',()=>{
        setPinMode(!pinMode);

    });
    // Capture pin placement before Leaflet's polygon/marker handlers select areas.
    map.getContainer().addEventListener('click',event=>{
        if(!pinMode||event.target.closest('.leaflet-control,.leaflet-popup'))return;
        if(map.dragging?.moved())return;
        event.preventDefault();event.stopImmediatePropagation();setOrigin(map.mouseEventToLatLng(event));
    },true);
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&pinMode){setPinMode(false);pinStatus.textContent='Pin placement cancelled.';}});
    clearButton.addEventListener('click',()=>{
        ++requestId;origin=null;routeResult=null;setPinMode(false);clearRoute();
        if(pin){map.removeLayer(pin);pin=null;}results.innerHTML='';clearButton.hidden=true;retry.hidden=true;
        document.getElementById('walk-origin').textContent='';document.getElementById('route-caption').textContent='';
        status.textContent='Search an address or drop a pin to explore walking routes.';
        document.getElementById('address-input').value='';
        document.getElementById('address-results').replaceChildren();
        document.getElementById('address-status').textContent='';
        ++searchId;
        onLocationChange(false);
    });
    retry.addEventListener('click',calculate);
    results.addEventListener('click',event=>{const b=event.target.closest('[data-group]');if(b)showRoute(b.dataset.group,Number(b.dataset.index));});
    const addressStatus=document.getElementById('address-status'),addressResults=document.getElementById('address-results');
    let matches=[];
    document.getElementById('address-form').addEventListener('submit',async event=>{
        event.preventDefault();const query=document.getElementById('address-input').value.trim();
        if(!query){addressStatus.textContent='Enter a street and house number in Brno.';return;}
        if(searchBusy)return;
        const key=query.toLocaleLowerCase();
        if(!searchCache.has(key)&&Date.now()-lastSearch<1100){addressStatus.textContent='Please wait a moment before searching again.';return;}
        const id=++searchId;searchBusy=true;document.getElementById('address-submit').disabled=true;
        addressStatus.textContent='Searching addresses…';addressResults.replaceChildren();
        try{
            if(!searchCache.has(key)){
                lastSearch=Date.now();
                const url=new URL(window.BRNO_GEOCODER_URL||'https://nominatim.openstreetmap.org/search');
                const params={q:`${query}, Brno, Czechia`,format:'jsonv2',countrycodes:'cz',viewbox:'16.4,49.35,16.8,49.1',bounded:'1',limit:'5'};
                Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
                const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
                let response;try{response=await fetch(url,{signal:controller.signal,referrerPolicy:'strict-origin-when-cross-origin'});}finally{clearTimeout(timeout);}
                if(!response.ok)throw new Error('Address service unavailable');
                const data=await response.json();if(!Array.isArray(data))throw new Error('Invalid address results');
                searchCache.set(key,data.filter(r=>Number.isFinite(Number(r.lat))&&Number.isFinite(Number(r.lon))));
            }
            if(id!==searchId)return;
            matches=searchCache.get(key);
            matches.forEach((r,i)=>{const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.dataset.addressIndex=i;b.textContent=r.display_name;li.appendChild(b);addressResults.appendChild(li);});
            addressStatus.textContent=matches.length?'Choose an address to set your walking start.':'No matching address found. Try a street and house number, or drop a pin.';
        }catch(error){addressStatus.textContent='Address search is unavailable. Try again later or drop a pin on the map.';}
        finally{searchBusy=false;document.getElementById('address-submit').disabled=false;}
    });
    addressResults.addEventListener('click',event=>{
        const b=event.target.closest('[data-address-index]');if(!b)return;
        const r=matches[Number(b.dataset.addressIndex)];if(!r)return;
        const point={lat:Number(r.lat),lng:Number(r.lon)};setOrigin(point,r.display_name);map.setView(point,16);
        addressResults.replaceChildren();addressStatus.textContent='Address selected. Drag the pin to refine the starting point.';
    });
    return {setFactor(factor){currentFactor=factor;render();}};
}
