/**
 * Feature Flags — reads feature-flags.txt to enable/disable agent capabilities.
 *
 * File format: key=true|false, one per line, # comments ignored.
 * Falls back to defaults if file is missing.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createLogger, format, transports } from "winston";

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

export interface FeatureFlags {
  // Security
  urlAllowlist: boolean;
  contentSafety: boolean;
  approvalGate: boolean;
  piiRedaction: boolean;
  auditLogging: boolean;

  // Browser
  dualPathRouting: boolean;
  apiDiscovery: boolean;
  botDetectionFallback: boolean;

  // Analytics
  fabricAnalytics: boolean;
  workIqMetrics: boolean;

  // Agent
  aguiStreaming: boolean;
  workflowOrchestration: boolean;
  screenshotCapture: boolean;
}

const DEFAULTS: FeatureFlags = {
  urlAllowlist: true,
  contentSafety: true,
  approvalGate: true,
  piiRedaction: true,
  auditLogging: true,
  dualPathRouting: true,
  apiDiscovery: true,
  botDetectionFallback: true,
  fabricAnalytics: false,
  workIqMetrics: false,
  aguiStreaming: true,
  workflowOrchestration: true,
  screenshotCapture: true,
};

const KEY_MAP: Record<string, keyof FeatureFlags> = {
  url_allowlist: "urlAllowlist",
  content_safety: "contentSafety",
  approval_gate: "approvalGate",
  pii_redaction: "piiRedaction",
  audit_logging: "auditLogging",
  dual_path_routing: "dualPathRouting",
  api_discovery: "apiDiscovery",
  bot_detection_fallback: "botDetectionFallback",
  fabric_analytics: "fabricAnalytics",
  work_iq_metrics: "workIqMetrics",
  agui_streaming: "aguiStreaming",
  workflow_orchestration: "workflowOrchestration",
  screenshot_capture: "screenshotCapture",
};

function loadFlags(): FeatureFlags {
  const flags = { ...DEFAULTS };
  const filePath = resolve(process.cwd(), "feature-flags.txt");

  if (!existsSync(filePath)) {
    logger.info("feature-flags-defaults", { source: "defaults" });
    return flags;
  }

  const lines = readFileSync(filePath, "utf-8").split("\n");
  let loaded = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim().toLowerCase();
    const flagKey = KEY_MAP[key];

    if (flagKey) {
      flags[flagKey] = value === "true";
      loaded++;
    }
  }

  logger.info("feature-flags-loaded", { source: "feature-flags.txt", loaded, flags });
  return flags;
}

export const featureFlags: FeatureFlags = loadFlags();
