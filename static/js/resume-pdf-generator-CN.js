/**
 * Resume PDF Generator
 * Convert webpage content to PDF using html2pdf.js
 */

// Get current page language
function getCurrentLanguage() {
  return localStorage.getItem('site-lang') || 'en';
}

function getExternalLinkIconSVG() {
  return '<svg class="resume-link-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#0066cc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#0066cc;stroke:#0066cc;" aria-hidden="true" focusable="false">' +
    '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>' +
    '<polyline points="15 3 21 3 21 9"></polyline>' +
    '<line x1="10" y1="14" x2="21" y2="3"></line>' +
    '</svg>';
}

function getLocalizedNodeText(node, lang) {
  if (!node) return '';
  const localized = node.querySelector(`[data-lang="${lang}"]`);
  if (localized && localized.textContent) {
    const value = localized.textContent.trim();
    if (value) return value;
  }
  return (node.textContent || '').replace(/\s+/g, ' ').trim();
}

// Extract resume data from page DOM
function extractResumeData() {
  const lang = getCurrentLanguage();
  const isZh = lang === 'zh';
  
  const data = {
    lang: 'zh',
    personal: {
      name: '阿明',
      title: '研究生 | 智能科学与技术',
      organization: '安徽大学',
      email: document.querySelector('a[href^="mailto:"]')?.getAttribute('href')?.replace('mailto:', '') || '13409951849@163.com',
      github: document.querySelector('a[href*="github.com"]')?.getAttribute('href') || 'https://github.com/amine123max',
      bio: '安徽大学（211工程）智能科学与技术专业研究生。研究方向包括路径规划、机器人技术和避障算法。'
    },
    education: [],
    skills: [],
    projects: [],
    interests: [],
    campusExperience: [],
    internshipExperience: []
  };

  // 教育背景数据
  data.education = [
    {
      institution: '安徽大学（211工程）',
      degree: '智能科学与技术硕士',
      period: '2025年9月 - 至今'
    },
    {
      institution: '湖北大学',
      degree: '通信工程学士',
      period: '2019年9月 - 2023年6月'
    }
  ];
  
  // 校园经历数据
  data.campusExperience = [
    {
      title: '全国三维数字化创新设计大赛',
      role: '小组成员',
      period: '2020年2月 - 2020年7月',
      description: '负责"多功能便携式可折叠衣架"项目的设计与实现。\n• 建模设计：使用SolidWorks完成3D建模，精确定义尺寸规格。\n• 受力分析：进行全面的应力分析与结构优化，确保承重能力。\n• 材料优化：执行材料选型及成本效益分析，保证制造可行性。\n• 答辩展示：参与项目评审并进行设计方案答辩。\n获得省级三等奖，设计方案获得专家认可。'
    },
    {
      title: '全国大学生创新创业训练',
      role: '研究小组成员',
      period: '2021年7月 - 2022年10月',
      description: '参与"基于安全强化学习的超车变道机制研究"创新项目研究。\n• 文献调研：进行大量文献检索及对比分析，研究安全强化学习算法现状。\n• 算法实现：开发安全机制，引入惩罚函数与安全距离感知模块，识别并修正不安全动作。\n• 仿真测试：搭建超车变道控制仿真环境，进行算法验证与性能测试。\n• 文档撰写：参与论文编写、期刊文献撰集及阅读，参与中期及结项答辩。\n项目评审获得优秀成绩，积累了安全AI系统研发经验。'
    }
  ];
  
  // 实习经历数据
  data.internshipExperience = [
    {
      company: '武汉威士讯信息技术有限公司',
      companyUrl: 'https://baike.baidu.com/item/%E6%AD%A6%E6%B1%89%E5%A8%81%E5%A3%AB%E8%AE%AF%E4%BF%A1%E6%81%AF%E6%8A%80%E6%9C%AF%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B8/13129367',
      role: '软硬件工程师实习生',
      period: '2022年6月 - 2022年9月',
      location: '湖北武汉',
      description: '负责"基于ZigBee协议的智能家居系统"的软硬件全栈开发。\n• 硬件方面：设计电路原理图，完成PCB布局布线及元器件选型。\n• 软件方面：开发ZigBee通信协议栈，实现传感器数据采集与处理算法。\n• 固件开发：编写嵌入式C代码实现无线节点通信及网络拓扑管理。\n• 测试集成：进行电路分析、信号完整性测试及系统集成调试。\n成功交付完整解决方案并获得个人表彰。'
    }
  ];

  // Extract skills
  document.querySelectorAll('.skills-tags .skill-tag').forEach(tag => {
    data.skills.push(tag.textContent.trim());
  });

  // Extract interests
  document.querySelectorAll('.interests-list[data-lang="en"] li').forEach(li => {
    data.interests.push(li.textContent.trim());
  });

  // 从页面提取项目（中文版本）
  document.querySelectorAll('.project-card').forEach(card => {
    const nameEl = card.querySelector('.project-title span[data-lang="zh"]');
    const descEl = card.querySelector('.project-description span[data-lang="zh"]');
    const name = nameEl?.textContent?.trim();
    const description = descEl?.textContent?.trim();
    const tags = Array.from(card.querySelectorAll('.project-tag'))
      .map(tag => {
        const value = getLocalizedNodeText(tag, 'zh');
        if (!value) return '';
        if (value === '私密' || /^private$/i.test(value)) return 'Private';
        return value;
      })
      .filter(Boolean);
    const url = card.closest('a')?.getAttribute('href') || '';
    
    if (name) {
      data.projects.push({ name, description, tags, url });
    }
  });

  return data;
}

// Generate HTML format resume content
function generateResumeHTML(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          font-size: 10pt;
          line-height: 1.5;
          color: #000 !important;
          background: #ffffff !important;
          margin: 0;
          padding: 0;
        }
        
        .resume-container {
          width: 180mm;
          margin: 0;
          padding: 0;
          background: #ffffff !important;
          color: #000 !important;
          box-sizing: border-box;
        }
        
        .resume-container * {
          color: inherit !important;
          background: transparent !important;
          position: static !important;
        }
        
        .resume-container a {
          color: #0066cc !important;
          white-space: nowrap;
        }

        .resume-container a .resume-link-icon {
          display: inline-block;
          margin-left: 0.24em;
          vertical-align: -0.12em;
          flex: 0 0 auto;
          color: #0066cc !important;
          stroke: #0066cc !important;
        }

        .resume-container a .resume-link-icon * {
          stroke: #0066cc !important;
        }
        
         .resume-container .resume-header,
        .resume-container .section h2 {
          border-color: #000 !important;
        }
        
        .resume-container .skill-tag,
        .resume-container .project-tag-inline {
          background: #000 !important;
          color: #fff !important;
        }
        
        /* Header */
        .resume-header {
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid #000 !important;
        }
        
        .resume-header h1 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 6px;
          color: #000 !important;
          text-align: left;
        }
        
        .resume-subtitle {
          font-size: 12px;
          color: #555 !important;
          margin-bottom: 0;
          text-align: left;
        }
        
        .resume-contact-info {
          margin-top: 10px;
          font-size: 10px;
        }
        
        .resume-contact-item {
          margin-bottom: 3px;
          color: #333 !important;
        }
        
        .resume-contact-item strong {
          color: #000 !important;
          font-weight: 600;
          margin-right: 5px;
        }
        
        .resume-contact-item a {
          color: #0066cc !important;
          text-decoration: none;
        }
        
        /* Sections */
        .section {
          margin-bottom: 16px;
          margin-left: 0 !important;
          padding-left: 0 !important;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .section h2 {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 10px;
          margin-left: 0 !important;
          padding-left: 0 !important;
          color: #000;
          border-bottom: 2px solid #333;
          padding-bottom: 4px;
        }
        
        .about-text {
          font-size: 11px;
          line-height: 1.6;
          color: #333;
          text-align: left;
          margin-bottom: 10px;
        }
        
        /* Experience items */
        .exp-item {
          margin-bottom: 12px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .exp-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }
        
        .company-role {
          font-weight: 700;
          font-size: 12px;
          color: #000;
        }
        
        .period {
          font-size: 10px;
          color: #666;
          white-space: nowrap;
          font-style: italic;
        }
        
        .position {
          font-size: 11px;
          color: #444;
          margin-bottom: 6px;
        }
        
        .description {
          font-size: 10px;
          color: #555;
          line-height: 1.7;
          white-space: pre-line;
        }
        
        /* Education items */
        .edu-item {
          margin-bottom: 10px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .edu-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }
        
        .institution {
          font-weight: 700;
          font-size: 12px;
          color: #000;
        }
        
        .degree {
          font-size: 11px;
          color: #444;
        }
        
        /* Skills */
        .skills-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .skill-tag {
          background: #000;
          color: #fff;
          padding: 5px 12px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 500;
        }
        
        /* Projects inline tags */
        .project-tags-inline {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        
        .project-tag-inline {
          font-size: 9px;
          color: #fff;
          background: #000;
          padding: 3px 10px;
          border-radius: 3px;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="resume-container">
        <!-- Header -->
        <div class="resume-header">
          <h1>${data.personal.name}</h1>
          <p class="resume-subtitle">${data.personal.title}</p>
          <div class="resume-contact-info" style="display:block !important; visibility:visible !important; opacity:1 !important; margin-top:10px; font-size:10px; line-height:1.6; color:#333 !important;">
            <div class="resume-contact-item" style="display:block !important; visibility:visible !important; opacity:1 !important; margin-bottom:3px; color:#333 !important;"><strong style="color:#000 !important; font-weight:600; margin-right:5px;">邮箱：</strong><span style="color:#333 !important;">${data.personal.email}</span></div>
            <div class="resume-contact-item" style="display:block !important; visibility:visible !important; opacity:1 !important; margin-bottom:3px; color:#333 !important;"><strong style="color:#000 !important; font-weight:600; margin-right:5px;">地点：</strong><span style="color:#333 !important;">${data.personal.organization}</span></div>
            <div class="resume-contact-item" style="display:block !important; visibility:visible !important; opacity:1 !important; margin-bottom:3px; color:#333 !important;"><strong style="color:#000 !important; font-weight:600; margin-right:5px;">GitHub：</strong><a href="${data.personal.github}" style="color:#0066cc !important; text-decoration:none;">amine123max${getExternalLinkIconSVG()}</a></div>
            <div class="resume-contact-item" style="display:block !important; visibility:visible !important; opacity:1 !important; margin-bottom:3px; color:#333 !important;"><strong style="color:#000 !important; font-weight:600; margin-right:5px;">网站：</strong><a href="https://amine123max.github.io/" style="color:#0066cc !important; text-decoration:none;">amine123max.github.io${getExternalLinkIconSVG()}</a></div>
          </div>
        </div>
        
        <!-- About -->
        ${data.personal.bio ? `
        <div class="section">
          <h2>关于我</h2>
          <p class="about-text">${data.personal.bio}</p>
        </div>
        ` : ''}
        
        <!-- Campus Experience -->
        ${data.campusExperience && data.campusExperience.length > 0 ? `
        <div class="section">
          <h2>校园经历</h2>
          ${data.campusExperience.map(exp => `
            <div class="exp-item">
              <div class="exp-header">
                <span class="company-role"><strong>${exp.title}</strong></span>
                <span class="period">${exp.period}</span>
              </div>
              <div class="position">${exp.role}</div>
              ${exp.description ? `<div class="description">${exp.description}</div>` : ''}
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        <!-- Internship Experience -->
        ${data.internshipExperience && data.internshipExperience.length > 0 ? `
        <div class="section">
          <h2>实习经历</h2>
          ${data.internshipExperience.map(exp => `
            <div class="exp-item">
              <div class="exp-header">
                <span class="company-role"><strong>${exp.companyUrl ? `<a href="${exp.companyUrl}" style="color: #0066cc; text-decoration: none;" target="_blank" rel="noopener noreferrer">${exp.company}${getExternalLinkIconSVG()}</a>` : exp.company}</strong></span>
                <span class="period">${exp.period}</span>
              </div>
              <div class="position">${exp.role}${exp.location ? ' - ' + exp.location : ''}</div>
              ${exp.description ? `<div class="description">${exp.description}</div>` : ''}
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        <!-- Education -->
        ${data.education && data.education.length > 0 ? `
        <div class="section">
          <h2>教育背景</h2>
          ${data.education.map(edu => `
            <div class="edu-item">
              <div class="edu-header">
                <span class="institution">${edu.institution}</span>
                <span class="period">${edu.period || ''}</span>
              </div>
              <div class="degree">${edu.degree}</div>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        <!-- Skills -->
        ${data.skills && data.skills.length > 0 ? `
        <div class="section">
          <h2>技能</h2>
          <div class="skills-container">
            ${data.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
          </div>
        </div>
        ` : ''}
        
        <!-- Projects -->
        ${data.projects && data.projects.length > 0 ? `
        <div class="section">
          <h2>项目经历</h2>
          ${data.projects.map(project => `
            <div class="exp-item">
              <div class="exp-header">
                <span class="company-role">
                  <strong>${project.url ? `<a href="${project.url}" style="color: #0066cc; text-decoration: none;" target="_blank" rel="noopener noreferrer">${project.name}${getExternalLinkIconSVG()}</a>` : project.name}</strong>
                </span>
              </div>
              ${project.description ? `<div class="description" style="margin-bottom: 6px;">${project.description}</div>` : ''}
              ${project.tags && project.tags.length > 0 ? `
                <div class="project-tags-inline">
                  <strong style="font-size: 10px; color: #666;">技术栈：</strong>
                  ${project.tags.map(tag => `<span class="project-tag-inline">${tag}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;
}

// Generate PDF using html2pdf.js
async function generatePDF() {
  try {
    // Show loading indicator
    const btn = document.querySelector('.btn-download');
    if (btn) {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg><span>Generating...</span>';
      btn.style.pointerEvents = 'none';
      
      // Extract data and generate HTML
      const data = extractResumeData();
      const htmlContent = generateResumeHTML(data);
      
      // Create temporary container
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      document.body.appendChild(tempDiv);
      
      // Wait for images to load
      const images = tempDiv.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));
      
      // Configure PDF options - single page, highest quality
      const element = tempDiv.querySelector('.resume-container');
      
      const opt = {
        margin: [10, 15, 10, 15],
        filename: `${data.personal.name}_简历.pdf`,
        image: { 
          type: 'jpeg', 
          quality: 1.0
        },
        html2canvas: { 
          scale: 5,
          dpi: 300,
          useCORS: false,
          allowTaint: true,
          logging: false,
          letterRendering: true,
          backgroundColor: '#ffffff',
          imageTimeout: 0,
          removeContainer: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: false,
          precision: 16,
          putOnlyUsedFonts: true,
          floatPrecision: 16
        },
        pagebreak: { 
          mode: 'avoid-all'
        }
      };
      
      console.log('Starting PDF generation...');
      
      // Generate PDF - single page output
      await html2pdf().set(opt).from(element).save();
      
      console.log('PDF generated successfully');
      
      // Cleanup
      document.body.removeChild(tempDiv);
      if (btn) {
        btn.innerHTML = originalHTML;
        btn.style.pointerEvents = '';
      }
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    
    const btn = document.querySelector('.btn-download');
    if (btn) {
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg><span data-lang="en">Download CV</span><span data-lang="zh">Download CV</span>';
      btn.style.pointerEvents = '';
    }
    throw error;
  }
}

function initResumePDFGeneratorCN() {
  console.log('CN PDF Generator loaded');
}

window.initResumePDFGeneratorCN = initResumePDFGeneratorCN;
window.generatePDFCN = generatePDF;

