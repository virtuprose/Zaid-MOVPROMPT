export function createOpenApiDocument(version: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "MovPrompt API",
      version,
      description: "Portable MovPrompt service API. Provider model IDs are server-only.",
    },
    paths: {
      "/api/auth/{path}": {
        get: {
          operationId: "betterAuthGet",
          parameters: [
            {
              name: "path",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { "200": { description: "Better Auth response." } },
        },
        post: {
          operationId: "betterAuthPost",
          parameters: [
            {
              name: "path",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { "200": { description: "Better Auth response." } },
        },
      },
      "/api/v1/health": {
        get: {
          operationId: "getServiceHealth",
          responses: {
            "200": { description: "The API and required dependencies are ready." },
            "503": { description: "At least one required dependency is unavailable." },
          },
        },
      },
      "/api/v1/version": {
        get: {
          operationId: "getServiceVersion",
          responses: { "200": { description: "Build and service version metadata." } },
        },
      },
      "/api/v1/feature-flags": {
        get: {
          operationId: "getPublicFeatureFlags",
          responses: {
            "200": {
              description: "Server-evaluated product features and approved capability availability.",
            },
          },
        },
      },
      "/api/v1/templates": {
        get: {
          operationId: "listPublishedTemplates",
          description: "Lists immutable, published campaign template versions.",
          parameters: [
            { name: "vertical", in: "query", schema: { type: "string" } },
            { name: "goal", in: "query", schema: { type: "string" } },
            { name: "language", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "Published template catalog." } },
        },
      },
      "/api/v1/templates/{slug}": {
        get: {
          operationId: "getPublishedTemplate",
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Published immutable template version." },
            "404": { description: "Published template not found." },
          },
        },
      },
      "/api/v1/product-scans": {
        post: {
          operationId: "scanProductSource",
          responses: {
            "200": { description: "Imported product facts requiring user confirmation." },
            "400": { description: "Unsafe or invalid source URL." },
            "413": { description: "Source page exceeds the import limit." },
          },
        },
      },
      "/api/v1/business-scans": {
        post: {
          operationId: "scanBusinessSource",
          responses: {
            "200": { description: "Imported service facts requiring user confirmation." },
            "400": { description: "Unsafe or invalid source URL." },
            "413": { description: "Source page exceeds the import limit." },
          },
        },
      },
      "/api/v1/drafts/claim": {
        post: {
          operationId: "claimGuestDraft",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "Idempotency-Key",
              in: "header",
              required: true,
              description: "Must equal the stable browser draft UUID.",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "201": { description: "Existing or newly claimed project and first version." },
            "401": { description: "Authentication required." },
            "409": { description: "Draft was already claimed or the payload changed." },
          },
        },
      },
      "/api/v1/projects": {
        get: {
          operationId: "listProjects",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Owner-scoped project list." } },
        },
      },
      "/api/v1/projects/{projectId}": {
        get: {
          operationId: "getProject",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "projectId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": { description: "Owner-scoped project and accepted version." },
            "404": { description: "Project not found for this account." },
          },
        },
      },
      "/api/v1/projects/{projectId}/duplicate": {
        post: {
          operationId: "duplicateProject",
          security: [{ cookieAuth: [] }],
          responses: { "201": { description: "Idempotent immutable project copy." } },
        },
      },
      "/api/v1/projects/{projectId}/trash": {
        post: {
          operationId: "trashProject",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Project moved to recoverable trash." } },
        },
      },
      "/api/v1/projects/{projectId}/restore": {
        post: {
          operationId: "restoreProject",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Trashed project restored." } },
        },
      },
      "/api/v1/projects/{projectId}/versions": {
        get: {
          operationId: "listProjectVersions",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Immutable project version history." } },
        },
        post: {
          operationId: "createProjectVersion",
          security: [{ cookieAuth: [] }],
          responses: { "201": { description: "New idempotent immutable version." } },
        },
      },
      "/api/v1/projects/{projectId}/accepted-version": {
        post: {
          operationId: "acceptProjectVersion",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Project now points to the selected version." } },
        },
      },
      "/api/v1/credits": {
        get: {
          operationId: "getCreditSummary",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Authoritative balance, holds, entitlement and ledger." } },
        },
      },
      "/api/v1/projects/{projectId}/render-runs/{runId}/output": {
        get: {
          operationId: "createRenderOutputDownload",
          security: [{ cookieAuth: [] }],
          responses: {
            "200": { description: "Fresh signed URL for a MovPrompt-owned completed output." },
            "404": { description: "Output not found for this account." },
          },
        },
      },
      "/api/v1/projects/{projectId}/assets/upload-url": {
        post: {
          operationId: "createAssetUploadUrl",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "projectId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "Idempotency-Key",
              in: "header",
              required: true,
              schema: { type: "string", minLength: 8, maxLength: 200 },
            },
          ],
          responses: {
            "201": { description: "Private PUT upload URL and server-owned object key." },
            "401": { description: "Authentication required." },
            "404": { description: "Project not found for the current user." },
          },
        },
      },
      "/api/v1/projects/{projectId}/assets/{assetId}/complete": {
        post: {
          operationId: "confirmAssetUpload",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "projectId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "assetId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": { description: "Upload checksum, MIME type and size verified." },
            "409": { description: "Upload incomplete or integrity mismatch." },
          },
        },
      },
      "/api/v1/projects/{projectId}/assets/{assetId}/download-url": {
        get: {
          operationId: "createAssetDownloadUrl",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "projectId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "assetId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": { description: "Short-lived private GET download URL." },
            "404": { description: "Asset not found for the current user." },
            "409": { description: "Upload incomplete or integrity mismatch." },
          },
        },
      },
      "/api/v1/generation-quotes": {
        post: {
          operationId: "createGenerationQuote",
          description:
            "Returns a guest estimate or an authenticated, immutable project-version quote. Raw provider model IDs are never accepted.",
          responses: {
            "200": { description: "Configuration-bound generation quote or guest estimate." },
            "400": { description: "Invalid configuration or unapproved capability." },
            "401": { description: "Authentication required for a saved project quote." },
            "503": { description: "Approved capability or authoritative pricing unavailable." },
          },
        },
      },
      "/api/v1/render-runs": {
        post: {
          operationId: "startRenderRun",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "Idempotency-Key",
              in: "header",
              required: true,
              schema: { type: "string", minLength: 8, maxLength: 200 },
            },
          ],
          responses: {
            "202": { description: "Existing or newly queued durable render run." },
            "401": { description: "Authentication required." },
            "402": { description: "Insufficient credits." },
            "409": { description: "Expired, changed or conflicting quote." },
            "503": { description: "Approved generation capability unavailable." },
          },
        },
      },
      "/api/v1/render-runs/{id}": {
        get: {
          operationId: "getRenderRun",
          security: [{ cookieAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": { description: "Owner-scoped durable render status." },
            "401": { description: "Authentication required." },
            "404": { description: "Render not found for the current user." },
          },
        },
      },
      "/api/v1/render-runs/{id}/cancel": {
        post: {
          operationId: "cancelRenderRun",
          security: [{ cookieAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
            {
              name: "Idempotency-Key",
              in: "header",
              required: true,
              schema: { type: "string", minLength: 8, maxLength: 200 },
            },
          ],
          responses: {
            "202": { description: "Cancellation completed or requested from the provider." },
            "401": { description: "Authentication required." },
            "404": { description: "Render not found for the current user." },
            "409": { description: "Render cannot be cancelled in its current state." },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "better-auth.session_token",
        },
      },
    },
  } as const;
}
