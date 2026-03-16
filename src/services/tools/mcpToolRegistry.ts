export interface GenMediaTool {
  generateHistoricalScene: (prompt: string) => Promise<string | null>;
}

class MCPToolRegistry {
  private genMediaTool: GenMediaTool | null = null;

  registerGenMediaTool(tool: GenMediaTool) {
    this.genMediaTool = tool;
  }

  getGenMediaTool() {
    return this.genMediaTool;
  }
}

export const mcpToolRegistry = new MCPToolRegistry();
