// ===== CONFIGURAÇÕES DO PAGAMENTO =====

const PAYMENT_CONFIG = {
    supabaseUrl: 'https://yvxdzjdgvdxytftdyizb.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFjZSI6Inl2eGR6amRndmR4eXRmdGR5aXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwOTQ4MDksImV4cCI6MjEwMjY3MDgwOX0.ogd6PTbO0RA72lybWD8c9Rp5H91Km3Dk8F5MUpFGh4c',

    createOrderFunction: 'criar-pedido',
    statusFunction: 'consultar-pedido',

    createOrderTimeoutMs: 10000,
    statusPollIntervalMs: 10000,
    statusMaxAttempts: 60
};

const supabaseClient = window.supabase?.createClient(
    PAYMENT_CONFIG.supabaseUrl,
    PAYMENT_CONFIG.supabaseAnonKey
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


// ===== ANIMAÇÃO DE CONTEÚDO =====

function animarConteudo(element, content, options = {}) {
    if (!element) return;

    const nextContent = String(content);
    const previousContent =
        element.dataset.swapValue ||
        element.textContent ||
        '';

    const difference = Math.abs(
        previousContent.length - nextContent.length
    );

    const duration =
        options.duration ??
        Math.min(
            235,
            Math.max(
                135,
                150 + difference * 7
            )
        );

    element.style.setProperty(
        '--swap-duration',
        `${duration}ms`
    );

    element.classList.remove('content-swap');

    // Força o navegador a reiniciar a animação.
    void element.offsetWidth;

    if (options.html) {
        element.innerHTML = nextContent;
    } else {
        element.textContent = nextContent;
    }

    element.dataset.swapValue = nextContent;
    element.classList.add('content-swap');

    element.addEventListener(
        'animationend',
        () => {
            element.classList.remove('content-swap');
        },
        { once: true }
    );
}


// ===== ÍCONES SVG =====

function svgIcon(type, color) {
    const paths = {
        check:
            '<path d="m5 12 4 4L19 6"/>',

        copy:
            '<rect x="8" y="8" width="11" height="12" rx="2"/>' +
            '<path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2"/>',

        error:
            '<circle cx="12" cy="12" r="9"/>' +
            '<path d="M12 8v5M12 16h.01"/>',

        warning:
            '<path d="M12 4 21 20H3L12 4Z"/>' +
            '<path d="M12 9v4M12 16h.01"/>',

        clock:
            '<circle cx="12" cy="12" r="9"/>' +
            '<path d="M12 7v5l3 2"/>'
    };

    const path = paths[type];

    if (!path) return '';

    return (
        '<svg class="inline-icon" viewBox="0 0 24 24" ' +
        'fill="none" stroke="' + color + '" ' +
        'stroke-width="1.8" stroke-linecap="round" ' +
        'stroke-linejoin="round" aria-hidden="true">' +
        path +
        '</svg>'
    );
}


// ===== SCRIPT PRINCIPAL =====

(function () {

    'use strict';


    // ===== ELEMENTOS =====

    const cards = document.querySelectorAll('.card');

    const openBtn =
        document.getElementById('openButton');

    const resultEl =
        document.getElementById('result');

    const worthEl =
        document.getElementById('worth');

    const verifyResult =
        document.getElementById('verifyResult');

    const verifyBtn =
        document.getElementById('verifyButton');

    const usernameInput =
        document.getElementById('usernameInput');


    // ===== POPUPS =====

    const popupOrder =
        document.getElementById('popupOrder');

    const popupProcessing =
        document.getElementById('popupProcessing');

    const popupSuccess =
        document.getElementById('popupSuccess');

    const popupPix =
        document.getElementById('popupPix');


    // ===== PIX =====

    const pixQrImage =
        document.getElementById('pixQrImage');

    const pixCodeText =
        document.getElementById('pixCodeText');

    const pixStatus =
        document.getElementById('pixStatus');

    const btnCopyPix =
        document.getElementById('btnCopyPix');

    const pixTitle =
        document.getElementById('pixTitle');

    const pixCodeLabel =
        document.getElementById('pixCodeLabel');


    // ===== POPUP DE ORDEM =====

    const orderUserPopup =
        document.getElementById('orderUserPopup');

    const orderCoinsTextPopup =
        document.getElementById('orderCoinsTextPopup');

    const orderValuePopup =
        document.getElementById('orderValuePopup');


    // ===== OUTROS ELEMENTOS =====

    const processingTitle =
        document.getElementById('processingTitle');

    const successDetail =
        document.getElementById('successDetail');

    const btnPayNow =
        document.getElementById('btnPayNow');

    const btnClosePix =
        document.getElementById('btnClosePix');

    const btnCloseSuccess =
        document.getElementById('btnCloseSuccess');


    // ===== ESTADO =====

    let usuarioVerificado = false;

    let usernameDigitado =
        usernameInput?.value?.trim() || '';

    let selectedCard = null;

    let selectedCoins = '';

    let selectedValue = '';

    let orderIdAtual = '';

    let statusTimer = null;

    let statusChecking = false;

    let statusAttempts = 0;


    // ===== UTILITÁRIOS =====

    function getSelectedCard() {
        return document.querySelector(
            '.card.is-selected'
        );
    }


    function setButtonLoading(button, loading, text) {
        if (!button) return;

        button.disabled = loading;

        if (loading) {
            animarConteudo(
                button,
                svgIcon('clock', '#ffffff') +
                ' ' +
                text,
                {
                    html: true,
                    duration: 145
                }
            );
        } else {
            animarConteudo(
                button,
                text,
                {
                    duration: 145
                }
            );
        }
    }


    function mostrarErro(mensagem) {
        animarConteudo(
            resultEl,
            '<span class="state-error">' +
            svgIcon('error', '#dc2626') +
            ' ' +
            mensagem +
            '</span>',
            { html: true }
        );
    }


    function mostrarAviso(mensagem) {
        animarConteudo(
            resultEl,
            '<span class="state-error">' +
            svgIcon('warning', '#dc2626') +
            ' ' +
            mensagem +
            '</span>',
            { html: true }
        );
    }


    function mostrarSucesso(mensagem) {
        animarConteudo(
            resultEl,
            '<span class="state-success">' +
            svgIcon('check', '#16a34a') +
            ' ' +
            mensagem +
            '</span>',
            { html: true }
        );
    }


    function obterApiConfig() {
        const baseConfig = {
            enabled: true,
            baseUrl: PAYMENT_CONFIG.supabaseUrl
        };

        try {
            const stored =
                JSON.parse(
                    localStorage.getItem(
                        'recargaPixConfig'
                    ) || '{}'
                );

            return {
                ...baseConfig,
                ...(stored.api || {})
            };
        } catch (error) {
            console.warn(
                'Configuração local da API inválida.',
                error
            );

            return baseConfig;
        }
    }


    function pixEstaHabilitado() {
        try {
            return (
                localStorage.getItem(
                    'recargaPixEnabled'
                ) !== 'false'
            );
        } catch (error) {
            return true;
        }
    }


    // ===== PAYLOAD DO PEDIDO =====

    function criarPayloadPedido() {
        if (!selectedCard) {
            return null;
        }

        return {
            productId:
                selectedCard.dataset.productId,

            username:
                usernameDigitado
        };
    }


    // ===== API =====

    async function criarPedidoApi(payload) {
        if (!supabaseClient) {
            throw new Error(
                'Cliente de pagamento indisponível'
            );
        }

        if (!payload?.productId || !payload?.username) {
            throw new Error(
                'Dados do pedido inválidos'
            );
        }

        const {
            data,
            error
        } = await supabaseClient.functions.invoke(
            PAYMENT_CONFIG.createOrderFunction,
            {
                body: {
                    username: payload.username,
                    productId: payload.productId
                }
            }
        );

        if (error) {
            throw new Error(
                error.message ||
                'Não foi possível criar o pedido'
            );
        }

        return data;
    }


    async function consultarPagamentoApi(orderId) {
        if (!supabaseClient) {
            throw new Error(
                'Cliente de pagamento indisponível'
            );
        }

        if (!orderId) {
            throw new Error(
                'ID do pedido ausente'
            );
        }

        const {
            data,
            error
        } = await supabaseClient.functions.invoke(
            PAYMENT_CONFIG.statusFunction,
            {
                body: {
                    orderId
                }
            }
        );

        if (error) {
            throw new Error(
                error.message ||
                'Não foi possível consultar o pagamento'
            );
        }

        return data;
    }


    function normalizarPagamentoApi(order) {
        if (!order) {
            return null;
        }

        return {
            orderId:
                order.orderId || '',

            pixCode:
                order.pixCode || '',

            qrImage:
                order.qrImage || '',

            expiresAt:
                order.expiresAt || ''
        };
    }


    // ===== TIMEOUT =====

    function aguardarComTimeout(
        promise,
        milliseconds
    ) {
        if (
            !milliseconds ||
            milliseconds <= 0
        ) {
            return promise;
        }

        let timeoutId;

        const timeoutPromise =
            new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(
                        new Error('TIMEOUT')
                    );
                }, milliseconds);
            });

        return Promise.race([
            promise,
            timeoutPromise
        ]).finally(() => {
            clearTimeout(timeoutId);
        });
    }


    // ===== TELA PIX =====

    function prepararTelaPagamento(
        paymentApi
    ) {
        orderIdAtual =
            paymentApi?.orderId || '';

        animarConteudo(
            pixTitle,
            'Pague com Pix'
        );

        animarConteudo(
            pixCodeLabel,
            'Pix copia e cola'
        );

        if (pixCodeText) {
            pixCodeText.value =
                paymentApi?.pixCode || '';
        }

        if (pixQrImage) {
            const qrImage =
                paymentApi?.qrImage || '';

            pixQrImage.hidden =
                !qrImage;

            pixQrImage.src =
                qrImage;
        }

        animarConteudo(
            pixStatus,
            'Aguardando pagamento...'
        );
    }


    // ===== CONSULTA DE STATUS =====

    function pararConsultaStatus() {
        if (statusTimer) {
            clearTimeout(statusTimer);
        }

        statusTimer = null;
        statusChecking = false;
        statusAttempts = 0;
    }


    function agendarConsultaStatus() {
        if (!orderIdAtual) {
            return;
        }

        statusTimer = setTimeout(
            consultarStatusPagamento,
            PAYMENT_CONFIG.statusPollIntervalMs
        );
    }


    async function consultarStatusPagamento() {
        if (!orderIdAtual) {
            return;
        }

        if (statusChecking) {
            agendarConsultaStatus();
            return;
        }

        if (
            statusAttempts >=
            PAYMENT_CONFIG.statusMaxAttempts
        ) {
            pararConsultaStatus();

            animarConteudo(
                pixStatus,
                'Tempo de espera do pagamento encerrado.'
            );

            return;
        }

        statusChecking = true;
        statusAttempts++;

        try {
            const status =
                await consultarPagamentoApi(
                    orderIdAtual
                );

            const currentStatus =
                String(
                    status?.status || ''
                ).toLowerCase();

            if (currentStatus === 'paid') {
                pararConsultaStatus();

                hidePopup(popupPix);

                animarConteudo(
                    successDetail,
                    'Pagamento Pix confirmado. Sua recarga foi registrada com sucesso.'
                );

                showPopup(
                    popupSuccess
                );

                return;
            }

            if (
                currentStatus === 'expired' ||
                currentStatus === 'cancelled'
            ) {
                pararConsultaStatus();

                animarConteudo(
                    pixStatus,
                    currentStatus === 'expired'
                        ? 'Este Pix expirou.'
                        : 'Este pagamento foi cancelado.'
                );

                return;
            }

        } catch (error) {
            console.warn(
                'Não foi possível consultar o status do Pix.',
                error
            );
        } finally {
            statusChecking = false;
        }

        if (orderIdAtual) {
            agendarConsultaStatus();
        }
    }


    function iniciarConsultaStatus() {
        pararConsultaStatus();

        if (!orderIdAtual) {
            return;
        }

        statusAttempts = 0;

        // Faz a primeira consulta imediatamente.
        consultarStatusPagamento();
    }


    // ===== VERIFICAÇÃO DO USUÁRIO =====

    function verificarUsuario() {
        if (!usernameInput) {
            return;
        }

        const val =
            usernameInput.value.trim();

        if (!val) {
            usuarioVerificado = false;

            animarConteudo(
                verifyResult,
                '<span class="state-error">' +
                svgIcon(
                    'error',
                    '#dc2626'
                ) +
                ' Digite seu usuário com @</span>',
                { html: true }
            );

            return;
        }

        if (!val.startsWith('@')) {
            usuarioVerificado = false;

            animarConteudo(
                verifyResult,
                '<span class="state-error">' +
                svgIcon(
                    'error',
                    '#dc2626'
                ) +
                ' O usuário deve começar com @</span>',
                { html: true }
            );

            return;
        }

        animarConteudo(
            verifyResult,
            '<span class="spinner"></span>',
            {
                html: true,
                duration: 145
            }
        );

        usuarioVerificado = false;

        setTimeout(() => {
            usernameDigitado = val;
            usuarioVerificado = true;

            animarConteudo(
                verifyResult,
                '<span class="state-success">' +
                svgIcon(
                    'check',
                    '#16a34a'
                ) +
                ' ' +
                val +
                ' verificado!</span>',
                { html: true }
            );

            mostrarSucesso(
                'Conta verificada! Selecione um plano.'
            );
        }, 1000);
    }


    if (verifyBtn) {
        verifyBtn.addEventListener(
            'click',
            verificarUsuario
        );
    }


    if (usernameInput) {
        usernameInput.addEventListener(
            'keypress',
            event => {
                if (event.key === 'Enter') {
                    verificarUsuario();
                }
            }
        );
    }


    // ===== SELECIONAR CARD =====

    function selecionarCard(card) {
        if (!card) {
            return;
        }

        cards.forEach(currentCard => {
            const selected =
                currentCard === card;

            currentCard.classList.toggle(
                'is-selected',
                selected
            );

            currentCard.setAttribute(
                'aria-pressed',
                String(selected)
            );
        });

        selectedCard = card;

        const coins =
            card.querySelector(
                '.coin-amount'
            );

        const discount =
            card.querySelector(
                '.price-discount'
            );

        if (!coins || !discount) {
            selectedCoins = '';
            selectedValue = '';
            return;
        }

        const nextCoins =
            coins.textContent.trim();

        const nextValue =
            discount.textContent.trim();

        const valueChanged =
            selectedValue !== nextValue;

        selectedCoins =
            nextCoins;

        selectedValue =
            nextValue;

        if (!valueChanged) {
            return;
        }

        animarConteudo(
            resultEl,
            'Total: <span class="total-value" style="font-weight:700;">' +
            selectedValue +
            '</span>',
            { html: true }
        );

        if (worthEl) {
            animarConteudo(
                worthEl,
                'A moeda no valor de ' +
                selectedValue +
                ' foi recarregada na conta ' +
                usernameDigitado
            );
        }
    }


    function limparSelecao() {
        cards.forEach(card => {
            card.classList.remove(
                'is-selected'
            );

            card.setAttribute(
                'aria-pressed',
                'false'
            );
        });

        selectedCard = null;
        selectedCoins = '';
        selectedValue = '';

        animarConteudo(
            resultEl,
            ''
        );

        if (worthEl) {
            animarConteudo(
                worthEl,
                ''
            );
        }
    }


    cards.forEach(card => {
        card.setAttribute(
            'role',
            'button'
        );

        card.setAttribute(
            'tabindex',
            '0'
        );

        card.setAttribute(
            'aria-pressed',
            'false'
        );

        card.addEventListener(
            'click',
            () => selecionarCard(card)
        );

        card.addEventListener(
            'keydown',
            event => {
                if (
                    event.key === 'Enter' ||
                    event.key === ' '
                ) {
                    event.preventDefault();

                    selecionarCard(card);
                }
            }
        );
    });


    // ===== LIMPAR SELEÇÃO AO CLICAR FORA =====

    document.addEventListener(
        'click',
        event => {
            if (
                !document.querySelector(
                    '.card.is-selected'
                )
            ) {
                return;
            }

            if (
                event.target.closest(
                    '.card, ' +
                    '#openButton, ' +
                    '#usernameInput, ' +
                    '#verifyButton, ' +
                    '.username-wrapper, ' +
                    '.payment-method, ' +
                    '.popup-overlay'
                )
            ) {
                return;
            }

            limparSelecao();
        }
    );


    // ===== ABRIR ORDEM =====

    function abrirOrdemPagamento() {
        if (!usuarioVerificado) {
            mostrarAviso(
                'Digite seu usuário com @ e clique em Verificar.'
            );

            return;
        }

        const card =
            getSelectedCard();

        if (!card) {
            mostrarAviso(
                'Selecione um plano de moedas.'
            );

            return;
        }

        selectedCard = card;

        const coins =
            card.querySelector(
                '.coin-amount'
            );

        const discount =
            card.querySelector(
                '.price-discount'
            );

        if (
            coins &&
            discount
        ) {
            animarConteudo(
                orderUserPopup,
                usernameDigitado
            );

            animarConteudo(
                orderCoinsTextPopup,
                coins.textContent.trim() +
                ' Moedas'
            );

            animarConteudo(
                orderValuePopup,
                discount.textContent.trim()
            );
        }

        showPopup(
            popupOrder
        );
    }


    if (openBtn) {
        openBtn.addEventListener(
            'click',
            abrirOrdemPagamento
        );
    }


    // ===== COPIAR PIX =====

    async function copiarPix() {
        const code =
            pixCodeText?.value?.trim();

        if (!code) {
            return;
        }

        try {
            await navigator.clipboard.writeText(
                code
            );
        } catch (error) {
            try {
                pixCodeText.focus();
                pixCodeText.select();

                document.execCommand(
                    'copy'
                );
            } catch (fallbackError) {
                console.warn(
                    'Não foi possível copiar o Pix.',
                    fallbackError
                );

                return;
            }
        }

        animarConteudo(
            btnCopyPix,
            'Código copiado'
        );

        setTimeout(() => {
            animarConteudo(
                btnCopyPix,
                'Copiar código Pix'
            );
        }, 1800);
    }


    if (btnCopyPix) {
        btnCopyPix.addEventListener(
            'click',
            copiarPix
        );
    }


    // ===== FECHAR PIX =====

    if (btnClosePix) {
        btnClosePix.addEventListener(
            'click',
            () => {
                pararConsultaStatus();
                hidePopup(popupPix);
            }
        );
    }


    // ===== PAGAR AGORA =====

    async function processarPagamento() {
        const btn =
            btnPayNow;

        if (!btn) {
            return;
        }

        if (!selectedCard) {
            alert(
                'Selecione um plano de moedas primeiro.'
            );

            return;
        }

        const payload =
            criarPayloadPedido();

        if (!payload) {
            mostrarErro(
                'Não foi possível preparar o pedido.'
            );

            return;
        }

        setButtonLoading(
            btn,
            true,
            'Preparando pagamento...'
        );

        hidePopup(
            popupOrder
        );

        showPopup(
            popupProcessing
        );

        animarConteudo(
            processingTitle,
            'Aguardando pagamento...'
        );

        let pagamentoApi = null;

        try {
            const pedido =
                await aguardarComTimeout(
                    criarPedidoApi(payload),
                    PAYMENT_CONFIG.createOrderTimeoutMs
                );

            pagamentoApi =
                normalizarPagamentoApi(
                    pedido
                );

            if (
                !pagamentoApi?.orderId ||
                !pagamentoApi?.pixCode
            ) {
                throw new Error(
                    'PIX_INDISPONIVEL'
                );
            }

        } catch (error) {
            console.error(
                'Erro ao criar pagamento:',
                error
            );

            hidePopup(
                popupProcessing
            );

            setButtonLoading(
                btn,
                false,
                'Pagar agora'
            );

            if (
                error.message ===
                'TIMEOUT'
            ) {
                mostrarErro(
                    'O pagamento demorou para responder. Tente novamente.'
                );
            } else {
                mostrarErro(
                    'Não foi possível iniciar o pagamento.'
                );
            }

            return;
        }

        const pixHabilitado =
            pixEstaHabilitado();

        const delay =
            pixHabilitado
                ? 900
                : 1650;

        setTimeout(() => {
            hidePopup(
                popupProcessing
            );

            if (pixHabilitado) {
                prepararTelaPagamento(
                    pagamentoApi
                );

                showPopup(
                    popupPix
                );

                iniciarConsultaStatus();

            } else {
                showPopup(
                    popupSuccess
                );
            }

            setButtonLoading(
                btn,
                false,
                'Pagar agora'
            );

            animarConteudo(
                processingTitle,
                'Preparando pagamento'
            );

        }, delay);
    }


    if (btnPayNow) {
        btnPayNow.addEventListener(
            'click',
            processarPagamento
        );
    }


    // ===== FECHAR SUCESSO =====

    if (btnCloseSuccess) {
        btnCloseSuccess.addEventListener(
            'click',
            () => {
                pararConsultaStatus();

                hidePopup(
                    popupSuccess
                );

                limparSelecao();
            }
        );
    }


    // ===== FECHAR POPUPS CLICANDO FORA =====

    [
        popupOrder,
        popupProcessing,
        popupSuccess,
        popupPix
    ]
        .filter(Boolean)
        .forEach(popup => {

            popup.addEventListener(
                'click',
                event => {

                    if (
                        event.target !== popup
                    ) {
                        return;
                    }

                    if (
                        popup === popupPix
                    ) {
                        pararConsultaStatus();
                    }

                    hidePopup(
                        popup
                    );
                }
            );
        });


    // ===== LIMPEZA AO SAIR DA PÁGINA =====

    window.addEventListener(
        'beforeunload',
        () => {
            pararConsultaStatus();
        }
    );

})();