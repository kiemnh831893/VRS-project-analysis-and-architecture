-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('CUSTOMER', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('ACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "license_status" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "login_failure_reason" AS ENUM ('INVALID_CREDENTIALS', 'UNKNOWN_EMAIL', 'TEMPORARILY_LOCKED', 'ACCOUNT_LOCKED');

-- CreateEnum
CREATE TYPE "branch_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "parking_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "transmission" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "fuel_type" AS ENUM ('PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID');

-- CreateEnum
CREATE TYPE "vehicle_status" AS ENUM ('AVAILABLE', 'RENTED', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'CONVERTED_TO_CONTRACT');

-- CreateEnum
CREATE TYPE "booking_cancellation_reason" AS ENUM ('PAYMENT_TIMEOUT', 'CUSTOMER_CANCELLED', 'STAFF_CANCELLED', 'NO_SHOW', 'VEHICLE_UNAVAILABLE', 'OTHER');

-- CreateEnum
CREATE TYPE "contract_status" AS ENUM ('ACTIVE', 'OVERDUE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "inspection_type" AS ENUM ('PICKUP', 'RETURN');

-- CreateEnum
CREATE TYPE "vehicle_condition" AS ENUM ('INTACT', 'SCRATCHED', 'DAMAGED');

-- CreateEnum
CREATE TYPE "extension_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "decision_source" AS ENUM ('SYSTEM', 'STAFF');

-- CreateEnum
CREATE TYPE "violation_type" AS ENUM ('LATE_RETURN', 'FUEL_SHORTAGE', 'EXTERIOR_DAMAGE', 'INTERIOR_DAMAGE', 'CLEANING', 'OTHER');

-- CreateEnum
CREATE TYPE "fine_calculation_method" AS ENUM ('FIXED', 'PER_HOUR', 'PER_DAY', 'PER_LITER', 'PER_PERCENT');

-- CreateEnum
CREATE TYPE "fine_status" AS ENUM ('UNPAID', 'PAID', 'WAIVED');

-- CreateEnum
CREATE TYPE "fine_settlement_type" AS ENUM ('PAYMENT', 'DEPOSIT', 'WAIVER');

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED', 'VOID');

-- CreateEnum
CREATE TYPE "invoice_line_type" AS ENUM ('RENTAL', 'INSURANCE', 'LATE_FEE', 'FUEL_FEE', 'DAMAGE_FEE', 'CLEANING_FEE', 'OTHER_FEE', 'DISCOUNT');

-- CreateEnum
CREATE TYPE "payment_purpose" AS ENUM ('DEPOSIT', 'SETTLEMENT', 'FINE', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CASH', 'SIMULATED_ONLINE');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'PAYMENT_RECEIVED', 'PICKUP_REMINDER', 'RETURN_REMINDER', 'CONTRACT_OVERDUE', 'LICENSE_VERIFIED', 'LICENSE_REJECTED', 'FINE_ISSUED', 'EXTENSION_APPROVED', 'EXTENSION_REJECTED', 'ACCOUNT_LOCKED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "notification_channel" AS ENUM ('IN_APP', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ', 'CANCELLED');

-- CreateEnum
CREATE TYPE "inventory_status" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "inventory_discrepancy" AS ENUM ('NONE', 'MISSING', 'UNEXPECTED', 'STATUS_MISMATCH', 'WRONG_BRANCH', 'DAMAGED');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('RENTAL_CONTRACT', 'RECEIPT', 'OTHER');

-- CreateEnum
CREATE TYPE "config_value_type" AS ENUM ('STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'JSON');

-- CreateEnum
CREATE TYPE "audit_outcome" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "national_id" VARCHAR(20) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL,
    "account_status" "account_status" NOT NULL DEFAULT 'ACTIVE',
    "address" TEXT,
    "avatar_key" VARCHAR(500),
    "failed_login_count" SMALLINT NOT NULL DEFAULT 0,
    "login_locked_until" TIMESTAMPTZ(6),
    "last_failed_login_at" TIMESTAMPTZ(6),
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "customers" (
    "user_id" UUID NOT NULL,
    "driver_license_no" VARCHAR(30),
    "license_class" VARCHAR(10),
    "license_expiry_date" DATE,
    "license_image_key" VARCHAR(500),
    "license_status" "license_status" NOT NULL DEFAULT 'UNVERIFIED',
    "license_submitted_at" TIMESTAMPTZ(6),
    "license_reviewed_by" UUID,
    "license_reviewed_at" TIMESTAMPTZ(6),
    "license_rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "rental_staff" (
    "user_id" UUID NOT NULL,
    "employee_code" VARCHAR(20) NOT NULL,
    "branch_id" UUID NOT NULL,
    "hired_at" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_staff_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "failed_login_attempts" (
    "attempt_id" BIGSERIAL NOT NULL,
    "user_id" UUID,
    "email_attempted" VARCHAR(254) NOT NULL,
    "ip_address" INET,
    "user_agent" TEXT,
    "failure_reason" "login_failure_reason" NOT NULL,
    "attempted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "failed_login_attempts_pkey" PRIMARY KEY ("attempt_id")
);

-- CreateTable
CREATE TABLE "branches" (
    "branch_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "address" TEXT NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(254),
    "opening_time" TIME(6) NOT NULL DEFAULT '08:00:00'::time,
    "closing_time" TIME(6) NOT NULL DEFAULT '18:00:00'::time,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "status" "branch_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("branch_id")
);

-- CreateTable
CREATE TABLE "parking_locations" (
    "parking_location_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "branch_id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "zone" VARCHAR(50),
    "capacity" INTEGER,
    "status" "parking_status" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parking_locations_pkey" PRIMARY KEY ("parking_location_id")
);

-- CreateTable
CREATE TABLE "vehicle_categories" (
    "category_id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "deposit_rate" DECIMAL(5,2) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "vehicle_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" INTEGER NOT NULL,
    "branch_id" UUID NOT NULL,
    "parking_location_id" UUID,
    "license_plate" VARCHAR(20) NOT NULL,
    "vin" VARCHAR(17),
    "brand" VARCHAR(50) NOT NULL,
    "model" VARCHAR(50) NOT NULL,
    "manufacture_year" SMALLINT NOT NULL,
    "transmission" "transmission" NOT NULL,
    "fuel_type" "fuel_type" NOT NULL,
    "seats" SMALLINT NOT NULL,
    "daily_rate" DECIMAL(12,2) NOT NULL,
    "current_mileage" INTEGER NOT NULL DEFAULT 0,
    "status" "vehicle_status" NOT NULL DEFAULT 'AVAILABLE',
    "retired_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("vehicle_id")
);

-- CreateTable
CREATE TABLE "vehicle_images" (
    "vehicle_image_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vehicle_id" UUID NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "alt_text" VARCHAR(200),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_images_pkey" PRIMARY KEY ("vehicle_image_id")
);

-- CreateTable
CREATE TABLE "insurance_packages" (
    "insurance_package_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "daily_rate" DECIMAL(12,2) NOT NULL,
    "coverage_description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurance_packages_pkey" PRIMARY KEY ("insurance_package_id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "booking_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_code" VARCHAR(20) NOT NULL,
    "customer_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "pickup_branch_id" UUID NOT NULL,
    "return_branch_id" UUID NOT NULL,
    "pickup_date" DATE NOT NULL,
    "expected_return_date" DATE NOT NULL,
    "rental_days" INTEGER NOT NULL,
    "daily_rate_snapshot" DECIMAL(12,2) NOT NULL,
    "rental_subtotal" DECIMAL(12,2) NOT NULL,
    "deposit_rate_snapshot" DECIMAL(5,2) NOT NULL,
    "deposit_amount" DECIMAL(12,2) NOT NULL,
    "insurance_package_id" UUID,
    "insurance_name_snapshot" VARCHAR(100),
    "insurance_daily_rate_snapshot" DECIMAL(12,2),
    "insurance_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_estimated_cost" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "booking_status" "booking_status" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "hold_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "confirmed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" "booking_cancellation_reason",
    "converted_at" TIMESTAMPTZ(6),
    "availability_released_at" TIMESTAMPTZ(6),
    "booking_period" daterange GENERATED ALWAYS AS (daterange("pickup_date", "expected_return_date", '[)')) STORED,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("booking_id")
);

-- CreateTable
CREATE TABLE "rental_contracts" (
    "contract_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_number" VARCHAR(30) NOT NULL,
    "booking_id" UUID NOT NULL,
    "staff_handover_id" UUID NOT NULL,
    "staff_return_id" UUID,
    "actual_pickup_at" TIMESTAMPTZ(6) NOT NULL,
    "expected_return_date" DATE NOT NULL,
    "actual_return_at" TIMESTAMPTZ(6),
    "contract_status" "contract_status" NOT NULL DEFAULT 'ACTIVE',
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_contracts_pkey" PRIMARY KEY ("contract_id")
);

-- CreateTable
CREATE TABLE "vehicle_inspections" (
    "inspection_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_id" UUID NOT NULL,
    "inspection_type" "inspection_type" NOT NULL,
    "mileage" INTEGER NOT NULL,
    "fuel_level_percent" SMALLINT NOT NULL,
    "condition" "vehicle_condition" NOT NULL,
    "notes" TEXT,
    "inspected_by" UUID NOT NULL,
    "inspected_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_inspections_pkey" PRIMARY KEY ("inspection_id")
);

-- CreateTable
CREATE TABLE "inspection_photos" (
    "photo_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inspection_id" UUID NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "caption" VARCHAR(200),
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_photos_pkey" PRIMARY KEY ("photo_id")
);

-- CreateTable
CREATE TABLE "extension_requests" (
    "extension_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_return_date" DATE NOT NULL,
    "requested_return_date" DATE NOT NULL,
    "additional_days" INTEGER NOT NULL,
    "additional_amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "status" "extension_status" NOT NULL DEFAULT 'PENDING',
    "decision_source" "decision_source",
    "decided_by" UUID,
    "decided_at" TIMESTAMPTZ(6),
    "decision_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extension_requests_pkey" PRIMARY KEY ("extension_id")
);

-- CreateTable
CREATE TABLE "fine_rules" (
    "fine_rule_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "violation_type" "violation_type" NOT NULL,
    "calculation_method" "fine_calculation_method" NOT NULL,
    "rate_amount" DECIMAL(12,2) NOT NULL,
    "unit_label" VARCHAR(20),
    "grace_minutes" INTEGER NOT NULL DEFAULT 0,
    "max_amount" DECIMAL(12,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fine_rules_pkey" PRIMARY KEY ("fine_rule_id")
);

-- CreateTable
CREATE TABLE "fine_records" (
    "fine_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_id" UUID NOT NULL,
    "invoice_id" UUID,
    "fine_rule_id" UUID NOT NULL,
    "violation_type" "violation_type" NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unit_amount" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "fine_status" NOT NULL DEFAULT 'UNPAID',
    "assessed_by" UUID NOT NULL,
    "assessed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMPTZ(6),
    "settlement_type" "fine_settlement_type",
    "waiver_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fine_records_pkey" PRIMARY KEY ("fine_id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "invoice_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_number" VARCHAR(30) NOT NULL,
    "contract_id" UUID NOT NULL,
    "status" "invoice_status" NOT NULL DEFAULT 'UNPAID',
    "rental_fee" DECIMAL(12,2) NOT NULL,
    "insurance_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fine_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "deposit_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deposit_applied" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "final_amount_due" DECIMAL(12,2) NOT NULL,
    "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refund_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("invoice_id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "invoice_line_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "line_type" "invoice_line_type" NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unit_amount" DECIMAL(12,2) NOT NULL,
    "line_amount" DECIMAL(12,2) NOT NULL,
    "fine_id" UUID,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("invoice_line_id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "payment_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_code" VARCHAR(30) NOT NULL,
    "booking_id" UUID,
    "invoice_id" UUID,
    "purpose" "payment_purpose" NOT NULL,
    "method" "payment_method" NOT NULL,
    "provider" VARCHAR(30) NOT NULL,
    "provider_transaction_ref" VARCHAR(100),
    "idempotency_key" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "confirmed_by" UUID,
    "confirmed_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "contract_documents" (
    "document_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_id" UUID NOT NULL,
    "document_type" "document_type" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "storage_key" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    "size_bytes" BIGINT NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "generated_by" UUID,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_documents_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_user_id" UUID NOT NULL,
    "type" "notification_type" NOT NULL,
    "channel" "notification_channel" NOT NULL DEFAULT 'IN_APP',
    "title" VARCHAR(150) NOT NULL,
    "body" TEXT NOT NULL,
    "related_entity_type" VARCHAR(50),
    "related_entity_id" VARCHAR(64),
    "dedupe_key" VARCHAR(150),
    "status" "notification_status" NOT NULL DEFAULT 'PENDING',
    "scheduled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(6),
    "read_at" TIMESTAMPTZ(6),
    "retry_count" SMALLINT NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "inventory_checks" (
    "inventory_check_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "check_number" VARCHAR(30) NOT NULL,
    "branch_id" UUID NOT NULL,
    "status" "inventory_status" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_by" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_by" UUID,
    "completed_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_checks_pkey" PRIMARY KEY ("inventory_check_id")
);

-- CreateTable
CREATE TABLE "inventory_check_items" (
    "item_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inventory_check_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "expected_status" "vehicle_status" NOT NULL,
    "found_present" BOOLEAN NOT NULL DEFAULT false,
    "actual_status" "vehicle_status",
    "found_branch_id" UUID,
    "discrepancy" "inventory_discrepancy" NOT NULL DEFAULT 'NONE',
    "notes" TEXT,
    "photo_key" VARCHAR(500),
    "checked_by" UUID NOT NULL,
    "checked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_check_items_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "config_key" VARCHAR(80) NOT NULL,
    "config_value" TEXT NOT NULL,
    "value_type" "config_value_type" NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("config_key")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "log_id" BIGSERIAL NOT NULL,
    "actor_user_id" UUID,
    "actor_role" "user_role",
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(64),
    "outcome" "audit_outcome" NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "request_id" UUID,
    "reason" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_national_id_key" ON "users"("national_id");

-- CreateIndex
CREATE INDEX "users_role_account_status_idx" ON "users"("role", "account_status");

-- CreateIndex
CREATE INDEX "users_login_locked_until_idx" ON "users"("login_locked_until");

-- CreateIndex
CREATE UNIQUE INDEX "customers_driver_license_no_key" ON "customers"("driver_license_no");

-- CreateIndex
CREATE INDEX "customers_license_status_license_submitted_at_idx" ON "customers"("license_status", "license_submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "rental_staff_employee_code_key" ON "rental_staff"("employee_code");

-- CreateIndex
CREATE INDEX "rental_staff_branch_id_employee_code_idx" ON "rental_staff"("branch_id", "employee_code");

-- CreateIndex
CREATE INDEX "failed_login_attempts_email_attempted_attempted_at_idx" ON "failed_login_attempts"("email_attempted", "attempted_at" DESC);

-- CreateIndex
CREATE INDEX "failed_login_attempts_ip_address_attempted_at_idx" ON "failed_login_attempts"("ip_address", "attempted_at" DESC);

-- CreateIndex
CREATE INDEX "failed_login_attempts_user_id_attempted_at_idx" ON "failed_login_attempts"("user_id", "attempted_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");

-- CreateIndex
CREATE INDEX "branches_status_name_idx" ON "branches"("status", "name");

-- CreateIndex
CREATE INDEX "parking_locations_branch_id_status_idx" ON "parking_locations"("branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "parking_locations_branch_id_code_key" ON "parking_locations"("branch_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "parking_locations_parking_location_id_branch_id_key" ON "parking_locations"("parking_location_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_categories_name_key" ON "vehicle_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vin_key" ON "vehicles"("vin");

-- CreateIndex
CREATE INDEX "vehicles_branch_id_status_idx" ON "vehicles"("branch_id", "status");

-- CreateIndex
CREATE INDEX "vehicles_category_id_idx" ON "vehicles"("category_id");

-- CreateIndex
CREATE INDEX "vehicles_parking_location_id_idx" ON "vehicles"("parking_location_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_images_storage_key_key" ON "vehicle_images"("storage_key");

-- CreateIndex
CREATE INDEX "vehicle_images_vehicle_id_sort_order_idx" ON "vehicle_images"("vehicle_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_packages_code_key" ON "insurance_packages"("code");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_code_key" ON "bookings"("booking_code");

-- CreateIndex
CREATE INDEX "bookings_customer_id_created_at_idx" ON "bookings"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "bookings_vehicle_id_pickup_date_idx" ON "bookings"("vehicle_id", "pickup_date");

-- CreateIndex
CREATE INDEX "bookings_booking_status_pickup_date_idx" ON "bookings"("booking_status", "pickup_date");

-- CreateIndex
CREATE UNIQUE INDEX "rental_contracts_contract_number_key" ON "rental_contracts"("contract_number");

-- CreateIndex
CREATE UNIQUE INDEX "rental_contracts_booking_id_key" ON "rental_contracts"("booking_id");

-- CreateIndex
CREATE INDEX "rental_contracts_contract_status_expected_return_date_idx" ON "rental_contracts"("contract_status", "expected_return_date");

-- CreateIndex
CREATE INDEX "rental_contracts_staff_handover_id_idx" ON "rental_contracts"("staff_handover_id");

-- CreateIndex
CREATE INDEX "rental_contracts_staff_return_id_idx" ON "rental_contracts"("staff_return_id");

-- CreateIndex
CREATE INDEX "vehicle_inspections_contract_id_inspected_at_idx" ON "vehicle_inspections"("contract_id", "inspected_at");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_inspections_contract_id_inspection_type_key" ON "vehicle_inspections"("contract_id", "inspection_type");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_photos_storage_key_key" ON "inspection_photos"("storage_key");

-- CreateIndex
CREATE INDEX "inspection_photos_inspection_id_sort_order_idx" ON "inspection_photos"("inspection_id", "sort_order");

-- CreateIndex
CREATE INDEX "extension_requests_contract_id_status_idx" ON "extension_requests"("contract_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "extension_requests_contract_id_requested_return_date_key" ON "extension_requests"("contract_id", "requested_return_date");

-- CreateIndex
CREATE UNIQUE INDEX "fine_rules_code_key" ON "fine_rules"("code");

-- CreateIndex
CREATE INDEX "fine_rules_violation_type_is_active_effective_from_idx" ON "fine_rules"("violation_type", "is_active", "effective_from");

-- CreateIndex
CREATE INDEX "fine_records_contract_id_status_idx" ON "fine_records"("contract_id", "status");

-- CreateIndex
CREATE INDEX "fine_records_invoice_id_idx" ON "fine_records"("invoice_id");

-- CreateIndex
CREATE INDEX "fine_records_assessed_at_idx" ON "fine_records"("assessed_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_contract_id_key" ON "invoices"("contract_id");

-- CreateIndex
CREATE INDEX "invoices_status_due_at_idx" ON "invoices"("status", "due_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_lines_fine_id_key" ON "invoice_lines"("fine_id");

-- CreateIndex
CREATE INDEX "invoice_lines_invoice_id_sort_order_idx" ON "invoice_lines"("invoice_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_payment_code_key" ON "payment_transactions"("payment_code");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_provider_transaction_ref_key" ON "payment_transactions"("provider_transaction_ref");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_idempotency_key_key" ON "payment_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "payment_transactions_booking_id_idx" ON "payment_transactions"("booking_id");

-- CreateIndex
CREATE INDEX "payment_transactions_invoice_id_idx" ON "payment_transactions"("invoice_id");

-- CreateIndex
CREATE INDEX "payment_transactions_status_created_at_idx" ON "payment_transactions"("status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "contract_documents_storage_key_key" ON "contract_documents"("storage_key");

-- CreateIndex
CREATE INDEX "contract_documents_contract_id_document_type_version_idx" ON "contract_documents"("contract_id", "document_type", "version");

-- CreateIndex
CREATE UNIQUE INDEX "contract_documents_contract_id_document_type_version_key" ON "contract_documents"("contract_id", "document_type", "version");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_status_scheduled_at_idx" ON "notifications"("recipient_user_id", "status", "scheduled_at");

-- CreateIndex
CREATE INDEX "notifications_channel_status_scheduled_at_idx" ON "notifications"("channel", "status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_checks_check_number_key" ON "inventory_checks"("check_number");

-- CreateIndex
CREATE INDEX "inventory_checks_branch_id_status_started_at_idx" ON "inventory_checks"("branch_id", "status", "started_at" DESC);

-- CreateIndex
CREATE INDEX "inventory_check_items_inventory_check_id_idx" ON "inventory_check_items"("inventory_check_id");

-- CreateIndex
CREATE INDEX "inventory_check_items_vehicle_id_checked_at_idx" ON "inventory_check_items"("vehicle_id", "checked_at" DESC);

-- CreateIndex
CREATE INDEX "inventory_check_items_discrepancy_idx" ON "inventory_check_items"("discrepancy");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_check_items_inventory_check_id_vehicle_id_key" ON "inventory_check_items"("inventory_check_id", "vehicle_id");

-- CreateIndex
CREATE INDEX "system_configs_category_config_key_idx" ON "system_configs"("category", "config_key");

-- CreateIndex
CREATE INDEX "audit_logs_occurred_at_idx" ON "audit_logs"("occurred_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_occurred_at_idx" ON "audit_logs"("actor_user_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_occurred_at_idx" ON "audit_logs"("entity_type", "entity_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_occurred_at_idx" ON "audit_logs"("action", "occurred_at" DESC);

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_license_reviewed_by_fkey" FOREIGN KEY ("license_reviewed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_staff" ADD CONSTRAINT "rental_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_staff" ADD CONSTRAINT "rental_staff_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "failed_login_attempts" ADD CONSTRAINT "failed_login_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_locations" ADD CONSTRAINT "parking_locations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "vehicle_categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_parking_location_id_fkey" FOREIGN KEY ("parking_location_id") REFERENCES "parking_locations"("parking_location_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_images" ADD CONSTRAINT "vehicle_images_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_pickup_branch_id_fkey" FOREIGN KEY ("pickup_branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_return_branch_id_fkey" FOREIGN KEY ("return_branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_insurance_package_id_fkey" FOREIGN KEY ("insurance_package_id") REFERENCES "insurance_packages"("insurance_package_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_staff_handover_id_fkey" FOREIGN KEY ("staff_handover_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_staff_return_id_fkey" FOREIGN KEY ("staff_return_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "rental_contracts"("contract_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_inspected_by_fkey" FOREIGN KEY ("inspected_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_photos" ADD CONSTRAINT "inspection_photos_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "vehicle_inspections"("inspection_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "rental_contracts"("contract_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "customers"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fine_rules" ADD CONSTRAINT "fine_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fine_rules" ADD CONSTRAINT "fine_rules_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fine_records" ADD CONSTRAINT "fine_records_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "rental_contracts"("contract_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fine_records" ADD CONSTRAINT "fine_records_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("invoice_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fine_records" ADD CONSTRAINT "fine_records_fine_rule_id_fkey" FOREIGN KEY ("fine_rule_id") REFERENCES "fine_rules"("fine_rule_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fine_records" ADD CONSTRAINT "fine_records_assessed_by_fkey" FOREIGN KEY ("assessed_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "rental_contracts"("contract_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("invoice_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_fine_id_fkey" FOREIGN KEY ("fine_id") REFERENCES "fine_records"("fine_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("invoice_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "rental_contracts"("contract_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_checks" ADD CONSTRAINT "inventory_checks_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_checks" ADD CONSTRAINT "inventory_checks_started_by_fkey" FOREIGN KEY ("started_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_checks" ADD CONSTRAINT "inventory_checks_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_check_items" ADD CONSTRAINT "inventory_check_items_inventory_check_id_fkey" FOREIGN KEY ("inventory_check_id") REFERENCES "inventory_checks"("inventory_check_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_check_items" ADD CONSTRAINT "inventory_check_items_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_check_items" ADD CONSTRAINT "inventory_check_items_found_branch_id_fkey" FOREIGN KEY ("found_branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_check_items" ADD CONSTRAINT "inventory_check_items_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_configs" ADD CONSTRAINT "system_configs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Phase 1 custom PostgreSQL rules.
--
-- These rules cannot be expressed in schema.prisma:
--   * the GiST exclusion constraint on (vehicle_id, booking_period)
--   * CHECK constraints
--   * expression and partial unique indexes
--   * audit-log immutability and vehicle/parking branch-consistency triggers
--
-- See docs/phase-1-database-design.md, sections 8 and 11.
-- ============================================================================

-- Required for the GiST exclusion constraint below (uuid equality + range overlap).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ----------------------------------------------------------------------------
-- Case-insensitive and partial unique indexes
-- ----------------------------------------------------------------------------

-- Emails are unique regardless of case. The service layer should also normalise
-- input, but the database is the final guard.
CREATE UNIQUE INDEX "users_email_lower_key" ON "users" (lower("email"));

-- Licence plates are compared case-insensitively.
CREATE UNIQUE INDEX "vehicles_license_plate_upper_key" ON "vehicles" (upper("license_plate"));

-- At most one primary image per vehicle.
CREATE UNIQUE INDEX "vehicle_images_one_primary_key"
  ON "vehicle_images" ("vehicle_id")
  WHERE "is_primary";

-- At most one current PDF per contract/document type.
CREATE UNIQUE INDEX "contract_documents_one_current_key"
  ON "contract_documents" ("contract_id", "document_type")
  WHERE "is_current";

-- Fast lookup for the scheduled/lazy expiry of 30-minute payment holds.
CREATE INDEX "bookings_pending_expiry_idx"
  ON "bookings" ("hold_expires_at")
  WHERE "booking_status" = 'PENDING_PAYMENT';

-- ----------------------------------------------------------------------------
-- Availability: one active booking per vehicle over a half-open date range
-- ----------------------------------------------------------------------------

-- [pickup_date, expected_return_date):
--   pickup on the 10th, return on the 12th => [10, 12) => 2 rental days.
--   A booking ending on the 12th and another starting on the 12th do not overlap.
-- PENDING_PAYMENT is included so the 30-minute hold is enforced by PostgreSQL.
-- CONVERTED_TO_CONTRACT remains blocking until availability_released_at is set.
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_vehicle_no_overlap"
  EXCLUDE USING gist (
    "vehicle_id" WITH =,
    "booking_period" WITH &&
  )
  WHERE (
    "booking_status" IN ('PENDING_PAYMENT', 'CONFIRMED', 'CONVERTED_TO_CONTRACT')
    AND "availability_released_at" IS NULL
  );

-- ----------------------------------------------------------------------------
-- CHECK constraints
-- ----------------------------------------------------------------------------

-- users
ALTER TABLE "users"
  ADD CONSTRAINT "users_failed_login_count_check"
  CHECK ("failed_login_count" >= 0);

-- customers
ALTER TABLE "customers"
  ADD CONSTRAINT "customers_license_rejection_reason_check"
  CHECK ("license_status" <> 'REJECTED' OR "license_rejection_reason" IS NOT NULL);

ALTER TABLE "customers"
  ADD CONSTRAINT "customers_license_fields_check"
  CHECK (
    "license_status" = 'UNVERIFIED'
    OR (
      "driver_license_no" IS NOT NULL
      AND "license_image_key" IS NOT NULL
      AND "license_reviewed_at" IS NOT NULL
    )
  );

-- branches
ALTER TABLE "branches"
  ADD CONSTRAINT "branches_opening_hours_check"
  CHECK ("opening_time" < "closing_time");

-- parking_locations
ALTER TABLE "parking_locations"
  ADD CONSTRAINT "parking_locations_capacity_check"
  CHECK ("capacity" IS NULL OR "capacity" > 0);

-- vehicle_categories
ALTER TABLE "vehicle_categories"
  ADD CONSTRAINT "vehicle_categories_deposit_rate_check"
  CHECK ("deposit_rate" BETWEEN 0 AND 100);

-- vehicles
ALTER TABLE "vehicles"
  ADD CONSTRAINT "vehicles_manufacture_year_check"
  CHECK ("manufacture_year" BETWEEN 1900 AND 2100);

ALTER TABLE "vehicles"
  ADD CONSTRAINT "vehicles_seats_check"
  CHECK ("seats" > 0);

ALTER TABLE "vehicles"
  ADD CONSTRAINT "vehicles_daily_rate_check"
  CHECK ("daily_rate" > 0);

ALTER TABLE "vehicles"
  ADD CONSTRAINT "vehicles_current_mileage_check"
  CHECK ("current_mileage" >= 0);

ALTER TABLE "vehicles"
  ADD CONSTRAINT "vehicles_retired_at_check"
  CHECK ("status" <> 'RETIRED' OR "retired_at" IS NOT NULL);

-- bookings: calendar-day pricing and status consistency
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_dates_check"
  CHECK ("expected_return_date" > "pickup_date");

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_rental_days_check"
  CHECK ("rental_days" = ("expected_return_date" - "pickup_date"));

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_rates_check"
  CHECK (
    "daily_rate_snapshot" > 0
    AND "rental_subtotal" = ("rental_days" * "daily_rate_snapshot")
  );

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_deposit_rate_check"
  CHECK ("deposit_rate_snapshot" BETWEEN 0 AND 100);

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_deposit_amount_check"
  CHECK (
    "deposit_amount" >= 0
    AND "deposit_amount" <= "total_estimated_cost"
  );

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_insurance_snapshot_check"
  CHECK (
    ("insurance_name_snapshot" IS NULL) = ("insurance_daily_rate_snapshot" IS NULL)
  );

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_insurance_fee_check"
  CHECK ("insurance_fee" = COALESCE("insurance_daily_rate_snapshot", 0) * "rental_days");

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_total_check"
  CHECK ("total_estimated_cost" = "rental_subtotal" + "insurance_fee");

-- MVP decision: one-way rentals are disabled, so both branches must match.
-- Drop this constraint when one-way rentals are enabled.
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_mvp_same_branch_check"
  CHECK ("pickup_branch_id" = "return_branch_id");

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_cancelled_fields_check"
  CHECK ("booking_status" <> 'CANCELLED' OR "cancelled_at" IS NOT NULL);

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_confirmed_fields_check"
  CHECK ("booking_status" <> 'CONFIRMED' OR "confirmed_at" IS NOT NULL);

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_converted_fields_check"
  CHECK ("booking_status" <> 'CONVERTED_TO_CONTRACT' OR "converted_at" IS NOT NULL);

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_cancellation_reason_check"
  CHECK ("cancellation_reason" IS NULL OR "booking_status" = 'CANCELLED');

-- rental_contracts
ALTER TABLE "rental_contracts"
  ADD CONSTRAINT "rental_contracts_return_time_check"
  CHECK ("actual_return_at" IS NULL OR "actual_return_at" >= "actual_pickup_at");

ALTER TABLE "rental_contracts"
  ADD CONSTRAINT "rental_contracts_completed_fields_check"
  CHECK (
    "contract_status" <> 'COMPLETED'
    OR (
      "actual_return_at" IS NOT NULL
      AND "completed_at" IS NOT NULL
      AND "staff_return_id" IS NOT NULL
    )
  );

-- Rental dates are calendar dates in the business timezone.
ALTER TABLE "rental_contracts"
  ADD CONSTRAINT "rental_contracts_return_date_check"
  CHECK (
    "expected_return_date" >= ("actual_pickup_at" AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
  );

-- vehicle_inspections
ALTER TABLE "vehicle_inspections"
  ADD CONSTRAINT "vehicle_inspections_mileage_check"
  CHECK ("mileage" >= 0);

ALTER TABLE "vehicle_inspections"
  ADD CONSTRAINT "vehicle_inspections_fuel_check"
  CHECK ("fuel_level_percent" BETWEEN 0 AND 100);

-- extension_requests
ALTER TABLE "extension_requests"
  ADD CONSTRAINT "extension_requests_dates_check"
  CHECK ("requested_return_date" > "current_return_date");

ALTER TABLE "extension_requests"
  ADD CONSTRAINT "extension_requests_days_check"
  CHECK (
    "additional_days" > 0
    AND "additional_days" = ("requested_return_date" - "current_return_date")
  );

ALTER TABLE "extension_requests"
  ADD CONSTRAINT "extension_requests_amount_check"
  CHECK ("additional_amount" >= 0);

ALTER TABLE "extension_requests"
  ADD CONSTRAINT "extension_requests_decision_check"
  CHECK ("status" = 'PENDING' OR "decided_at" IS NOT NULL);

ALTER TABLE "extension_requests"
  ADD CONSTRAINT "extension_requests_source_check"
  CHECK ("decision_source" IS NULL OR "decided_at" IS NOT NULL);

-- fine_rules
ALTER TABLE "fine_rules"
  ADD CONSTRAINT "fine_rules_rate_check"
  CHECK ("rate_amount" >= 0);

ALTER TABLE "fine_rules"
  ADD CONSTRAINT "fine_rules_grace_check"
  CHECK ("grace_minutes" >= 0);

ALTER TABLE "fine_rules"
  ADD CONSTRAINT "fine_rules_max_amount_check"
  CHECK ("max_amount" IS NULL OR "max_amount" >= "rate_amount");

ALTER TABLE "fine_rules"
  ADD CONSTRAINT "fine_rules_effective_check"
  CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from");

-- fine_records
ALTER TABLE "fine_records"
  ADD CONSTRAINT "fine_records_quantity_check"
  CHECK ("quantity" > 0);

ALTER TABLE "fine_records"
  ADD CONSTRAINT "fine_records_unit_amount_check"
  CHECK ("unit_amount" >= 0);

ALTER TABLE "fine_records"
  ADD CONSTRAINT "fine_records_amount_check"
  CHECK ("amount" = "quantity" * "unit_amount");

ALTER TABLE "fine_records"
  ADD CONSTRAINT "fine_records_settled_check"
  CHECK ("status" = 'UNPAID' OR "settled_at" IS NOT NULL);

ALTER TABLE "fine_records"
  ADD CONSTRAINT "fine_records_waiver_check"
  CHECK ("status" <> 'WAIVED' OR "waiver_reason" IS NOT NULL);

ALTER TABLE "fine_records"
  ADD CONSTRAINT "fine_records_paid_settlement_check"
  CHECK ("status" <> 'PAID' OR "settlement_type" IS NOT NULL);

-- invoices
ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_fees_check"
  CHECK (
    "rental_fee" >= 0
    AND "insurance_fee" >= 0
    AND "fine_fee" >= 0
    AND "discount_amount" >= 0
  );

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_total_check"
  CHECK (
    "total_amount" = "rental_fee" + "insurance_fee" + "fine_fee" - "discount_amount"
  );

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_deposit_check"
  CHECK (
    "deposit_amount" >= 0
    AND "deposit_applied" BETWEEN 0 AND "deposit_amount"
  );

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_final_amount_check"
  CHECK ("final_amount_due" = "total_amount" - "deposit_applied");

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_payment_amounts_check"
  CHECK ("amount_paid" >= 0 AND "refund_amount" >= 0);

-- invoice_lines
ALTER TABLE "invoice_lines"
  ADD CONSTRAINT "invoice_lines_quantity_check"
  CHECK ("quantity" > 0);

ALTER TABLE "invoice_lines"
  ADD CONSTRAINT "invoice_lines_amount_check"
  CHECK ("line_amount" = "quantity" * "unit_amount");

-- payment_transactions
ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_amount_check"
  CHECK ("amount" > 0);

ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_target_check"
  CHECK ("booking_id" IS NOT NULL OR "invoice_id" IS NOT NULL);

ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_purpose_check"
  CHECK (
    ("purpose" = 'DEPOSIT' AND "booking_id" IS NOT NULL AND "invoice_id" IS NULL)
    OR ("purpose" IN ('SETTLEMENT', 'FINE') AND "invoice_id" IS NOT NULL AND "booking_id" IS NULL)
    OR ("purpose" IN ('REFUND', 'ADJUSTMENT') AND ("invoice_id" IS NOT NULL OR "booking_id" IS NOT NULL))
  );

ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_confirmation_check"
  CHECK ("status" <> 'SUCCEEDED' OR "confirmed_at" IS NOT NULL);

-- contract_documents
ALTER TABLE "contract_documents"
  ADD CONSTRAINT "contract_documents_version_check"
  CHECK ("version" > 0);

ALTER TABLE "contract_documents"
  ADD CONSTRAINT "contract_documents_size_check"
  CHECK ("size_bytes" > 0);

-- notifications
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_sent_check"
  CHECK ("status" <> 'SENT' OR "sent_at" IS NOT NULL);

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_read_check"
  CHECK ("status" <> 'READ' OR "read_at" IS NOT NULL);

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_retry_check"
  CHECK ("retry_count" >= 0);

-- inventory_checks
ALTER TABLE "inventory_checks"
  ADD CONSTRAINT "inventory_checks_completion_check"
  CHECK (
    "status" <> 'COMPLETED'
    OR ("completed_at" IS NOT NULL AND "completed_by" IS NOT NULL)
  );

-- system_configs
ALTER TABLE "system_configs"
  ADD CONSTRAINT "system_configs_version_check"
  CHECK ("version" > 0);

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------

-- A vehicle's optional parking location must belong to the vehicle's branch.
-- A composite FK cannot be used because the same branch_id already backs the
-- vehicle->branch relation, so this rule is enforced with a trigger instead.
CREATE OR REPLACE FUNCTION vrs_check_vehicle_parking_branch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."parking_location_id" IS NOT NULL THEN
    PERFORM 1
      FROM "parking_locations"
     WHERE "parking_location_id" = NEW."parking_location_id"
       AND "branch_id" = NEW."branch_id";

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'parking location % does not belong to branch %',
        NEW."parking_location_id", NEW."branch_id"
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "vehicles_parking_branch_check"
BEFORE INSERT OR UPDATE OF "parking_location_id", "branch_id" ON "vehicles"
FOR EACH ROW
EXECUTE FUNCTION vrs_check_vehicle_parking_branch();

-- audit_logs is append-only. This protects history even when the application
-- role owns the table. An application role should additionally be granted only
-- INSERT/SELECT on this table.
CREATE OR REPLACE FUNCTION vrs_prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'audit_logs is append-only; % is not allowed', TG_OP
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "audit_logs_immutable"
BEFORE UPDATE OR DELETE ON "audit_logs"
FOR EACH ROW
EXECUTE FUNCTION vrs_prevent_audit_log_mutation();

CREATE TRIGGER "audit_logs_no_truncate"
BEFORE TRUNCATE ON "audit_logs"
FOR EACH STATEMENT
EXECUTE FUNCTION vrs_prevent_audit_log_mutation();

