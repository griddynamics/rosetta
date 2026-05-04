"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walkUp = exports.hasMarkerBeforeBoundary = exports.toRelative = exports.isInTempDir = exports.basenameIn = exports.pathStartsWithAny = exports.pathContainsAny = exports.hasExtension = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const hasExtension = (filePath, exts) => !!filePath && exts.includes(path_1.default.extname(filePath));
exports.hasExtension = hasExtension;
const pathContainsAny = (filePath, segments) => segments.some(s => filePath.includes(s));
exports.pathContainsAny = pathContainsAny;
const pathStartsWithAny = (filePath, prefixes) => prefixes.some(p => filePath.startsWith(p));
exports.pathStartsWithAny = pathStartsWithAny;
const basenameIn = (filePath, basenames) => basenames.includes(path_1.default.basename(filePath));
exports.basenameIn = basenameIn;
const isInTempDir = (filePath) => /(^|\/)\.?(temp|tmp)([-_.]|$|\/)/i.test(filePath);
exports.isInTempDir = isInTempDir;
const toRelative = (filePath) => {
    let p = filePath.replace(/\\/g, '/');
    if (p.startsWith('/'))
        p = p.slice(1);
    if (p.startsWith('./'))
        p = p.slice(2);
    return p;
};
exports.toRelative = toRelative;
const hasMarkerBeforeBoundary = (startDir, marker, boundary, maxLevels = 10) => {
    let dir = startDir;
    for (let i = 0; i < maxLevels; i++) {
        if (fs_1.default.existsSync(path_1.default.join(dir, marker)))
            return true;
        if (fs_1.default.existsSync(path_1.default.join(dir, boundary)))
            return false;
        const parent = path_1.default.dirname(dir);
        if (parent === dir)
            return false;
        dir = parent;
    }
    return false;
};
exports.hasMarkerBeforeBoundary = hasMarkerBeforeBoundary;
const walkUp = (startDir, marker, maxLevels = 10) => {
    let dir = startDir;
    for (let i = 0; i < maxLevels; i++) {
        if (fs_1.default.existsSync(path_1.default.join(dir, marker)))
            return dir;
        const parent = path_1.default.dirname(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return null;
};
exports.walkUp = walkUp;
