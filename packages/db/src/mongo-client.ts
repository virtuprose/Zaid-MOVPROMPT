import { MongoClient, type ClientSession, type Collection, type Document } from "mongodb";

export const COLLECTIONS = {
  users: "users",
  sessions: "sessions",
  accounts: "accounts",
  verifications: "verifications",
  videoTemplates: "video_templates",
  videoTemplateVersions: "video_template_versions",
  creatorProjects: "creator_projects",
  creatorProjectVersions: "creator_project_versions",
  creatorProjectAssets: "creator_project_assets",
  guestClaimOperations: "guest_claim_operations",
  guestClaimAssets: "guest_claim_assets",
  requestRateLimits: "request_rate_limits",
  generationQuotes: "generation_quotes",
  renderRuns: "render_runs",
  renderAttempts: "render_attempts",
  entitlements: "entitlements",
  creditAccounts: "credit_accounts",
  creditReservations: "credit_reservations",
  creditLedger: "credit_ledger",
  exports: "exports",
  paymentBundles: "payment_bundles",
  paymentOrders: "payment_orders",
  paymentAttempts: "payment_attempts",
  paymentRefunds: "payment_refunds",
  paymentEvents: "payment_events",
  notifications: "notifications",
  auditLogs: "audit_logs",
  outboxJobs: "outbox_jobs",
  serviceHeartbeats: "service_heartbeats",
  workerJobs: "worker_jobs",
} as const;

export interface MongoDatabaseConfig {
  uri: string;
  databaseName: string;
  applicationName?: string;
  maxPoolSize?: number;
}

export type MongoSessionOperation<T> = (session: ClientSession) => Promise<T>;

export class MongoDatabase {
  readonly client: MongoClient;
  readonly databaseName: string;

  constructor(config: MongoDatabaseConfig) {
    if (!config.uri.trim()) throw new Error("MONGODB_URI is required");
    if (!config.databaseName.trim()) throw new Error("MONGODB_DATABASE is required");
    this.databaseName = config.databaseName;
    this.client = new MongoClient(config.uri, {
      appName: config.applicationName ?? "movprompt",
      maxPoolSize: config.maxPoolSize ?? 20,
      retryReads: true,
      retryWrites: true,
    });
  }

  get db() {
    return this.client.db(this.databaseName);
  }

  collection<T extends Document = Document>(name: string): Collection<T> {
    return this.db.collection<T>(name);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    await this.db.command({ ping: 1 });
  }

  async transaction<T>(operation: MongoSessionOperation<T>): Promise<T> {
    return this.client.withSession((session) => session.withTransaction(
      () => operation(session),
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        readPreference: "primary",
      },
    ));
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

export function mongoConfigFromEnv(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): MongoDatabaseConfig {
  const uri = environment.MONGODB_URI?.trim();
  if (!uri) throw new Error("MONGODB_URI is required");
  const databaseName = environment.MONGODB_DATABASE?.trim() || "movprompt";
  const maxPoolSize = environment.MONGODB_POOL_MAX ? Number(environment.MONGODB_POOL_MAX) : undefined;
  if (maxPoolSize !== undefined && (!Number.isSafeInteger(maxPoolSize) || maxPoolSize < 1)) {
    throw new Error("MONGODB_POOL_MAX must be a positive integer");
  }
  return {
    uri,
    databaseName,
    ...(environment.MONGODB_APPLICATION_NAME?.trim()
      ? { applicationName: environment.MONGODB_APPLICATION_NAME.trim() }
      : {}),
    ...(maxPoolSize === undefined ? {} : { maxPoolSize }),
  };
}

export function createMongoDatabase(config: MongoDatabaseConfig): MongoDatabase {
  return new MongoDatabase(config);
}
