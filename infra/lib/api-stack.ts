import { Duration, Stack, type StackProps } from "aws-cdk-lib";
import { RestApi, LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import type { Construct } from "constructs";

/**
 * Describes (does not deploy) the Express API as a Lambda behind API
 * Gateway, per the brief. The Express app itself is unchanged; a thin
 * handler wraps it with serverless-http and is the Lambda entrypoint.
 *
 * Not production-ready as-is: InMemoryFeedbackStore and the setInterval
 * sweeper in apps/api/src/server.ts both assume one long-lived process.
 * On Lambda, each invocation can run in a fresh execution environment,
 * so state written by one request is not reliably visible to the next.
 * A real deployment needs the store backed by something external (e.g.
 * DynamoDB or RDS) and the sweeper moved out of-process (e.g. an
 * EventBridge scheduled rule invoking a separate sweep Lambda) rather
 * than a setInterval living inside the request-handling Lambda.
 */
export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const apiFunction = new Function(this, "ApiFunction", {
      runtime: Runtime.NODEJS_22_X,
      // Handler entrypoint: a serverless-http wrapper around the same
      // createApp({ store, worker }) used by apps/api/src/server.ts.
      // Bundling (esbuild/tsc) into this asset path is a follow-up
      // concern — this stack only describes the resource shape.
      handler: "index.handler",
      code: Code.fromInline(
        "exports.handler = async () => ({ statusCode: 501, body: 'not implemented' });",
      ),
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: {
        // ANTHROPIC_API_KEY would come from Secrets Manager / SSM in a
        // real deployment, not a plaintext environment variable.
        MAX_RETRIES: "3",
        STALE_CLAIM_THRESHOLD_SECONDS: "180",
      },
    });

    const api = new RestApi(this, "FeedbackApi", {
      restApiName: "evinova-feedback-api",
      deployOptions: {
        stageName: "prod",
      },
    });

    // Proxy every path/method through to the Lambda, mirroring the
    // existing Express routing (createApp already owns /health and
    // /api/records/*) instead of re-declaring routes at the API Gateway
    // level.
    api.root.addProxy({
      defaultIntegration: new LambdaIntegration(apiFunction),
      anyMethod: true,
    });
  }
}
