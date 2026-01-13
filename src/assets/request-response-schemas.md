# Conditional Orders - Request & Response Objects
## Detailed Technical Specifications for Stock Trading

---

## 1. PLACE ORDER WITH BRACKETS

### 1.1 Request

```
POST /accounts/{accountId}/placeOrder
Authorization: Bearer {accessToken}
Content-Type: application/x-www-form-urlencoded
```

### 1.1.1 Form Parameters (URL-encoded)

```
instrument=AAPL
qty=100
side=buy
type=limit
limitPrice=150.25
currentBid=150.20
currentAsk=150.30
stopLoss=148.50
takeProfit=155.00
durationType=GTT
durationDateTime=1705171200000
```

### 1.1.2 Required Fields for Bracket Orders

```json
{
  "instrument": "AAPL",              // [REQUIRED] Stock symbol
  "qty": 100,                        // [REQUIRED] Order quantity (shares)
  "side": "buy",                     // [REQUIRED] Enum: "buy" | "sell"
  "type": "limit",                   // [REQUIRED] Enum: "market" | "limit" | "stop" | "stoplimit"
  "limitPrice": 150.25,              // [CONDITIONAL] Required if type is "limit" or "stoplimit"
  "stopPrice": null,                 // [CONDITIONAL] Required if type is "stop" or "stoplimit"
  "currentBid": 150.20,              // [REQUIRED] Current market bid price
  "currentAsk": 150.30,              // [REQUIRED] Current market ask price
  
  // BRACKET FIELDS [OPTIONAL]
  "stopLoss": 148.50,                // Stop loss price - exit below this
  "takeProfit": 155.00,              // Take profit price - exit above this
  "trailingStopPips": null,          // Trailing stop distance (e.g., 10 = 10 pips)
  "guaranteedStop": null,            // Guaranteed stop price (premium feature)
  
  // TIMING & VALIDATION [OPTIONAL]
  "durationType": "GTT",             // Duration type ID from /config
  "durationDateTime": 1705171200000, // Expiration timestamp (Unix milliseconds)
  "orderInfoId": null,               // From /orderInfo endpoint
  "confirmId": null,                 // From /previewOrder endpoint
  "digitalSignature": null           // Signature (if supportDigitalSignature=true)
}
```

### 1.1.3 Validation Rules (Broker-side)

```
Price Hierarchy Validation:
├─ For BUY orders:
│  ├─ stopLoss < limitPrice        (Stop below entry)
│  ├─ takeProfit > limitPrice      (Profit above entry)
│  └─ stopLoss < takeProfit        (If both specified)
│
├─ For SELL orders:
│  ├─ stopLoss > limitPrice        (Stop above entry)
│  ├─ takeProfit < limitPrice      (Profit below entry)
│  └─ stopLoss > takeProfit        (If both specified)
│
└─ All prices must:
   ├─ Align with instrument.minTick (e.g., 0.01 for stocks)
   ├─ Be within market range
   └─ Meet minimum distance requirements
```

### 1.2 Response - Success (HTTP 200)

```json
{
  "s": "ok",
  "d": {
    "orderId": "ORD-ACC-001-20240112-001",
    "transactionId": "TXN-20240112-001"
  }
}
```

**Field Definitions:**
- `s`: Status string. Value always "ok" on success
- `d.orderId`: Unique order identifier (parent order ID)
- `d.transactionId`: Transaction reference for audit trail

### 1.3 Response - Error (HTTP 400/401/500)

```json
{
  "s": "error",
  "errmsg": "Stop loss price must be below entry price for buy orders",
  "errtype": "bracket_price_invalid"
}
```

**Common Error Types:**
```
"bracket_price_invalid"         → Stop/profit prices violate hierarchy
"bracket_insufficient_margin"   → Account lacks margin for all 3 orders
"bracket_not_supported"         → Account/instrument doesn't support brackets
"invalid_order_type"            → Order type incompatible with brackets
"insufficient_balance"          → Insufficient buying power
"instrument_halted"             → Trading halted on symbol
"market_closed"                 → Market not open
"invalid_duration"              → Duration type not supported
"price_too_close"               → Prices violate minimum distance
"order_rejected_by_risk"        → Risk control violation
```

---

## 2. MODIFY ORDER WITH BRACKETS

### 2.1 Request

```
POST /accounts/{accountId}/orders/{orderId}/modifyOrder
Authorization: Bearer {accessToken}
Content-Type: application/x-www-form-urlencoded
```

### 2.1.1 Form Parameters (URL-encoded)

```
instrument=AAPL
qty=100
limitPrice=151.00
stopLoss=149.00
takeProfit=156.00
currentBid=150.20
currentAsk=150.30
```

### 2.1.2 Modifiable Bracket Fields

```json
{
  "instrument": "AAPL",              // [REQUIRED] Must match original
  "qty": 100,                        // [REQUIRED] Can be different from original
  "limitPrice": 151.00,              // [OPTIONAL] New limit price
  "stopPrice": null,                 // [OPTIONAL] New stop price
  
  // BRACKET FIELDS - All Optional (can update individually)
  "stopLoss": 149.00,                // New SL price or null to remove
  "takeProfit": 156.00,              // New TP price or null to remove
  "trailingStopPips": null,          // New trailing distance or null to remove
  "guaranteedStop": null,            // New guaranteed stop or null to remove
  
  // MARKET DATA & VALIDATION [OPTIONAL]
  "currentBid": 150.20,              // Current bid price
  "currentAsk": 150.30,              // Current ask price
  "durationType": null,              // New duration type if changing
  "durationDateTime": null,          // New expiration if changing
  "confirmId": null,                 // From /previewOrder
  "orderInfoId": null,               // From /orderInfo
  "digitalSignature": null           // Signature if required
}
```

### 2.2 Response - Success (HTTP 200)

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

### 2.3 Response - Error (HTTP 400/401/500)

```json
{
  "s": "error",
  "errmsg": "Cannot modify order - order is partially filled (50 of 100 shares)",
  "errtype": "invalid_order_state"
}
```

**Order States That Block Modification:**
```
- "filled"         → Complete execution, cannot modify
- "canceled"       → Already canceled
- "rejected"       → Broker rejected
- "expired"        → Order expired
- "partially_filled" → May have restrictions (broker-dependent)
```

---

## 3. GET ORDERS RESPONSE (with Bracket Info)

### 3.1 Request

```
GET /accounts/{accountId}/orders?locale=en
Authorization: Bearer {accessToken}
```

### 3.2 Response - Success (HTTP 200)

```json
{
  "s": "ok",
  "d": [
    {
      "id": "ORD-ACC-001-20240112-001",
      "instrument": "AAPL",
      "qty": 100,
      "side": "buy",
      "type": "limit",
      "status": "working",
      "limitPrice": 150.25,
      "stopPrice": null,
      "filledQty": 0,
      "averagePrice": null,
      "created": 1705084800000,
      "updated": 1705084800000,
      "lastModified": 1705084800000,
      
      // BRACKET INFORMATION [KEY FOR CONDITIONAL ORDERS]
      "stopLoss": 148.50,            // Stop loss price (null if not set)
      "takeProfit": 155.00,          // Take profit price (null if not set)
      "trailingStopPips": null,      // Trailing stop distance
      "guaranteedStop": null,        // Guaranteed stop price
      
      // PARENT-CHILD RELATIONSHIP
      "parentId": null,              // Parent order ID (null for primary orders)
      "parentType": null,            // "order" | "position" (null for primary)
      
      // DURATION & EXPIRATION
      "duration": "GTT",             // Duration type from /config
      "expirationTime": 1705171200000, // When order expires
      
      // STATUS INFO
      "message": "Order working - awaiting execution",
      "commission": 10.00
    },
    
    // CHILD ORDER: Take Profit
    {
      "id": "ORD-ACC-001-20240112-002",
      "instrument": "AAPL",
      "qty": 100,
      "side": "sell",                // Opposite side of parent
      "type": "limit",
      "status": "inactive",          // Inactive until parent fills
      "limitPrice": 155.00,          // Take profit price
      "stopPrice": null,
      "filledQty": 0,
      "averagePrice": null,
      "created": 1705084800000,
      "updated": 1705084800000,
      
      // BRACKET FIELDS (empty for child orders)
      "stopLoss": null,
      "takeProfit": null,
      "trailingStopPips": null,
      "guaranteedStop": null,
      
      // PARENT REFERENCE
      "parentId": "ORD-ACC-001-20240112-001",
      "parentType": "order",
      
      "duration": "GTT",
      "expirationTime": 1705171200000,
      "message": "Take Profit - Awaiting parent order execution",
      "commission": 10.00
    },
    
    // CHILD ORDER: Stop Loss
    {
      "id": "ORD-ACC-001-20240112-003",
      "instrument": "AAPL",
      "qty": 100,
      "side": "sell",                // Opposite side of parent
      "type": "stop",
      "status": "inactive",          // Inactive until parent fills
      "stopPrice": 148.50,           // Stop loss price
      "limitPrice": null,
      "filledQty": 0,
      "averagePrice": null,
      "created": 1705084800000,
      "updated": 1705084800000,
      
      // BRACKET FIELDS (empty for child orders)
      "stopLoss": null,
      "takeProfit": null,
      "trailingStopPips": null,
      "guaranteedStop": null,
      
      // PARENT REFERENCE
      "parentId": "ORD-ACC-001-20240112-001",
      "parentType": "order",
      
      "duration": "GTT",
      "expirationTime": 1705171200000,
      "message": "Stop Loss - Awaiting parent order execution",
      "commission": 10.00
    }
  ]
}
```

### 3.3 Order Status Transitions for Bracket Orders

```
Primary (Parent) Order Lifecycle:
  pending → working → filled → [child orders activate] → canceled
  
Child Order Lifecycle:
  pending → inactive → working → filled → [sibling canceled]
                    ↓
                   canceled [if parent canceled]

State Diagram:
┌─────────────────────────────────────────────────────────────┐
│ Parent Order: "working" (100 AAPL @ limit $150.25)          │
├─────────────────────────────────────────────────────────────┤
│ Child 1: "inactive" (SELL 100 @ limit $155.00 - Take Profit)│
│ Child 2: "inactive" (SELL 100 @ stop $148.50 - Stop Loss)   │
└─────────────────────────────────────────────────────────────┘
                          ↓
                 Parent order fills
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Parent Order: "filled" (100 AAPL filled @ $150.25)          │
├─────────────────────────────────────────────────────────────┤
│ Child 1: "working" (SELL 100 @ limit $155.00)               │
│ Child 2: "working" (SELL 100 @ stop $148.50)                │
└─────────────────────────────────────────────────────────────┘
                          ↓
         Market moves up - Child 1 Take Profit triggers
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Parent Order: "filled"                                      │
├─────────────────────────────────────────────────────────────┤
│ Child 1: "filled" (executed @ $155.02)                      │
│ Child 2: "canceled" (auto-cancelled when other fills)       │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. PREVIEW ORDER WITH BRACKETS

### 4.1 Request

```
POST /accounts/{accountId}/previewOrder
Authorization: Bearer {accessToken}
Content-Type: application/x-www-form-urlencoded
```

### 4.1.1 Request Parameters (same as /placeOrder)

```json
{
  "instrument": "AAPL",
  "qty": 100,
  "side": "buy",
  "type": "limit",
  "limitPrice": 150.25,
  "currentBid": 150.20,
  "currentAsk": 150.30,
  "stopLoss": 148.50,
  "takeProfit": 155.00
}
```

### 4.2 Response - Success (HTTP 200)

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
        "limitPrice": 150.25,
        "description": "Primary Order"
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
    "margin": {
      "initialMargin": 0,
      "maintenanceMargin": 0,
      "required": 0
    },
    
    "message": "Order preview successful - all validations passed"
  }
}
```

**confirmId Usage:**
- confirmId returned from `/previewOrder`
- Must be sent back in `/placeOrder` request
- Expires after 5-10 minutes (broker-defined)
- Prevents stale order execution

---

## 5. MODIFY POSITION BRACKETS

### 5.1 Request

```
POST /accounts/{accountId}/positions/{positionId}/modifyPosition
Authorization: Bearer {accessToken}
Content-Type: application/x-www-form-urlencoded
```

### 5.1.1 Form Parameters

```
stopLoss=148.50
takeProfit=155.00
currentBid=150.20
currentAsk=150.30
```

### 5.1.2 Bracket Modification Fields

```json
{
  // Position brackets [all optional - update individually]
  "stopLoss": 148.50,             // New stop loss price
  "takeProfit": 155.00,           // New take profit price
  "trailingStopPips": null,       // New trailing stop distance
  "guaranteedStop": null,         // New guaranteed stop price
  
  // Market data for validation
  "currentBid": 150.20,           // Current market bid
  "currentAsk": 150.30,           // Current market ask
  "confirmId": null               // From /previewOrder if needed
}
```

### 5.2 Response - Success (HTTP 200)

```json
{
  "s": "ok"
}
```

---

## 6. GET POSITIONS RESPONSE (with Bracket Info)

### 6.1 Request

```
GET /accounts/{accountId}/positions?locale=en
Authorization: Bearer {accessToken}
```

### 6.2 Response - Success (HTTP 200)

```json
{
  "s": "ok",
  "d": [
    {
      "id": "POS-ACC-001-AAPL",
      "instrument": "AAPL",
      "qty": 100,
      "side": "long",
      "avgPrice": 150.25,
      "currentPrice": 151.50,
      "unrealizedPL": 125.00,
      "realizedPL": 0,
      "created": 1705084800000,
      "updated": 1705084800000,
      
      // POSITION-LEVEL BRACKETS [OPTIONAL]
      "stopLoss": 148.50,           // Position-level stop loss
      "takeProfit": 155.00,         // Position-level take profit
      "trailingStopPips": null,     // Position-level trailing stop
      "guaranteedStop": null,       // Position-level guaranteed stop
      
      // METADATA
      "message": "Position open - 2 bracket orders active",
      "canBeClosed": true
    }
  ]
}
```

---

## 7. ACCOUNT CONFIGURATION - Bracket Support Flags

### 7.1 Required /accounts Endpoint Response

```json
{
  "s": "ok",
  "d": [
    {
      "id": "ACC-001",
      "name": "Primary Trading Account",
      "type": "live",
      "currency": "USD",
      
      // ========== ORDER TYPE SUPPORT ==========
      "supportMarketOrders": true,
      "supportLimitOrders": true,
      "supportStopOrders": true,
      "supportStopLimitOrders": true,
      
      // ========== BRACKET SUPPORT FLAGS ==========
      "supportBrackets": true,
      "supportOrderBrackets": true,
      "supportPositionBrackets": false,
      "supportMarketBrackets": true,
      "supportAddBracketsToExistingOrder": true,
      "supportModifyOrderBrackets": true,
      "supportModifyPositionBrackets": true,
      "supportIndividualPositionBrackets": false,
      
      // ========== BRACKET TYPES ==========
      "supportStopLoss": true,
      "supportTrailingStop": true,
      "supportGuaranteedStop": false,
      
      // Validation rules (from /instruments)
      "stopLossValidationRules": {
        "stopPercent": {
          "min": 0.01,
          "max": 100,
          "step": 0.01
        }
      },
      "takeProfitValidationRules": {
        "limitPercent": {
          "min": 0.01,
          "max": 100,
          "step": 0.01
        }
      }
    }
  ]
}
```

---

## 8. DATABASE SCHEMA (Implementation Reference)

### 8.1 Orders Table (Enhanced)

```sql
CREATE TABLE orders (
  -- Core order fields
  id VARCHAR(50) PRIMARY KEY,
  account_id VARCHAR(50) NOT NULL,
  instrument VARCHAR(20) NOT NULL,
  qty DECIMAL(18,8) NOT NULL,
  filled_qty DECIMAL(18,8) DEFAULT 0,
  side ENUM('buy', 'sell') NOT NULL,
  type ENUM('market', 'limit', 'stop', 'stoplimit') NOT NULL,
  status ENUM('pending', 'working', 'filled', 'canceled', 'inactive', 'rejected') NOT NULL,
  
  -- Pricing
  limit_price DECIMAL(18,8),
  stop_price DECIMAL(18,8),
  avg_price DECIMAL(18,8),
  
  -- BRACKET FIELDS [NEW]
  stop_loss_price DECIMAL(18,8),
  take_profit_price DECIMAL(18,8),
  trailing_stop_pips DECIMAL(18,8),
  guaranteed_stop_price DECIMAL(18,8),
  
  -- Parent-Child Relationships [NEW]
  parent_order_id VARCHAR(50),
  parent_order_type ENUM('order', 'position'),
  is_bracket_child BOOLEAN DEFAULT FALSE,
  
  -- Duration
  duration_type VARCHAR(20),
  expiration_time BIGINT,
  
  -- Metadata
  created_time BIGINT NOT NULL,
  updated_time BIGINT NOT NULL,
  last_modified_time BIGINT,
  message TEXT,
  transaction_id VARCHAR(100),
  
  -- Indexes
  INDEX idx_account_instrument (account_id, instrument),
  INDEX idx_parent_order (parent_order_id),
  INDEX idx_status (status),
  INDEX idx_created_time (account_id, created_time)
);
```

### 8.2 Bracket Orders Table [NEW]

```sql
CREATE TABLE bracket_orders (
  id VARCHAR(50) PRIMARY KEY,
  parent_order_id VARCHAR(50) NOT NULL,
  stop_loss_order_id VARCHAR(50),
  take_profit_order_id VARCHAR(50),
  status ENUM('active', 'partially_executed', 'completed') NOT NULL,
  created_time BIGINT NOT NULL,
  updated_time BIGINT NOT NULL,
  
  INDEX idx_parent_order (parent_order_id),
  FOREIGN KEY (parent_order_id) REFERENCES orders(id),
  FOREIGN KEY (stop_loss_order_id) REFERENCES orders(id),
  FOREIGN KEY (take_profit_order_id) REFERENCES orders(id)
);
```

---

## 9. Key Implementation Points

### 9.1 Critical Fields for Conditional Orders

**In Request:**
- `stopLoss` - Price level for stop loss execution
- `takeProfit` - Price level for take profit execution
- `trailingStopPips` - Distance for trailing stop (pips)
- `guaranteedStop` - Price for guaranteed stop

**In Response:**
- `parentId` - Links child to parent order
- `parentType` - "order" or "position"
- `status` - "inactive" means waiting for parent to fill

### 9.2 Validation Sequence

```
1. Account Configuration Check
   ├─ Does account support brackets?
   ├─ Is supportBrackets = true?
   └─ Is supportOrderBrackets = true?

2. Instrument Check
   ├─ Does instrument exist?
   ├─ Is it tradeable for this account?
   └─ Check minTick, minQty, maxQty

3. Quantity Validation
   ├─ qty >= instrument.minQty
   ├─ qty <= instrument.maxQty
   ├─ qty % instrument.qtyStep == 0
   └─ Sufficient shares for sell orders

4. Price Validation
   ├─ All prices align with minTick
   ├─ Stop Loss hierarchy correct
   ├─ Take Profit hierarchy correct
   └─ Minimum distance requirements met

5. Margin/Balance Check
   ├─ Calculate margin for all 3 orders
   ├─ Account has required margin
   └─ No account restrictions

6. Market Status Check
   ├─ Market open (if applicable)
   ├─ Instrument not halted
   └─ Exchange operational
```

---

## 10. Error Response Matrix

| Scenario | HTTP Code | errtype | Resolution |
|----------|-----------|---------|-----------|
| SL price >= entry price (buy) | 400 | `bracket_price_invalid` | Adjust SL below entry |
| TP price <= entry price (buy) | 400 | `bracket_price_invalid` | Adjust TP above entry |
| SL >= TP for any order | 400 | `bracket_price_invalid` | Fix hierarchy |
| Insufficient margin for all 3 orders | 400 | `bracket_insufficient_margin` | Reduce qty |
| Account doesn't support brackets | 403 | `bracket_not_supported` | Enable feature |
| Price not aligned with minTick | 400 | `price_precision_invalid` | Use valid price |
| Order type incompatible | 400 | `invalid_order_type` | Use market/limit/stop |
| Market closed | 400 | `market_closed` | Wait for open |
| Symbol halted | 400 | `instrument_halted` | Check status |
| Insufficient buying power | 400 | `insufficient_balance` | Deposit funds |
| Order already filled | 409 | `invalid_order_state` | Cannot modify |

---

**This specification provides the complete request/response structures needed to implement conditional orders per TradingView REST API v1.9.3 for stock trading.**