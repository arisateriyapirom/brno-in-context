function scoreToFive(score) {
    return Math.round(score * 5 *10) / 10;
}

let currentFactor = 'overall_score';
let showScoreOverlay = false;
let livabilityLayer;
let selectedAreas = [];
let locationMode = false;
const areaLayers = new Map();
let searchMatches = [];
const selectionColors = ['#2457c5', '#8b35a8'];
const scoreRows = [
    ['overall_score', 'Overall'], ['tree_score', 'Trees'], ['park_score', 'Parks'],
    ['transit_cov_score', 'Transit'], ['socialservice_cov_score', 'Social services'],
    ['cycling_dens_score', 'Cycling'], ['food_cov_score', 'Café & restaurant'],
    ['edu_score', 'Education'], ['learning_cov_score', 'Learning'],
    ['grocery_cov_score', 'Groceries'], ['cultural_cov_score', 'Culture'], ['fitness_cov_score', 'Fitness & wellness']
];
const factorWeights = Object.fromEntries(scoreRows.filter(([field]) => field !== 'overall_score').map(([field]) => [field, 1]));
const weightLabels = ['Off', 'Standard', 'More important', 'Most important'];
const networkDataUrl = 'data/network_analysis/Brno_livability_network.geojson';

//add a color function
function getColor(score) {
    if (!Number.isFinite(score)) return '#b8b8b8';
    if (score >= 0.8) return '#1a9850';
    if (score >= 0.6) return '#91cf60';
    if (score >= 0.4) return '#fee08b';
    if (score >= 0.2) return '#fc8d59';
    return '#d73027';
}

//calculating overall score
function getOverallScore(properties) {
    if (globalThis.ResidentialAccess?.active) return ResidentialAccess.overall(properties, factorWeights);
    // Preserve the published baseline exactly when priorities are reset.
    if (Object.values(factorWeights).every(weight => weight === 1) && Number.isFinite(properties.overall_score)) {
        return properties.overall_score;
    }
    let weightedTotal = 0;
    let totalWeight = 0;
    for (const [field, weight] of Object.entries(factorWeights)) {
        if (weight > 0 && Number.isFinite(properties[field])) {
            weightedTotal += properties[field] * weight;
            totalWeight += weight;
        }
    }
    return totalWeight ? Math.round(weightedTotal / totalWeight * 1e6) / 1e6 : null;
}

function overallRank(properties) {
    const score = getOverallScore(properties);
    if (!Number.isFinite(score)) return '';
    const scores = [...areaLayers.values()].map(layer => getOverallScore(layer.feature.properties)).filter(Number.isFinite);
    const rank = 1 + scores.filter(other => other > score).length;
    return `Rank ${rank} of ${scores.length}`;
}

function setupPriorities() {
    const controls = document.getElementById('priority-controls');
    for (const [field, label] of scoreRows.filter(([field]) => field !== 'overall_score')) {
        const row = document.createElement('div');
        row.className = 'priority-row';
        row.innerHTML = `<label for="weight-${field}">${label === 'Education' ? 'Formal education' : label}</label>
            <output id="value-${field}" for="weight-${field}">Standard</output>
            <input id="weight-${field}" type="range" min="0" max="3" step="1" value="1" aria-valuetext="Standard">`;
        controls.appendChild(row);
        row.querySelector('input').addEventListener('input', event => {
            factorWeights[field] = Number(event.target.value);
            updatePriorities();
        });
    }
    document.getElementById('reset-priorities').disabled = false;
    document.getElementById('reset-priorities').addEventListener('click', () => {
        Object.keys(factorWeights).forEach(field => { factorWeights[field] = 1; });
        updatePriorities();
    });
    updatePriorityLabels();
}

function updatePriorityLabels() {
    for (const [field, weight] of Object.entries(factorWeights)) {
        const input = document.getElementById(`weight-${field}`);
        input.value = weight;
        input.setAttribute('aria-valuetext', weightLabels[weight]);
        document.getElementById(`value-${field}`).textContent = weightLabels[weight];
    }
    const weights = Object.values(factorWeights);
    document.getElementById('priority-status').textContent = weights.every(w => w === 0)
        ? 'All factors are off. Enable at least one to see overall scores and rankings.'
        : weights.every(w => w === 1) ? 'Equal weights · all factors have the same importance.'
            : 'Custom priorities · overall scores and rankings updated. Individual factor scores stay the same.';
}

function updatePriorities() {
    updatePriorityLabels();
    map.closePopup();
    refreshSelectionStyles();
    renderComparison();
}

//add a styling function
function styleFeature(feature) {

    let score;

    if (currentFactor === 'overall_score') {
        score = getOverallScore(feature.properties);
    } else {
        score = factorScore(feature.properties, currentFactor);
    }

    const selectedIndex = selectedAreas.indexOf(areaId(feature.properties));
    return {
        fillColor: currentFactor === 'affordability' ? (rentBand(rentRecord(feature.properties))?.color || '#b8b8b8') : getColor(score),
        weight: selectedIndex >= 0 ? 3.5 : 1.5,
        color: selectedIndex >= 0 ? selectionColors[selectedIndex] : (showScoreOverlay && !globalThis.ResidentialAccess?.gridVisible ? '#ffffff' : '#666666'),
        fillOpacity: globalThis.ResidentialAccess?.gridVisible ? 0 : showScoreOverlay ? (selectedIndex >= 0 ? 0.85 : 0.7) : 0
    };
}

//converting scores into rating blocks

function getRatingBlocks(score) {

    if (!Number.isFinite(score)) return '<span class="no-data">No data</span>';

    const filled = Math.round(score * 5);

    return Array.from({ length: 5 }, (_, i) => {

        return `
            <span class="rating-block ${i < filled ? 'active' : ''}"></span>
        `;

    }).join('');
}

function getMiniRating(score) {

    if (!Number.isFinite(score)) return '<span class="no-data">No data</span>';

    const filled = Math.round(score * 5);

    return Array.from({ length: 5 }, (_, i) => {

        return `
            <span class="mini-block ${i < filled ? 'active' : ''}"></span>
        `;

    }).join('');
}

function areaId(properties) {
    return String(properties.CadastralArea_id);
}

function factorScore(properties, factor) {
    if (factor !== 'overall_score' && globalThis.ResidentialAccess?.applies(factor)) return ResidentialAccess.score(properties, factor);
    return factor === 'overall_score' ? getOverallScore(properties) : properties[factor];
}

function refreshSelectionStyles() {
    livabilityLayer.setStyle(styleFeature);
    selectedAreas.forEach(id => areaLayers.get(id).bringToFront());
    globalThis.ResidentialAccess?.refresh();
}

function renderComparison() {
    globalThis.ResidentialAccess?.render();
    globalThis.BrnoMobile?.sync();
    const exploreLocation = locationMode && currentFactor !== 'affordability';
    document.getElementById('area-results').hidden = exploreLocation;
    document.getElementById('location-results').hidden = !exploreLocation;
    if (exploreLocation) {
        document.getElementById('overall-area-name').textContent = 'Explore this location';
        document.getElementById('clear-selection').hidden = true;
        return;
    }
    const areas = selectedAreas.map(id => areaLayers.get(id).feature.properties);
    document.getElementById('overall-area-name').textContent = areas.length === 2
        ? 'Compare areas' : areas.length ? areas[0].Name : 'Explore an area';
    document.getElementById('clear-selection').hidden = !areas.length;
    document.getElementById('selection-status').textContent = areas.length === 2
        ? `Comparing ${areas[0].Name} and ${areas[1].Name}. Selecting another area replaces B.`
        : areas.length ? `${areas[0].Name} selected. Choose a second area to compare.`
            : 'Click an area or search by name. Select a second area to compare.';
    document.getElementById('selected-areas').innerHTML = areas.map((p, i) => `
        <div class="selected-area selection-${i}">
            <button type="button" data-focus-area="${areaId(p)}" title="Show on map">
                <strong>${i === 0 ? 'A' : 'B'}</strong> ${escapeHtml(p.Name)}
            </button>
            <button type="button" data-remove-area="${areaId(p)}" aria-label="Remove ${escapeHtml(p.Name)}">×</button>
        </div>
    `).join('');
    if (!areas.length) {
        document.getElementById('score-comparison').innerHTML = currentFactor === 'affordability' ? rentPanel([]) : '';
        return;
    }
    const headers = areas.map((p, i) => `<th scope="col" class="selection-${i}">${i === 0 ? 'A' : 'B'} · ${escapeHtml(p.Name)}</th>`).join('');
    const orderedRows = globalThis.BrnoMobile?.active ? [...scoreRows].sort(([a],[b]) => {
        const priority = field => field === 'overall_score' ? 100 : field === currentFactor ? 90 : factorWeights[field];
        return priority(b) - priority(a);
    }) : scoreRows;
    const rows = orderedRows.map(([field, label]) => {
        const values = areas.map(p => factorScore(p, field));
        const rounded = values.map(v => Number.isFinite(v) ? scoreToFive(v) : null);
        const cells = values.map((value, i) => {
            if (!Number.isFinite(value)) return '<td><span class="no-data">No data</span></td>';
            const higher = rounded.length === 2 && rounded.every(Number.isFinite) && rounded[i] > rounded[1 - i];
            return `<td${higher ? ' class="higher-score"' : ''}>
                <span class="score-value">${rounded[i].toFixed(1)} <span>/ 5</span></span>
                <span class="score-bar" aria-hidden="true"><span style="width: ${value * 100}%"></span></span>
                ${higher ? '<span class="score-verdict">Higher</span>' : ''}
                ${field === 'overall_score' ? `<span class="score-rank">${overallRank(areas[i])}</span>` : ''}
            </td>`;
        }).join('');
        const rowLabel = globalThis.ResidentialAccess?.active && ['tree_score','park_score','cycling_dens_score'].includes(field) ? `${label} · area context` : label;
        return `<tr${field === currentFactor ? ' class="current-factor"' : ''}><th scope="row">${rowLabel}</th>${cells}</tr>`;
    }).join('');
    document.getElementById('score-comparison').innerHTML = `
        ${rentPanel(areas)}
        <table class="comparison-table"><caption>${globalThis.ResidentialAccess?.caption() || 'Livability scores out of 5'}</caption>
            <thead><tr><th scope="col">Factor</th>${headers}</tr></thead><tbody>${rows}</tbody>
        </table>`;
}

function showAreaPopup(layer) {
    const p = layer.feature.properties;
    if (currentFactor === 'affordability') {
        layer.setPopupContent(`<div class="score-popup">${rentCard(p)}<small>August 2026 · two-room reference apartment</small></div>`);
        layer.openPopup();
        return;
    }
    const score = factorScore(p, currentFactor);
    const scoreText = Number.isFinite(score) ? `${scoreToFive(score)} / 5` : 'Not available';
    layer.setPopupContent(`<div class="score-popup">
        <strong>${escapeHtml(p.Name)}</strong>
        <div class="popup-factor">${globalThis.ResidentialAccess?.active && currentFactor === 'overall_score' ? 'Residential access' : factorLabels[currentFactor]}</div>
        <div class="popup-rating">${getRatingBlocks(score)}</div>
        <div class="popup-score">${scoreText}</div>
        ${currentFactor === 'overall_score' ? `<div class="score-rank">${overallRank(p)}</div>` : ''}
        <div class="popup-coverage">${coverageDetails(p)}</div>
    </div>`);
    layer.openPopup();
}

function selectArea(id, focusMap = false) {
    const layer = areaLayers.get(id);
    if (!layer) return;
    globalThis.ResidentialAccess?.clearCell();
    const mobileComparing = globalThis.BrnoMobile?.comparing;
    if (globalThis.BrnoMobile?.active && locationMode) document.getElementById('clear-pin').click();
    if (globalThis.BrnoMobile?.active && !mobileComparing) selectedAreas = [id];
    if (!selectedAreas.includes(id)) {
        if (selectedAreas.length === 2) selectedAreas[1] = id;
        else selectedAreas.push(id);
    }
    refreshSelectionStyles();
    renderComparison();
    if (focusMap) map.fitBounds(layer.getBounds(), { padding: [35, 35], maxZoom: 14 });
    if (globalThis.BrnoMobile?.active) { map.closePopup(); globalThis.BrnoMobile.selected(); }
    else showAreaPopup(layer);
}

function removeArea(id) {
    selectedAreas = selectedAreas.filter(selected => selected !== id);
    map.closePopup();
    refreshSelectionStyles();
    renderComparison();
}

function normalizeName(name) {
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('cs').trim();
}

function findAreas(query) {
    const normalized = normalizeName(query);
    if (!normalized) return [];
    return [...areaLayers.values()].filter(layer => normalizeName(layer.feature.properties.Name).includes(normalized))
        .sort((a, b) => {
            const an = a.feature.properties.Name, bn = b.feature.properties.Name;
            return Number(normalizeName(bn).startsWith(normalized)) - Number(normalizeName(an).startsWith(normalized))
                || an.localeCompare(bn, 'cs');
        });
}

function closeSearchResults() {
    document.getElementById('search-results').hidden = true;
}

function chooseSearchResult(id) {
    const p = areaLayers.get(id).feature.properties;
    document.getElementById('area-search').value = p.Name;
    closeSearchResults();
    selectArea(id, true);
    document.getElementById('search-status').textContent = `${p.Name} highlighted on the map.`;
}

function updateSearchResults() {
    const query = document.getElementById('area-search').value;
    searchMatches = findAreas(query);
    const list = document.getElementById('search-results');
    list.innerHTML = searchMatches.map(layer => {
        const p = layer.feature.properties;
        return `<li><button type="button" data-search-area="${areaId(p)}">${escapeHtml(p.Name)}</button></li>`;
    }).join('');
    list.hidden = !searchMatches.length;
    document.getElementById('search-status').textContent = !query.trim()
        ? 'Search with or without Czech accents.'
        : searchMatches.length ? `${searchMatches.length} matching areas. Choose a result or press Enter.`
            : 'No matching area. Try a different name.';
}

function setupAreaControls() {
    const input = document.getElementById('area-search');
    const list = document.getElementById('search-results');
    input.disabled = false;
    document.getElementById('search-submit').disabled = false;
    document.getElementById('search-status').textContent = 'Search with or without Czech accents.';
    input.addEventListener('input', updateSearchResults);
    input.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeSearchResults();
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            updateSearchResults();
            list.querySelector('button')?.focus();
        }
    });
    document.getElementById('area-search-form').addEventListener('submit', event => {
        event.preventDefault();
        searchMatches = findAreas(input.value);
        const exact = searchMatches.find(layer => normalizeName(layer.feature.properties.Name) === normalizeName(input.value));
        const match = exact || (searchMatches.length === 1 ? searchMatches[0] : null);
        if (match) chooseSearchResult(areaId(match.feature.properties));
        else updateSearchResults();
    });
    list.addEventListener('click', event => {
        const button = event.target.closest('[data-search-area]');
        if (button) {
            chooseSearchResult(button.dataset.searchArea);
            input.focus();
        }
    });
    list.addEventListener('keydown', event => {
        if (event.key === 'Escape') { closeSearchResults(); input.focus(); }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const buttons = [...list.querySelectorAll('button')];
            const next = buttons.indexOf(document.activeElement) + (event.key === 'ArrowDown' ? 1 : -1);
            if (next < 0) input.focus();
            else buttons[Math.min(next, buttons.length - 1)]?.focus();
        }
    });
    document.getElementById('selected-areas').addEventListener('click', event => {
        const remove = event.target.closest('[data-remove-area]');
        const focus = event.target.closest('[data-focus-area]');
        if (remove) {
            removeArea(remove.dataset.removeArea);
            document.getElementById('area-search').focus();
        } else if (focus) selectArea(focus.dataset.focusArea, true);
    });
    document.getElementById('clear-selection').addEventListener('click', () => {
        globalThis.ResidentialAccess?.clearCell();
        selectedAreas = [];
        map.closePopup();
        refreshSelectionStyles();
        renderComparison();
        input.value = '';
        updateSearchResults();
        input.focus();
    });
}

const factorLabels = {
    affordability: 'Relative Rental Cost',
    overall_score: 'Overall Livability',
    tree_score: 'Tree Density',
    park_score: 'Park Coverage',
    transit_cov_score: 'Public Transport Coverage',
    socialservice_cov_score: 'Social Services Coverage',
    cycling_dens_score: 'Cycling Route Density',
    food_cov_score: 'Cafe & Restaurant Coverage',
    edu_score: 'Formal Education Coverage',
    learning_cov_score: 'Learning Coverage',
    grocery_cov_score: 'Grocery Store Coverage',
    cultural_cov_score: 'Cultural Coverage',
    fitness_cov_score: 'Fitness & Wellness Coverage'
};

const factorDescriptions = {
    affordability: 'Compare rental-cost bands across Brno for a standardized two-room apartment. August 2026 snapshot, based on data through June 2026. Bands are relative to the median of 48 area estimates; affordability does not change the overall livability score.',
    overall_score: 
        'An average of eleven factors weighted by your priorities. All factors start equally weighted; missing scores are omitted. Access to services is measured along the walking network.',
    tree_score:
        'Measures tree density (count) within each cadastral area.',
    park_score:
        'Measures the proportion of each cadastral area covered by major parks and green spaces.',
    transit_cov_score: 
        'Estimates the proportion of each cadastral area within a 400 m walk of a public transport stop.',
    socialservice_cov_score:
        'Estimates the proportion of each cadastral area within a 400 m walk of a social service center. Scores are scaled relative to the area with the highest coverage.',
    cycling_dens_score:
        'Measures the density of cycling routes within each cadastral area.',
    food_cov_score:
        'Estimates the proportion of each cadastral area within a 500 m walk of a café or restaurant.',
    edu_score:
        'Combines walking coverage within 800 m of a kindergarten (50%), 1,500 m of a school or college (35%), and 2,000 m of a university (15%).',
    learning_cov_score:
        'Estimates the proportion of land within an 800 m walk of a library, community center or other learning location in the supplied dataset.',
    grocery_cov_score:
        'Estimates the proportion of land within a 500 m walk of a supermarket, convenience store, greengrocer or grocery store. Private and permit-only destinations are excluded.',
    fitness_cov_score:
        'Estimates land within an 800 m walk of a location in the supplied fitness and wellness dataset. Only locations within 100 m of the existing QGIS school points are excluded. Access tags are not used to filter these locations; public access, opening hours and entrances are not verified.',
    cultural_cov_score:
        'Estimates the proportion of land within a 1,000 m walk of a museum, gallery, theatre, cinema, arts center or event venue in the supplied dataset.'
};

function coverageDetails(properties) {
    if (globalThis.ResidentialAccess?.applies(currentFactor)) return ResidentialAccess.coverage(properties);
    const fields = {
        transit_cov_score: [['transit_cov_pct', 'Within a 400 m walk']],
        socialservice_cov_score: [['socialservice_cov_pct', 'Within a 400 m walk']],
        food_cov_score: [['food_cov_pct', 'Within a 500 m walk']],
        learning_cov_score: [['learning_cov_pct', 'Within an 800 m walk']],
        grocery_cov_score: [['grocery_cov_pct', 'Within a 500 m walk']],
        fitness_cov_score: [['fitness_cov_pct', 'Within an 800 m walk']],
        cultural_cov_score: [['cultural_cov_pct', 'Within a 1,000 m walk']],
        edu_score: [
            ['kg_cov_pct', 'Kindergarten · 800 m'],
            ['sklcol_cov_pct', 'School/college · 1,500 m'],
            ['uni_cov_pct', 'University · 2,000 m']
        ]
    };
    return (fields[currentFactor] || []).map(([field, label]) =>
        Number.isFinite(properties[field])
            ? `<div>${label}: <strong>${properties[field].toFixed(1)}%</strong> of land area</div>`
            : ''
    ).join('');
}

function escapeHtml(value) {
    const element = document.createElement('span');
    element.textContent = value;
    return element.innerHTML;
}

const map = L.map('map', {
    scrollWheelZoom: true,
    wheelPxPerZoomLevel: 120
}).setView(
    [49.1951, 16.6068],
    12
);


L.tileLayer(
    'https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=cb1_4e9o_1_8a91001ab07b29e54b2d4489',
    {
        maxZoom: 20,
        opacity: 0.55,
        attribution:
            '&copy; OpenStreetMap contributors, &copy; CARTO'
    }
).addTo(map);

const scoreOverlayControl = L.control({ position: 'topright' });
scoreOverlayControl.onAdd = function () {
    const container = L.DomUtil.create('div', 'score-overlay-control leaflet-bar');
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'show-score-overlay';
    checkbox.checked = false;
    checkbox.disabled = true;
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode('Show score overlay'));
    container.appendChild(label);
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    checkbox.addEventListener('change', () => {
        showScoreOverlay = checkbox.checked;
        updateRentLegend();
        if (livabilityLayer) refreshSelectionStyles();
    });
    return container;
};
scoreOverlayControl.addTo(map);

const factorLocations = createFactorLocations(map);
const walkingExplorer = createWalkingExplorer(map, {
    onLocationChange(active) {
        locationMode = active;
        renderComparison();
        globalThis.BrnoMobile?.location(active);
    }
});

// Factor controls and viewport changes can resize the map without a window resize.
if (typeof ResizeObserver !== 'undefined') {
    const mapResizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    });
    mapResizeObserver.observe(document.getElementById('map'));
}

document.querySelectorAll('.filters button').forEach(button => { button.disabled = true; });

Promise.all([fetch(networkDataUrl), fetch('data/rent/relative_rent.json').then(r => { if (!r.ok) throw Error('Rental data unavailable'); return r.json(); }).catch(error => { console.warn(error); return null; })])
    .then(([response, rent]) => { rentalData = rent; return response; })
    .then(response => {
        if (!response.ok) throw new Error(`Network data request failed: ${response.status}`);
        return response.json();
    })
    .then(data => {

        if (data.type !== 'FeatureCollection' || !data.features?.length ||
            data.features.some(feature => feature.properties?.analysis_method !== 'network_area_grid')) {
            throw new Error('Expected network livability results');
        }

        livabilityLayer = L.geoJSON(data, {

            style: styleFeature,

            onEachFeature: function(feature, layer) {

                layer.on({
                    mouseover: highlightFeature,
                    mouseout:resetHighlight
                });

                layer.bindPopup('');

                areaLayers.set(areaId(feature.properties), layer);
                layer.on('click', () => selectArea(areaId(feature.properties)));

            }

        }).addTo(map);

        setupAreaControls();
        setupPriorities();
        globalThis.ResidentialAccess?.init();
        document.getElementById('show-score-overlay').disabled = false;
        map.fitBounds(livabilityLayer.getBounds());
        document.getElementById('map-status').textContent =
            `Walking-network analysis · ${data.features.length} cadastral areas`;
        document.getElementById('factor-description').textContent = factorDescriptions[currentFactor];

        setTimeout(function () {
            map.invalidateSize();
        }, 100);


        document.querySelectorAll('.filters button').forEach(button => {

            button.disabled = false;
            button.setAttribute('aria-pressed', String(button.dataset.factor === currentFactor));

            button.addEventListener('click', function() {

                currentFactor = this.dataset.factor;
                if (currentFactor === 'affordability') {
                    showScoreOverlay = true;
                    document.getElementById('show-score-overlay').checked = true;
                }
                updateRentLegend();
                walkingExplorer.setFactor(currentFactor);
                factorLocations.update(currentFactor);

                map.closePopup();

                // Update map colors
                refreshSelectionStyles();
                renderComparison();

                // Update map title
                document.getElementById('map-title').textContent =
                    this.dataset.label;

                // Update description
                document.getElementById('factor-description').textContent =
                    factorDescriptions[currentFactor];

                // Remove highlight from all buttons
                document.querySelectorAll('.filters button').forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                });

                // Highlight clicked button
                    this.classList.add('active');
                    this.setAttribute('aria-pressed', 'true');
                    globalThis.ResidentialAccess?.refreshText();

            });

        });

    })
    .catch(error => {
        console.error('Unable to load network livability results:', error);
        document.getElementById('map-status').textContent =
            'Network results could not be loaded. Please reload the page to try again.';
        document.getElementById('map-status').classList.add('load-error');
        document.getElementById('search-status').textContent = 'Search is unavailable until the map data loads.';
    });

function highlightFeature(e) {

    const layer = e.target;

    const selectedIndex = selectedAreas.indexOf(areaId(layer.feature.properties));
    layer.setStyle({
        weight: selectedIndex >= 0 ? 4.5 : 2,
        color: selectedIndex >= 0 ? selectionColors[selectedIndex] : '#222222',
        fillOpacity: globalThis.ResidentialAccess?.gridVisible ? 0 : showScoreOverlay ? 0.85 : 0
    });

    layer.bringToFront();
}

function resetHighlight(e) {

    livabilityLayer.resetStyle(e.target);
}
