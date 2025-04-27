#!/bin/bash

echo "Setting up Resume Generator..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python 3 and try again."
    exit 1
fi

# Detect OS for WeasyPrint dependencies
OS="$(uname -s)"
case "${OS}" in
    Darwin*)    
        echo "macOS detected. Installing WeasyPrint dependencies with Homebrew..."
        brew install cairo pango gdk-pixbuf libffi || echo "Failed to install dependencies. Please install manually: brew install cairo pango gdk-pixbuf libffi"
        ;;
    Linux*)     
        echo "Linux detected. You may need to install WeasyPrint dependencies."
        echo "For Ubuntu/Debian: sudo apt-get install build-essential python3-dev python3-pip python3-setuptools python3-wheel python3-cffi libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info"
        ;;
    CYGWIN*|MINGW*|MSYS*)
        echo "Windows detected. Please install WeasyPrint dependencies manually following the instructions at:"
        echo "https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#windows"
        ;;
    *)
        echo "Unknown OS. Please install WeasyPrint dependencies manually for your operating system."
        ;;
esac

# Create a Python virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv

# Activate the virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Run the resume generator
echo "Running resume generator..."
python generate_resume.py

echo "Resume generation completed!"
echo "The updated resume is available at: ../assets/SulemanManji_Resume.pdf"

# Deactivate the virtual environment
deactivate

exit 0 