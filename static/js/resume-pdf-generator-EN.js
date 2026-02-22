/**
 * Resume PDF Generator
 * Convert webpage content to PDF using html2pdf.js
 */

// Get current page language
function getCurrentLanguage() {
  return localStorage.getItem('site-lang') || 'en';
}

// Extract resume data from page DOM
function extractResumeData() {
  const lang = getCurrentLanguage();
  const isZh = lang === 'zh';
  
  const data = {
    lang: 'en',
    personal: {
      name: 'Amine',
      title: 'Graduate Student | Intelligent Science and Technology',
      organization: 'Anhui University',
      email: document.querySelector('a[href^="mailto:"]')?.getAttribute('href')?.replace('mailto:', '') || '13409951849@163.com',
      github: document.querySelector('a[href*="github.com"]')?.getAttribute('href') || 'https://github.com/amine123max',
      bio: 'Graduate student in Intelligent Science and Technology at Anhui University (211 Project). Research interests include path planning, robotics, and obstacle avoidance algorithms.'
    },
    education: [],
    skills: [],
    projects: [],
    interests: [],
    campusExperience: [],
    internshipExperience: []
  };

  // Hard-coded education data
  data.education = [
    {
      institution: 'Anhui University (211 Project)',
      degree: 'MSc in Intelligent Science and Technology',
      period: 'Sep 2025 - Present'
    },
    {
      institution: 'Hubei University',
      degree: 'B.Eng. in Communication Engineering',
      period: 'Sep 2019 - Jun 2023'
    }
  ];
  
  // Hard-coded campus experience data
  data.campusExperience = [
    {
      title: 'National 3D Digital Innovation Design Competition',
      role: 'Team Member',
      period: 'Feb 2020 - Jul 2020',
      description: 'Led the design of "Multi-functional Foldable Clothes Hanger" project.\n• Modeling: Created 3D models using SolidWorks with precise specifications.\n• Analysis: Conducted stress analysis and structural optimization.\n• Optimization: Performed material selection and cost-benefit analysis.\n• Presentation: Defended design decisions before judges.\nAwarded Provincial Third Prize.'
    },
    {
      title: 'National Innovation and Entrepreneurship Training Program',
      role: 'Research Team Member',
      period: 'Jul 2021 - Oct 2022',
      description: 'Participated in "Safe Reinforcement Learning for Vehicle Lane Change Control" research.\n• Research: Conducted literature review and algorithm analysis.\n• Implementation: Developed safety mechanisms with penalty functions and risk perception.\n• Simulation: Built lane change control simulation environment.\n• Documentation: Contributed to papers and participated in evaluations.\nAchieved excellent results.'
    }
  ];
  
  // Hard-coded internship experience data
  data.internshipExperience = [
    {
      company: 'Wuhan Weishixun Information Technology Co., Ltd.',
      companyUrl: 'https://baike.baidu.com/item/%E6%AD%A6%E6%B1%89%E5%A8%81%E5%A3%AB%E8%AE%AF%E4%BF%A1%E6%81%AF%E6%8A%80%E6%9C%AF%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B8/13129367',
      role: 'Software & Hardware Engineer Intern',
      period: 'Jun 2022 - Sep 2022',
      location: 'Wuhan, China',
      description: 'Led full-stack implementation of "Smart Home System Based on ZigBee Protocol".\n• Hardware: Designed circuit schematics and PCB layout.\n• Software: Developed ZigBee communication protocol stack and sensor data processing algorithms.\n• Firmware: Programmed embedded C code for wireless node communication.\n• Testing: Conducted circuit analysis, signal integrity testing, and system integration.\nReceived individual recognition.'
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

  // Extract projects from page DOM
  document.querySelectorAll('.project-card').forEach(card => {
    const nameEl = card.querySelector('.project-title span[data-lang="en"]');
    const descEl = card.querySelector('.project-description span[data-lang="en"]');
    const name = nameEl?.textContent?.trim();
    const description = descEl?.textContent?.trim();
    const tags = Array.from(card.querySelectorAll('.project-tag')).map(tag => tag.textContent.trim());
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
        }
        
        .resume-container .header,
        .resume-container .section h2 {
          border-color: #000 !important;
        }
        
        .resume-container .skill-tag,
        .resume-container .project-tag-inline {
          background: #000 !important;
          color: #fff !important;
        }
        
        /* Header */
        .header {
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid #000 !important;
        }
        
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 6px;
          color: #000 !important;
          text-align: left;
        }
        
        .subtitle {
          font-size: 12px;
          color: #555 !important;
          margin-bottom: 0;
          text-align: left;
        }
        
        .contact-info {
          margin-top: 10px;
          font-size: 10px;
        }
        
        .contact-item {
          margin-bottom: 3px;
          color: #333 !important;
        }
        
        .contact-item strong {
          color: #000 !important;
          font-weight: 600;
          margin-right: 5px;
        }
        
        .contact-item a {
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
        <div class="header">
          <h1>Amine</h1>
          <p class="subtitle">Graduate Student | Intelligent Science and Technology</p>
          <div class="contact-info">
            <div class="contact-item"><strong>Email:</strong> 13409951849@163.com</div>
            <div class="contact-item"><strong>Location:</strong> Anhui University</div>
            <div class="contact-item"><strong>GitHub:</strong> <a href="https://github.com/amine123max">amine123max</a></div>
            <div class="contact-item"><strong>Website:</strong> <a href="https://amine123max.github.io/">amine123max.github.io</a></div>
          </div>
        </div>
        
        <!-- About -->
        ${data.personal.bio ? `
        <div class="section">
          <h2>About</h2>
          <p class="about-text">${data.personal.bio}</p>
        </div>
        ` : ''}
        
        <!-- Campus Experience -->
        ${data.campusExperience && data.campusExperience.length > 0 ? `
        <div class="section">
          <h2>Campus Experience</h2>
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
          <h2>Internship Experience</h2>
          ${data.internshipExperience.map(exp => `
            <div class="exp-item">
              <div class="exp-header">
                <span class="company-role"><strong>${exp.companyUrl ? `<a href="${exp.companyUrl}" style="color: #0066cc; text-decoration: none;">${exp.company}</a>` : exp.company}</strong></span>
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
          <h2>Education</h2>
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
          <h2>Skills</h2>
          <div class="skills-container">
            ${data.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
          </div>
        </div>
        ` : ''}
        
        <!-- Projects -->
        ${data.projects && data.projects.length > 0 ? `
        <div class="section">
          <h2>Projects</h2>
          ${data.projects.map(project => `
            <div class="exp-item">
              <div class="exp-header">
                <span class="company-role">
                  <strong>${project.url ? `<a href="${project.url}" style="color: #0066cc; text-decoration: none;" target="_blank">${project.name}</a>` : project.name}</strong>
                </span>
              </div>
              ${project.description ? `<div class="description" style="margin-bottom: 6px;">${project.description}</div>` : ''}
              ${project.tags && project.tags.length > 0 ? `
                <div class="project-tags-inline">
                  <strong style="font-size: 10px; color: #666;">Tech Stack:</strong>
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
        filename: `${data.personal.name}_Resume.pdf`,
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

function initResumePDFGeneratorEN() {
  console.log('EN PDF Generator loaded');
}

window.initResumePDFGeneratorEN = initResumePDFGeneratorEN;
window.generatePDFEN = generatePDF;
