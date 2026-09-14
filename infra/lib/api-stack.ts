import { Duration, Stack, type StackProps } from "aws-cdk-lib";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { Cpu, HealthCheck, Memory, Service, Source } from "@aws-cdk/aws-apprunner-alpha";
import type { Construct } from "constructs";

/**
 * Describes (does not deploy) the Express API on App Runner, running the
 * existing apps/api process as-is — no application code changes needed.
 *
 * A Lambda + API Gateway shape was considered first (per the brief's
 * mention of serverless-http), but this app's actual design assumes a
 * single long-lived process: InMemoryFeedbackStore holds all state in
 * one process's memory, and the sweeper is a setInterval running inside
 * that process. Neither survives Lambda's per-invocation, potentially
 * fresh-execution-environment model - a request could hit a different
 * environment than the one that stored a given record, and setInterval
 * simply doesn't run in the gaps between invocations. Making Lambda
 * correct here means an external store (e.g. DynamoDB) and moving the
 * sweeper out-of-process (e.g. an EventBridge-scheduled Lambda) - a real
 * architecture change, not a deployment target swap.
 *
 * App Runner keeps one container running continuously, the same
 * guarantee apps/api/src/server.ts already assumes: the in-memory store
 * and the setInterval sweeper both work exactly as they do locally,
 * because it's the same process the whole time. The trade-off (still
 * true here, same as running this locally) is no horizontal scaling -
 * multiple instances would each hold an independent, inconsistent
 * in-memory store - and no data survives a restart/deploy. Fixing that
 * is the same external-store change Lambda would have needed anyway;
 * this stack just doesn't *also* require re-architecting the process
 * model to get there.
 */
export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Builds apps/api's container image locally at synth/deploy time.
    // The build context is the repo root (not apps/api) because this is
    // an npm workspaces monorepo: apps/api depends on @evinova/contracts
    // as a sibling workspace package, so the Dockerfile needs the whole
    // repo to run `npm ci` and build both packages. See apps/api/Dockerfile.
    const image = new DockerImageAsset(this, "ApiImage", {
      directory: "..",
      file: "apps/api/Dockerfile",
      exclude: [
        "node_modules",
        "**/node_modules",
        "**/dist",
        "**/cdk.out",
        "infra",
        "apps/web",
        "*.md",
      ],
    });

    new Service(this, "ApiService", {
      serviceName: "evinova-feedback-api",
      source: Source.fromAsset({
        asset: image,
        imageConfiguration: {
          port: 3000,
          environmentVariables: {
            MAX_RETRIES: "3",
            STALE_CLAIM_THRESHOLD_SECONDS: "180",
            SWEEP_INTERVAL_SECONDS: "60",
          },
          // ANTHROPIC_API_KEY would be added via Secret.fromSecretsManager(...)
          // and Service#addSecret(...), not as a plaintext env var here.
        },
      }),
      cpu: Cpu.QUARTER_VCPU,
      memory: Memory.HALF_GB,
      healthCheck: HealthCheck.http({
        path: "/health",
        interval: Duration.seconds(10),
        timeout: Duration.seconds(5),
      }),
    });
  }
}
