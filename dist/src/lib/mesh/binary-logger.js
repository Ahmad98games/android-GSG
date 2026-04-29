"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hubBinaryLogger = exports.BinaryLogger = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
class BinaryLogger {
    stream = null;
    logDir = node_path_1.default.join(process.cwd(), 'logs');
    constructor() {
        if (!node_fs_1.default.existsSync(this.logDir))
            node_fs_1.default.mkdirSync(this.logDir, { recursive: true });
        this.stream = node_fs_1.default.createWriteStream(node_path_1.default.join(this.logDir, `hub-raw-${Date.now()}.bin`), { flags: 'a' });
    }
    log(data) {
        if (!this.stream)
            return;
        const ts = BigInt(Date.now());
        const header = Buffer.alloc(8);
        header.writeUIntBE(Number(ts & BigInt('0xffffffffffff')), 0, 6);
        header.writeUInt16BE(data.length, 6);
        this.stream.write(header);
        this.stream.write(data);
    }
}
exports.BinaryLogger = BinaryLogger;
exports.hubBinaryLogger = new BinaryLogger();
