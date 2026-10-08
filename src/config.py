"""Paths and a few cleaning rules used across the project."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PDF_DIR = ROOT / "data" / "source_pdfs"
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"
TABLES_DIR = ROOT / "outputs" / "tables"
FIGURES_DIR = ROOT / "outputs" / "figures"

# The PDF export cut a few cells short / scrambled the letters.
# These are the only values that needed fixing (checked by hand).
STATE_FIXES = {
    "Jammu and Kash": "Jammu and Kashmir",
    "Himachal Prades": "Himachal Pradesh",
}
CITY_FIXES = {
    "Kmairshmir": "Kashmir",
    "hSimla": "Simla",
}

# Month order for the financial year in the data (Apr-18 to Mar-19)
FY_MONTHS = ["Apr-18", "May-18", "Jun-18", "Jul-18", "Aug-18", "Sep-18",
             "Oct-18", "Nov-18", "Dec-18", "Jan-19", "Feb-19", "Mar-19"]
