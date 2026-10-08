"""Run the whole Q1 analysis end to end.

    python -m src.extract_pdfs     # only needed once, builds data/raw/*.csv
    python main.py                 # builds tables + charts into outputs/
"""
import pandas as pd

from src import data_prep, plots
from src.config import TABLES_DIR
from src.q1_part1_category import category_summary, subcategory_summary, margin_without
from src.q1_part2_targets import furniture_targets, quarterly_view, all_category_attainment
from src.q1_part3_regional import (state_summary, top_states, city_summary,
                                   state_category_profit, worst_subcategories, priority_buckets)

pd.set_option("display.width", 200)
pd.set_option("display.max_columns", 20)


def save(df, name):
    TABLES_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(TABLES_DIR / f"{name}.csv")


def main():
    orders = data_prep.load_orders()
    details = data_prep.load_details()
    targets = data_prep.load_targets()
    merged = data_prep.build_merged(orders, details)
    data_prep.quality_report(orders, details, merged)
    data_prep.save_merged(merged)

    # ---------------- Part 1 ----------------
    cat = category_summary(merged)
    sub = subcategory_summary(merged)
    print("\n=== Part 1: category summary ===")
    print(cat)
    print("\nSub-category margins (worst first):")
    print(sub)
    print("\nFurniture margin without Tables: %.2f%%" % margin_without(merged, "Furniture", "Tables"))
    print("Clothing margin without Saree:   %.2f%%" % margin_without(merged, "Clothing", "Saree"))
    print("Electronics margin w/o E-Games:  %.2f%%" % margin_without(merged, "Electronics", "Electronic Games"))
    save(cat, "q1p1_category_summary")
    save(sub, "q1p1_subcategory_summary")
    plots.category_chart(cat)
    plots.subcategory_chart(sub)

    # ---------------- Part 2 ----------------
    ft = furniture_targets(targets, merged)
    qv = quarterly_view(ft)
    allc = all_category_attainment(targets, merged)
    print("\n=== Part 2: Furniture targets ===")
    print(ft)
    print("\nMonths target met:", int((ft["attainment_pct"] >= 100).sum()), "of 12")
    print("\nQuarterly view:")
    print(qv)
    print("\nAnnual attainment, all categories:")
    print(allc)
    save(ft, "q1p2_furniture_targets")
    save(qv, "q1p2_furniture_quarterly")
    save(allc, "q1p2_all_category_attainment")
    plots.furniture_chart(ft)

    # ---------------- Part 3 ----------------
    states = state_summary(merged)
    top5 = top_states(states, 5)
    cities = city_summary(merged)
    print("\n=== Part 3: top 5 states by order count ===")
    print(top5)
    print("\nTop-2 share of orders: %.1f%% | of sales: %.1f%% | of profit: %.1f%%" % (
        top5["orders"].head(2).sum() / states["orders"].sum() * 100,
        top5["total_sales"].head(2).sum() / states["total_sales"].sum() * 100,
        top5["total_profit"].head(2).sum() / states["total_profit"].sum() * 100))
    print("\nProfit by category inside the top 5 states:")
    print(state_category_profit(merged, top5.index))
    for s in ["Punjab", "Gujarat", "Tamil Nadu"]:
        print(f"\nWorst sub-categories in {s}:")
        print(worst_subcategories(merged, s))
    print("\nAll states:")
    print(states)
    print("\nCities, lowest profit first:")
    print(cities)
    fix, grow, protect = priority_buckets(cities)
    print("\nFIX    :", list(fix["label"]))
    print("GROW   :", list(grow["label"]))
    print("PROTECT:", list(protect["label"]))
    save(top5, "q1p3_top5_states")
    save(states, "q1p3_all_states")
    save(cities, "q1p3_cities")
    plots.top_states_chart(top5)
    plots.city_profit_chart(cities)
    print("\nDone. Tables in outputs/tables, charts in outputs/figures.")


if __name__ == "__main__":
    main()
