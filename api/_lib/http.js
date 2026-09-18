const MAX_BODY_BYTES = 8192;

export class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function readJson(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new RequestError('Se requiere contenido JSON', 415);
  }

  const text = await request.text();
  if (!text || new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new RequestError('Solicitud inválida');
  }

  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError('JSON object required');
    }
    return value;
  } catch {
    throw new RequestError('Solicitud inválida');
  }
}

export function json(value, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export function handleError(error, context) {
  if (error instanceof RequestError) {
    return json({ error: error.message }, error.status);
  }

  console.error(context, {
    name: error?.name,
    code: error?.code,
    message: error?.message
  });
  return json({ error: 'No pudimos procesar la solicitud' }, 500);
}
