"""Q1 Part 2 - Furniture targets: month-over-month change and target vs actual."""
import pandas as pd

from src.config import FY_MONTHS


def furniture_targets(targets, merged, big_move_pct=1.5):
    t = targets[targets["Category"] == "Furniture"].copy()
    t["Month"] = pd.Categorical(t["Month"], categories=FY_MONTHS, ordered=True)
    t = t.sort_values("Month").set_index("Month")

    t["target_mom_pct"] = (t["Target"].pct_change() * 100).round(2)

    actual = (merged[merged["Category"] == "Furniture"]
              .groupby("Month")["Amount"].sum().reindex(FY_MONTHS))
    t["actual_sales"] = actual.values
    t["actual_mom_pct"] = (t["actual_sales"].pct_change() * 100).round(1)
    t["attainment_pct"] = (t["actual_sales"] / t["Target"] * 100).round(1)
    t["gap"] = t["actual_sales"] - t["Target"]
    t["big_target_move"] = t["target_mom_pct"] > big_move_pct
    return t


def quarterly_view(ft):
    q = ft.copy()
    q["Quarter"] = (["Q1 (Apr-Jun)"] * 3 + ["Q2 (Jul-Sep)"] * 3
                    + ["Q3 (Oct-Dec)"] * 3 + ["Q4 (Jan-Mar)"] * 3)
    out = q.groupby("Quarter", sort=False).agg(target=("Target", "sum"),
                                               actual=("actual_sales", "sum"))
    out["attainment_pct"] = (out["actual"] / out["target"] * 100).round(1)
    return out


def all_category_attainment(targets, merged):
    """Extra context: full-year target vs actual for every category."""
    tgt = targets.groupby("Category")["Target"].sum()
    act = merged.groupby("Category")["Amount"].sum()
    out = pd.DataFrame({"annual_target": tgt, "annual_actual": act})
    out["attainment_pct"] = (out["annual_actual"] / out["annual_target"] * 100).round(1)
    return out
