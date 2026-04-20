"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const fs_1 = require("fs");
class R2Service {
    logger;
    client;
    bucket;
    constructor(logger) {
        this.logger = logger;
        this.client = new client_s3_1.S3Client({
            region: "auto",
            endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
            },
        });
        this.bucket = process.env.R2_BUCKET_NAME;
    }
    async uploadBuffer(buffer, key, contentType) {
        await this.client.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        }));
        this.logger.info(`Uploaded ${key} to R2`);
        if (process.env.R2_PUBLIC_URL) {
            return `${process.env.R2_PUBLIC_URL}/${key}`;
        }
        return `https://${this.bucket}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
    }
    async uploadFile(filePath, key) {
        const fileContent = await fs_1.promises.readFile(filePath);
        await this.client.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: fileContent,
            ContentType: "video/webm",
        }));
        this.logger.info(`Uploaded ${key} to R2`);
        return `https://${this.bucket}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
    }
    async getSignedUrl(key, expiresIn = 86400) {
        if (process.env.R2_PUBLIC_URL) {
            return `${process.env.R2_PUBLIC_URL}/${key}`;
        }
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        return await (0, s3_request_presigner_1.getSignedUrl)(this.client, command, { expiresIn });
    }
}
exports.default = R2Service;
//# sourceMappingURL=R2Service.js.map