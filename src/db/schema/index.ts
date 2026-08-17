import {
  bigint,
  boolean,
  char,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const appSchema = pgSchema("app");

export const memberRole = appSchema.enum("member_role", [
  "owner",
  "admin",
  "member",
]);
export const memberStatus = appSchema.enum("member_status", [
  "active",
  "invited",
  "disabled",
]);
export const customerKind = appSchema.enum("customer_kind", [
  "person",
  "company",
]);
export const orderStage = appSchema.enum("order_stage", [
  "draft",
  "awaiting_approval",
  "approved",
  "in_production",
  "ready_for_installation",
  "installed",
  "completed",
  "service",
]);
export const versionStatus = appSchema.enum("version_status", [
  "published",
  "awaiting_approval",
  "approved",
  "superseded",
]);
export const templateScope = appSchema.enum("template_scope", [
  "platform",
  "organization",
]);
export const specificationFieldType = appSchema.enum(
  "specification_field_type",
  [
    "short_text",
    "long_text",
    "integer",
    "decimal",
    "measurement",
    "single_select",
    "boolean",
    "date",
    "money",
    "colour",
    "file",
    "image_gallery",
  ],
);
export const fileCategory = appSchema.enum("file_category", [
  "drawing",
  "render",
  "photo",
  "document",
  "warranty",
  "installation",
  "review_request",
]);
export const portalScope = appSchema.enum("portal_scope", [
  "review",
  "installation_acceptance",
  "after_sales",
]);
export const reviewState = appSchema.enum("review_state", [
  "comment",
  "changes_requested",
]);
export const paymentKind = appSchema.enum("payment_kind", [
  "deposit",
  "progress",
  "final",
  "other",
]);
export const acceptanceStatus = appSchema.enum("acceptance_status", [
  "pending",
  "accepted",
  "issues",
]);
export const serviceStatus = appSchema.enum("service_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);
export const actorType = appSchema.enum("actor_type", [
  "user",
  "customer",
  "system",
]);
export const notificationStatus = appSchema.enum("notification_status", [
  "pending",
  "processing",
  "sent",
  "failed",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const profiles = appSchema.table("profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull(),
  phone: text("phone"),
  ...timestamps,
});

export const organizations = appSchema.table(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logoStoragePath: text("logo_storage_path"),
    brandColor: text("brand_color"),
    defaultCurrency: char("default_currency", { length: 3 })
      .notNull()
      .default("EUR"),
    defaultLocale: text("default_locale").notNull().default("bg"),
    orderNumberPrefix: text("order_number_prefix").notNull().default("MF"),
    nextOrderNumber: bigint("next_order_number", { mode: "number" })
      .notNull()
      .default(1),
    ...timestamps,
  },
  (table) => [uniqueIndex("organizations_slug_uidx").on(table.slug)],
);

export const organizationMembers = appSchema.table(
  "organization_members",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: memberRole("role").notNull(),
    status: memberStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index("organization_members_user_idx").on(table.userId, table.status),
  ],
);

export const customers = appSchema.table(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    kind: customerKind("kind").notNull().default("person"),
    name: text("name").notNull(),
    companyName: text("company_name"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    unique("customers_org_id_unique").on(table.organizationId, table.id),
    index("customers_org_name_idx").on(table.organizationId, table.name),
    index("customers_org_phone_idx").on(table.organizationId, table.phone),
    index("customers_org_email_idx").on(table.organizationId, table.email),
  ],
);

export const specificationTemplates = appSchema.table(
  "specification_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scope: templateScope("scope").notNull(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    key: text("key").notNull(),
    nameBg: text("name_bg").notNull(),
    nameEn: text("name_en"),
    version: integer("version").notNull().default(1),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("specification_templates_scope_key_version_uidx").on(
      table.scope,
      table.organizationId,
      table.key,
      table.version,
    ),
  ],
);

export const specificationTemplateFields = appSchema.table(
  "specification_template_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => specificationTemplates.id, { onDelete: "cascade" }),
    stableKey: text("stable_key").notNull(),
    sectionKey: text("section_key").notNull(),
    sectionLabel: text("section_label").notNull(),
    label: text("label").notNull(),
    fieldType: specificationFieldType("field_type").notNull(),
    unit: text("unit"),
    required: boolean("required").notNull().default(false),
    sortOrder: integer("sort_order").notNull(),
    optionsJson: jsonb("options_json").$type<string[]>(),
    configJson: jsonb("config_json").$type<Record<string, unknown>>(),
  },
  (table) => [
    uniqueIndex("template_fields_stable_key_uidx").on(
      table.templateId,
      table.stableKey,
    ),
    index("template_fields_sort_idx").on(table.templateId, table.sortOrder),
  ],
);

export const organizationTemplateFieldOverrides = appSchema.table(
  "organization_template_field_overrides",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    fieldId: uuid("field_id")
      .notNull()
      .references(() => specificationTemplateFields.id, {
        onDelete: "cascade",
      }),
    label: text("label"),
    hidden: boolean("hidden").notNull().default(false),
    sortOrder: integer("sort_order"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.fieldId] })],
);

export const orders = appSchema.table(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id").notNull(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => specificationTemplates.id, { onDelete: "restrict" }),
    orderNumber: text("order_number").notNull(),
    title: text("title").notNull(),
    stage: orderStage("stage").notNull().default("draft"),
    siteAddress: text("site_address"),
    targetDeliveryDate: date("target_delivery_date"),
    currentApprovedVersionId: uuid("current_approved_version_id"),
    currency: char("currency", { length: 3 }).notNull().default("EUR"),
    currentTotalMinor: bigint("current_total_minor", { mode: "bigint" }),
    depositRequiredMinor: bigint("deposit_required_minor", { mode: "bigint" }),
    depositPaidMinor: bigint("deposit_paid_minor", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    createdBy: uuid("created_by").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    unique("orders_org_id_unique").on(table.organizationId, table.id),
    uniqueIndex("orders_org_number_uidx").on(
      table.organizationId,
      table.orderNumber,
    ),
    index("orders_org_stage_updated_idx").on(
      table.organizationId,
      table.stage,
      table.updatedAt,
    ),
    foreignKey({
      columns: [table.organizationId, table.customerId],
      foreignColumns: [customers.organizationId, customers.id],
      name: "orders_customer_tenant_fk",
    }).onDelete("restrict"),
  ],
);

export const orderDrafts = appSchema.table(
  "order_drafts",
  {
    orderId: uuid("order_id").primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    valuesJson: jsonb("values_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    commercialJson: jsonb("commercial_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    templateSnapshotJson: jsonb("template_snapshot_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    updatedBy: uuid("updated_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revision: bigint("revision", { mode: "number" }).notNull().default(1),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "order_drafts_order_tenant_fk",
    }).onDelete("cascade"),
  ],
);

export const specificationVersions = appSchema.table(
  "specification_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    versionNumber: integer("version_number").notNull(),
    status: versionStatus("status").notNull().default("published"),
    snapshotJson: jsonb("snapshot_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    commercialSnapshotJson: jsonb("commercial_snapshot_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    contentHash: text("content_hash").notNull(),
    changeSummaryJson: jsonb("change_summary_json").$type<unknown[]>(),
    priceDeltaMinor: bigint("price_delta_minor", { mode: "bigint" }),
    deliveryDeltaDays: integer("delivery_delta_days"),
    createdBy: uuid("created_by").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
  },
  (table) => [
    unique("specification_versions_org_id_unique").on(
      table.organizationId,
      table.id,
    ),
    uniqueIndex("specification_versions_order_number_uidx").on(
      table.orderId,
      table.versionNumber,
    ),
    index("specification_versions_order_status_idx").on(
      table.organizationId,
      table.orderId,
      table.status,
    ),
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "specification_versions_order_tenant_fk",
    }).onDelete("restrict"),
  ],
);

export const orderFiles = appSchema.table(
  "order_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    category: fileCategory("category").notNull(),
    storageBucket: text("storage_bucket").notNull().default("order-files"),
    storagePath: text("storage_path").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    checksumSha256: text("checksum_sha256"),
    uploadedBy: uuid("uploaded_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("order_files_org_id_unique").on(table.organizationId, table.id),
    uniqueIndex("order_files_storage_path_uidx").on(
      table.storageBucket,
      table.storagePath,
    ),
    index("order_files_order_idx").on(table.organizationId, table.orderId),
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "order_files_order_tenant_fk",
    }).onDelete("cascade"),
  ],
);

export const versionFiles = appSchema.table(
  "version_files",
  {
    organizationId: uuid("organization_id").notNull(),
    versionId: uuid("version_id").notNull(),
    fileId: uuid("file_id").notNull(),
    manifestJson: jsonb("manifest_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.versionId, table.fileId] }),
    foreignKey({
      columns: [table.organizationId, table.versionId],
      foreignColumns: [
        specificationVersions.organizationId,
        specificationVersions.id,
      ],
      name: "version_files_version_tenant_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.fileId],
      foreignColumns: [orderFiles.organizationId, orderFiles.id],
      name: "version_files_file_tenant_fk",
    }).onDelete("restrict"),
  ],
);

export const portalLinks = appSchema.table(
  "portal_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    versionId: uuid("version_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    scope: portalScope("scope").notNull().default("review"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
    viewCount: integer("view_count").notNull().default(0),
  },
  (table) => [
    uniqueIndex("portal_links_token_hash_uidx").on(table.tokenHash),
    uniqueIndex("portal_links_active_review_order_uidx")
      .on(table.organizationId, table.orderId)
      .where(
        sql`${table.scope} = 'review'::app.portal_scope and ${table.revokedAt} is null`,
      ),
    index("portal_links_version_idx").on(table.organizationId, table.versionId),
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "portal_links_order_tenant_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.versionId],
      foreignColumns: [
        specificationVersions.organizationId,
        specificationVersions.id,
      ],
      name: "portal_links_version_tenant_fk",
    }).onDelete("cascade"),
  ],
);

export const approvals = appSchema.table(
  "approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    versionId: uuid("version_id").notNull(),
    portalLinkId: uuid("portal_link_id")
      .notNull()
      .references(() => portalLinks.id, { onDelete: "restrict" }),
    contentHash: text("content_hash").notNull(),
    approverName: text("approver_name").notNull(),
    approverEmail: text("approver_email"),
    approvedAt: timestamp("approved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    userAgent: text("user_agent"),
    confirmationText: text("confirmation_text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("approvals_version_uidx").on(table.versionId),
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "approvals_order_tenant_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.organizationId, table.versionId],
      foreignColumns: [
        specificationVersions.organizationId,
        specificationVersions.id,
      ],
      name: "approvals_version_tenant_fk",
    }).onDelete("restrict"),
  ],
);

export const reviewRequests = appSchema.table(
  "review_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    versionId: uuid("version_id").notNull(),
    portalLinkId: uuid("portal_link_id")
      .notNull()
      .references(() => portalLinks.id, { onDelete: "restrict" }),
    state: reviewState("state").notNull(),
    message: text("message").notNull(),
    customerName: text("customer_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("review_requests_order_open_idx").on(
      table.organizationId,
      table.orderId,
      table.resolvedAt,
    ),
    foreignKey({
      columns: [table.organizationId, table.versionId],
      foreignColumns: [
        specificationVersions.organizationId,
        specificationVersions.id,
      ],
      name: "review_requests_version_tenant_fk",
    }).onDelete("restrict"),
  ],
);

export const quoteItems = appSchema.table(
  "quote_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
    unit: text("unit"),
    unitPriceMinor: bigint("unit_price_minor", { mode: "bigint" }).notNull(),
    sortOrder: integer("sort_order").notNull(),
    ...timestamps,
  },
  (table) => [
    index("quote_items_order_sort_idx").on(
      table.organizationId,
      table.orderId,
      table.sortOrder,
    ),
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "quote_items_order_tenant_fk",
    }).onDelete("cascade"),
  ],
);

export const payments = appSchema.table(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    kind: paymentKind("kind").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    note: text("note"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payments_order_paid_idx").on(
      table.organizationId,
      table.orderId,
      table.paidAt,
    ),
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "payments_order_tenant_fk",
    }).onDelete("restrict"),
  ],
);

export const installations = appSchema.table(
  "installations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    installedAt: timestamp("installed_at", { withTimezone: true }),
    notes: text("notes"),
    acceptanceStatus: acceptanceStatus("acceptance_status")
      .notNull()
      .default("pending"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("installations_order_uidx").on(table.orderId),
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "installations_order_tenant_fk",
    }).onDelete("restrict"),
  ],
);

export const warrantyItems = appSchema.table(
  "warranty_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    name: text("name").notNull(),
    manufacturer: text("manufacturer"),
    model: text("model"),
    serialNumber: text("serial_number"),
    warrantyStart: date("warranty_start"),
    warrantyEnd: date("warranty_end"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("warranty_items_order_idx").on(table.organizationId, table.orderId),
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "warranty_items_order_tenant_fk",
    }).onDelete("restrict"),
  ],
);

export const serviceRequests = appSchema.table(
  "service_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    orderId: uuid("order_id").notNull(),
    warrantyItemId: uuid("warranty_item_id").references(
      () => warrantyItems.id,
      {
        onDelete: "set null",
      },
    ),
    status: serviceStatus("status").notNull().default("open"),
    title: text("title").notNull(),
    description: text("description").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("service_requests_order_status_idx").on(
      table.organizationId,
      table.orderId,
      table.status,
    ),
    foreignKey({
      columns: [table.organizationId, table.orderId],
      foreignColumns: [orders.organizationId, orders.id],
      name: "service_requests_order_tenant_fk",
    }).onDelete("restrict"),
  ],
);

export const activityEvents = appSchema.table(
  "activity_events",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    orderId: uuid("order_id"),
    actorType: actorType("actor_type").notNull(),
    actorUserId: uuid("actor_user_id"),
    eventType: text("event_type").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    metadataJson: jsonb("metadata_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("activity_events_order_time_idx").on(
      table.organizationId,
      table.orderId,
      table.createdAt,
    ),
  ],
);

export const notificationOutbox = appSchema.table(
  "notification_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    idempotencyKey: text("idempotency_key").notNull(),
    eventType: text("event_type").notNull(),
    recipient: text("recipient").notNull(),
    payloadJson: jsonb("payload_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    status: notificationStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("notification_outbox_idempotency_uidx").on(
      table.idempotencyKey,
    ),
    index("notification_outbox_delivery_idx").on(
      table.status,
      table.availableAt,
    ),
  ],
);
