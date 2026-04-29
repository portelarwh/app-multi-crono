'use strict';

(function(){
  window.APP_VERSION = 'v3.0.1';

  var refreshing = false;
  var waitingWorker = null;

  function injectStyles(){
    if(document.getElementById('multi-update-styles')) return;
    var style = document.createElement('style');
    style.id = 'multi-update-styles';
    style.textContent = `
      .multi-update-toast{
        position:fixed;
        left:12px;
        right:12px;
        bottom:calc(92px + env(safe-area-inset-bottom, 0px));
        z-index:100000;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:12px 14px;
        border:1px solid rgba(25,150,210,.45);
        border-radius:14px;
        background:rgba(17,19,21,.96);
        color:#ffffff;
        box-shadow:0 12px 32px rgba(0,0,0,.35);
        font-family:inherit;
      }
      .multi-update-toast strong{display:block;font-size:.92rem;margin-bottom:2px;}
      .multi-update-toast span{display:block;font-size:.78rem;color:#aeb8c6;line-height:1.25;}
      .multi-update-toast button{
        border:0;
        border-radius:10px;
        padding:9px 12px;
        background:#1996d2;
        color:#fff;
        font-weight:800;
        white-space:nowrap;
        cursor:pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function showUpdateToast(worker){
    waitingWorker = worker || waitingWorker;
    if(document.getElementById('multiUpdateToast')) return;

    injectStyles();

    var toast = document.createElement('div');
    toast.id = 'multiUpdateToast';
    toast.className = 'multi-update-toast';
    toast.innerHTML = `
      <div>
        <strong>Nova versão disponível</strong>
        <span>Toque em atualizar para carregar a versão mais recente do app.</span>
      </div>
      <button type="button" id="multiUpdateNow">Atualizar</button>
    `;
    document.body.appendChild(toast);

    var btn = document.getElementById('multiUpdateNow');
    if(btn){
      btn.addEventListener('click', function(){
        btn.disabled = true;
        btn.textContent = 'Atualizando...';
        if(waitingWorker){
          waitingWorker.postMessage({type:'SKIP_WAITING'});
        }else{
          window.location.reload();
        }
      });
    }
  }

  function watch(worker){
    if(!worker) return;
    worker.addEventListener('statechange', function(){
      if(worker.state === 'installed' && navigator.serviceWorker.controller){
        showUpdateToast(worker);
      }
    });
  }

  function register(){
    if(!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('controllerchange', function(){
      if(refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    window.addEventListener('load', function(){
      navigator.serviceWorker.register('sw.js').then(function(reg){
        if(reg.waiting && navigator.serviceWorker.controller){
          showUpdateToast(reg.waiting);
        }
        if(reg.installing) watch(reg.installing);
        reg.addEventListener('updatefound', function(){ watch(reg.installing); });
        reg.update().catch(function(err){ console.warn('[Multi Crono] Verificação de atualização falhou:', err); });
      }).catch(function(err){
        console.warn('[Multi Crono] Service Worker falhou:', err);
      });
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', register);
  }else{
    register();
  }
})();
