import {
  PrivateObjectStorage,
  type SignUploadRequest,
  type SignedDownload,
  type SignedUpload,
} from "@movprompt/storage";

export type AssetObjectHead = {
  contentLength?: number;
  contentType?: string;
  checksumSha256?: string;
};

export interface AssetStorageGateway {
  readonly assetsBucket: string;
  readonly outputsBucket: string;
  signUpload(input: SignUploadRequest): Promise<SignedUpload>;
  signDownload(input: {
    bucket: string;
    key: string;
    downloadFilename?: string;
  }): Promise<SignedDownload>;
  head(bucket: string, key: string): Promise<AssetObjectHead>;
}

export function createAssetStorageGateway(storage: PrivateObjectStorage): AssetStorageGateway {
  return {
    assetsBucket: storage.assetsBucket,
    outputsBucket: storage.outputsBucket,
    signUpload: (input) => storage.signUpload(input),
    signDownload: (input) => storage.signDownload(input),
    async head(bucket, key) {
      const result = await storage.head(bucket, key);
      return {
        ...(result.ContentLength === undefined ? {} : { contentLength: result.ContentLength }),
        ...(result.ContentType === undefined ? {} : { contentType: result.ContentType }),
        ...(result.Metadata?.["sha256-hex"] === undefined
          ? {}
          : { checksumSha256: result.Metadata["sha256-hex"] }),
      };
    },
  };
}
