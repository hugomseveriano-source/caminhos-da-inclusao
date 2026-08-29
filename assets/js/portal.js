/* ==========================================================================
   Caminhos da Inclusão — comportamento do portal
   1. Barra de acessibilidade (preferências salvas no navegador do aluno)
   2. Revelação por rolagem
   3. Trilha de progresso visual dos módulos
   4. Contagem dos números do topo
   Nada aqui rastreia progresso de estudo. Só preferências de interface.
   ========================================================================== */
(function () {
  'use strict';

  var raiz = document.documentElement;
  var CHAVE = 'caminhos-inclusao:preferencias';

  /* Armazenamento tolerante a falha: navegação privada, file:// restrito,
     bloqueio de dados de site. Nada quebra se localStorage não existir. */
  var memoria = {};
  function ler() {
    try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; }
    catch (e) { return memoria; }
  }
  function gravar(p) {
    memoria = p;
    try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch (e) { /* sem persistência */ }
  }

  var prefs = ler();

  /* ------------------------------------------------ 1. Preferências */
  var ESCALAS = [0.9, 1, 1.15, 1.3, 1.45];
  var iEscala = typeof prefs.escala === 'number' ? prefs.escala : 1;

  function aplicar() {
    raiz.style.setProperty('--escala', ESCALAS[iEscala]);
    raiz.setAttribute('data-contraste', prefs.contraste ? 'alto' : 'normal');
    raiz.setAttribute('data-leitura', prefs.leitura ? 'facil' : 'normal');
    raiz.setAttribute('data-movimento', prefs.movimento === 'pausado' ? 'pausado' : 'normal');

    marcar('a11y-contraste', !!prefs.contraste);
    marcar('a11y-leitura', !!prefs.leitura);
    marcar('a11y-movimento', prefs.movimento === 'pausado');

    var medidor = document.getElementById('a11y-medidor');
    if (medidor) medidor.textContent = Math.round(ESCALAS[iEscala] * 100) + '%';

    var menos = document.getElementById('a11y-menos');
    var mais = document.getElementById('a11y-mais');
    if (menos) menos.disabled = iEscala === 0;
    if (mais) mais.disabled = iEscala === ESCALAS.length - 1;
  }

  function marcar(id, ligado) {
    var b = document.getElementById(id);
    if (b) b.setAttribute('aria-pressed', ligado ? 'true' : 'false');
  }

  function avisar(texto) {
    var aviso = document.getElementById('a11y-aviso');
    if (aviso) aviso.textContent = texto;
  }

  function ligar(id, acao) {
    var b = document.getElementById(id);
    if (b) b.addEventListener('click', acao);
  }

  ligar('a11y-menos', function () {
    if (iEscala > 0) { iEscala--; prefs.escala = iEscala; gravar(prefs); aplicar(); avisar('Texto em ' + Math.round(ESCALAS[iEscala] * 100) + ' por cento.'); }
  });
  ligar('a11y-mais', function () {
    if (iEscala < ESCALAS.length - 1) { iEscala++; prefs.escala = iEscala; gravar(prefs); aplicar(); avisar('Texto em ' + Math.round(ESCALAS[iEscala] * 100) + ' por cento.'); }
  });
  ligar('a11y-contraste', function () {
    prefs.contraste = !prefs.contraste; gravar(prefs); aplicar();
    avisar(prefs.contraste ? 'Alto contraste ativado.' : 'Alto contraste desativado.');
  });
  ligar('a11y-leitura', function () {
    prefs.leitura = !prefs.leitura; gravar(prefs); aplicar();
    avisar(prefs.leitura ? 'Espaçamento ampliado ativado.' : 'Espaçamento normal.');
  });
  ligar('a11y-movimento', function () {
    prefs.movimento = prefs.movimento === 'pausado' ? 'normal' : 'pausado'; gravar(prefs); aplicar();
    avisar(prefs.movimento === 'pausado' ? 'Animações pausadas.' : 'Animações ativas.');
  });
  ligar('a11y-limpar', function () {
    prefs = {}; iEscala = 1; gravar(prefs); aplicar(); avisar('Preferências restauradas ao padrão.');
  });

  aplicar();

  /* ------------------------ 1b. Deslocamento do cabeçalho grudado
     A barra de acessibilidade e o cabeçalho são ambos sticky. Sem medir a
     altura da barra, o cabeçalho gruda atrás dela e some. A altura muda
     quando o texto é ampliado, então remede a cada alteração. */
  var barraA11y = document.querySelector('.barra-a11y');

  function medirBarra() {
    if (!barraA11y) return;
    var fixa = getComputedStyle(barraA11y).position === 'sticky';
    raiz.style.setProperty('--topo-offset', fixa ? barraA11y.offsetHeight + 'px' : '0px');
  }

  medirBarra();
  window.addEventListener('resize', medirBarra);
  if ('ResizeObserver' in window && barraA11y) new ResizeObserver(medirBarra).observe(barraA11y);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirBarra);

  /* Remede depois de qualquer clique na barra: mudar a escala do texto
     muda a altura da própria barra. */
  if (barraA11y) barraA11y.addEventListener('click', function () { setTimeout(medirBarra, 40); });

  /* ------------------------------------------- 2. Movimento permitido? */
  function movimentoOk() {
    if (raiz.getAttribute('data-movimento') === 'pausado') return false;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ----------------------------- 2b. Títulos divididos em palavras
     Cada palavra vira uma caixa com seu próprio atraso. O aria-label
     guarda a frase inteira, então o leitor de tela lê normalmente e não
     percebe a divisão. Só roda quando há movimento: com animação desligada
     o título fica como sempre esteve, sem span nenhum. */
  function dividirEmPalavras(seletor) {
    if (!movimentoOk()) return;
    var titulos = document.querySelectorAll(seletor);
    for (var i = 0; i < titulos.length; i++) {
      var el = titulos[i];
      if (el.querySelector('.palavra')) continue;          /* já dividido */
      var texto = el.textContent.replace(/\s+/g, ' ').trim();
      if (!texto) continue;
      el.setAttribute('aria-label', texto);
      var partes = texto.split(' ');
      var html = '';
      for (var p = 0; p < partes.length; p++) {
        html += '<span class="palavra" style="--i:' + p + '">' + partes[p] + '</span>';
        if (p < partes.length - 1) html += ' ';
      }
      el.innerHTML = html;
    }
  }

  /* O título do hero é o maior texto da página: aqui vale letra por letra.
     Ele tem duas linhas em <span>; cada uma é dividida separadamente para
     a quebra de linha não se perder. O espaço vira uma letra sem conteúdo,
     para as palavras não colarem. */
  function dividirEmLetras(seletor) {
    if (!movimentoOk()) return;
    var alvos = document.querySelectorAll(seletor);
    for (var i = 0; i < alvos.length; i++) {
      var el = alvos[i];
      if (el.querySelector('.letra')) continue;
      var linhas = el.children.length ? [].slice.call(el.children) : [el];
      /* Cada linha é um <span>: junta com espaço, senão o leitor de tela
         ouviria "Caminhosda Inclusão". */
      var texto = linhas.map(function (l) { return l.textContent.trim(); })
                        .join(' ').replace(/\s+/g, ' ').trim();
      el.setAttribute('aria-label', texto);
      var n = 0;
      for (var L = 0; L < linhas.length; L++) {
        var t = linhas[L].textContent;
        var html = '';
        for (var c = 0; c < t.length; c++) {
          var ch = t.charAt(c);
          html += ch === ' '
            ? '<span class="letra" style="--i:' + n + '">&nbsp;</span>'
            : '<span class="letra" style="--i:' + n + '">' + ch + '</span>';
          n++;
        }
        linhas[L].innerHTML = html;
      }
      el.classList.add('dividido');
    }
  }

  dividirEmPalavras('.secao__cabeca h2, .biblioteca h2, .card h3, .atividade h3');
  dividirEmLetras('.hero h1');

  /* --------------------------------------- 3. Revelação por rolagem
     O elemento reaparece toda vez que volta à tela, subindo ou descendo.
     A direção de entrada define o sentido do deslocamento: quem entra por
     baixo sobe; quem entra por cima desce. O estado só é desfeito quando o
     elemento sai inteiro da tela com folga, para não piscar na borda. */
  var alvos = document.querySelectorAll('.revelar');

  function revelarTudo() {
    for (var i = 0; i < alvos.length; i++) {
      alvos[i].classList.add('visivel');
      alvos[i].classList.remove('revelar--cima');
    }
  }

  function esconderTodos() {
    for (var i = 0; i < alvos.length; i++) alvos[i].classList.remove('visivel');
  }

  var obs = null;

  function ligarRevelacao() {
    if (!alvos.length) return;
    if (!('IntersectionObserver' in window) || !movimentoOk()) { revelarTudo(); return; }
    if (obs) return;
    obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.intersectionRatio >= 0.12) {
          e.target.classList.add('visivel');
        } else if (e.intersectionRatio === 0) {
          /* Fora da tela: prepara a próxima entrada pelo lado certo.
             Acima da tela (bottom < 0) volta descendo; abaixo, sobe. */
          e.target.classList.remove('visivel');
          e.target.classList.toggle('revelar--cima', e.boundingClientRect.bottom < 0);
        }
      });
    }, { rootMargin: '12% 0px 12% 0px', threshold: [0, 0.12] });
    for (var j = 0; j < alvos.length; j++) obs.observe(alvos[j]);
  }

  function desligarRevelacao() {
    if (obs) { obs.disconnect(); obs = null; }
    revelarTudo();
  }

  ligarRevelacao();

  /* O botão de pausar desliga a revelação e deixa tudo visível; religar
     volta a animar sem precisar recarregar a página. */
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('#a11y-movimento')) return;
    setTimeout(function () {
      if (movimentoOk()) { esconderTodos(); ligarRevelacao(); }
      else { desligarRevelacao(); }
    }, 30);
  });

  /* -------------------------------- 4. Trilha de progresso dos módulos */
  var trilha = document.querySelector('.trilha');
  var barra = document.querySelector('.trilha__progresso');
  var nos = document.querySelectorAll('.etapa__no');

  function pintarTrilha() {
    if (!trilha || !barra) return;
    var r = trilha.getBoundingClientRect();
    var alvo = window.innerHeight * 0.55;
    var altura = Math.max(0, Math.min(r.height - 94, alvo - r.top - 34));
    barra.style.height = altura + 'px';

    for (var i = 0; i < nos.length; i++) {
      var nr = nos[i].getBoundingClientRect();
      nos[i].classList.toggle('etapa__no--ativo', nr.top + nr.height / 2 <= alvo);
    }
  }

  if (trilha) {
    var agendado = false;
    window.addEventListener('scroll', function () {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(function () { pintarTrilha(); agendado = false; });
    }, { passive: true });
    window.addEventListener('resize', pintarTrilha);
    pintarTrilha();
  }

  /* ------------------------- 4b. Barra de progresso de leitura */
  var barraProg = document.getElementById('progresso-leitura');
  if (barraProg) {
    var progAgendado = false;
    function pintarProgresso() {
      var alcance = document.documentElement.scrollHeight - window.innerHeight;
      var pct = alcance > 0 ? (window.scrollY / alcance) * 100 : 0;
      barraProg.style.width = Math.max(0, Math.min(100, pct)) + '%';
    }
    window.addEventListener('scroll', function () {
      if (progAgendado) return;
      progAgendado = true;
      requestAnimationFrame(function () { pintarProgresso(); progAgendado = false; });
    }, { passive: true });
    window.addEventListener('resize', pintarProgresso);
    pintarProgresso();
  }

  /* -------------------------------------- 5. Contagem dos números */
  var contadores = document.querySelectorAll('[data-contar]');
  if (contadores.length) {
    if (!movimentoOk() || !('IntersectionObserver' in window)) {
      for (var k = 0; k < contadores.length; k++) {
        contadores[k].textContent = contadores[k].getAttribute('data-contar') + (contadores[k].getAttribute('data-sufixo') || '');
      }
    } else {
      /* Reconta toda vez que o bloco volta à tela, e não só na primeira. */
      var obsNum = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          var el = e.target;
          if (!e.isIntersecting) { el.dataset.contando = ''; return; }
          if (el.dataset.contando === 'sim') return;
          el.dataset.contando = 'sim';
          var fim = parseInt(el.getAttribute('data-contar'), 10);
          var sufixo = el.getAttribute('data-sufixo') || '';
          var t0 = null;
          function passo(t) {
            if (t0 === null) t0 = t;
            var p = Math.min((t - t0) / 950, 1);
            var suave = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(fim * suave) + sufixo;
            if (p < 1) requestAnimationFrame(passo);
          }
          requestAnimationFrame(passo);
        });
      }, { threshold: 0.5 });
      for (var m = 0; m < contadores.length; m++) obsNum.observe(contadores[m]);
    }
  }
})();
