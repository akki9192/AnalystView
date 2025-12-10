# Conditional Orders Implementation Report
## TradingView REST API Integration for Stock Trading

**Date:** December 2025  
**Scope:** Stock trading only (excluding options, forex, CFDs, crypto)  
**Baseline:** Broker already implements single-leg stock trading

---

## Executive Summary

Based on TradingView REST API v1.9.3+, **conditional orders are implemented as bracket orders** linked to parent orders through OCO (One-Cancels-Other) and OSO (One-Send-Other) relationships. There is **no dedicated conditional order endpoint**—instead, they use existing order placement and modification endpoints with specific bracket-related parameters.

**Key Finding:** Conditional orders in TradingView are NOT independent entities like OTO (One-Triggers-Order) or OCO (Order Cancels Order) that trigger other orders. They are bracket orders (Stop Loss / Take Profit) that are dependent on parent order execution.

---

## Current Order Architecture

### Existing Endpoints Your Broker Has Implemented
```
POST   /accounts/{accountId}/orders           # Place Order
PUT    /accounts/{accountId}/orders/{orderId} # Modify Order
DELETE /accounts/{accountId}/orders/{orderId} # Cancel Order
GET    /accounts/{accountId}/orders           # Get Orders
POST   /accounts/{accountId}/orders/cancelAll # Cancel All Orders
```

### Supported Order Types (Stocks)
```
"market"    - Immediate execution
"limit"     - Execute at specified price or better
"stop"      - Trigger at specified price
"stoplimit" - Stop + limit combination
```

---

## What "Conditional Orders" Means in TradingView Context

TradingView implements conditional behavior through **bracket orders**, which are:

1. **Stop Loss Bracket** - Protects against losses (sell at lower price if long)
2. **Take Profit Bracket** - Locks in gains (sell at higher price if long)
3. **Trailing Stop** - Dynamic stop that follows price upward
4. **Guaranteed Stop** - Protected stop order (premium feature)

These brackets form conditional relationships:
- **OCO Relationship:** Between the two bracket orders (if one executes, the other cancels)
- **OSO Relationship:** Parent order → Brackets (when parent fills, brackets activate)

---

## Required Implementation Changes

### 1. Account Configuration Flags

**Location:** `/accounts` endpoint response  
**What to change:** Add/modify these boolean flags in the account configuration:

```json
{
  "id": "ACC-001",
  "supportBrackets": true,              // ← Required for bracket support
  "supportOrderBrackets": true,          // ← Required for order brackets
  "supportAddBracketsToExistingOrder": true,  // ← Allow adding brackets post-creation
  "supportMarketBrackets": true,         // ← Brackets on market orders
  "supportPositionBrackets": false,      // ← (Stocks typically don't support)
  "supportModifyBrackets": true,         // ← Allow modifying/removing brackets
  "supportModifyOrderBrackets": true,    // ← Modify brackets on existing orders
  "supportStopLoss": true,               // ← Traditional stop loss
  "supportTrailingStop": false,          // ← Only if you support trailing stops
  "supportGuaranteedStop": false,        // ← Only if you support guaranteed stops
  "supportStopOrders": true,             // ← Already implemented
  "supportStopLimitOrders": true         // ← Already implemented
}
```

**Critical Note:** If you don't set `supportBrackets: true`, the UI won't show bracket options at all.

---

### 2. Place Order Endpoint Enhancement

**Location:** `POST /accounts/{accountId}/orders`  
**Change:** Add bracket fields to request body

#### Current Request (what you have):
```json
{
  "instrument": "AAPL",
  "qty": 100,
  "side": "buy",
  "type": "limit",
  "limitPrice": 150.00,
  "duration": { "type": "gtt", "datetime": 1733817600 }
}
```

#### Enhanced Request (with brackets):
```json
{
  "instrument": "AAPL",
  "qty": 100,
  "side": "buy",
  "type": "limit",
  "limitPrice": 150.00,
  "duration": { "type": "gtt", "datetime": 1733817600 },
  
  "stopLoss": 145.00,      // ← NEW: Stop loss price (opposite side)
  "takeProfit": 155.00,    // ← NEW: Take profit price (opposite side)
  
  // OR for trailing stop (if supported):
  "trailingStopPips": 10,  // ← NEW: Trailing stop in pips
  "isTrailingStop": false  // ← NEW: Flag indicating trailing stop
}
```

**Key Rules:**
- `stopLoss` and `takeProfit` are OPTIONAL, can include 0, 1, or 2
- Bracket prices are in absolute price units (not pips for stocks)
- Brackets have OPPOSITE side: buy parent → sell brackets
- Both brackets have same quantity as parent order
- When parent is limit/stop, send `limitPrice` or `stopPrice` in addition to brackets

---

### 3. Modify Order Endpoint Enhancement

**Location:** `PUT /accounts/{accountId}/orders/{orderId}`  
**Change:** Add bracket modification support

#### Current Request:
```json
{
  "qty": 100,
  "limitPrice": 151.00
}
```

#### Enhanced Request (with bracket changes):
```json
{
  "qty": 100,
  "limitPrice": 151.00,
  
  "stopLoss": 145.50,      // ← Update or add stop loss
  "takeProfit": 155.50,    // ← Update or add take profit
  // To remove a bracket, omit it from the request
}
```

**Behavior:**
- If bracket doesn't exist in current order, add it
- If bracket exists and value changed, update it
- If bracket existed but omitted from request, remove it (return with `cancelled` status in next `/orders` response)

---

### 4. Get Orders Response Enhancement

**Location:** `GET /accounts/{accountId}/orders`  
**Change:** Return bracket orders with parent-child relationships

#### Current Response (parent order only):
```json
{
  "id": "ORD-12345",
  "instrument": "AAPL",
  "qty": 100,
  "side": "buy",
  "type": "limit",
  "limitPrice": 150.00,
  "status": "working"
}
```

#### Enhanced Response (parent + brackets):
```json
{
  "s": "ok",
  "d": [
    {
      "id": "ORD-12345",           // Parent order
      "instrument": "AAPL",
      "qty": 100,
      "side": "buy",
      "type": "limit",
      "limitPrice": 150.00,
      "status": "working",
      "filledQty": 0,
      "avgPrice": 0
    },
    {
      "id": "ORD-12345-SL",        // Stop Loss bracket
      "instrument": "AAPL",
      "qty": 100,                  // ← Same as parent
      "side": "sell",              // ← Opposite of parent
      "type": "stop",
      "stopPrice": 145.00,
      "status": "inactive",        // ← Inactive until parent fills
      "filledQty": 0,
      "avgPrice": 0,
      "parentId": "ORD-12345",     // ← Links to parent
      "parentType": "order"        // ← Type of parent (not position yet)
    },
    {
      "id": "ORD-12345-TP",        // Take Profit bracket
      "instrument": "AAPL",
      "qty": 100,
      "side": "sell",
      "type": "limit",
      "limitPrice": 155.00,
      "status": "inactive",
      "filledQty": 0,
      "avgPrice": 0,
      "parentId": "ORD-12345",
      "parentType": "order"
    }
  ]
}
```

#### Order States & Transitions

**When parent order is placed (not yet filled):**
- Parent: `working` status
- Brackets: `inactive` status
- Both use `parentId`/`parentType: "order"` relationship

**When parent order fills (executes):**
- Parent: transitions to `filled` status
- Brackets: transition to `working` status (now active!)
- You now have a position with open brackets

**When one bracket executes:**
- Executed bracket: `filled` status
- Other bracket: `cancelled` status automatically (OCO rule)
- Parent position: may be closed if bracket was at parent price

**When parent is cancelled:**
- Parent: `cancelled` status
- Both brackets: `cancelled` status (OSO rule)

---

### 5. Bracket State Management Rules

#### **Critical OCO Logic (One-Cancels-Other)**
When stop loss and take profit brackets are a pair, implement this logic:

```
IF bracket1_executes:
   bracket1.status = "filled"
   bracket2.status = "cancelled"
   position.qty = 0 (closed)
ELSE IF bracket1_partially_executes:
   bracket1.filledQty += partial_fill
   bracket2.qty -= partial_fill  // ← Reduce other bracket
   IF bracket1_filledQty == bracket1_qty:
      bracket2.status = "cancelled"
```

#### **Critical OSO Logic (One-Send-Other)**
When parent order fills, brackets must activate:

```
IF parent_order_fills:
   parent.status = "filled"
   bracket1.status = "working"    // ← Becomes active
   bracket2.status = "working"
   // Only if supportPositionBrackets:
   bracket1.parentType = "position"
   bracket2.parentType = "position"  
   bracket1.parentId = <position_id>
   bracket2.parentId = <position_id>
```

---

### 6. Instruments Endpoint

**Location:** `GET /accounts/{accountId}/instruments`  
**Current Status:** Likely already implemented for stocks

**For Conditional Orders, ensure:**
```json
{
  "name": "AAPL",
  "description": "Apple Inc",
  "type": "stock",
  "currency": "USD",
  "minQty": 1,
  "maxQty": 1000000,
  "qtyStep": 1,
  "minTick": 0.01,
  "pipSize": 0.01,
  "pipValue": 0.01,
  "marginRate": 0,
  
  // For conditional orders, these help validate bracket prices:
  "stopPercent": {              // ← Validation rules
    "min": 1.0,
    "max": 50.0
  },
  "limitPercent": {
    "min": 1.0,
    "max": 50.0
  }
}
```

The `stopPercent` and `limitPercent` fields help TradingView UI validate that brackets are within reasonable distance from parent price.

---

### 7. Configuration Endpoint

**Location:** `GET /config?locale=en`  
**Current Status:** Likely already implemented

**For Conditional Orders, verify:**
```json
{
  "s": "ok",
  "d": {
    "durations": [
      {
        "id": "GTT",
        "title": "Good Till Time",
        "hasDatePicker": true,
        "hasTimePicker": true,
        "supportedOrderTypes": ["market", "limit", "stop", "stoplimit"]
        // Note: brackets use same duration as parent
      }
    ],
    "orderInfoConfig": {
      "dependencies": [
        ["qty", "side", "price", "duration", "brackets"]  // ← Add "brackets"
      ]
    }
  }
}
```

The `orderInfoConfig.dependencies` tells TradingView which fields affect order info calculations. Include `"brackets"` so profit/loss calculations update when brackets change.

---

## Implementation Workflow

### Phase 1: Backend Changes

1. **Order Storage:**
   - Add `stopLoss` and `takeProfit` fields to order table
   - Add `parentId` and `parentType` foreign keys
   - Add `isTrailingStop` and `trailingStopPips` fields (optional)

2. **Order Validation:**
   ```
   When order placed with brackets:
   - Validate bracket prices are within instrument's stop/limit percent
   - Validate bracket side is opposite of parent side
   - Validate bracket qty == parent qty
   - Validate bracket orders created with same duration as parent
   ```

3. **Order Execution Logic:**
   - When parent order fills → activate both brackets (change status to "working")
   - When one bracket fills → cancel the other (OCO logic)
   - Handle partial fills: reduce other bracket quantity accordingly
   - When parent cancelled → cancel all brackets (OSO logic)

4. **Database Queries:**
   ```sql
   -- Example: Get order with all its brackets
   SELECT * FROM orders 
   WHERE id = ? OR parentId = ?
   ORDER BY parentType DESC, id
   
   -- Example: Cancel all brackets for an order
   UPDATE orders SET status = 'cancelled' 
   WHERE parentId = ? AND parentType = 'order'
   ```

### Phase 2: API Endpoint Updates

1. **POST /orders:** Accept `stopLoss`, `takeProfit` in request, create bracket orders
2. **PUT /orders/{id}:** Accept bracket updates, create/modify/delete brackets
3. **GET /orders:** Return brackets with `parentId`/`parentType` fields
4. **DELETE /orders/{id}:** When deleting parent, also delete/cancel brackets
5. **POST /orders/cancelAll:** Extend to handle bracket cancellation

### Phase 3: TradingView Configuration

1. Set `supportBrackets: true` in `/accounts` response
2. Set `supportOrderBrackets: true` (not position brackets for stocks)
3. Set `supportModifyBrackets: true` and `supportModifyOrderBrackets: true`
4. Test with TradingView staging environment
5. Verify bracket orders appear in UI, can be added/modified/removed

### Phase 4: Testing

**Test Scenarios:**

| Scenario | Expected Behavior |
|----------|-------------------|
| Place market order with SL+TP | Parent working, brackets inactive |
| Modify SL price on active order | Bracket updated, parent unchanged |
| Remove TP from order | TP bracket cancelled, SL remains |
| Parent order fills | Parent filled, brackets working |
| SL executes | SL filled, TP cancelled (OCO), position closed |
| Partial bracket fill | Other bracket qty reduced, OSO maintained |
| Cancel parent order | Parent cancelled, both brackets cancelled |
| Modify order with active brackets | Current brackets preserved/updated |

---

## Order Type Support Matrix

### What Order Types Can Have Brackets?

**For Stocks (your scope):**

| Order Type | Can Have Brackets? | Notes |
|------------|-------------------|-------|
| Market | ✅ Yes | Brackets become active immediately after fill |
| Limit | ✅ Yes | Brackets become active when limit order fills |
| Stop | ✅ Yes | Brackets become active when stop triggered and fills |
| Stop-Limit | ✅ Yes | Brackets become active when stop-limit fills |

**All bracket types for stocks:**
- Stop Loss (stop order, opposite side)
- Take Profit (limit order, opposite side)
- Trailing Stop (optional, dynamic stop)
- Guaranteed Stop (optional, premium feature)

---

## Data Structure Reference

### Order Object (Enhanced)

```json
{
  "id": "unique-order-id",
  "instrument": "AAPL",
  "qty": 100,
  "side": "buy",
  "type": "limit",
  "limitPrice": 150.00,
  "status": "working",
  "filledQty": 0,
  "avgPrice": 0,
  
  // Bracket-related fields:
  "parentId": null,           // null for parent orders
  "parentType": null,         // null, "order", or "position"
  
  // For stop orders:
  "stopPrice": 145.00,
  
  // For trailing stop brackets:
  "trailingStopPips": 10,
  "isTrailingStop": false,
  
  // Duration/expiration:
  "duration": {
    "type": "gtt",
    "datetime": 1733817600
  },
  
  // Timestamp:
  "lastModified": 1733817200,
  
  // Optional: custom fields
  "customFields": {}
}
```

### Error Responses

Implement these error codes for bracket-related failures:

```json
{
  "s": "error",
  "d": {
    "code": "BRACKET_INVALID_PRICE",
    "message": "Stop loss price outside allowed range",
    "errtype": "validation"
  }
}
```

---

## Account Flags Quick Reference

### Minimum Required for Stock Conditional Orders:
```json
{
  "supportBrackets": true,
  "supportOrderBrackets": true,
  "supportMarketBrackets": true,
  "supportStopLoss": true,
  "supportModifyBrackets": true,
  "supportModifyOrderBrackets": true,
  "supportStopOrders": true,
  "supportStopLimitOrders": true
}
```

### Optional Enhancements:
```json
{
  "supportTrailingStop": true,          // Advanced stop management
  "supportGuaranteedStop": true,        // Premium/risk feature
  "supportAddBracketsToExistingOrder": true  // Add brackets post-creation
}
```

### NOT Needed for Stocks:
```json
{
  "supportPositionBrackets": false,     // Stocks don't hold positions
  "supportMultiposition": false,        // Single position per symbol
  "supportPartialClosePosition": false  // Not applicable
}
```

---

## UI Integration Points

Once implemented, users will see:

1. **Order Placement Dialog:**
   - "Stop Loss" input field (optional)
   - "Take Profit" input field (optional)
   - Bracket fields shown when `supportOrderBrackets: true`

2. **Order Management:**
   - Brackets displayed as child orders under parent
   - Edit parent order → can modify bracket prices
   - Brackets inactive until parent fills

3. **Execution View:**
   - Parent fill → brackets activate
   - One bracket fill → other auto-cancels (OCO)
   - Position closed when bracket executes

4. **Account Manager:**
   - Shows parent order with bracket indicators
   - Displays all bracket orders with "Inactive" status

---

## Implementation Checklist

- [ ] Modify `/accounts` response to include bracket support flags
- [ ] Extend `POST /orders` to accept `stopLoss` and `takeProfit` parameters
- [ ] Extend `PUT /orders/{id}` to modify brackets
- [ ] Update `GET /orders` response to return bracket orders with `parentId`/`parentType`
- [ ] Add bracket table/columns to order storage
- [ ] Implement OCO logic (when one bracket fills, cancel other)
- [ ] Implement OSO logic (when parent fills, activate brackets)
- [ ] Add bracket cancellation logic to `DELETE /orders/{id}`
- [ ] Implement `POST /orders/cancelAll` bracket support
- [ ] Update order validation to check bracket prices
- [ ] Test with TradingView staging environment
- [ ] Create unit tests for bracket creation/modification/cancellation
- [ ] Create integration tests for OCO/OSO behavior
- [ ] Document bracket behavior in API documentation
- [ ] Train support team on bracket order behavior

---

## Important Notes & Gotchas

### 1. **Brackets are Independent Orders**
Brackets are stored and returned as separate orders with `parentId` linking. Each bracket gets a unique ID.

### 2. **OSO vs OCO**
- **OSO (Parent → Brackets):** When parent executes, brackets activate
- **OCO (Bracket ↔ Bracket):** Only one bracket can execute (they cancel each other)

### 3. **Partial Executions**
If a bracket partially fills (rare for stocks), the other bracket's quantity must be automatically reduced on your backend.

### 4. **Inactive Status**
Brackets show `status: "inactive"` until parent order fills. This prevents accidental execution before parent entry.

### 5. **Quantity Matching**
Bracket quantity MUST always equal parent quantity. TradingView enforces this on the frontend, but validate on backend.

### 6. **Price Validation**
Use `stopPercent` and `limitPercent` from instruments endpoint to validate brackets aren't too far from entry price:
```
stopPrice >= currentPrice * (1 - stopPercent/100)  // For longs
stopPrice <= currentPrice * (1 + stopPercent/100)  // For shorts
```

### 7. **No Bracket Chains**
Bracket orders cannot have their own brackets. `parentId` on a bracket order means it's a bracket (not eligible for sub-brackets).

### 8. **Floating Brackets**
If parent order is cancelled before fill, brackets must also be cancelled. Brackets cannot exist without a parent in `working` state.

### 9. **Position Brackets (Not Supported for Basic Stocks)**
TradingView also supports adding brackets to existing positions (`supportPositionBrackets`). For initial implementation, set to `false` and leave for future enhancement.

### 10. **Streaming (Optional Enhancement)**
For high-frequency updates, consider implementing:
- `GET /stream/orders` - Stream bracket changes instead of polling
- More efficient than polling every 500ms

---

## Next Steps

1. **Review** this specification with your engineering team
2. **Estimate** implementation effort (typically 3-5 weeks for core bracket orders)
3. **Prioritize** based on:
   - Risk tolerance (brackets protect against losses)
   - User demand (brackets are high-value feature)
   - Engineering capacity
4. **Schedule** integration testing with TradingView (2-4 weeks)
5. **Plan** rollout to staging environment first
6. **Monitor** execution and hedge effectiveness post-launch

---

## References

- **TradingView REST API Spec:** v1.9.3+ (https://www.tradingview.com/rest-api-spec/)
- **Broker API Docs:** https://www.tradingview.com/broker-api-docs/
- **Concepts Page:** https://www.tradingview.com/broker-api-docs/trading/concepts
- **Bracket Orders Tutorial:** https://www.tradingview.com/charting-library-docs/latest/trading_terminal/trading-concepts/brackets/

---

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Status:** Ready for Implementation Planning
