import path from "node:path";
import fs from "node:fs/promises";
import { InvalidFormatPathError } from "../errors/invalid-format-path";
import { AccessDeniedError } from "../errors/access-denied-error";
import { Project, SourceFile, ts } from "ts-morph";
import { RMQ_ROUTE_DECORATOR_NAME } from "../common/constants";
import { SimulationLinkDatum, SimulationNodeDatum } from "d3";

export interface RelationsGraph {
  id: string;
}

export interface QueueInfo {
  text?: string;
  class?: string;
}

export interface MethodRepresentation {
  file: string;
  class: string;
  name: string;
  type: "listener" | "sender";
  queue: QueueInfo;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface GraphNode extends SimulationNodeDatum {
  id: string;
  type: "sender" | "listener";
  label: string;
  details: any;
}

export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string;
  target: string;
  label: string;
}

export async function analyze(absolutePath: string): Promise<GraphData> {
  if (!path.isAbsolute(absolutePath)) {
    throw new InvalidFormatPathError(absolutePath);
  }

  try {
    await fs.access(absolutePath);
  } catch (err) {
    console.log(err);
    throw new AccessDeniedError(absolutePath);
  }

  const project = new Project({
    tsConfigFilePath: path.join(absolutePath, "tsconfig.json"),
  });

  project.addSourceFilesAtPaths(path.join(absolutePath, "src/**/*.ts"));
  const sourceFiles = project.getSourceFiles(
    path.join(absolutePath, "src/**/*.ts"),
  );

  const listenerMethods = getAllListenerMethods(sourceFiles);
  const sendersMethods = getAllSenderMethods(sourceFiles);

  const data = [...listenerMethods, ...sendersMethods];

  return prepareGraphData(data);
}

function getAllListenerMethods(
  sourceFiles: SourceFile[],
): MethodRepresentation[] {
  const result: MethodRepresentation[] = [];

  for (const sourceFile of sourceFiles) {
    const sourceClasses = sourceFile.getClasses();

    for (const sourceClass of sourceClasses) {
      const methods = sourceClass.getMethods();

      for (const method of methods) {
        const decorators = method.getDecorators();

        for (const decorator of decorators) {
          if (decorator.getName() === RMQ_ROUTE_DECORATOR_NAME) {
            let queue: MethodRepresentation["queue"] | undefined = undefined;

            const queueArgument = decorator.getArguments()[0];
            if (queueArgument) {
              if (queueArgument.isKind(ts.SyntaxKind.StringLiteral)) {
                queue = {
                  text: queueArgument.getLiteralValue(),
                };
              } else if (
                queueArgument.isKind(ts.SyntaxKind.PropertyAccessExpression)
              ) {
                const classHandler = queueArgument.getExpression().getText();
                queue = {
                  class: classHandler,
                };
              }
            }

            if (!queue) {
              continue;
            }

            result.push({
              name: method.getName(),
              class: sourceClass.getName() ?? "",
              file: sourceFile.getFilePath(),
              type: "listener",
              queue,
            });
          }
        }
      }
    }
  }

  return result;
}

function getAllSenderMethods(
  sourceFiles: SourceFile[],
): MethodRepresentation[] {
  const result: MethodRepresentation[] = [];

  for (const sourceFile of sourceFiles) {
    const sourceClasses = sourceFile.getClasses();

    for (const sourceClass of sourceClasses) {
      const methods = sourceClass.getMethods();

      for (const method of methods) {
        method.forEachDescendant((node) => {
          if (node.isKind(ts.SyntaxKind.CallExpression)) {
            const expression = node.getExpression();

            if (
              !expression.isKind(ts.SyntaxKind.PropertyAccessExpression) ||
              expression.getName() !== "send"
            ) {
              return;
            }

            const type = expression.getExpression().getType();

            if (type.getText() === "RMQService") {
              let queue: MethodRepresentation["queue"] | undefined = undefined;

              const queueArgument = node.getArguments()[0];
              if (queueArgument) {
                if (queueArgument.isKind(ts.SyntaxKind.StringLiteral)) {
                  queue = {
                    text: queueArgument.getLiteralValue(),
                  };
                } else if (
                  queueArgument.isKind(ts.SyntaxKind.PropertyAccessExpression)
                ) {
                  const classHandler = queueArgument.getExpression().getText();
                  queue = {
                    class: classHandler,
                  };
                }
              }

              if (!queue) {
                return;
              }

              result.push({
                name: method.getName(),
                class: sourceClass.getName() ?? "",
                file: sourceFile.getFilePath(),
                type: "sender",
                queue,
              });
            }
          }
        });
      }
    }
  }

  return result;
}

export const prepareGraphData = (data: MethodRepresentation[]): GraphData => {
  const nodes = new Map<string, GraphNode>();
  const links: GraphLink[] = [];

  const connections = new Map<
    string,
    { senders: MethodRepresentation[]; listeners: MethodRepresentation[] }
  >();

  for (const method of data) {
    if (!method.queue) {
      continue;
    }

    const connectionKey = method.queue.text ?? method.queue.class ?? "";

    if (!connections.has(connectionKey)) {
      connections.set(connectionKey, { senders: [], listeners: [] });
    }

    const group = connections.get(connectionKey)!;

    if (method.type === "sender") {
      group.senders.push(method);
    } else {
      group.listeners.push(method);
    }
  }

  for (const [key, group] of connections.entries()) {
    for (const sender of group.senders) {
      const senderId = `sender:${sender.class}.${sender.name}`;
      if (!nodes.has(senderId)) {
        nodes.set(senderId, {
          id: senderId,
          type: "sender",
          label: `${sender.class}.${sender.name}()`,
          details: { file: sender.file, class: sender.class },
        });
      }

      for (const listener of group.listeners) {
        const listenerId = `listener:${listener.class}.${listener.name}`;
        if (!nodes.has(listenerId)) {
          nodes.set(listenerId, {
            id: listenerId,
            type: "listener",
            label: `${listener.class}.${listener.name}()`,
            details: { file: listener.file, class: listener.class },
          });
        }

        links.push({
          source: senderId,
          target: listenerId,
          label: key,
        });
      }
    }
  }

  return { nodes: Array.from(nodes.values()), links };
};
