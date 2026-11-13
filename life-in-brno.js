let journalCategory = 'Overall';
let currentEntry = null;
let entryMap, entryMarker, entryBoundaries, journalAreasPromise;
let locationVersion = 0;
const journalArea = document.getElementById('journal-area');
const journalGrid = document.getElementById('journal-grid');
const journalDialog = document.getElementById('journal-dialog');
const categoryButtons = [...document.querySelectorAll('[data-category]')];

function matchingEntries(category, area) {
    return journalEntries.filter(entry => (category === 'Overall' || entry.categories.includes(category)) && (!area || entry.area === area));
}
function journalImageSource(src) {
    return matchMedia('(max-width: 760px)').matches && /data\/images_life\/02-0[1-5]\.jpe?g$/.test(src)
        ? src.replace('images_life/', 'images_life/mobile/').replace(/\.jpeg$/, '.jpg') : src;
}
function createPhotoCarousel(entry) {
    let index = 0;
    const carousel = document.createElement('div'); carousel.className = 'journal-carousel';
    carousel.tabIndex = 0; carousel.setAttribute('role', 'region');
    carousel.setAttribute('aria-roledescription', 'carousel');
    carousel.setAttribute('aria-label', `${entry.title} photos. Use the left and right arrow keys to browse.`);
    const image = document.createElement('img'); image.decoding = 'async';
    const previous = document.createElement('button'); previous.type = 'button';
    previous.className = 'carousel-arrow carousel-previous'; previous.textContent = '‹';
    previous.setAttribute('aria-label', 'Previous photo');
    const next = document.createElement('button'); next.type = 'button';
    next.className = 'carousel-arrow carousel-next'; next.textContent = '›';
    next.setAttribute('aria-label', 'Next photo');
    const counter = document.createElement('span'); counter.className = 'carousel-counter';
    counter.setAttribute('role', 'status'); counter.setAttribute('aria-live', 'polite');
    function show(offset) {
        index = (index + offset + entry.images.length) % entry.images.length;
        image.src = journalImageSource(entry.images[index]);
        image.alt = `${entry.alt || entry.title} — photo ${index + 1} of ${entry.images.length}`;
        counter.textContent = `${index + 1} / ${entry.images.length}`;
    }
    previous.addEventListener('click', () => show(-1));
    next.addEventListener('click', () => show(1));
    carousel.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault(); event.stopPropagation(); show(event.key === 'ArrowLeft' ? -1 : 1);
        }
    });
    let touchStart = null;
    carousel.addEventListener('touchstart', event => {
        touchStart = event.touches.length === 1 ? {x:event.touches[0].clientX,y:event.touches[0].clientY} : null;
    }, {passive:true});
    carousel.addEventListener('touchend', event => {
        if (!touchStart || !event.changedTouches.length) return;
        const dx = event.changedTouches[0].clientX - touchStart.x;
        const dy = event.changedTouches[0].clientY - touchStart.y;
        touchStart = null;
        if (matchMedia('(max-width: 760px)').matches && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) show(dx < 0 ? 1 : -1);
    }, {passive:true});
    carousel.addEventListener('touchcancel', () => { touchStart = null; });
    carousel.append(image, previous, next, counter); show(0);
    return carousel;
}
function photoContent(entry, playback = false) {
    if (playback && entry.images?.length > 1) return createPhotoCarousel(entry);
    if (entry.video && playback) {
        const video = document.createElement('video');
        video.src = entry.video; video.poster = entry.image || '';
        video.controls = true; video.playsInline = true; video.preload = 'metadata';
        video.setAttribute('aria-label', entry.alt || entry.title);
        const fallback = document.createElement('a'); fallback.href = entry.video;
        fallback.textContent = 'Open the video'; video.append(fallback);
        return video;
    }
    if (entry.image) {
        const img = document.createElement('img');
        img.src = journalImageSource(entry.image); img.alt = entry.alt || entry.title;
        img.loading = 'lazy'; img.decoding = 'async';
        return img;
    }
    const placeholder = document.createElement('span');
    placeholder.className = `journal-placeholder tone-${entry.tone}`;
    const symbol = document.createElement('span'); symbol.className = 'journal-photo-symbol'; symbol.textContent = '+';
    const label = document.createElement('span'); label.textContent = 'Your photo here';
    placeholder.append(symbol, label);
    return placeholder;
}
function tags(entry) {
    return entry.categories.map(category => {
        const tag = document.createElement('span'); tag.className = 'journal-tag'; tag.textContent = category; return tag;
    });
}
function renderObservations(entry) {
    const fields = [['visitDate','Visited'],['visitTime','Time of visit'],['cost','Cost / entry'],
        ['comfort','Seating, shade & shelter'],['walking','Getting there on foot'],['suitedTo','Who might enjoy it · my impression']];
    const list = document.getElementById('entry-observation-list');
    list.replaceChildren();
    for (const [key,label] of fields) {
        const value = entry.observations?.[key];
        if (typeof value !== 'string' || !value.trim()) continue;
        const term = document.createElement('dt'), detail = document.createElement('dd');
        term.textContent = label; detail.textContent = value.trim();
        list.append(term, detail);
    }
    document.getElementById('entry-observations').hidden = !list.children.length;
    document.getElementById('entry-observations-empty').hidden = Boolean(list.children.length);
}
function openEntry(entry) {
    currentEntry = entry;
    document.getElementById('entry-photo').replaceChildren(photoContent(entry, true));
    document.getElementById('entry-status').textContent = entry.draft ? 'Draft · writing prompt' : 'From the journal';
    document.getElementById('entry-title').textContent = entry.title;
    document.getElementById('entry-subtitle').textContent = entry.subtitle || '';
    document.getElementById('entry-subtitle').hidden = !entry.subtitle;
    document.getElementById('entry-area').textContent = `Cadastral area · ${entry.area}`;
    document.getElementById('entry-tags').replaceChildren(...tags(entry));
    const caption = document.getElementById('entry-caption');
    caption.replaceChildren(...entry.caption.split(/(\*[^*]+\*)/g).map(part => {
        if (part.startsWith('*') && part.endsWith('*')) {
            const emphasis = document.createElement('em');
            emphasis.textContent = part.slice(1, -1);
            return emphasis;
        }
        return document.createTextNode(part);
    }));
    document.getElementById('entry-date').textContent = entry.date || (entry.draft ? 'Add the date of your observation' : '');
    document.getElementById('entry-date').hidden = Boolean(entry.observations?.visitDate?.trim()) || (!entry.date && !entry.draft);
    renderObservations(entry);
    journalDialog.showModal();
    selectEntryTab('story');
    // Start within the card click gesture; native controls remain a fallback.
    const video = document.querySelector('#entry-photo video');
    if (video) video.play().catch(() => { /* Playback may be blocked by browser settings. */ });
}
function renderJournal() {
    const entries = matchingEntries(journalCategory, journalArea.value);
    journalGrid.replaceChildren();
    for (const entry of entries) {
        const card = document.createElement('button'); card.type = 'button'; card.className = 'journal-card';
        card.setAttribute('aria-label', `${entry.title} — ${entry.area}. ${entry.categories.join(', ')}${entry.draft ? '. Draft photo placeholder' : ''}`);
        const photo = document.createElement('span'); photo.className = 'journal-card-photo'; photo.append(photoContent(entry));
        if (entry.video) { const badge = document.createElement('span'); badge.className = 'journal-video-badge'; badge.textContent = '▶ Video'; photo.append(badge); }
        if (entry.images?.length > 1) { const badge = document.createElement('span'); badge.className = 'journal-video-badge'; badge.textContent = `${entry.images.length} photos`; photo.append(badge); }
        const info = document.createElement('span'); info.className = 'journal-card-info';
        const title = document.createElement('strong'); title.textContent = entry.title;
        const area = document.createElement('span'); area.className = 'journal-card-area'; area.textContent = entry.area;
        const categories = document.createElement('span'); categories.className = 'journal-tags'; categories.append(...tags(entry));
        info.append(title, area, categories); card.append(photo, info);
        card.addEventListener('click', () => openEntry(entry)); journalGrid.append(card);
    }
    document.getElementById('journal-count').textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} · ${journalCategory}${journalArea.value ? ` · ${journalArea.value}` : ''}`;
    document.getElementById('journal-empty').hidden = entries.length !== 0;
    categoryButtons.forEach(button => {
        const active = button.dataset.category === journalCategory;
        button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active));
    });
}
for (const area of [...new Set(journalEntries.map(entry => entry.area))].sort((a,b) => a.localeCompare(b,'cs'))) {
    const option = document.createElement('option'); option.value = area; option.textContent = area; journalArea.append(option);
}
categoryButtons.forEach(button => button.addEventListener('click', () => { journalCategory = button.dataset.category; renderJournal(); }));
journalArea.addEventListener('change', renderJournal);
document.getElementById('journal-reset').addEventListener('click', () => { journalCategory = 'Overall'; journalArea.value = ''; renderJournal(); });
journalDialog.addEventListener('click', event => {
    if (event.target !== journalDialog) return;
    const rect = journalDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) journalDialog.close();
});

const entryTabNames = ['story', 'location', 'notes'];
const entryTabs = entryTabNames.map(name => document.getElementById(`entry-${name}-tab`));
function selectEntryTab(tab) {
    ++locationVersion;
    entryTabs.forEach((button, i) => {
        const active = entryTabNames[i] === tab;
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
    });
    document.getElementById('entry-story-panel').hidden = tab !== 'story';
    document.getElementById('entry-location-panel').hidden = tab !== 'location';
    document.getElementById('entry-notes-panel').hidden = tab !== 'notes';
    if (tab !== 'story') document.querySelector('#entry-photo video')?.pause();
    if (tab === 'location') {
        showEntryLocation();
        BrnoStories.locationContext(currentEntry);
    }
}
function hasExactLocation(entry) {
    return Number.isFinite(entry.location?.lat) && Number.isFinite(entry.location?.lng)
        && Math.abs(entry.location.lat) <= 90 && Math.abs(entry.location.lng) <= 180;
}
async function showEntryLocation() {
    const request = ++locationVersion;
    const entry = currentEntry;
    if (!entry) return;
    const note = document.getElementById('entry-location-note');
    const retry = document.getElementById('entry-map-retry');
    document.getElementById('entry-location-title').textContent = `${entry.title} · ${entry.area}`;
    note.textContent = 'Loading the location map…'; retry.hidden = true;
    try {
        if (!entryMap) {
            entryMap = L.map('entry-map', {scrollWheelZoom: true, wheelPxPerZoomLevel: 120}).setView([49.1951, 16.6068], 12);
            L.tileLayer('https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=cb1_4e9o_1_8a91001ab07b29e54b2d4489', {
                maxZoom: 20, attribution: '&copy; OpenStreetMap contributors, &copy; CARTO'
            }).addTo(entryMap);
        }
        if (entryMarker) { entryMap.removeLayer(entryMarker); entryMarker = null; }
        if (entryBoundaries) { entryMap.removeLayer(entryBoundaries); entryBoundaries = null; }
        if (!journalAreasPromise) journalAreasPromise = Promise.all([
            'data/network_analysis/Brno_livability_network.geojson',
            'data/journal-areas.geojson'
        ].map(url => fetch(url).then(response => {
            if (!response.ok) throw new Error('Area outlines unavailable');
            return response.json();
        }))).then(([outlines, references]) => {
            // Use the livability map's exact boundaries; only draft reference pins
            // come from the separate journal-area metadata.
            const points = new Map(references.features.map(f => [f.properties.Name, f.properties.reference_point]));
            outlines.features.forEach(f => { f.properties.reference_point = points.get(f.properties.Name); });
            return outlines;
        }).catch(error => { journalAreasPromise = null; throw error; });
        const data = await journalAreasPromise;
        if (request !== locationVersion || !journalDialog.open) return;
        const area = data.features.find(feature => feature.properties.Name === entry.area);
        entryBoundaries = L.geoJSON(data, {
            interactive: false,
            style: feature => ({color: feature.properties.Name === entry.area ? '#2457c5' : '#666666',
                weight: feature.properties.Name === entry.area ? 3.5 : 1.5,
                fillOpacity: 0})
        }).addTo(entryMap);
        const exact = hasExactLocation(entry);
        const coord = exact ? [entry.location.lat, entry.location.lng]
            : area?.properties.reference_point ? [area.properties.reference_point[1], area.properties.reference_point[0]] : null;
        if (coord) {
            const label = document.createElement('span');
            label.textContent = exact ? entry.title : `${entry.area} — area reference only`;
            entryMarker = L.marker(coord, {title: label.textContent}).addTo(entryMap).bindPopup(label);
        }
        note.textContent = exact ? (entry.locationKind === 'place' ? 'The pin marks the park, not the exact filming position. The blue outline shows Město Brno.' : entry.locationKind === 'venue' ? `The pin marks ${entry.title}. The blue outline shows ${entry.area}.` : 'The pin marks the photo location. The blue outline shows its tagged cadastral area.')
            : area ? 'Exact photo location not added yet. This pin is an approximate area reference, not where the photo was taken.'
                : 'Exact photo location not added yet. Showing Brno for context.';
        if (entry.locationUrl) {
            const link = document.createElement('a'); link.href = entry.locationUrl;
            link.textContent = ' Open in Google Maps'; link.target = '_blank'; link.rel = 'noopener'; note.append(link);
        }
        requestAnimationFrame(() => {
            if (request !== locationVersion || !journalDialog.open) return;
            entryMap.invalidateSize({pan: false});
            entryMap.fitBounds(entryBoundaries.getBounds(), {padding: [18, 18]});
            if (exact) entryMap.setView(coord, 13);
        });
    } catch (error) {
        if (request !== locationVersion) return;
        note.textContent = 'The location map could not be loaded. Please try again.';
        retry.hidden = false;
    }
}
entryTabs.forEach((button, i) => {
    button.addEventListener('click', () => selectEntryTab(entryTabNames[i]));
    button.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (i + 1) % entryTabs.length;
        else if (event.key === 'ArrowLeft') next = (i + entryTabs.length - 1) % entryTabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = entryTabs.length - 1;
        else return;
        event.preventDefault(); entryTabs[next].focus(); selectEntryTab(entryTabNames[next]);
    });
});
document.getElementById('entry-map-retry').addEventListener('click', showEntryLocation);
journalDialog.addEventListener('close', () => { ++locationVersion; document.querySelector('#entry-photo video')?.pause(); });
renderJournal();
const linkedEntry=BrnoStories.byId(new URLSearchParams(location.search).get('story'));
if(linkedEntry)openEntry(linkedEntry);
