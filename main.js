// === Language Translation Dictionary ===
const translations = {
  en: {
    title: "Digital Tool Recommendation",
    header: "Supply Chain Digital Tool Recommendation",
    home: "Home",
    start: "Start",
    about: "About",
    contact: "Contact",
    slogan: "Empowering Your Digital Supply Chain",
    intro: "This system recommends digital tools based on your company’s supply chain priorities and industry profile.",
    cta: "Start Now",
    form_title: "Tell Us About Your Company",
    industry: "Industry:",
    budget: "Annual Digitalization Budget:",
    adopted: "Have you adopted digital tools?",
    next: "Next",
    result_title: "Recommended Tools",
    score_structure: "Score Composition"
  },
  zh: {
    title: "数字化工具推荐系统",
    header: "供应链数字化工具推荐系统",
    home: "首页",
    start: "开始",
    about: "关于我们",
    contact: "联系我们",
    slogan: "智能推荐，助力企业供应链数字化转型",
    intro: "本系统会根据贵公司所在行业及其在供应链管理中的重视事项，推荐适合的数字化工具。",
    cta: "立即开始",
    form_title: "请填写您的公司信息",
    industry: "所属行业：",
    budget: "年度数字化预算：",
    adopted: "贵公司是否已经采用数字工具？",
    next: "下一步",
    result_title: "推荐的数字工具",
    score_structure: "评分结构组成"
  }
};

function switchLanguage(lang) {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });
  localStorage.setItem('selectedLanguage', lang);
}

document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('selectedLanguage') || 'en';
  switchLanguage(savedLang);
});

function scrollToInput() {
  document.getElementById("input").style.display = "block";
  document.getElementById("input").scrollIntoView({ behavior: "smooth" });
}

const tools = ["Block", "BD", "AI", "DSS", "AM", "IoT", "Auto", "Cloud", "RFID"];
let R_j, P_H, C_k;

async function loadDataAndRecommend() {
  try {
    const [rj, ph, ck, clusterDist] = await Promise.all([
      fetch("data/literature-scores.json").then(res => res.json()),
      fetch("data/industry-preferences.json").then(res => res.json()),
      fetch("data/enterprise-patterns.json").then(res => res.json()),
      fetch("data/industry-cluster-distribution.json").then(res => res.json())
    ]);

    R_j = rj;
    const industry = document.querySelector("select[name='industry']").value;
    P_H = ph[industry];

    const bestCluster = Object.entries(clusterDist[industry])
      .sort((a, b) => b[1] - a[1])[0][0];
    C_k = ck[bestCluster];

    startSurvey();
  } catch (e) {
    console.error("Error loading data:", e);
  }
}

function collectScores() {
  const W = {
    cost: parseInt(document.getElementById('cost').value),
    time: parseInt(document.getElementById('time').value),
    quality: parseInt(document.getElementById('quality').value),
    quantity: parseInt(document.getElementById('quantity').value),
    location: parseInt(document.getElementById('location').value),
    sustainable: parseInt(document.getElementById('sustainable').value),
    risk: parseInt(document.getElementById('risk').value),
    complexity: parseInt(document.getElementById('complexity').value),
    conflicting: parseInt(document.getElementById('conflicting').value),
    variation: parseInt(document.getElementById('variation').value),
    operational: parseInt(document.getElementById('operational').value),
    tactical: parseInt(document.getElementById('tactical').value),
    strategic: parseInt(document.getElementById('strategic').value),
  };
  window.W = W;
  document.getElementById('results').style.display = 'block';
  document.getElementById('survey3').style.display = 'none';
  loadDataAndRecommend();
}

function startSurvey() {
  const W = window.W;
  const alpha = 0.25, beta = 0.25, gamma = 0.25, delta = 0.15, epsilon = 0.10;

  const scores = tools.map(tool => {
    let sumT = W.cost * R_j[tool].cost + W.time * R_j[tool].time + W.quality * R_j[tool].quality +
               W.quantity * R_j[tool].quantity + W.location * R_j[tool].location + W.sustainable * R_j[tool].sustainable;
    let sumC = W.risk * R_j[tool].risk + W.complexity * R_j[tool].complexity +
               W.conflicting * R_j[tool].conflicting + W.variation * R_j[tool].variation;
    let sumD = W.operational * R_j[tool].operational + W.tactical * R_j[tool].tactical + W.strategic * R_j[tool].strategic;

    const finalScore = alpha * sumT + beta * sumC + gamma * sumD + delta * P_H[tool] + epsilon * C_k[tool];
    return { tool, score: parseFloat(finalScore.toFixed(4)) };
  }).sort((a, b) => b.score - a.score).slice(0, 3);

  displayResults(scores);
}

function displayResults(recommendations) {
  const container = document.getElementById("results");
  container.innerHTML = `<h3 data-i18n='result_title'>Recommended Tools</h3>`;
  const labels = [], scores = [];

  recommendations.forEach(rec => {
    labels.push(rec.tool);
    scores.push(rec.score);
    container.innerHTML += `<p><strong>${rec.tool}</strong>: Score ${rec.score}</p>`;
  });

  const canvas = document.createElement("canvas");
  canvas.id = "recommendChart";
  container.appendChild(canvas);

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: translations.en.score_structure,
        data: scores,
        backgroundColor: ['#4e79a7', '#f28e2c', '#e15759']
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, max: 10 }  // 修改最大值为1以适配小数分数
      }
    }
  });
}