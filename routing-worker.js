/* Local shortest-path routing. No pin coordinates leave this worker. */
let graphPromise;
function loadGraph() {
    if (!graphPromise) graphPromise = fetch('data/routing/graph.json').then(r => {
        if (!r.ok) throw new Error('The walking network could not be loaded. Try again.');
        return r.json();
    }).then(prepareGraph).catch(e => { graphPromise = null; throw e; });
    return graphPromise;
}
function prepareGraph(graph) {
    for(const [placeIndex,edge,along,endAlong,offset,lng,lat] of graph.accessTargets || []){
        const place=graph.places[placeIndex],length=graph.edges[edge][2];
        graph.destinations.push({name:place.name,factor:place.factor,placeId:place.id,
            edge,along:Math.min(along,length),offset,coord:[lng,lat],
            ...(endAlong>=0?{endAlong:Math.min(endAlong,length)}:{})});
    }
    delete graph.accessTargets;
    graph.adj = Array.from({length: graph.nodes.length}, () => []);
    graph.edges.forEach(([u,v,w]) => { graph.adj[u].push([v,w]); graph.adj[v].push([u,w]); });
    return graph;
}
function interpolate(a,b,t) { return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]; }
function snap(graph, point) {
    // Local tangent coordinates are used only for the short (<=100 m) connector.
    const sy=6371008.8*Math.PI/180, sx=sy*Math.cos(point[1]*Math.PI/180);
    let best={offset:Infinity};
    graph.edges.forEach(([u,v,length],edge) => {
        const a=graph.nodes[u],b=graph.nodes[v];
        const ax=(a[0]-point[0])*sx, ay=(a[1]-point[1])*sy;
        const dx=(b[0]-a[0])*sx,dy=(b[1]-a[1])*sy;
        const ratio=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy || 1)));
        const offset=Math.hypot(ax+ratio*dx,ay+ratio*dy);
        if(offset<best.offset) best={edge,along:ratio*length,offset,coord:interpolate(a,b,ratio)};
    });
    return best;
}
class Heap {
    constructor(){this.items=[];}
    push(item){const a=this.items;let i=a.length;a.push(item);while(i){const p=(i-1)>>1;if(a[p][0]<=item[0])break;a[i]=a[p];i=p;}a[i]=item;}
    pop(){const a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(2*i+1<a.length){let c=2*i+1;if(c+1<a.length&&a[c+1][0]<a[c][0])c++;if(a[c][0]>=last[0])break;a[i]=a[c];i=c;}a[i]=last;}return first;}
}
function calculateRoutes(graph, point) {
    if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)) throw new Error('Choose a valid location.');
    const origin=snap(graph,point);
    if(origin.offset>graph.maxConnector) throw new Error('No eligible walking path within 100 m of this pin. Move it closer to a mapped street or path.');
    const n=graph.nodes.length, dist=new Float64Array(n).fill(Infinity),prev=new Int32Array(n).fill(-1),queue=new Heap();
    const [ou,ov,ol]=graph.edges[origin.edge];
    for(const [node,cost] of [[ou,origin.offset+origin.along],[ov,origin.offset+ol-origin.along]]){
        if(cost<dist[node]){dist[node]=cost;queue.push([cost,node]);}
    }
    while(queue.items.length){const [d,u]=queue.pop();if(d!==dist[u])continue;
        for(const [v,w] of graph.adj[u]){const nd=d+w;if(nd<=graph.maxDistance&&nd<dist[v]){dist[v]=nd;prev[v]=u;queue.push([nd,v]);}}
    }
    const groups={transit:[],food:[],socialservice:[],kg:[],sklcol:[],uni:[],learning:[],grocery:[],cultural:[],fitness:[],parks:[],cycling:[]};
    graph.destinations.forEach((dest,index)=>{
        const [u,v,w]=graph.edges[dest.edge];
        const endAlong=dest.endAlong ?? dest.along;
        const du=dist[u]+dest.along+dest.offset,dv=dist[v]+w-endAlong+dest.offset;
        let distance=Math.min(du,dv),end=du<=dv?u:v,direct=false;
        let targetAlong=du<=dv?dest.along:endAlong;
        if(dest.edge===origin.edge){
            const t=Math.max(dest.along,Math.min(endAlong,origin.along));
            const same=origin.offset+Math.abs(origin.along-t)+dest.offset;
            if(same<=distance){distance=same;direct=true;targetAlong=t;}
        }
        if(distance<=graph.maxDistance)groups[dest.factor].push({index,distance,end,direct,targetAlong});
    });
    for(const key of Object.keys(groups)){
        // Multiple access points to one park/route must not fill both result slots.
        const seen=new Set();
        groups[key]=groups[key].sort((a,b)=>a.distance-b.distance||a.index-b.index).filter(r=>{
            const id=graph.destinations[r.index].placeId ?? r.index;
            if(seen.has(id))return false;seen.add(id);return true;
        }).slice(0,2).map(result=>{
            const dest=graph.destinations[result.index],[u,v,w]=graph.edges[dest.edge];
            const target=interpolate(graph.nodes[u],graph.nodes[v],result.targetAlong/w);
            const destination=dest.endAlong == null ? dest.coord : target;
            const path=[];
            if(!result.direct){let node=result.end;while(node>=0){path.push(graph.nodes[node]);node=prev[node];}path.reverse();}
            return {name:dest.name,factor:key,placeId:dest.placeId,distance:result.distance,destination,
                path:[origin.coord,...path,target],connectors:[[point,origin.coord],[target,destination]]};
        });
    }
    return {groups,origin,limit:graph.maxDistance};
}
self.onmessage=async({data})=>{
    try { const graph=await loadGraph();self.postMessage({id:data.id,result:calculateRoutes(graph,data.point)}); }
    catch(error){self.postMessage({id:data.id,error:error.message});}
};
