import { isIP } from "node:net";
import { resolve4, resolve6 } from "node:dns/promises";

import type { SourceScanResponse } from "@movprompt/contracts";

import { ApiHttpError } from "./errors.js";

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 8_000;

type ResolveHost = (hostname: string) => Promise<string[]>;
type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface SourceScanner {
  scan(input: {
    url: string;
    kind: "product" | "business";
    requestId: string;
  }): Promise<SourceScanResponse>;
}

export type SourceScannerOptions = {
  fetch?: FetchLike;
  resolveHost?: ResolveHost;
  timeoutMs?: number;
};

function ipv4Number(address: string): number {
  return address
    .split(".")
    .reduce((value, part) => (value << 8) + Number(part), 0) >>> 0;
}

function inV4Range(address: string, base: string, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipv4Number(address) & mask) === (ipv4Number(base) & mask);
}

export function isPublicAddress(address: string): boolean {
  const normalized = address.split("%")[0]!.toLowerCase();
  const version = isIP(normalized);
  if (version === 4) {
    return ![
      ["0.0.0.0", 8],
      ["10.0.0.0", 8],
      ["100.64.0.0", 10],
      ["127.0.0.0", 8],
      ["169.254.0.0", 16],
      ["172.16.0.0", 12],
      ["192.0.0.0", 24],
      ["192.0.2.0", 24],
      ["192.168.0.0", 16],
      ["198.18.0.0", 15],
      ["198.51.100.0", 24],
      ["203.0.113.0", 24],
      ["224.0.0.0", 4],
      ["240.0.0.0", 4],
    ].some(([base, prefix]) => inV4Range(normalized, base as string, prefix as number));
  }
  if (version === 6) {
    if (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      /^fe[89ab]/.test(normalized) ||
      normalized.startsWith("ff") ||
      normalized.startsWith("2001:db8")
    ) {
      return false;
    }
    if (normalized.startsWith("::ffff:")) {
      return isPublicAddress(normalized.slice("::ffff:".length));
    }
    return true;
  }
  return false;
}

async function defaultResolveHost(hostname: string): Promise<string[]> {
  if (isIP(hostname)) return [hostname];
  const [v4, v6] = await Promise.all([
    resolve4(hostname).catch(() => []),
    resolve6(hostname).catch(() => []),
  ]);
  return [...v4, ...v6];
}

function safeHttpUrl(value: string, base?: URL): URL {
  let url: URL;
  try {
    url = base ? new URL(value, base) : new URL(value);
  } catch {
    throw new ApiHttpError({
      code: "invalid_source_url",
      message: "Enter a complete public website link.",
      status: 400,
      retryable: false,
    });
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
    throw new ApiHttpError({
      code: "invalid_source_url",
      message: "Only public HTTP or HTTPS links without embedded credentials are supported.",
      status: 400,
      retryable: false,
    });
  }
  return url;
}

async function assertPublicHost(url: URL, resolveHost: ResolveHost): Promise<void> {
  const addresses = await resolveHost(url.hostname);
  if (!addresses.length || addresses.some((address) => !isPublicAddress(address))) {
    throw new ApiHttpError({
      code: "source_url_blocked",
      message: "This link does not resolve to a public website.",
      status: 400,
      retryable: false,
    });
  }
}

function meta(html: string, keys: string[]): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attributes = new Map<string, string>();
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attributes.set(match[1]!.toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
    }
    const key = (attributes.get("property") || attributes.get("name") || "").toLowerCase();
    if (keys.includes(key) && attributes.get("content")?.trim()) return decodeHtml(attributes.get("content")!);
  }
  return null;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();
}

function title(html: string): string | null {
  const raw = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return raw ? decodeHtml(raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")) : null;
}

function imageCandidates(html: string, page: URL): string[] {
  const raw = [
    meta(html, ["og:image:secure_url", "og:image"]),
    meta(html, ["twitter:image"]),
    ...Array.from(html.matchAll(/<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi)).map(
      (match) => match[1] ?? match[2] ?? match[3] ?? "",
    ),
  ];
  const result = new Set<string>();
  for (const candidate of raw) {
    if (!candidate || candidate.startsWith("data:")) continue;
    try {
      const resolved = new URL(candidate, page);
      if (resolved.protocol === "https:" || resolved.protocol === "http:") result.add(resolved.toString());
    } catch {
      // Invalid document candidates are ignored, never fetched by this scan.
    }
    if (result.size >= 8) break;
  }
  return [...result];
}

function priceFact(html: string): string | null {
  return meta(html, ["product:price:amount", "og:price:amount"]);
}

export function createSourceScanner(options: SourceScannerOptions = {}): SourceScanner {
  const fetcher = options.fetch ?? ((input, init) => fetch(input, init));
  const resolveHost = options.resolveHost ?? defaultResolveHost;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    async scan(input) {
      let url = safeHttpUrl(input.url);
      let response: Response | null = null;
      for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
        await assertPublicHost(url, resolveHost);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          response = await fetcher(url.toString(), {
            method: "GET",
            redirect: "manual",
            signal: controller.signal,
            headers: {
              accept: "text/html,application/xhtml+xml",
              "user-agent": "MovPromptSourceScanner/1.0",
            },
          });
        } catch (error) {
          throw new ApiHttpError({
            code: error instanceof Error && error.name === "AbortError" ? "source_scan_timeout" : "source_scan_failed",
            message: "MovPrompt could not read this website. Upload photos or enter the details manually.",
            status: 422,
            retryable: true,
          });
        } finally {
          clearTimeout(timer);
        }

        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get("location");
          if (!location || redirect === MAX_REDIRECTS) {
            throw new ApiHttpError({
              code: "source_redirect_invalid",
              message: "The website redirected too many times.",
              status: 422,
              retryable: false,
            });
          }
          url = safeHttpUrl(location, url);
          continue;
        }
        break;
      }

      if (!response?.ok) {
        throw new ApiHttpError({
          code: "source_scan_failed",
          message: "The website did not return a readable page.",
          status: 422,
          retryable: true,
        });
      }
      const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
      if (contentType !== "text/html" && contentType !== "application/xhtml+xml") {
        throw new ApiHttpError({
          code: "source_content_unsupported",
          message: "This link is not a supported website page.",
          status: 415,
          retryable: false,
        });
      }
      const contentLength = Number(response.headers.get("content-length") || "0");
      if (Number.isFinite(contentLength) && contentLength > MAX_HTML_BYTES) {
        throw new ApiHttpError({
          code: "source_too_large",
          message: "This website page is too large to import safely.",
          status: 413,
          retryable: false,
        });
      }
      const reader = response.body?.getReader();
      if (!reader) throw new ApiHttpError({ code: "source_scan_failed", message: "The page body was empty.", status: 422, retryable: true });
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_HTML_BYTES) {
          await reader.cancel();
          throw new ApiHttpError({ code: "source_too_large", message: "This website page is too large to import safely.", status: 413, retryable: false });
        }
        chunks.push(value);
      }
      const html = new TextDecoder().decode(Buffer.concat(chunks));
      const importedName = meta(html, ["og:title", "twitter:title"]) || title(html);
      const description = meta(html, ["og:description", "twitter:description", "description"]);
      const price = input.kind === "product" ? priceFact(html) : null;
      const facts: SourceScanResponse["facts"] = [];
      if (importedName) facts.push({ field: "name", value: importedName.slice(0, 500), provenance: "imported" });
      if (description) facts.push({ field: "description", value: description.slice(0, 2_000), provenance: "imported" });
      if (price) facts.push({ field: "price", value: price.slice(0, 80), provenance: "imported" });
      return {
        kind: input.kind,
        canonicalUrl: url.toString(),
        facts,
        imageCandidates: imageCandidates(html, url),
        warnings: [
          "Review and confirm every imported fact before generation.",
          ...(input.kind === "business" ? ["Booking, location and WhatsApp details must be confirmed manually."] : []),
        ],
        scannedAt: new Date().toISOString(),
        requestId: input.requestId,
      };
    },
  };
}
