"""
Storage Utility
Handles persistent storage of data in JSON files
"""
import os
import json
import logging

logger = logging.getLogger(__name__)

# Define data directory
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

def ensure_data_dir():
    """
    Ensure that the data directory exists
    """
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        logger.info(f"Created data directory: {DATA_DIR}")

def save_data(filename, data):
    """
    Save data to a JSON file in the data directory
    
    Args:
        filename (str): Name of the file to save to
        data (dict): Data to save
        
    Returns:
        bool: True if save was successful, False otherwise
    """
    try:
        ensure_data_dir()
        filepath = os.path.join(DATA_DIR, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
            
        logger.debug(f"Data saved to {filepath}")
        return True
        
    except Exception as e:
        logger.error(f"Error saving data to {filename}: {str(e)}")
        return False

def load_data(filename):
    """
    Load data from a JSON file in the data directory
    
    Args:
        filename (str): Name of the file to load from
        
    Returns:
        dict: Loaded data, or None if file doesn't exist or there was an error
    """
    try:
        ensure_data_dir()
        filepath = os.path.join(DATA_DIR, filename)
        
        if not os.path.exists(filepath):
            logger.debug(f"File {filepath} does not exist")
            return None
            
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        logger.debug(f"Data loaded from {filepath}")
        return data
        
    except Exception as e:
        logger.error(f"Error loading data from {filename}: {str(e)}")
        return None 