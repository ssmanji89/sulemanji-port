.PHONY: setup run update install-deps clean

# Default target
all: setup run

# Setup Python environment and dependencies
setup:
	@echo "Setting up Python environment..."
	python3 -m venv venv
	@echo "Installing dependencies..."
	./venv/bin/pip install -r requirements.txt

# Run the resume generator
run:
	@echo "Running resume generator..."
	./venv/bin/python generate_resume.py

# Just update the resume.md file without generating PDF
update:
	@echo "Updating resume.md file only..."
	./venv/bin/python update_resume_only.py

# Install system dependencies for WeasyPrint (macOS only)
install-deps:
	@echo "Installing system dependencies for WeasyPrint (macOS)..."
	brew install cairo pango gdk-pixbuf libffi

# Clean up the environment
clean:
	@echo "Cleaning up..."
	rm -rf venv
	rm -f resume_template.html
	rm -f resume_output.html

# Help
help:
	@echo "Available targets:"
	@echo "  all          : Setup environment and run the generator (default)"
	@echo "  setup        : Create virtual environment and install dependencies"
	@echo "  run          : Run the resume generator"
	@echo "  update       : Update only the resume.md file (no PDF generation)"
	@echo "  install-deps : Install system dependencies for WeasyPrint (macOS only)"
	@echo "  clean        : Remove virtual environment and temporary files" 