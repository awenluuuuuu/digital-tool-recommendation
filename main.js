// 页面跳转：首页 -> 公司信息页
function scrollToCompanyInfo() {
  document.getElementById("home").style.display = "none";
  document.getElementById("company-info").style.display = "block";
  document.getElementById("company-info").scrollIntoView({ behavior: "smooth" });
}

// 开始评分流程
function startSurvey() {
  document.getElementById("company-info").style.display = "none";
  showSurveyStep(1);
}

// 显示第 step 页评分问卷
function showSurveyStep(step) {
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById(`survey-step-${i}`);
    if (el) el.style.display = "none";
  }
  const current = document.getElementById(`survey-step-${step}`);
  if (current) current.style.display = "block";
}

// 跳转到下一页问卷
function nextStep() {
  for (let i = 1; i <= 3; i++) {
    if (document.getElementById(`survey-step-${i}`).style.display === "block") {
      showSurveyStep(i + 1);
      break;
    }
  }
}

// 返回上一页问卷
function prevStep() {
  for (let i = 1; i <= 3; i++) {
    if (document.getElementById(`survey-step-${i}`).style.display === "block") {
      showSurveyStep(i - 1);
      break;
    }
  }
}

// 收集评分并开始推荐流程
function collectScores() {
  document.getElementById("loading").style.display = "block";
  document.getElementById("survey-step-3").style.display = "none";
  document.getElementById("results").style.display = "block";

  const W = {
    cost: parseInt(document.getElementById("cost").value),
    time: parseInt(document.getElementById("time").value),
    quality: parseInt(document.getElementById("quality").value),
    quantity: parseInt(document.getElementById("quantity").value),
    location: parseInt(document.getElementById("location").value),
    sustainable: parseInt(document.getElementById("sustainable").value),
    risk: parseInt(document.getElementById("risk").value),
    complexity: parseInt(document.getElementById("complexity").value),
    conflicting: parseInt(document.getElementById("conflicting").value),
    variation: parseInt(document.getElementById("variation").value),
    operational: parseInt(document.getElementById("operational").value),
    tactical: parseInt(document.getElementById("tactical").value),
    strategic: parseInt(document.getElementById("strategic").value)
  };

  window.W = W;
  loadDataAndRecommend();
}

// 加载 JSON 数据并执行推荐
function loadDataAndRecommend() {
  Promise.all([
    fetch("/digital-tool-recommendation/data/literature-scores.json").then(res => res.json()),
    fetch("/digital-tool-recommendation/data/industry-preferences.json").then(res => res.json()),
    fetch("/digital-tool-recommendation/data/enterprise-patterns.json").then(res => res.json()),
    fetch("/digital-tool-recommendation/data/industry-cluster-distribution.json").then(res => res.json())
  ])
    .then(([literatureScores, industryPrefs, enterprisePatterns, industryDist]) => {
      const industry = document.getElementById("industry").value;
      const cluster = getBestCluster(industry, industryDist);
      const tools = Object.keys(literatureScores);

      const finalScores = tools.map(tool => {
        const R = literatureScores[tool];
        const P = industryPrefs[industry][tool];
        const C = enterprisePatterns[cluster][tool];

        const score =
          0.25 *
            (W.cost * R.cost +
             W.time * R.time +
             W.quality * R.quality +
             W.quantity * R.quantity +
             W.location * R.location +
             W.sustainable * R.sustainable) +
          0.25 *
            (W.risk * R.risk +
             W.complexity * R.complexity +
             W.conflicting * R.conflicting +
             W.variation * R.variation) +
          0.25 *
            (W.operational * R.operational +
             W.tactical * R.tactical +
             W.strategic * R.strategic) +
          0.15 * P +
          0.10 * C;

        return { tool, score: parseFloat(score.toFixed(2)) };
      });

      finalScores.sort((a, b) => b.score - a.score);
      renderResults(finalScores);
    });
}

// 推荐结果展示
function renderResults(scores) {
  const top = scores.slice(0, 3);
  const container = document.getElementById("recommendation-container");
  container.innerHTML =
    "<h3>Top 3 Recommended Tools</h3><ol>" +
    top.map(t => `<li><strong>${t.tool}</strong> - <span class="score">${t.score}</span></li>`).join("") +
    "</ol>";

  const ctx = document.createElement("canvas");
  container.appendChild(ctx);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: scores.map(s => s.tool),
      datasets: [{
        label: "Score",
        data: scores.map(s => s.score)
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, max: 100 }
      }
    }
  });

  document.getElementById("loading").style.display = "none";
}

// 匹配最佳企业聚类
function getBestCluster(industry, dist) {
  let bestCluster = null;
  let bestProb = 0;
  for (let cluster in dist) {
    const prob = dist[cluster][industry] || 0;
    if (prob > bestProb) {
      bestCluster = cluster;
      bestProb = prob;
    }
  }
  return bestCluster;
}

// Start Over
function startOver() {
  document.getElementById("results").style.display = "none";
  document.getElementById("home").style.display = "block";
  document.getElementById("company-info").style.display = "none";
  for (let i = 1; i <= 3; i++) {
    document.getElementById(`survey-step-${i}`).style.display = "none";
  }
  document.getElementById("company-form").reset();
  const sliders = document.querySelectorAll('input[type="range"]');
  sliders.forEach(slider => {
    slider.value = 3;
    const valueDisplay = slider.nextElementSibling;
    if (valueDisplay && valueDisplay.classList.contains("slider-value")) {
      valueDisplay.textContent = "3";
    }
  });
}

// 初始化 slider 显示值
document.addEventListener("DOMContentLoaded", function () {
  const sliders = document.querySelectorAll('input[type="range"]');
  sliders.forEach(slider => {
    const valueDisplay = slider.nextElementSibling;
    if (valueDisplay && valueDisplay.classList.contains("slider-value")) {
      valueDisplay.textContent = slider.value;
    }
    slider.addEventListener("input", function () {
      const valueDisplay = this.nextElementSibling;
      if (valueDisplay && valueDisplay.classList.contains("slider-value")) {
        valueDisplay.textContent = this.value;
      }
    });
  });
});
// 多语言文本资源
const translations = {
  en: {
    title: "Digital Tool Recommendation",
    header: "Supply Chain Digital Tool Recommendation",
    slogan: "Empowering Your Digital Supply Chain",
    intro: "This system recommends digital tools based on your company's supply chain priorities and industry profile.",
    cta: "Start Now",
    form_title: "Tell Us About Your Company",
    industry: "Industry:",
    budget: "Annual Digitalization Budget:",
    adopted: "Have you adopted digital tools?",
    obj_q: "Please rate the importance of the following supply chain objectives for your company.",
    diff_q: "Please rate the importance of addressing the following supply chain difficulties.",
    dec_q: "Please rate the importance of the following supply chain decision-making levels.",
    next: "Next",
    back: "Back",
    submit: "Submit",
    restart: "Start Over",
    loading: "Calculating your personalized recommendations...",
    contact: "Contact us at: awenlu@outlook.com"
  },
  zh: {
    title: "数字化工具推荐系统",
    header: "供应链数字化工具推荐系统",
    slogan: "智能推荐，助力企业供应链数字化转型",
    intro: "本系统根据企业对供应链三大维度的侧重和所属行业，为其推荐最合适的数字化工具。",
    cta: "立即开始",
    form_title: "请告诉我们贵公司的基本情况",
    industry: "所属行业：",
    budget: "年度数字化预算：",
    adopted: "贵公司是否已使用数字化工具？",
    obj_q: "请根据您公司的实际情况，评估完成以下各供应链管理目标的重要程度。",
    diff_q: "请根据您公司的实际情况，评估解决以下各供应链管理困难的重要程度。",
    dec_q: "根据您公司的实际情况，请您对以下各供应链管理决策层级的重视程度。",
    next: "下一步",
    back: "上一步",
    submit: "提交",
    restart: "重新开始",
    loading: "正在为您计算专属推荐结果……",
    contact: "联系我们：awenlu@outlook.com"
  }
};

// 切换语言函数
function switchLanguage(lang) {
  localStorage.setItem("selectedLanguage", lang);
  const elements = document.querySelectorAll("[data-i18n]");
  elements.forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });

  // 切换按钮状态
  document.querySelectorAll("nav button").forEach(btn => {
    btn.setAttribute("aria-pressed", btn.textContent === (lang === "zh" ? "中文" : "EN"));
  });
}

// 页面初始化语言设置
document.addEventListener("DOMContentLoaded", () => {
  const savedLang = localStorage.getItem("selectedLanguage") || "en";
  switchLanguage(savedLang);
});
