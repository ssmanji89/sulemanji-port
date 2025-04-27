#!/usr/bin/env python3
"""
PDF Generator Wrapper for WeasyPrint
Handles compatibility issues with different versions of pydyf
"""

import os
import subprocess
import tempfile

def html_to_pdf(html_content, output_pdf_path):
    """Convert HTML content to PDF using a reliable method
    that doesn't rely on direct WeasyPrint API calls
    """
    try:
        # Create a temporary HTML file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
            temp_html_path = f.name
            f.write(html_content)
        
        print(f"✨ Created temporary HTML file: {temp_html_path}")
        
        # Create a simple Python script that uses WeasyPrint
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            temp_script_path = f.name
            f.write(f"""
from weasyprint import HTML
# Load the HTML file
html = HTML(filename="{temp_html_path}")
# Write the PDF
html.write_pdf("{output_pdf_path}")
print("✅ PDF generated successfully!")
""")
        
        print(f"✨ Created temporary Python script: {temp_script_path}")
        
        # Execute the script in a subprocess to isolate any issues
        print("⏳ Running WeasyPrint in subprocess...")
        result = subprocess.run(['python', temp_script_path], 
                                capture_output=True, 
                                text=True)
        
        if result.returncode == 0:
            print(f"✅ PDF generated successfully at: {output_pdf_path}")
            success = True
        else:
            print(f"❌ PDF generation error: {result.stderr}")
            success = False
            
        # Clean up temporary files
        try:
            os.unlink(temp_html_path)
            os.unlink(temp_script_path)
        except Exception as e:
            print(f"Warning: Failed to clean up temporary files: {e}")
            
        return success
    
    except Exception as e:
        print(f"❌ Error in wrapper: {e}")
        return False

if __name__ == "__main__":
    # Test the wrapper
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Test Document</title>
        <style>
            body { font-family: Arial, sans-serif; }
        </style>
    </head>
    <body>
        <h1>Hello World</h1>
        <p>This is a test PDF document.</p>
    </body>
    </html>
    """
    
    output_pdf = "test_output.pdf"
    result = html_to_pdf(html_content, output_pdf)
    print(f"Result: {result}") 