import { getApiBaseUrl } from "@/services/auth/authService";

type UploadVcfFile = {
  uri: string;
  name: string;
  mimeType?: string;
};

type UploadVcfRequest = {
  token: string;
  userName: string;
  caseId: string;
  files: UploadVcfFile[];
};

type UploadVcfResponse = {
  message: string;
  summary: {
    totalContacts: number;
    newContacts: number;
    existingContacts: number;
  } | null;
};

type UploadApiResponse = {
  success?: boolean;
  message?: string;
  data?: {
    summary?: {
      totalContacts: number;
      newContacts: number;
      existingContacts: number;
    };
  };
};

const REQUEST_TIMEOUT_MS = 20000;
const TRANSIENT_RETRY_DELAY_MS = 450;

class TransientUploadError extends Error {}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeFileUri(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed) return trimmed;

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return `file://${trimmed}`;
  }

  return trimmed;
}

async function safeReadJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function postVcfUpload(
  request: UploadVcfRequest,
): Promise<UploadVcfResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const formData = new FormData();
    formData.append("userName", request.userName);
    formData.append("caseId", request.caseId);

    for (const file of request.files) {
      formData.append("vcfFiles", {
        uri: normalizeFileUri(file.uri),
        name: file.name,
        type: file.mimeType || "text/vcard",
      } as unknown as Blob);
    }

    const response = await fetch(`${getApiBaseUrl()}/contact/analyze-vcf`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${request.token}`,
      },
      body: formData,
      signal: controller.signal,
    });

    const json = await safeReadJson<UploadApiResponse>(response);
    if (!response.ok || json?.success !== true) {
      const message =
        json?.message || `Failed to upload VCF files (${response.status})`;
      throw new Error(message);
    }

    return {
      message: json.message || "VCF analysis completed",
      summary: json.data?.summary ?? null,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "Upload timed out. Check internet/API connection and try again.",
      );
    }

    if (error instanceof TypeError) {
      throw new TransientUploadError("Network request failed while uploading.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function uploadVcfFilesToCloud(
  request: UploadVcfRequest,
): Promise<UploadVcfResponse> {
  try {
    return await postVcfUpload(request);
  } catch (error) {
    if (!(error instanceof TransientUploadError)) {
      throw error;
    }

    await sleep(TRANSIENT_RETRY_DELAY_MS);

    try {
      return await postVcfUpload(request);
    } catch (retryError) {
      if (retryError instanceof TransientUploadError) {
        throw new Error(
          "Network request failed while uploading. Please retry in a moment.",
        );
      }
      throw retryError;
    }
  }
}
