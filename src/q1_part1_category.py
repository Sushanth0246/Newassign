"""Q1 Part 1 - sales and profitability by category."""
import pandas as pd


def category_summary(merged):
    g = merged.groupby("Category")
    out = pd.DataFrame({
        "orders": g["Order ID"].nunique(),
        "line_items": g.size(),
        "total_sales": g["Amount"].sum(),
        "total_profit": g["Profit"].sum(),
    })
    # profit per order = category profit / number of orders that bought that category
    out["avg_profit_per_order"] = (out["total_profit"] / out["orders"]).round(2)
    out["profit_margin_pct"] = (out["total_profit"] / out["total_sales"] * 100).round(2)
    out["avg_order_value"] = (out["total_sales"] / out["orders"]).round(2)
    out["loss_making_items_pct"] = g["Profit"].apply(lambda s: (s < 0).mean() * 100).round(1)
    return out.sort_values("profit_margin_pct", ascending=False)


def subcategory_summary(merged):
    g = merged.groupby(["Category", "Sub-Category"])
    out = pd.DataFrame({
        "line_items": g.size(),
        "total_sales": g["Amount"].sum(),
        "total_profit": g["Profit"].sum(),
    })
    out["profit_margin_pct"] = (out["total_profit"] / out["total_sales"] * 100).round(2)
    out["loss_making_items_pct"] = g["Profit"].apply(lambda s: (s < 0).mean() * 100).round(1)
    return out.sort_values("profit_margin_pct")


def margin_without(merged, category, subcat):
    """Margin of a category if one sub-category is taken out (what-if for the write-up)."""
    sub = merged[(merged["Category"] == category) & (merged["Sub-Category"] != subcat)]
    return sub["Profit"].sum() / sub["Amount"].sum() * 100
