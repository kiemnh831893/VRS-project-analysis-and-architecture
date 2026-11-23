# Phase 4A — Requirement Traceability Matrix (RTM)

**Source of truth:** `docs/specification/Vehicle_Rental_System11.docx` (extracted text: section 1.3, 37 functional requirements and section 1.4 business rules).
**Code baseline:** `apps/api/src`, `apps/web/src`, `apps/api/prisma/schema.prisma`, migration `20261123181556_init_phase1_schema`.
**Date:** 2026-11-24.

## Classification rules

- **Implemented** — an endpoint/UI exists and enforces the requirement end-to-end with real data.
- **Partially Implemented** — a concrete part exists (DB fields, an API, or a UI), but at least one mandatory element from the specification is missing.
- **Not Implemented** — no application code or endpoint implements the requirement (a Prisma model alone does not count).

## Matrix

| ID | Requirement (short) | Status | Evidence / reason |
|---|---|---|---|
| FR-GST-01 | Register customer; validate format + uniqueness | **Implemented** | `api/src/routes/auth.routes.ts:23`; `api/src/services/auth.service.ts:79`; Zod schema; tests `tests/api.test.ts` (registration/duplicate cases). |
| FR-GST-02 | Public vehicle search/filter + date availability | **Implemented** | `api/src/routes/vehicle.routes.ts:22`; `api/src/services/vehicle.service.ts:210-273` (brand, category, transmission, price, seats, half-open date overlap); free-text `search` added to catalog schema/service; `web/src/pages/VehicleCatalogPage.tsx`; frontend workflow test verifies `search=Vios` reaches the real catalog endpoint. |
| FR-GST-03 | View terms, deposit policy, insurance packages, opening hours, branches | **Partially Implemented** | Public branch list only: `api/src/routes/branch.routes.ts:19,33`; `web/pages/VehicleCatalogPage.tsx` shows category/deposit rate. No terms/insurance-packages/opening-hours page exists. |
| FR-GST-04 | Login, role-based routing, invalid/locked message | **Implemented** | `api/src/routes/auth.routes.ts:33`; `api/src/services/auth.service.ts:130-170`; `web/src/contexts/AuthContext.tsx`; `web/src/pages/RoleHomeRedirect.tsx`; `web/src/pages/LoginPage.tsx`. Auth middleware now rejects locked accounts on every request; security test covers expired/malformed/locked tokens. |
| FR-CUS-01 | Customers can use guest functions | **Implemented** | Public catalog/detail/branch endpoints need no token; customer nav in `web/src/components/Navbar.tsx`. |
| FR-CUS-02 | View/update profile, avatar, phone, address, license upload | **Partially Implemented** | `schema.prisma` User has `avatarKey`, `address`; Customer has `driverLicenseNo`, `licenseImageKey`, `licenseStatus`. No profile update or license-upload endpoint/UI exists; tests set license fields directly via Prisma (`tests/phase2c.test.ts:127`). |
| FR-CUS-03 | Verified-license booking with dates, optional insurance, overlap prevention | **Partially Implemented** | `api/src/services/booking.service.ts:53-215` enforces verified license, dates, unpaid fines, one-way ban, and DB exclusion constraint (migration `bookings_vehicle_no_overlap`). `insurancePackageId` is accepted, but no package is seeded and the frontend booking form does not expose insurance selection. |
| FR-CUS-04 | Submit rental-extension request | **Not Implemented** | `ExtensionRequest` model exists in `schema.prisma`; no route/service/UI. `contract.service.ts:158` only reads the relation. |
| FR-CUS-05 | Approve extension with validation | **Not Implemented** | No extension decision endpoint; only the approved Phase 1 design comment exists in schema header. |
| FR-CUS-06 | Rental history: active, completed, dates, booking status | **Implemented** | `api/src/routes/booking.routes.ts:24`; `api/src/routes/contract.routes.ts:55,71,85`; `web/src/pages/MyBookingsPage.tsx`, `DashboardPage.tsx`, `StaffContractsPage.tsx`. Customer ownership enforced in `booking.service.ts`/`contract.service.ts`; security test verifies cross-customer reads return 403. |
| FR-CUS-07 | Detailed invoices and fines | **Implemented** | `api/src/routes/invoice.routes.ts:21`; `api/src/routes/fine.routes.ts`; `api/src/services/fine.service.ts`; `web/src/pages/BookingDetailPage.tsx`, `StaffContractDetailPage.tsx`. Invoice reads now check contract ownership; security test verifies isolation and PDF download authorization. |
| FR-CUS-08 | Online payment of deposits/invoices/fines | **Partially Implemented** | `api/src/services/payment.service.ts` supports `CASH` and `SIMULATED_ONLINE`; no real bank/e-wallet gateway integration (explicitly deferred). |
| FR-CUS-09 | Download signed contract and payment receipts as PDF | **Partially Implemented** | `api/src/services/document.service.ts`, `api/src/routes/contract.routes.ts:133` generate/download PDFs on demand; no stored signed artifact or payment-receipt PDF endpoint. |
| FR-STF-01 | Add vehicle (plate, brand, model, type, year, transmission, seats, rate, mileage) | **Implemented** | `api/src/routes/vehicle.routes.ts:93`; `api/src/services/vehicle.service.ts:37-79`; `web/src/pages/StaffVehicleFormPage.tsx`. |
| FR-STF-02 | Edit vehicle and daily rate | **Implemented** | `api/src/routes/vehicle.routes.ts:108`; `api/src/services/vehicle.service.ts` update path; direct `status` edits now follow the allowed transition table. |
| FR-STF-03 | Classify vehicles and assign deposit rate | **Implemented** | `api/src/routes/vehicleCategory.routes.ts:39,54`; `schema.prisma` `VehicleCategory.depositRate`; `web/src/pages/AdminVehicleCategoriesPage.tsx`. |
| FR-STF-04 | Assign parking location / branch | **Implemented** | `api/src/services/vehicle.service.ts:43-57,64` validates parking location belongs to branch; `vehicle.routes.ts` accepts `branchId`, `parkingLocationId`. |
| FR-STF-05 | Set MAINTENANCE / RETIRED | **Implemented** | `api/src/routes/vehicle.routes.ts:123`; `ALLOWED_TRANSITIONS` in `vehicle.service.ts:4-9`; catalog excludes these states. |
| FR-STF-06 | Handover via QR/booking code, mileage, fuel → RENTED | **Implemented** | `api/src/routes/contract.routes.ts:94`; `api/src/services/contract.service.ts`; QR returned with deposit confirmation (`payment.service.ts`); `web/src/pages/StaffHandoverPage.tsx`. |
| FR-STF-07 | Return by plate/contract ID, final mileage, status update | **Implemented** | `api/src/routes/contract.routes.ts:109`; `api/src/services/return.service.ts`; `web/src/pages/StaffReturnPage.tsx`. `GET /api/contracts` now includes pickup inspections so the return form can pre-fill mileage/fuel; frontend test covers this workflow. |
| FR-STF-08 | Record return condition and fuel level | **Implemented** | `api/src/routes/inspection.routes.ts:23`; `api/src/services/inspection.service.ts`; `schema.prisma` `VehicleInspection`. |
| FR-STF-09 | Create violation report and fine | **Implemented** | `api/src/routes/fine.routes.ts:22,37`; `api/src/services/fine.service.ts`; rates from `fine_rules`. |
| FR-STF-10 | Record counter/deposit-deducted payments | **Implemented** | `api/src/routes/payment.routes.ts:20`; `api/src/routes/invoice.routes.ts:30,49`; `api/src/services/payment.service.ts`, `invoice.service.ts`. |
| FR-STF-11 | Review/approve/reject driver-license request | **Not Implemented** | `Customer.licenseStatus` exists, but no review endpoint/UI; tests update it directly via Prisma. |
| FR-STF-12 | Staff lock/unlock customer account | **Partially Implemented** | `PATCH /api/users/:id/status` in `user.routes.ts:53` supports ACTIVE/LOCKED and blocks ADMIN targets, but it is ADMIN-only and has no staff UI. |
| FR-STF-13 | Periodic fleet inventory checks | **Not Implemented** | `InventoryCheck`/`InventoryCheckItem` models only; no API/UI/job. |
| FR-ADM-01 | Create/edit/lock staff accounts | **Implemented** | `api/src/routes/user.routes.ts:15-53`; `api/src/services/user.service.ts`; `web/src/pages/AdminStaffPage.tsx`; tests `tests/admin.test.ts`. |
| FR-ADM-02 | Define roles and granular permissions (RBAC) | **Partially Implemented** | Fixed roles `CUSTOMER/STAFF/ADMIN` in `schema.prisma` and `requireRole(...)` in `api/src/middleware/auth.ts:24`. No permission table, role editor, or per-action permission assignment. |
| FR-ADM-03 | Configure deposit rate, max rental days, overdue fines, booking expiry | **Implemented** | Deposit rate via `VehicleCategory.depositRate` (`vehicleCategory.routes.ts:39,54`); `MAX_RENTAL_DAYS`/`PENDING_BOOKING_TTL_MINUTES` read in `booking.service.ts:69-76,151`; fines via `fineRule.routes.ts`; admin UI `AdminSystemConfigPage.tsx`, `AdminFineRulesPage.tsx`. |
| FR-ADM-04 | View/export charts: utilization, revenue, new customers, fines | **Partially Implemented** | JSON report endpoints `api/src/routes/report.routes.ts`; tables in `web/src/pages/AdminReportsPage.tsx`. No charts and no CSV/PDF export. |
| FR-ADM-05 | Database backups | **Not Implemented** | No backup endpoint/job/script in application code. |
| FR-ADM-06 | Restore from backup | **Not Implemented** | No restore endpoint/job/script in application code. |
| FR-ADM-07 | View audit logs (login, price/status, config changes) | **Implemented** | `api/src/routes/auditLog.routes.ts` (read-only, paginated/filtered); DB trigger blocks UPDATE/DELETE; `web/src/pages/AdminAuditLogsPage.tsx`. Login failures recorded in `auth.service.ts:164`; security test proves DB-level immutability. |
| FR-SYS-01 | Hourly overdue scan + accumulated late fees | **Partially Implemented** | `RentalContract.status = OVERDUE` exists in the enum; late fees are calculated at return (`fine.service.ts`). No scheduler job scans contracts hourly. |
| FR-SYS-02 | Automatic email/SMS/in-app notifications | **Not Implemented** | `Notification` model only; no delivery service or in-app endpoint. |
| FR-SYS-03 | Auto-cancel unpaid pending booking after 30 min | **Partially Implemented** | Lazy per-vehicle expiry inside booking creation (`booking.service.ts:159-173`), manual `POST /api/bookings/expire-pending` (`booking.routes.ts:47`), TTL configurable. No background scheduler. |
| FR-SYS-04 | Automatically log important staff/admin actions | **Partially Implemented** | Audit rows created on login failure, fines, payments, invoices, handover, return, account lock/unlock (`auth.service.ts`, `fine.service.ts`, `payment.service.ts`, `invoice.service.ts`, `contract.service.ts`, `return.service.ts`, `user.service.ts`). Not every admin action (e.g., config/fine-rule create/edit, branch/category changes) is logged. |

## Summary

| Status | Count | IDs |
|---|---|---|
| Implemented | 19 | FR-GST-01, FR-GST-02, FR-GST-04, FR-CUS-01, FR-CUS-06, FR-CUS-07, FR-STF-01, FR-STF-02, FR-STF-03, FR-STF-04, FR-STF-05, FR-STF-06, FR-STF-07, FR-STF-08, FR-STF-09, FR-STF-10, FR-ADM-01, FR-ADM-03, FR-ADM-07 |
| Partially Implemented | 11 | FR-GST-03, FR-CUS-02, FR-CUS-03, FR-CUS-08, FR-CUS-09, FR-STF-12, FR-ADM-02, FR-ADM-04, FR-SYS-01, FR-SYS-03, FR-SYS-04 |
| Not Implemented | 7 | FR-CUS-04, FR-CUS-05, FR-STF-11, FR-STF-13, FR-ADM-05, FR-ADM-06, FR-SYS-02 |

Total: 19 + 11 + 7 = 37 requirements (matches the specification count).

## Business-rule checks (section 1.4)

| Rule | Status | Evidence |
|---|---|---|
| Only ACTIVE + VERIFIED-license customers may book; unpaid fines block booking | Implemented | `booking.service.ts:83-105,175-187`. |
| Half-open intervals `[start,end)`; overlap check in transaction with concurrency control | Implemented | `booking.service.ts:54-64,156-194`; `bookings_vehicle_no_overlap` exclusion constraint in custom SQL migration. |
| Booking starts PENDING_PAYMENT; staff confirmation → CONFIRMED + QR; 30-min expiry → CANCELLED/PAYMENT_TIMEOUT | Implemented | `payment.service.ts:20-90`; `booking.service.ts:151-173,264`. Repeat deposit with the same idempotency key now returns the original payment; a different key still returns `BOOKING_NOT_PENDING`. |
| Handover creates ACTIVE contract, booking → CONVERTED_TO_CONTRACT, vehicle → RENTED | Implemented | `contract.service.ts` transactional handover. |
| Return records time, mileage, fuel, condition; violations create fines added to settlement | Implemented | `return.service.ts`, `inspection.service.ts`, `fine.service.ts`, `invoice.service.ts`. |
| Calendar-day pricing; deposit excludes insurance; early return has no automatic recalculation; zero late-fine grace; one-way rentals disabled | Implemented | `booking.service.ts:64,145-149,119-120`; `fine_rule.schema.ts` grace default; approved decisions in `docs/phase-1-database-design.md`. |

## Phase 4A QA evidence

- Automated backend coverage: `apps/api/tests/api.test.ts`, `phase2c.test.ts`, `admin.test.ts`, `security.test.ts` — 61/61 tests pass, including admin RBAC, cross-customer isolation, sensitive-field exposure, token/lock behavior, deposit idempotency, overlap prevention, and audit-log immutability.
- Automated frontend coverage: `apps/web/src/test/workflows.test.tsx` — 6/6 tests pass with Vitest/jsdom, covering catalog search, customer booking API submission, staff return pre-fill/submission, real admin dashboard stats, role redirects, and staff navbar links.
- Manual real-API browser smoke: customer booking (`BK-MWTPIBTY-KHTC`), staff deposit confirmation and handover (`CT-MWTPJY45-091FC7`), staff return with inspection pre-fill and invoice, admin pages with real data, and authenticated contract PDF download (HTTP 200, `application/pdf`). No browser console errors were observed.
- Quality gates: `pnpm typecheck`, `pnpm lint` (0 errors, 4 pre-existing warnings), `pnpm build`, `pnpm test`, `pnpm format:check`, `pnpm prisma validate`, `pnpm prisma migrate status`, and `pnpm prisma migrate diff --from-config-datasource --to-schema ./prisma/schema.prisma --exit-code` all pass.
- Final report: `docs/phase-4a-final-report.md`.

