// All 100 companies across 5 sectors
// Each entry: [name, ticker, hq, specialization, exchange]
// exchange: "NYSE"|"NASDAQ"|"LSE"|"TSE"|"KRX"|"ASX"|"HKEX"|"SSE"|"TWO"|"Private"

export const sectors = {
  gpu: {
    id: "gpu",
    label: "GPU",
    fullName: "Graphics & AI Processing Units",
    color: "#1A6FD8",
    colorDim: "#0d3a72",
    description: "Discrete and integrated graphics processors for AI training, inference, gaming, and HPC.",
    companies: [
      { name: "NVIDIA",           ticker: "NVDA",      hq: "USA",         spec: "AI/Data Center GPUs",       exchange: "NASDAQ" , domain: "nvidia.com"},
      { name: "AMD",              ticker: "AMD",       hq: "USA",         spec: "Radeon & Instinct GPUs",    exchange: "NASDAQ" , domain: "amd.com"},
      { name: "Intel",            ticker: "INTC",      hq: "USA",         spec: "Arc & Gaudi AI GPUs",       exchange: "NASDAQ" , domain: "intel.com"},
      { name: "Qualcomm",         ticker: "QCOM",      hq: "USA",         spec: "Adreno Mobile GPUs",        exchange: "NASDAQ" , domain: "qualcomm.com"},
      { name: "Arm Holdings",     ticker: "ARM",       hq: "UK",          spec: "GPU IP Licensing",          exchange: "NASDAQ" , domain: "arm.com"},
      { name: "Imagination Tech", ticker: "IMG",       hq: "UK",          spec: "PowerVR GPU IP",            exchange: "LSE"    , domain: "imaginationtech.com"},
      { name: "Mobileye",         ticker: "MBLY",      hq: "Israel",      spec: "Automotive Vision GPUs",    exchange: "NASDAQ" , domain: "mobileye.com"},
      { name: "Cerebras Systems", ticker: "CBRS",      hq: "USA",         spec: "Wafer-Scale AI Chip",       exchange: "NASDAQ" , domain: "cerebras.ai"},
      { name: "Blaize",           ticker: "BZAI",      hq: "USA",         spec: "Edge AI GPUs",              exchange: "NASDAQ" , domain: "blaize.com"},
      { name: "Graphcore",        ticker: null,        hq: "UK",          spec: "IPU for AI",                exchange: "Private", domain: "graphcore.ai"},
      { name: "SambaNova",        ticker: null,        hq: "USA",         spec: "RDU AI Processors",         exchange: "Private", domain: "sambanova.ai"},
      { name: "Groq",             ticker: null,        hq: "USA",         spec: "LPU Inference Chips",       exchange: "Private", domain: "groq.com"},
      { name: "Tenstorrent",      ticker: null,        hq: "Canada",      spec: "RISC-V AI Processors",      exchange: "Private", domain: "tenstorrent.com"},
      { name: "Rebellions",       ticker: null,        hq: "South Korea", spec: "Neural Processing",         exchange: "Private", domain: "rebellions.ai"},
      { name: "Hailo Tech",       ticker: null,        hq: "Israel",      spec: "Edge AI Processors",        exchange: "Private", domain: "hailo.ai"},
      { name: "Kneron",           ticker: null,        hq: "Taiwan",      spec: "Edge NPU/GPU",              exchange: "Private", domain: "kneron.com"},
      { name: "Axelera AI",       ticker: null,        hq: "Netherlands", spec: "In-Memory Computing",       exchange: "Private", domain: "axelera.ai"},
      { name: "VeriSilicon",      ticker: "688521",    hq: "China",       spec: "GPU IP Design",             exchange: "SSE"    , domain: "verisilicon.com"},
      { name: "Rockchip",         ticker: null,        hq: "China",       spec: "SoC / GPU",                 exchange: "Private", domain: "rock-chips.com"},
      { name: "Inphi (Marvell)",  ticker: "MRVL",      hq: "USA",         spec: "Data Center Interconnect",  exchange: "NASDAQ" , domain: "marvell.com"},
    ]
  },
  chip: {
    id: "chip",
    label: "Microchip",
    fullName: "Microchip Manufacturers",
    color: "#0A5C99",
    colorDim: "#062f4d",
    description: "Foundries, memory producers, packaging specialists, and fab equipment enabling AI silicon.",
    companies: [
      { name: "TSMC",              ticker: "TSM",    hq: "Taiwan",      spec: "Foundry / Logic",         exchange: "NYSE"   , domain: "tsmc.com"},
      { name: "Samsung Foundry",   ticker: "SSNLF",  hq: "South Korea", spec: "Foundry / Memory",        exchange: "NYSE"   , domain: "samsung.com"},
      { name: "Intel Foundry",     ticker: "INTC",   hq: "USA",         spec: "IDM / Foundry",           exchange: "NASDAQ" , domain: "intel.com"},
      { name: "GlobalFoundries",   ticker: "GFS",    hq: "USA",         spec: "Specialty Foundry",       exchange: "NASDAQ" , domain: "gf.com"},
      { name: "UMC",               ticker: "UMC",    hq: "Taiwan",      spec: "Mature Node Foundry",     exchange: "NYSE"   , domain: "umc.com"},
      { name: "SK Hynix",          ticker: "000660", hq: "South Korea", spec: "HBM / DRAM",              exchange: "KRX"    , domain: "skhynix.com"},
      { name: "Micron Technology", ticker: "MU",     hq: "USA",         spec: "DRAM / NAND / HBM",       exchange: "NASDAQ" , domain: "micron.com"},
      { name: "Western Digital",   ticker: "WDC",    hq: "USA",         spec: "NAND Flash",              exchange: "NASDAQ" , domain: "westerndigital.com"},
      { name: "ASML",              ticker: "ASML",   hq: "Netherlands", spec: "EUV Lithography",         exchange: "NASDAQ" , domain: "asml.com"},
      { name: "Applied Materials", ticker: "AMAT",   hq: "USA",         spec: "Fab Equipment",           exchange: "NASDAQ" , domain: "appliedmaterials.com"},
      { name: "Lam Research",      ticker: "LRCX",   hq: "USA",         spec: "Etch / Dep Equipment",    exchange: "NASDAQ" , domain: "lamresearch.com"},
      { name: "KLA Corporation",   ticker: "KLAC",   hq: "USA",         spec: "Process Control",         exchange: "NASDAQ" , domain: "kla.com"},
      { name: "ASE Technology",    ticker: "ASX",    hq: "Taiwan",      spec: "Packaging / Test",        exchange: "NYSE"   , domain: "aseglobal.com"},
      { name: "Amkor Technology",  ticker: "AMKR",   hq: "USA",         spec: "Packaging / Test",        exchange: "NASDAQ" , domain: "amkor.com"},
      { name: "Entegris",          ticker: "ENTG",   hq: "USA",         spec: "Materials / CMP",         exchange: "NASDAQ" , domain: "entegris.com"},
      { name: "Onto Innovation",   ticker: "ONTO",   hq: "USA",         spec: "Metrology",               exchange: "NYSE"   , domain: "ontoinnovation.com"},
      { name: "Cohu",              ticker: "COHU",   hq: "USA",         spec: "Test Handlers",           exchange: "NASDAQ" , domain: "cohu.com"},
      { name: "Kulicke & Soffa",   ticker: "KLIC",   hq: "USA",         spec: "Wire Bonding",            exchange: "NASDAQ" , domain: "kns.com"},
      { name: "Kioxia",            ticker: "285A",   hq: "Japan",       spec: "NAND Flash",              exchange: "TSE"    , domain: "kioxia.com"},
      { name: "SMIC",              ticker: "688981", hq: "China",       spec: "Domestic Foundry",        exchange: "SSE"    , domain: "smics.com"},
    ]
  },
  asic: {
    id: "asic",
    label: "ASIC",
    fullName: "Application-Specific Integrated Circuits",
    color: "#0E7A5A",
    colorDim: "#073d2d",
    description: "Purpose-built silicon for AI training and inference from hyperscalers and startups.",
    companies: [
      { name: "Broadcom",         ticker: "AVGO",   hq: "USA",   spec: "Custom AI ASICs / HPC",     exchange: "NASDAQ" , domain: "broadcom.com"},
      { name: "Marvell Technology",ticker: "MRVL",  hq: "USA",   spec: "Custom AI ASIC",            exchange: "NASDAQ" , domain: "marvell.com"},
      { name: "Google (TPU)",     ticker: "GOOGL",  hq: "USA",   spec: "Tensor Processing Units",   exchange: "NASDAQ" , domain: "google.com"},
      { name: "Amazon (Trainium)",ticker: "AMZN",   hq: "USA",   spec: "AI Training ASICs",         exchange: "NASDAQ" , domain: "amazon.com"},
      { name: "Microsoft (Maia)", ticker: "MSFT",   hq: "USA",   spec: "AI Inference ASICs",        exchange: "NASDAQ" , domain: "microsoft.com"},
      { name: "Meta (MTIA)",      ticker: "META",   hq: "USA",   spec: "Meta Training Inference",   exchange: "NASDAQ" , domain: "meta.com"},
      { name: "Apple (Neural)",   ticker: "AAPL",   hq: "USA",   spec: "Neural Engine ASICs",       exchange: "NASDAQ" , domain: "apple.com"},
      { name: "Tesla (Dojo)",     ticker: "TSLA",   hq: "USA",   spec: "Supercomputer AI ASIC",     exchange: "NASDAQ" , domain: "tesla.com"},
      { name: "Cambricon",        ticker: "688256", hq: "China", spec: "AI ASIC Chips",             exchange: "SSE"    , domain: "cambricon.com"},
      { name: "Alibaba (Hanguang)",ticker: "BABA",  hq: "China", spec: "Cloud AI ASIC",             exchange: "NYSE"   , domain: "alibaba.com"},
      { name: "Baidu (Kunlun)",   ticker: "BIDU",   hq: "China", spec: "AI Cloud ASIC",             exchange: "NASDAQ" , domain: "baidu.com"},
      { name: "Furiosa AI",       ticker: null,     hq: "S. Korea",spec: "Data Center AI ASIC",    exchange: "Private", domain: "furiosa.ai"},
      { name: "Esperanto Tech",   ticker: null,     hq: "USA",   spec: "RISC-V AI ASIC",            exchange: "Private", domain: "esperanto.ai"},
      { name: "d-Matrix",         ticker: null,     hq: "USA",   spec: "In-Memory Compute ASIC",    exchange: "Private", domain: "d-matrix.ai"},
      { name: "Mythic",           ticker: null,     hq: "USA",   spec: "Analog Compute AI",         exchange: "Private", domain: "mythic.ai"},
      { name: "Syntiant",         ticker: null,     hq: "USA",   spec: "Always-On AI ASIC",         exchange: "Private", domain: "syntiant.com"},
      { name: "Untether AI",      ticker: null,     hq: "Canada",spec: "Inference ASIC",            exchange: "Private", domain: "untether.ai"},
      { name: "Lightmatter",      ticker: null,     hq: "USA",   spec: "Photonic Interconnect",     exchange: "Private", domain: "lightmatter.co"},
      { name: "Luminous Computing",ticker: null,    hq: "USA",   spec: "Photonic AI ASIC",          exchange: "Private", domain: "luminous.com"},
      { name: "Huawei (Ascend)",  ticker: null,     hq: "China", spec: "AI Training ASIC",          exchange: "Private", domain: "huawei.com"},
    ]
  },
  npu: {
    id: "npu",
    label: "NPU",
    fullName: "Neural Processing Units",
    color: "#7B3FBF",
    colorDim: "#3d1f60",
    description: "Dedicated neural engines for always-on, ultra-low-power AI inference at the device edge.",
    companies: [
      { name: "Qualcomm",          ticker: "QCOM",   hq: "USA",         spec: "Hexagon NPU (mobile)",    exchange: "NASDAQ" , domain: "qualcomm.com"},
      { name: "Apple",             ticker: "AAPL",   hq: "USA",         spec: "Neural Engine",           exchange: "NASDAQ" , domain: "apple.com"},
      { name: "MediaTek",          ticker: "2454",   hq: "Taiwan",      spec: "APU / NeuroPilot",        exchange: "TWO"    , domain: "mediatek.com"},
      { name: "Samsung (Exynos)",  ticker: "SSNLF",  hq: "South Korea", spec: "Neural Processing Unit",  exchange: "NYSE"   , domain: "samsung.com"},
      { name: "Arm Holdings",      ticker: "ARM",    hq: "UK",          spec: "Ethos NPU IP",            exchange: "NASDAQ" , domain: "arm.com"},
      { name: "NXP Semiconductors",ticker: "NXPI",   hq: "Netherlands", spec: "eIQ Edge NPU",            exchange: "NASDAQ" , domain: "nxp.com"},
      { name: "STMicroelectronics",ticker: "STM",    hq: "Switzerland", spec: "AI Edge NPU",             exchange: "NYSE"   , domain: "st.com"},
      { name: "Renesas Electronics",ticker:"RNECF",  hq: "Japan",       spec: "DRP-AI Accelerator",      exchange: "NYSE"   , domain: "renesas.com"},
      { name: "Texas Instruments", ticker: "TXN",    hq: "USA",         spec: "Edge AI DSP/NPU",         exchange: "NASDAQ" , domain: "ti.com"},
      { name: "Microchip Tech",    ticker: "MCHP",   hq: "USA",         spec: "PolarFire NPU",           exchange: "NASDAQ" , domain: "microchip.com"},
      { name: "BrainChip Holdings",ticker: "BRN",    hq: "Australia",   spec: "Akida Neuromorphic NPU",  exchange: "ASX"    , domain: "brainchip.com"},
      { name: "Andes Technology",  ticker: "6533",   hq: "Taiwan",      spec: "RISC-V + NPU IP",         exchange: "TWO"    , domain: "andestech.com"},
      { name: "Kneron",            ticker: null,     hq: "Taiwan",      spec: "KL NPU Series",           exchange: "Private", domain: "kneron.com"},
      { name: "Hailo Technology",  ticker: null,     hq: "Israel",      spec: "Hailo-8 NPU",             exchange: "Private", domain: "hailo.ai"},
      { name: "Eta Compute",       ticker: null,     hq: "USA",         spec: "Subthreshold NPU",        exchange: "Private", domain: "etacompute.com"},
      { name: "Syntiant",          ticker: null,     hq: "USA",         spec: "NDP Edge NPU",            exchange: "Private", domain: "syntiant.com"},
      { name: "Perceive",          ticker: null,     hq: "USA",         spec: "Ergo Edge NPU",           exchange: "Private", domain: "perceive.io"},
      { name: "Expedera",          ticker: null,     hq: "USA",         spec: "Edge NPU IP",             exchange: "Private", domain: "expedera.com"},
      { name: "GreenWaves Tech",   ticker: null,     hq: "France",      spec: "Ultra-Low Power NPU",     exchange: "Private", domain: "greenwaves-technologies.com"},
      { name: "Eta Compute",       ticker: null,     hq: "USA",         spec: "Subthreshold NPU",        exchange: "Private", domain: "etacompute.com"},
    ]
  },
  network: {
    id: "network",
    label: "Networking",
    fullName: "AI Networking & Infrastructure",
    color: "#C85C14",
    colorDim: "#642e0a",
    description: "High-bandwidth interconnects, optical I/O, DPUs, and SmartNICs enabling AI cluster scale-out.",
    companies: [
      { name: "Cisco Systems",    ticker: "CSCO",  hq: "USA",     spec: "AI Networking / Silicon One",  exchange: "NASDAQ" , domain: "cisco.com"},
      { name: "Arista Networks",  ticker: "ANET",  hq: "USA",     spec: "AI Data Center Switches",      exchange: "NYSE"   , domain: "arista.com"},
      { name: "Juniper Networks", ticker: "JNPR",  hq: "USA",     spec: "AI-Driven Networking",         exchange: "NYSE"   , domain: "juniper.net"},
      { name: "Marvell (Melnx)",  ticker: "MRVL",  hq: "USA",     spec: "InfiniBand / DPU",             exchange: "NASDAQ" , domain: "marvell.com"},
      { name: "Broadcom",         ticker: "AVGO",  hq: "USA",     spec: "Ethernet Switching ASICs",     exchange: "NASDAQ" , domain: "broadcom.com"},
      { name: "Credo Semicond.",  ticker: "CRDO",  hq: "USA",     spec: "PAM4 SerDes",                  exchange: "NASDAQ" , domain: "credosemi.com"},
      { name: "Alphawave Semi",   ticker: "AWE",   hq: "UK",      spec: "High-Speed SerDes IP",         exchange: "LSE"    , domain: "awavesemi.com"},
      { name: "Coherent Corp.",   ticker: "COHR",  hq: "USA",     spec: "Optical Transceivers",         exchange: "NYSE"   , domain: "coherent.com"},
      { name: "Pensando (AMD)",   ticker: "AMD",   hq: "USA",     spec: "DPU / SmartNIC",               exchange: "NASDAQ" , domain: "amd.com"},
      { name: "Intel (Tofino)",   ticker: "INTC",  hq: "USA",     spec: "P4 Programmable Switch",       exchange: "NASDAQ" , domain: "intel.com"},
      { name: "Xsight Labs",      ticker: null,    hq: "Israel",  spec: "AI Scale-Out Fabric",          exchange: "Private", domain: "xsightlabs.com"},
      { name: "Ayar Labs",        ticker: null,    hq: "USA",     spec: "Optical I/O Chiplets",         exchange: "Private", domain: "ayarlabs.com"},
      { name: "Nubis Comm.",      ticker: null,    hq: "USA",     spec: "Co-Packaged Optics",           exchange: "Private", domain: "nubiscommunications.com"},
      { name: "Fungible (MSFT)",  ticker: "MSFT",  hq: "USA",     spec: "Data Processing Units",        exchange: "NASDAQ" , domain: "microsoft.com"},
      { name: "Innovium",         ticker: null,    hq: "USA",     spec: "Teralynx Switch ASIC",         exchange: "Private", domain: "innovium.com"},
      { name: "Xilinx (AMD)",     ticker: "AMD",   hq: "USA",     spec: "FPGA Networking",              exchange: "NASDAQ" , domain: "amd.com"},
      { name: "Sycamore Networks",ticker: "SCMR",  hq: "USA",     spec: "AI Optical Networking",        exchange: "NASDAQ" , domain: "sycamorenet.com"},
      { name: "Arrcus",           ticker: null,    hq: "USA",     spec: "Distributed Routing OS",       exchange: "Private", domain: "arrcus.com"},
      { name: "Graphiant",        ticker: null,    hq: "USA",     spec: "Network-as-a-Service AI",      exchange: "Private", domain: "graphiant.com"},
      { name: "DriveNets",        ticker: null,    hq: "Israel",  spec: "Disaggregated Cloud Routing",  exchange: "Private", domain: "drivenets.com"},
    ]
  }
};

// Flat list of all unique public tickers for price fetching
export const allPublicTickers = [...new Set(
  Object.values(sectors)
    .flatMap(s => s.companies)
    .filter(c => c.ticker && c.exchange !== "Private")
    .map(c => c.ticker)
)];

// Company logo helper — Google favicon service (no key, cached, works for all domains)
export const logoUrl = (domain, size = 64) =>
  domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}` : null;