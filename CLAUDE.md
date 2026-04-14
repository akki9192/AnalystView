# LLM Wiki — App Suite Use Case Matrix

A use case knowledge base maintained by Claude Code.
Based on Andrej Karpathy's LLM Wiki pattern.

## Purpose

This wiki consolidates use case matrices from a multi-tab Excel workbook covering the
app suite. Each tab represents one app or feature area. Claude maintains the wiki.
The human uploads sheets, asks questions, and guides the analysis.

The goal is to make it easy to query use case coverage across apps and platforms
without manually searching spreadsheets — e.g. "which platforms support Municipal
secondary market sell orders?", "what are the Android gaps?", or "show me all use
cases with no Jira ticket mapped."

---

## Folder structure

```
raw/                        -- source Excel screenshots (immutable -- never modify)
wiki/                       -- markdown pages maintained by Claude
wiki/index.md               -- table of contents for the entire wiki
wiki/log.md                 -- append-only record of all ingests and queries
wiki/platform-coverage.md   -- cross-app platform gap analysis (append on each ingest)
wiki/apps/                  -- one page per tab/app
wiki/groups/                -- one page per Group Type value
```

---

## Full tab inventory

The workbook contains the following tabs, confirmed from screenshots:

| Tab name | Description |
|----------|-------------|
| Template | Boilerplate — skip, do not ingest |
| EqOp | Equity and Options order entry use cases |
| Mutual Fund | Mutual fund order entry use cases |
| MLO | Multi-Leg Options order entry use cases |
| Conditional Replace | Cancel & replace for conditional orders |
| Conditional New Order | New conditional order types (CT, MCT, OTO, OCO, OTOCO) |
| Multi Order | Multi-order and SLO use cases |
| Fixed Income Order Entry | Fixed income buy/sell order entry |
| Fixed Income Bid Quote | Fixed income bid quote order entry |
| Commission Calculator | Commission calculator scenarios |
| Trading View | Trading View integration use cases |
| Cancel | Cancel use cases for equity and conditional orders |
| Available Markets | Available market call use cases |
| Stock Locate | Stock locate find API use cases |
| Lock – Pre Trade Locate | Stock locate lock use cases |
| Locate Activity | Stock locate activity status use cases |

---

## Column schemas by tab

Each tab has a different column layout. Always read headers on ingest — do not assume.
Column A is always Group Type (merged cells — carry forward). Column B is always the
use case description. Everything after that varies as documented below.

### EqOp
| Col | Header |
|-----|--------|
| A | Group Type |
| B | EqOp use cases |
| C | Supported at BPDC capability (checkbox — ✓ = supported) |
| D | Regression Tests |
| E | X-ray Jira N (Jira ticket number for X-ray test) |
| F | Equity Trade Ticket (AP122489) |
| G | Trader Dashboard (AP145890) |
| H | Trading View (AP162643) Review |
| I | AIDE (AP122...) |

Note: columns F–I contain Jira ticket numbers (e.g. PITAFT-12301) rather than Y/N.
Presence of a Jira number = test exists and is mapped. Blank = not mapped. Y/N also
appears in some cells alongside or instead of ticket numbers — capture both.

### Mutual Fund
| Col | Header |
|-----|--------|
| A | Group Type |
| B | Mutual Fund Use Cases |
| C | LWC Support |
| D | Jira Number |
| E | AIDE |
| F | X-ray test |
| G | Equity Trade Ticket |
| H+ | Additional platform columns (verify on ingest) |

Note: red text rows = use cases flagged as not supported or problematic. Capture
with `status: flagged`. Jira links appear as full URLs in col F/G — record them.

### MLO
| Col | Header |
|-----|--------|
| A | Group Type |
| B | MLO Use Cases |
| C | Options Trade ticket |
| D | Trader Dashboard (AP145890) |
| E | ATP |
| F | Trader+ Desktop |
| G | Android |
| H | iOS |

Note: some cells contain extended narrative values like "N, MLO replace cannot change
Order type". Capture the full narrative text — do not reduce to Y/N.
Section header rows (e.g. "Cancel & Replace" highlighted in purple/pink) are Group
Type boundaries, not use cases — treat as start of new Group Type.

### Conditional Replace
| Col | Header |
|-----|--------|
| A | Group Type |
| B | Use case label (e.g. "OTO replace") |
| C | Order type qualifier (e.g. "option/option OTO replace") |
| D | LWC (Y/N) |
| E–J | Platform columns (verify on ingest) |

Note: unique three-column use case structure. Column B is the primary use case label;
column C is an order-type qualifier. Capture both together as "B — C"
(e.g. "OTO replace — option/option OTO replace").

### Conditional New Order
| Col | Header |
|-----|--------|
| A | Test type (Group Type equivalent) |
| B | Conditional order use cases |
| C | Supported in LWC |
| D | X-ray test created |
| E | Jira number – Options |
| F | Jira number – Equity |
| G | ETT – WO |
| H | Trader Dashboard – W5 |
| I | ATP – L |
| J | ATN – LC/LD |
| K+ | Additional columns (verify on ingest) |

Note: column A header is "Test type" not "Group Type" — treat identically.
Two Jira columns: one for Options tickets, one for Equity tickets — capture both.
N/A appears here meaning "not applicable for this ticket type" — distinct from NA.

### Multi Order
| Col | Header |
|-----|--------|
| A | Group Type |
| B | Use case description |
| C | LWC (checkbox or Y/N) |
| D+ | Platform columns (verify on ingest) |

### Fixed Income Order Entry
| Col | Header |
|-----|--------|
| A | Group Type |
| B | Fixed Income Order Entry Use Cases |
| C | Supported in LWC |
| D | X-ray Test Created |
| E | Android PI Mobile App |
| F | iPhone PI Mobile App |
| G | Fid.com |
| H+ | Additional columns (verify on ingest) |

### Fixed Income Bid Quote
| Col | Header |
|-----|--------|
| A | Group Type (includes "Summary" and "Request Bid" sub-sections) |
| B | Fixed Income Bid Quote Order Entry Use Cases |
| C–D | Blank / not used |
| E | Fid.com |
| F | Notes — ignore this column |

Note: only Fid.com is tracked. "Y – new requirement" appears in this tab — flag.
Group Type here includes section labels like "Summary" and "Request Bid" — treat
these as Group Types in the wiki.

### Commission Calculator
| Col | Header |
|-----|--------|
| A | Group Type (primary) |
| B | Sub-group |
| C | Commission Calculator Scenarios (use case) |
| D | Supported in LWC |
| F | Available in modernized backend |
| G | X-ray Test |
| H | AIDE |
| I | ETT |
| J | Trader Dashboard |
| K | MFT |
| L | OTT |
| M | Mobile – iOS |
| N | Mobile Android |
| O+ | Additional columns (verify on ingest) |

Note: two-level grouping — col A is primary Group Type, col B is sub-group. Use case
is in col C. This tab has the most platform columns of all tabs.

### Trading View
| Col | Header |
|-----|--------|
| A | Group Type |
| B | Sub-group / Test Type |
| C | Use case description |
| D | LWC (Y/N) |
| E–F | Platform columns (verify on ingest) |
| G | Notes — ignore this column |

Note: three-column structure — A=Group Type, B=sub-group, C=use case description.
Long narrative notes appear in some cells — capture in full where they are in
platform columns, ignore if in Notes column.

### Cancel
| Col | Header |
|-----|--------|
| A | Group Type |
| B | Test Type (sub-group, e.g. "Equity Cancel", "Conditional Order Cancel") |
| C | Cancel Use Cases (use case description) |
| D | Supported in LWC |
| E | Regression Tests |
| F | X-Ray Jira No. |
| G | Equity Trade Ticket (AP122...) |

Note: three-column structure — A=Group Type, B=Test Type (sub-group), C=use case.

### Available Markets
| Col | Header |
|-----|--------|
| A | Group Type |
| B | Available Market Use Cases |
| C | XRAY Added |
| D | LWC Support |
| E | Web – OTT |
| F | ATP |
| G | ATN |
| H | Mobile iOS |
| I | Mobile Android |

Note: red text rows = flagged, add `status: flagged`.
"Pending LWC analysis" is a distinct status — not Y/N/NA/blank — flag as
`status: pending-analysis`.
Cells with qualifiers like "Y (specific to pre market)" — capture the full value.

### Stock Locate
| Col | Header |
|-----|--------|
| A | Group Type |
| B | Stock Locate Use Cases |
| C | LWC Support |
| D | Equity Trade Ticket |
| E | ATP |
| F | ATN |

Note: row 2 of col B contains sub-header "Stock Locate Find API" — section label,
not a use case. Yellow-highlighted rows need attention — flag as `status: flagged`.
Partial support qualifiers like "Traded TQQQ, OPEN, but not ARKK" — capture in full.

### Lock – Pre Trade Locate
| Col | Header |
|-----|--------|
| A | Group Type |
| B | Stock Locate Lock Use Cases |
| C | LWC Support |
| D | ATN Pro |
| E | Notes — ignore this column |
| F | Jira Number |

Note: rows with a `?` in col B are open questions, not confirmed use cases —
flag with `status: open-question`.
"NOT SUPPORTED" in use case description — capture in full as part of description.

### Locate Activity
| Col | Header |
|-----|--------|
| A | Group Type |
| B | Stock Locate Activity Status Use Cases |
| C | LWC Support |
| D | ATN Pro |
| E | Notes — ignore this column |

---

## Cell value definitions

These are authoritative. Apply consistently across all tabs.

| Value | Meaning |
|-------|---------|
| `Y` | Supported / test exists |
| `N` | Not supported — platform gap |
| `NA` | Not applicable by product design — not a gap |
| `N/A` | Not applicable for this ticket type (Conditional New Order only) |
| blank | Not yet assessed — flag as `not-assessed`, never treat as N |
| `✓` checkbox | Supported (EqOp tab) — treat as Y |
| `Y – new requirement` | Supported, newly added — flag as `new-requirement` |
| `new feature from backend` | Backend-driven, frontend not assessed — flag as `tbd` |
| `Pending LWC analysis` | Under analysis — flag as `pending-analysis` |
| `PITAFT-XXXXX` | Jira ticket mapped for that platform — record the ticket number |
| Narrative text | Capture in full — e.g. "N, MLO replace cannot change Order type" |
| Text ending `?` | Open question — flag as `open-question` |
| `NOT SUPPORTED` in description | Part of use case text — capture in full |
| Red text row | Flagged as problematic — add `status: flagged` |
| `Y (specific to pre market)` | Partial support with qualifier — capture in full |
| `Traded TQQQ, OPEN, but not ARKK` | Partial support with exceptions — capture in full |

**Critical distinctions:**
- `NA` ≠ `N` — NA is by design, N is a gap. Never conflate.
- `NA` ≠ `N/A` — NA is product design, N/A is ticket-type scoping.
- blank ≠ `N` — blank means unknown. Never assume it is a gap.

**Jira ticket numbers:**
A Jira number in a platform column = test is mapped. Blank = not mapped (coverage gap).
Where both a Y/N and a ticket number appear, record both.

---

## Merged cell and section header handling

- **Group Type (col A)**: merged cells — carry last non-blank value forward until
  a new one appears. Never leave a use case without a Group Type.
- **Section header rows**: rows highlighted in colour (purple/pink/yellow) with text
  spanning columns are Group Type boundaries — start a new group, not a use case row.
- **Sub-group columns**: tabs with col B as Test Type / sub-group (Cancel, Trading
  View, Commission Calculator) — treat col A as Group Type, col B as sub-group.
- **Red text rows**: are real use cases — ingest normally, add `status: flagged`.

---

## Ingest workflow

When the user provides a new tab and asks you to ingest it:

1. **Read all column headers first.** Map against schema above. Note differences.
2. **Identify section header rows** — these are Group Type boundaries, not use cases.
3. **Carry forward Group Type** across blank rows in col A.
4. **For 3-column tabs** (Cancel, Trading View, Trading View, Conditional Replace):
   A=Group Type, B=sub-group, C=use case.
5. **Capture full cell values** — never reduce narrative text to Y/N.
6. **Apply status flags**: red text→`flagged`, `?`→`open-question`,
   blank→`not-assessed`, `Y – new requirement`→`new-requirement`,
   `Pending LWC analysis`→`pending-analysis`.
7. **Discuss key findings** with the user before writing wiki pages.
8. **Create or update** `wiki/apps/<tab-slug>.md`.
9. **Create or update** `wiki/groups/<group-slug>.md` for each Group Type.
10. **Append to** `wiki/platform-coverage.md`.
11. **Update** `wiki/index.md`.
12. **Append to** `wiki/log.md` — date, tab, # use cases, key findings.

---

## Page formats

### App page (`wiki/apps/<tab-slug>.md`)

```markdown
---
app: <Tab Name>
platforms: [list of platform columns]
last_ingested: YYYY-MM-DD
total_use_cases: N
---

# <Tab Name>

**Summary**: One or two sentences on what this tab covers.

**Last updated**: YYYY-MM-DD

---

## Platform support at a glance

| Platform | Supported | Total | Notes |
|----------|-----------|-------|-------|

## <Group Type>

### <Sub-group if applicable>

| Use case | LWC | Platform2 | Platform3 | Jira | Status |
|----------|-----|-----------|-----------|------|--------|

_(Repeat per Group Type)_

## Flagged items
_Use cases with status: flagged, open-question, new-requirement, or pending-analysis_

## Related pages
- [[platform-coverage]]
- [[groups/<slug>]]
```

### Group Type page (`wiki/groups/<group-slug>.md`)

```markdown
---
group_type: "<Exact label from sheet>"
apps_with_this_group: []
---

# Group Type: <Name>

**Summary**: What kind of use cases belong here.

## Use cases and coverage

| Use case | App | LWC | Key platforms | Status |
|----------|-----|-----|---------------|--------|

## Key observations

## Related pages
```

### Platform coverage page (`wiki/platform-coverage.md`)

Single file. Append on every ingest. Never rewrite — only add sections.

```markdown
# Platform coverage

_Last updated: YYYY-MM-DD_

## Gaps by platform
_(LWC = Y, platform = N or blank)_

### <Platform name>
- [Tab] Use case description

## New requirements
- [Tab] Use case

## Flagged use cases (red text)
- [Tab] Use case

## Open questions
- [Tab] Use case?

## Not yet assessed (blank cells)
- [Tab] Use case — platform unknown

## Pending analysis
- [Tab] Use case

## NA clarifications
- [Tab] Use case — reason not applicable
```

---

## Question answering

When the user asks a question:

1. Read `wiki/index.md` to find relevant pages.
2. Read those pages and synthesise — do not re-derive from raw screenshots.
3. Cite wiki pages using [[wiki-links]].
4. If not in the wiki, say so clearly — do not guess.
5. If synthesis was non-trivial, offer to save the answer as a new wiki page.

### Sample queries this wiki should answer
- "Does LWC support Municipal secondary market sell orders?"
- "Which platforms support MLO strategies?"
- "What use cases have no Jira ticket mapped?"
- "Show me all new requirements across all tabs."
- "What are the Android and iOS gaps in EqOp?"
- "Which use cases are flagged as red across all apps?"
- "What open questions exist in Lock – Pre Trade Locate?"
- "Which tabs have the most not-assessed blanks?"
- "Compare mobile iOS vs mobile Android support across all tabs."

---

## Lint

When the user asks you to lint the wiki:

- Check for contradictions (same use case marked differently across tabs)
- Find orphan pages (no inbound links)
- Find use cases where LWC = Y but all other platforms are blank (not-assessed)
- Check all Group Types have a corresponding group page
- Flag open-question rows not yet followed up
- Verify all red-text rows have `status: flagged`
- Report as a numbered list with suggested fixes

---

## Rules

- Never modify anything in `raw/`
- Always update `wiki/index.md` and `wiki/log.md` after any change
- Never treat blank as N — always flag as `not-assessed`
- Never conflate NA and N (product design vs platform gap)
- Never conflate NA and N/A (different tabs, different meanings)
- Capture full narrative cell values — never reduce to Y/N
- Keep page names lowercase with hyphens (e.g. `fixed-income-order-entry.md`)
- When col layout differs from schema, update this file and confirm with user
- Ignore the Notes column on all tabs — do not ingest it
- Never ingest the Template tab
- When a use case row is ambiguous, ask the user before writing to wiki
