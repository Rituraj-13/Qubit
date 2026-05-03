import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const userLimiter = rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
        req.userId ?? ipKeyGenerator(req.ip ?? "anonymous"),
    message: { message: "Rate limit exceeded !" }
});

export const shareLimiter = rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
        ipKeyGenerator(req.ip ?? "anonymous"),
});