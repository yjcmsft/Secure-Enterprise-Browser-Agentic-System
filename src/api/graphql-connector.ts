import axios, { type AxiosError } from "axios";

export class GraphqlConnector {
  public async query<T>(
    endpoint: string,
    query: string,
    variables: Record<string, unknown>,
    token: string,
    retries = 2,
  ): Promise<T> {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        const response = await axios.post<{ data: T; errors?: Array<{ message: string }> }>(
          endpoint,
          { query, variables },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            timeout: 10000,
          },
        );

        if (response.data.errors?.length) {
          throw new Error(response.data.errors.map((item) => item.message).join("; "));
        }

        return response.data.data;
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
