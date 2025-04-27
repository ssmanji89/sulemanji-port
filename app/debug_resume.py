#!/usr/bin/env python3
import traceback
import resume_pdf_generator
import sys
import re
import os
import inspect

def debug_generate():
    try:
        with open(resume_pdf_generator.RESUME_MD_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Clean and structure the content
        print("Step 1: Cleaning content...")
        content = resume_pdf_generator.clean_and_structure_content(content)
        
        # Convert markdown to HTML
        print("Step 2: Converting to HTML...")
        html_content = resume_pdf_generator.markdown.markdown(
            content,
            extensions=['tables', 'fenced_code', 'codehilite', 'attr_list']
        )
        
        # Print a sample of the HTML content
        print("HTML content sample (first 200 chars):")
        print(html_content[:200])
        
        # Apply additional HTML structuring - let's step through each part
        print("Step 3: Structuring HTML...")
        
        # Add section wrappers
        print("Step 3.1: Adding section wrappers...")
        html_content = re.sub(r'(<h2[^>]*>)(.*?)(</h2>)(.*?)(?=<h2|$)', 
                          r'<section class="resume-section">\\1\\2\\3\\4</section>', 
                          html_content, flags=re.DOTALL)
        
        # Fix Email formatting
        print("Step 3.2: Fixing email formatting...")
        html_content = re.sub(r'<div class="email">(.*?)</div>', 
                          r'<div class="email">\1</div>', 
                          html_content)
        
        # Find all section tags and give them unique IDs
        print("Step 3.3: Adding unique IDs to sections...")
        sections = re.findall(r'<section class="resume-section">.*?</section>', html_content, re.DOTALL)
        for i, section in enumerate(sections):
            # Create a version with a unique ID
            new_section = section.replace('<section class="resume-section">', f'<section class="resume-section" id="section-{i}">')
            html_content = html_content.replace(section, new_section)
        
        # New approach for Technical Skills section
        print("Step 3.4: Processing Technical Skills section...")
        tech_skills_pattern = re.compile(r'(<section class="resume-section" id="[^"]*">)(<h2[^>]*>Technical Skills</h2>)(.*?)(?=<h2|</section>)', re.DOTALL)
        tech_skills_match = tech_skills_pattern.search(html_content)
        if tech_skills_match:
            html_content = tech_skills_pattern.sub(
                r'\\1<div class="technical-skills-section">\\2\\3</div>', 
                html_content
            )
        
        # Now for Core Competencies section
        print("Step 3.5: Processing Core Competencies section...")
        core_comp_pattern = re.compile(r'(<section class="resume-section" id="[^"]*">)(<h2[^>]*>Core Competencies</h2>)(.*?)(?=<h2|</section>)', re.DOTALL)
        core_comp_match = core_comp_pattern.search(html_content)
        if core_comp_match:
            html_content = core_comp_pattern.sub(
                r'\\1<div class="core-competencies-section">\\2\\3</div>', 
                html_content
            )
        
        # Format job titles and dates
        print("Step 3.6: Formatting job titles and dates...")
        # Look for any instances where 'text' might be referenced as a variable
        if 'text' in html_content:
            print("WARNING: Found 'text' in html_content!")
            
        html_content = re.sub(r'<strong>(.*?)</strong>\s*\((.*?)\)', 
                          r'<div class="job-title">\\1</div><div class="job-date">\\2</div>', 
                          html_content)
        
        print("Step 3.7: Fixing job descriptions format...")
        html_content = re.sub(r'(<h4[^>]*>.*?</h4>)(\s*)(<[^u])', 
                          r'\\1\\2<ul>\\3', 
                          html_content)
        
        html_content = re.sub(r'(</li>)(\s*)(<h4|<h3|<h2|</section>)', 
                          r'\\1\\2</ul>\\3', 
                          html_content)
        
        # Check if 'text' is referenced in regex patterns
        print("Checking for 'text' in structure_html function...")
        structure_html_source = inspect.getsource(resume_pdf_generator.structure_html)
        if 'text' in structure_html_source:
            print(f"Found 'text' in structure_html function: {structure_html_source}")
        
        # Highlight keywords
        print("Step 4: Highlighting keywords...")
        html_content = resume_pdf_generator.highlight_keywords(html_content, resume_pdf_generator.MIS_KEYWORDS)
        
        # Now try to generate the PDF
        print("Step 5: Creating HTML template...")
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
                    font-family: Arial, sans-serif;
                    line-height: 1.5;
                    font-size: 11pt;
                }}
                .email {{
                    text-align: center;
                }}
                .professional-title {{
                    text-align: center;
                }}
            </style>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """
        
        temp_output_path = os.path.join(os.path.dirname(resume_pdf_generator.OUTPUT_PDF_PATH), "temp_debug_resume.pdf")
        
        print("Step 6: Generating PDF...")
        try:
            html = resume_pdf_generator.HTML(string=html_template)
            css = resume_pdf_generator.CSS(string="""
                @page { 
                    size: letter; 
                    margin: 0.75in;
                }
            """)
            print("Writing PDF to:", temp_output_path)
            html.write_pdf(temp_output_path, stylesheets=[css])
            print("✅ PDF generated successfully!")
        except Exception as pdf_error:
            print(f"❌ PDF generation error: {type(pdf_error).__name__}: {pdf_error}")
            # Let's try to inspect the error
            traceback.print_exc()
            
            # If it's a NameError about 'text', let's look at the source code of weasyprint
            if isinstance(pdf_error, NameError) and "text" in str(pdf_error):
                print("\nSearching for 'text' references in WeasyPrint...")
                from weasyprint import document
                document_source = inspect.getsource(document)
                if "text" in document_source:
                    for line in document_source.split("\n"):
                        if "text" in line:
                            print(f"Found in WeasyPrint document module: {line.strip()}")
        
        print("Success processing HTML content!")
        return True
    except NameError as e:
        if "name 'text' is not defined" in str(e):
            print("Found the 'text' name error!")
            # Print the line where the error occurred
            tb = traceback.extract_tb(sys.exc_info()[2])
            for frame in tb:
                print(f"Error in file {frame.filename}, line {frame.lineno}")
                print(f"Function: {frame.name}")
                print(f"Line: {frame.line}")
        
        print(f"Exception type: {type(e)}")
        print(f"Exception args: {e.args}")
        traceback.print_exc(file=sys.stdout)
        print(f"Error: {e}")
        return False
    except Exception as e:
        print(f"Exception type: {type(e)}")
        print(f"Exception args: {e.args}")
        traceback.print_exc(file=sys.stdout)
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Starting debug...")
    try:
        import inspect
        debug_generate()
    except ImportError:
        print("Could not import inspect module")
        debug_generate() 