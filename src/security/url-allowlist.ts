export class UrlAllowlist {
  private readonly patterns: ParsedPattern[];

  public constructor(patterns: string[]) {
    this.patterns = patterns
      .map((pattern) => this.parsePattern(pattern))
      .filter((pattern): pattern is ParsedPattern => pattern !== null);
  }

  public isAllowed(url: string): boolean {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return false;
    }

    return this.patterns.some((pattern) => this.matchesPattern(parsedUrl, pattern));
  }

  private matchesPattern(url: URL, pattern: ParsedPattern): boolean {
    if (url.protocol.toLowerCase() !== pattern.protocol) {
      return false;
    }

    if (!this.matchHost(url.hostname.toLowerCase(), pattern.hostPattern)) {
      return false;
    }

    if (pattern.port !== null && url.port !== pattern.port) {
      return false;
    }

    return pattern.pathRegex.test(url.pathname);
  }

  private matchHost(hostname: string, hostPattern: string): boolean {
    const wildcardSubdomainMatch = hostPattern.match(/^\*\.(.+)$/);
    if (wildcardSubdomainMatch) {
      const baseDomain = wildcardSubdomainMatch[1];
      return hostname.endsWith(`.${baseDomain}`);
    }

    const escaped = hostPattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${escaped}$`, "i").test(hostname);
  }

  private parsePattern(pattern: string): ParsedPattern | null {
    let parsedPattern: URL;
    try {
      parsedPattern = new URL(pattern);
    } catch {
      return null;
    }

    return {
      protocol: parsedPattern.protocol.toLowerCase(),
      hostPattern: parsedPattern.hostname.toLowerCase(),
      port: parsedPattern.port || null,
      pathRegex: this.wildcardPathToRegex(parsedPattern.pathname),
    };
  }

  private wildcardPathToRegex(pathname: string): RegExp {
    const escaped = pathname.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${escaped}$`, "i");
  }
}

interface ParsedPattern {
  protocol: string;
  hostPattern: string;
  port: string | null;
  pathRegex: RegExp;
}
