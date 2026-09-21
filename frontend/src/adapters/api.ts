import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from 'axios';

type Handler = <T>(url: string, config?: AxiosRequestConfig) => Promise<T>;
type HandlerWithPayload = <T, P = unknown>(
  url: string,
  payload?: P,
  config?: AxiosRequestConfig,
) => Promise<T>;
type ErrorResponseInterceptor = (error: AxiosError) => unknown;

class ApiClient {
  private readonly instance: AxiosInstance;

  constructor(baseURL: string, config?: AxiosRequestConfig) {
    this.instance = axios.create({
      baseURL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    });
  }

  public setHeader(header: string, value: string): void {
    this.instance.defaults.headers.common[header] = value;
  }

  public removeHeader(header: string): void {
    delete this.instance.defaults.headers.common[header];
  }

  public setErrorResponseInterceptor(onError: ErrorResponseInterceptor): void {
    this.instance.interceptors.response.use((response) => response, onError);
  }

  public retry(config: AxiosRequestConfig) {
    return this.instance.request(config);
  }

  private makeRequest<T>(
    method: string,
    url: string,
    options?: AxiosRequestConfig,
  ): Promise<T> {
    return this.instance
      .request<T>({ method, url, ...options })
      .then((response) => response.data);
  }

  public get: Handler = (url, config) => this.makeRequest('get', url, config);

  public post: HandlerWithPayload = (url, payload, config) =>
    this.makeRequest('post', url, { ...config, data: payload });

  public put: HandlerWithPayload = (url, payload, config) =>
    this.makeRequest('put', url, { ...config, data: payload });

  public patch: HandlerWithPayload = (url, payload, config) =>
    this.makeRequest('patch', url, { ...config, data: payload });

  public delete: Handler = (url, config) =>
    this.makeRequest('delete', url, config);
}

export const api = new ApiClient('http://localhost:3000');
