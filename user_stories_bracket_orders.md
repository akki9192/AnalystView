# User Stories: Bracket Orders Implementation
## TradingView REST API Integration for Stock Trading

**Date:** December 2025  
**Scope:** Enhance existing stock trading API with bracket/conditional order support  
**Baseline:** Single-leg stock trading API already implemented

---

## Epic: Bracket / Conditional Orders Support for Stocks

### Story 1 – Enable Bracket Capability in Accounts

**ID:** BRACKET-001  
**Story Points:** 3  
**Priority:** P0 (Blocker)

**As** a TradingView-integrated broker backend  
**I want** account capabilities to declare bracket-order support  
**So that** TradingView can enable Stop Loss / Take Profit UI for my accounts.

**Acceptance Criteria**
- [ ] `/accounts` endpoint response includes the following flags (set appropriately):
  - `supportBrackets: true`
  - `supportOrderBrackets: true`
  - `supportMarketBrackets: true` (if we support brackets on market orders)
  - `supportModifyBrackets: true`
  - `supportModifyOrderBrackets: true`
  - `supportStopLoss: true`
  - `supportStopOrders: true`
  - `supportStopLimitOrders: true`
- [ ] Optional flags are documented and correctly set based on backend capability:
  - `supportTrailingStop` (default: false)
  - `supportGuaranteedStop` (default: false)
  - `supportAddBracketsToExistingOrder` (default: true for stocks)
- [ ] TradingView UI shows bracket input fields (Stop Loss, Take Profit) only when `supportBrackets: true`
- [ ] Verified with TradingView staging environment that flags are recognized

**Testing**
- Unit test: Account response includes all required flags
- Integration test: Disable `supportBrackets` and verify TradingView UI does not show bracket fields
- Documentation: Flag behaviors documented in API docs

**Dependencies**
- None (foundational)

---

### Story 2 – Persist Bracket Attributes in Order Model

**ID:** BRACKET-002  
**Story Points:** 5  
**Priority:** P0 (Blocker)

**As** a backend engineer  
**I want** the order schema to persist bracket-related fields  
**So that** I can track parent–child relationships and bracket configuration.

**Acceptance Criteria**
- [ ] Order storage (database model) supports these new nullable fields:
  - `parentId` (string/UUID, nullable)
  - `parentType` (enum: `null` | `order` | `position`)
  - `stopPrice` (decimal, nullable) – for stop/stoplimit orders
  - `isTrailingStop` (boolean, default: false)
  - `trailingStopPips` (decimal, nullable)
- [ ] Parent orders have `parentId = null` and `parentType = null`
- [ ] Bracket orders have `parentId = <parent_order_id>` and `parentType = "order"`
- [ ] Indexes created on:
  - `parentId` (foreign key for efficient lookups)
  - Composite: `(instrument, parentType, parentId)` for bulk queries
- [ ] Migration scripts created (forward and rollback)
- [ ] Schema migration tested in dev/staging environments

**Testing**
- Unit test: ORM model loads/saves bracket fields correctly
- Integration test: Insert parent, insert brackets, verify parentId linking
- Migration test: Rollback and re-apply migration without data loss

**Dependencies**
- None (foundational)

**Technical Tasks**
- [ ] Create DB migration (add columns, indexes)
- [ ] Update ORM model (Order entity)
- [ ] Create migration rollback script
- [ ] Update database documentation

---

### Story 3 – Place Order with Brackets

**ID:** BRACKET-003  
**Story Points:** 8  
**Priority:** P0 (Blocker)

**As** a TradingView user placing a stock order  
**I want** to submit Stop Loss and Take Profit together with my entry order  
**So that** my risk and target are attached as conditional child orders.

**Acceptance Criteria**
- [ ] `POST /accounts/{accountId}/orders` request body accepts optional fields:
  - `stopLoss` (decimal, optional) – price for stop-loss bracket
  - `takeProfit` (decimal, optional) – price for take-profit bracket
- [ ] When a valid parent order is created with brackets:
  - Parent order is created and stored as normal
  - One or two child bracket orders are automatically created:
    - Side opposite to parent (buy parent → sell brackets, vice versa)
    - Quantity equal to parent quantity
    - `parentId` set to parent order ID
    - `parentType = "order"`
    - `status = "inactive"` (not yet active)
    - Type: stopLoss → `type: "stop"`, takeProfit → `type: "limit"`
- [ ] Validation rules enforced:
  - Reject if bracket prices outside instrument `stopPercent` / `limitPercent` bounds
  - Reject if bracket side would not be opposite of parent
  - Reject if bracket quantity would not match parent
  - Reject if parent order creation fails (brackets not created)
- [ ] On validation failure, return HTTP 400 with structured error:
  - Error code (e.g., `BRACKET_INVALID_PRICE`, `BRACKET_UNSUPPORTED`)
  - Human-readable message
  - Field name causing error
- [ ] Successful response includes parent order ID and all bracket order IDs
- [ ] Idempotency: Creating same order twice should not create duplicate brackets

**Testing**
- Unit test: Order with SL + TP creates two bracket orders
- Unit test: Order with only SL creates one bracket order
- Unit test: Order with no brackets creates no bracket orders
- Unit test: Brackets have opposite side and matching quantity
- Integration test: Place order, retrieve via GET /orders, verify parent + 2 brackets returned
- Negative test: Invalid bracket price rejected with proper error code
- Negative test: Unsupported bracket on account rejects gracefully

**Dependencies**
- BRACKET-001 (Account flags)
- BRACKET-002 (Order model)

**Technical Tasks**
- [ ] Add bracket request validation class
- [ ] Add bracket creation logic to order service
- [ ] Update POST /orders endpoint to parse bracket fields
- [ ] Add database transaction handling (atomic parent + brackets)
- [ ] Update API documentation with bracket request/response examples

---

### Story 4 – Activate Brackets When Parent Fills (OSO Logic)

**ID:** BRACKET-004  
**Story Points:** 5  
**Priority:** P0 (Blocker)

**As** a TradingView user  
**I want** my bracket orders to become active when the parent order fills  
**So that** my risk and targets protect/lock profits automatically.

**Acceptance Criteria**
- [ ] When a parent order transitions to `filled` status:
  - All child orders with `parentId = parent.id` and `parentType = "order"` change:
    - `status` from `inactive` → `working`
- [ ] Parent ↔ bracket link is preserved (no orphan brackets)
- [ ] Activation happens atomically with parent fill (no race conditions)
- [ ] Partial fills (if supported): brackets are activated even on partial fill
- [ ] Activation is idempotent (re-running fill logic doesn't double-activate)
- [ ] Event/log entry created when brackets activate (for audit trail)

**Testing**
- Unit test: Parent fill triggers child status update to "working"
- Integration test: Full fill via market execution activates brackets
- Integration test: Partial fill via limit execution activates brackets
- Negative test: Bracket activation fails, rollback parent fill (transaction safety)
- Stress test: Multiple orders with brackets fill concurrently

**Dependencies**
- BRACKET-003 (Bracket creation)

**Technical Tasks**
- [ ] Add bracket activation logic to order execution service
- [ ] Create database transaction for atomic parent + bracket updates
- [ ] Add event/audit log for bracket activation
- [ ] Add integration test fixtures for fill scenarios

---

### Story 5 – OCO Behavior Between Bracket Orders

**ID:** BRACKET-005  
**Story Points:** 8  
**Priority:** P0 (Blocker)

**As** a TradingView user  
**I want** only one of my brackets (SL or TP) to execute and the other to cancel  
**So that** my position is not over-closed or reversed.

**Acceptance Criteria**
- [ ] When one bracket order reaches `filled` status:
  - All sibling bracket orders with same `parentId`:
    - Status updated to `cancelled`
    - Quantity reduced to 0 (or marked as cancelled)
- [ ] On partial fill of a bracket order (if supported):
  - Sibling bracket quantity reduced by same filled amount
  - If first bracket fully fills, sibling is cancelled
- [ ] OCO enforcement is atomic (no race conditions between brackets filling)
- [ ] Parent position quantity reflects executed bracket (e.g., if SL fills, position closed)
- [ ] Event/log created for bracket cancellation (audit trail)

**Testing**
- Unit test: Bracket 1 fill → Bracket 2 cancelled
- Unit test: Bracket 2 fill → Bracket 1 cancelled
- Integration test: SL executes first, TP auto-cancels
- Integration test: TP executes first, SL auto-cancels
- Integration test: Partial bracket fill reduces sibling qty proportionally
- Stress test: Multiple brackets in system filling concurrently
- Negative test: Race condition between bracket fills (transaction handling)

**Dependencies**
- BRACKET-004 (Bracket activation)

**Technical Tasks**
- [ ] Add OCO logic to bracket execution service
- [ ] Create database transaction for atomic cancellation
- [ ] Add event logging for OCO cancellations
- [ ] Add comprehensive test fixtures for fill order variations

---

### Story 6 – Cancel Brackets When Parent is Cancelled

**ID:** BRACKET-006  
**Story Points:** 5  
**Priority:** P0 (Blocker)

**As** a TradingView user  
**I want** my brackets to be cancelled if I cancel the parent order  
**So that** no conditional orders linger without an entry.

**Acceptance Criteria**
- [ ] When `DELETE /accounts/{accountId}/orders/{orderId}` cancels a parent order:
  - All bracket orders with `parentId = parent.id` and `parentType = "order"`:
    - Transition to `cancelled` status
    - Quantity reset to 0
- [ ] When parent cancellation happens via backend events (e.g., broker risk engine):
  - Same bracket cancellation behavior enforced
- [ ] Cancellation is atomic (parent + all brackets cancelled together)
- [ ] No bracket remains `working` or `inactive` once parent is cancelled
- [ ] Event/log created for parent + bracket cancellation

**Testing**
- Unit test: Parent cancel triggers child cancel
- Integration test: User cancels order, all brackets cancelled
- Integration test: Broker engine cancels order, all brackets cancelled
- Negative test: Race condition between parent cancel and bracket fill
- Stress test: Cancel 100 orders with brackets simultaneously

**Dependencies**
- BRACKET-003 (Bracket creation)

**Technical Tasks**
- [ ] Update DELETE /orders/{id} endpoint to cascade bracket cancellation
- [ ] Add bracket cancellation logic to order service
- [ ] Create database transaction for atomic cancellation
- [ ] Update API documentation for cascade behavior

---

### Story 7 – Modify Brackets on Existing Order

**ID:** BRACKET-007  
**Story Points:** 8  
**Priority:** P1

**As** a TradingView user  
**I want** to change or remove SL/TP on an existing order  
**So that** I can adjust risk and targets without recreating the order.

**Acceptance Criteria**
- [ ] `PUT /accounts/{accountId}/orders/{orderId}` request body accepts:
  - Optional `stopLoss` (decimal)
  - Optional `takeProfit` (decimal)
- [ ] Modification behavior:
  - If bracket doesn't exist and field provided → create new bracket order
  - If bracket exists and value changed → update bracket order price
  - If bracket existed but omitted from request → cancel that bracket
  - Non-bracket fields (`qty`, `limitPrice`, `duration`) behave as today
- [ ] Validation rules (same as creation):
  - Bracket prices within `stopPercent` / `limitPercent` bounds
  - Bracket side consistent with parent
  - Bracket quantity always matches parent quantity
- [ ] Bracket modifications only allowed if parent is `working` or `inactive`:
  - Reject if parent already `filled` and `supportModifyBrackets: false`
- [ ] Modifications are atomic (all updates or none)
- [ ] Event/log created for each bracket modification

**Testing**
- Unit test: Add SL to order without brackets
- Unit test: Add TP to order that has only SL
- Unit test: Move SL higher on existing order
- Unit test: Remove TP while keeping SL
- Unit test: Update both SL and TP in one request
- Integration test: Modify active order, verify bracket updates in GET /orders
- Negative test: Invalid price rejected with error
- Negative test: Attempt modify on filled order (if not supported)

**Dependencies**
- BRACKET-003 (Bracket creation)
- BRACKET-004 (Bracket activation)

**Technical Tasks**
- [ ] Add bracket modification logic to order service
- [ ] Create database transaction for atomic updates
- [ ] Update PUT /orders/{id} endpoint to handle bracket fields
- [ ] Add bracket update validation
- [ ] Update API documentation

---

### Story 8 – Expose Brackets via GET /orders

**ID:** BRACKET-008  
**Story Points:** 5  
**Priority:** P0 (Blocker)

**As** TradingView  
**I want** to retrieve bracket orders tied to their parents  
**So that** I can render them correctly in the UI and reflect OCO/OSO state.

**Acceptance Criteria**
- [ ] `GET /accounts/{accountId}/orders` response includes:
  - Parent orders (as today)
  - Bracket orders as separate entries in response array with:
    - Unique order ID
    - `parentId` (links to parent)
    - `parentType` (set to `"order"`)
    - `status` (`inactive`, `working`, `filled`, `cancelled`)
    - `stopPrice` (for stop brackets) or `limitPrice` (for limit brackets)
    - `side` (opposite of parent)
    - `qty` (equal to parent)
- [ ] Example response (parent + 2 brackets):
  ```json
  {
    "s": "ok",
    "d": [
      {
        "id": "ORD-12345",
        "instrument": "AAPL",
        "qty": 100,
        "side": "buy",
        "type": "limit",
        "limitPrice": 150.00,
        "status": "working"
      },
      {
        "id": "ORD-12345-SL",
        "qty": 100,
        "side": "sell",
        "type": "stop",
        "stopPrice": 145.00,
        "status": "inactive",
        "parentId": "ORD-12345",
        "parentType": "order"
      },
      {
        "id": "ORD-12345-TP",
        "qty": 100,
        "side": "sell",
        "type": "limit",
        "limitPrice": 155.00,
        "status": "inactive",
        "parentId": "ORD-12345",
        "parentType": "order"
      }
    ]
  }
  ```
- [ ] Response is stable and backward-compatible (clients ignoring `parentId` still work)
- [ ] Filtering by `parentId` returns all child brackets for a parent

**Testing**
- Unit test: Query order with no brackets returns only parent
- Unit test: Query order with SL + TP returns parent + 2 brackets
- Integration test: Parent filled, retrieve orders, verify bracket statuses
- Integration test: Bracket executed, retrieve orders, verify OCO state
- Performance test: Large number of orders with brackets (pagination/performance)

**Dependencies**
- BRACKET-003 (Bracket creation)
- BRACKET-004 (Bracket activation)
- BRACKET-005 (OCO logic)

**Technical Tasks**
- [ ] Update GET /orders/{id} to include bracket queries
- [ ] Update GET /orders (list) to include brackets via JOIN
- [ ] Add pagination support (may be many brackets)
- [ ] Update API documentation with bracket response examples

---

### Story 9 – Honor Instrument Constraints for Brackets

**ID:** BRACKET-009  
**Story Points:** 5  
**Priority:** P1

**As** a risk manager  
**I want** bracket prices constrained by instrument configuration  
**So that** we avoid extreme or invalid protection levels.

**Acceptance Criteria**
- [ ] `GET /accounts/{accountId}/instruments` response exposes per-instrument limits:
  - `stopPercent.min` (e.g., 1.0% minimum distance from current price)
  - `stopPercent.max` (e.g., 50.0% maximum distance from current price)
  - `limitPercent.min` (similar for limit/TP)
  - `limitPercent.max` (similar for limit/TP)
- [ ] On `POST /orders` and bracket modifications:
  - Validate StopLoss price within bounds relative to current market price
  - Validate TakeProfit price within bounds
  - Example: For a buy order of AAPL at $150 with stopPercent.min = 1.0:
    - SL must be ≥ $148.50 (150 × 0.99)
    - SL must be ≤ $225 (150 × 1.50, assuming stopPercent.max = 50)
- [ ] On validation failure, return error with:
  - Error code: `BRACKET_INVALID_PRICE`
  - Message explaining min/max bounds
  - Actual min/max prices for that instrument
- [ ] TradingView frontend uses these bounds for client-side validation
- [ ] Backend validation independent of frontend (defense in depth)

**Testing**
- Unit test: Valid bracket price accepted
- Unit test: SL too close to entry rejected with proper bounds in error
- Unit test: TP too far from entry rejected with proper bounds in error
- Unit test: Different instruments have different constraints
- Integration test: Validate constraints match instrument data

**Dependencies**
- BRACKET-003 (Bracket creation)
- BRACKET-007 (Bracket modification)

**Technical Tasks**
- [ ] Add `stopPercent` and `limitPercent` fields to instrument model (if not already present)
- [ ] Add bracket price validation logic with instrument constraints
- [ ] Update POST and PUT endpoints to enforce validation
- [ ] Update API documentation with validation rules and error examples

---

### Story 10 – Update Config Dependencies for Bracket Calculations

**ID:** BRACKET-010  
**Story Points:** 3  
**Priority:** P1

**As** TradingView  
**I want** to know that brackets affect order info calculations  
**So that** P&L and risk estimates stay in sync with SL/TP changes.

**Acceptance Criteria**
- [ ] `GET /config` (or `/config?locale=...`) response includes in `orderInfoConfig.dependencies`:
  - Add `"brackets"` to the dependencies array
  - Example: `["qty", "side", "price", "duration", "brackets"]`
- [ ] After this change, TradingView recalculates estimated P&L when:
  - User changes SL price
  - User changes TP price
  - User adds/removes brackets
- [ ] Backward compatibility maintained (clients without bracket support ignore the field)
- [ ] Documentation updated with what each dependency means

**Testing**
- Unit test: Config endpoint includes "brackets" in dependencies
- Integration test: Modify SL in UI, P&L estimate updates

**Dependencies**
- BRACKET-003 (Bracket creation)

**Technical Tasks**
- [ ] Update GET /config endpoint to include "brackets" in dependencies
- [ ] Verify TradingView recognizes and acts on this change
- [ ] Update API documentation

---

### Story 11 – Cancel All Should Handle Brackets

**ID:** BRACKET-011  
**Story Points:** 5  
**Priority:** P1

**As** a TradingView user  
**I want** `Cancel All` to cancel both parent and bracket orders  
**So that** no conditional orders remain after a global cancel.

**Acceptance Criteria**
- [ ] `POST /accounts/{accountId}/orders/cancelAll` endpoint behavior:
  - Cancels all `working` and `inactive` orders, including brackets
  - Ensures no bracket is left `inactive` or `working` after the call
- [ ] Behavior is consistent regardless of cancellation order (parent first or bracket first)
- [ ] Atomicity: All orders cancelled or none cancelled (transaction safety)
- [ ] Response includes count of cancelled parent orders and bracket orders
- [ ] Idempotency: Calling twice doesn't error (second call cancels nothing)

**Testing**
- Unit test: Cancel all with mix of parent + bracket orders
- Integration test: Large portfolio with many bracketed orders
- Negative test: Race condition during cancel all (concurrent fills)
- Stress test: 1000 orders with brackets, cancel all simultaneously

**Dependencies**
- BRACKET-006 (Bracket cancellation)

**Technical Tasks**
- [ ] Update POST /orders/cancelAll to cascade bracket cancellation
- [ ] Add database transaction for atomic multi-order cancellation
- [ ] Update API response to include bracket cancellation counts

---

### Story 12 – Error Handling and Logging for Brackets

**ID:** BRACKET-012  
**Story Points:** 5  
**Priority:** P2

**As** a support engineer  
**I want** clear errors and logs for bracket-related failures  
**So that** I can quickly debug and assist users.

**Acceptance Criteria**
- [ ] API returns descriptive error codes and messages for:
  - `BRACKET_INVALID_PRICE` – Price outside allowed range
  - `BRACKET_UNSUPPORTED` – Feature not enabled (`supportBrackets: false`)
  - `BRACKET_PARENT_NOT_FOUND` – Parent order doesn't exist
  - `BRACKET_INVALID_SIDE` – Bracket side not opposite of parent
  - `BRACKET_INVALID_QTY` – Bracket quantity doesn't match parent
  - `BRACKET_PARENT_FILLED` – Cannot modify brackets on filled parent (if applicable)
  - `OCO_CONFLICT` – Both brackets tried to execute simultaneously
- [ ] All bracket-related API requests logged with:
  - Account ID
  - Order ID (if applicable)
  - Instrument
  - Request payload (sanitized of sensitive data)
  - Response status
  - Timestamp
- [ ] Errors include helpful context:
  - Actual price provided vs. min/max allowed
  - Instrument constraints
  - Account capability flags
- [ ] Errors can be searched in logs by order ID for support debugging
- [ ] Critical errors (e.g., OCO_CONFLICT, transaction failures) trigger alerts

**Testing**
- Unit test: Each error code returns expected HTTP status and message
- Integration test: Log entries created for all bracket operations
- Log verification: Errors searchable by order ID and timestamp

**Dependencies**
- BRACKET-003 through BRACKET-011 (all stories)

**Technical Tasks**
- [ ] Create error code enum / constants
- [ ] Add structured logging for bracket operations
- [ ] Update API documentation with error code reference table
- [ ] Configure alerting for critical bracket errors
- [ ] Create runbook for common bracket support issues

---

## Story Dependencies and Implementation Order

### Phase 1: Foundation (Weeks 1–2)
1. **BRACKET-001** – Account flags (enables UI detection)
2. **BRACKET-002** – Order model persistence (enables storage)

### Phase 2: Core Bracket Operations (Weeks 2–3)
3. **BRACKET-003** – Place order with brackets
4. **BRACKET-008** – Get orders (retrieve brackets)
5. **BRACKET-009** – Instrument constraints (validation)

### Phase 3: Bracket Lifecycle (Weeks 3–4)
6. **BRACKET-004** – Bracket activation (OSO)
7. **BRACKET-005** – OCO logic (mutual cancellation)
8. **BRACKET-006** – Cancel parent cancels brackets

### Phase 4: Advanced Operations (Weeks 4–5)
9. **BRACKET-007** – Modify brackets
10. **BRACKET-011** – Cancel all with brackets
11. **BRACKET-010** – Config dependencies (UI integration)

### Phase 5: Polish (Weeks 5–6)
12. **BRACKET-012** – Error handling & logging

---

## Effort Estimation

| Phase | Stories | Total Points | Estimated Duration |
|-------|---------|--------------|-------------------|
| Phase 1 | 2 | 8 | 2 weeks |
| Phase 2 | 3 | 18 | 2 weeks |
| Phase 3 | 3 | 18 | 2 weeks |
| Phase 4 | 3 | 16 | 2 weeks |
| Phase 5 | 1 | 5 | 1 week |
| **TOTAL** | **12** | **65** | **~6–8 weeks** |

**Additional Time (not in story points):**
- TradingView integration testing: 2–4 weeks (in parallel with Phases 3–5)
- User documentation: 1 week
- Production monitoring & hotfixes: 1 week

**Total Project Timeline: 8–12 weeks** (including integration testing)

---

## Definition of Done

For each story to be marked complete:
- [ ] All acceptance criteria met
- [ ] Code reviewed and approved by 2+ engineers
- [ ] Unit tests written and passing (>80% coverage)
- [ ] Integration tests passing
- [ ] API documentation updated
- [ ] No regressions in existing functionality
- [ ] Changes tested with TradingView staging
- [ ] Performance benchmarks met (no slowdown)
- [ ] Security reviewed (no input injection vectors)
- [ ] Logged in CHANGELOG

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Race condition in OCO logic | Medium | High | Use database transactions + pessimistic locking for bracket fills |
| TradingView API change | Low | Medium | Maintain close communication with TradingView; test staging early |
| Performance degradation with brackets | Medium | Medium | Index `parentId`; test with 10K+ orders; profile queries |
| Edge case: partial fills | High | High | Comprehensive unit test suite; simulate edge cases |
| User confusion (inactive brackets) | High | Low | Clear UI labels ("Awaiting entry"); in-app tooltips |

---

## Success Metrics

- [ ] Bracket orders placed successfully 95%+ of the time
- [ ] OCO/OSO state transitions accurate 99.9%+ of the time
- [ ] No data loss during parent + bracket operations
- [ ] TradingView integration passes certification
- [ ] Support ticket volume for "confusing bracket behavior" < 5/month
- [ ] API response time < 200ms for bracket operations (p95)
- [ ] Zero critical bugs post-launch (first 4 weeks)

---

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Status:** Ready for Sprint Planning

---

## Appendix: Reference Links

- **TradingView REST API Spec:** https://www.tradingview.com/rest-api-spec/
- **Broker API Docs:** https://www.tradingview.com/broker-api-docs/
- **Concepts Page:** https://www.tradingview.com/broker-api-docs/trading/concepts
- **Bracket Orders Tutorial:** https://www.tradingview.com/charting-library-docs/latest/trading_terminal/trading-concepts/brackets/
- **Original Implementation Report:** (Include link to the technical specification document)

---

## Glossary

- **Bracket Order** – A parent order with two associated child orders (Stop Loss and/or Take Profit)
- **OCO (One-Cancels-Other)** – When one bracket executes, the other is automatically cancelled
- **OSO (One-Send-Other)** – When the parent order fills, child brackets become active
- **Stop Loss** – A protective order that sells (or buys back) at a specified price to limit losses
- **Take Profit** – An order that sells (or buys back) at a specified price to lock in gains
- **Inactive Status** – A bracket order waiting for the parent to fill; not yet exposed to market
- **Working Status** – An active order exposed to the market and eligible to execute
- **Trailing Stop** – A stop that dynamically follows the price upward (advanced feature)
- **parentId** – Database field linking a bracket order to its parent order
- **parentType** – Field indicating whether parent is an order or position (`"order"` for stocks)

---

**End of Document**
