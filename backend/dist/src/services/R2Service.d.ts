import type { Logger } from "winston";
declare class R2Service {
    private logger;
    private client;
    private bucket;
    constructor(logger: Logger);
    uploadBuffer(buffer: Buffer, key: string, contentType: string): Promise<string>;
    uploadFile(filePath: string, key: string): Promise<string>;
    getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}
export default R2Service;
