/* Exact conjunction over per-building access masks, aggregated by housing area. */
function calculateEssentials(bins, selectedIndices) {
    const selectedMask=selectedIndices.reduce((mask,i)=>mask|(1<<i),0);
    let total=0,matched=0;
    const missing=selectedIndices.map(index=>({index,weight:0}));
    for(const [mask,weight] of bins||[]){
        total+=weight;
        if(selectedMask && (mask&selectedMask)===selectedMask)matched+=weight;
        for(const item of missing)if(!(mask&(1<<item.index)))item.weight+=weight;
    }
    return {total,matched,percent:total&&selectedMask?100*matched/total:null,
        missing:missing.map(item=>({...item,percent:total?100*item.weight/total:null})).sort((a,b)=>b.weight-a.weight||a.index-b.index)};
}
