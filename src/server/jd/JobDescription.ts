export interface JobDescription {
    brief: string;
    cron: string;
    execute();
}