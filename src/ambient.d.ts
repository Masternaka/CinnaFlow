// Cinnamon global declarations — available at runtime via the Cinnamon JS engine
declare const imports: any;
declare const global: {
    display: any;
    workspace_manager: any;
    workspaceManager: any;
    stage: any;
    get_stage(): any;
    get_current_time(): number;
    log(msg: string): void;
    logError(msg: string, err?: any): void;
};
