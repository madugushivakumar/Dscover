/**
 * Standardized API client for Coy Discover.
 * Communicates with backend via Vite's configured /api proxy.
 */

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code || 'API_ERROR';
    this.details = details;
  }
}

/**
 * Executes an HTTP request against the /api backend.
 *
 * @param {string} endpoint - API path, e.g. '/feed', '/swipe', '/matches'
 * @param {Object} [options] - Fetch options
 * @returns {Promise<any>}
 */
export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('/') ? `/api${endpoint}` : `/api/${endpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {})
    }
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkErr) {
    throw new ApiError(
      'Unable to connect to Coy Discover server. Please check your connection.',
      0,
      'NETWORK_ERROR'
    );
  }

  let responseData = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  }

  if (!response.ok) {
    const errorMessage =
      responseData?.message ||
      `Request failed with status ${response.status} (${response.statusText})`;
    const errorCode = responseData?.error?.code || `HTTP_${response.status}`;

    throw new ApiError(errorMessage, response.status, errorCode, responseData);
  }

  return responseData;
}

export default {
  apiRequest,
  ApiError
};
