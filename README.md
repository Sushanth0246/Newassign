# Jar Growth Intern Assignment - Q1 Sales Analysis (Python)

Analysis of the Growth Intern data set (500 orders, 1,500 line items, Apr-2018 to Mar-2019):
category profitability, Furniture target vs actual, and regional performance.

## Run it

```bash
pip install -r requirements.txt
python -m src.extract_pdfs     # step 0, only once: pulls the tables out of the PDFs into data/raw/
python main.py                 # builds tables, charts and a run log into outputs/
node report/build_report.js    # optional: rebuilds the Word report (needs the docx npm package)
```

## Structure

```
main.py                    runs the whole Q1 analysis
src/
  config.py                paths + the 4 label fixes
  extract_pdfs.py          PDF tables -> CSV
  data_prep.py             load, clean, merge, sanity checks
  q1_part1_category.py     sales / profit / margin by category and sub-category
  q1_part2_targets.py      Furniture target MoM %, target vs actual, quarterly view
  q1_part3_regional.py     state + city summaries, priority groups
  plots.py                 charts
data/source_pdfs/          the datasets as received
data/raw/                  CSVs extracted from the PDFs
data/processed/            merged_orders.csv
outputs/tables/            every table used in the report
outputs/figures/           charts
outputs/run_log.txt        console output of main.py
report/                    the written submission (docx + pdf)
```

## Definitions

- Profit margin = total profit / total sales
- Average profit per order = profit / number of distinct orders (for a category: orders that contain it)
- Orders per state come from List of Orders (one row per order)

## Data notes

- 4 labels truncated by the PDF export were fixed (2 states, 2 cities). Nothing else was edited.
- 3 orders have State = Madhya Pradesh with City = Delhi; kept as in source.
- Chandigarh appears under both Punjab and Haryana; kept as in source.
- No currency in the data; amounts treated as rupees.
