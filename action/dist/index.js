module.exports =
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	__webpack_require__.ab = __dirname + "/";
/******/
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(526);
/******/ 	};
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
/******/ ({

/***/ 45:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


// Dependencies

var parseUrl = __webpack_require__(823),
    isSsh = __webpack_require__(720);

/**
 * gitUp
 * Parses the input url.
 *
 * @name gitUp
 * @function
 * @param {String} input The input url.
 * @return {Object} An object containing the following fields:
 *
 *  - `protocols` (Array): An array with the url protocols (usually it has one element).
 *  - `port` (null|Number): The domain port.
 *  - `resource` (String): The url domain (including subdomains).
 *  - `user` (String): The authentication user (usually for ssh urls).
 *  - `pathname` (String): The url pathname.
 *  - `hash` (String): The url hash.
 *  - `search` (String): The url querystring value.
 *  - `href` (String): The input url.
 *  - `protocol` (String): The git url protocol.
 *  - `token` (String): The oauth token (could appear in the https urls).
 */
function gitUp(input) {
    var output = parseUrl(input);
    output.token = "";

    var splits = output.user.split(":");
    if (splits.length === 2) {
        if (splits[1] === "x-oauth-basic") {
            output.token = splits[0];
        } else if (splits[0] === "x-token-auth") {
            output.token = splits[1];
        }
    }

    if (isSsh(output.protocols) || isSsh(input)) {
        output.protocol = "ssh";
    } else if (output.protocols.length) {
        output.protocol = output.protocols[0];
    } else {
        output.protocol = "file";
    }

    output.href = output.href.replace(/\/$/, "");
    return output;
}

module.exports = gitUp;

/***/ }),

/***/ 53:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";

// TODO: Use the `URL` global when targeting Node.js 10
const URLParser = typeof URL === 'undefined' ? __webpack_require__(835).URL : URL;

const testParameter = (name, filters) => {
	return filters.some(filter => filter instanceof RegExp ? filter.test(name) : filter === name);
};

module.exports = (urlString, opts) => {
	opts = Object.assign({
		defaultProtocol: 'http:',
		normalizeProtocol: true,
		forceHttp: false,
		forceHttps: false,
		stripHash: true,
		stripWWW: true,
		removeQueryParameters: [/^utm_\w+/i],
		removeTrailingSlash: true,
		removeDirectoryIndex: false,
		sortQueryParameters: true
	}, opts);

	// Backwards compatibility
	if (Reflect.has(opts, 'normalizeHttps')) {
		opts.forceHttp = opts.normalizeHttps;
	}

	if (Reflect.has(opts, 'normalizeHttp')) {
		opts.forceHttps = opts.normalizeHttp;
	}

	if (Reflect.has(opts, 'stripFragment')) {
		opts.stripHash = opts.stripFragment;
	}

	urlString = urlString.trim();

	const hasRelativeProtocol = urlString.startsWith('//');
	const isRelativeUrl = !hasRelativeProtocol && /^\.*\//.test(urlString);

	// Prepend protocol
	if (!isRelativeUrl) {
		urlString = urlString.replace(/^(?!(?:\w+:)?\/\/)|^\/\//, opts.defaultProtocol);
	}

	const urlObj = new URLParser(urlString);

	if (opts.forceHttp && opts.forceHttps) {
		throw new Error('The `forceHttp` and `forceHttps` options cannot be used together');
	}

	if (opts.forceHttp && urlObj.protocol === 'https:') {
		urlObj.protocol = 'http:';
	}

	if (opts.forceHttps && urlObj.protocol === 'http:') {
		urlObj.protocol = 'https:';
	}

	// Remove hash
	if (opts.stripHash) {
		urlObj.hash = '';
	}

	// Remove duplicate slashes if not preceded by a protocol
	if (urlObj.pathname) {
		// TODO: Use the following instead when targeting Node.js 10
		// `urlObj.pathname = urlObj.pathname.replace(/(?<!https?:)\/{2,}/g, '/');`
		urlObj.pathname = urlObj.pathname.replace(/((?![https?:]).)\/{2,}/g, (_, p1) => {
			if (/^(?!\/)/g.test(p1)) {
				return `${p1}/`;
			}
			return '/';
		});
	}

	// Decode URI octets
	if (urlObj.pathname) {
		urlObj.pathname = decodeURI(urlObj.pathname);
	}

	// Remove directory index
	if (opts.removeDirectoryIndex === true) {
		opts.removeDirectoryIndex = [/^index\.[a-z]+$/];
	}

	if (Array.isArray(opts.removeDirectoryIndex) && opts.removeDirectoryIndex.length > 0) {
		let pathComponents = urlObj.pathname.split('/');
		const lastComponent = pathComponents[pathComponents.length - 1];

		if (testParameter(lastComponent, opts.removeDirectoryIndex)) {
			pathComponents = pathComponents.slice(0, pathComponents.length - 1);
			urlObj.pathname = pathComponents.slice(1).join('/') + '/';
		}
	}

	if (urlObj.hostname) {
		// Remove trailing dot
		urlObj.hostname = urlObj.hostname.replace(/\.$/, '');

		// Remove `www.`
		// eslint-disable-next-line no-useless-escape
		if (opts.stripWWW && /^www\.([a-z\-\d]{2,63})\.([a-z\.]{2,5})$/.test(urlObj.hostname)) {
			// Each label should be max 63 at length (min: 2).
			// The extension should be max 5 at length (min: 2).
			// Source: https://en.wikipedia.org/wiki/Hostname#Restrictions_on_valid_host_names
			urlObj.hostname = urlObj.hostname.replace(/^www\./, '');
		}
	}

	// Remove query unwanted parameters
	if (Array.isArray(opts.removeQueryParameters)) {
		for (const key of [...urlObj.searchParams.keys()]) {
			if (testParameter(key, opts.removeQueryParameters)) {
				urlObj.searchParams.delete(key);
			}
		}
	}

	// Sort query parameters
	if (opts.sortQueryParameters) {
		urlObj.searchParams.sort();
	}

	// Take advantage of many of the Node `url` normalizations
	urlString = urlObj.toString();

	// Remove ending `/`
	if (opts.removeTrailingSlash || urlObj.pathname === '/') {
		urlString = urlString.replace(/\/$/, '');
	}

	// Restore relative protocol, if applicable
	if (hasRelativeProtocol && !opts.normalizeProtocol) {
		urlString = urlString.replace(/^http:\/\//, '//');
	}

	return urlString;
};


/***/ }),

/***/ 87:
/***/ (function(module) {

module.exports = require("os");

/***/ }),

/***/ 129:
/***/ (function(module) {

module.exports = require("child_process");

/***/ }),

/***/ 191:
/***/ (function(module) {

module.exports = require("querystring");

/***/ }),

/***/ 253:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var gitUp = __webpack_require__(45);

/**
 * gitUrlParse
 * Parses a Git url.
 *
 * @name gitUrlParse
 * @function
 * @param {String} url The Git url to parse.
 * @return {GitUrl} The `GitUrl` object containing:
 *
 *  - `protocols` (Array): An array with the url protocols (usually it has one element).
 *  - `port` (null|Number): The domain port.
 *  - `resource` (String): The url domain (including subdomains).
 *  - `user` (String): The authentication user (usually for ssh urls).
 *  - `pathname` (String): The url pathname.
 *  - `hash` (String): The url hash.
 *  - `search` (String): The url querystring value.
 *  - `href` (String): The input url.
 *  - `protocol` (String): The git url protocol.
 *  - `token` (String): The oauth token (could appear in the https urls).
 *  - `source` (String): The Git provider (e.g. `"github.com"`).
 *  - `owner` (String): The repository owner.
 *  - `name` (String): The repository name.
 *  - `ref` (String): The repository ref (e.g., "master" or "dev").
 *  - `filepath` (String): A filepath relative to the repository root.
 *  - `filepathtype` (String): The type of filepath in the url ("blob" or "tree").
 *  - `full_name` (String): The owner and name values in the `owner/name` format.
 *  - `toString` (Function): A function to stringify the parsed url into another url type.
 *  - `organization` (String): The organization the owner belongs to. This is CloudForge specific.
 *  - `git_suffix` (Boolean): Whether to add the `.git` suffix or not.
 *
 */
function gitUrlParse(url) {

    if (typeof url !== "string") {
        throw new Error("The url must be a string.");
    }

    var urlInfo = gitUp(url),
        sourceParts = urlInfo.resource.split("."),
        splits = null;

    urlInfo.toString = function (type) {
        return gitUrlParse.stringify(this, type);
    };

    urlInfo.source = sourceParts.length > 2 ? sourceParts.slice(1 - sourceParts.length).join(".") : urlInfo.source = urlInfo.resource;

    // Note: Some hosting services (e.g. Visual Studio Team Services) allow whitespace characters
    // in the repository and owner names so we decode the URL pieces to get the correct result
    urlInfo.git_suffix = /\.git$/.test(urlInfo.pathname);
    urlInfo.name = decodeURIComponent(urlInfo.pathname.replace(/^\//, '').replace(/\.git$/, ""));
    urlInfo.owner = decodeURIComponent(urlInfo.user);

    switch (urlInfo.source) {
        case "git.cloudforge.com":
            urlInfo.owner = urlInfo.user;
            urlInfo.organization = sourceParts[0];
            urlInfo.source = "cloudforge.com";
            break;
        case "visualstudio.com":
            // Handle VSTS SSH URLs
            if (urlInfo.resource === 'vs-ssh.visualstudio.com') {
                splits = urlInfo.name.split("/");
                if (splits.length === 4) {
                    urlInfo.organization = splits[1];
                    urlInfo.owner = splits[2];
                    urlInfo.name = splits[3];
                    urlInfo.full_name = splits[2] + '/' + splits[3];
                }
                break;
            } else {
                splits = urlInfo.name.split("/");
                if (splits.length === 2) {
                    urlInfo.owner = splits[1];
                    urlInfo.name = splits[1];
                    urlInfo.full_name = '_git/' + urlInfo.name;
                } else if (splits.length === 3) {
                    urlInfo.name = splits[2];
                    if (splits[0] === 'DefaultCollection') {
                        urlInfo.owner = splits[2];
                        urlInfo.organization = splits[0];
                        urlInfo.full_name = urlInfo.organization + '/_git/' + urlInfo.name;
                    } else {
                        urlInfo.owner = splits[0];
                        urlInfo.full_name = urlInfo.owner + '/_git/' + urlInfo.name;
                    }
                } else if (splits.length === 4) {
                    urlInfo.organization = splits[0];
                    urlInfo.owner = splits[1];
                    urlInfo.name = splits[3];
                    urlInfo.full_name = urlInfo.organization + '/' + urlInfo.owner + '/_git/' + urlInfo.name;
                }
                break;
            }

        // Azure DevOps (formerly Visual Studio Team Services)
        case "dev.azure.com":
        case "azure.com":
            if (urlInfo.resource === 'ssh.dev.azure.com') {
                splits = urlInfo.name.split("/");
                if (splits.length === 4) {
                    urlInfo.organization = splits[1];
                    urlInfo.owner = splits[2];
                    urlInfo.name = splits[3];
                }
                break;
            } else {
                splits = urlInfo.name.split("/");
                if (splits.length === 5) {
                    urlInfo.organization = splits[0];
                    urlInfo.owner = splits[1];
                    urlInfo.name = splits[4];
                    urlInfo.full_name = '_git/' + urlInfo.name;
                } else if (splits.length === 3) {
                    urlInfo.name = splits[2];
                    if (splits[0] === 'DefaultCollection') {
                        urlInfo.owner = splits[2];
                        urlInfo.organization = splits[0];
                        urlInfo.full_name = urlInfo.organization + '/_git/' + urlInfo.name;
                    } else {
                        urlInfo.owner = splits[0];
                        urlInfo.full_name = urlInfo.owner + '/_git/' + urlInfo.name;
                    }
                } else if (splits.length === 4) {
                    urlInfo.organization = splits[0];
                    urlInfo.owner = splits[1];
                    urlInfo.name = splits[3];
                    urlInfo.full_name = urlInfo.organization + '/' + urlInfo.owner + '/_git/' + urlInfo.name;
                }
                break;
            }
        default:
            splits = urlInfo.name.split("/");
            var nameIndex = splits.length - 1;
            if (splits.length >= 2) {
                var blobIndex = splits.indexOf("blob", 2);
                var treeIndex = splits.indexOf("tree", 2);
                var commitIndex = splits.indexOf("commit", 2);
                nameIndex = blobIndex > 0 ? blobIndex - 1 : treeIndex > 0 ? treeIndex - 1 : commitIndex > 0 ? commitIndex - 1 : nameIndex;

                urlInfo.owner = splits.slice(0, nameIndex).join('/');
                urlInfo.name = splits[nameIndex];
                if (commitIndex) {
                    urlInfo.commit = splits[nameIndex + 2];
                }
            }

            urlInfo.ref = "";
            urlInfo.filepathtype = "";
            urlInfo.filepath = "";
            if (splits.length > nameIndex + 2 && ["blob", "tree"].indexOf(splits[nameIndex + 1]) >= 0) {
                urlInfo.filepathtype = splits[nameIndex + 1];
                urlInfo.ref = splits[nameIndex + 2];
                if (splits.length > nameIndex + 3) {
                    urlInfo.filepath = splits.slice(nameIndex + 3).join('/');
                }
            }
            urlInfo.organization = urlInfo.owner;
            break;
    }

    if (!urlInfo.full_name) {
        urlInfo.full_name = urlInfo.owner;
        if (urlInfo.name) {
            urlInfo.full_name && (urlInfo.full_name += "/");
            urlInfo.full_name += urlInfo.name;
        }
    }

    return urlInfo;
}

/**
 * stringify
 * Stringifies a `GitUrl` object.
 *
 * @name stringify
 * @function
 * @param {GitUrl} obj The parsed Git url object.
 * @param {String} type The type of the stringified url (default `obj.protocol`).
 * @return {String} The stringified url.
 */
gitUrlParse.stringify = function (obj, type) {
    type = type || (obj.protocols && obj.protocols.length ? obj.protocols.join('+') : obj.protocol);
    var port = obj.port ? ":" + obj.port : '';
    var user = obj.user || 'git';
    var maybeGitSuffix = obj.git_suffix ? ".git" : "";
    switch (type) {
        case "ssh":
            if (port) return "ssh://" + user + "@" + obj.resource + port + "/" + obj.full_name + maybeGitSuffix;else return user + "@" + obj.resource + ":" + obj.full_name + maybeGitSuffix;
        case "git+ssh":
        case "ssh+git":
        case "ftp":
        case "ftps":
            return type + "://" + user + "@" + obj.resource + port + "/" + obj.full_name + maybeGitSuffix;
        case "http":
        case "https":
            var auth = obj.token ? buildToken(obj) : obj.user && (obj.protocols.includes('http') || obj.protocols.includes('https')) ? obj.user + "@" : "";
            return type + "://" + auth + obj.resource + port + "/" + obj.full_name + maybeGitSuffix;
        default:
            return obj.href;
    }
};

/*!
 * buildToken
 * Builds OAuth token prefix (helper function)
 *
 * @name buildToken
 * @function
 * @param {GitUrl} obj The parsed Git url object.
 * @return {String} token prefix
 */
function buildToken(obj) {
    switch (obj.source) {
        case "bitbucket.org":
            return "x-token-auth:" + obj.token + "@";
        default:
            return obj.token + "@";
    }
}

module.exports = gitUrlParse;

/***/ }),

/***/ 526:
/***/ (function(__unusedmodule, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var child_process = __importStar(__webpack_require__(129));
var fs = __importStar(__webpack_require__(747));
var git_url_parse_1 = __importDefault(__webpack_require__(253));
var os_1 = __webpack_require__(87);
var path = __importStar(__webpack_require__(622));
var util_1 = __webpack_require__(669);
var readFile = util_1.promisify(fs.readFile);
var exec = util_1.promisify(child_process.exec);
var copyFile = util_1.promisify(fs.copyFile);
var mkdir = util_1.promisify(fs.mkdir);
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
/**
 * The file path of a known_hosts file with fingerprint of the relevant server
 */
var KNOWN_HOSTS_FILE = process.env.KNOWN_HOSTS_FILE;
/**
 * The GITHUB_TOKEN secret
 */
var GITHUB_TOKEN = process.env.GITHUB_TOKEN;
// Implicit environment variables passed by GitHub
var GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
var GITHUB_EVENT_PATH = process.env.GITHUB_EVENT_PATH;
var GITHUB_SHA = process.env.GITHUB_SHA;
var GITHUB_ACTOR = process.env.GITHUB_ACTOR;
// Paths
var REPO_SELF = 'self';
var REPO_TEMP = '/tmp/repo';
var RESOURCES = path.join(path.dirname(__dirname), 'resources');
var KNOWN_HOSTS_GITHUB = path.join(RESOURCES, 'known_hosts_github.com');
var SSH_FOLDER = path.join(os_1.homedir(), '.ssh'); // TODO: fix
var KNOWN_HOSTS_TARGET = path.join(SSH_FOLDER, 'known_hosts');
var SSH_AUTH_SOCK = '/tmp/ssh_agent.sock';
// Error messages
var KNOWN_HOSTS_WARNING = "\n##[warning] KNOWN_HOSTS_FILE not set\nThis will probably mean that host verification will fail later on\n";
var KNOWN_HOSTS_ERROR = function (host) { return "\n##[error] Host key verification failed!\nThis is probably because you forgot to supply a value for KNOWN_HOSTS_FILE\nor the file is invalid or doesn't correctly verify the host " + host + "\n"; };
var SSH_KEY_ERROR = "\n##[error] Permission denied (publickey)\nMake sure that the ssh private key is set correctly, and\nthat the public key has been added to the target repo\n";
var INVALID_KEY_ERROR = "\n##[error] Error loading key: invalid format\nPlease check that you're setting the environment variable\nSSH_PRIVATE_KEY correctly\n";
var config = (function () {
    if (!REPO)
        throw new Error('REPO must be specified');
    if (!BRANCH)
        throw new Error('BRANCH must be specified');
    if (!FOLDER)
        throw new Error('FOLDER must be specified');
    var repo = REPO;
    var branch = BRANCH;
    var folder = FOLDER;
    // Determine the type of URL
    if (repo === REPO_SELF) {
        if (!GITHUB_TOKEN)
            throw new Error('GITHUB_TOKEN must be specified when REPO == self');
        if (!GITHUB_REPOSITORY)
            throw new Error('GITHUB_REPOSITORY must be specified when REPO == self');
        var url = "https://x-access-token:" + GITHUB_TOKEN + "@github.com/" + GITHUB_REPOSITORY + ".git";
        var config_1 = {
            repo: url,
            branch: branch,
            folder: folder,
            mode: 'self'
        };
        return config_1;
    }
    var parsedUrl = git_url_parse_1.default(REPO);
    if (parsedUrl.protocol === 'ssh') {
        if (!SSH_PRIVATE_KEY)
            throw new Error('SSH_PRIVATE_KEY must be specified when REPO uses ssh');
        var config_2 = {
            repo: repo,
            branch: branch,
            folder: folder,
            mode: 'ssh',
            parsedUrl: parsedUrl,
            privateKey: SSH_PRIVATE_KEY,
            knownHostsFile: KNOWN_HOSTS_FILE
        };
        return config_2;
    }
    throw new Error('Unsupported REPO URL');
})();
var writeToProcess = function (command, args, opts) { return new Promise(function (resolve, reject) {
    var child = child_process.spawn(command, args, {
        env: opts.env,
        stdio: "pipe"
    });
    child.stdin.setDefaultEncoding('utf-8');
    child.stdin.write(opts.data);
    child.stdin.end();
    child.on('error', reject);
    var stderr = '';
    child.stdout.on('data', function (data) {
        console.log(data.toString());
    });
    child.stderr.on('data', function (data) {
        stderr += data;
        console.error(data.toString());
    });
    child.on('close', function (code) {
        if (code === 0) {
            resolve();
        }
        else {
            reject(new Error(stderr));
        }
    });
}); };
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var event, _a, _b, name, email, env, known_hosts, branchCheck, folder, sha, push;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                if (!GITHUB_EVENT_PATH)
                    throw new Error('Expected GITHUB_EVENT_PATH');
                _b = (_a = JSON).parse;
                return [4 /*yield*/, readFile(GITHUB_EVENT_PATH)];
            case 1:
                event = _b.apply(_a, [(_c.sent()).toString()]);
                name = event.pusher && event.pusher.name || GITHUB_ACTOR || 'Git Publish Subdirectory';
                email = event.pusher && event.pusher.email || (GITHUB_ACTOR ? GITHUB_ACTOR + "@users.noreply.github.com" : 'nobody@nowhere');
                // Set Git Config
                return [4 /*yield*/, exec("git config --global user.name \"" + name + "\"")];
            case 2:
                // Set Git Config
                _c.sent();
                return [4 /*yield*/, exec("git config --global user.email \"" + email + "\"")];
            case 3:
                _c.sent();
                env = Object.assign({}, process.env, {
                    SSH_AUTH_SOCK: SSH_AUTH_SOCK
                });
                if (!(config.mode === 'ssh')) return [3 /*break*/, 10];
                known_hosts = config.knownHostsFile;
                // Use well-known known_hosts for certain domains
                if (!known_hosts && config.parsedUrl.resource === 'github.com') {
                    known_hosts = KNOWN_HOSTS_GITHUB;
                }
                if (!!known_hosts) return [3 /*break*/, 4];
                console.warn(KNOWN_HOSTS_WARNING);
                return [3 /*break*/, 7];
            case 4: return [4 /*yield*/, mkdir(SSH_FOLDER, { recursive: true })];
            case 5:
                _c.sent();
                return [4 /*yield*/, copyFile(known_hosts, KNOWN_HOSTS_TARGET)];
            case 6:
                _c.sent();
                _c.label = 7;
            case 7:
                // Setup ssh-agent with private key
                console.log("Setting up ssh-agent on " + SSH_AUTH_SOCK);
                return [4 /*yield*/, exec("ssh-agent -a " + SSH_AUTH_SOCK, { env: env })];
            case 8:
                _c.sent();
                console.log("Adding private key to ssh-agent at " + SSH_AUTH_SOCK);
                return [4 /*yield*/, writeToProcess('ssh-add', ['-'], {
                        data: config.privateKey + '\n',
                        env: env
                    }).catch(function (err) {
                        var s = err.toString();
                        if (s.indexOf("invalid format") !== -1) {
                            console.error(INVALID_KEY_ERROR);
                        }
                        throw err;
                    })];
            case 9:
                _c.sent();
                console.log("Private key added");
                _c.label = 10;
            case 10: 
            // Clone the target repo
            return [4 /*yield*/, exec("git clone \"" + config.repo + "\" \"" + REPO_TEMP + "\"", {
                    env: env
                }).catch(function (err) {
                    var s = err.toString();
                    if (config.mode === 'ssh') {
                        if (s.indexOf("Host key verification failed") !== -1) {
                            console.error(KNOWN_HOSTS_ERROR(config.parsedUrl.resource));
                        }
                        else if (s.indexOf("Permission denied (publickey)") !== -1) {
                            console.error(SSH_KEY_ERROR);
                        }
                    }
                    throw err;
                })];
            case 11:
                // Clone the target repo
                _c.sent();
                // Fetch branch if it exists
                return [4 /*yield*/, exec("git fetch origin " + config.branch + ":" + config.branch, { env: env, cwd: REPO_TEMP }).catch(function (err) {
                        var s = err.toString();
                        if (s.indexOf('Couldn\'t find remote ref') === -1) {
                            console.error('##[warning] Failed to fetch target branch, probably doesn\'t exist');
                            console.error(err);
                        }
                    })];
            case 12:
                // Fetch branch if it exists
                _c.sent();
                // Check if branch already exists
                console.log("##[info] Checking if branch " + config.branch + " exists already");
                return [4 /*yield*/, exec("git branch --list \"" + config.branch + "\"", { env: env, cwd: REPO_TEMP })];
            case 13:
                branchCheck = _c.sent();
                if (!(branchCheck.stdout.trim() === '')) return [3 /*break*/, 20];
                // Branch does not exist yet, let's create an initial commit
                console.log("##[info] " + config.branch + " does not exist, creating initial commit");
                return [4 /*yield*/, exec("git checkout --orphan \"" + config.branch + "\"", { env: env, cwd: REPO_TEMP })];
            case 14:
                _c.sent();
                return [4 /*yield*/, exec("git rm -rf .", { env: env, cwd: REPO_TEMP }).catch(function (err) { })];
            case 15:
                _c.sent();
                return [4 /*yield*/, exec("touch README.md", { env: env, cwd: REPO_TEMP })];
            case 16:
                _c.sent();
                return [4 /*yield*/, exec("git add README.md", { env: env, cwd: REPO_TEMP })];
            case 17:
                _c.sent();
                return [4 /*yield*/, exec("git commit -m \"Initial " + config.branch + " commit\"", { env: env, cwd: REPO_TEMP })];
            case 18:
                _c.sent();
                return [4 /*yield*/, exec("git push \"" + config.repo + "\" \"" + config.branch + "\"", { env: env, cwd: REPO_TEMP })];
            case 19:
                _c.sent();
                _c.label = 20;
            case 20:
                // Update contents of branch
                console.log("##[info] Updating branch " + config.branch);
                return [4 /*yield*/, exec("git checkout \"" + config.branch + "\"", { env: env, cwd: REPO_TEMP })];
            case 21:
                _c.sent();
                return [4 /*yield*/, exec("git rm -rf .", { env: env, cwd: REPO_TEMP }).catch(function (err) { })];
            case 22:
                _c.sent();
                folder = path.resolve(process.cwd(), config.folder);
                console.log("##[info] Copying all files from " + folder);
                // TODO: replace this copy with a node implementation
                return [4 /*yield*/, exec("cp -r " + folder + "/* ./", { env: env, cwd: REPO_TEMP })];
            case 23:
                // TODO: replace this copy with a node implementation
                _c.sent();
                return [4 /*yield*/, exec("git add -A .", { env: env, cwd: REPO_TEMP })];
            case 24:
                _c.sent();
                sha = GITHUB_SHA ? GITHUB_SHA.substr(0, 7) : 'unknown';
                return [4 /*yield*/, exec("git commit --allow-empty -m \"Update " + config.branch + " to output generated at " + sha + "\"", { env: env, cwd: REPO_TEMP })];
            case 25:
                _c.sent();
                console.log("##[info] Pushing");
                return [4 /*yield*/, exec("git push origin \"" + config.branch + "\"", { env: env, cwd: REPO_TEMP })];
            case 26:
                push = _c.sent();
                console.log(push.stdout);
                console.log("##[info] Deployment Successful");
                return [2 /*return*/];
        }
    });
}); })().catch(function (err) {
    console.error(err);
    process.exit(1);
});


/***/ }),

/***/ 622:
/***/ (function(module) {

module.exports = require("path");

/***/ }),

/***/ 666:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


// Dependencies
var protocols = __webpack_require__(737),
    isSsh = __webpack_require__(720),
    qs = __webpack_require__(191);

/**
 * parsePath
 * Parses the input url.
 *
 * @name parsePath
 * @function
 * @param {String} url The input url.
 * @return {Object} An object containing the following fields:
 *
 *  - `protocols` (Array): An array with the url protocols (usually it has one element).
 *  - `protocol` (String): The first protocol, `"ssh"` (if the url is a ssh url) or `"file"`.
 *  - `port` (null|Number): The domain port.
 *  - `resource` (String): The url domain (including subdomains).
 *  - `user` (String): The authentication user (usually for ssh urls).
 *  - `pathname` (String): The url pathname.
 *  - `hash` (String): The url hash.
 *  - `search` (String): The url querystring value.
 *  - `href` (String): The input url.
 *  - `query` (Object): The url querystring, parsed as object.
 */
function parsePath(url) {
    url = (url || "").trim();
    var output = {
        protocols: protocols(url),
        protocol: null,
        port: null,
        resource: "",
        user: "",
        pathname: "",
        hash: "",
        search: "",
        href: url,
        query: Object.create(null)
    },
        protocolIndex = url.indexOf("://"),
        resourceIndex = -1,
        splits = null,
        parts = null;

    if (url.startsWith(".")) {
        if (url.startsWith("./")) {
            url = url.substring(2);
        }
        output.pathname = url;
        output.protocol = "file";
    }

    var firstChar = url.charAt(1);
    if (!output.protocol) {
        output.protocol = output.protocols[0];
        if (!output.protocol) {
            if (isSsh(url)) {
                output.protocol = "ssh";
            } else if (firstChar === "/" || firstChar === "~") {
                url = url.substring(2);
                output.protocol = "file";
            } else {
                output.protocol = "file";
            }
        }
    }

    if (protocolIndex !== -1) {
        url = url.substring(protocolIndex + 3);
    }

    parts = url.split("/");
    if (output.protocol !== "file") {
        output.resource = parts.shift();
    } else {
        output.resource = "";
    }

    // user@domain
    splits = output.resource.split("@");
    if (splits.length === 2) {
        output.user = splits[0];
        output.resource = splits[1];
    }

    // domain.com:port
    splits = output.resource.split(":");
    if (splits.length === 2) {
        output.resource = splits[0];
        if (splits[1]) {
            output.port = Number(splits[1]);
            if (isNaN(output.port)) {
                output.port = null;
                parts.unshift(splits[1]);
            }
        } else {
            output.port = null;
        }
    }

    // Remove empty elements
    parts = parts.filter(Boolean);

    // Stringify the pathname
    if (output.protocol === "file") {
        output.pathname = output.href;
    } else {
        output.pathname = output.pathname || (output.protocol !== "file" || output.href[0] === "/" ? "/" : "") + parts.join("/");
    }

    // #some-hash
    splits = output.pathname.split("#");
    if (splits.length === 2) {
        output.pathname = splits[0];
        output.hash = splits[1];
    }

    // ?foo=bar
    splits = output.pathname.split("?");
    if (splits.length === 2) {
        output.pathname = splits[0];
        output.search = splits[1];
    }

    output.query = qs.parse(output.search);
    output.href = output.href.replace(/\/$/, "");
    output.pathname = output.pathname.replace(/\/$/, "");
    return output;
}

module.exports = parsePath;

/***/ }),

/***/ 669:
/***/ (function(module) {

module.exports = require("util");

/***/ }),

/***/ 720:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


// Dependencies
var protocols = __webpack_require__(737);

/**
 * isSsh
 * Checks if an input value is a ssh url or not.
 *
 * @name isSsh
 * @function
 * @param {String|Array} input The input url or an array of protocols.
 * @return {Boolean} `true` if the input is a ssh url, `false` otherwise.
 */
function isSsh(input) {

    if (Array.isArray(input)) {
        return input.indexOf("ssh") !== -1 || input.indexOf("rsync") !== -1;
    }

    if (typeof input !== "string") {
        return false;
    }

    var prots = protocols(input);
    input = input.substring(input.indexOf("://") + 3);
    if (isSsh(prots)) {
        return true;
    }

    // TODO This probably could be improved :)
    return input.indexOf("@") < input.indexOf(":");
}

module.exports = isSsh;

/***/ }),

/***/ 737:
/***/ (function(module) {

"use strict";


/**
 * protocols
 * Returns the protocols of an input url.
 *
 * @name protocols
 * @function
 * @param {String} input The input url.
 * @param {Boolean|Number} first If `true`, the first protocol will be returned. If number, it will represent the zero-based index of the protocols array.
 * @return {Array|String} The array of protocols or the specified protocol.
 */
module.exports = function protocols(input, first) {

    if (first === true) {
        first = 0;
    }

    var index = input.indexOf("://"),
        splits = input.substring(0, index).split("+").filter(Boolean);

    if (typeof first === "number") {
        return splits[first];
    }

    return splits;
};

/***/ }),

/***/ 747:
/***/ (function(module) {

module.exports = require("fs");

/***/ }),

/***/ 823:
/***/ (function(module, __unusedexports, __webpack_require__) {

"use strict";


var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var parsePath = __webpack_require__(666),
    normalizeUrl = __webpack_require__(53);

/**
 * parseUrl
 * Parses the input url.
 *
 * **Note**: This *throws* if invalid urls are provided.
 *
 * @name parseUrl
 * @function
 * @param {String} url The input url.
 * @param {Boolean|Object} normalize Wheter to normalize the url or not.
 *                         Default is `false`. If `true`, the url will
 *                         be normalized. If an object, it will be the
 *                         options object sent to [`normalize-url`](https://github.com/sindresorhus/normalize-url).
 *
 *                         For SSH urls, normalize won't work.
 *
 * @return {Object} An object containing the following fields:
 *
 *  - `protocols` (Array): An array with the url protocols (usually it has one element).
 *  - `protocol` (String): The first protocol, `"ssh"` (if the url is a ssh url) or `"file"`.
 *  - `port` (null|Number): The domain port.
 *  - `resource` (String): The url domain (including subdomains).
 *  - `user` (String): The authentication user (usually for ssh urls).
 *  - `pathname` (String): The url pathname.
 *  - `hash` (String): The url hash.
 *  - `search` (String): The url querystring value.
 *  - `href` (String): The input url.
 *  - `query` (Object): The url querystring, parsed as object.
 */
function parseUrl(url) {
    var normalize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

    if (typeof url !== "string" || !url.trim()) {
        throw new Error("Invalid url.");
    }
    if (normalize) {
        if ((typeof normalize === "undefined" ? "undefined" : _typeof(normalize)) !== "object") {
            normalize = {
                stripFragment: false
            };
        }
        url = normalizeUrl(url, normalize);
    }
    var parsed = parsePath(url);
    return parsed;
}

module.exports = parseUrl;

/***/ }),

/***/ 835:
/***/ (function(module) {

module.exports = require("url");

/***/ })

/******/ });