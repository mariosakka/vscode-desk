export interface AgentAdapter {
  readonly id: string;
  readonly label: string;
  isInstalled(): Promise<boolean>;
  isConfigured(port: number): Promise<boolean>;
  configure(port: number): Promise<void>;
  readonly skillInstallPath: string | null;
  isSkillInstalled(skillName: string): Promise<boolean>;
  installSkill(skillName: string, content: string): Promise<void>;
  uninstallSkill(skillName: string): Promise<void>;
}
