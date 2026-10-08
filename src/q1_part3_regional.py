"""Q1 Part 3 - regional performance."""
import pandas as pd


def order_level(merged):
    """One row per order, with its total sales and profit, plus where it was placed."""
    return (merged.groupby(["Order ID", "State", "City"])
            .agg(sales=("Amount", "sum"), profit=("Profit", "sum"))
            .reset_index())


def state_summary(merged):
    o = order_level(merged)
    g = o.groupby("State")
    out = pd.DataFrame({
        "orders": g.size(),
        "total_sales": g["sales"].sum(),
        "total_profit": g["profit"].sum(),
    })
    out["avg_profit_per_order"] = (out["total_profit"] / out["orders"]).round(2)
    out["profit_margin_pct"] = (out["total_profit"] / out["total_sales"] * 100).round(2)
    out["avg_order_value"] = (out["total_sales"] / out["orders"]).round(2)
    out["share_of_orders_pct"] = (out["orders"] / out["orders"].sum() * 100).round(1)
    return out.sort_values("orders", ascending=False)


def top_states(summary, n=5):
    return summary.head(n)


def city_summary(merged):
    o = order_level(merged)
    g = o.groupby(["State", "City"])
    out = pd.DataFrame({
        "orders": g.size(),
        "total_sales": g["sales"].sum(),
        "total_profit": g["profit"].sum(),
    })
    out["avg_profit_per_order"] = (out["total_profit"] / out["orders"]).round(2)
    out["profit_margin_pct"] = (out["total_profit"] / out["total_sales"] * 100).round(2)
    out = out.reset_index()
    # Chandigarh shows up under both Punjab and Haryana, and 3 "Delhi" orders are filed
    # under Madhya Pradesh - add the state to the label only where a city name repeats.
    repeated = out["City"].duplicated(keep=False)
    out["label"] = [c if (c == s or not r) else f"{c} ({s})"
                    for c, s, r in zip(out["City"], out["State"], repeated)]
    return out.sort_values("total_profit").set_index(["State", "City"])


def state_category_profit(merged, states):
    sub = merged[merged["State"].isin(states)]
    return sub.pivot_table(index="State", columns="Category", values="Profit", aggfunc="sum")


def worst_subcategories(merged, state, n=3):
    sub = merged[merged["State"] == state]
    return sub.groupby("Sub-Category")["Profit"].sum().sort_values().head(n)


def priority_buckets(city_df, min_orders=8):
    """Rough split used in the write-up:
    fix     -> city is losing money
    grow    -> healthy margin (12%+) but still small volume (under 30 orders)
    protect -> the big volume cities (60+ orders)
    Cities with fewer than `min_orders` orders are ignored - too thin to judge.
    """
    c = city_df.reset_index()
    c = c[c["orders"] >= min_orders]
    fix = c[c["total_profit"] < 0]
    grow = c[(c["profit_margin_pct"] >= 12) & (c["orders"] < 30)]
    protect = c[c["orders"] >= 60]
    return fix, grow, protect
