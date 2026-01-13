# Conditional Orders Architecture & Implementation Guide
## System Design for Stock Broker Integration with TradingView

---

## System Architecture Overview

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    TradingView Frontend                          │
│  (Order Entry, Order Management, Position Management Screens)   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ HTTP/REST API Calls
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    TradingView REST API Layer                    │
├─────────────────────────────────────────────────────────────────┤
│ • /placeOrder          (POST)  - Place order with brackets      │
│ • /modifyOrder         (POST)  - Modify order/brackets          │
│ • /cancelOrder         (POST)  - Cancel order & linked brackets │
│ • /previewOrder        (POST)  - Validate before placing        │
│ • /orders              (GET)   - List orders with bracket info  │
│ • /modifyPosition      (POST)  - Modify position brackets       │
│ • /positions           (GET)   - List positions with brackets   │
│ • /stream/orders       (WS)    - Real-time order updates        │
│ • /accounts            (GET)   - Account config & features      │
│ • /config              (GET)   - Bracket configuration          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ Authenticated Requests
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                  Broker Backend Services                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────┐         ┌─────────────────────┐        │
│  │  Order Management  │         │ Bracket Processing  │        │
│  │  Service           │────────▶│ Service [NEW]       │        │
│  │                    │         │                     │        │
│  │ • Validation       │         │ • Create brackets   │        │
│  │ • Persistence      │         │ • Link parent-child │        │
│  │ • Execution        │         │ • Activate/Cancel   │        │
│  │ • Status tracking  │         │ • Fill management   │        │
│  └────────────────────┘         └─────────────────────┘        │
│           │                              │                     │
│           └──────────────┬───────────────┘                     │
│                          │                                     │
│           ┌──────────────▼──────────────┐                     │
│           │  Order Execution Engine     │                     │
│           │  [Enhanced for Brackets]    │                     │
│           │                             │                     │
│           │ • Match market prices       │                     │
│           │ • Trigger brackets          │                     │
│           │ • Cancel opposites          │                     │
│           │ • Generate fills            │                     │
│           └──────────────┬──────────────┘                     │
│                          │                                     │
│           ┌──────────────▼──────────────────┐                │
│           │  Database Layer                 │                │
│           │                                 │                │
│           │ Orders Table [Enhanced]         │                │
│           │ ├─ Core order fields           │                │
│           │ ├─ Bracket fields (SL,TP,TS)  │                │
│           │ ├─ Parent-child relationships  │                │
│           │ └─ Indexes for performance     │                │
│           │                                 │                │
│           │ Bracket Orders Table [NEW]      │                │
│           │ ├─ Parent order reference       │                │
│           │ ├─ Child order references       │                │
│           │ └─ Status tracking              │                │
│           └─────────────────────────────────┘                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Request/Response Flow Diagram

### Scenario: Place Buy Order with Bracket Orders

```
┌─────────────────────────────────────────────────────────────────┐
│ Client: Place BUY order with SL and TP brackets                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ POST /accounts/{id}/placeOrder
                       │ {instrument: "AAPL", qty: 100, type: "limit",
                       │  limitPrice: 150.25, stopLoss: 148.50,
                       │  takeProfit: 155.00}
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ Broker: Validate Request                                         │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Account supports brackets (supportBrackets=true)              │
│ ✓ Instrument found (AAPL)                                       │
│ ✓ Quantity valid (100 shares)                                   │
│ ✓ Price hierarchy: 148.50 < 150.25 < 155.00 ✓                 │
│ ✓ Account has sufficient buying power                           │
│ ✓ All prices align with minTick (0.01)                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ Create Orders Atomically
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ Database: Insert Three Orders                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Order 1 (Parent):                                               │
│ ├─ ID: ORD-001                                                 │
│ ├─ Type: BUY 100 AAPL @ limit $150.25                         │
│ ├─ Status: "working"                                           │
│ ├─ stopLoss: 148.50                                            │
│ ├─ takeProfit: 155.00                                          │
│ ├─ parentId: null                                              │
│ └─ Created: 2024-01-12 09:30:00                               │
│                                                                  │
│ Order 2 (Child - Take Profit):                                 │
│ ├─ ID: ORD-002                                                 │
│ ├─ Type: SELL 100 AAPL @ limit $155.00                        │
│ ├─ Status: "inactive"                                          │
│ ├─ parentId: ORD-001                                           │
│ ├─ parentType: "order"                                         │
│ └─ Created: 2024-01-12 09:30:00                               │
│                                                                  │
│ Order 3 (Child - Stop Loss):                                   │
│ ├─ ID: ORD-003                                                 │
│ ├─ Type: SELL 100 AAPL @ stop $148.50                         │
│ ├─ Status: "inactive"                                          │
│ ├─ parentId: ORD-001                                           │
│ ├─ parentType: "order"                                         │
│ └─ Created: 2024-01-12 09:30:00                               │
│                                                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ Return Success Response
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ Response (HTTP 200 OK)                                           │
├─────────────────────────────────────────────────────────────────┤
│ {                                                                │
│   "s": "ok",                                                    │
│   "d": {                                                        │
│     "orderId": "ORD-001",                                       │
│     "transactionId": "TXN-20240112-001"                        │
│   }                                                             │
│ }                                                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ Return to Client
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ Client: Display confirmation                                    │
│ - Parent order (ORD-001) shown as "WORKING"                    │
│ - Child orders shown as "INACTIVE - waiting for fill"          │
│ - Display bracket levels on chart                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Order Lifecycle State Machine

### Complete Bracket Order Lifecycle

```
                          PARENT ORDER FILLS
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
    MARKET FILL             LIMIT/STOP FILL          CANCELED/EXPIRED
          │                       │                       │
          ▼                       ▼                       ▼
    ┌─────────────┐         ┌─────────────┐         ┌──────────────┐
    │   Parent    │         │   Parent    │         │   Parent     │
    │   Status    │         │   Status    │         │   Status     │
    │   FILLED    │         │   FILLED    │         │   CANCELED   │
    └──────┬──────┘         └──────┬──────┘         └──────┬───────┘
           │                      │                       │
           │ Activate Children    │ Activate Children     │
           │                      │                       │
    ┌──────▼──────┐         ┌─────▼──────┐         ┌──────▼───────┐
    │   Child 1   │         │   Child 1  │         │   Child 1    │
    │   (Take     │         │   (Take    │         │   (Take      │
    │   Profit)   │         │   Profit)  │         │   Profit)    │
    │   Status    │         │   Status   │         │   Status     │
    │   WORKING   │         │   WORKING  │         │   CANCELED   │
    └──────┬──────┘         └──────┬─────┘         └──────────────┘
           │                      │
           │ Watching Price       │ Watching Price
           │                      │
    ┌──────▼──────┐         ┌─────▼──────┐
    │   Child 2   │         │   Child 2  │
    │   (Stop     │         │   (Stop    │
    │   Loss)     │         │   Loss)    │
    │   Status    │         │   Status   │
    │   WORKING   │         │   WORKING  │
    └──────┬──────┘         └──────┬─────┘
           │                      │
           │ Price Rise           │ Price Rise
           │ to $155              │ to $155
           │                      │
    ┌──────▼──────┐         ┌─────▼──────┐
    │   Child 1   │         │   Child 1  │
    │   FILLED    │         │   FILLED   │
    │   @ $155.02 │         │   @ $155   │
    └──────┬──────┘         └──────┬─────┘
           │                      │
           │ Cancel Sibling       │ Cancel Sibling
           │ (SL)                 │ (SL)
           │                      │
    ┌──────▼──────────────┐      └─────▼──────┐
    │   Child 2 Status    │            │      │
    │   CANCELED (auto)   │            │      │
    │   Position CLOSED   │            │      │
    └─────────────────────┘            │      │
                                       │      │
                                    FINAL STATE
                                       │      │
                                       ▼      ▼
                                 All orders COMPLETED
                                 Position CLOSED
                                 P&L locked = +$477.48
```

---

## Bracket Order Processing Algorithm

### Core Logic Flow

```
function PlaceBracketOrder(request):
  
  STEP 1: Validate Request
  ├─ Check required fields exist
  ├─ Validate data types
  ├─ Normalize prices/quantities
  └─ If invalid → return ERROR
  
  STEP 2: Check Account Capabilities
  ├─ Load account from database
  ├─ Check supportBrackets flag
  ├─ Check supportOrderBrackets flag
  └─ If not supported → return ERROR
  
  STEP 3: Validate Instrument
  ├─ Load instrument specs
  ├─ Verify symbol exists
  ├─ Check if tradeable
  ├─ Load validation rules (minTick, minQty, etc.)
  └─ If invalid → return ERROR
  
  STEP 4: Validate Order Parameters
  ├─ Check order type is supported
  ├─ Validate quantity (minQty, maxQty, qtyStep)
  ├─ Validate prices (align with minTick)
  ├─ Ensure prices are realistic
  └─ If invalid → return ERROR
  
  STEP 5: Validate Bracket Prices
  ├─ IF side = "buy":
  │  ├─ Check: stopLoss < entryPrice
  │  ├─ Check: takeProfit > entryPrice
  │  └─ Check: stopLoss < takeProfit
  │
  ├─ IF side = "sell":
  │  ├─ Check: stopLoss > entryPrice
  │  ├─ Check: takeProfit < entryPrice
  │  └─ Check: stopLoss > takeProfit
  │
  └─ If invalid → return ERROR
  
  STEP 6: Calculate Required Margin
  ├─ parentOrder margin = qty × currentBid (approx)
  ├─ If limited margin available → account for slippage
  │
  └─ IF brackets present:
     ├─ slOrder margin ≈ qty × stopLoss
     ├─ tpOrder margin ≈ qty × takeProfit (often less)
     ├─ Total required = parentOrder + max(slOrder, tpOrder)
     └─ Check available margin >= required margin
  
  STEP 7: Pre-Flight Checks
  ├─ Market open? (if required)
  ├─ Instrument halted? (No)
  ├─ Risk controls passed?
  ├─ Rate limits OK?
  └─ If any fail → return ERROR
  
  STEP 8: Create Orders Atomically
  ├─ START TRANSACTION
  │
  ├─ Create parentOrder:
  │  ├─ Generate unique ID
  │  ├─ Set status = "working" (if market-hours) or "pending"
  │  ├─ Store all order details
  │  └─ Save to database
  │
  ├─ Create takeProfit order (if specified):
  │  ├─ Generate unique ID
  │  ├─ Set status = "inactive"
  │  ├─ Set parentId = parentOrder.id
  │  ├─ Set parentType = "order"
  │  ├─ Set side = opposite(parentOrder.side)
  │  ├─ Set type = "limit"
  │  ├─ Set limitPrice = takeProfit value
  │  └─ Save to database
  │
  ├─ Create stopLoss order (if specified):
  │  ├─ Generate unique ID
  │  ├─ Set status = "inactive"
  │  ├─ Set parentId = parentOrder.id
  │  ├─ Set parentType = "order"
  │  ├─ Set side = opposite(parentOrder.side)
  │  ├─ Set type = "stop"
  │  ├─ Set stopPrice = stopLoss value
  │  └─ Save to database
  │
  ├─ Create BracketOrders record:
  │  ├─ parent_order_id = parentOrder.id
  │  ├─ stop_loss_order_id = slOrder.id (if exists)
  │  ├─ take_profit_order_id = tpOrder.id (if exists)
  │  ├─ status = "active"
  │  └─ Save to database
  │
  ├─ Reserve margin:
  │  ├─ Deduct required margin from account
  │  └─ Log margin reservation
  │
  ├─ END TRANSACTION
  │
  └─ If any step fails → ROLLBACK all changes
  
  STEP 9: Send to Execution Engine
  ├─ Queue parentOrder for matching
  ├─ Add bracket info to context
  └─ Notify risk management system
  
  STEP 10: Return Success Response
  ├─ Generate response with:
  │  ├─ orderId (parentOrder ID)
  │  ├─ transactionId (for audit)
  │  └─ status = "ok"
  │
  └─ Send HTTP 200 response to client

END FUNCTION
```

---

## Market Price Monitoring & Execution

### Bracket Activation & Execution Logic

```
CONTINUOUS PROCESS: Monitor Market Prices

FOR EACH bracket order in ACTIVE_BRACKETS:
  
  LOAD parentOrder status
  
  IF parentOrder.status != "FILLED":
    CONTINUE (skip until parent fills)
  
  IF bracketOrder.status != "WORKING":
    CONTINUE (only process working brackets)
  
  CURRENT_PRICE = getCurrentMarketPrice(instrument)
  
  ──────────────────────────────────────────────────────
  SCENARIO 1: Take Profit Order (SELL @ limit)
  ──────────────────────────────────────────────────────
  
  IF order.type = "limit" AND order.side = "sell":
    
    IF parentOrder.side = "buy":
      // Buy order → TP sell limit
      IF CURRENT_PRICE >= order.limitPrice:
        EXECUTE order
        │
        ├─ Set order.status = "FILLED"
        ├─ Generate fill record
        ├─ Update position
        │
        └─ CANCEL sibling bracket
           ├─ Set stopLoss.status = "CANCELED"
           ├─ Log cancellation reason
           └─ Release reserved margin
  
  ──────────────────────────────────────────────────────
  SCENARIO 2: Stop Loss Order (SELL @ stop)
  ──────────────────────────────────────────────────────
  
  IF order.type = "stop" AND order.side = "sell":
    
    IF parentOrder.side = "buy":
      // Buy order → SL sell stop
      IF CURRENT_PRICE <= order.stopPrice:
        EXECUTE order (convert to market)
        │
        ├─ Set order.status = "FILLED"
        ├─ Fill @ current market price or better
        ├─ Update position (with loss)
        │
        └─ CANCEL sibling bracket
           ├─ Set takeProfit.status = "CANCELED"
           └─ Release reserved margin
  
  ──────────────────────────────────────────────────────
  SCENARIO 3: Trailing Stop Update
  ──────────────────────────────────────────────────────
  
  IF order.trailingStopPips > 0:
    
    IF NOT TRACKED:
      highWaterMark = parentOrder.fillPrice
    
    IF CURRENT_PRICE > highWaterMark:
      highWaterMark = CURRENT_PRICE  // Update high water mark
    
    newStopPrice = highWaterMark - (trailingStopPips × minTick)
    
    IF newStopPrice > order.stopPrice:
      order.stopPrice = newStopPrice
      UPDATE database

END FOR

CONTINUATION: Process next check (e.g., every 100ms)
```

---

## Key Implementation Considerations

### 1. Atomicity & Consistency

**Problem:** Must create parent and child orders together, or not at all.

```sql
START TRANSACTION;

INSERT INTO orders (parent_order) VALUES (...);
INSERT INTO orders (child_tp_order) VALUES (...);
INSERT INTO orders (child_sl_order) VALUES (...);
INSERT INTO bracket_orders (linking_record) VALUES (...);

-- If ANY INSERT fails, entire transaction rolls back
COMMIT;
```

### 2. Race Conditions

**Problem:** Parent order could fill while we're still creating child orders.

```
Solution:
├─ Lock parent order row during creation
├─ Set status = "pending" initially
├─ Create children
├─ Then change status to "working"
└─ Release lock
```

### 3. Partial Fills

**Problem:** Parent order partially fills (100 of 500 requested).

```
Solution:
├─ Create children for full qty initially
├─ When partial fill occurs:
│  ├─ Adjust remaining qty on children
│  └─ Keep parent-child link intact
└─ When final fill occurs:
   ├─ Activate all children
   └─ Manage risks as necessary
```

### 4. Margin Blocking

**Problem:** Must reserve margin for all three orders, not just parent.

```
Calculation:
├─ Parent: 100 shares × $150 = $15,000
├─ SL: 100 shares × $148.50 = $14,850
├─ TP: 100 shares × $155 = $15,500
└─ Reserve: max($15,000, $14,850, $15,500) + buffer
```

### 5. Order Cancellation Cascading

**Problem:** When canceling parent, must cancel all children.

```
Solution:
├─ When user cancels parentOrder:
│  ├─ Set parent.status = "CANCELED"
│  ├─ Find all children (parentId = parent.id)
│  ├─ Set each child.status = "CANCELED"
│  ├─ Release reserved margin
│  └─ Send notifications
└─ Use database triggers or app logic
```

---

## Testing Strategy

### Unit Tests (Required)

```
test_bracket_price_validation()
├─ BUY: SL < Entry < TP ✓
├─ SELL: SL > Entry > TP ✓
├─ Reject invalid hierarchies ✓
└─ Reject misaligned prices ✓

test_margin_calculation()
├─ Single order margin ✓
├─ Bracket orders margin (conservative) ✓
├─ Insufficient margin rejection ✓
└─ Margin release on cancellation ✓

test_order_creation()
├─ Parent order created ✓
├─ TP child created with parentId ✓
├─ SL child created with parentId ✓
├─ All orders have correct status ✓
└─ Bracket record created ✓
```

### Integration Tests (Required)

```
test_bracket_order_full_lifecycle()
├─ Place bracket order ✓
├─ Parent order fills ✓
├─ Children become WORKING ✓
├─ TP fills (simulated price rise) ✓
├─ SL auto-cancels ✓
└─ Position closes ✓

test_stop_loss_execution()
├─ Parent fills at $150.25 ✓
├─ Price drops to $148.50 ✓
├─ SL triggers ✓
├─ TP auto-cancels ✓
└─ Loss = -$175 ✓

test_partial_fill_brackets()
├─ Place 500 share bracket ✓
├─ Parent fills 100 shares ✓
├─ Children created for 500 ✓
├─ Adjust children qty to 100 ✓
└─ Monitor correctly ✓

test_order_modification()
├─ Place bracket order ✓
├─ Modify SL price higher ✓
├─ Modify TP price lower ✓
├─ Modify qty (if not filled) ✓
└─ Changes reflected in DB ✓
```

### Load Tests (Important)

```
test_streaming_performance()
├─ 10,000 concurrent bracket orders ✓
├─ Price updates 100/sec ✓
├─ Bracket fills processing <50ms ✓
├─ Database transactions complete ✓
└─ Clients notified <100ms ✓
```

---

## Deployment Checklist

### Pre-Production
- [ ] Database schema migrations tested
- [ ] API endpoints implemented and tested
- [ ] Bracket validation logic verified
- [ ] Margin calculation verified
- [ ] Order execution logic tested
- [ ] Cancellation cascading tested
- [ ] Error handling for all edge cases
- [ ] Streaming updates functional

### Staging
- [ ] Full end-to-end testing
- [ ] Load testing with realistic volumes
- [ ] Failure scenario testing
- [ ] API documentation updated
- [ ] TradingView integration tested
- [ ] Security audit completed
- [ ] Performance profiling done

### Production
- [ ] Feature flag / gradual rollout
- [ ] Monitor error rates closely
- [ ] Check database performance
- [ ] Verify streaming reliability
- [ ] Monitor user feedback
- [ ] Have rollback plan ready
- [ ] Document any issues/workarounds

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Bracket Order Success Rate | >99.5% | Orders placed / accepted |
| Fill Response Time | <100ms | From user click to confirmation |
| Price Accuracy | 100% | Correct execution vs target |
| Bracket Cascade Time | <500ms | Parent fill → child activation |
| Database Consistency | 100% | Parent-child link verification |
| Streaming Latency | <100ms | Client update arrival |
| Margin Accuracy | 100% | Reserved vs actual |
| Error Recovery | 100% | No stuck orders |

---

**This architecture guide provides the complete blueprint for implementing conditional orders in your broker system.**