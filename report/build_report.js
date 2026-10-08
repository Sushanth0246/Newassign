// Builds the Word report from the CSV tables + figures produced by main.py
// Run:  node report/build_report.js
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, PageBreak,
} = require("docx");

const ROOT = path.resolve(__dirname, "..");
const T = (f) => path.join(ROOT, "outputs", "tables", f);
const F = (f) => path.join(ROOT, "outputs", "figures", f);

// ---------- small helpers ----------
function readCsv(file) {
  const lines = fs.readFileSync(file, "utf8").trim().split("\n");
  const head = lines[0].split(",");
  return lines.slice(1).map((l) => {
    const c = l.split(",");
    const o = {};
    head.forEach((h, i) => (o[h] = c[i]));
    return o;
  });
}
// Indian digit grouping: 1,65,267
function inr(n) {
  n = Math.round(Number(n));
  const neg = n < 0;
  let s = String(Math.abs(n));
  if (s.length > 3) {
    const last3 = s.slice(-3);
    let rest = s.slice(0, -3);
    rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    s = rest + "," + last3;
  }
  return (neg ? "-" : "") + "₹" + s;
}
const pct = (x, d = 1) => Number(x).toFixed(d) + "%";
const num = (n) => inr(n).replace("₹", "");

const FONT = "Arial";
const BLUE = "1F4E79";
const GREY = "595959";

// **bold** inline markup
function runs(text, opts = {}) {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((t) =>
    t.startsWith("**")
      ? new TextRun({ text: t.slice(2, -2), bold: true, font: FONT, size: opts.size || 21, color: opts.color })
      : new TextRun({ text: t, font: FONT, size: opts.size || 21, color: opts.color, italics: opts.italics })
  );
}
const P = (text, opts = {}) =>
  new Paragraph({
    children: runs(text, opts),
    spacing: { after: opts.after ?? 120, line: 288 },
    alignment: opts.align,
    keepNext: opts.keepNext,
  });
const H1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, font: FONT, bold: true, size: 30, color: BLUE })],
    spacing: { before: 320, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } },
    keepNext: true,
  });
const H2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, font: FONT, bold: true, size: 24, color: BLUE })],
    spacing: { before: 240, after: 100 },
    keepNext: true,
  });
const H3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, font: FONT, bold: true, size: 21 })],
    spacing: { before: 160, after: 60 },
    keepNext: true,
  });
const bullet = (text) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: runs(text),
    spacing: { after: 70, line: 280 },
  });
const numbered = (text, ref) =>
  new Paragraph({
    numbering: { reference: ref, level: 0 },
    children: runs(text),
    spacing: { after: 90, line: 280 },
  });
const caption = (text) =>
  new Paragraph({
    children: [new TextRun({ text, font: FONT, size: 17, italics: true, color: GREY })],
    spacing: { after: 160 },
    alignment: AlignmentType.CENTER,
  });
function img(file, w, h) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 40 },
    keepNext: true,
    children: [new ImageRun({ type: "png", data: fs.readFileSync(F(file)), transformation: { width: w, height: h },
      altText: { title: file, description: file, name: file } })],
  });
}

const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border };
function table(headers, rows, widths, opts = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const mk = (text, w, head, align, shade) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      borders,
      shading: head
        ? { fill: BLUE, type: ShadingType.CLEAR, color: "auto" }
        : shade ? { fill: shade, type: ShadingType.CLEAR, color: "auto" } : undefined,
      margins: { top: 60, bottom: 60, left: 90, right: 90 },
      children: [new Paragraph({
        alignment: align,
        children: [new TextRun({ text: String(text), font: FONT, size: opts.size || 18, bold: head, color: head ? "FFFFFF" : undefined })],
      })],
    });
  const aligns = opts.aligns || headers.map((_, i) => (i === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT));
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => mk(h, widths[i], true, aligns[i])) }),
      ...rows.map((r, ri) =>
        new TableRow({
          cantSplit: true,
          children: r.map((c, i) => mk(c, widths[i], false, aligns[i], (opts.shadeRows && opts.shadeRows[ri]) || undefined)),
        })),
    ],
  });
}
const spacer = (after = 120) => new Paragraph({ children: [], spacing: { after } });

// ---------- data ----------
const cat = readCsv(T("q1p1_category_summary.csv"));
const sub = readCsv(T("q1p1_subcategory_summary.csv"));
const ft = readCsv(T("q1p2_furniture_targets.csv"));
const qv = readCsv(T("q1p2_furniture_quarterly.csv"));
const top5 = readCsv(T("q1p3_top5_states.csv"));

// ---------- content ----------
const c = [];

// Title block
c.push(new Paragraph({
  spacing: { after: 60 },
  children: [new TextRun({ text: "Growth Intern Assignment: Jar", font: FONT, bold: true, size: 40, color: BLUE })],
}));
c.push(new Paragraph({
  spacing: { after: 40 },
  children: [new TextRun({ text: "Sushanth  |  B.Tech (AI & ML), UVCE Bengaluru, batch of 2027", font: FONT, size: 21, color: GREY })],
}));
c.push(new Paragraph({
  spacing: { after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "BFBFBF", space: 6 } },
  children: [new TextRun({ text: "GitHub: github.com/Sushanth0246", font: FONT, size: 21, color: GREY })],
}));

c.push(H2("How I approached this"));
c.push(P("I did the analysis in Python (pandas for the numbers, matplotlib for the charts). The code sits in a small project folder; the structure is in Appendix B and the full scripts are in Appendix A, so every number below can be reproduced by running one file."));
c.push(P("The datasets came as PDFs, so the first job was getting clean tables out of them. I extracted the tables with pdfplumber and then cross-checked the Order Details table against a second, independent text parse. All 1,500 line items matched on Amount, Profit and Quantity. What I ended up with:"));
c.push(bullet("**500 orders** (B-25601 to B-26100, April 2018 to March 2019), **1,500 line items**, and **36 target rows** (3 categories x 12 months)."));
c.push(bullet("Every line item matched an order on Order ID, and there were no duplicate rows."));
c.push(bullet("Four labels were cut short or scrambled by the PDF export (\"Jammu and Kash\", \"Himachal Prades\", \"Kmairshmir\", \"hSimla\"). I fixed those by hand and nothing else."));
c.push(bullet("Two oddities in the source that I left as they are: 3 orders have State = Madhya Pradesh but City = Delhi, and Chandigarh appears under both Punjab and Haryana (it is a shared capital). I label them clearly wherever they show up."));
c.push(P("The data has no currency, so I have assumed rupees. Two definitions I used throughout: **profit margin** = total profit / total sales, and **average profit per order** = profit divided by the number of distinct orders (for a category, the orders that contained that category)."));

// ---------------- Q1 ----------------
c.push(H1("Question 1: Sales Analysis"));
c.push(H2("Part 1: Sales and profitability by category"));
const catRows = [...cat].sort((a, b) => b.total_sales - a.total_sales).map((r) => [
  r.Category, num(r.total_sales), num(r.total_profit), r.orders, inr(r.avg_profit_per_order), pct(r.profit_margin_pct, 2), pct(r.loss_making_items_pct)]);
catRows.push(["All categories", num(431502), num(23955), "500", inr(23955 / 500), pct(5.55, 2), pct(33.5)]);
c.push(table(
  ["Category", "Total sales (₹)", "Total profit (₹)", "Orders", "Avg profit / order", "Profit margin", "Loss-making items"],
  catRows, [1700, 1450, 1450, 1000, 1400, 1300, 1300],
  { shadeRows: { 3: "F2F2F2" } }));
c.push(spacer(80));
c.push(img("fig1_category_sales_profit.png", 430, 243));
c.push(caption("Figure 1. Sales and profit by category. The label on each green bar is the profit margin."));

c.push(H3("Who is on top, who is behind"));
c.push(P("It depends a little on the metric. **Electronics** sells the most (₹1.65 lakh, 38% of all sales) and earns the most per order (₹51). **Clothing** has the best margin (8.0%), the highest total profit (₹11,163) and shows up in 393 of the 500 orders, so its profit is spread across many small orders instead of resting on a few big ones. If I had to name one top performer it would be Clothing, with Electronics a close second."));
c.push(P("**Furniture** is the clear laggard. It sells almost as much as Clothing (₹1.27 lakh) but keeps only ₹2,298, a 1.8% margin and ₹12 per order."));

c.push(H3("Why the gap: the sub-category view"));
c.push(P("The category totals hide a lot, so I went one level down (Figure 2). The picture is that each category has one or two sub-categories dragging it down while the rest do fine."));
c.push(img("fig2_subcategory_margin.png", 400, 296));
c.push(caption("Figure 2. Profit margin by sub-category. Red = loss-making, grey = under 5%, green = 5% and above."));
c.push(bullet("**Furniture:** Tables are the problem. 17 line items, ₹22,614 of sales and a loss of ₹4,011 (margin -17.7%). Just three table orders account for ₹3,646 of that loss. Take Tables out and Furniture's margin goes from 1.8% to 6.0%. Bookcases (8.6%) are the healthy part of the category."));
c.push(bullet("**Electronics:** Electronic Games lose money overall (-3.2% on ₹39,168 of sales, and half of those items are sold at a loss) and Phones barely make anything (4.8%). Printers (10.2%) and Accessories (16.4%) carry the category. Without Electronic Games the margin would be 9.3%."));
c.push(bullet("**Clothing:** Sarees are the biggest line (₹53,511, 38% of Clothing sales, 210 items) but earn just 0.7%. The rest of Clothing makes 12.6%, with T-shirts (20.3%), Shirts (15.0%) and Handkerchiefs (14.4%) at the top."));
c.push(P("I can only guess at the causes because the dataset has no cost, discount or return columns. My read: Tables and Phones are high-ticket items where discounts and delivery or handling costs eat the margin quickly (the average table line is ₹1,330 against ₹185 for furnishings). Electronic Games and Sarees look like volume lines that are being sold on price. Accessories, T-shirts and Handkerchiefs are cheap to make or buy and don't need a discount to sell. Overall, **33.5% of all line items lose money**, which suggests pricing and discount discipline matter more than getting more volume."));
c.push(P("What I would do with this: review discount rules on Tables, Electronic Games and Sarees first; bundle Accessories with Phones to lift the basket margin; and push T-shirts, Printers and Bookcases in promotions because they earn their keep."));

// Part 2
c.push(H2("Part 2: Furniture targets, month over month"));
const ftRows = ft.map((r) => [
  r.Month, num(r.Target), r.target_mom_pct ? "+" + Number(r.target_mom_pct).toFixed(2) + "%" : "-",
  num(r.actual_sales), r.actual_mom_pct ? (Number(r.actual_mom_pct) > 0 ? "+" : "") + Number(r.actual_mom_pct).toFixed(1) + "%" : "-",
  pct(r.attainment_pct)]);
const shade = {};
ft.forEach((r, i) => { if (r.big_target_move === "True") shade[i] = "FFF2CC"; });
c.push(table(
  ["Month", "Target (₹)", "Target MoM", "Actual sales (₹)", "Actual MoM", "Target met"],
  ftRows, [1300, 1500, 1500, 1800, 1500, 1500], { shadeRows: shade }));
c.push(caption("Yellow rows are the months where the target stepped up by more than 1.5%. Actual sales are Furniture sales by order month, from the merged data."));
c.push(img("fig3_furniture_target_vs_actual.png", 620, 223));
c.push(caption("Figure 3. Left: actual Furniture sales against target. Right: month-over-month change in the target."));

c.push(H3("What the trend shows"));
c.push(bullet("**The target itself barely fluctuates.** It climbs in a near-straight line from ₹10,400 to ₹11,800 (+13.5% over the year). Most months go up about 0.9%. Three months go up almost twice as much: **July (+1.89%), November (+1.80%) and March (+1.72%)**. Each is a ₹200 step instead of ₹100, which looks like a planning rule (every fourth month) and not a response to demand."));
c.push(bullet("**Actual sales are the opposite of smooth.** They ranged from ₹3,483 in July to ₹21,257 in January, and month-to-month moves went from -37% to +174%."));
c.push(bullet("**Only 4 of 12 months hit target** (November, January, February, March). By quarter, attainment was 63%, 66%, 93% and 155%. So the first half of the year missed badly and the last quarter overshot by more than half."));
c.push(bullet("**The full year looks fine, which is the misleading part.** Actual sales were ₹1,27,181 against ₹1,32,900, or 95.7%. The total is close; the timing is what is off. The biggest target step (July) landed in the weakest sales month, where attainment was 32%."));
c.push(P("For context, the other categories were far apart over the full year: Electronics reached 128% of its target and Clothing only 80%, so the targets look mis-set across the board and not just for Furniture."));
c.push(P("One caution: this is a single year of data. I can say the first half was weak and November to March was strong, but whether that is seasonality (Diwali and the wedding season in Nov to Feb, financial year end in March) or a one-off, I can't tell from twelve points."));

c.push(H3("How to align targets with actual trends"));
c.push(numbered("**Phase the annual target by season.** Keep the yearly number but spread it using the monthly pattern, with lower targets for May to July and higher ones for November and January to March. With another year of data the pattern can be confirmed or corrected.", "n1"));
c.push(numbered("**Re-forecast every quarter.** Set the next quarter's target from the last three months of actual sales plus an expected growth rate, instead of locking in a straight ramp in April.", "n1"));
c.push(numbered("**Use a base target and a stretch target.** Base is what the team should reach in a normal month, stretch is tied to campaigns. This avoids the situation where the team is under 60% for six months and stops caring about the number.", "n1"));
c.push(numbered("**Add a margin check to the sales target.** Furniture is close to its sales target but earns a 1.8% margin. If the target is sales only, the easy way to hit it is discounting Tables.", "n1"));
c.push(numbered("**Plan campaigns around the weak months.** If June and July are always slow, that is where a promotion or a bundle should go, not an extra ₹200 on the target.", "n1"));

// Part 3
c.push(H2("Part 3: Regional performance"));
c.push(P("Order count comes from the List of Orders (one row per order). Sales and profit come from the merged line items, rolled up to the order and then to the state."));
const t5 = top5.map((r) => [r.State, r.orders, num(r.total_sales), num(r.total_profit), inr(r.avg_profit_per_order), pct(r.profit_margin_pct)]);
c.push(table(
  ["State", "Orders", "Total sales (₹)", "Total profit (₹)", "Avg profit / order", "Margin"],
  t5, [2200, 1100, 1700, 1700, 1700, 1100]));
c.push(caption("Top 5 states by order count."));
c.push(img("fig4_top5_states.png", 620, 199));
c.push(caption("Figure 4. Top 5 states: orders, total sales and average profit per order."));

c.push(H3("Regional disparities"));
c.push(bullet("**Two states dominate.** Madhya Pradesh and Maharashtra together have 38% of the orders, 46.5% of sales and 49% of profit. The next state, Rajasthan, has 32 orders, about a third of Maharashtra."));
c.push(bullet("**Inside the top 5 the quality varies a lot.** Maharashtra earns ₹69 per order, Madhya Pradesh ₹55, but Gujarat only ₹17 and **Punjab loses ₹24 per order** (₹609 in total). Punjab's problem is Electronics, which lost ₹2,132 there, mostly in Phones (-₹1,480) and Electronic Games (-₹794). That is the same pattern we saw at company level."));
c.push(bullet("**Volume and profit don't line up.** Uttar Pradesh (₹147 per order), Delhi (₹136), Kerala (₹117), West Bengal (₹114) and Haryana (₹95) all have margins of 13 to 18%, but each has only 14 to 22 orders. The biggest states earn far less per order than these."));
c.push(bullet("**Loss-making states:** Tamil Nadu (-₹2,216 on 8 orders), Punjab, Andhra Pradesh (-₹496) and Bihar (-₹321). For Tamil Nadu, two Chennai orders (a Tables order and a Chairs-heavy order) explain most of the loss, so I would not read too much into 8 orders."));
c.push(img("fig5_city_profit.png", 400, 342));
c.push(caption("Figure 5. Total profit by city. Chandigarh and Delhi appear twice because of how the source labels them."));

c.push(H3("Where to focus"));
c.push(P("I split the 26 city/state combinations into three groups. The 3 \"Delhi\" orders filed under Madhya Pradesh are left out, since 3 orders is too thin to judge:"));
c.push(bullet("**Fix before spending more:** Chennai, Chandigarh (Punjab), Ahmedabad, Jaipur, Hyderabad and Patna. They all lose money, and together they lost ₹5,819. Adding customers here would add losses, so product mix and discounts need sorting first, starting with Electronics in Punjab and Tables in Chennai."));
c.push(bullet("**Grow:** Pune (22 orders, ₹206 per order, 13.6% margin), Delhi, Kolkata, Allahabad, Udaipur, Surat, Thiruvananthapuram, Chandigarh (Haryana) and Amritsar. Margins of 12 to 20% on small volumes mean the demand is profitable and under-served. Pune is the easiest first bet because it already has 22 orders. These samples are small (9 to 22 orders each), so I would test with a modest budget before scaling."));
c.push(bullet("**Protect and tune:** Indore (76 orders) and Mumbai (68 orders) are the volume engines, but Mumbai sells ₹61,867 and keeps only ₹1,637 (2.6%). If Mumbai's margin reached the overall average of 5.6%, it would add roughly ₹1,800, more than it earns today. The next step would be finding which sub-categories are pulling it down."));

c.push(H3("Limits of this analysis"));
c.push(P("It covers one year and 500 orders. There are no cost, discount, return or customer fields, so the explanations above are informed guesses, not proven causes. A few big loss-making orders move some of the state and city numbers, which is why I flagged small samples where they matter."));

// ---------------- Q2 ----------------
c.push(H1("Question 2: App Exploration"));
c.push(P("Jar's pitch is that saving should feel as easy as a UPI payment. Here is what I found works well, and where I think it can improve."));
c.push(H2("Five things that work well"));
c.push(numbered("**Almost no barrier to start.** You can begin from ₹10 and sign-up is just a phone number, and Jar says the first purchase takes about 45 seconds. Most savings products make you feel you need a minimum amount first. Here, the excuse of \"I don't have enough to start\" disappears.", "n2"));
c.push(numbered("**Set it once and forget it.** Daily, weekly or monthly savings run through a UPI mandate, so the user decides once and the app does the rest. Habit building depends on removing repeat decisions, and this does that.", "n2"));
c.push(numbered("**Round-offs turn spending into saving.** Each payment is rounded up and the difference goes into gold. The user doesn't feel a deduction, because it is spare change, and it only needs a few spends a day to add up.", "n2"));
c.push(numbered("**Gold is an asset people already trust.** In many Indian households gold is how savings are kept, so users don't need convincing about the asset. The option to turn savings into physical gold coins or jewellery gives the digital balance a real-world end point.", "n2"));
c.push(numbered("**Gentle nudges for returning users.** When someone comes back after a gap, Jar says the app highlights the savings and gold built up, which rewards the habit instead of scolding the lapse. Together with simple screens and little jargon, it keeps the experience light for first-time savers.", "n2"));

c.push(H2("Five things I would improve"));
c.push(numbered("**Show the full price before every purchase.** Show the buy price, the sell price, taxes and the gap between them on the buy screen. The buy-sell spread is a common complaint about digital gold apps (one 2026 review puts it at 2 to 3%). If users find it later on their own, trust drops; if the app shows it first, it looks honest and retention should hold up better than a small conversion dip.", "n3"));
c.push(numbered("**Make getting money out as easy as putting it in.** A clear sell or redeem path, the exact time the money takes to reach the bank, and any charges up front. People only keep saving into a product when they are sure they can exit, and exit is also where a savings app is judged hardest.", "n3"));
c.push(numbered("**Add a plain \"Is my gold safe?\" page.** Where the gold is stored, who the vault partner is, who audits it, what is insured, and what is and isn't regulated. SEBI said in November 2025 that digital gold is outside its regulation, and news coverage has followed. Users should hear the facts from the app, in simple language, before they hear them from a headline.", "n3"));
c.push(numbered("**Add goals, and let the saving amount grow.** Small daily amounts can plateau once the novelty wears off. Let users set a goal (Diwali, a wedding, a phone), show the projected date, and offer an automatic small step-up, for example ₹1 more per day each month, or a prompt on salary day. This lifts the average savings per user without asking for a big decision.", "n3"));
c.push(numbered("**Help users through price dips.** Gold is a single asset and its price falls sometimes. A first-time saver who sees red may stop their daily saving. Short in-app explainers (in regional languages too), a long-term price history, and a message such as \"you are buying more gold per rupee today\" would reduce those drop-offs.", "n3"));

// ---------------- Q3 ----------------
c.push(H1("Question 3: Product Exploration"));
c.push(H2("What Jar can build on"));
c.push(P("Three strengths stand out. First, **automation**: Jar already has a large base of people whose savings run daily without effort, which is a rare kind of habit. Second, **ease of use**: it feels like a UPI app, not an investment app, which matters for first-time savers in smaller cities. Third, **trust built on a familiar asset**, gold. The new products below are chosen to use those three things, not to chase unrelated verticals."));
c.push(P("One thing I kept in mind while choosing them: digital gold sits in a grey regulatory area. SEBI put out a public note in November 2025 saying digital gold is not a SEBI-regulated product, and in March 2026 the Karnataka High Court declined to quash an FIR against Jar Gold under the BUDS Act (the court said its observations were confined to those proceedings, and related hearings were still continuing in July 2026). I don't take a view on that, but it changes what the smartest next step is: **new products should sit on regulated rails** (SEBI, RBI and IRDAI-registered partners). That adds revenue and also gives Jar something concrete to tell users about safety."));

c.push(H2("Six opportunities"));
const oppW = [1900, 3300, 2400, 2000];
c.push(table(
  ["Opportunity", "What it is and why Jar", "How it plugs into the app", "How I would measure it"],
  [
    ["1. Regulated multi-asset saving",
     "Let round-offs and daily savings go into SEBI-regulated options such as gold ETFs or electronic gold receipts, and later index or liquid mutual fund SIPs through a registered distributor. Same habit, regulated product, and a path beyond one asset.",
     "Add an \"Invest in\" choice on the existing round-off and daily setup. Gold stays the default.",
     "Share of savers who add a second asset in 90 days; savings per user"],
    ["2. Goals and festival saving",
     "Gold buying in India is driven by events: Dhanteras, Akshaya Tritiya, weddings, a child's future. Time-bound goals with a target date and auto step-up use demand that already exists.",
     "A goal screen over the current saving engine, with festival templates and a shared \"family jar\".",
     "Goal creation rate; goal completion rate; average monthly contribution"],
    ["3. Gifting and family jars",
     "Send gold to a parent, a child or a friend on a festival or birthday. NRIs can send gold home. The recipient must install the app to claim it, which makes it a growth channel as well as a product.",
     "One-tap gift flow with a message, using the existing wallet and payments.",
     "Gifts sent; recipient activation rate; new users per gifting user"],
    ["4. Micro-insurance",
     "Small accident or health top-up cover at ₹1 to ₹2 a day through an IRDAI-registered insurer. First-time savers in smaller cities have a real protection gap, and daily micro-payments are what Jar already does.",
     "An opt-in add-on charged from the daily savings flow, with plain-language terms.",
     "Attach rate; claim experience; renewal rate"],
    ["5. Earnings-linked saving through partners",
     "Partner with gig platforms, small employers or payment apps so that a fixed share of each payout goes into Jar automatically. The PhonePe tie-up for daily savings shows partner distribution works.",
     "A partner integration that sets up the mandate at onboarding on the partner's side.",
     "Users per partner; cost to acquire a user; 90-day retention"],
    ["6. Small credit against savings (later stage)",
     "A small short-term credit line through an RBI-regulated NBFC or bank partner, based on holdings and saving consistency. Jar sees something lenders rarely do for thin-file users: months of steady saving behaviour.",
     "Pilot with a small group of long-streak users; partner does underwriting and lending, Jar owns the experience.",
     "Take-up; repayment rate; share of credit users still saving"],
  ],
  oppW, { size: 16, aligns: [AlignmentType.LEFT, AlignmentType.LEFT, AlignmentType.LEFT, AlignmentType.LEFT] }));
c.push(spacer(120));

c.push(H2("How I would sequence this"));
c.push(P("**First 6 months: goals, gifting and one regulated option (1, 2, 3).** They sit closest to what users already do, need little new regulation, and two of them also bring in new users. I would start with gold ETFs or electronic gold receipts as the regulated option, since they are still gold and users understand them."));
c.push(P("**6 to 12 months: micro-insurance and partner-led saving (4, 5).** These need partner agreements, but they use the same micro-payment flow."));
c.push(P("**12 to 24 months: a credit pilot (6).** It carries the most risk and needs a track record first, so it should only start once the earlier products have shown that users stay and repay habits are stable."));
c.push(P("For each launch I would roll it out to about 5% of users first and watch activation, 30-day retention, average savings per user, products per user, complaint rate and the cost of acquiring a user, and scale only if those hold. The milestone I would aim at is a change in what Jar is: from a gold-saving app to the app where people keep their small, daily money, with most active users on **two or more products** and a visible share of balances sitting in regulated products."));

c.push(H2("Notes and sources"));
c.push(P("Facts about Jar and its regulatory environment come from public sources, and things may have moved since:", { after: 60 }));
c.push(bullet("SEBI public notice on digital gold, 8 November 2025, as reported by Vinod Kothari Consultants (vinodkothari.com)."));
c.push(bullet("Karnataka High Court order of 4 March 2026, Jar Gold Retail Pvt Ltd v. State of Karnataka, as reported by LiveLaw (livelaw.in) and Verdictum (verdictum.in)."));
c.push(bullet("Jar's description of its product and nudges: CXO Today interview (cxotoday.com); round-off feature description: Decentro (decentro.tech)."));
c.push(bullet("Spread complaint: a March 2026 Medium review of the app. This is one reviewer's view, so I have treated it as a reported complaint, not a measured figure."));

// ---------------- Appendices ----------------
c.push(new Paragraph({ children: [new PageBreak()] }));
c.push(H1("Appendix A: Code"));
c.push(P("All scripts in the project, in the order they run. Run order: python -m src.extract_pdfs, then python main.py."));
const codeFiles = [
  ["main.py", "main.py"],
  ["src/config.py", "src/config.py"],
  ["src/extract_pdfs.py", "src/extract_pdfs.py"],
  ["src/data_prep.py", "src/data_prep.py"],
  ["src/q1_part1_category.py", "src/q1_part1_category.py"],
  ["src/q1_part2_targets.py", "src/q1_part2_targets.py"],
  ["src/q1_part3_regional.py", "src/q1_part3_regional.py"],
  ["src/plots.py", "src/plots.py"],
];
const codeBorder = { style: BorderStyle.SINGLE, size: 2, color: "E0E0E0" };
for (const [label, rel] of codeFiles) {
  c.push(H3(label));
  const lines = fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\s+$/, "").split("\n");
  lines.forEach((ln, i) => {
    c.push(new Paragraph({
      spacing: { after: 0, line: 220 },
      shading: { fill: "F7F7F7", type: ShadingType.CLEAR, color: "auto" },
      keepLines: true,
      children: [new TextRun({ text: ln.length ? ln : " ", font: "Courier New", size: 15 })],
    }));
  });
  c.push(spacer(100));
}

c.push(new Paragraph({ children: [new PageBreak()] }));
c.push(H1("Appendix B: Project structure"));
const tree = [
  "jar-growth-intern-assignment/",
  "├── README.md                      how to run it",
  "├── requirements.txt               pandas, matplotlib, pdfplumber",
  "├── main.py                        runs the whole Q1 analysis",
  "├── data/",
  "│   ├── source_pdfs/               the 3 datasets as received",
  "│   ├── raw/                       CSVs pulled from the PDFs",
  "│   └── processed/                 merged_orders.csv (1,500 rows)",
  "├── src/",
  "│   ├── config.py                  paths and the 4 label fixes",
  "│   ├── extract_pdfs.py            step 0: PDF tables to CSV",
  "│   ├── data_prep.py               load, clean, merge, sanity checks",
  "│   ├── q1_part1_category.py       sales, profit, margin by category",
  "│   ├── q1_part2_targets.py        furniture target MoM and vs actual",
  "│   ├── q1_part3_regional.py       states, cities, priority groups",
  "│   └── plots.py                   all charts",
  "├── outputs/",
  "│   ├── tables/                    every table in this report, as CSV",
  "│   ├── figures/                   the 5 charts",
  "│   └── run_log.txt                full console output of main.py",
  "└── report/",
  "    ├── build_report.js            builds this document",
  "    └── Jar_Growth_Intern_Assignment.docx / .pdf",
];
tree.forEach((ln) => c.push(new Paragraph({
  spacing: { after: 0, line: 250 },
  children: [new TextRun({ text: ln, font: "Courier New", size: 17 })],
})));

// ---------- document ----------
const doc = new Document({
  creator: "Sushanth",
  title: "Growth Intern Assignment - Jar",
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: FONT, color: BLUE }, paragraph: { spacing: { before: 320, after: 140 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: FONT, color: BLUE }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 21, bold: true, font: FONT }, paragraph: { spacing: { before: 160, after: 60 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      ...["n1", "n2", "n3"].map((ref) => ({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] })),
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Growth Intern Assignment, Jar  |  Page ", font: FONT, size: 16, color: GREY }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: GREY }),
        ] })] }),
    },
    children: c,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(ROOT, "report", "Jar_Growth_Intern_Assignment.docx");
  fs.writeFileSync(out, buf);
  console.log("wrote", out);
});
