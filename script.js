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

// Carregamento robusto dos dados com proteção contra dados corrompidos
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

// Inicialização imediata ou por evento
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
