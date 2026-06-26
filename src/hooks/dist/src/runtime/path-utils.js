"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walkUp = exports.hasMarkerBeforeBoundary = exports.toRelative = exports.isInTempDir = exports.basenameIn = exports.pathStartsWithAny = exports.pathContainsAny = exports.hasExtension = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const debug_log_1 = require("./debug-log");
const hasExtension = (filePath, exts) => {
    const extension = path_1.default.extname(filePath);
    const result = !!filePath && exts.includes(extension);
    (0, debug_log_1.debugLogBranch)('path-utils', 'has-extension', {
        filePath,
        extension,
        exts,
        result,
    });
    return result;
};
exports.hasExtension = hasExtension;
const pathContainsAny = (filePath, segments) => {
    const matchedSegments = segments.filter((segment) => filePath.includes(segment));
    const result = matchedSegments.length > 0;
    (0, debug_log_1.debugLogBranch)('path-utils', 'path-contains-any', {
        filePath,
        segments,
        matchedSegments,
        result,
    });
    return result;
};
exports.pathContainsAny = pathContainsAny;
const pathStartsWithAny = (filePath, prefixes) => {
    const matchedPrefixes = prefixes.filter((prefix) => filePath.startsWith(prefix));
    const result = matchedPrefixes.length > 0;
    (0, debug_log_1.debugLogBranch)('path-utils', 'path-starts-with-any', {
        filePath,
        prefixes,
        matchedPrefixes,
        result,
    });
    return result;
};
exports.pathStartsWithAny = pathStartsWithAny;
const basenameIn = (filePath, basenames) => {
    const basename = path_1.default.basename(filePath);
    const result = basenames.includes(basename);
    (0, debug_log_1.debugLogBranch)('path-utils', 'basename-in', {
        filePath,
        basename,
        basenames,
        result,
    });
    return result;
};
exports.basenameIn = basenameIn;
const isInTempDir = (filePath) => {
    const result = /(^|\/)\.?(temp|tmp)([-_.]|$|\/)/i.test(filePath);
    (0, debug_log_1.debugLogBranch)('path-utils', 'is-in-temp-dir', {
        filePath,
        result,
    });
    return result;
};
exports.isInTempDir = isInTempDir;
const toRelative = (filePath) => {
    let p = filePath.replace(/\\/g, '/');
    if (p.startsWith('/'))
        p = p.slice(1);
    if (p.startsWith('./'))
        p = p.slice(2);
    (0, debug_log_1.debugLogBranch)('path-utils', 'to-relative', {
        filePath,
        relativePath: p,
    });
    return p;
};
exports.toRelative = toRelative;
const hasMarkerBeforeBoundary = (startDir, marker, boundary, maxLevels = 10) => {
    let dir = startDir;
    (0, debug_log_1.debugLogBranch)('path-utils', 'has-marker-before-boundary-start', {
        startDir,
        marker,
        boundary,
        maxLevels,
    });
    for (let i = 0; i < maxLevels; i++) {
        const markerPath = path_1.default.join(dir, marker);
        const boundaryPath = path_1.default.join(dir, boundary);
        const markerExists = fs_1.default.existsSync(markerPath);
        const boundaryExists = fs_1.default.existsSync(boundaryPath);
        (0, debug_log_1.debugLogBranch)('path-utils', 'has-marker-before-boundary-step', {
            level: i,
            dir,
            markerPath,
            boundaryPath,
            markerExists,
            boundaryExists,
        });
        if (markerExists) {
            (0, debug_log_1.debugLogBranch)('path-utils', 'has-marker-before-boundary-result', {
                result: true,
                reason: 'marker-found',
                dir,
                markerPath,
            });
            return true;
        }
        if (boundaryExists) {
            (0, debug_log_1.debugLogBranch)('path-utils', 'has-marker-before-boundary-result', {
                result: false,
                reason: 'boundary-found',
                dir,
                boundaryPath,
            });
            return false;
        }
        const parent = path_1.default.dirname(dir);
        if (parent === dir) {
            (0, debug_log_1.debugLogBranch)('path-utils', 'has-marker-before-boundary-result', {
                result: false,
                reason: 'filesystem-root',
                dir,
            });
            return false;
        }
        dir = parent;
    }
    (0, debug_log_1.debugLogBranch)('path-utils', 'has-marker-before-boundary-result', {
        result: false,
        reason: 'max-levels-reached',
        startDir,
        marker,
        boundary,
        maxLevels,
    });
    return false;
};
exports.hasMarkerBeforeBoundary = hasMarkerBeforeBoundary;
const walkUp = (startDir, marker, maxLevels = 10) => {
    let dir = startDir;
    (0, debug_log_1.debugLogBranch)('path-utils', 'walk-up-start', {
        startDir,
        marker,
        maxLevels,
    });
    for (let i = 0; i < maxLevels; i++) {
        const markerPath = path_1.default.join(dir, marker);
        const markerExists = fs_1.default.existsSync(markerPath);
        (0, debug_log_1.debugLogBranch)('path-utils', 'walk-up-step', {
            level: i,
            dir,
            markerPath,
            markerExists,
        });
        if (markerExists) {
            (0, debug_log_1.debugLogBranch)('path-utils', 'walk-up-result', {
                result: dir,
                reason: 'marker-found',
                markerPath,
            });
            return dir;
        }
        const parent = path_1.default.dirname(dir);
        if (parent === dir) {
            (0, debug_log_1.debugLogBranch)('path-utils', 'walk-up-result', {
                result: null,
                reason: 'filesystem-root',
                dir,
            });
            break;
        }
        dir = parent;
    }
    (0, debug_log_1.debugLogBranch)('path-utils', 'walk-up-result', {
        result: null,
        reason: 'max-levels-reached-or-not-found',
        startDir,
        marker,
        maxLevels,
    });
    return null;
};
exports.walkUp = walkUp;
