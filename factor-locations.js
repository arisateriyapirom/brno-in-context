// Location overlays are separate from cadastral selection and comparison state.
function createFactorLocations(map) {
    const configs = {
        tree_score: { key: 'trees', label: 'Tree / shrub inventory', color: '#176c36', minZoom: 15 },
        park_score: { key: 'parks', label: 'Parks and green spaces', color: '#126438' },
        transit_cov_score: { key: 'transit', label: 'Public transport stops', color: '#1547a0' },
        socialservice_cov_score: { key: 'social', label: 'Social services', color: '#79349a' },
        cycling_dens_score: { key: 'cycling', label: 'Cycling routes', color: '#006a76' },
        food_cov_score: { key: 'food', label: 'Cafés and restaurants', color: '#91320f' },
        edu_score: { key: 'education', label: 'Education locations', color: '#3f418c' },
        learning_cov_score: { key: 'learning', label: 'Learning locations', color: '#8b5200' },
        grocery_cov_score: { key: 'grocery', label: 'Grocery stores', color: '#006e62' },
        fitness_cov_score: { key: 'fitness', label: 'Fitness & wellness', color: '#975019' },
        cultural_cov_score: { key: 'cultural', label: 'Cultural locations', color: '#9a205d' }
    };
    const education = {
        kindergarten: ['Kindergarten', '#a14700'],
        school: ['School', '#1547a0'],
        college: ['College', '#1547a0'],
        university: ['University', '#79349a']
    };
    const controls = document.getElementById('location-controls');
    const checkbox = document.getElementById('show-locations');
    const status = document.getElementById('location-status');
    const legend = document.getElementById('location-legend');
    const retry = document.getElementById('retry-locations');
    const cache = new Map();
    let factor = 'overall_score';
    let version = 0;
    let overlay = null;
    map.createPane('factorLocations').style.zIndex = 450;
    const treePane = map.createPane('treeLocations');
    treePane.style.zIndex = 450;
    treePane.style.pointerEvents = 'none';
    // A canvas covers the map viewport, including space between markers.
    // Keep it click-through for trees; SVG lets other locations receive clicks
    // only on their actual shapes, leaving cadastral polygons accessible.
    const treeRenderer = L.canvas({ pane: 'treeLocations', padding: 0.3 });
    const locationRenderer = L.svg({ pane: 'factorLocations', padding: 0.3 });

    function fetchData(url) {
        if (!cache.has(url)) {
            cache.set(url, fetch(url).then(response => {
                if (!response.ok) throw new Error(`Location data: HTTP ${response.status}`);
                return response.json();
            }).catch(error => { cache.delete(url); throw error; }));
        }
        return cache.get(url);
    }

    function clearOverlay() {
        if (overlay) { map.removeLayer(overlay); overlay = null; }
    }

    function popup(feature, config) {
        const p = feature.properties || {};
        const content = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = p.name || (education[p.category]?.[0]) || config.label;
        content.appendChild(title);
        const details = config.key === 'education' ? education[p.category]?.[0] : p.detail;
        for (const text of [details, p.extra ? `${config.key === 'transit' ? 'Lines' : 'Inventory category'}: ${p.extra}` : null]) {
            if (!text) continue;
            const line = document.createElement('div');
            line.textContent = text;
            content.appendChild(line);
        }
        return content;
    }

    async function update(nextFactor = factor) {
        factor = nextFactor;
        const request = ++version;
        const config = configs[factor];
        clearOverlay();
        controls.hidden = !config;
        legend.replaceChildren();
        retry.hidden = true;
        if (!config) { status.textContent = ''; return; }
        document.getElementById('location-label').textContent = `Show ${config.label.toLowerCase()}`;
        if (!checkbox.checked) { status.textContent = 'Locations hidden.'; return; }
        if (config.minZoom && map.getZoom() < config.minZoom) {
            status.textContent = 'Zoom in to level 15 to see individual tree / shrub records.';
            return;
        }
        status.textContent = `Loading ${config.label.toLowerCase()}…`;
        try {
            let features;
            if (config.key === 'trees') {
                const index = await fetchData('data/locations/trees.json');
                if (request !== version) return;
                const bounds = map.getBounds();
                const tiles = index.tiles.filter(({ bounds: b }) =>
                    b[0] <= bounds.getEast() && b[2] >= bounds.getWest() &&
                    b[1] <= bounds.getNorth() && b[3] >= bounds.getSouth());
                const data = await Promise.all(tiles.map(tile => fetchData(tile.url)));
                features = data.flatMap(d => d.features).filter(f => {
                    const [lng, lat] = f.geometry.coordinates;
                    return bounds.contains([lat, lng]);
                });
            } else {
                const data = await fetchData(`data/locations/${config.key}.geojson`);
                if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('Invalid location layer');
                features = data.features;
            }
            // A late response must never restore a layer from a previous tab.
            if (request !== version) return;
            const isTree = config.key === 'trees';
            const pane = isTree ? 'treeLocations' : 'factorLocations';
            const renderer = isTree ? treeRenderer : locationRenderer;
            overlay = L.geoJSON({ type: 'FeatureCollection', features }, {
                pane, renderer, interactive: !isTree,
                bubblingMouseEvents: false,
                style: { color: config.color, weight: 3, fillOpacity: 0.22, renderer, pane, interactive: !isTree, bubblingMouseEvents: false },
                pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
                    renderer, pane, interactive: !isTree, bubblingMouseEvents: false,
                    radius: config.key === 'trees' ? 3 : 5,
                    color: '#fff', weight: 1, fillOpacity: 0.95,
                    fillColor: education[feature.properties.category]?.[1] || config.color
                }),
                onEachFeature: (feature, layer) => {
                    if (!isTree) layer.bindPopup(popup(feature, config));
                }
            }).addTo(map);
            status.textContent = isTree
                ? `${features.length.toLocaleString()} inventory points in view · Click an area to select it.`
                : `${features.length.toLocaleString()} mapped features · Click a location for details or an area to select it.`;
            const items = config.key === 'education'
                ? [['Kindergarten', '#a14700'], ['School / college', '#1547a0'], ['University', '#79349a']]
                : [[config.label, config.color]];
            for (const [label, color] of items) {
                const item = document.createElement('span');
                const swatch = document.createElement('i');
                swatch.style.backgroundColor = color;
                swatch.setAttribute('aria-hidden', 'true');
                item.appendChild(swatch);
                item.appendChild(document.createTextNode(label));
                legend.appendChild(item);
            }
        } catch (error) {
            if (request !== version) return;
            console.error('Unable to load factor locations:', error);
            status.textContent = 'Locations could not be loaded. Area scores are still available.';
            retry.hidden = false;
        }
    }

    checkbox.addEventListener('change', () => update());
    retry.addEventListener('click', () => update());
    map.on('moveend', () => { if (factor === 'tree_score' && checkbox.checked) update(); });
    return { update };
}
