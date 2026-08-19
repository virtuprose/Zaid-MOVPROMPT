import { and, eq, gt, sql } from "drizzle-orm";

import type { Database } from "./client.js";
import { serviceHeartbeats, type JsonObject } from "./schema.js";

export const MOVPROMPT_WORKER_SERVICE_NAME = "movprompt-worker";

export type ServiceHeartbeatStatus = "starting" | "ready" | "stopping";

export interface ServiceHeartbeatRepository {
  beat(input: {
    serviceName: string;
    instanceId: string;
    status: ServiceHeartbeatStatus;
    metadata?: JsonObject;
    now?: Date;
  }): Promise<void>;
  findFreshReady(input: {
    serviceName: string;
    maxAgeSeconds: number;
    now?: Date;
  }): Promise<{ instanceId: string; metadata: JsonObject; lastSeenAt: Date } | null>;
  remove(input: { serviceName: string; instanceId: string }): Promise<void>;
}

export function createServiceHeartbeatRepository(db: Database): ServiceHeartbeatRepository {
  return {
    async beat(input) {
      const now = input.now ?? new Date();
      await db
        .insert(serviceHeartbeats)
        .values({
          serviceName: input.serviceName,
          instanceId: input.instanceId,
          status: input.status,
          metadata: input.metadata ?? {},
          startedAt: now,
          lastSeenAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [serviceHeartbeats.serviceName, serviceHeartbeats.instanceId],
          set: {
            status: input.status,
            metadata: input.metadata ?? {},
            lastSeenAt: now,
            updatedAt: now,
          },
        });
    },

    async findFreshReady(input) {
      if (!Number.isSafeInteger(input.maxAgeSeconds) || input.maxAgeSeconds < 1) {
        throw new Error("service_heartbeat_max_age_invalid");
      }
      const now = input.now ?? new Date();
      const cutoff = new Date(now.getTime() - input.maxAgeSeconds * 1_000);
      const [row] = await db
        .select({
          instanceId: serviceHeartbeats.instanceId,
          metadata: serviceHeartbeats.metadata,
          lastSeenAt: serviceHeartbeats.lastSeenAt,
        })
        .from(serviceHeartbeats)
        .where(
          and(
            eq(serviceHeartbeats.serviceName, input.serviceName),
            eq(serviceHeartbeats.status, "ready"),
            gt(serviceHeartbeats.lastSeenAt, cutoff),
          ),
        )
        .orderBy(sql`${serviceHeartbeats.lastSeenAt} desc`)
        .limit(1);
      return row ?? null;
    },

    async remove(input) {
      await db
        .delete(serviceHeartbeats)
        .where(
          and(
            eq(serviceHeartbeats.serviceName, input.serviceName),
            eq(serviceHeartbeats.instanceId, input.instanceId),
          ),
        );
    },
  };
}
