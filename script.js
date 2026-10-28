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
const EMOJIS_DISPONIVEIS = [
    "🏠", "🛒", "🚗", "💊", "🎓", "🎉", "✈️", "💡", 
    "🛡️", "📦", "🍽️", "🏋️", "💻", "🐶", "👗", "📱", 
    "⛽", "🏥", "📚", "🎮", "🍿", "☕", "💈", "🎁"
];
const API_URL = "https://script.google.com/macros/s/AKfycbwUQx6xkPdU6nTyN2lFEPi3K0i9y8iG4aHczI6wauClMbCmvJN4daf0D6qX2ltbdE6a/exec";
let dados = JSON.parse(JSON.stringify(DADOS_PADRAO));

let categoriaEditandoEmoji = null;
let chartInstancia = null;
let vozFalando = false;

const formatarMoeda = (val) => Math.round(Number(val || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
function salvarDados() {
    // Salva na nuvem silenciosamente
    fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(dados)
    }).catch(console.error);
    
    // Mantém o salvamento local apenas como um backup de segurança
    localStorage.setItem("meuDashboardData", JSON.stringify(dados));
}

// Inicialização com busca de dados online
async function iniciarAplicacao() {
    try {
        // Busca os dados do seu cofre no Google Sheets
        const resposta = await fetch(API_URL);
        const dadosNuvem = await resposta.json();
        
        if (dadosNuvem && Object.keys(dadosNuvem).length > 0 && dadosNuvem.meses && dadosNuvem.mesAtivo) {
            dados = dadosNuvem;
        } else {
            // Se a nuvem estiver vazia, tenta pegar do backup local
            const dadosMemoria = JSON.parse(localStorage.getItem("meuDashboardData"));
            if (dadosMemoria && dadosMemoria.meses && dadosMemoria.mesAtivo) {
                dados = dadosMemoria;
            }
        }
    } catch (e) {
        console.error("Erro ao conectar com a nuvem, carregando dados locais.", e);
        const dadosMemoria = JSON.parse(localStorage.getItem("meuDashboardData"));
        if (dadosMemoria && dadosMemoria.meses) dados = dadosMemoria;
    }

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
        atualizarGrafico();
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

    let vozes = [];
    const carregarVozes = () => {
        vozes = window.speechSynthesis.getVoices();
    };
    carregarVozes();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = carregarVozes;
    }

    const formatarParaVoz = (val) => {
        const num = Number(val || 0);
        const inteiros = Math.floor(Math.abs(num));
        const centavos = Math.round((Math.abs(num) - inteiros) * 100);
        let texto = `${inteiros.toLocaleString("pt-BR")} reais`;
        if (centavos > 0) texto += ` e ${centavos} centavos`;
        return num < 0 ? `menos ${texto}` : texto;
    };

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

        const mensagem = `Resumo de ${dados.mesAtivo}. Total de entradas: ${formatarParaVoz(totalEntradas)}. Total de despesas: ${formatarParaVoz(totalDespesas)}. Saldo disponível: ${formatarParaVoz(saldo)}.`;

        const locucao = new SpeechSynthesisUtterance(mensagem);
        locucao.lang = "pt-BR";
        locucao.rate = 1.05;
        locucao.pitch = 1.0;

        if (vozes.length === 0) vozes = window.speechSynthesis.getVoices();

        const melhorVoz = vozes.find(v => (v.lang === "pt-BR" || v.lang === "pt_BR") && v.name.includes("Google")) ||
                          vozes.find(v => (v.lang === "pt-BR" || v.lang === "pt_BR") && (v.name.includes("Natural") || v.name.includes("Enhanced") || v.name.includes("Aprimorada") || v.name.includes("Siri"))) ||
                          vozes.find(v => (v.lang === "pt-BR" || v.lang === "pt_BR") && !v.name.toLowerCase().includes("compact")) ||
                          vozes.find(v => v.lang === "pt-BR" || v.lang === "pt_BR");

        if (melhorVoz) {
            locucao.voice = melhorVoz;
        }

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
    mesAtual.entradas.sort((a, b) => {
        const va = Number(a.valor || 0);
        const vb = Number(b.valor || 0);
        if (va >= 0 && vb < 0) return -1;
        if (va < 0 && vb >= 0) return 1;
        if (va >= 0 && vb >= 0) return vb - va;
        return va - vb;
    });
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
        cat.itens.sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0));
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
  inputValor.onfocus = () => {
        inputValor.value = item.valor !== "" && item.valor !== undefined ? String(item.valor).replace(".", ",") : "";
    };
    inputValor.onblur = () => {
        let texto = inputValor.value.replace(/[^\d,.-]/g, "");
        if (texto.includes(",") && texto.includes(".")) {
            texto = texto.replace(/\./g, "").replace(",", ".");
        } else if (texto.includes(",")) {
            texto = texto.replace(",", ".");
        }
        item.valor = parseFloat(texto) || 0;
        salvarDados();
        renderizarDashboard();
    };
    inputValor.onkeydown = (e) => { if (e.key === "Enter") inputValor.blur(); };

   const switchLabel = document.createElement("label");
    switchLabel.className = "switch";
    const switchSlider = document.createElement("span");
    switchSlider.className = "slider";
    switchLabel.appendChild(switchSlider);
    // Suporte aos estados: 0 = aberto, 1 = caixinha, 2 = pago (compatível com true/false antigos)
    let estadoAtual = item.estado !== undefined ? item.estado : (item.pago ? 2 : 0);
    aplicarClasseEstado(switchLabel, inputNome, linha, estadoAtual);

    switchLabel.onclick = (e) => {
        e.preventDefault();
        // Ciclo: 0 (Aberto) -> 1 (Caixinha) -> 2 (Pago) -> 0 (Aberto)
        estadoAtual = (estadoAtual + 1) % 3;
        item.estado = estadoAtual;
        item.pago = (estadoAtual === 2); // Mantém compatibilidade com cálculos existentes
        
        aplicarClasseEstado(switchLabel, inputNome, linha, estadoAtual);
        salvarDados();
        renderizarDashboard();
    };

    function aplicarClasseEstado(labelEl, nomeEl, linhaEl, est) {
        labelEl.classList.remove("caixinha", "pago");
        linhaEl.classList.remove("caixinha");
        nomeEl.classList.remove("pago");

        if (est === 1) {
            labelEl.classList.add("caixinha");
            linhaEl.classList.add("caixinha");
        } else if (est === 2) {
            labelEl.classList.add("pago");
            nomeEl.classList.add("pago");
        }
    }

    const btnRemover = document.createElement("button");
    btnRemover.className = "btn-remover-item";
    btnRemover.innerHTML = "×";
  btnRemover.onclick = () => {
        const confirmar = confirm(`Deseja realmente remover o item "${item.nome || 'sem nome'}"?`);
        if (!confirmar) return;

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
                    position: window.innerWidth >= 768 ? "right" : "bottom",
                    labels: {
                        boxWidth: Math.round(Number(document.getElementById("font-slider")?.value || 16) * 0.9),
                        padding: 12,
                        font: {
                            size: Number(document.getElementById("font-slider")?.value || 16)
                        }
                    }
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

    document.getElementById("btn-excluir-mes").onclick = () => {
        const meses = Object.keys(dados.meses);
        if (meses.length <= 1) {
            alert("Não é possível excluir o único mês existente.");
            return;
        }

        const confirmar = confirm(`Tem certeza que deseja excluir o mês "${dados.mesAtivo}" e todos os seus lançamentos?`);
        if (confirmar) {
            delete dados.meses[dados.mesAtivo];
            dados.mesAtivo = Object.keys(dados.meses)[0];
            salvarDados();
            atualizarSeletorMeses();
            renderizarDashboard();
        }
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
    const modalAPagar = document.getElementById("modal-a-pagar");
    document.getElementById("btn-a-pagar").onclick = () => abrirModalAPagar();
    document.getElementById("modal-a-pagar-fechar").onclick = () => modalAPagar.classList.add("hidden");
}

function abrirModalEmoji(catIdx) {
    categoriaEditandoEmoji = catIdx;
    document.getElementById("modal-emoji").classList.remove("hidden");
}
function abrirModalAPagar() {
    const modalAPagar = document.getElementById("modal-a-pagar");
    const listaEl = document.getElementById("lista-a-pagar");
    const totalEl = document.getElementById("total-a-pagar-modal");
    listaEl.innerHTML = "";

    const mesAtual = dados.meses[dados.mesAtivo];
    const pendencias = [];
    let totalPendente = 0;

    mesAtual.categorias.forEach(cat => {
        cat.itens.forEach(item => {
            const val = Number(item.valor || 0);
            if (!item.pago && val > 0) {
                pendencias.push({
                    emoji: cat.emoji,
                    categoria: cat.nome,
                    nome: item.nome || "Sem nome",
                    valor: val
                });
                totalPendente += val;
            }
        });
    });

    totalEl.textContent = formatarMoeda(totalPendente);

    if (pendencias.length === 0) {
        listaEl.innerHTML = `<div class="lista-vazia">🎉 Nenhuma conta pendente para este mês!</div>`;
    } else {
        pendencias.forEach(p => {
            const linha = document.createElement("div");
            linha.className = "item-pendente";
            linha.innerHTML = `
                <div class="item-pendente-info">
                    <span style="font-size: 1.3em;">${p.emoji}</span>
                    <div style="min-width: 0;">
                        <div class="item-pendente-nome">${p.nome}</div>
                        <div class="item-pendente-cat">${p.categoria}</div>
                    </div>
                </div>
                <span class="item-pendente-valor">${formatarMoeda(p.valor)}</span>
            `;
            listaEl.appendChild(linha);
        });
    }

    modalAPagar.classList.remove("hidden");
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
