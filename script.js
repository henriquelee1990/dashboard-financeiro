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

// Carrega dados do LocalStorage ou usa o padrão
let dados = JSON.parse(localStorage.getItem("meuDashboardData")) || DADOS_PADRAO;
let categoriaEditandoEmoji = null;
let chartInstancia = null;
let vozFalando = false;

// Utilitários de Formatação
const formatarMoeda = (val) => Number(val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function salvarDados() {
    localStorage.setItem("meuDashboardData", JSON.stringify(dados));
}

// Inicialização da Aplicação
document.addEventListener("DOMContentLoaded", () => {
    configurarAcessibilidade();
    configurarVoz();
    configurarModais();
    configurarBackup();
    atualizarSeletorMeses();
    renderizarDashboard();
});

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

        const
