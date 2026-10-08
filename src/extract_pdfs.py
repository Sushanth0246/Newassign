"""Step 0 - the datasets came as PDFs, so pull the tables out into CSVs.

Run once:  python -m src.extract_pdfs
Uses pdfplumber's table extraction (reading the raw text mixed up the
Profit and Quantity columns, tables are much safer).
"""
import pandas as pd
import pdfplumber

from src.config import PDF_DIR, RAW_DIR

FILES = {
    "list_of_orders": ["Order ID", "Order Date", "CustomerName", "State", "City"],
    "order_details": ["Order ID", "Amount", "Profit", "Quantity", "Category", "Sub-Category"],
    "sales_target": ["Month of Order Date", "Category", "Target"],
}


def read_pdf_table(pdf_path, columns):
    rows = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                for row in table:
                    cells = [(c or "").strip() for c in row[: len(columns)]]
                    # skip the header row that repeats on every page
                    if cells and cells[0].startswith(columns[0][:8]):
                        continue
                    if any(cells):
                        rows.append(cells)
    return pd.DataFrame(rows, columns=columns)


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    for name, cols in FILES.items():
        df = read_pdf_table(PDF_DIR / f"{name}.pdf", cols)
        df.to_csv(RAW_DIR / f"{name}.csv", index=False)
        print(f"{name}: {len(df)} rows")


if __name__ == "__main__":
    main()
