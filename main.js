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
  try {
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

    console.log("收集的评分:", W);
    window.W = W;
    loadDataAndRecommend();
  } catch (error) {
    console.error("收集评分出错:", error);
    document.getElementById("loading").style.display = "none";
    alert("评分收集过程中出错，请重试。");
  }
}

// 加载 JSON 数据并执行推荐
function loadDataAndRecommend() {
  // 明确获取全局 W 变量
  const W = window.W;
  if (!W) {
    console.error("未能获取用户评分数据");
    document.getElementById("loading").style.display = "none";
    alert("未能获取评分数据，请重试。");
    return;
  }

  console.log("开始加载JSON数据...");
  
  Promise.all([
    fetch("./data/literature-scores.json").then(res => {
      if (!res.ok) throw new Error(`Literature scores: ${res.status}`);
      return res.json();
    }),
    fetch("./data/industry-preferences.json").then(res => {
      if (!res.ok) throw new Error(`Industry preferences: ${res.status}`);
      return res.json();
    }),
    fetch("./data/enterprise-patterns.json").then(res => {
      if (!res.ok) throw new Error(`Enterprise patterns: ${res.status}`);
      return res.json();
    }),
    fetch("./data/industry-cluster-distribution.json").then(res => {
      if (!res.ok) throw new Error(`Industry distribution: ${res.status}`);
      return res.json();
    })
  ])
    .then(([literatureScores, industryPrefs, enterprisePatterns, industryDist]) => {
      console.log("数据加载成功");
      try {
        const industry = document.getElementById("industry").value;
        console.log("所选行业:", industry);
        
        const cluster = getBestCluster(industry, industryDist);
        console.log("最佳聚类:", cluster);
        
        const tools = Object.keys(literatureScores);
        console.log("可用工具:", tools);

        if (!tools || tools.length === 0) {
          throw new Error("无有效工具数据");
        }

        const finalScores = tools.map(tool => {
          console.log(`处理工具: ${tool}`);
          try {
            // 安全地获取数据，提供默认值防止错误
            const R = literatureScores[tool] || {};
            let P = 0, C = 0;
            
            try {
              if (industryPrefs[industry]) {
                P = industryPrefs[industry][tool] || 0;
              }
              
              if (enterprisePatterns[cluster]) {
                C = enterprisePatterns[cluster][tool] || 0;
              }
            } catch (e) {
              console.warn(`获取工具 ${tool} 的 P/C 值出错:`, e);
              // 继续计算，使用默认值0
            }

            const sumT = (W.cost * (R.cost || 0)) +
                        (W.time * (R.time || 0)) +
                        (W.quality * (R.quality || 0)) +
                        (W.quantity * (R.quantity || 0)) +
                        (W.location * (R.location || 0)) +
                        (W.sustainable * (R.sustainable || 0));
                        
            const sumC = (W.risk * (R.risk || 0)) +
                        (W.complexity * (R.complexity || 0)) +
                        (W.conflicting * (R.conflicting || 0)) +
                        (W.variation * (R.variation || 0));
                        
            const sumD = (W.operational * (R.operational || 0)) +
                        (W.tactical * (R.tactical || 0)) +
                        (W.strategic * (R.strategic || 0));

            const score = 0.25 * sumT + 0.25 * sumC + 0.25 * sumD + 0.15 * P + 0.10 * C;
            
            console.log(`${tool} 得分:`, score);
            return { tool, score: parseFloat(score.toFixed(4)) };
          } catch (toolError) {
            console.error(`处理工具 ${tool} 时出错:`, toolError);
            return { tool, score: 0 }; // 返回0分，确保流程不中断
          }
        });

        finalScores.sort((a, b) => b.score - a.score);
        console.log("排序后的分数:", finalScores);
        renderResults(finalScores);
      } catch (error) {
        console.error("计算推荐结果时出错:", error);
        document.getElementById("loading").style.display = "none";
        alert("计算推荐结果时出错: " + error.message);
      }
    })
    .catch(error => {
      console.error("加载数据出错:", error);
      document.getElementById("loading").style.display = "none";
      alert("无法加载必要数据: " + error.message);
    });
}

// 推荐结果展示
function renderResults(scores) {
  try {
    const top = scores.slice(0, 3);
    const container = document.getElementById("recommendation-container");
    
    if (!container) {
      throw new Error("未找到结果容器元素");
    }
    
    container.innerHTML =
      "<h3>Top 3 Recommended Tools</h3><ol>" +
      top.map(t => `<li><strong>${t.tool}</strong> - <span class="score">${t.score}</span></li>`).join("") +
      "</ol>";

    console.log("创建图表...");
    const ctx = document.createElement("canvas");
    container.appendChild(ctx);

    // 最多显示所有工具，或者只显示前6个
    const displayTools = scores.slice(0, Math.min(scores.length, 6));

    new Chart(ctx, {
      type: "bar",
      data: {
        labels: displayTools.map(s => s.tool),
        datasets: [{
          label: "Score",
          data: displayTools.map(s => s.score),
          backgroundColor: [
            'rgba(75, 192, 192, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(255, 206, 86, 0.6)'
          ]
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { 
            beginAtZero: true, 
            max: Math.ceil(Math.max(...scores.map(s => s.score)) * 10) / 10 // 动态设置最大值
          }
        }
      }
    });

    console.log("图表创建完成");
    document.getElementById("loading").style.display = "none";
  } catch (error) {
    console.error("渲染结果时出错:", error);
    document.getElementById("loading").style.display = "none";
    alert("无法显示结果: " + error.message);
  }
}

// 匹配最佳企业聚类
function getBestCluster(industry, dist) {
  try {
    let bestCluster = null;
    let bestProb = 0;
    
    // 安全检查
    if (!dist || typeof dist !== 'object') {
      console.error("无效的分布数据:", dist);
      return "1"; // 默认返回聚类"1"
    }
    
    for (let cluster in dist) {
      // 检查该聚类是否包含行业数据
      if (dist[cluster] && dist[cluster][industry] !== undefined) {
        const prob = dist[cluster][industry] || 0;
        if (prob > bestProb) {
          bestCluster = cluster;
          bestProb = prob;
        }
      }
    }
    
    // 如果未找到匹配，返回默认值
    if (bestCluster === null) {
      console.warn(`未找到行业 ${industry} 的最佳聚类，使用默认值`);
      return "1"; // 默认返回聚类"1"
    }
    
    return bestCluster;
  } catch (error) {
    console.error("获取最佳聚类时出错:", error);
    return "1"; // 默认返回聚类"1"
  }
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

// 初始化 slider 显示值
document.addEventListener("DOMContentLoaded", function () {
  // 设置语言
  const savedLang = localStorage.getItem("selectedLanguage") || "en";
  switchLanguage(savedLang);
  
  // 初始化滑块
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
  
  console.log("页面初始化完成");
});
