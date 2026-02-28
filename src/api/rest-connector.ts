import axios, { type AxiosError, type AxiosRequestConfig, type Method } from "axios";

export class RestConnector {
  public async request<T>(
    method: Method,
    url: string,
    token: string,
    data?: unknown,
    retries = 2,
  ): Promise<T> {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        const config: AxiosRequestConfig = {
          method,
          url,
          data,
          timeout: 10000,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        };
        const response = await axios.request<T>(config);
        return response.data;
      } catch (error) {
        if (attempt === retries || !this.isRetryableError(error)) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, this.getBackoffMs(attempt)));
      }
      attempt += 1;
    }
    throw new Error("Unreachable retry branch");
  }

  private isRetryableError(error: unknown): boolean {
    if (!axios.isAxiosError(error)) {
      return false;
    }

    const axiosError = error as AxiosError;
    if (axiosError.code === "ECONNABORTED" || axiosError.code === "ETIMEDOUT") {
      return true;
    }

    if (!axiosError.response) {
      return true;
    }

    const status = axiosError.response.status;
    return status === 408 || status === 425 || status === 429 || status >= 500;
  }

  private getBackoffMs(attempt: number): number {
    const base = Math.min(2000, 250 * 2 ** attempt);
    const jitter = Math.floor(Math.random() * 50);
    return base + jitter;
  }
}
