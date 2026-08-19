import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  listRenders: vi.fn(),
  outputDownload: vi.fn(),
  loadCreatorProjects: vi.fn(),
}));

vi.mock("@/components/Seo", () => ({ Seo: () => null }));
vi.mock("@/features/create/CreatorShell", () => ({
  CreatorShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "11111111-1111-4111-8111-111111111111" } }),
}));
vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ locale: "en" }),
}));
vi.mock("@/config/features", () => ({
  isFeatureEnabled: () => true,
}));
vi.mock("@/features/create/templates", () => ({
  getCreatorTemplate: () => ({ name: "Electronics feature demo", nameAr: "عرض ميزات الإلكترونيات" }),
}));
vi.mock("@/features/create/projectStore", () => ({
  duplicateCreatorProject: vi.fn(),
  listLocalCreatorProjects: () => [],
  loadCreatorProjects: mocks.loadCreatorProjects,
  subscribeToCreatorProjects: () => () => undefined,
  trashCreatorProject: vi.fn(),
}));
vi.mock("@/lib/api/portableApiClient", () => ({
  PortableApiError: class PortableApiError extends Error {},
  portableCreatorApi: {
    listRenders: mocks.listRenders,
    outputDownload: mocks.outputDownload,
    retryRenderOutput: vi.fn(),
  },
}));

import CreatorProjects from "./CreatorProjects";

const project = {
  id: "22222222-2222-4222-8222-222222222222",
  userId: "11111111-1111-4111-8111-111111111111",
  title: "AirPods Max — Electronics feature demo",
  status: "completed",
  templateId: "electronics-feature-demo",
  aspectRatio: "9:16",
  updatedAt: "2026-08-15T14:00:00.000Z",
  product: { images: [{ url: "/create/sample-airpods.jpg" }] },
};

const runs = [
  "2b9fad16-4bb7-4b68-8905-c8f5ef088d92",
  "bb3078ad-36fe-49c2-bea9-07dc833feae7",
  "04028413-aba6-42e3-9870-2efca33271c5",
].map((id, index) => ({
  id,
  projectId: project.id,
  projectVersionId: "33333333-3333-4333-8333-333333333333",
  status: "completed",
  processingStage: "ready",
  outputAvailable: true,
  createdAt: `2026-08-15T14:0${index}:00.000Z`,
  updatedAt: `2026-08-15T14:0${index}:30.000Z`,
  error: null,
}));

describe("CreatorProjects generation history", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps every completed generation visible and playable, including repeated project versions", async () => {
    mocks.loadCreatorProjects.mockResolvedValue([project]);
    mocks.listRenders.mockResolvedValue(runs);
    mocks.outputDownload.mockImplementation(async (_projectId: string, runId: string) => `https://media.local/${runId}.mp4`);

    const { container } = render(
      <MemoryRouter initialEntries={["/projects"]}>
        <CreatorProjects />
      </MemoryRouter>,
    );

    await waitFor(() => expect(container.querySelectorAll(".creator-generation-card")).toHaveLength(3));
    expect(container.querySelectorAll("video[controls]")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Download" })).toHaveLength(3);
    expect(mocks.outputDownload).toHaveBeenCalledTimes(3);
    expect(new Set(Array.from(container.querySelectorAll("video")).map((video) => video.getAttribute("src"))).size).toBe(3);
  });
});
