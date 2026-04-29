'use strict';

(function(){
  function clean(value){
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function slug(text){
    return clean(text || 'multi-crono')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'multi-crono';
  }

  function stamp(){
    var d = new Date();
    var p = function(n){ return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes());
  }

  function downloadBlob(blob, name){
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }

  function canvasToBlob(canvas){
    return new Promise(function(resolve, reject){
      canvas.toBlob(function(blob){
        blob ? resolve(blob) : reject(new Error('Falha ao gerar imagem.'));
      }, 'image/png', 0.95);
    });
  }

  function getTimers(){
    var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
    var timers = cards.map(function(card, index){
      var title = clean((card.querySelector('.card-title') || {}).textContent) || ('Cronômetro ' + (index + 1));
      var time = clean((card.querySelector('.time') || {}).textContent) || '00:00';
      var lap = clean((card.querySelector('.lap-inline') || {}).textContent);
      var laps = Array.prototype.slice.call(card.querySelectorAll('.lap-row')).slice(0, 3).map(function(row){
        return clean(row.textContent);
      });
      return { title: title, time: time, lap: lap, laps: laps };
    }).filter(function(item){
      return item.title || item.time;
    });

    return timers;
  }

  function buildSummaryText(){
    var timers = getTimers();
    var running = Array.prototype.slice.call(document.querySelectorAll('.action-btn.pause')).length;
    var total = timers.length;
    var lines = [];

    lines.push('Resumo Executivo — Multi Cronômetro');
    lines.push('');
    lines.push('Cronômetros: ' + total);
    lines.push('Em execução: ' + running);
    lines.push('Data: ' + new Date().toLocaleString('pt-BR'));

    if(timers.length){
      lines.push('');
      lines.push('Tempos:');
      timers.slice(0, 12).forEach(function(timer, index){
        lines.push((index + 1) + '. ' + timer.title + ' — ' + timer.time + (timer.lap ? ' | ' + timer.lap : ''));
      });
      if(timers.length > 12){
        lines.push('+' + (timers.length - 12) + ' cronômetro(s) adicionais.');
      }
    }else{
      lines.push('');
      lines.push('Nenhum cronômetro registrado no momento.');
    }

    lines.push('');
    lines.push('Imagem do painel em anexo.');
    return lines.join('\n');
  }

  async function buildPNGBlob(){
    if(typeof window.html2canvas !== 'function'){
      throw new Error('Biblioteca html2canvas não carregada.');
    }

    var target = document.querySelector('.app') || document.body;
    var canvas = await window.html2canvas(target, {
      scale: 2,
      backgroundColor: '#202228',
      logging: false,
      useCORS: true,
      onclone: function(doc){
        var splash = doc.getElementById('splash');
        if(splash) splash.style.display = 'none';
        Array.prototype.slice.call(doc.querySelectorAll('.modal, .toast, .multi-update-toast')).forEach(function(el){
          el.style.display = 'none';
        });
        var btn = doc.getElementById('multiWhatsAppShareBtn');
        if(btn) btn.style.display = 'none';
      }
    });

    return canvasToBlob(canvas);
  }

  async function share(){
    var btn = document.getElementById('multiWhatsAppShareBtn') || findWhatsAppButton();
    var oldText = btn ? btn.textContent : '';

    if(btn){
      btn.disabled = true;
      btn.textContent = '⏳ Gerando...';
    }

    try{
      var text = buildSummaryText();
      var blob = await buildPNGBlob();
      var name = 'multi-crono_' + stamp() + '.png';
      var file = new File([blob], name, { type: 'image/png' });

      if(navigator.share && navigator.canShare && navigator.canShare({ files: [file] })){
        await navigator.share({
          files: [file],
          title: 'Multi Cronômetro',
          text: text
        });
      }else{
        downloadBlob(blob, name);
        window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
      }
    }catch(e){
      if(e && e.name === 'AbortError') return;
      console.error('[Multi Crono] Erro WhatsApp:', e);
      alert((e && e.message) || 'Erro ao gerar compartilhamento para WhatsApp.');
    }finally{
      if(btn){
        btn.textContent = oldText;
        btn.disabled = false;
      }
    }
  }

  function isWhatsAppButton(el){
    if(!el || el.tagName !== 'BUTTON') return false;
    var txt = clean(el.textContent).toLowerCase();
    var id = String(el.id || '').toLowerCase();
    var cls = String(el.className || '').toLowerCase();
    return txt.indexOf('whatsapp') >= 0 || txt.indexOf('💬') >= 0 || id.indexOf('whatsapp') >= 0 || cls.indexOf('whatsapp') >= 0;
  }

  function findWhatsAppButton(){
    return Array.prototype.slice.call(document.querySelectorAll('button')).find(isWhatsAppButton) || null;
  }

  function ensureButton(){
    var existing = document.getElementById('multiWhatsAppShareBtn') || findWhatsAppButton();
    if(existing) return existing;

    var row = document.querySelector('.action-row');
    if(!row) return null;

    var btn = document.createElement('button');
    btn.id = 'multiWhatsAppShareBtn';
    btn.type = 'button';
    btn.className = 'header-btn';
    btn.style.backgroundColor = '#25D366';
    btn.textContent = 'WhatsApp';
    btn.title = 'Compartilhar resumo e imagem pelo WhatsApp';
    row.appendChild(btn);
    return btn;
  }

  function bind(){
    var btn = ensureButton();
    if(!btn || btn.dataset.multiWhatsappBound === 'true') return;
    btn.dataset.multiWhatsappBound = 'true';
    btn.addEventListener('click', function(event){
      if(btn.disabled) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      share();
    }, true);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bind);
  }else{
    bind();
  }

  window.addEventListener('load', bind);
  window.buildMultiCronoPNGBlob = buildPNGBlob;
})();
