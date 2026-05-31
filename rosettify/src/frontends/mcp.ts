import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { getMcpTools, getToolDef } from "../registry/index.js";
import { dispatch } from "../shared/dispatch.js";
import { extractOutput, logFailure } from "../shared/envelope.js";
import { logger } from "../shared/logger.js";
import { VERSION } from "../shared/version.js";

export async function runMcp(): Promise<void> {
  const server = new Server(
    { name: "rosettify", version: VERSION },
    { capabilities: { tools: {} } },
  );

  // tools/list handler
  server.setRequestHandler(ListToolsRequestSchema, () => {
    const tools = getMcpTools().map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
    return { tools };
  });

  // tools/call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const toolDef = getToolDef(toolName);

    if (!toolDef) {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${toolName}`,
      );
    }

    const envelope = await dispatch(toolDef, request.params.arguments ?? {});
    const output = extractOutput(envelope);
    if (!output.ok) {
      logFailure(logger, toolName, envelope.error ?? "unknown_error");
    } else {
      logger.info({ tool: toolName, ok: true }, "mcp tool call");
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(output.payload),
        },
      ],
      isError: !envelope.ok,
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info({}, "rosettify MCP server started");
}
