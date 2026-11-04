// Non-modal data panel: the map and area controls remain available alongside it.
(() => {
    const toggle=document.getElementById('about-data-toggle');
    const panel=document.getElementById('about-data-panel');
    const close=document.getElementById('about-data-close');
    function setOpen(open,returnFocus=false){
        panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));
        if(open)close.focus();else if(returnFocus)toggle.focus();
    }
    toggle.addEventListener('click',()=>setOpen(panel.hidden));
    close.addEventListener('click',()=>setOpen(false,true));
    document.addEventListener('keydown',event=>{
        if(event.key==='Escape'&&!panel.hidden){event.preventDefault();setOpen(false,true);}
    });
    document.addEventListener('click',event=>{
        if(!panel.hidden&&!panel.contains(event.target)&&!toggle.contains(event.target))setOpen(false);
    });
})();
