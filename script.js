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
let chartHistoricoInstancia = null;
let chartInvestimentosInstancia = null;
// Controle de Histórico (Desfazer / Refazer)
let historicoDesfazer = [];
let historicoRefazer = [];
const LIMITE_HISTORICO = 30;
let estadoAnteriorStr = "";
const formatarMoeda = (val) => Math.round(Number(val || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
function salvarDados(gravarHistorico = true) {
    if (gravarHistorico && typeof dados !== "undefined" && dados) {
        const novoEstadoStr = JSON.stringify(dados);
        if (!estadoAnteriorStr) {
            estadoAnteriorStr = novoEstadoStr;
        } else if (novoEstadoStr !== estadoAnteriorStr) {
            historicoDesfazer.push(estadoAnteriorStr);
            if (historicoDesfazer.length > LIMITE_HISTORICO) {
                historicoDesfazer.shift();
            }
            historicoRefazer = [];
            estadoAnteriorStr = novoEstadoStr;
        }
    }

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
function renderizarDashboard() {if (!estadoAnteriorStr && typeof dados !== "undefined" && dados) {
        estadoAnteriorStr = JSON.stringify(dados);
    }
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
    const saldoFixa = document.getElementById("barra-fixa-saldo");
    if (saldoFixa) {
        document.getElementById("barra-fixa-mes").textContent = dados.mesAtivo;
        saldoFixa.textContent = formatarMoeda(saldo);
        saldoFixa.style.color = saldo < 0 ? "var(--perigo)" : "var(--primaria)";
    }

const percReal = totalEntradas > 0 ? Math.round((totalDespesas / totalEntradas) * 100) : (totalDespesas > 0 ? 100 : 0);
    const barraProgresso = document.getElementById("termometro-progresso");
    
    barraProgresso.style.width = `${Math.min(percReal, 100)}%`;
    barraProgresso.style.backgroundColor = percReal > 100 ? "var(--perigo)" : "var(--primaria)";
    
    document.getElementById("termometro-texto").textContent = `${percReal}% da renda gasta`;

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
// Define 'N' como padrão absoluto para qualquer item que ainda não tenha a regra definida
    if (!item.regra) item.regra = "N";

    const btnClassificador = document.createElement("button");
    btnClassificador.className = `btn-classificador classificador-${item.regra}`;
    btnClassificador.textContent = item.regra;
    btnClassificador.title = item.regra === "N" ? "Necessidade" : (item.regra === "I" ? "Investimento" : "Desejo");

    btnClassificador.onclick = (e) => {
        e.preventDefault();
        // Ciclo contínuo: N -> I -> D -> N
        if (item.regra === "N") item.regra = "I";
        else if (item.regra === "I") item.regra = "D";
        else item.regra = "N";
        
        btnClassificador.className = `btn-classificador classificador-${item.regra}`;
        btnClassificador.textContent = item.regra;
        btnClassificador.title = item.regra === "N" ? "Necessidade" : (item.regra === "I" ? "Investimento" : "Desejo");
        
        salvarDados();
        // Não chamamos renderizarDashboard() aqui para evitar que o input perca o foco durante a digitação
    };
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

// 5. Central Analítica (KPIs, Rosca, Histórico e Top 5)
function atualizarGrafico() {
    const mesAtual = dados.meses[dados.mesAtivo];
    if (!mesAtual) return;

    // Totais gerais do mês ativo
    const totalEntradas = mesAtual.entradas.reduce((acc, cur) => acc + Number(cur.valor || 0), 0);
    let totalDespesas = 0;
    const todosItens = [];

    mesAtual.categorias.forEach(cat => {
        cat.itens.forEach(item => {
            const v = Number(item.valor || 0);
            totalDespesas += v;
            if (v > 0) {
                todosItens.push({
                    nome: item.nome || "Sem nome",
                    valor: v,
                    categoria: cat.nome,
                    emoji: cat.emoji
                });
            }
        });
    });

    const saldo = totalEntradas - totalDespesas;

    // 1. Atualização dos Cards de KPIs
    const kpiPoupanca = document.getElementById("kpi-poupanca");
    const kpiPoupancaSub = document.getElementById("kpi-poupanca-sub");
const kpiEssenciais = document.getElementById("kpi-essenciais");
            const kpiEssenciaisSub = document.getElementById("kpi-essenciais-sub");
    const kpiDiario = document.getElementById("kpi-diario");
if (kpiPoupanca && kpiEssenciais && kpiDiario) {
    let totalInvestido = 0;
        mesAtual.categorias.forEach(cat => {
            if (cat.nome.toLowerCase().includes("investimento")) {
                totalInvestido += cat.itens.reduce((acc, cur) => acc + Number(cur.valor || 0), 0);
            }
        });

        const taxaPoupanca = totalEntradas > 0 ? Math.round((totalInvestido / totalEntradas) * 100) : 0;
        kpiPoupanca.textContent = `${taxaPoupanca}%`;
        kpiPoupanca.style.color = taxaPoupanca > 0 ? "var(--primaria)" : "var(--texto-secundario)";
        if (kpiPoupancaSub) {
            kpiPoupancaSub.textContent = `${formatarMoeda(totalInvestido)} alocados`;
        }
let totalEssenciais = 0;
        mesAtual.categorias.forEach(cat => {
            const n = cat.nome.toLowerCase();
            if (n.includes("moradia") || n.includes("alimenta") || n.includes("saúde") || n.includes("saude") || n.includes("transporte")) {
                totalEssenciais += cat.itens.reduce((acc, cur) => acc + Number(cur.valor || 0), 0);
            }
        });

        const taxaEssenciais = totalEntradas > 0 ? Math.round((totalEssenciais / totalEntradas) * 100) : 0;
        kpiEssenciais.textContent = `${taxaEssenciais}%`;
        kpiEssenciais.style.color = taxaEssenciais > 60 ? "var(--perigo)" : (taxaEssenciais > 50 ? "#e67e22" : "var(--primaria)");
        
        if (kpiEssenciaisSub) {
            kpiEssenciaisSub.textContent = `${formatarMoeda(totalEssenciais)} em essenciais`;
        }
        const mediaDiaria = Math.round(totalDespesas / 30);
        kpiDiario.textContent = formatarMoeda(mediaDiaria);
    }

    // 2. Gráfico de Rosca (Categorias)
    const canvasRosca = document.getElementById("grafico-despesas");
    if (canvasRosca) {
        const ctxRosca = canvasRosca.getContext("2d");
        const labels = [];
        const valores = [];

        mesAtual.categorias.forEach(cat => {
            const subtotal = cat.itens.reduce((acc, cur) => acc + Number(cur.valor || 0), 0);
            if (subtotal > 0) {
                labels.push(cat.nome);
                valores.push(subtotal);
            }
        });

        const labelsComPorcentagem = labels.map((nome, i) => {
            const perc = totalDespesas > 0 ? ((valores[i] / totalDespesas) * 100).toFixed(1) : 0;
            return `${nome} (${perc}%)`;
        });

        if (chartInstancia) chartInstancia.destroy();

        chartInstancia = new Chart(ctxRosca, {
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
                            padding: 10,
                            font: {
                                size: Number(document.getElementById("font-slider")?.value || 16)
                            }
                        }
                    }
                }
            }
        });
    }

    // 3. Gráfico de Histórico Mensal (Entradas vs Despesas)
    const canvasHistorico = document.getElementById("grafico-historico");
    if (canvasHistorico) {
        const ctxHist = canvasHistorico.getContext("2d");
        const mesesLista = Object.keys(dados.meses);
        const histEntradas = [];
        const histDespesas = [];

        mesesLista.forEach(nomeMes => {
            const m = dados.meses[nomeMes];
            const eTot = m.entradas.reduce((acc, cur) => acc + Number(cur.valor || 0), 0);
            let dTot = 0;
            m.categorias.forEach(cat => {
                dTot += cat.itens.reduce((acc, cur) => acc + Number(cur.valor || 0), 0);
            });
            histEntradas.push(eTot);
            histDespesas.push(dTot);
        });

        if (chartHistoricoInstancia) chartHistoricoInstancia.destroy();

        const tamFonte = Number(document.getElementById("font-slider")?.value || 16);

        chartHistoricoInstancia = new Chart(ctxHist, {
            type: "bar",
            data: {
                labels: mesesLista,
                datasets: [
                    {
                        label: "Entradas",
                        data: histEntradas,
                        backgroundColor: "#27ae60"
                    },
                    {
                        label: "Despesas",
                        data: histDespesas,
                        backgroundColor: "#e74c3c"
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            font: {
                                size: tamFonte
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            font: {
                                size: Math.round(tamFonte * 0.85)
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: {
                                size: Math.round(tamFonte * 0.85)
                            },
                            callback: (val) => "R$ " + Number(val).toLocaleString("pt-BR")
                        }
                    }
                }
            }
        });
    }
// 3.5 Gráfico de Evolução dos Investimentos (Valor e Percentual)
    const canvasInvestimentos = document.getElementById("grafico-investimentos");
    if (canvasInvestimentos) {
        const ctxInv = canvasInvestimentos.getContext("2d");
        const mesesLista = Object.keys(dados.meses);
        const histInvestimentos = [];
        const histPercentual = [];

        mesesLista.forEach(nomeMes => {
            const m = dados.meses[nomeMes];
            const eTot = m.entradas.reduce((acc, cur) => acc + Number(cur.valor || 0), 0);
            
            let invTot = 0;
            m.categorias.forEach(cat => {
                if (cat.nome.toLowerCase().includes("investimento")) {
                    invTot += cat.itens.reduce((acc, cur) => acc + Number(cur.valor || 0), 0);
                }
            });
            
            histInvestimentos.push(invTot);
            const perc = eTot > 0 ? Math.round((invTot / eTot) * 100) : 0;
            histPercentual.push(perc);
        });

        if (chartInvestimentosInstancia) chartInvestimentosInstancia.destroy();

        const tamFonte = Number(document.getElementById("font-slider")?.value || 16);

        chartInvestimentosInstancia = new Chart(ctxInv, {
            type: "line",
            data: {
                labels: mesesLista,
                datasets: [
                    {
                        type: "line",
                        label: "Valor Investido",
                        data: histInvestimentos,
                        borderColor: "#8e44ad",
                        backgroundColor: "#8e44ad",
                        borderWidth: 2,
                        tension: 0.3,
                        yAxisID: "y"
                    },
                    {
                        type: "bar",
                        label: "Percentual da Renda",
                        data: histPercentual,
                        backgroundColor: "rgba(142, 68, 173, 0.3)",
                        yAxisID: "y1"
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: { font: { size: tamFonte } }
                    }
                },
                scales: {
                    x: {
                        ticks: { font: { size: Math.round(tamFonte * 0.85) } }
                    },
                    y: {
                        type: "linear",
                        display: true,
                        position: "left",
                        beginAtZero: true,
                        ticks: {
                            font: { size: Math.round(tamFonte * 0.85) },
                            callback: (val) => "R$ " + Number(val).toLocaleString("pt-BR")
                        }
                    },
                    y1: {
                        type: "linear",
                        display: true,
                        position: "right",
                        beginAtZero: true,
                        grid: { drawOnChartArea: false },
                        ticks: {
                            font: { size: Math.round(tamFonte * 0.85) },
                            callback: (val) => val + "%"
                        }
                    }
                }
            }
        });
    }    // 4. Top 5 Maiores Despesas
    const listaTop = document.getElementById("lista-top-despesas");
    if (listaTop) {
        listaTop.innerHTML = "";
        todosItens.sort((a, b) => b.valor - a.valor);
        const top5 = todosItens.slice(0, 5);

        if (top5.length === 0) {
            listaTop.innerHTML = `<div style="text-align: center; color: var(--texto-secundario); padding: 12px 0;">Nenhuma despesa lançada neste mês.</div>`;
        } else {
            top5.forEach(item => {
                const perc = totalDespesas > 0 ? ((item.valor / totalDespesas) * 100).toFixed(0) : 0;
                const el = document.createElement("div");
                el.className = "top-despesa-item";
                el.innerHTML = `
                    <div class="top-despesa-info">
                        <span>${item.emoji} ${item.nome} <span style="font-size: 0.85em; color: var(--texto-secundario); font-weight: normal;">(${item.categoria})</span></span>
                        <span>${formatarMoeda(item.valor)} <span style="font-size: 0.85em; color: var(--texto-secundario); font-weight: normal;">(${perc}%)</span></span>
                    </div>
                    <div class="top-despesa-barra-fundo">
                        <div class="top-despesa-barra-progresso" style="width: ${perc}%;"></div>
                    </div>
                `;
                listaTop.appendChild(el);
            });
        }
    }
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
  const modalStatus = document.getElementById("modal-status");
    document.getElementById("btn-status-contas").onclick = () => {
        document.querySelectorAll(".aba-btn").forEach(b => b.classList.remove("ativa"));
        document.querySelector('.aba-btn[data-aba="0"]').classList.add("ativa");
        abrirModalStatus(0);
    };
    document.getElementById("modal-status-fechar").onclick = () => modalStatus.classList.add("hidden");

    document.querySelectorAll(".aba-btn").forEach(btn => {
        btn.onclick = (e) => {
            document.querySelectorAll(".aba-btn").forEach(b => b.classList.remove("ativa"));
            e.target.classList.add("ativa");
            abrirModalStatus(Number(e.target.getAttribute("data-aba")));
        };
    });
    // Alternância de Tela: Dashboard vs Reembolsos
    const btnReembolsos = document.getElementById("btn-reembolsos");
    const btnVoltar = document.getElementById("btn-voltar-dashboard");
    const telaReembolsos = document.getElementById("tela-reembolsos");
    const cardsContainer = document.getElementById("cards-container");
    const areaAddCategoria = document.querySelector(".area-add-categoria");
const graficoSecao = document.querySelector(".analise-secao") || document.querySelector(".grafico-secao");
    if (btnReembolsos && btnVoltar) {
        btnReembolsos.onclick = () => {
            cardsContainer.classList.add("hidden");
            areaAddCategoria.classList.add("hidden");
            graficoSecao.classList.add("hidden");
telaReembolsos.classList.remove("hidden");
            renderizarTabelaReembolsos();        };

        btnVoltar.onclick = () => {
            telaReembolsos.classList.add("hidden");
            cardsContainer.classList.remove("hidden");
            areaAddCategoria.classList.remove("hidden");
            graficoSecao.classList.remove("hidden");
        };
    }
}

function abrirModalEmoji(catIdx) {
    categoriaEditandoEmoji = catIdx;
    document.getElementById("modal-emoji").classList.remove("hidden");
}
function abrirModalStatus(abaAtiva) {
    const modalStatus = document.getElementById("modal-status");
    const listaEl = document.getElementById("lista-status");
    const totalEl = document.getElementById("total-status-modal");
    listaEl.innerHTML = "";

    const mesAtual = dados.meses[dados.mesAtivo];
    const itensFiltrados = [];
    let totalFiltrado = 0;

    mesAtual.categorias.forEach(cat => {
        cat.itens.forEach(item => {
            const val = Number(item.valor || 0);
            let estadoAtual = item.estado !== undefined ? item.estado : (item.pago ? 2 : 0);
            
            if (estadoAtual === abaAtiva && val > 0) {
                itensFiltrados.push({
                    emoji: cat.emoji,
                    categoria: cat.nome,
                    nome: item.nome || "Sem nome",
                    valor: val
                });
                totalFiltrado += val;
            }
        });
    });

    totalEl.textContent = formatarMoeda(totalFiltrado);

    if (abaAtiva === 0) totalEl.style.color = "var(--perigo)";
    else if (abaAtiva === 1) totalEl.style.color = "#8a05be";
    else totalEl.style.color = "var(--primaria)";

    if (itensFiltrados.length === 0) {
        let msg = "🎉 Nenhuma conta pendente para este mês!";
        if (abaAtiva === 1) msg = "Nenhum dinheiro na caixinha ainda.";
        if (abaAtiva === 2) msg = "Nenhuma conta paga ainda.";
        listaEl.innerHTML = `<div class="lista-vazia">${msg}</div>`;
    } else {
        itensFiltrados.forEach(p => {
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
    modalStatus.classList.remove("hidden");
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
// 8. Barra Fixa Inteligente (Scroll)
window.addEventListener("scroll", () => {
    const barraFixa = document.getElementById("barra-fixa");
    if (barraFixa) {
        if (window.scrollY > 250) {
            barraFixa.classList.add("visivel");
        } else {
            barraFixa.classList.remove("visivel");
        }
    }
});
// 9. Gestão de Reembolsos Médicos
function renderizarTabelaReembolsos() {
    const container = document.querySelector("#tela-reembolsos .tabela-responsiva");
    if (!container) return;

    if (!dados.reembolsos) {
        dados.reembolsos = [];
    }

    container.innerHTML = "";

    const tabela = document.createElement("table");
    tabela.className = "tabela-reembolsos";

    tabela.innerHTML = `
        <thead>
            <tr>
                <th style="min-width: 95px;">Consulta</th>
                <th style="min-width: 130px;">Prestador / Médico</th>
                <th style="min-width: 120px;">Especialidade</th>
                <th style="min-width: 105px;">Valor Pago</th>
                <th style="min-width: 125px;">Status</th>
                <th style="min-width: 105px;">Reembolso</th>
                <th style="min-width: 105px;">Custo Real</th>
                <th style="min-width: 105px;">Previsão</th>
                <th style="min-width: 130px;">Observação</th>
                <th style="width: 36px; text-align: center;">×</th>
            </tr>
        </thead>
        <tbody id="corpo-tabela-reembolsos"></tbody>
    `;

    const tbody = tabela.querySelector("#corpo-tabela-reembolsos");

    if (dados.reembolsos.length === 0) {
        const trVazia = document.createElement("tr");
        trVazia.innerHTML = `
            <td colspan="10" style="text-align: center; padding: 24px; color: var(--texto-secundario);">
                Nenhum reembolso cadastrado. Clique no botão abaixo para adicionar o primeiro.
            </td>
        `;
        tbody.appendChild(trVazia);
    } else {
        dados.reembolsos.forEach((item, idx) => {
            const tr = document.createElement("tr");

            const vPago = Number(item.valorPago || 0);
            const vReemb = Number(item.valorReembolsado || 0);
            const custoReal = Math.max(0, vPago - vReemb);

            tr.innerHTML = `
                <td><input type="text" value="${item.dataConsulta || ''}" placeholder="dd/mm/aa" style="width: 100%; background: transparent; border: 1px solid var(--borda-cor); color: var(--texto-cor); padding: 4px; border-radius: 4px;"></td>
                <td><input type="text" value="${item.medico || ''}" placeholder="Nome do médico" style="width: 100%; background: transparent; border: 1px solid var(--borda-cor); color: var(--texto-cor); padding: 4px; border-radius: 4px;"></td>
                <td><input type="text" value="${item.especialidade || ''}" placeholder="Especialidade" style="width: 100%; background: transparent; border: 1px solid var(--borda-cor); color: var(--texto-cor); padding: 4px; border-radius: 4px;"></td>
                <td><input type="text" value="${item.valorPago !== undefined ? item.valorPago : ''}" placeholder="0" style="width: 100%; text-align: right; background: transparent; border: 1px solid var(--borda-cor); color: var(--texto-cor); padding: 4px; border-radius: 4px;"></td>
                <td>
                    <select style="width: 100%; background: var(--card-bg); border: 1px solid var(--borda-cor); color: var(--texto-cor); padding: 4px; border-radius: 4px;">
                        <option value="Solicitado" ${item.status === 'Solicitado' ? 'selected' : ''}>Solicitado</option>
                        <option value="Fila de pgmto" ${item.status === 'Fila de pgmto' ? 'selected' : ''}>Fila de pgmto</option>
                        <option value="Pago" ${item.status === 'Pago' ? 'selected' : ''}>Pago</option>
                        <option value="Negado" ${item.status === 'Negado' ? 'selected' : ''}>Negado</option>
                    </select>
                </td>
                <td><input type="text" value="${item.valorReembolsado !== undefined ? item.valorReembolsado : ''}" placeholder="0" style="width: 100%; text-align: right; background: transparent; border: 1px solid var(--borda-cor); color: var(--texto-cor); padding: 4px; border-radius: 4px;"></td>
                <td class="custo-real-col" style="font-weight: 700; text-align: right;">${formatarMoeda(custoReal)}</td>
                <td><input type="text" value="${item.dataCredito || ''}" placeholder="dd/mm/aa" style="width: 100%; background: transparent; border: 1px solid var(--borda-cor); color: var(--texto-cor); padding: 4px; border-radius: 4px;"></td>
                <td><input type="text" value="${item.obs || ''}" placeholder="Observação" style="width: 100%; background: transparent; border: 1px solid var(--borda-cor); color: var(--texto-cor); padding: 4px; border-radius: 4px;"></td>
                <td style="text-align: center;"><button class="btn-remover-item" title="Excluir">×</button></td>
            `;

            const campos = tr.querySelectorAll("input");
            const selectStatus = tr.querySelector("select");
            const btnRemover = tr.querySelector(".btn-remover-item");

            campos[0].onchange = (e) => { item.dataConsulta = e.target.value; salvarDados(); };
            campos[1].onchange = (e) => { item.medico = e.target.value; salvarDados(); };
            campos[2].onchange = (e) => { item.especialidade = e.target.value; salvarDados(); };

            const calcularCusto = () => {
                let pago = parseFloat(String(campos[3].value).replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
                let reemb = parseFloat(String(campos[4].value).replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
                item.valorPago = pago;
                item.valorReembolsado = reemb;
                tr.querySelector(".custo-real-col").textContent = formatarMoeda(Math.max(0, pago - reemb));
                salvarDados();
            };

            campos[3].onchange = calcularCusto;
            campos[4].onchange = calcularCusto;
            selectStatus.onchange = (e) => { item.status = e.target.value; salvarDados(); };
            campos[5].onchange = (e) => { item.dataCredito = e.target.value; salvarDados(); };
            campos[6].onchange = (e) => { item.obs = e.target.value; salvarDados(); };

            btnRemover.onclick = () => {
                if (confirm(`Remover reembolso de "${item.medico || 'sem identificação'}"?`)) {
                    dados.reembolsos.splice(idx, 1);
                    salvarDados();
                    renderizarTabelaReembolsos();
                }
            };

            tbody.appendChild(tr);
        });
    }

    container.appendChild(tabela);

    let btnAdd = document.getElementById("btn-add-reembolso");
    if (!btnAdd) {
        btnAdd = document.createElement("button");
        btnAdd.id = "btn-add-reembolso";
        btnAdd.className = "btn-secundario";
        btnAdd.style.marginTop = "14px";
        btnAdd.textContent = "+ Adicionar Reembolso";
        container.parentNode.appendChild(btnAdd);
    }
    btnAdd.onclick = () => {
        dados.reembolsos.push({
            dataConsulta: "",
            medico: "",
            especialidade: "",
            valorPago: 0,
            status: "Solicitado",
            valorReembolsado: 0,
            dataCredito: "",
            obs: ""
        });
        salvarDados();
        renderizarTabelaReembolsos();
    };
}
// 10. Sistema de Desfazer (Undo) e Refazer (Redo)
function desfazerAcao() {
    if (historicoDesfazer.length === 0) return;

    historicoRefazer.push(JSON.stringify(dados));

    const estadoAnterior = historicoDesfazer.pop();
    Object.keys(dados).forEach(chave => delete dados[chave]);
    Object.assign(dados, JSON.parse(estadoAnterior));
    estadoAnteriorStr = estadoAnterior;

    salvarDados(false);

    const telaReembolsos = document.getElementById("tela-reembolsos");
    if (telaReembolsos && !telaReembolsos.classList.contains("hidden")) {
        renderizarTabelaReembolsos();
    } else {
        renderizarDashboard();
    }
}

function refazerAcao() {
    if (historicoRefazer.length === 0) return;

    historicoDesfazer.push(JSON.stringify(dados));

    const estadoFuturo = historicoRefazer.pop();
    Object.keys(dados).forEach(chave => delete dados[chave]);
    Object.assign(dados, JSON.parse(estadoFuturo));
    estadoAnteriorStr = estadoFuturo;

    salvarDados(false);

    const telaReembolsos = document.getElementById("tela-reembolsos");
    if (telaReembolsos && !telaReembolsos.classList.contains("hidden")) {
        renderizarTabelaReembolsos();
    } else {
        renderizarDashboard();
    }
}

window.addEventListener("keydown", (e) => {
    const comando = e.metaKey || e.ctrlKey;
    if (!comando) return;

    const tecla = e.key.toLowerCase();

    // Desfazer: Cmd + Z ou Ctrl + Z
    if (tecla === "z" && !e.shiftKey) {
        const el = document.activeElement;
        const emDigitacao = el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && !["checkbox", "radio", "button", "submit"].includes(el.type)));
        if (emDigitacao) return;

        e.preventDefault();
        desfazerAcao();
    }
    // Refazer: Cmd + Shift + Z, Ctrl + Shift + Z ou Ctrl + Y
    else if ((tecla === "z" && e.shiftKey) || (tecla === "y" && !e.shiftKey)) {
        const el = document.activeElement;
        const emDigitacao = el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && !["checkbox", "radio", "button", "submit"].includes(el.type)));
        if (emDigitacao) return;

        e.preventDefault();
        refazerAcao();
    }
});
