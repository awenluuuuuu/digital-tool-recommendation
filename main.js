// Global variables
let customQuestionData = [];

// Dynamically populate radio options for the custom KPI question
function loadCustomQuestionOptions(language) {
  const container = document.getElementById("custom-radio-question");
  if (!container) return;
  
  // Clear previous content except the heading
  const heading = container.querySelector("h4");
  container.innerHTML = "";
  container.appendChild(heading);
  
  const questionData = window.customQuestionData || [];
  
  // Update the heading text
  const translatedTitle = language === 'zh'
    ? "请选择当前企业面临的最突出挑战："
    : "Please choose the most relevant challenge your enterprise is facing:";
  heading.textContent = translatedTitle;

  // Create radio inputs for each question
  const radioGroup = document.createElement("div");
  radioGroup.className = "radio-options";
  
  questionData.forEach((q, idx) => {
    const label = document.createElement("label");
    label.className = "radio-label";
    
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "customKPI";
    input.value = `q_${idx}`;
    input.required = true;
    if (idx === 0) input.checked = true; // Select first option by default
    
    const text = document.createTextNode(language === 'zh' 
      ? q.Question_zh
      : q.Question);
    
    label.appendChild(input);
    label.appendChild(text);
    radioGroup.appendChild(label);
  });
  
  container.appendChild(radioGroup);
}

// Track language change and reload radio options
function switchLanguage(lang) {
  document.documentElement.lang = lang;
  localStorage.setItem('selectedLanguage', lang);
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });
  
  // Re-render radio options with new language
  loadCustomQuestionOptions(lang);
  
  // Update result content if visible
  if (document.getElementById("results").style.display === "block" &&
      window.currentScores && window.currentToolDetails) {
    renderResults(window.currentScores, window.currentToolDetails);
  }
}

// 页面跳转：首页 -> 公司信息页
function scrollToCompanyInfo() {
  document.getElementById("home").style.display = "none";
  document.getElementById("company-info").style.display = "block";
  document.getElementById("company-info").scrollIntoView({ behavior: "smooth" });
}

// 开始评分流程
function startSurvey() {
  const industry = document.getElementById("industry").value;
  
  // Load industry-specific questions
  fetch("./data/industry_kpi_question.json")
    .then(res => res.json())
    .then(data => {
      // Process and filter data by industry
      const processedData = data.map((item, index) => ({
        ...item,
        id: `q_${index}`
      }));
      
      const industryQuestions = processedData.filter(q => q.Industry === industry);
      window.customQuestionData = industryQuestions;
      
      // Update the UI
      const currentLang = localStorage.getItem("selectedLanguage") || "en";
      
      // Continue with the survey
      document.getElementById("company-info").style.display = "none";
      showSurveyStep(1);
    })
    .catch(error => {
      console.error("Error loading questions:", error);
      // Continue anyway
      document.getElementById("company-info").style.display = "none";
      showSurveyStep(1);
    });
}

// 显示第 step 页评分问卷
function showSurveyStep(step) {
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById(`survey-step-${i}`);
    if (el) el.style.display = "none";
  }
  const current = document.getElementById(`survey-step-${step}`);
  if (current) current.style.display = "block";
  
  // If at step 3, load the custom KPI questions
  if (step === 3) {
    const currentLang = localStorage.getItem("selectedLanguage") || "en";
    loadCustomQuestionOptions(currentLang);
  }
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
    }),
    fetch("./data/tool-details.json").then(res => {
      if (!res.ok) throw new Error(`Tool details: ${res.status}`);
      return res.json();
    }),
    fetch("./data/industry_kpi_question.json").then(res => {
      if (!res.ok) throw new Error(`Industry KPI questions: ${res.status}`);
      return res.json();
    })
  ])
    .then(([literatureScores, industryPrefs, enterprisePatterns, industryDist, toolDetails, kpiQuestions]) => {
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
        
        // Get selected KPI question
        const selectedQuestionEl = document.querySelector('input[name="customKPI"]:checked');
        let M = {}; // Initialize M values for all tools as 0
        tools.forEach(tool => M[tool] = 0); // Default to 0
        
        // If a question is selected, set M=1 for recommended technologies
        if (selectedQuestionEl && selectedQuestionEl.value) {
          const questionId = selectedQuestionEl.value;
          const questionIndex = parseInt(questionId.replace('q_', ''));
          
          // Find the industry questions
          const industryQuestions = kpiQuestions.filter(q => q.Industry === industry);
          
          if (industryQuestions.length > questionIndex) {
            const questionData = industryQuestions[questionIndex];
            console.log("Selected question:", questionData.Question);
            
            if (questionData && questionData["Recommended Technology"]) {
              // Set M=1 for each recommended technology
              questionData["Recommended Technology"].forEach(tech => {
                if (tools.includes(tech)) {
                  M[tech] = 1;
                  console.log(`Setting M=1 for ${tech} based on selected question`);
                }
              });
            }
          }
        }

        // Initialize scores object to store final scores
        let S = {};
        
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
            
            // Step 1: 计算维度得分
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
            
            // Calculate normalized sub-scores
            const objectivesScore = sumT / (W.cost + W.time + W.quality + W.quantity + W.location + W.sustainable);
            const difficultiesScore = sumC / (W.risk + W.complexity + W.conflicting + W.variation);
            const decisionsScore = sumD / (W.operational + W.tactical + W.strategic);
            
            const zeta = 1; // 加强 KPI 因素权重
            const penaltyMap = {
              "DSS": 0.5,
              "AM": 0.8,
              "Auto": 0.8
            };
            
            // Step 2: 得出主公式中 M 之前的部分
            let scoreWithoutM = 0.20 * sumT + 0.20 * sumC + 0.20 * sumD + 0.20 * P + 0.20 * C;
            
            // Step 3: 应用惩罚系数
            const penalty = penaltyMap[tool] || 1;
            scoreWithoutM *= penalty;
            
            // Step 4: 加上 M 部分（不受惩罚影响）
            const score = scoreWithoutM + zeta * (M[tool] || 0);
            
            // 保存到分数对象
            S[tool] = score;
            
            console.log(`工具 ${tool} 的惩罚前得分:`, scoreWithoutM);
            console.log(`M 值为:`, M[tool] || 0);
            console.log(`最终得分为:`, score);
            
            // 保存得分细分
            const scoreBreakdown = {
              objectives: objectivesScore,
              difficulties: difficultiesScore,
              decisions: decisionsScore,
              industry: P,
              enterprise: C,
              kpi: M[tool] || 0 // Include M value in the breakdown
            };
            
            // 创建工具能力对象 (用于雷达图)
            const toolCapabilities = {
              cost: R.cost || 0,
              time: R.time || 0,
              quality: R.quality || 0,
              risk: R.risk || 0,
              operational: R.operational || 0,
              strategic: R.strategic || 0
            };
            
            console.log(`${tool} 得分:`, score);
            return { 
              tool, 
              score: parseFloat(score.toFixed(4)),
              scoreBreakdown,
              toolCapabilities
            };
          } catch (toolError) {
            console.error(`处理工具 ${tool} 时出错:`, toolError);
            return { tool, score: 0 }; // 返回0分，确保流程不中断
          }
        });

        finalScores.sort((a, b) => b.score - a.score);
        console.log("排序后的分数:", finalScores);
        
        // Save scores for language switching
        window.currentScores = finalScores;
        window.currentToolDetails = toolDetails;
        
        renderResults(finalScores, toolDetails);
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
function renderResults(scores, toolDetails) {
  try {
    const currentLang = localStorage.getItem("selectedLanguage") || "en";
    const top3 = scores.slice(0, 3);
    const container = document.getElementById("recommendation-container");
    
    if (!container) {
      throw new Error("未找到结果容器元素");
    }
    
    // 创建顶部标题和介绍
    const title = currentLang === 'zh' ? '推荐工具' : 'Recommended Tools';
    const intro = currentLang === 'zh' ? 
      '基于您的管理偏好，以下是最适合您的供应链数字工具：' : 
      'Based on your management preferences, here are the digital tools that best match your supply chain needs:';
    
    container.innerHTML = `<h3>${title}</h3><p>${intro}</p>`;
    
    // 创建Top3工具对比图
    const topChartContainer = document.createElement('div');
    topChartContainer.className = 'chart-container';
    const topCanvas = document.createElement('canvas');
    topCanvas.id = 'top3Chart';
    topChartContainer.appendChild(topCanvas);
    container.appendChild(topChartContainer);
    
    // 绘制Top3柱状图
    const chartTitle = currentLang === 'zh' ? 'Top 3 推荐工具' : 'Top 3 Recommended Tools';
    const matchScore = currentLang === 'zh' ? '匹配度' : 'Match Score';
    
    new Chart(topCanvas, {
      type: "bar",
      data: {
        labels: top3.map(s => s.tool),
        datasets: [{
          label: matchScore,
          data: top3.map(s => s.score),
          backgroundColor: [
            'rgba(75, 192, 192, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(153, 102, 255, 0.7)'
          ],
          borderColor: [
            'rgb(75, 192, 192)',
            'rgb(54, 162, 235)',
            'rgb(153, 102, 255)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: chartTitle
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: { 
            beginAtZero: true,
            title: {
              display: true,
              text: matchScore
            }
          }
        }
      }
    });
    
    // 添加Score Breakdown解释
    const breakdownExplanation = document.createElement('div');
    breakdownExplanation.className = 'score-explanation';
    
    // 双语解释文本
    const explanationTitle = currentLang === 'zh' ? '得分结构解释' : 'Score Breakdown Explanation';
    const explanationText = currentLang === 'zh' ? 
      `<p>每个工具的得分结构包含以下几个部分：</p>
       <ul>
         <li><strong>目标</strong>: 工具对您所重视的供应链管理目标(成本、时间、质量等)的满足程度</li>
         <li><strong>难度</strong>: 工具解决您关注的供应链管理难题(风险、复杂性等)的能力</li>
         <li><strong>决策层级</strong>: 工具支持您重视的决策层级(运营、战术、战略)的能力</li>
         <li><strong>行业匹配</strong>: 工具与您所在行业常用模式的匹配程度</li>
         <li><strong>企业模式</strong>: 工具与类似您企业特征的企业使用模式的匹配程度</li>
         <li><strong>关键问题</strong>: 工具解决您选择的关键挑战的适用性</li>
       </ul>
       <p>得分越高表示工具在该方面越适合您的需求。</p>` : 
      `<p>Each tool's score breakdown includes the following components:</p>
       <ul>
         <li><strong>Objectives</strong>: How well the tool meets your supply chain management objectives (cost, time, quality, etc.)</li>
         <li><strong>Difficulties</strong>: The tool's capability to address supply chain challenges you care about (risk, complexity, etc.)</li>
         <li><strong>Decision Levels</strong>: How well the tool supports decision-making at levels important to you (operational, tactical, strategic)</li>
         <li><strong>Industry Match</strong>: How well the tool aligns with common patterns in your industry</li>
         <li><strong>Enterprise Pattern</strong>: How well the tool matches usage patterns of enterprises similar to yours</li>
         <li><strong>Key Challenge</strong>: The tool's suitability for addressing the specific challenge you selected</li>
       </ul>
       <p>Higher scores indicate better alignment with your needs in that area.</p>`;
    
    breakdownExplanation.innerHTML = `<h4>${explanationTitle}</h4>${explanationText}`;
    container.appendChild(breakdownExplanation);
    
    // 创建详细推荐卡片
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'recommendation-details';
    container.appendChild(detailsContainer);
    
    // 文本翻译
    const viewDetails = currentLang === 'zh' ? '查看详情' : 'View Details';
    const collapse = currentLang === 'zh' ? '收起' : 'Collapse';
    const description = currentLang === 'zh' ? '描述' : 'Description';
    const applications = currentLang === 'zh' ? '应用场景' : 'Applications';
    const cases = currentLang === 'zh' ? '成功案例' : 'Case Studies';
    const scoreStructure = currentLang === 'zh' ? '得分结构' : 'Score Breakdown';
    const prefMatch = currentLang === 'zh' ? '偏好匹配' : 'Preference Match';
    
    // 为每个工具创建详细信息卡片
    top3.forEach((tool, index) => {
      const details = toolDetails[tool.tool] ? 
                     toolDetails[tool.tool][currentLang] : 
                     { 
                       fullName: tool.tool, 
                       description: currentLang === 'zh' ? "数字化供应链工具" : "Digital supply chain tool", 
                       applications: currentLang === 'zh' ? "供应链管理" : "Supply chain management", 
                       cases: currentLang === 'zh' ? "多家企业成功应用" : "Various enterprise implementations" 
                     };
      
      const card = document.createElement('div');
      card.className = 'tool-card';
      card.innerHTML = `
        <div class="tool-header">
          <h4>${index + 1}. ${details.fullName} (${tool.tool})</h4>
           <span class="score">${currentLang === 'zh' ? '匹配分数' : 'Match score'}: ${tool.score.toFixed(2)}</span>
          <button class="expand-btn">${viewDetails}</button>
        </div>
        <div class="tool-details" style="display:none;">
          <p><strong>${description}:</strong> ${details.description}</p>
          <p><strong>${applications}:</strong> ${details.applications}</p>
          <p><strong>${cases}:</strong> ${details.cases}</p>
          <div class="charts-container">
            <div class="score-breakdown">
              <h5>${scoreStructure}</h5>
              <canvas id="breakdown-${tool.tool}"></canvas>
            </div>
            <div class="comparison-radar">
              <h5>${prefMatch}</h5>
              <canvas id="radar-${tool.tool}"></canvas>
            </div>
          </div>
        </div>
      `;
      detailsContainer.appendChild(card);
      
      // 添加展开/折叠功能
      const expandBtn = card.querySelector('.expand-btn');
      const detailsDiv = card.querySelector('.tool-details');
      
      expandBtn.addEventListener('click', function() {
        const isHidden = detailsDiv.style.display === 'none';
        detailsDiv.style.display = isHidden ? 'block' : 'none';
        expandBtn.textContent = isHidden ? collapse : viewDetails;
        
        // 首次展开时创建图表
        if (isHidden && !card.dataset.chartsCreated) {
          setTimeout(() => {
            createScoreBreakdownChart(tool.tool, tool.scoreBreakdown, currentLang);
            createMatchRadarChart(tool.tool, tool.toolCapabilities, currentLang);
            card.dataset.chartsCreated = 'true';
          }, 50);
        }
      });
    });
    
    document.getElementById("loading").style.display = "none";
  } catch (error) {
    console.error("渲染结果时出错:", error);
    document.getElementById("loading").style.display = "none";
    alert("无法显示结果: " + error.message);
  }
}

// 创建得分结构柱状图
function createScoreBreakdownChart(toolId, breakdown, lang) {
  // 如果没有实际的得分细分数据，创建模拟数据
  const data = breakdown || {
    objectives: 0.75,
    difficulties: 0.68,
    decisions: 0.82,
    industry: 0.79,
    enterprise: 0.64,
    kpi: 0.0
  };
  
  const canvas = document.getElementById(`breakdown-${toolId}`);
  if (!canvas) return;
  
  // 准备标签
  const labels = lang === 'zh' ? 
    ['目标', '难度', '决策层级', '行业匹配', '企业模式', '关键问题'] :
    ['Objectives', 'Difficulties', 'Decision Levels', 'Industry Match', 'Enterprise Pattern', 'Key Challenge'];
  
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: lang === 'zh' ? '得分' : 'Score',
        data: Object.values(data),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)'
        ]
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 1
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

// 创建用户偏好vs工具能力雷达图
function createMatchRadarChart(toolId, capabilities, lang) {
  // 如果没有工具能力数据，创建模拟数据
  const toolData = capabilities || {
    cost: 0.8,
    time: 0.7,
    quality: 0.9,
    risk: 0.6,
    operational: 0.85,
    strategic: 0.75
  };
  
  // 获取用户偏好数据 (标准化到0-1)
  const userPreferences = {
    cost: parseInt(document.getElementById('cost').value) / 5,
    time: parseInt(document.getElementById('time').value) / 5,
    quality: parseInt(document.getElementById('quality').value) / 5,
    risk: parseInt(document.getElementById('risk').value) / 5,
    operational: parseInt(document.getElementById('operational').value) / 5,
    strategic: parseInt(document.getElementById('strategic').value) / 5
  };
  
  const canvas = document.getElementById(`radar-${toolId}`);
  if (!canvas) return;
  
  // 准备标签和图例
  const labels = lang === 'zh' ? 
    ['成本', '时间', '质量', '风险', '运营', '战略'] :
    ['Cost', 'Time', 'Quality', 'Risk', 'Operational', 'Strategic'];
  
  const userPrefLabel = lang === 'zh' ? '用户偏好' : 'User Preference';
  const toolCapabilityLabel = lang === 'zh' ? '工具能力' : 'Tool Capability';
  
  new Chart(canvas, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        {
          label: userPrefLabel,
          data: Object.values(userPreferences),
          fill: true,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgb(54, 162, 235)',
          pointBackgroundColor: 'rgb(54, 162, 235)',
          pointBorderColor: '#fff'
        },
        {
          label: toolCapabilityLabel,
          data: Object.values(toolData),
          fill: true,
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgb(255, 99, 132)',
          pointBackgroundColor: 'rgb(255, 99, 132)',
          pointBorderColor: '#fff'
        }
      ]
    },
    options: {
      elements: {
        line: {
          borderWidth: 2
        }
      },
      scales: {
        r: {
          angleLines: {
            display: true
          },
          suggestedMin: 0,
          suggestedMax: 1
        }
      }
    }
  });
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
    custom_radio_title: "Please choose the most relevant challenge your enterprise is facing:",
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
    custom_radio_title: "请选择当前企业面临的最突出挑战：",
    next: "下一步",
    back: "上一步",
    submit: "提交",
    restart: "重新开始",
    loading: "正在为您计算专属推荐结果……",
    contact: "联系我们：awenlu@outlook.com"
  }
};

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
