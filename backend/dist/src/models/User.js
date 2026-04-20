"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const userSchema = new mongoose_1.default.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30,
        match: /^[a-zA-Z0-9_-]+$/,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    avatar: {
        type: String,
        default: null,
    },
    bio: {
        type: String,
        maxlength: 500,
    },
    role: {
        type: String,
        enum: ["viewer", "streamer", "admin"],
        default: "viewer",
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    lastLogin: {
        type: Date,
        default: null,
    },
    preferences: {
        notifications: {
            type: Boolean,
            default: true,
        },
        privacy: {
            type: String,
            enum: ["public", "hidden", "private"],
            default: "public",
        },
        theme: {
            type: String,
            enum: ["light", "dark", "auto"],
            default: "dark",
        },
    },
    stats: {
        totalStreams: {
            type: Number,
            default: 0,
        },
        totalViews: {
            type: Number,
            default: 0,
        },
        totalStreamTime: {
            type: Number,
            default: 0,
        },
        followers: {
            type: Number,
            default: 0,
        },
        following: {
            type: Number,
            default: 0,
        },
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ "stats.totalViews": -1 });
userSchema.index({ role: 1 });
userSchema.pre("save", async function (next) {
    this.updatedAt = new Date();
    if (!this.isModified("password"))
        return next();
    try {
        const salt = await bcrypt_1.default.genSalt(12);
        this.password = await bcrypt_1.default.hash(this.password, salt);
        next();
    }
    catch (error) {
        next(error);
    }
});
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt_1.default.compare(candidatePassword, this.password);
};
userSchema.methods.getPublicProfile = function () {
    return {
        id: this._id,
        username: this.username,
        avatar: this.avatar,
        bio: this.bio,
        isVerified: this.isVerified,
        stats: this.stats,
        createdAt: this.createdAt,
        role: this.role,
    };
};
userSchema.methods.getSafeProfile = function () {
    return {
        ...this.getPublicProfile(),
        email: this.email,
        preferences: this.preferences,
        lastLogin: this.lastLogin,
        updatedAt: this.updatedAt,
    };
};
exports.default = mongoose_1.default.model("User", userSchema);
//# sourceMappingURL=User.js.map