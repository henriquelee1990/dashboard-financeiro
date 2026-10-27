// Estrutura inicial padrão
const DADOS_PADRAO = {
    mesAtivo: "Outubro 2026",
    meses: {
        "Outubro 2026": {
            entradas: [
                { nome: "Salário", valor: 5000, pago: false }
            ],
            categorias: [
                {
                    emoji: "🏠",
                    nome: "Moradia",
                    itens: [
                        { nome: "Aluguel", valor: 1500, pago: false }
                    ]
                },
                {
                    emoji: "🛒",
                    nome: "Alimentação",
                    itens: [
                        { nome: "Supermercado", valor: 800, pago: false }
                    ]
                }
            ]
        }
    }
};

const EMOJIS_DISPONIVEIS = ["🏠", "🛒", "⚕️", "💼", "🏦", "🚗", "🎓", "✈️", "🐾", "👕", "🍔", "⚡", "📱", "🎉", "💳"];

// Carregamento com proteção contra dados corrompidos
let dados;
try {
    const dadosMemoria = JSON.parse(localStorage.getItem("meuDashboardData"));
    if (dadosMemoria && dadosMemoria.meses && dadosMemoria.mesAtivo && dadosMemoria.meses[dadosMemoria.mesAtivo]) {
        dados = dadosMemoria;
    } else {
        dados = JSON.parse(JSON.stringify(DADOS_PADRAO));
    }
} catch (e) {
    dados = JSON.parse(JSON.stringify(DADOS_PADRAO));
}

let categoriaEditandoEmoji = null;
let chartInstancia = null;
let vozFalando = false;

const formatarMoeda = (val) => Number(val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function salvarDados() {
    localStorage.setItem("meuDashboardData", JSON.stringify(dados));
}

// Inicialização segura
function iniciarAplicacao() {
    configurarAcessibilidade();
    configurarVoz();
    configurarModais();
    configurarBackup();
    atualizarSeletorMeses();
    renderizarDashboard();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarAplicacao);
} else {
    iniciarAplicacao();
}

// 1. Acessibilidade (Fonte e Temas)
function configurarAcessibilidade() {
    const slider = document.getElementById("font-slider");
    slider.addEventListener("input", (e) => {
        document.documentElement.style.setProperty("--app-font-size", `${e.target.value}px`);
    });

    document.querySelectorAll(".btn-tema").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".btn-tema").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const tema = btn.getAttribute("data-tema");
            if (tema === "padrao") {
                document.body.removeAttribute("data-tema");
            } else {
                document.body.setAttribute("data-tema", tema);
            }
        });
    });
}

// 2. Síntese de Voz com Play/Stop
function configurarVoz() {
    const btnVoz = document.getElementById("btn-voz");
    const iconeVoz = document.getElementById("icone-voz");
    const textoVoz = document.getElementById("texto-voz");

    btnVoz.addEventListener("click", () => {
        if (vozFalando) {
            window.speechSynthesis.cancel();
            vozFalando = false;
            iconeVoz.textContent = "🔊";
            textoVoz.textContent = "Ler Resumo";
            return;
        }

        const mesAtual = dados.meses[dados.mesAtivo];
        const totalEntradas = mesAtual.entradas.reduce((acc, cur) => acc + Number(cur.valor || 0), 0);
        let totalDespesas = 0;
        mesAtual.categorias.forEach(cat => {
            totalDespesas += cat.itens.reduce((acc, cur) => acc + Number(cur.valor || 0), 0);
        });
        const saldo = totalEntradas - totalDespesas;

        const mensagem = `Resumo de ${dados.mesAtivo}. Total de entradas: ${formatarMoeda(totalEntradas)}. Total de despesas: ${formatarMoeda(totalDespesas)}. Saldo disponível: ${formatarMoeda(saldo)}.`;

        const locucao = new SpeechSynthesisUtterance(mensagem);
        locucao.lang = "pt-BR";
        locucao.rate = 1.0;

        locucao.onend = () => {
            vozFalando = false;
            iconeVoz.textContent = "🔊";
            textoVoz.textContent = "Ler Resumo";
        };

        window.speechSynthesis.cancel();
        vozFalando = true;
        iconeVoz.textContent = "⏹️";
        textoVoz.textContent = "Parar Áudio";
        window.speechSynthesis.speak(locucao);
    });
}

// 3. Gestão de Meses e Clonagem
function atualizarSeletorMeses() {
    const seletor = document.getElementById("seletor-mes");
    seletor.innerHTML = "";
    Object.keys(dados.meses).forEach(mes => {
        const opt = document.createElement("option");
        opt.value = mes;
        opt.textContent = mes;
        if (mes === dados.mesAtivo) opt.selected = true;
        seletor.appendChild(opt);
    });

    seletor.onchange = (e) => {
        dados.mesAtivo = e.target.value;
        salvarDados();
        renderizarDashboard();
    };
}

// 4. Renderização do Painel Completo
function renderizarDashboard() {
    const container = document.getElementById("cards-container");
    container.innerHTML = "";
    const mesAtual = dados.meses[dados.mesAtivo];

    // Totais Matemáticos
    const totalEntradas = mesAtual.entradas.reduce((acc, cur) => acc + Number(cur.valor || 0), 0);
    let totalDespesas = 0;

    // Card de Entradas Líquidas
    const cardEntradas = document.createElement("div");
    cardEntradas.className = "card-categoria";
    cardEntradas.innerHTML = `
        <div class="card-cabecalho">
            <span class="btn-emoji" style="cursor: default;">💰</span>
            <div class="titulo-box">
                <input class="titulo-nome" value="Entradas Líquidas" readonly style="cursor: default;">
                <span class="titulo-total">${formatarMoeda(totalEntradas)}</span>
            </div>
        </div>
        <div class="item-lista" id="lista-entradas"></div>
        <button class="btn-add-item" id="btn-add-entrada">+ Adicionar Entrada</button>
    `;
    container.appendChild(cardEntradas);

    const listaEntradas = cardEntradas.querySelector("#lista-entradas");
    mesAtual.entradas.forEach((item, idx) => {
        listaEntradas.appendChild(criarLinhaItem(item, idx, "entrada"));
    });

    cardEntradas.querySelector("#btn-add-entrada").onclick = () => {
        mesAtual.entradas.push({ nome: "Nova Renda", valor: 0, pago: false });
        salvarDados();
        renderizarDashboard();
    };

    // Cards de Despesas por Categoria
    mesAtual.categorias.forEach((cat, catIdx) => {
        const subtotalCat = cat
