export class RequestJsonError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'RequestJsonError';
    this.status = status;
  }
}

export async function readBoundedJson(
  request: Request,
  maxBytes = 4 * 1024
): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > maxBytes) {
    throw new RequestJsonError('Request body is too large.', 413);
  }
  const contentType = request.headers.get('content-type');
  if (contentType && !contentType.toLowerCase().includes('application/json')) {
    throw new RequestJsonError('Request body must be JSON.', 415);
  }
  if (!request.body) {
    throw new RequestJsonError('Request body is required.', 400);
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalLength += value.byteLength;
    if (totalLength > maxBytes) {
      await reader.cancel();
      throw new RequestJsonError('Request body is too large.', 413);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new RequestJsonError('Request body must be valid JSON.', 400);
  }
}
