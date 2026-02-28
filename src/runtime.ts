import { DualPathRouter } from "./api/dual-path-router.js";
import { GraphqlConnector } from "./api/graphql-connector.js";
import { ResponseNormalizer } from "./api/response-normalizer.js";
import { RestConnector } from "./api/rest-connector.js";
import { BrowserPool } from "./browser/browser-pool.js";
import { DomParser } from "./browser/dom-parser.js";
import { ElementSelector } from "./browser/element-selector.js";
import { SessionManager } from "./browser/session-manager.js";
import { config } from "./config.js";
import { SecurityGate } from "./security/index.js";

export const runtime = {
  securityGate: new SecurityGate(config.allowlistPatterns),
  browserPool: new BrowserPool({ maxConcurrency: config.MAX_BROWSER_CONCURRENCY, idleTimeoutMs: 600000 }),
  domParser: new DomParser(),
  elementSelector: new ElementSelector(),
  dualPathRouter: new DualPathRouter(),
  restConnector: new RestConnector(),
  graphqlConnector: new GraphqlConnector(),
  responseNormalizer: new ResponseNormalizer(),
};

runtime;

export const sessionManager = new SessionManager(runtime.browserPool, config.SESSION_TTL_MS);
