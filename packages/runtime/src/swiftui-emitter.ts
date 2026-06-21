import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createArtifactPaths } from "./artifacts.js";
import type {
  GeneratorIR,
  GeneratorIRAlignment,
  GeneratorIRButtonNode,
  GeneratorIRForegroundStyle,
  GeneratorIRNode,
  GeneratorIRStackNode,
  GeneratorIRSymbolNode,
  GeneratorIRSystemBackground,
  GeneratorIRTextNode,
  GeneratorIRTextStyle,
  RuntimeRequest,
  SwiftUIGenerationOutput
} from "./types.js";

export class SwiftUIEmitterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SwiftUIEmitterError";
  }
}

export interface SwiftUIEmission {
  source: string;
  report: SwiftUIGenerationOutput;
}

export interface WriteSwiftUIEmissionOptions {
  artifactRoot: string;
  sandboxGeneratedFile: string;
}

export function createGeneratorIRFromRuntimeRequest(request: RuntimeRequest): GeneratorIR {
  const device = [
    request.primaryDevice.name,
    request.primaryDevice.os,
    request.primaryDevice.appearance
  ]
    .filter(Boolean)
    .join(" / ");

  return {
    version: "generator-ir/v1",
    targetPlatform: "ios",
    root: {
      kind: "zstack",
      background: "systemBackground",
      ignoresSafeArea: true,
      children: [
        {
          kind: "vstack",
          alignment: "leading",
          spacing: 16,
          padding: 24,
          children: [
            {
              kind: "text",
              content: "ViewFoundry Sandbox",
              textStyle: "caption",
              foregroundStyle: "secondary",
              bold: true
            },
            {
              kind: "text",
              content: request.prompt,
              textStyle: "title",
              bold: true
            },
            {
              kind: "text",
              content: device || "Primary device unspecified",
              textStyle: "body",
              foregroundStyle: "secondary"
            }
          ]
        }
      ]
    },
    unsupportedRequestParts: createUnsupportedRequestParts(request),
    assumptions: [
      "Prompt text is emitted as static SwiftUI copy.",
      "Generated output is isolated to the sandbox generated view."
    ]
  };
}

function createUnsupportedRequestParts(request: RuntimeRequest): string[] | undefined {
  const unsupported: string[] = [];

  if (request.smokeDevices && request.smokeDevices.length > 0) {
    unsupported.push(
      `smokeDevices not rendered: ${request.smokeDevices.map(formatDeviceTarget).join("; ")}`
    );
  }

  for (const [category, values] of Object.entries(request.visualConstraints ?? {})) {
    if (values && values.length > 0) {
      unsupported.push(`visualConstraints.${category} not rendered: ${values.join("; ")}`);
    }
  }

  return unsupported.length > 0 ? unsupported : undefined;
}

function formatDeviceTarget(device: RuntimeRequest["primaryDevice"]): string {
  return [device.name, device.os, device.appearance].filter(Boolean).join(" / ");
}

export function emitSwiftUI(ir: GeneratorIR, entryFile: string): SwiftUIEmission {
  const source = `import SwiftUI

struct ViewFoundryGeneratedView: View {
    var body: some View {
${indent(renderNode(ir.root), 2)}
    }
}
`;

  return {
    source,
    report: {
      entryFile,
      sourceFiles: [{ path: entryFile, role: "generated-swiftui" }],
      assetFiles: [],
      ...(ir.unsupportedRequestParts ? { unsupportedRequestParts: ir.unsupportedRequestParts } : {}),
      ...(ir.assumptions ? { assumptions: ir.assumptions } : {})
    }
  };
}

export async function writeSwiftUIEmission(
  ir: GeneratorIR,
  options: WriteSwiftUIEmissionOptions
): Promise<SwiftUIGenerationOutput> {
  const paths = createArtifactPaths(options.artifactRoot);
  const artifactEntryFile = path.join(paths.swiftuiSources, "ViewFoundryGeneratedView.swift");
  const emission = emitSwiftUI(ir, artifactEntryFile);

  await Promise.all([
    mkdir(paths.swiftuiSources, { recursive: true }),
    mkdir(path.dirname(options.sandboxGeneratedFile), { recursive: true })
  ]);
  await Promise.all([
    writeFile(artifactEntryFile, emission.source),
    writeFile(options.sandboxGeneratedFile, emission.source),
    writeFile(paths.generationReport, `${JSON.stringify(emission.report, null, 2)}\n`)
  ]);

  return emission.report;
}

function renderNode(node: GeneratorIRNode): string {
  switch (node.kind) {
    case "zstack":
    case "vstack":
      return renderStack(node);
    case "text":
      return renderText(node);
    case "button":
      return renderButton(node);
    case "sfSymbol":
      return renderSymbol(node);
    default:
      throw new SwiftUIEmitterError(`unsupported generator IR node kind: ${String((node as { kind?: unknown }).kind)}`);
  }
}

function renderStack(node: GeneratorIRStackNode): string {
  const header = renderStackHeader(node);
  const children = renderStackChildren(node);
  const modifiers = renderStackModifiers(node);
  return [header, indent(children, 1), "}", ...modifiers].join("\n");
}

function renderStackHeader(node: GeneratorIRStackNode): string {
  if (node.kind === "zstack") {
    return node.alignment ? `ZStack(alignment: ${renderAlignment(node.alignment)}) {` : "ZStack {";
  }

  const args: string[] = [];
  if (node.alignment) {
    args.push(`alignment: ${renderAlignment(node.alignment)}`);
  }
  if (node.spacing !== undefined) {
    args.push(`spacing: ${formatNumber(node.spacing)}`);
  }
  return args.length > 0 ? `VStack(${args.join(", ")}) {` : "VStack {";
}

function renderStackChildren(node: GeneratorIRStackNode): string {
  const children = [...node.children];
  const rendered = children.map(renderNode);

  if (node.kind === "zstack" && node.background) {
    rendered.unshift(renderBackground(node.background, node.ignoresSafeArea));
  }

  return rendered.join("\n\n");
}

function renderStackModifiers(node: GeneratorIRStackNode): string[] {
  const modifiers: string[] = [];

  if (node.padding !== undefined) {
    modifiers.push(`.padding(${formatNumber(node.padding)})`);
  }
  if (node.kind !== "zstack" && node.background) {
    modifiers.push(`.background(${renderColor(node.background)})`);
  }
  if (node.kind !== "zstack" && node.ignoresSafeArea) {
    modifiers.push(".ignoresSafeArea()");
  }

  return modifiers;
}

function renderText(node: GeneratorIRTextNode): string {
  const modifiers = [renderFont(node.textStyle, node.bold)];
  if (node.foregroundStyle) {
    modifiers.push(`.foregroundStyle(${renderForegroundStyle(node.foregroundStyle)})`);
  }
  return renderModifierChain(`Text(${swiftStringLiteral(node.content)})`, modifiers);
}

function renderButton(node: GeneratorIRButtonNode): string {
  return [
    "Button(action: {}) {",
    indent(`Text(${swiftStringLiteral(node.label)})`, 1),
    "}",
    ".buttonStyle(.borderedProminent)"
  ].join("\n");
}

function renderSymbol(node: GeneratorIRSymbolNode): string {
  const modifiers: string[] = [];
  if (node.textStyle) {
    modifiers.push(renderFont(node.textStyle, false));
  }
  if (node.foregroundStyle) {
    modifiers.push(`.foregroundStyle(${renderForegroundStyle(node.foregroundStyle)})`);
  }
  return renderModifierChain(`Image(systemName: ${swiftStringLiteral(node.systemName)})`, modifiers);
}

function renderBackground(
  background: GeneratorIRSystemBackground,
  ignoresSafeArea: boolean | undefined
): string {
  const lines = [renderColor(background)];
  if (ignoresSafeArea) {
    lines.push("    .ignoresSafeArea()");
  }
  return lines.join("\n");
}

function renderColor(background: GeneratorIRSystemBackground): string {
  switch (background) {
    case "systemBackground":
      return "Color(.systemBackground)";
    case "secondarySystemBackground":
      return "Color(.secondarySystemBackground)";
  }
}

function renderFont(style: GeneratorIRTextStyle, bold: boolean | undefined): string {
  const font = `.${style}`;
  return bold ? `.font(${font}.bold())` : `.font(${font})`;
}

function renderForegroundStyle(style: GeneratorIRForegroundStyle): string {
  switch (style) {
    case "primary":
      return ".primary";
    case "secondary":
      return ".secondary";
  }
}

function renderAlignment(alignment: GeneratorIRAlignment): string {
  switch (alignment) {
    case "leading":
      return ".leading";
    case "center":
      return ".center";
    case "trailing":
      return ".trailing";
  }
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

function indent(value: string, levels: number): string {
  const prefix = "    ".repeat(levels);
  return value
    .split("\n")
    .map((line) => (line.length > 0 ? `${prefix}${line}` : ""))
    .join("\n");
}

function renderModifierChain(base: string, modifiers: string[]): string {
  return [base, ...modifiers.map((modifier) => `    ${modifier}`)].join("\n");
}

export function swiftStringLiteral(value: string): string {
  let literal = "\"";

  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) {
      continue;
    }

    if (character === "\"") {
      literal += "\\\"";
    } else if (character === "\\") {
      literal += "\\\\";
    } else if (codePoint < 0x20 || codePoint === 0x7f || codePoint === 0x2028 || codePoint === 0x2029) {
      literal += `\\u{${codePoint.toString(16)}}`;
    } else {
      literal += character;
    }
  }

  literal += "\"";
  return literal;
}
