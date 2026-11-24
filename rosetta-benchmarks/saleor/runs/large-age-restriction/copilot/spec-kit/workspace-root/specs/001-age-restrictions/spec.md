# Feature Specification: Age-Restricted Products

**Feature Branch**: Not created (no pre-specification branch hook configured)

**Created**: 2026-10-27

**Status**: Draft

**Input**: Customer birthdays, age-restricted products, a store-wide minimum age, and protected age eligibility.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Buy an Age-Restricted Product (Priority: P1)

As a Customer, I provide my Birthday and can complete a purchase containing an Age-restricted product only when I meet the store Minimum age.

**Why this priority**: Preventing prohibited sales is the feature's primary business and compliance value.

**Independent Test**: A signed-in Customer who meets the Minimum age can add and purchase an Age-restricted product, while an underage Customer cannot.

**Acceptance Scenarios**:

1. **Given** an Age-restricted product and a signed-in Customer who meets the Minimum age today, **When** the Customer adds or updates its checkout line, **Then** the checkout remains eligible to complete.
2. **Given** an Age-restricted product and a Customer who does not meet the Minimum age today, **When** the Customer adds or updates its checkout line, **Then** the line is rejected with a clear age-requirement message.
3. **Given** an Age-restricted product and a signed-in Customer with no Birthday, **When** the Customer adds or updates its checkout line, **Then** the line is rejected and the Customer is asked to provide a Birthday.
4. **Given** an Age-restricted product and a guest Customer, **When** the guest attempts to add or update its checkout line, **Then** the line is rejected and the storefront asks the guest to sign in.
5. **Given** an eligible checkout that contains an Age-restricted product, **When** the Customer completes it, **Then** eligibility is evaluated again and completion proceeds only if the Customer still meets the Minimum age.

---

### User Story 2 - Manage Age Restrictions (Priority: P2)

As authorized staff, I can mark a Product as Age-restricted and manage the store-wide Minimum age so that sales rules reflect the store's requirements.

**Why this priority**: Staff must be able to apply age controls before restricted products can be sold safely.

**Independent Test**: A product manager marks a Product as Age-restricted, and a staff member with site-settings permission changes the Minimum age; both saved settings affect later eligibility checks.

**Acceptance Scenarios**:

1. **Given** a Product has no Age-restricted flag, **When** authorized product-management staff enable the flag and save, **Then** later eligibility checks apply the store Minimum age to that Product.
2. **Given** an Age-restricted product, **When** authorized product-management staff disable the flag and save, **Then** later eligibility checks do not apply an age restriction to that Product.
3. **Given** a staff member with site-settings permission, **When** they set a valid Minimum age in the dashboard and save, **Then** the new store-wide value applies to all later eligibility checks.
4. **Given** a staff member without site-settings permission, **When** they attempt to change the Minimum age, **Then** the change is denied.

---

### User Story 3 - Maintain a Private Birthday (Priority: P3)

As a Customer, I can add or correct my Birthday privately so that eligibility for Age-restricted products is assessed accurately.

**Why this priority**: Customers need a straightforward way to supply the information required for restricted purchases.

**Independent Test**: A signed-in Customer saves a valid Birthday, sees it in their own account, and no other non-super-admin user can view or change it.

**Acceptance Scenarios**:

1. **Given** a signed-in Customer is viewing their own account, **When** they provide a valid Birthday and save, **Then** the Birthday is stored, shown only in their own account, and the change is audit-logged without its value.
2. **Given** a Customer enters a future date or an invalid date, **When** they try to save their Birthday, **Then** the change is rejected with a clear validation message.
3. **Given** a super-admin, **When** they view or change a Customer's Birthday, **Then** the action is audit-logged without the Birthday value.
4. **Given** staff with customer-management permission, **When** they view a Customer, **Then** they see only that Customer's age-eligibility status and never the Birthday or age.

### Edge Cases

- A Customer who turns the Minimum age today is eligible today.
- A Customer born on 29 February becomes eligible on 1 March in a non-leap year.
- The calendar day used for eligibility is the current date in the shop's time zone; dates, not times, are compared.
- A Customer changes their Birthday or staff change the Minimum age after a checkout line is added; eligibility is reassessed at checkout completion.
- An existing Product with an empty Age-restricted flag remains unrestricted.
- A guest cannot complete a checkout containing an Age-restricted product, even if a restricted line reached the checkout through an earlier state.
- The age-eligibility status is null for people other than the Customer currently being viewed; it never exposes an age or Birthday.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow authorized product-management staff to set or clear an Age-restricted flag for each Product; the flag is empty by default and an empty flag means the Product is unrestricted.
- **FR-002**: The system MUST maintain one store-wide Minimum age, defaulting to 18, as a persistent site setting; only staff with site-settings permission may change it in the dashboard, and a change applies to all later eligibility checks.
- **FR-003**: The system MUST allow a signed-in Customer to add, view, and update their own Birthday; only a super-admin may view or update another Customer's Birthday.
- **FR-004**: The system MUST accept only valid Birthdays that are not in the future, comparing dates rather than times.
- **FR-005**: The system MUST maintain one persistent shop time-zone site setting, defaulting to UTC, and use its current date as “today” for all age-eligibility calculations.
- **FR-006**: The system MUST determine eligibility by comparing the Customer's Birthday with the store Minimum age using calendar dates; a Customer who reaches the Minimum age today is eligible today, and a Customer born on 29 February reaches it on 1 March in a non-leap year.
- **FR-007**: The system MUST evaluate eligibility whenever a line for an Age-restricted product is added to or updated in a checkout, and reject an ineligible line with a clear message.
- **FR-008**: The system MUST reject a guest Customer's attempt to add or update a checkout line for an Age-restricted product and direct the storefront to ask the guest to sign in.
- **FR-009**: The system MUST evaluate all Age-restricted products again when checkout completion is attempted, using the current Minimum age and Customer Birthday; this completion-time evaluation is authoritative and MUST block an ineligible or guest checkout.
- **FR-010**: The system MUST leave purchasing behavior unchanged for Products whose Age-restricted flag is empty.
- **FR-011**: The system MUST expose a yes-or-no age-eligibility status only to the Customer who owns the account and to staff with the `MANAGE_USERS` permission; it MUST be true when the Customer meets the store Minimum age today, false when they do not, and null for every other viewer.
- **FR-012**: The age-eligibility status MUST reveal neither a Birthday nor an age, and the system MUST not expose a Birthday in any public profile, unauthenticated access, public interface, webhook payload, export, or application integration, including integrations with customer-management permission.
- **FR-013**: The system MUST audit-log every Birthday change and every staff read of a Birthday or age-eligibility status with only the actor, time, and action; audit records MUST never include the Birthday value and may be viewed only by super-admins.
- **FR-014**: The system MUST allow guest Customers to browse and view Age-restricted products while preventing them from purchasing those products until they sign in.

### Key Entities

- **Product**: A sellable catalog item with an optional Age-restricted flag.
- **Customer**: An account holder with an optional Birthday and an age-eligibility status.
- **Birthday**: A private calendar date associated with a Customer and used only to establish age eligibility.
- **Minimum age**: The store-wide minimum number of years, held in site settings and applied to every Age-restricted product.
- **Age-restricted product**: A Product whose Age-restricted flag is set.
- **Age eligibility**: A private yes-or-no status for permitted viewers, derived from the Customer's Birthday, the Minimum age, and today in the shop's time zone; it is null for all other viewers.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance testing, 100% of checkout attempts containing an Age-restricted product are blocked for guests, Customers without a Birthday, and Customers below the Minimum age.
- **SC-002**: In acceptance testing, 100% of Customers who meet the Minimum age can complete checkouts containing Age-restricted products, including on the day they reach that age.
- **SC-003**: In acceptance testing, 100% of eligibility-changing events between checkout line entry and completion are caught by the authoritative completion-time check.
- **SC-004**: Staff with the required permissions can set an Age-restricted flag or update the Minimum age in under one minute, and the changed Minimum age governs every subsequent eligibility check.
- **SC-005**: In privacy testing, 100% of Birthday reads, Birthday changes, and staff reads of the age-eligibility status conform to the specified access and audit rules, and no prohibited output includes a Birthday.
- **SC-006**: In regression testing, 100% of purchases containing only Products without an Age-restricted flag remain unaffected by age-verification rules.

## Assumptions

- An Age-restricted flag is set independently for each Product; existing Products have an empty flag and are unrestricted until it is set.
- The Minimum age is one persistent store setting, defaults to 18, and applies to all Age-restricted products rather than being set per Product.
- “Today” means the current calendar date in the shop's time zone, which is a persistent site setting that defaults to UTC; times do not affect age eligibility.
- A Customer may update their own Birthday, and the most recently saved valid value is used for future eligibility checks.
- Existing permission roles determine product management, site-settings permission, customer-management permission, and super-admin status.
- Guest Customers may browse and view Age-restricted products but must sign in before attempting to buy one.
- Identity-document verification and regional legal-age rules are outside this feature's scope.
