export interface AgentAdapter {
  readonly id: string;
  readonly label: string;
  isInstalled(): Promise<boolean>;
  isConfigured(port: number): Promise<boolean>;
  configure(port: number): Promise<void>;
}
