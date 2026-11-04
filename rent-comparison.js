// A dated relative-cost snapshot, deliberately outside livability weighting.
let rentalData = null;
const rentalBands = [
    {label:'Much cheaper', color:'#1a9850'},
    {label:'Cheaper', color:'#91cf60'},
    {label:'Typical', color:'#fee08b'},
    {label:'More expensive', color:'#fc8d59'},
    {label:'Much more expensive', color:'#d73027'}
];
function rentRecord(p) { return rentalData?.areas[String(p.CadastralArea_id)] || null; }
function rentBand(record) {
    if (!record || !Number.isFinite(record.difference_pct)) return null;
    const d=record.difference_pct;
    return rentalBands[d < -15 ? 0 : d < -5 ? 1 : d <= 5 ? 2 : d <= 15 ? 3 : 4];
}
function rentDifference(record) {
    const d=record.difference_pct;
    return Math.abs(d)<0.05 ? 'At the area benchmark' : `${Math.abs(d).toFixed(1)}% ${d<0?'below':'above'} the area benchmark`;
}
function rentAmount(value) {
    return Number.isFinite(value) ? new Intl.NumberFormat('en-GB', {maximumFractionDigits: 1}).format(value) : 'Not available';
}
function rentCard(p) {
    const record=rentRecord(p), band=rentBand(record);
    if (!band) return `<article class="rent-card"><strong>${escapeHtml(p.Name)}</strong><p>Rental estimate unavailable.</p></article>`;
    return `<article class="rent-card"><strong>${escapeHtml(p.Name)}</strong>
        <p><span class="rent-dot" style="background:${band.color}"></span><b>${band.label}</b></p>
        <p class="rent-price"><strong>${rentAmount(record.reference_rent)} Kč/m²/month</strong>
        <small>Estimated reference rent · 2+kk / 2+1<br>Excludes utilities and service charges.</small></p>
        <details><summary>How this compares</summary><p>${rentDifference(record)}.</p>
        <p>Compared with the median reference estimate across Brno’s 48 cadastral areas (${rentAmount(rentalData.benchmark_rent)} Kč/m²/month). Each area counts equally; this is not the median of all Brno apartments.</p>
        ${record.coverage_class===1?'<p>Limited source observations (0–30). Treat small differences cautiously.</p>':''}
        </details></article>`;
}
function rentTradeoff(areas) {
    if (areas.length!==2) return '';
    const [a,b]=areas, ra=rentRecord(a), rb=rentRecord(b);
    if(!ra||!rb) return '';
    const delta=(ra.reference_rent/rb.reference_rent-1)*100;
    const cost=Math.abs(delta)<0.05 ? 'Both areas have the same reference rental estimate.'
        : `${escapeHtml(a.Name)} has a ${Math.abs(delta).toFixed(1)}% ${delta<0?'lower':'higher'} reference rental estimate than ${escapeHtml(b.Name)}.`;
    // Report the largest meaningful difference in each direction among enabled priorities.
    const differences=scoreRows.filter(([f])=>f!=='overall_score' && factorWeights[f]>0 && Number.isFinite(a[f]) && Number.isFinite(b[f]))
        .map(([f,label])=>({label,delta:(a[f]-b[f])*5,importance:Math.abs(a[f]-b[f])*factorWeights[f]}));
    const strongest=sign=>differences.filter(d=>d.delta*sign>=0.25).sort((x,y)=>y.importance-x.importance)[0];
    const moreA=strongest(1),moreB=strongest(-1);
    const notes=[];
    if(moreA) notes.push(`${escapeHtml(a.Name)} scores higher for ${escapeHtml(moreA.label.toLowerCase())}.`);
    if(moreB) notes.push(`${escapeHtml(b.Name)} scores higher for ${escapeHtml(moreB.label.toLowerCase())}.`);
    if(!notes.length) notes.push('No large differences in the enabled livability factors.');
    return `<p class="rent-tradeoff">${cost} ${notes.join(' ')} <small>Trade-offs reflect your enabled priorities; rental cost does not change the overall score.</small></p>`;
}
function rentPanel(areas) {
    if(!rentalData) return '<section class="rent-summary"><h3>Relative rental cost</h3><p>Rental data could not be loaded. Livability scores are still available.</p></section>';
    return `<section class="rent-summary"><h3>Relative rental cost</h3>
        <p class="rent-snapshot">${escapeHtml(rentalData.snapshot)} snapshot · two-room reference apartment</p>
        ${areas.length?`<div class="rent-cards">${areas.map(rentCard).join('')}</div>${rentTradeoff(areas)}`:'<p>Select a cadastral area to see its rental-cost band, or select two to compare cost and livability.</p>'}
        <details class="rent-method"><summary>About this comparison</summary>
        <p>Standardized, unfurnished, existing two-room apartments (2+kk / 2+1). We use the Ministry’s modeled reference estimates, not raw listing medians. Figures reflect data through June 2026; this is a dated comparison, not live listings or a total housing-cost estimate.</p>
        <p>Bands relative to the area benchmark: much cheaper below −15%; cheaper −15% to below −5%; typical −5% to +5%; more expensive above +5% to +15%; much more expensive above +15%. These are project-defined bands, not official Ministry classifications. An empty band is possible.</p>
        <p>Model uncertainty means small differences may not be meaningful. Rental cost remains separate from the overall livability score.</p>
        <a href="${rentalData.source_url}" target="_blank" rel="noopener">Source: Czech Ministry of Finance</a></details></section>`;
}
function updateRentLegend() {
    const active=currentFactor==='affordability';
    const legend=document.getElementById('score-legend');
    legend.hidden=!showScoreOverlay;
    const bands=active ? [...rentalBands].reverse() : [
        {label:'Very low',color:'#d73027'}, {label:'Low',color:'#fc8d59'},
        {label:'Moderate',color:'#fee08b'}, {label:'High',color:'#91cf60'},
        {label:'Very High',color:'#1a9850'}
    ];
    legend.innerHTML=`<div class="legend-scale">${bands.map((b,i)=>
        `<div class="legend-group-color">${Array.from({length:4},()=>
            `<span class="legend-square legend-${i+1}" style="background:${b.color}"></span>`).join('')}</div>`
    ).join('')}</div>
    <div class="legend-labels">${bands.map(b=>`<span${active?' style="white-space:normal"':''}>${b.label}</span>`).join('')}</div>
    <div class="legend-no-data"><span></span> No data</div>`;
    document.querySelector('.method-note').hidden=active;
}
