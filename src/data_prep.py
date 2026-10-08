"""Load, clean and merge the three datasets."""
import pandas as pd

from src.config import RAW_DIR, PROCESSED_DIR, STATE_FIXES, CITY_FIXES


def load_orders():
    df = pd.read_csv(RAW_DIR / "list_of_orders.csv")
    df["State"] = df["State"].str.strip().replace(STATE_FIXES)
    df["City"] = df["City"].str.strip().replace(CITY_FIXES)
    df["Order Date"] = pd.to_datetime(df["Order Date"], format="%d-%m-%Y")
    df["Month"] = df["Order Date"].dt.strftime("%b-%y")
    return df


def load_details():
    df = pd.read_csv(RAW_DIR / "order_details.csv")
    for col in ["Amount", "Profit", "Quantity"]:
        df[col] = pd.to_numeric(df[col])
    return df


def load_targets():
    df = pd.read_csv(RAW_DIR / "sales_target.csv")
    df["Target"] = pd.to_numeric(df["Target"])
    return df.rename(columns={"Month of Order Date": "Month"})


def build_merged(orders, details):
    """Order Details (1500 line items) joined to List of Orders on Order ID."""
    merged = details.merge(orders, on="Order ID", how="left", validate="many_to_one")
    assert merged["State"].notna().all(), "some line items have no matching order"
    return merged


def quality_report(orders, details, merged):
    """Small sanity checks, printed so they end up in the run log."""
    print("--- data checks ---")
    print("orders:", len(orders), "| unique order ids:", orders["Order ID"].nunique())
    print("line items:", len(details), "| duplicate rows:", int(details.duplicated().sum()))
    print("line items with no matching order:", int(merged["State"].isna().sum()))
    print("loss-making line items:", f"{(details['Profit'] < 0).mean():.1%}")
    odd = orders[(orders["City"] == "Delhi") & (orders["State"] != "Delhi")]
    print("orders where City=Delhi but State!=Delhi:", len(odd), "(kept as in source)")


def save_merged(merged):
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    merged.to_csv(PROCESSED_DIR / "merged_orders.csv", index=False)
