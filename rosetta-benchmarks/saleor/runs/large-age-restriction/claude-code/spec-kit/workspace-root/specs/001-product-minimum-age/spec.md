# Feature Specification: Product Minimum Age Restriction

**Feature Branch**: `001-product-minimum-age`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "Some of our products can only be sold to customers above a certain age (alcohol, tobacco, etc.). Staff need to be able to mark a product with a minimum age. Customers who are too young shouldn't be able to buy those products. To make this work, the customer profile should have a birthday field. Definition of done: the feature is fully implemented end to end, tests are in place, and everything passes locally."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Staff mark a product with a minimum age (Priority: P1)

A staff member editing a product can set a minimum customer age (e.g. 18 or 21) or leave it empty for unrestricted products. The value is saved with the product and shown when the product is viewed again.

**Why this priority**: Without a way to flag products, no restriction can be enforced; this is the foundation of the feature.

**Independent Test**: Edit a product, set a minimum age of 18, save, reopen the product and confirm 18 is shown; clear it and confirm the product is unrestricted.

**Acceptance Scenarios**:

1. **Given** a product with no age restriction, **When** staff set its minimum age to 18 and save, **Then** the product shows a minimum age of 18.
2. **Given** a restricted product, **When** staff clear the minimum age and save, **Then** the product is unrestricted.
3. **Given** a staff member entering a minimum age, **When** they enter a negative number, zero, or a non-whole number, **Then** the system rejects it with a clear error and nothing is saved.

---

### User Story 2 - Customers record their birthday (Priority: P1)

A customer (or staff on their behalf) can add and update a birthday on the customer profile. The birthday is optional in general and is used to determine eligibility for age-restricted products.

**Why this priority**: Age cannot be verified without a birthday; it is required for enforcement.

**Independent Test**: Set a birthday on a customer profile, reload it and confirm it is retained; try a future date and confirm it is rejected.

**Acceptance Scenarios**:

1. **Given** a customer without a birthday, **When** they or staff save a valid past date as birthday, **Then** the profile shows that birthday.
2. **Given** a customer profile, **When** a birthday in the future is submitted, **Then** it is rejected with a clear error.
3. **Given** a customer with a birthday, **When** the birthday is cleared, **Then** the profile has no birthday.

---

### User Story 3 - Underage customers cannot buy restricted products (Priority: P1)

When a customer tries to add a restricted product to their cart or complete checkout, the system compares their age (today minus birthday) with the product's minimum age. Customers who are too young, or who have no birthday on file, are blocked with an explanatory message. Eligible customers buy as normal.

**Why this priority**: This is the business purpose of the feature (legal/compliance protection).

**Independent Test**: With a product restricted to 18, attempt checkout as a 17-year-old (blocked), as an 18-year-old (allowed), and as a customer without a birthday (blocked).

**Acceptance Scenarios**:

1. **Given** a product with minimum age 18 and a customer aged 17, **When** they try to purchase it, **Then** the purchase is refused with a message that the product is age-restricted.
2. **Given** the same product and a customer who turns 18 today, **When** they purchase it, **Then** the purchase succeeds.
3. **Given** a restricted product and a customer with no birthday, **When** they try to purchase it, **Then** the purchase is refused with a message asking them to add their birthday.
4. **Given** a cart containing both restricted and unrestricted items and an ineligible customer, **When** they check out, **Then** checkout is refused and the message identifies the restricted items.
5. **Given** an unrestricted product, **When** any customer buys it, **Then** no age check applies.

---

### Edge Cases

- A customer who becomes eligible on their birthday: eligibility is evaluated at the time of purchase, so a purchase made the day before the birthday fails and the day of succeeds.
- A customer changes their birthday after adding items to the cart: eligibility is re-checked at checkout using the current birthday.
- A product's minimum age is raised after being placed in a cart: the check at checkout uses the current value.
- Guest checkout (no customer profile): treated as having no birthday, so restricted products cannot be bought.
- Leap-day birthdays (29 February): age is counted by completed years; in non-leap years the birthday is treated as occurring on 1 March.
- Products with variants: the minimum age applies to the product and therefore to all of its variants.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Staff MUST be able to set, change, and clear a minimum age on a product.
- **FR-002**: The minimum age MUST be a positive whole number; invalid values MUST be rejected with a clear error.
- **FR-003**: Products without a minimum age MUST remain unrestricted and behave as before.
- **FR-004**: The customer profile MUST support an optional birthday that can be set, changed and cleared.
- **FR-005**: A birthday MUST be a valid calendar date that is not in the future; otherwise it MUST be rejected with a clear error.
- **FR-006**: The system MUST refuse to add a restricted product to a cart, and to complete checkout, when the customer's age is below the product's minimum age.
- **FR-007**: The system MUST refuse the purchase of a restricted product when the customer has no birthday on file, including guests.
- **FR-008**: Customer age MUST be computed in completed years as of the moment of purchase.
- **FR-009**: Refusal messages MUST state that the product is age-restricted and, where relevant, which items are affected or that a birthday is needed.
- **FR-010**: Eligibility MUST be re-evaluated at checkout completion using the current birthday and current product minimum age, so earlier cart contents cannot bypass the check.
- **FR-011**: Existing customers and products MUST be unaffected by the introduction of the new fields (no restriction and no birthday by default).
- **FR-012**: Staff MUST be able to view and edit a customer's birthday, and the birthday MUST be treated as personal data visible only to the customer and authorized staff.

### Key Entities

- **Product**: Gains an optional minimum age (whole years). Applies to all variants of the product.
- **Customer profile**: Gains an optional birthday (calendar date). Used to compute age at purchase time.
- **Cart / Checkout**: An order-in-progress; subject to the age eligibility check for each restricted item it contains.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of attempts by under-age or birthday-less customers to complete a purchase containing a restricted product are refused.
- **SC-002**: 100% of purchases by eligible customers (at or above the minimum age) of restricted products succeed.
- **SC-003**: Staff can set or clear a product's minimum age in under 30 seconds.
- **SC-004**: A customer can add their birthday to their profile in under 1 minute.
- **SC-005**: Purchases of unrestricted products show no change in behavior relative to before the feature.

## Assumptions

- The minimum age is a single whole number of years per product, applied to all its variants; per-country legal differences are out of scope.
- Birthday verification (proof of identity or age) is out of scope; the stored birthday is trusted as entered.
- Guest customers have no birthday and therefore cannot purchase restricted products; collecting a birthday during guest checkout is out of scope.
- The check happens at add-to-cart and again at checkout completion; orders already placed are not retroactively affected.
- The existing staff permissions for editing products and customers govern who may edit the new fields.
- The feature is delivered end to end across the existing back end, staff dashboard, and storefront, with automated tests, all passing locally.
- In the storefront checkout, the "birthday required" refusal is shown as plain text without a link to the profile page, because the checkout error area renders text only; the product page message does include the link.
- Products are created in the dashboard with a name and type only, and every other product field (including the minimum age) is set on the product edit page, so the create dialog has no minimum-age field.
- The storefront product page names no item in its age-restriction message because the message is shown on the page of the product being added; the checkout completion message lists the affected products by name.
