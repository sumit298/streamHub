"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const multer_1 = __importDefault(require("multer"));
const express_validator_1 = require("express-validator");
const auth_middleware_1 = __importDefault(require("../middleware/auth.middleware"));
const auth_controller_1 = __importDefault(require("../controllers/auth.controller"));
const avatarUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/"))
            cb(null, true);
        else
            cb(new Error("Only image files are allowed"));
    },
});
const router = express_1.default.Router();
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: { error: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});
const registerValidation = [
    (0, express_validator_1.body)("username")
        .trim()
        .isLength({ min: 3, max: 30 })
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage("Username must be 3-30 characters and contain only letters, numbers, underscore, or dash"),
    (0, express_validator_1.body)("email")
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage("Please provide a valid email address"),
    (0, express_validator_1.body)("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters")
        .matches(/[A-Z]/)
        .withMessage("Password must contain at least one uppercase letter")
        .matches(/[0-9]/)
        .withMessage("Password must contain at least one number")
];
const loginValidation = [
    (0, express_validator_1.body)("email").isEmail().normalizeEmail(),
    (0, express_validator_1.body)("password").notEmpty(),
];
const updateProfileValidation = [(0, express_validator_1.body)("bio").optional().isLength({ max: 500 })];
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const formattedErrors = {};
        errors.array().forEach((error) => {
            if (error.type === "field") {
                formattedErrors[error.path] = error.msg;
            }
        });
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: formattedErrors,
        });
    }
    next();
};
router.post("/register", authLimiter, registerValidation, handleValidationErrors, auth_controller_1.default.register);
router.post("/login", authLimiter, loginValidation, handleValidationErrors, auth_controller_1.default.login);
router.post("/refresh-token", auth_controller_1.default.refreshToken);
router.get("/me", auth_middleware_1.default.authenticate, auth_controller_1.default.getProfile);
router.put("/me", auth_middleware_1.default.authenticate, avatarUpload.single("avatar"), updateProfileValidation, handleValidationErrors, auth_controller_1.default.updateProfile);
router.get("/me/stats", auth_middleware_1.default.authenticate, auth_controller_1.default.getUserStats);
router.post("/logout", auth_middleware_1.default.authenticate, auth_controller_1.default.logout);
router.post("/forgot-password", auth_controller_1.default.forgotPassword);
router.post("/reset-password", auth_controller_1.default.resetPassword);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map