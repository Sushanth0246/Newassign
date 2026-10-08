"""Charts for the report. Kept simple on purpose - one idea per chart."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from src.config import FIGURES_DIR

GOOD, BAD, NEUTRAL, ACCENT = "#2e7d5b", "#c0392b", "#7f8c8d", "#1f4e79"

plt.rcParams.update({
    "font.size": 10,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "figure.dpi": 150,
})


def _save(fig, name):
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / name, bbox_inches="tight")
    plt.close(fig)


def category_chart(cat):
    cat = cat.sort_values("total_sales", ascending=False)
    fig, ax = plt.subplots(figsize=(7, 4))
    x = range(len(cat))
    ax.bar([i - 0.2 for i in x], cat["total_sales"], width=0.4, color=ACCENT, label="Total sales")
    ax.bar([i + 0.2 for i in x], cat["total_profit"], width=0.4, color=GOOD, label="Total profit")
    for i, (_, r) in enumerate(cat.iterrows()):
        ax.text(i + 0.2, r["total_profit"] + 3000, f'{r["profit_margin_pct"]:.1f}%', ha="center", fontsize=9)
    ax.set_xticks(list(x))
    ax.set_xticklabels(cat.index)
    ax.set_ylabel("Rs.")
    ax.set_title("Sales vs profit by category (label = profit margin)", loc="left")
    ax.legend(frameon=False)
    _save(fig, "fig1_category_sales_profit.png")


def subcategory_chart(sub):
    sub = sub.reset_index().sort_values("profit_margin_pct")
    labels = sub["Sub-Category"] + "  (" + sub["Category"].str[:4] + ")"
    colors = [BAD if v < 0 else (NEUTRAL if v < 5 else GOOD) for v in sub["profit_margin_pct"]]
    fig, ax = plt.subplots(figsize=(7, 5.2))
    ax.barh(labels, sub["profit_margin_pct"], color=colors)
    ax.axvline(0, color="black", lw=0.8)
    ax.set_xlabel("Profit margin (%)")
    ax.set_title("Profit margin by sub-category", loc="left")
    _save(fig, "fig2_subcategory_margin.png")


def furniture_chart(ft):
    months = [str(m) for m in ft.index]
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4), gridspec_kw={"width_ratios": [1.5, 1]})
    colors = [GOOD if a >= t else BAD for a, t in zip(ft["actual_sales"], ft["Target"])]
    ax1.bar(months, ft["actual_sales"], color=colors, alpha=0.85, label="Actual sales")
    ax1.plot(months, ft["Target"], color="black", marker="o", ms=4, label="Target")
    ax1.set_title("Furniture: target vs actual (green = target met)", loc="left")
    ax1.tick_params(axis="x", rotation=45)
    ax1.legend(frameon=False)
    ax2.plot(months[1:], ft["target_mom_pct"].iloc[1:], marker="o", color=ACCENT)
    ax2.set_title("Furniture target, month-over-month %", loc="left")
    ax2.set_ylim(0, 2.5)
    ax2.tick_params(axis="x", rotation=45)
    _save(fig, "fig3_furniture_target_vs_actual.png")


def top_states_chart(top):
    fig, axes = plt.subplots(1, 3, figsize=(11, 3.6))
    names = [s.replace("Madhya Pradesh", "M.P.") for s in top.index]
    axes[0].bar(names, top["orders"], color=ACCENT)
    axes[0].set_title("Order count", loc="left")
    axes[1].bar(names, top["total_sales"] / 1000, color=ACCENT)
    axes[1].set_title("Total sales (Rs. '000)", loc="left")
    cols = [BAD if v < 0 else GOOD for v in top["avg_profit_per_order"]]
    axes[2].bar(names, top["avg_profit_per_order"], color=cols)
    axes[2].axhline(0, color="black", lw=0.8)
    axes[2].set_title("Avg profit per order (Rs.)", loc="left")
    for ax in axes:
        ax.tick_params(axis="x", rotation=30)
    _save(fig, "fig4_top5_states.png")


def city_profit_chart(city):
    c = city.reset_index().sort_values("total_profit")
    colors = [BAD if v < 0 else GOOD for v in c["total_profit"]]
    fig, ax = plt.subplots(figsize=(7, 6))
    ax.barh(c["label"], c["total_profit"], color=colors)
    ax.axvline(0, color="black", lw=0.8)
    ax.set_xlabel("Total profit (Rs.)")
    ax.set_title("Total profit by city", loc="left")
    _save(fig, "fig5_city_profit.png")
