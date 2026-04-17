import express, { Router } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { body, validationResult } from "express-validator";
import AuthMiddleware from "@middleware/auth.middleware";
import AuthController from "@controllers/auth.controller";

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerValidation = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username must be 3-30 characters and contain only letters, numbers, underscore, or dash",
    ),
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number"),
  body("role").isIn(["viewer", "streamer", "admin"]).optional(),
];

const loginValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
];

const updateProfileValidation = [body("bio").optional().isLength({ max: 500 })];

const handleValidationErrors = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors: Record<string, string> = {};
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

router.post(
  "/register",
  authLimiter,
  registerValidation,
  handleValidationErrors,
  AuthController.register,
);

router.post(
  "/login",
  authLimiter,
  loginValidation,
  handleValidationErrors,
  AuthController.login,
);

router.post("/refresh-token", AuthController.refreshToken);

router.get("/me", AuthMiddleware.authenticate, AuthController.getProfile);

router.put(
  "/me",
  AuthMiddleware.authenticate,
  avatarUpload.single("avatar"),
  updateProfileValidation,
  handleValidationErrors,
  AuthController.updateProfile,
);

router.get(
  "/me/stats",
  AuthMiddleware.authenticate,
  AuthController.getUserStats,
);

router.post("/logout", AuthMiddleware.authenticate, AuthController.logout);

router.post("/forgot-password", AuthController.forgotPassword);

router.post("/reset-password", AuthController.resetPassword);

export default router;
