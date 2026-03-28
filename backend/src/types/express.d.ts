declare global {
    namespace Express {
        interface Request {
            userId: string;
            user: {
                id: string;
                username: string;
                email: string;
                role: 'viewer' | 'streamer' | 'admin';
            };
            requestId: string;
        }
    }
}

export {}