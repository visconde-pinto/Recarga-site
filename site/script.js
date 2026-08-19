const supabaseClient = window.supabase?.createClient(
    'https://yvxdzjdgvdxytftdyizb.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2eGR6amRndmR4eXRmdGR5aXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwOTQ4MDksImV4cCI6MjEwMjY3MDgwOX0.ogd6PTbO0RA72lybWD8c9Rp5H91Km3Dk8F5MUpFGh4c'
);

// ===== TRANSIÇÕES DE POPUP =====

        function showPopup(popup) {
            if (!popup) return;
            popup.classList.add('active');
            document.body.classList.add('modal-open');
        }

        function hidePopup(popup) {
            if (!popup) return;
            popup.classList.remove('active');
            if (!document.querySelector('.popup-overlay.active')) {
                document.body.classList.remove('modal-open');
            }
        }

// ===== ANIMAÇÃO DE MUDANÇA DE CONTEÚDO =====

        function animarConteudo(element, content, options = {}) {
            if (!element) return;

            const nextContent = String(content);
            const previousContent = element.dataset.swapValue || element.textContent || '';
            const difference = Math.abs(previousContent.length - nextContent.length);
            const duration = options.duration || Math.min(235, Math.max(135, 150 + difference * 7));

            element.style.setProperty('--swap-duration', duration + 'ms');
            element.classList.remove('content-swap');
            void element.offsetWidth;

            if (options.html) {
                element.innerHTML = nextContent;
            } else {
                element.textContent = nextContent;
            }

            element.dataset.swapValue = nextContent;
            element.classList.add('content-swap');
            element.addEventListener('animationend', function() {
                element.classList.remove('content-swap');
            }, { once: true });
        }

        function svgIcon(type, color) {
            const paths = {
                check: '<path d="m5 12 4 4L19 6"/>',
                copy: '<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2"/>',
                error: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
                warning: '<path d="M12 4 21 20H3L12 4Z"/><path d="M12 9v4M12 16h.01"/>',
                clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
            };
            return '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[type] + '</svg>';
        }

// ===== SCRIPT PRINCIPAL =====

        (function() {

// ===== Elementos =====
            const cards = document.querySelectorAll('.card');
            const openBtn = document.getElementById('openButton');
            const resultEl = document.getElementById('result');
                const worthEl = document.getElementById('worth');
            const verifyResult = document.getElementById('verifyResult');
            const verifyBtn = document.getElementById('verifyButton');
            const usernameInput = document.getElementById('usernameInput');

// ===== Popups =====
            const popupOrder = document.getElementById('popupOrder');
            const popupProcessing = document.getElementById('popupProcessing');
            const popupSuccess = document.getElementById('popupSuccess');
            const popupPix = document.getElementById('popupPix');
            const paymentLinkText = document.getElementById('paymentLinkText');
            const pixTitle = document.getElementById('pixTitle');
            const pixCodeLabel = document.getElementById('pixCodeLabel');
            const btnOpenPayment = document.getElementById('btnOpenPayment');
            let paymentLinkAtual = '';

// ===== Elementos do popup de ordem =====
            const orderUserPopup = document.getElementById('orderUserPopup');
            const orderCoinsTextPopup = document.getElementById('orderCoinsTextPopup');
            const orderValuePopup = document.getElementById('orderValuePopup');

// ===== Variáveis =====
            let usuarioVerificado = false;
            let usernameDigitado = '@dgpko5';
            let selectedCard = null;
            let selectedCoins = '';
            let selectedValue = '';

// ===== BASE DE API =====
            const API_CONFIG = {
                enabled: true,
                baseUrl: 'https://yvxdzjdgvdxytftdyizb.supabase.co',
                createOrderPath: 'criar-pedido',
                paymentStatusPath: '/orders/{orderId}'
            };

            function obterApiConfig() {
                try {
                    const config = JSON.parse(localStorage.getItem('recargaPixConfig') || '{}');
                    return { ...API_CONFIG, ...(config.api || {}) };
                } catch (error) {
                    return { ...API_CONFIG };
                }
            }

            function criarPayloadPedido() {
                if (!selectedCard) return null;
                return {
                    productId: selectedCard.dataset.productId,
                    username: usernameDigitado
                };
            }

            function urlApi(apiConfig, path) {
                return apiConfig.baseUrl.replace(/\/$/, '') + path;
            }

            async function requisicaoApi(path, options = {}) {
                const apiConfig = obterApiConfig();
                if (!apiConfig.enabled || !apiConfig.baseUrl) return null;
                const response = await fetch(urlApi(apiConfig, path), {
                    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
                    ...options
                });
                if (!response.ok) throw new Error('Pagamento indisponível');
                return response.json();
            }

            async function criarPedidoApi(payload) {
                if (!supabaseClient) throw new Error('Cliente de pagamento indisponível');
                const { data, error } = await supabaseClient.functions.invoke('criar-pedido', {
                    body: {
                        username: payload.username,
                        productId: payload.productId
                    }
                });
                if (error) throw new Error(error.message);
                return data;
            }

            async function consultarPagamentoApi(orderId) {
                const apiConfig = obterApiConfig();
                return requisicaoApi(apiConfig.paymentStatusPath.replace('{orderId}', encodeURIComponent(orderId)));
            }

            function normalizarPagamentoApi(order) {
                if (!order) return null;
                const link = order.checkoutUrl || '';
                return {
                    link
                };
            }

            function aguardarComTimeout(promise, milliseconds) {
                return Promise.race([
                    promise,
                    new Promise((resolve, reject) => setTimeout(() => reject(new Error('TIMEOUT')), milliseconds))
                ]);
            }

            function pixEstaHabilitado() {
                try {
                    return localStorage.getItem('recargaPixEnabled') !== 'false';
                } catch (error) {
                    return true;
                }
            }

            function prepararTelaPagamento(paymentApi) {
                const link = paymentApi?.link || '';
                paymentLinkAtual = link;
                animarConteudo(pixTitle, 'Pague com link');
                animarConteudo(pixCodeLabel, 'Link de pagamento');
                animarConteudo(paymentLinkText, link);
            }

// ===== VERIFICAR USUÁRIO =====
            verifyBtn.addEventListener('click', function() {
                const val = usernameInput.value.trim();

                if (val.length === 0) {
                    animarConteudo(verifyResult, '<span class="state-error">' + svgIcon('error', '#dc2626') + ' Digite seu usuário com @</span>', { html: true });
                    usuarioVerificado = false;
                    return;
                }

                if (!val.startsWith('@')) {
                    animarConteudo(verifyResult, '<span class="state-error">' + svgIcon('error', '#dc2626') + ' O usuário deve começar com @</span>', { html: true });
                    usuarioVerificado = false;
                    return;
                }

                animarConteudo(verifyResult, '<span class="spinner"></span>', { html: true, duration: 145 });
                setTimeout(() => {
                    usernameDigitado = val;
                    usuarioVerificado = true;
                    animarConteudo(verifyResult, '<span class="state-success">' + svgIcon('check', '#16a34a') + ' ' + val + ' verificado!</span>', { html: true });
                    animarConteudo(resultEl, '<span class="state-success">' + svgIcon('check', '#16a34a') + ' Conta verificada! Selecione um plano.</span>', { html: true });
                }, 1000);
            });

            usernameInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') verifyBtn.click();
            });

// ===== SELECIONAR CARD =====
            function selecionarCard(card) {
                cards.forEach(c => {
                    c.classList.remove('is-selected');
                    c.setAttribute('aria-pressed', 'false');
                });
                card.classList.add('is-selected');
                card.setAttribute('aria-pressed', 'true');

                const coins = card.querySelector('.coin-amount');
                const discount = card.querySelector('.price-discount');

                if (coins && discount) {
                    const nextCoins = coins.textContent.trim();
                    const nextValue = discount.textContent.trim();
                    const valueChanged = selectedValue !== nextValue;
                    selectedCoins = nextCoins;
                    selectedValue = nextValue;
                    if (valueChanged) {
                        animarConteudo(resultEl, 'Total: <span class="total-value" style="font-weight:700;">' + selectedValue + '</span>', { html: true });
                        if (worthEl) {
                            animarConteudo(worthEl, 'A moeda no valor de ' + selectedValue + ' foi recarregada na conta ' + usernameDigitado);
                        }
                    }
                }
            }

            function limparSelecao() {
                cards.forEach(card => {
                    card.classList.remove('is-selected');
                    card.setAttribute('aria-pressed', 'false');
                });
                selectedCard = null;
                selectedCoins = '';
                selectedValue = '';
                animarConteudo(resultEl, '');
                if (worthEl) animarConteudo(worthEl, '');
            }

            cards.forEach(card => {
                card.setAttribute('role', 'button');
                card.setAttribute('tabindex', '0');
                card.setAttribute('aria-pressed', 'false');
                card.addEventListener('click', function() {
                    selecionarCard(this);
                });
                card.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selecionarCard(this);
                    }
                });
            });

            document.addEventListener('click', function(e) {
                if (!document.querySelector('.card.is-selected')) return;
                if (e.target.closest('.card, #openButton, #usernameInput, #verifyButton, .username-wrapper, .payment-method, .popup-overlay')) return;
                limparSelecao();
            });

// ===== ABRIR ORDEM DE PAGAMENTO =====
            openBtn.addEventListener('click', function() {
                if (!usuarioVerificado) {
                    animarConteudo(resultEl, '<span class="state-error">' + svgIcon('warning', '#dc2626') + ' Digite seu usuário com @ e clique em Verificar.</span>', { html: true });
                    return;
                }

                let cardSelecionado = false;
                cards.forEach(card => {
                    if (card.classList.contains('is-selected')) {
                        cardSelecionado = true;
                        selectedCard = card;
                    }
                });

                if (!cardSelecionado) {
                    animarConteudo(resultEl, '<span class="state-error">' + svgIcon('warning', '#dc2626') + ' Selecione um plano de moedas.</span>', { html: true });
                    return;
                }

                const coins = selectedCard.querySelector('.coin-amount');
                const discount = selectedCard.querySelector('.price-discount');

                if (coins && discount) {
                    const coinText = coins.textContent.trim();
                    const valueText = discount.textContent.trim();

                    animarConteudo(orderUserPopup, usernameDigitado);
                    animarConteudo(orderCoinsTextPopup, coinText + ' Moedas');
                    animarConteudo(orderValuePopup, valueText);
                }

                showPopup(popupOrder);
            });

// ===== INTEGRAÇÃO DE PAGAMENTO =====

            btnOpenPayment.addEventListener('click', function() {
                if (paymentLinkAtual) window.location.href = paymentLinkAtual;
            });
            document.getElementById('btnClosePix').addEventListener('click', function() {
                hidePopup(popupPix);
            });
            popupPix.addEventListener('click', function(e) {
                if (e.target === this) hidePopup(this);
            });

            document.getElementById('btnPayNow').addEventListener('click', async function() {
                const btn = this;
                const processingTitle = document.getElementById('processingTitle');

                if (!selectedCard) {
                    alert('Selecione um plano de moedas primeiro.');
                    return;
                }

                btn.disabled = true;
                animarConteudo(btn, svgIcon('clock', '#ffffff') + ' Preparando pagamento...', { html: true, duration: 145 });
                hidePopup(popupOrder);
                showPopup(popupProcessing);
                animarConteudo(processingTitle, 'Aguardando pagamento...');
                const pixHabilitado = pixEstaHabilitado();
                let pagamentoApi = null;

                try {
                    const pedido = await aguardarComTimeout(criarPedidoApi(criarPayloadPedido()), 5000);
                    pagamentoApi = normalizarPagamentoApi(pedido);
                    if (!pagamentoApi?.link) throw new Error('LINK_INDISPONIVEL');
                } catch (error) {
                    hidePopup(popupProcessing);
                    btn.disabled = false;
                    animarConteudo(btn, 'Pagar agora', { duration: 145 });
                    animarConteudo(resultEl, '<span class="state-error">' + svgIcon('error', '#dc2626') + (error.message === 'TIMEOUT' ? ' O pagamento demorou para responder. Tente novamente.' : ' Não foi possível iniciar o pagamento.') + '</span>', { html: true });
                    return;
                }

                setTimeout(() => {
                    hidePopup(popupProcessing);
                    if (pixHabilitado) {
                        prepararTelaPagamento(pagamentoApi);
                        showPopup(popupPix);
                    } else {
                        showPopup(popupSuccess);
                    }
                    btn.disabled = false;
                    animarConteudo(btn, 'Pagar agora', { duration: 145 });
                    animarConteudo(processingTitle, 'Preparando pagamento');
                }, pixHabilitado ? 900 : 1650);
            });

// ===== FECHAR POPUPS =====
            document.getElementById('btnCloseSuccess').addEventListener('click', function() {
                hidePopup(popupSuccess);
                limparSelecao();
            });

// ===== FECHAR POPUPS CLICANDO FORA =====
            [popupOrder, popupProcessing, popupSuccess, popupPix].forEach(popup => {
                popup.addEventListener('click', function(e) {
                    if (e.target === this) {
                        hidePopup(this);
                    }
                });
            });

        })();
