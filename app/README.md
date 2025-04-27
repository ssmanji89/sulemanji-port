# Resume PDF Generator

A professional tool that generates an ATS-optimized PDF resume from your resume.md file, specifically designed for MIS industry hiring managers.

## Features

- Creates a clean, structured PDF from your markdown resume content
- Fixes formatting issues and ensures proper spacing between sections
- Optimizes for ATS (Applicant Tracking Systems) with clear section headers
- Emphasizes important MIS industry keywords to help pass automated screening
- Preserves your existing content while improving layout for readability
- Maintains proper formatting for job titles, dates, and bullet points
- Ensures sections don't break across pages for professional presentation

## Requirements

- Python 3.7+
- WeasyPrint 60.1
- Markdown
- Jinja2
- pydyf 0.8.0 (specific version required to avoid compatibility issues)

## Installation

1. Create a virtual environment:
   ```
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```
   pip install -r update_requirements.txt
   ```

## Usage

Simply run:

```
python resume_pdf_generator.py
```

The script will:
1. Read your resume.md file from the root directory
2. Clean and structure the content for optimal formatting
3. Convert the markdown to HTML with proper styling
4. Apply ATS-friendly formatting to highlight key information
5. Generate a professionally formatted PDF in the assets directory

## Customization

You can easily customize the output by modifying:

- **Keywords**: Edit the `MIS_KEYWORDS` list to target specific industry terms
- **Styling**: Adjust the CSS in the HTML template to change fonts, spacing, or colors
- **Structure**: Modify the HTML structure functions to change the document layout
- **Page Settings**: Change page size, margins, and other PDF properties

## Troubleshooting

If you encounter the error "PDF.__init__() takes 1 positional argument but 3 were given":
- Make sure you're using pydyf 0.8.0 instead of newer versions
- Run `pip install pydyf==0.8.0` to downgrade if needed

If your formatting appears incorrect:
- Check for unusual HTML elements in your resume.md file
- Ensure all sections have proper markdown formatting (##, ###, etc.)
- Run the script again after making changes to your resume.md file

## License

This tool is provided as-is for personal use. 