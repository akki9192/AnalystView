# Conditional Orders Implementation Guide for Stock Trading
## Based on TradingView REST API Specification v1.9.3

---

## Executive Summary

This report outlines the requirements for implementing conditional orders (bracket orders) in a broker's trading system that currently supports single-leg stock trading. The TradingView REST API v1.9.3 provides comprehensive support for conditional orders through bracket functionality, which includes Stop Loss, Take Profit, Trailing Stops, and Guaranteed Stops.

**Key Finding:** Conditional orders are implemented as **bracket orders** with parent-child relationships, where a primary order (market/limit/stop) can have attached secondary orders (stop loss and take profit) that trigger based on conditions.

---

## Part 1: Conditional Orders Overview

### Definition
Conditional orders (bracket orders) are composite order structures where:
- **Parent Order**: Primary entry order (market, limit, or stop)
- **Child Orders**: Dependent orders that trigger based on parent order execution or specific conditions
  - **Stop Loss Order**: Sells position if price drops to specified level
  - **Take Profit Order**: Closes position if price rises to specified level
  - **Trailing Stop**: Dynamic stop that follows price upward
  - **Guaranteed Stop**: Stop with guaranteed execution (premium feature)

### Order Types Supported for Stocks
- `market` - Market order (immediate execution)
- `limit` - Limited execution at specific price
- `stop` - Stop order triggered at specified price
- `stoplimit` - Stop order that becomes limit order

---

## Part 2: Requirements for Implementation

### 2.1 Account-Level Configuration Flags

These flags in the `/accounts` endpoint response determine bracket order capabilities:

| Flag | Type | Purpose | Default |
|------|------|---------|---------|
| `supportBrackets` | boolean | Enable basic bracket support | false |
| `supportOrderBrackets` | boolean | Brackets for new orders | false |
| `supportPositionBrackets` | boolean | Brackets for existing positions | false |
| `supportMarketBrackets` | boolean | Allow brackets on market orders | false |
| `supportAddBracketsToExistingOrder` | boolean | Add brackets to already-placed orders | false |
| `supportModifyOrderBrackets` | boolean | Modify brackets on existing orders | true |
| `supportModifyPositionBrackets` | boolean | Modify brackets on positions | true |
| `supportIndividualPositionBrackets` | boolean | Brackets on individual positions | false |
| `supportStopLoss` | boolean | Basic stop loss support | false |
| `supportTrailingStop` | boolean | Trailing stop functionality | false |
| `supportGuaranteedStop` | boolean | Guaranteed stop orders | false |

### 2.2 API Endpoints Required

| Endpoint | Method | Purpose | For Brackets |
|----------|--------|---------|--------------|
| `/accounts/{accountId}/placeOrder` | POST | Create new order with brackets | ✅ Primary |
| `/accounts/{accountId}/orders/{orderId}/modifyOrder` | POST | Modify order and brackets | ✅ Primary |
| `/accounts/{accountId}/orders/{orderId}/cancelOrder` | POST | Cancel order and linked brackets | ✅ Supporting |
| `/accounts/{accountId}/previewOrder` | POST | Preview order with bracket validation | ✅ Supporting |
| `/accounts/{accountId}/orders` | GET | Retrieve orders with bracket info | ✅ Supporting |
| `/accounts/{accountId}/stream/orders` | WebSocket | Stream order updates including brackets | ✅ Supporting |
| `/accounts/{accountId}/positions` | GET | Retrieve positions with brackets | ✅ Supporting |
| `/accounts/{accountId}/modifyPosition` | POST | Modify position brackets | ✅ Supporting |

### 2.3 Configuration Endpoint Requirements

The `/config` endpoint must return bracket-related configuration:

```json
{
  "orderInfoConfig": {
    "dependencies": [
      ["qty", "side", "price", "duration", "brackets", "slType"]
    ]
  },
  "durations": [
    {
      "id": "GTT",
      "title": "Good Till Time",
      "hasDatePicker": true,
      "hasTimePicker": true,
      "default": true,
      "supportedOrderTypes": ["stop", "stoplimit"]
    }
  ]
}
```

---

## Part 3: Request and Response Schemas

### 3.1 Place Order with Brackets

#### **Endpoint**
```
POST /accounts/{accountId}/placeOrder
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer {access_token}
```

#### **Request Parameters**

| Parameter | Type | Required | Description | Notes |
|-----------|------|----------|-------------|-------|
| `instrument` | string | ✅ | Stock symbol (e.g., "AAPL") | Must match broker's symbol mapping |
| `qty` | number | ✅ | Order quantity | Must be ≥ minQty from /instruments |
| `side` | string | ✅ | Order direction | Enum: "buy" \| "sell" |
| `type` | string | ✅ | Order type | Enum: "market" \| "limit" \| "stop" \| "stoplimit" |
| `currentBid` | number | ✅ | Current bid price | Real-time market bid |
| `currentAsk` | number | ✅ | Current ask price | Real-time market ask |
| `limitPrice` | number | ⚠️ | Limit price | Required if type="limit" or "stoplimit" |
| `stopPrice` | number | ⚠️ | Stop trigger price | Required if type="stop" or "stoplimit" |
| **Bracket Fields** | | | | |
| `stopLoss` | number | ❌ | Stop loss price | Sell below this price to exit |
| `takeProfit` | number | ❌ | Take profit price | Sell above this price to exit |
| `trailingStopPips` | number | ❌ | Trailing stop distance | Distance in pips (e.g., 10 pips) |
| `guaranteedStop` | number | ❌ | Guaranteed stop price | Premium stop with guaranteed fill |
| **Other Parameters** | | | | |
| `durationType` | string | ❌ | Duration type ID | From /config durations array |
| `durationDateTime` | number | ❌ | Expiration timestamp | Unix timestamp (milliseconds) |
| `orderInfoId` | string | ❌ | Order info ID | From /orderInfo endpoint |
| `confirmId` | string | ❌ | Confirmation ID | From /previewOrder response |
| `digitalSignature` | string | ❌ | Digital signature | If broker requires signing |

#### **Response - Success (200 OK)**

```json
{
  "s": "ok",
  "d": {
    "orderId": "ORD-20240112-001",
    "transactionId": "TXN-20240112-001"
  }
}
```

#### **Response - Error (400/401/500)**

```json
{
  "s": "error",
  "errmsg": "Insufficient buying power for this order",
  "errtype": "insufficient_balance"
}
```

---

### 3.2 Modify Order with Brackets

#### **Endpoint**
```
POST /accounts/{accountId}/orders/{orderId}/modifyOrder
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer {access_token}
```

#### **Request Parameters**

| Parameter | Type | Required | Description | Notes |
|-----------|------|----------|-------------|-------|
| `instrument` | string | ✅ | Stock symbol | Must match original order |
| `qty` | number | ✅ | New order quantity | Can be different from original |
| `limitPrice` | number | ❌ | New limit price | For limit/stoplimit orders |
| `stopPrice` | number | ❌ | New stop price | For stop/stoplimit orders |
| **Bracket Fields** | | | | |
| `stopLoss` | number | ❌ | New stop loss price | Can be added/updated/removed |
| `takeProfit` | number | ❌ | New take profit price | Can be added/updated/removed |
| `trailingStopPips` | number | ❌ | New trailing stop | Updates trailing stop level |
| `guaranteedStop` | number | ❌ | New guaranteed stop | Updates guaranteed stop |
| **Other Parameters** | | | | |
| `durationType` | string | ❌ | New duration type | Can change duration settings |
| `durationDateTime` | number | ❌ | New expiration time | Unix timestamp |
| `currentBid` | number | ❌ | Current bid price | Real-time market bid |
| `currentAsk` | number | ❌ | Current ask price | Real-time market ask |
| `confirmId` | string | ❌ | From /previewOrder | For validation |
| `orderInfoId` | string | ❌ | From /orderInfo | For order info fields |
| `digitalSignature` | string | ❌ | Digital signature | If broker requires |

#### **Response - Success (200 OK)**

**Option A: Simple Success**
```json
{
  "s": "ok"
}
```

**Option B: With Transaction ID**
```json
{
  "s": "ok",
  "d": {
    "transactionId": "TXN-20240112-002"
  }
}
```

#### **Response - Error (400/401/500)**

```json
{
  "s": "error",
  "errmsg": "Cannot modify order - order is partially filled",
  "errtype": "invalid_order_state"
}
```

---

### 3.3 Order Response Object (from /orders GET)

Orders returned from `GET /accounts/{accountId}/orders` include bracket information:

```json
{
  "s": "ok",
  "d": [
    {
      "id": "ORD-20240112-001",
      "instrument": "AAPL",
      "qty": 100,
      "side": "buy",
      "type": "limit",
      "status": "working",
      "limitPrice": 150.25,
      "stopPrice": null,
      "filledQty": 0,
      "avgPrice": null,
      "created": 1705084800000,
      "updated": 1705084800000,
      "lastModified": 1705084800000,
      
      "stopLoss": 148.50,
      "takeProfit": 155.00,
      "trailingStopPips": null,
      "guaranteedStop": null,
      
      "parentId": null,
      "parentType": null,
      "duration": "GTT",
      "expirationTime": 1705171200000,
      
      "message": "Order pending execution"
    },
    {
      "id": "ORD-20240112-002",
      "instrument": "AAPL",
      "qty": 100,
      "side": "sell",
      "type": "limit",
      "status": "inactive",
      "limitPrice": 155.00,
      "stopPrice": null,
      "filledQty": 0,
      "avgPrice": null,
      "created": 1705084800000,
      "updated": 1705084800000,
      
      "parentId": "ORD-20240112-001",
      "parentType": "order",
      "duration": "GTT",
      "expirationTime": 1705171200000,
      
      "message": "Take Profit - Awaiting parent order execution"
    },
    {
      "id": "ORD-20240112-003",
      "instrument": "AAPL",
      "qty": 100,
      "side": "sell",
      "type": "stop",
      "status": "inactive",
      "stopPrice": 148.50,
      "filledQty": 0,
      "avgPrice": null,
      "created": 1705084800000,
      "updated": 1705084800000,
      
      "parentId": "ORD-20240112-001",
      "parentType": "order",
      "duration": "GTT",
      "expirationTime": 1705171200000,
      
      "message": "Stop Loss - Awaiting parent order execution"
    }
  ]
}
```

---

### 3.4 Preview Order with Brackets

#### **Endpoint**
```
POST /accounts/{accountId}/previewOrder
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer {access_token}
```

#### **Request Parameters**
Same as `/placeOrder` - allows client to preview what would happen

#### **Response - Success (200 OK)**

```json
{
  "s": "ok",
  "d": {
    "confirmId": "CONFIRM-20240112-001",
    "orders": [
      {
        "side": "buy",
        "qty": 100,
        "instrument": "AAPL",
        "type": "limit",
        "limitPrice": 150.25
      }
    ],
    "brackets": [
      {
        "side": "sell",
        "qty": 100,
        "instrument": "AAPL",
        "type": "limit",
        "limitPrice": 155.00,
        "description": "Take Profit"
      },
      {
        "side": "sell",
        "qty": 100,
        "instrument": "AAPL",
        "type": "stop",
        "stopPrice": 148.50,
        "description": "Stop Loss"
      }
    ],
    "estimatedCost": {
      "amount": 15025.00,
      "currency": "USD"
    },
    "commission": 10.00,
    "message": "Order preview successful"
  }
}
```

---

### 3.5 Modify Position Brackets

#### **Endpoint**
```
POST /accounts/{accountId}/positions/{positionId}/modifyPosition
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer {access_token}
```

#### **Request Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `stopLoss` | number | ❌ | New stop loss price |
| `takeProfit` | number | ❌ | New take profit price |
| `trailingStopPips` | number | ❌ | Trailing stop distance |
| `guaranteedStop` | number | ❌ | Guaranteed stop price |
| `currentBid` | number | ❌ | Current bid price |
| `currentAsk` | number | ❌ | Current ask price |

#### **Response - Success (200 OK)**

```json
{
  "s": "ok"
}
```

---

## Part 4: Bracket Order Workflow

### 4.1 Typical Bracket Order Flow

```
1. User places BUY order with brackets:
   ├─ Parent Order: BUY 100 AAPL @ limit $150.25
   ├─ Take Profit: SELL 100 AAPL @ limit $155.00
   └─ Stop Loss: SELL 100 AAPL @ stop $148.50

2. Broker receives /placeOrder request with:
   ├─ instrument: "AAPL"
   ├─ qty: 100
   ├─ side: "buy"
   ├─ type: "limit"
   ├─ limitPrice: 150.25
   ├─ stopLoss: 148.50
   ├─ takeProfit: 155.00

3. Broker validates:
   ├─ Account has buying power for 100 AAPL @ $150.25
   ├─ Stop Loss < Entry Price (148.50 < 150.25) ✓
   ├─ Take Profit > Entry Price (155.00 > 150.25) ✓
   ├─ All prices within instrument's tick size
   └─ Duration is valid

4. Broker creates three orders:
   ├─ Order 1: BUY 100 AAPL @ limit $150.25 (WORKING)
   ├─ Order 2: SELL 100 AAPL @ limit $155.00 (INACTIVE - parentId=Order1)
   └─ Order 3: SELL 100 AAPL @ stop $148.50 (INACTIVE - parentId=Order1)

5. Parent order fills:
   ├─ Order 1 status changes to FILLED
   ├─ Orders 2 & 3 status change to WORKING
   └─ Streaming update notifies client

6. Market moves up to $155:
   ├─ Order 2 (Take Profit) triggers and fills
   ├─ System automatically cancels Order 3 (Stop Loss)
   ├─ Position is closed with profit
   └─ All orders now have final status
```

### 4.2 Validation Rules for Brackets

The broker must implement validation logic:

```
For BUY orders with brackets:
  - stopLoss (if present) < entry price
  - takeProfit (if present) > entry price
  - stopLoss < takeProfit (if both present)
  - stopLoss must be below entry by minimum amount (e.g., 0.01 for stocks)
  - takeProfit must be above entry by minimum amount

For SELL orders with brackets:
  - stopLoss (if present) > entry price (reversed)
  - takeProfit (if present) < entry price (reversed)
  - stopLoss > takeProfit (if both present)

General validation:
  - All prices align with instrument's minTick
  - Quantity matches available shares
  - Account has sufficient margin/buying power
  - Orders comply with market hours (if applicable)
  - Duration is within exchange limits
```

---

## Part 5: Streaming Support for Conditional Orders

### 5.1 Stream Orders Endpoint

For real-time updates, implement `/stream/orders`:

```
WebSocket: wss://broker.com/stream/orders?accountId={accountId}

Message format (line-delimited JSON):
{"type":"snapshot","orders":[{"id":"ORD-001","qty":100,...}]}
{"type":"update","orders":[{"id":"ORD-001","status":"filled",...}]}
{"type":"ping"}
```

### 5.2 Bracket-Related Stream Fields

Include in order updates:
- `parentId` - ID of parent order
- `parentType` - "order" or "position"
- `status` - "working", "inactive", "filled", "canceled"
- `stopLoss` - Current stop loss price
- `takeProfit` - Current take profit price
- `trailingStopPips` - Current trailing stop
- `message` - Human-readable status message

---

## Part 6: Implementation Checklist

### Phase 1: Configuration & Flags
- [ ] Update `/accounts` endpoint to include bracket support flags
  - [ ] `supportBrackets` = true
  - [ ] `supportOrderBrackets` = true
  - [ ] `supportMarketBrackets` = true
  - [ ] `supportAddBracketsToExistingOrder` = true
  - [ ] `supportStopLoss` = true
  - [ ] `supportModifyOrderBrackets` = true
  - [ ] `supportModifyPositionBrackets` = true
- [ ] Define bracket field validation rules in `/instruments` endpoint
- [ ] Configure `/config` endpoint with orderInfoConfig dependencies

### Phase 2: Database Schema
- [ ] Add columns to Orders table:
  - [ ] `stop_loss_price` (decimal)
  - [ ] `take_profit_price` (decimal)
  - [ ] `trailing_stop_pips` (decimal)
  - [ ] `guaranteed_stop_price` (decimal)
  - [ ] `parent_order_id` (foreign key)
  - [ ] `parent_order_type` (enum: "order", "position")
  - [ ] `is_bracket_child` (boolean)
- [ ] Create Bracket Orders table for parent-child relationships
  - [ ] `parent_order_id`
  - [ ] `stop_loss_order_id`
  - [ ] `take_profit_order_id`
  - [ ] `status` (active, partially_executed, completed)

### Phase 3: Order Processing Logic
- [ ] Implement bracket order validation
  - [ ] Price hierarchy validation
  - [ ] Account margin/buying power check for all three orders
  - [ ] Tick size compliance
- [ ] Implement bracket order creation (create 1-3 orders atomically)
- [ ] Implement bracket order modification
- [ ] Implement bracket order cancellation logic
  - [ ] When parent cancels, cancel child orders
  - [ ] When child fills, cancel other child

### Phase 4: API Endpoints
- [ ] Enhance `/placeOrder` to accept bracket parameters
- [ ] Enhance `/modifyOrder` to accept bracket parameters
- [ ] Enhance `/previewOrder` to show bracket validation
- [ ] Implement `/modifyPosition` for position brackets
- [ ] Update `/orders` GET to return bracket information
- [ ] Update `/positions` GET to return bracket information

### Phase 5: Order Execution
- [ ] Implement order fill logic:
  - [ ] When parent fills, activate child orders
  - [ ] Monitor price against stop loss
  - [ ] Monitor price against take profit
  - [ ] Execute stop/limit orders based on price
- [ ] Implement bracket order cancellation on fill:
  - [ ] When one bracket fills, cancel the other
  - [ ] Update parent order status
- [ ] Implement trailing stop logic
  - [ ] Track high-water mark
  - [ ] Adjust stop price dynamically

### Phase 6: Streaming
- [ ] Implement `/stream/orders` endpoint
  - [ ] Include bracket fields in messages
  - [ ] Send updates when bracket prices change
  - [ ] Send updates when orders fill/cancel
- [ ] Test streaming with bracket order fills

### Phase 7: Testing
- [ ] Unit tests for bracket validation
- [ ] Integration tests for order placement with brackets
- [ ] Integration tests for order modification
- [ ] Integration tests for order execution
- [ ] Test edge cases:
  - [ ] Price gaps during volatile markets
  - [ ] Partial fills with brackets
  - [ ] Expired orders with open brackets
  - [ ] Simultaneous bracket fills (theoretically impossible but handle)

---

## Part 7: Stock-Specific Considerations

### 7.1 Market Hours
- Include market hours validation in bracket order logic
- For stocks, orders after-hours may have different rules
- Consider extended-hours trading implications

### 7.2 Tick Size and Minimum Values
Stock instruments typically have these instrument-level constraints:

```json
{
  "minTick": 0.01,
  "minQty": 1,
  "maxQty": 1000000,
  "qtyStep": 1,
  "currency": "USD"
}
```

Ensure bracket prices comply with `minTick`.

### 7.3 Partial Execution Handling
Unlike forex, stocks may fill partially. Bracket order logic must handle:
- Parent order partially filled (e.g., 100 of 500 units)
- Calculate bracket quantities based on filled amount
- Adjust remaining bracket orders

### 7.4 Corporate Actions
After stock split, dividend, or spin-off:
- Adjust bracket order quantities if needed
- Validate bracket prices against new instrument specs
- Notify user of adjustments

---

## Part 8: Advanced Features (Optional)

### 8.1 Trailing Stops
When `supportTrailingStop` = true:
- Accept `trailingStopPips` parameter
- Track highest price after order fill
- Adjust stop price upward as price rises
- Trigger stop order when price falls by trailing amount

### 8.2 Guaranteed Stops
When `supportGuaranteedStop` = true:
- Broker guarantees fill at specified price or better
- Usually carries premium cost
- Accept `guaranteedStop` parameter
- Implement as special order type with different processing

### 8.3 Individual Position Brackets
When `supportIndividualPositionBrackets` = true:
- Apply brackets to existing positions
- Separate from order brackets
- Implement via `/modifyPosition` endpoint

---

## Part 9: Error Handling

### Standard Error Responses

```json
{
  "s": "error",
  "errmsg": "Error description for user",
  "errtype": "error_code_for_system"
}
```

### Bracket-Specific Error Codes

| Error Code | Message | Resolution |
|-----------|---------|-----------|
| `bracket_price_invalid` | Stop loss or take profit price invalid | Verify price hierarchy |
| `bracket_insufficient_margin` | Not enough margin for all bracket orders | Reduce qty or adjust prices |
| `bracket_not_supported` | Account/instrument doesn't support brackets | Enable via /accounts or use simple orders |
| `invalid_stop_loss_level` | Stop loss too close to entry | Increase distance or use trailing stop |
| `invalid_take_profit_level` | Take profit too close to entry | Increase distance |
| `order_type_incompatible` | Order type doesn't support brackets | Use market/limit instead |
| `duration_not_supported` | Bracket doesn't support this duration | Check /config durations array |

---

## Part 10: Security Considerations

1. **Digital Signatures**: If `supportDigitalSignature` = true
   - Implement signature validation for bracket orders
   - Use broker's certificate infrastructure
   - Validate before execution

2. **Order Verification**: Implement confirmId flow
   - `/previewOrder` returns `confirmId`
   - `/placeOrder` includes `confirmId` from preview
   - Verify confirmId hasn't expired/changed

3. **Price Validation**
   - Verify `currentBid`/`currentAsk` are recent
   - Reject orders with stale prices
   - Use reasonable time windows (e.g., < 5 seconds old)

4. **Audit Trail**
   - Log all bracket order operations
   - Track modifications to brackets
   - Store bracket prices at time of execution

---

## Part 11: Performance Considerations

1. **Database Indexing**
   - Index on `parent_order_id` for quick lookup
   - Index on account + created_time for order retrieval
   - Index on symbol + status for market-wide monitoring

2. **Real-Time Processing**
   - Use event-driven architecture for order fills
   - Implement message queue for bracket activation
   - Cache market data for fast price comparisons

3. **Notification System**
   - Stream updates efficiently
   - Batch updates when appropriate
   - Implement backpressure handling

---

## Appendix A: Example Implementation - Place Bracket Order

### Pseudo-code
```
function placeOrder(accountId, params) {
  // Validate account and bracket support
  account = getAccount(accountId)
  if (!account.supportOrderBrackets) {
    return error("Brackets not supported")
  }
  
  // Validate instrument
  instrument = getInstrument(params.instrument)
  if (!instrument) {
    return error("Instrument not found")
  }
  
  // Validate bracket prices
  if (params.stopLoss && params.takeProfit) {
    if (params.side == "buy") {
      if (params.stopLoss >= params.limitPrice) {
        return error("bracket_price_invalid")
      }
      if (params.takeProfit <= params.limitPrice) {
        return error("bracket_price_invalid")
      }
      if (params.stopLoss >= params.takeProfit) {
        return error("bracket_price_invalid")
      }
    }
  }
  
  // Validate margin
  requiredMargin = calculateMargin(accountId, params)
  if (account.availableMargin < requiredMargin) {
    return error("bracket_insufficient_margin")
  }
  
  // Create parent order
  parentOrder = Order(
    id: generateOrderId(),
    accountId: accountId,
    instrument: params.instrument,
    qty: params.qty,
    side: params.side,
    type: params.type,
    limitPrice: params.limitPrice,
    stopPrice: params.stopPrice,
    status: "working",
    parentId: null
  )
  
  // Create bracket orders if provided
  bracketOrders = []
  
  if (params.takeProfit) {
    tpOrder = Order(
      id: generateOrderId(),
      accountId: accountId,
      instrument: params.instrument,
      qty: params.qty,
      side: params.side == "buy" ? "sell" : "buy",
      type: "limit",
      limitPrice: params.takeProfit,
      status: "inactive",
      parentId: parentOrder.id,
      parentType: "order"
    )
    bracketOrders.push(tpOrder)
  }
  
  if (params.stopLoss) {
    slOrder = Order(
      id: generateOrderId(),
      accountId: accountId,
      instrument: params.instrument,
      qty: params.qty,
      side: params.side == "buy" ? "sell" : "buy",
      type: "stop",
      stopPrice: params.stopLoss,
      status: "inactive",
      parentId: parentOrder.id,
      parentType: "order"
    )
    bracketOrders.push(slOrder)
  }
  
  // Save all orders atomically
  transaction {
    saveOrder(parentOrder)
    for each bracketOrder in bracketOrders {
      saveOrder(bracketOrder)
    }
  }
  
  // Return success
  return {
    s: "ok",
    d: {
      orderId: parentOrder.id,
      transactionId: generateTransactionId()
    }
  }
}
```

---

## Appendix B: Account Configuration Example

Sample `/accounts` response with bracket support:

```json
{
  "s": "ok",
  "d": [
    {
      "id": "ACC-001",
      "name": "Primary Trading Account",
      "type": "live",
      "currency": "USD",
      
      "supportMarketOrders": true,
      "supportLimitOrders": true,
      "supportStopOrders": true,
      "supportStopLimitOrders": true,
      
      "supportBrackets": true,
      "supportOrderBrackets": true,
      "supportPositionBrackets": false,
      "supportMarketBrackets": true,
      "supportAddBracketsToExistingOrder": true,
      "supportModifyOrderBrackets": true,
      "supportModifyPositionBrackets": true,
      "supportIndividualPositionBrackets": false,
      
      "supportStopLoss": true,
      "supportTrailingStop": true,
      "supportGuaranteedStop": false,
      
      "ui": {
        "accountSummaryRow": [...],
        "accountManager": [...],
        "orderCustomFields": [...]
      }
    }
  ]
}
```

---

## Summary

Implementing conditional orders requires:

1. **5-6 new database fields** per order for bracket prices
2. **Parent-child order relationships** for linking orders
3. **Enhanced validation logic** for bracket price hierarchies
4. **Atomic transaction handling** when creating bracket orders
5. **Dynamic order management** to activate/cancel child orders
6. **Configuration flags** in API responses to advertise support
7. **New/enhanced endpoints** to support bracket operations
8. **Streaming updates** for real-time bracket status

The TradingView API provides a well-defined specification for bracket order implementation. Following this guide will ensure compatibility with TradingView's frontend while maintaining broker-side control over risk and validation logic.

---

**Document Version:** 1.0  
**API Specification:** TradingView REST API v1.9.3  
**Last Updated:** January 2024  
**Applicable To:** Stock trading only (Equities)