import type {
  DesignBrief,
  GeneratorIR,
  ImagegenRequest,
  MockupArtifact,
  RuntimeRequest
} from "./types.js";

export type ProviderMode = "stub" | "external";
export type ImagegenProviderKind = "stub" | "imagegen";
export type PlannerProviderKind = "stub" | "planner";
export type ProviderEnv = Readonly<Record<string, string | undefined>>;

export interface ProviderEndpointConfig<TKind extends string> {
  kind: TKind;
  mode: ProviderMode;
  requiredEnv: string[];
}

export interface ProviderBoundaryConfig {
  imagegen: ProviderEndpointConfig<ImagegenProviderKind>;
  planner: ProviderEndpointConfig<PlannerProviderKind>;
  allowNetwork: boolean;
}

export interface ResolveProviderBoundaryConfigOptions {
  imagegenProvider?: ImagegenProviderKind;
  plannerProvider?: PlannerProviderKind;
  allowNetwork?: boolean;
  env?: ProviderEnv;
}

export interface ImagegenProviderInput {
  request: RuntimeRequest;
  prompt: string;
  outputPath: string;
  width: number;
  height: number;
  seed: string;
}

export interface ImagegenProviderOutput {
  imagegenRequest: ImagegenRequest;
  mockup: MockupArtifact;
}

export interface ImagegenProvider {
  readonly config: ProviderEndpointConfig<ImagegenProviderKind>;
  createMockup(input: ImagegenProviderInput): Promise<ImagegenProviderOutput> | ImagegenProviderOutput;
}

export interface PlannerProviderInput {
  request: RuntimeRequest;
  designBrief: DesignBrief;
}

export interface PlannerProvider {
  readonly config: ProviderEndpointConfig<PlannerProviderKind>;
  plan(input: PlannerProviderInput): Promise<GeneratorIR> | GeneratorIR;
}

export class ProviderConfigError extends Error {
  readonly provider: ImagegenProviderKind | PlannerProviderKind;
  readonly missingEnv: string[];

  constructor(provider: ImagegenProviderKind | PlannerProviderKind, missingEnv: string[]) {
    super(`${provider} provider missing required env: ${missingEnv.join(", ")}`);
    this.name = "ProviderConfigError";
    this.provider = provider;
    this.missingEnv = missingEnv;
  }
}

const imagegenRequiredEnv = ["VIEWFOUNDRY_IMAGEGEN_PROVIDER", "VIEWFOUNDRY_IMAGEGEN_API_KEY"];
const plannerRequiredEnv = ["VIEWFOUNDRY_PLANNER_PROVIDER", "VIEWFOUNDRY_PLANNER_API_KEY"];

export function resolveProviderBoundaryConfig(
  options: ResolveProviderBoundaryConfigOptions = {}
): ProviderBoundaryConfig {
  const imagegenProvider = options.imagegenProvider ?? "stub";
  const plannerProvider = options.plannerProvider ?? "stub";
  const env = options.env ?? process.env;

  const imagegen = createEndpointConfig(imagegenProvider, imagegenRequiredEnv, env);
  const planner = createEndpointConfig(plannerProvider, plannerRequiredEnv, env);

  return {
    imagegen,
    planner,
    allowNetwork: options.allowNetwork ?? false
  };
}

export function assertNoNetworkProviderConfig(config: ProviderBoundaryConfig): void {
  if (config.allowNetwork || config.imagegen.mode !== "stub" || config.planner.mode !== "stub") {
    throw new ProviderConfigError("stub", ["VIEWFOUNDRY_PROVIDER_NETWORK_DISABLED"]);
  }
}

export function createStubImagegenProvider(): ImagegenProvider {
  return {
    config: {
      kind: "stub",
      mode: "stub",
      requiredEnv: []
    },
    createMockup(input) {
      const imagegenRequest: ImagegenRequest = {
        provider: "stub",
        prompt: input.prompt,
        targetPlatform: input.request.targetPlatform,
        primaryDevice: input.request.primaryDevice,
        ...(input.request.visualConstraints
          ? { visualConstraints: input.request.visualConstraints }
          : {}),
        outputPath: input.outputPath,
        width: input.width,
        height: input.height,
        seed: input.seed
      };

      return {
        imagegenRequest,
        mockup: {
          kind: "imagegen",
          prompt: imagegenRequest.prompt,
          imagePath: input.outputPath,
          width: input.width,
          height: input.height,
          notes: [
            "Deterministic local stub; no image generation provider was called.",
            "Replace this artifact with a provider image when imagegen integration is implemented."
          ]
        }
      };
    }
  };
}

export function createStubPlannerProvider(
  plan: (input: PlannerProviderInput) => GeneratorIR
): PlannerProvider {
  return {
    config: {
      kind: "stub",
      mode: "stub",
      requiredEnv: []
    },
    plan
  };
}

function createEndpointConfig<TKind extends ImagegenProviderKind | PlannerProviderKind>(
  kind: TKind,
  requiredEnv: string[],
  env: ProviderEnv
): ProviderEndpointConfig<TKind> {
  if (kind === "stub") {
    return {
      kind,
      mode: "stub",
      requiredEnv: []
    };
  }

  const missingEnv = requiredEnv.filter((key) => !env[key]);
  if (missingEnv.length > 0) {
    throw new ProviderConfigError(kind, missingEnv);
  }

  return {
    kind,
    mode: "external",
    requiredEnv
  };
}
