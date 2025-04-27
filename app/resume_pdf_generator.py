#!/usr/bin/env python3
import os
import re
import markdown
from weasyprint import HTML, CSS
from jinja2 import Environment, FileSystemLoader
import pdf_generator_wrapper

# Define paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
RESUME_MD_PATH = os.path.join(ROOT_DIR, 'resume.md')
OUTPUT_PDF_PATH = os.path.join(ROOT_DIR, 'assets', 'SulemanManji_Resume.pdf')
ASSETS_DIR = os.path.join(ROOT_DIR, 'assets')

# MIS-specific keywords to emphasize (expanded for ATS optimization)
MIS_KEYWORDS = [
    # Technical Skills
    'infrastructure', 'cloud', 'security', 'compliance', 'azure', 
    'microsoft 365', 'governance', 'enterprise', 'solutions architect',
    'optimization', 'automation', 'PowerShell', 'administration',
    'implementation', 'systems', 'technical', 'architecture',
    # Additional MIS Industry Terms
    'IT infrastructure', 'cloud architecture', 'system administration',
    'network', 'VPN', 'cybersecurity', 'Active Directory', 'Azure AD',
    'DevOps', 'CI/CD', 'monitoring', 'identity management', 'site-to-site',
    'process improvement', 'data loss prevention', 'DLP', 'MDM',
    'mobile device management', 'secure score', 'cost reduction',
    'hybrid', 'SharePoint', 'Teams', 'Exchange', 'Power Automate',
    # Role-related Terms
    'solutions architect', 'cloud architect', 'IT architect',
    'systems administrator', 'security engineer', 'technical SME',
    'solutions engineer', 'integration', 'migration'
]

def ensure_directory_exists(directory_path):
    """Ensure the target directory exists"""
    if not os.path.exists(directory_path):
        os.makedirs(directory_path)

def highlight_keywords(html_content, keywords):
    """Highlight keywords in HTML content using regex to preserve case"""
    for keyword in keywords:
        # Create regex pattern that matches whole word case-insensitively
        pattern = re.compile(r'\b(' + re.escape(keyword) + r')\b', re.IGNORECASE)
        
        # Replace with a span that preserves the original matched text
        html_content = pattern.sub(r'<span class="keyword">\1</span>', html_content)
    
    return html_content

def clean_and_structure_content(content):
    """Clean and structure the Markdown content to fix formatting issues"""
    # First, remove the YAML front matter if present
    if content.startswith('---'):
        content = content.split('---', 2)[2]
    
    # Replace the basic "Resume" title with a more professional one and add email
    content = re.sub(r'# Resume', '# Suleman Manji\n<div class="email">ssmanji89@gmail.com</div>', content)
    
    # Add centered professional title after email
    content = content.replace('<div class="email">ssmanji89@gmail.com</div>', '<div class="email">ssmanji89@gmail.com</div>\n<div class="professional-title">Cloud Architect | Solutions Expert | Technical Specialist</div>')
    
    # Remove the initial title line if it exists
    content = re.sub(r'\n## Cloud Architect \| Solutions Expert \| Technical Specialist', '', content)
    
    # Extract and format the core competencies section
    skill_tags_pattern = re.compile(r'<div class="highlight-section">(.*?)</div>', re.DOTALL)
    match = skill_tags_pattern.search(content)
    
    core_competencies = ""
    if match:
        skill_section = match.group(1)
        tag_pattern = re.compile(r'<span class="skill-tag">(.*?)</span>', re.DOTALL)
        skill_tags = tag_pattern.findall(skill_section)
        
        # Create a clean list of skills
        core_competencies = "## Core Competencies\n\n"
        for skill in skill_tags:
            core_competencies += f"- {skill}\n"
        
        # Remove the original section
        content = skill_tags_pattern.sub('', content)
    
    # Remove any HTML embed tags and divs
    content = content.replace('<div class="resume-preview">', '')
    content = content.replace('<embed src="/assets/SulemanManji_Resume.pdf" type="application/pdf" width="100%" height="600px" />', '')
    content = re.sub(r'<div class=".*?">.*?</div>', '', content, flags=re.DOTALL)
    content = re.sub(r'<div>.*?</div>', '', content, flags=re.DOTALL)
    
    # Remove the download section and fix header flow
    content = re.sub(r'## View My Resume.*?## Professional Experience', '## Professional Experience', content, flags=re.DOTALL)
    
    # Insert the core competencies in the right place - after the Professional Summary
    professional_summary_pattern = re.compile(r'## Professional Summary.*?## Technical Skills', re.DOTALL)
    summary_match = professional_summary_pattern.search(content)
    if summary_match and core_competencies:
        summary_text = summary_match.group(0)
        content = content.replace(summary_text, summary_text.replace('## Technical Skills', f"{core_competencies}\n\n## Technical Skills"))
    
    # Replace the Personal Assessment section with a more ATS/hiring manager friendly version
    personal_assessment_pattern = re.compile(r'## Personal Assessment.*?## Career Interests', re.DOTALL)
    match = personal_assessment_pattern.search(content)
    if match:
        original_text = match.group(0)
        
        # Create a more concise, ATS-friendly Professional Profile section
        new_section = """## Professional Profile

Results-driven technologist with a structured, methodical approach to problem-solving and system design. Combines deep technical expertise with strong analytical skills to deliver measurable business value through technology solutions. Particularly effective in complex enterprise environments requiring security compliance, cost optimization, and process improvement.

- **Analytical Approach**: Systematically evaluates technical problems, breaking down complex issues into manageable components
- **Technical Depth**: Quickly grasps system architecture and identifies optimization opportunities
- **Implementation Excellence**: Delivers high-quality solutions through meticulous planning and execution
- **Business Alignment**: Translates technical capabilities into business outcomes and ROI
- **Collaborative Leadership**: Builds consensus across technical and business stakeholders

## Career Interests"""
        
        # Replace with new section
        content = content.replace(original_text, new_section)
    
    # Ensure headers are well-separated from content
    content = re.sub(r'(## [^\n]+)\n([^#\n])', r'\\1\n\n\\2', content)
    content = re.sub(r'(### [^\n]+)\n([^#\n])', r'\\1\n\n\\2', content)
    content = re.sub(r'(#### [^\n]+)\n([^#\n])', r'\\1\n\n\\2', content)
    
    # Ensure space after job titles
    content = re.sub(r'(### [^\n]+)\n(\*\*[^\n]+\*\*)', r'\\1\n\n\\2', content)
    
    # Ensure list items are well-separated from following content
    content = re.sub(r'- ([^\n]+)\n([^-\n])', r'- \\1\n\n\\2', content)
    
    # Properly format technical skills section
    skills_pattern = re.compile(r'## Technical Skills\s*\n\n(.*?)(?=\n\n##|\Z)', re.DOTALL)
    skills_match = skills_pattern.search(content)
    if skills_match:
        skills_text = skills_match.group(1)
        # Ensure each skill category is on its own line
        skills_text = re.sub(r'(\*\*[^:]+:\*\*)(.*?)(?=\n\*\*|\Z)', r'\\1\\2\n', skills_text)
        formatted_skills = "## Technical Skills\n\n" + skills_text
        content = content.replace(skills_match.group(0), formatted_skills)
    
    return content

def structure_html(html_content):
    """Additional HTML structuring for better formatting"""
    # Add section wrappers for better styling
    html_content = re.sub(r'(<h2[^>]*>)(.*?)(</h2>)(.*?)(?=<h2|$)', 
                          r'<section class="resume-section">\\1\\2\\3\\4</section>', 
                          html_content, flags=re.DOTALL)
    
    # Fix Email formatting
    html_content = re.sub(r'<div class="email">(.*?)</div>', 
                          r'<div class="email">\1</div>', 
                          html_content)
    
    # Add job header divs for better semantic structure
    html_content = re.sub(r'(<h3[^>]*>)(.*?)(</h3>)(.*?)(?=<h3|<h2|</section>)', 
                          r'<div class="job-header">\\1\\2\\3\\4</div>', 
                          html_content, flags=re.DOTALL)
    
    # Fix Technical Skills and Core Competencies encapsulation
    # First, find all section tags and give them unique IDs
    sections = re.findall(r'<section class="resume-section">.*?</section>', html_content, re.DOTALL)
    for i, section in enumerate(sections):
        # Create a version with a unique ID
        new_section = section.replace('<section class="resume-section">', f'<section class="resume-section" id="section-{i}">')
        html_content = html_content.replace(section, new_section)
    
    # Using a different approach to avoid overlap issues
    # First, identify Technical Skills section
    tech_skills_pattern = re.compile(r'(<section class="resume-section" id="[^"]*">)(<h2[^>]*>Technical Skills</h2>)(.*?)(?=<h2|</section>)', re.DOTALL)
    tech_skills_match = tech_skills_pattern.search(html_content)
    if tech_skills_match:
        html_content = tech_skills_pattern.sub(
            r'\\1<div class="technical-skills-section">\\2\\3</div>', 
            html_content
        )
    
    # Now identify and fix Core Competencies section separately
    core_comp_pattern = re.compile(r'(<section class="resume-section" id="[^"]*">)(<h2[^>]*>Core Competencies</h2>)(.*?)(?=<h2|</section>)', re.DOTALL)
    core_comp_match = core_comp_pattern.search(html_content)
    if core_comp_match:
        html_content = core_comp_pattern.sub(
            r'\\1<div class="core-competencies-section">\\2\\3</div>', 
            html_content
        )
    
    # Make sure list items in job descriptions are properly formatted
    html_content = re.sub(r'(<h4[^>]*>.*?</h4>)(\s*)(<[^u])', 
                          r'\\1\\2<ul>\\3', 
                          html_content)
    
    html_content = re.sub(r'(</li>)(\s*)(<h4|<h3|<h2|</section>)', 
                          r'\\1\\2</ul>\\3', 
                          html_content)
    
    return html_content

def generate_ats_optimized_pdf():
    """Generate an ATS-optimized PDF from the resume markdown"""
    # Ensure assets directory exists
    ensure_directory_exists(ASSETS_DIR)
    
    try:
        # Read the markdown content
        with open(RESUME_MD_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Clean and structure the content
        content = clean_and_structure_content(content)
        
        # Convert markdown to HTML with extensions for better rendering
        html_content = markdown.markdown(
            content,
            extensions=['tables', 'fenced_code', 'codehilite', 'attr_list']
        )
        
        # Apply additional HTML structuring
        html_content = structure_html(html_content)
        
        # Highlight MIS-specific keywords for ATS optimization
        html_content = highlight_keywords(html_content, MIS_KEYWORDS)
        
        # Ensure job titles and dates are properly formatted
        html_content = re.sub(r'<strong>(.*?)</strong>\s*\((.*?)\)', 
                              r'<div class="job-title">\\1</div><div class="job-date">\\2</div>', 
                              html_content)
        
        # Create a simple HTML template with ATS-friendly styling
        html_template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Suleman Manji - Cloud Architect - Resume</title>
            <style>
                @page {{
                    size: letter portrait;
                    margin: 0.75in;
                }}
                body {{
                    font-family: 'Arial', 'Helvetica', sans-serif;
                    line-height: 1.5;
                    font-size: 11pt;
                    color: #333;
                    max-width: 100%;
                    margin: 0;
                    padding: 0;
                }}
                h1, h2, h3, h4 {{
                    font-family: 'Arial', 'Helvetica', sans-serif;
                    margin-top: 1.2em;
                    margin-bottom: 0.5em;
                    page-break-after: avoid;
                    break-after: avoid;
                }}
                h1 {{
                    font-size: 20pt;
                    color: #1a1a1a;
                    text-align: center;
                    margin-bottom: 0.1em;
                    margin-top: 0.5em;
                }}
                h2 {{
                    font-size: 14pt;
                    color: #2c3e50;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 0.3em;
                    margin-top: 1.8em;
                    margin-bottom: 0.8em;
                }}
                h3 {{
                    font-size: 12pt;
                    color: #2c3e50;
                    margin-bottom: 0.3em;
                    margin-top: 1.2em;
                }}
                h4 {{
                    font-size: 11pt;
                    color: #34495e;
                    margin-bottom: 0.3em;
                    margin-top: 0.8em;
                    font-style: italic;
                }}
                p {{
                    margin-top: 0.3em;
                    margin-bottom: 0.6em;
                }}
                ul {{
                    padding-left: 1.5em;
                    margin-top: 0.4em;
                    margin-bottom: 0.7em;
                }}
                li {{
                    margin-bottom: 0.3em;
                    padding-left: 0.2em;
                    list-style-type: disc;
                }}
                .keyword {{
                    font-weight: bold;
                }}
                strong {{
                    font-weight: bold;
                }}
                /* Resume sections */
                .resume-section {{
                    margin-bottom: 1.2em;
                    page-break-inside: avoid;
                    break-inside: avoid;
                }}
                /* Email styling */
                .email {{
                    text-align: center;
                    color: #445566;
                    font-size: 11pt;
                    margin-top: 0;
                    margin-bottom: 0.2em;
                }}
                /* Professional title styling */
                .professional-title {{
                    text-align: center;
                    color: #445566;
                    font-size: 12pt;
                    margin-top: 0;
                    margin-bottom: 0.8em;
                }}
                /* Job header section */
                .job-header {{
                    margin-bottom: 0.5em;
                }}
                .job-title {{
                    font-weight: bold;
                    font-size: 11pt;
                    margin-bottom: 0.1em;
                }}
                .job-date {{
                    font-style: italic;
                    margin-bottom: 0.7em;
                    color: #555;
                }}
                /* Technical Skills section */
                .technical-skills-section {{
                    margin-bottom: 1.5em;
                }}
                .technical-skills-section strong {{
                    color: #2c3e50;
                    display: inline-block;
                    min-width: 130px;
                }}
                /* Core Competencies section */
                .core-competencies-section {{
                    margin-bottom: 1.5em;
                }}
                .core-competencies-section li {{
                    margin-bottom: 0.4em;
                }}
                .competencies {{
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 0.5em;
                    margin: 1em 0;
                }}
                .competency {{
                    background-color: #f5f5f5;
                    padding: 0.3em 0.6em;
                    border-radius: 3px;
                    font-size: 0.9em;
                }}
                /* Position title below name */
                h1 + .email + .professional-title {{
                    text-align: center;
                    border-bottom: none;
                    margin-top: 0.2em;
                    color: #445566;
                    font-size: 12pt;
                    font-weight: normal;
                    max-width: 85%;
                    margin-left: auto;
                    margin-right: auto;
                    margin-bottom: 1em;
                    line-height: 1.3;
                }}
                /* Professional profile section styling */
                .professional-profile ul {{
                    list-style-type: none;
                    padding-left: 0.2em;
                }}
                .professional-profile ul li {{
                    margin-bottom: 0.5em;
                    padding-left: 0;
                }}
                /* Ensure proper spacing between sections */
                section + section {{
                    margin-top: 1em;
                }}
                /* Format list items with proper spacing */
                ul li ul {{
                    margin-top: 0.2em;
                    margin-bottom: 0.2em;
                }}
            </style>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """
        
        # Use our wrapper to generate the PDF, bypassing WeasyPrint compatibility issues
        if pdf_generator_wrapper.html_to_pdf(html_template, OUTPUT_PDF_PATH):
            print(f"✅ ATS-optimized PDF generated successfully at: {OUTPUT_PDF_PATH}")
            return True
        else:
            raise Exception("PDF generation failed in wrapper")
        
    except Exception as e:
        print(f"❌ Error generating PDF: {e}")
        return False

if __name__ == "__main__":
    print("📄 Generating ATS-optimized resume PDF for MIS industry hiring managers...")
    success = generate_ats_optimized_pdf()
    
    if success:
        print("\n🎯 Your resume has been optimized for ATS systems used by MIS hiring managers")
        print("📋 Key MIS industry terms have been emphasized for better keyword matching")
        print("📱 The PDF uses a clean, scannable format that works with ATS systems")
    else:
        print("\n⚠️ Resume PDF generation failed. See error messages above.") 