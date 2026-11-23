# Phase 4A — Full System Testing & Quality Assurance Report

**Date:** 2026-11-24
**Phase:** Phase 4a — testing/QA only (no production deployment)
**Source of truth:** `docs/specification/Vehicle_Rental_System11.docx` and `docs/diagrams/`
**RTM:** `docs/phase-4a-requirement-traceability-matrix.md`
**Code baseline:** `apps/api/src`, `apps/web/src`, `apps/api/prisma/schema.prisma`, migration `20261123181556_init_phase1_schema`

---

## 1. Executive summary

Phase 4a is complete for the currently implemented scope.

- The 37 functional requirements were classified as **19 Implemented**, **11 Partially Implemented**, and **7 Not Implemented**.
- All approved business-rule decisions were checked against the code and tests.
- Automated tests pass: **61/61 API tests** and **6/6 web tests**.
- All quality gates pass: typecheck, lint, build, tests, Prettier, Prisma validation, migration status, and schema-drift check.
- Security/data-integrity testing found and fixed authorization, data-exposure, idempotency, and stale-session issues.
- Manual browser smoke tests with the real API covered Customer, Staff, and Admin workflows with no browser console errors.
- The system is **not production-ready** because several specification items remain partially or not implemented and operational jobs/integrations are deferred.
- Phase 4b must not start until explicit approval is given after this report.

---

## 2. Requirement traceability result

Full evidence is in `docs/phase-4a-requirement-traceability-matrix.md`.

| Status | Count | Requirement IDs |
|---|---:|---|
| Implemented | 19 | FR-GST-01, FR-GST-02, FR-GST-04, FR-CUS-01, FR-CUS-06, FR-CUS-07, FR-STF-01, FR-STF-02, FR-STF-03, FR-STF-04, FR-STF-05, FR-STF-06, FR-STF-07, FR-STF-08, FR-STF-09, FR-STF-10, FR-ADM-01, FR-ADM-03, FR-ADM-07 |
| Partially Implemented | 11 | FR-GST-03, FR-CUS-02, FR-CUS-03, FR-CUS-08, FR-CUS-09, FR-STF-12, FR-ADM-02, FR-ADM-04, FR-SYS-01, FR-SYS-03, FR-SYS-04 |
| Not Implemented | 7 | FR-CUS-04, FR-CUS-05, FR-STF-11, FR-STF-13, FR-ADM-05, FR-ADM-06, FR-SYS-02 |

**Total:** 37 requirements.

Business-rule checks in the RTM remain consistent with the approved decisions: calendar-day pricing `[pickup_date, expected_return_date)`, 18:00 due time, deposit from rental subtotal only, no early-return recalculation, zero late-fine grace, one-way rentals disabled, and `PENDING_PAYMENT → CONFIRMED → ACTIVE contract` lifecycle with `PAYMENT_TIMEOUT` cancellation.

---

## 3. Test environment and data handling

- PostgreSQL container: `vrs-postgres`.
- Development database: `vrs` — **not reset or deleted**.
- Test database: `vrs_test` — reset by `apps/api/tests/globalSetup.ts` as designed.
- Manual browser smoke: web `http://localhost:5173`, API `http://localhost:4000`.
- Dev servers were used only for smoke testing and were stopped afterward.
- Smoke artifacts were created in the **development** database only and were left in place to preserve audit history:
  - vehicle category `SmokeCat20261124031403`
  - vehicle plate `SMK-8167`
  - booking `BK-MWTPIBTY-KHTC`
  - deposit payment `DEP-MWTPIZEO-E94F`
  - contract `CT-MWTPJY45-091FC7`
  - generated invoice and audit-log rows
  - license fields on the existing `c@t.com` customer were set to VERIFIED for booking smoke coverage

No production deployment or production data access occurred.

---

## 4. Quality-gate results

| Gate | Command | Result |
|---|---|---|
| Typecheck | `pnpm typecheck` | Pass, exit 0 |
| Lint | `pnpm lint` | Pass, exit 0; 0 errors, 4 pre-existing warnings |
| Build | `pnpm build` | Pass, exit 0 |
| Tests | `pnpm test` | Pass, exit 0; API 61/61, web 6/6 |
| Format | `pnpm format:check` | Pass, all matched files formatted |
| Prisma schema | `pnpm prisma validate` | Pass, schema valid |
| Migration status | `pnpm prisma migrate status` | Pass, database schema up to date |
| Schema drift | `pnpm prisma migrate diff --from-config-datasource --to-schema ./prisma/schema.prisma --exit-code` | Pass, "No difference detected" |

Lint warnings remain in `AuthContext.tsx`, `AdminAuditLogsPage.tsx`, `AdminReportsPage.tsx`, and `VehicleCatalogPage.tsx`. They are non-blocking fast-refresh/exhaustive-deps warnings. Prisma 7 may print a Node 26 support warning; Prisma commands still succeed.

---

## 5. Automated test coverage

### 5.1 Backend (`apps/api/tests`, 61 tests)

- `api.test.ts` — registration, login, validation, duplicate handling, core auth flows.
- `phase2b` / booking-era coverage — catalog, booking creation, date rules, overlap prevention, unpaid-fine blocking, pending expiry.
- `phase2c.test.ts` — deposit confirmation, QR, handover, inspections, return, fines, invoices, settlement, PDF metadata.
- `admin.test.ts` — admin-only endpoints, staff/branch/category/config/fine-rule CRUD, reports, audit logs, and RBAC rejection cases.
- `security.test.ts` — expired/malformed/locked tokens, stale JWT after lock, role restrictions, cross-customer isolation, sensitive-field exposure, duplicate-overlap rejection, deposit idempotency, and DB-level audit-log immutability.

### 5.2 Frontend (`apps/web/src/test/workflows.test.tsx`, 6 tests)

Configured Vitest with jsdom and `@testing-library/react`. Tests verify:

1. catalog free-text search reaches `/api/vehicles/catalog?...search=Vios`;
2. customer booking form submits to `POST /api/bookings` and displays the returned booking code;
3. staff return form pre-fills mileage/fuel from pickup inspections and submits to `POST /api/contracts/:id/return`;
4. admin dashboard renders real `/api/admin/dashboard` statistics;
5. staff is redirected away from CUSTOMER-only `/bookings`;
6. staff navigation exposes working handover/contract links.

---

## 6. Manual browser smoke with real APIs

All operations below used the running API and development database; no mocked report data.

### Customer

- Logged in as CUSTOMER.
- Opened catalog, searched by plate `SMK-8167`, opened vehicle detail.
- Selected pickup `2026-12-10` and return `2026-12-12`; UI calculated 2 days, 1,000,000đ rental, 100,000đ deposit.
- Submitted booking; `POST /api/bookings` returned **201** and booking `BK-MWTPIBTY-KHTC` appeared in "Đơn đặt xe của tôi".

### Staff

- Deposited 100,000đ via `POST /api/payments/deposit` (CASH, unique idempotency key); booking became `CONFIRMED`, QR returned.
- Opened `/staff/handover`, looked up the booking code, entered 12,500 km and 90% fuel, completed handover; `POST /api/contracts` returned **201**, contract `CT-MWTPJY45-091FC7` became `ACTIVE`.
- Opened `/staff/returns`, selected the active contract. Mileage `12500` and fuel `90` were correctly pre-filled from pickup inspection (previously a crash-prone path).
- Entered final mileage 12,560, fuel 85%, 5L shortage, exterior damage, note, and completed return; `POST /api/contracts/:id/return` returned **200**, contract became `COMPLETED`, vehicle became `AVAILABLE`, invoice showed 1,000,000đ total, 100,000đ deposit deducted, 900,000đ due.
- Opened contract detail and clicked "Tải hợp đồng PDF"; request included `Authorization`, returned **200**, `application/pdf`, `Content-Disposition: attachment; filename="v1.pdf"`.

### Admin

- Logged in as ADMIN; real dashboard statistics rendered.
- Verified `/admin/vehicles` → "Thêm xe" opens `/admin/vehicles/new`.
- Verified admin pages load real data and links: staff, system configs (`/admin/system-configs`), fine rules, reports, audit logs.
- Reports showed real values from the smoke data (e.g., 2 new customers in month 11, fleet utilization row for Toyota Vios); no mock report data.
- Audit log showed real entries including `DEPOSIT_CONFIRMED`, `CONTRACT_CREATED`, `INVOICE_GENERATED`, `CONTRACT_COMPLETED`, and `LOGIN_SUCCESS`.
- Browser console error list was empty for the admin pages checked.

---

## 7. Confirmed findings and fixes

| Area | Finding | Fix |
|---|---|---|
| Reporting | `GET /api/reports/fleet-utilization` used invalid booking status `COMPLETED`, causing 500. | Filter only `CONFIRMED` and `CONVERTED_TO_CONTRACT`; covered by admin/report tests. |
| Authorization | Contract, invoice, and PDF downloads lacked ownership checks for customers. | Added ownership checks in contract/invoice/document services; security tests cover cross-customer 403. |
| Data exposure | `/api/users` returned password hash and login lock fields; contract/booking responses exposed license fields. | Introduced safe selects (`staffSelect`, safe customer selects); nested document user select limited to `fullName`/`email`. |
| Session security | Existing JWT remained usable after account lock/deletion. | `authenticate` now checks live DB `accountStatus`; security test covers locked-token reuse. |
| Data integrity | `updateVehicle` could bypass `ALLOWED_TRANSITIONS`. | Status edits now follow the transition table. |
| Catalog | Free-text search was missing; expired `PENDING_PAYMENT` holds still blocked availability. | Added `search` filter and excluded expired holds from overlap calculation. |
| Staff return | Contract list omitted pickup inspections, so `StaffReturnPage` could crash on selection. | Pickup inspection fields included in contract list; frontend/manual smoke verified pre-fill. |
| Payments | Repeat deposit with same idempotency key could conflict. | Same-key retries return the original payment; different key still returns booking-state error. |
| Frontend routes | `/bookings` and `/bookings/:id` were reachable by staff/admin; admin vehicle form routes missing. | Routes corrected to CUSTOMER-only; admin new/edit vehicle routes added. |
| Frontend navigation | Dashboard and navbar links pointed to wrong/missing paths; staff vehicle status could be changed illegally. | Links fixed; invalid transitions disabled; return path corrected after save. |
| Documents | PDF buttons used unauthenticated anchors/undefined document IDs. | Added authenticated `apiFetchBlob`/`downloadContractDocument`; real PDF smoke returned 200. |
| QA assets | Backend-only coverage; no RTM evidence for many fixes. | Added admin/security suites, 6 web workflow tests, and RTM evidence updates. |

No assertion was weakened and no approved business rule was silently changed.

---

## 8. Remaining limitations

### Not Implemented (blocking for full specification conformance)

- Rental extension request submission and approval.
- Staff driver-license review/approve/reject UI and endpoint.
- Periodic fleet inventory checks.
- Database backup.
- Database restore.
- Notification delivery (email/SMS/in-app); only the `Notification` model exists.

### Partially Implemented

- Profile/avatar/phone/address update and license upload.
- Insurance selection UI and seeded packages; DB structure exists but purchasing is not exposed.
- Real payment gateway; only CASH and SIMULATED_ONLINE are supported.
- Signed/stored PDF artifacts and payment-receipt PDFs; PDFs are generated on demand, not stored in object storage.
- Granular RBAC; only fixed CUSTOMER/STAFF/ADMIN roles.
- Report charts and CSV/PDF export; JSON tables only.
- Background schedulers for pending-booking expiry and hourly overdue scan; manual/admin trigger endpoints exist.
- Complete audit coverage for all admin actions (branch/category/config/fine-rule changes are not consistently logged).
- Staff lock/unlock customer UI; API is ADMIN-only.

### Operational / non-blocking

- No seed data for vehicle categories, fine rules, or system configs in a fresh database.
- Least-privilege `GRANT`/`REVOKE` noted in the migration comment is not implemented.
- 4 pre-existing ESLint warnings and Prisma 7's Node 26 support warning remain non-blocking.
- Development database now contains the disclosed smoke-test artifacts from Section 3.

---

## 9. Readiness and next step

**QA verdict:** Phase 4a objectives are met for the implemented scope. The implemented requirements are stable, tested, and covered by automation plus real-API browser smoke. The known gaps are honest specification limitations, not hidden failures.

**Production readiness:** Not ready. The Not Implemented and Partially Implemented items in Section 8 should be treated as Phase 4b scope or explicit product decisions.

**Next action:** Stop here and wait for approval before starting Phase 4b. No Phase 4b work has been started.
