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

// Carregamento seguro com proteção de dados
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

// Inicialização segura da aplicação
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

// 1. Acessibilidade (Tamanho da Fonte e Temas)
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

// 3. Gestão e Troca de Meses
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
        const subtotalCat = cat.itens.reduce((acc, cur) => acc + Number(cur.valor || 0), 0);
        totalDespesas += subtotalCat;

        const card = document.createElement("div");
        card.className = "card-categoria";
        card.innerHTML = `
            <div class="card-cabecalho">
                <button class="btn-emoji" title="Trocar Ícone">${cat.emoji}</button>
                <div class="titulo-box">
                    <input class="titulo-nome" value="${cat.nome}">
                    <span class="titulo-total">${formatarMoeda(subtotalCat)}</span>
                </div>
            </div>
            <div class="item-lista" id="lista-itens-${catIdx}"></div>
            <button class="btn-add-item">+ Adicionar Despesa</button>
        `;

        card.querySelector(".btn-emoji").onclick = () => abrirModalEmoji(catIdx);

        const inputNomeCat = card.querySelector(".titulo-nome");
        inputNomeCat.onchange = (e) => {
            cat.nome = e.target.value;
            salvarDados();
            atualizarGrafico();
        };

        const listaItens = card.querySelector(`#lista-itens-${catIdx}`);
        cat.itens.forEach((item, itemIdx) => {
            listaItens.appendChild(criarLinhaItem(item, itemIdx, "despesa", catIdx));
        });

        card.querySelector(".btn-add-item").onclick = () => {
            cat.itens.push({ nome: "Nova Conta", valor: 0, pago: false });
            salvarDados();
            renderizarDashboard();
        };

        container.appendChild(card);
    });

    // Saldo Geral e Termômetro Orçamentário
    const saldo = totalEntradas - totalDespesas;
    const saldoEl = document.getElementById("saldo-valor");
    saldoEl.textContent = formatarMoeda(saldo);
    saldoEl.style.color = saldo < 0 ? "var(--perigo)" : "var(--primaria)";

    const percGasto = totalEntradas > 0 ? Math.min(Math.round((totalDespesas / totalEntradas) * 100), 100) : 0;
    document.getElementById("termometro-progresso").style.width = `${percGasto}%`;
    document.getElementById("termometro-texto").textContent = `${percGasto}% da renda gasta`;

    atualizarGrafico();
}

// Linhas de Itens (Interruptor Visual + Risco no Texto)
function criarLinhaItem(item, idx, tipo, catIdx = null) {
    const linha = document.createElement("div");
    linha.className = "item-linha";

    const inputNome = document.createElement("input");
    inputNome.className = `item-nome ${item.pago ? "pago" : ""}`;
    inputNome.value = item.nome;
    inputNome.onchange = (e) => {
        item.nome = e.target.value;
        salvarDados();
    };

const inputValor = document.createElement("input");
    inputValor.className = "item-valor";
    inputValor.type = "text";
    inputValor.value = formatarMoeda(item.valor);
    inputValor.onfocus = () => { inputValor.value = item.valor || ""; };
    inputValor.onblur = () => {
        let texto = inputValor.value.replace(/[^\d,-]/g, "").replace(",", ".");
        item.valor = parseFloat(texto) || 0;
        salvarDados();
        renderizarDashboard();
    };
    inputValor.onkeydown = (e) => { if (e.key === "Enter") inputValor.blur(); };

    const switchLabel = document.createElement("label");
    switchLabel.className = "switch";
    switchLabel.innerHTML = `
        <input type="checkbox" ${item.pago ? "checked" : ""}>
        <span class="slider"></span>
    `;

    const checkbox = switchLabel.querySelector("input");
    checkbox.onchange = () => {
        item.pago = checkbox.checked;
        if (item.pago) {
            inputNome.classList.add("pago");
        } else {
            inputNome.classList.remove("pago");
        }
        salvarDados();
    };

    const btnRemover = document.createElement("button");
    btnRemover.className = "btn-remover-item";
    btnRemover.innerHTML = "×";
    btnRemover.onclick = () => {
        const mesAtual = dados.meses[dados.mesAtivo];
        if (tipo === "entrada") {
            mesAtual.entradas.splice(idx, 1);
        } else {
            mesAtual.categorias[catIdx].itens.splice(idx, 1);
        }
        salvarDados();
        renderizarDashboard();
    };

    linha.appendChild(inputNome);
    linha.appendChild(inputValor);
    linha.appendChild(switchLabel);
    linha.appendChild(btnRemover);

    return linha;
}

// 5. Gráfico de Rosca com %
function atualizarGrafico() {
    const ctx = document.getElementById("grafico-despesas").getContext("2d");
    const mesAtual = dados.meses[dados.mesAtivo];

    const labels = [];
    const valores = [];
    let total = 0;

    mesAtual.categorias.forEach(cat => {
        const subtotal = cat.itens.reduce((acc, cur) => acc + Number(cur.valor || 0), 0);
        if (subtotal > 0) {
            labels.push(cat.nome);
            valores.push(subtotal);
            total += subtotal;
        }
    });

    const labelsComPorcentagem = labels.map((nome, i) => {
        const perc = total > 0 ? ((valores[i] / total) * 100).toFixed(1) : 0;
        return `${nome} (${perc}%)`;
    });

    if (chartInstancia) chartInstancia.destroy();

    chartInstancia = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: labelsComPorcentagem,
            datasets: [{
                data: valores,
                backgroundColor: [
                    "#27ae60", "#2980b9", "#8e44ad", "#e67e22", "#e74c3c",
                    "#16a085", "#f39c12", "#d35400", "#2c3e50", "#7f8c8d"
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { boxWidth: 14 }
                }
            }
        }
    });
}

// 6. Janelas Modais (Novo Mês e Emojis)
function configurarModais() {
    document.getElementById("btn-add-categoria").onclick = () => {
        dados.meses[dados.mesAtivo].categorias.push({
            emoji: "📦",
            nome: "Nova Categoria",
            itens: []
        });
        salvarDados();
        renderizarDashboard();
    };

    const modalMes = document.getElementById("modal-novo-mes");
    const inputNomeMes = document.getElementById("input-nome-mes");

    document.getElementById("btn-novo-mes").onclick = () => {
        inputNomeMes.value = "";
        modalMes.classList.remove("hidden");
        inputNomeMes.focus();
    };

    document.getElementById("modal-cancelar").onclick = () => {
        modalMes.classList.add("hidden");
    };

    document.getElementById("modal-confirmar").onclick = () => {
        const nome = inputNomeMes.value.trim();
        if (!nome) return;

        if (dados.meses[nome]) {
            alert("Este mês já existe!");
            return;
        }

        const mesClonado = JSON.parse(JSON.stringify(dados.meses[dados.mesAtivo]));
        mesClonado.entradas.forEach(e => e.pago = false);
        mesClonado.categorias.forEach(c => c.itens.forEach(i => i.pago = false));
        dados.meses[nome] = mesClonado;
        dados.mesAtivo = nome;

        salvarDados();
        atualizarSeletorMeses();
        renderizarDashboard();
        modalMes.classList.add("hidden");
    };

    const modalEmoji = document.getElementById("modal-emoji");
    const gridEmoji = document.getElementById("emoji-grid");

    EMOJIS_DISPONIVEIS.forEach(emoji => {
        const el = document.createElement("div");
        el.className = "emoji-item";
        el.textContent = emoji;
        el.onclick = () => {
            if (categoriaEditandoEmoji !== null) {
                dados.meses[dados.mesAtivo].categorias[categoriaEditandoEmoji].emoji = emoji;
                salvarDados();
                renderizarDashboard();
            }
            modalEmoji.classList.add("hidden");
        };
        gridEmoji.appendChild(el);
    });

    document.getElementById("modal-emoji-fechar").onclick = () => {
        modalEmoji.classList.add("hidden");
    };
}

function abrirModalEmoji(catIdx) {
    categoriaEditandoEmoji = catIdx;
    document.getElementById("modal-emoji").classList.remove("hidden");
}

// 7. Backup e Restauração de Dados
function configurarBackup() {
    document.getElementById("btn-backup").onclick = () => {
        const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `backup_financeiro_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const inputRestaurar = document.getElementById("input-restaurar");
    inputRestaurar.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                dados = JSON.parse(event.target.result);
                salvarDados();
                atualizarSeletorMeses();
                renderizarDashboard();
            } catch (err) {
                alert("Erro ao ler o arquivo de backup.");
            }
        };
        reader.readAsText(file);
    };
}
