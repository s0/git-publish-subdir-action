"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var git_url_parse_1 = __importDefault(require("git-url-parse"));
// Environment Variables
/**
 * The URL of the repository to push to, one-of:
 *
 * * an ssh URL to a repository
 */
var REPO = process.env.REPO;
/**
 * The name of the branch to push to
 */
var BRANCH = process.env.BRANCH;
/**
 * Which subdirectory in the repository to we want to push as the contents of the branch
 */
var FOLDER = process.env.FOLDER;
/**
 * The private key to use for publishing if REPO is an SSH repo
 */
var SSH_PRIVATE_KEY = process.env.SSH_PRIVATE_KEY;
var config = (function () {
    if (!BRANCH)
        throw new Error('BRANCH must be specified');
    var branch = BRANCH;
    if (!FOLDER)
        throw new Error('FOLDER must be specified');
    var folder = FOLDER;
    if (!REPO)
        throw new Error('REPO must be specified');
    // Determine the type of URL
    var url = git_url_parse_1.default(REPO);
    if (url.protocol === 'ssh') {
        if (!SSH_PRIVATE_KEY)
            throw new Error('SSH_PRIVATE_KEY must be specified when REPO uses ssh');
        var config_1 = {
            branch: branch,
            folder: folder,
            mode: 'ssh',
            url: REPO,
            privateKey: SSH_PRIVATE_KEY
        };
        return config_1;
    }
    throw new Error('Unsupported REPO URL');
})();
