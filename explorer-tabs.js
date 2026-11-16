(() => {
    let active='overview';
    const names=['overview','essentials','life'];
    function select(name){
        if(!names.includes(name)||name===active)return;
        const previous=active;active=name;
        names.forEach(n=>{
            const button=document.getElementById(`${n}-tab`);
            button.setAttribute('aria-selected',String(n===name));button.tabIndex=n===name?0:-1;
            document.getElementById(`${n}-panel`).hidden=n!==name;
        });
        document.body.dataset.explorerTab=name;
        if(previous==='essentials')BrnoEssentials.leave();
        if(name==='essentials')BrnoEssentials.enter();
        map.closePopup();renderComparison();
    }
    window.ExplorerTabs={get active(){return active;},select,init(){
        names.forEach((name,i)=>{
            const button=document.getElementById(`${name}-tab`);button.disabled=false;
            button.addEventListener('click',()=>select(name));
            button.addEventListener('keydown',e=>{
                let next;if(e.key==='ArrowRight')next=(i+1)%names.length;else if(e.key==='ArrowLeft')next=(i+names.length-1)%names.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=names.length-1;else return;
                e.preventDefault();document.getElementById(`${names[next]}-tab`).focus();select(names[next]);
            });
        });
        BrnoEssentials.init();
    }};
})();
