import { App } from "aws-cdk-lib";
import { ApiStack } from "../lib/api-stack.js";

const app = new App();
new ApiStack(app, "EvinovaFeedbackApiStack");
