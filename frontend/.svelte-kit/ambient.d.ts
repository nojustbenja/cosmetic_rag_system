
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';
 * 
 * console.log(ENVIRONMENT); // => "production"
 * console.log(PUBLIC_BASE_URL); // => throws error during build
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/private' {
	export const RUST_LOG: string;
	export const CODEX_SANDBOX_NETWORK_DISABLED: string;
	export const NODE: string;
	export const FNM_LOGLEVEL: string;
	export const INIT_CWD: string;
	export const PYENV_ROOT: string;
	export const TERM: string;
	export const SHELL: string;
	export const FNM_NODE_DIST_MIRROR: string;
	export const TMPDIR: string;
	export const npm_config_global_prefix: string;
	export const CONDA_SHLVL: string;
	export const MallocNanoZone: string;
	export const COLOR: string;
	export const NO_COLOR: string;
	export const npm_config_noproxy: string;
	export const npm_config_local_prefix: string;
	export const ZSH: string;
	export const LC_ALL: string;
	export const FNM_COREPACK_ENABLED: string;
	export const _CONDA_EXE: string;
	export const USER: string;
	export const LS_COLORS: string;
	export const COMMAND_MODE: string;
	export const npm_config_globalconfig: string;
	export const CONDA_EXE: string;
	export const SSH_AUTH_SOCK: string;
	export const __CF_USER_TEXT_ENCODING: string;
	export const npm_execpath: string;
	export const PAGER: string;
	export const _CE_CONDA: string;
	export const LSCOLORS: string;
	export const FNM_VERSION_FILE_STRATEGY: string;
	export const FNM_ARCH: string;
	export const PATH: string;
	export const CODEX_SANDBOX: string;
	export const ZSH_TMUX_AUTOSTART: string;
	export const npm_package_json: string;
	export const _: string;
	export const LaunchInstanceID: string;
	export const npm_config_userconfig: string;
	export const npm_config_init_module: string;
	export const __CFBundleIdentifier: string;
	export const CODEX_THREAD_ID: string;
	export const npm_command: string;
	export const PWD: string;
	export const DISABLE_AUTO_UPDATE: string;
	export const npm_lifecycle_event: string;
	export const EDITOR: string;
	export const P9K_SSH: string;
	export const npm_package_name: string;
	export const LANG: string;
	export const npm_config_npm_version: string;
	export const XPC_FLAGS: string;
	export const FNM_MULTISHELL_PATH: string;
	export const CODEX_CI: string;
	export const ZSH_TMUX_AUTOSTARTED: string;
	export const ATUIN_TMUX_POPUP: string;
	export const npm_config_node_gyp: string;
	export const npm_package_version: string;
	export const _CONDA_ROOT: string;
	export const _CE_M: string;
	export const XPC_SERVICE_NAME: string;
	export const SHLVL: string;
	export const PYENV_SHELL: string;
	export const HOME: string;
	export const CODEX_SHELL: string;
	export const LOG_FORMAT: string;
	export const GH_PAGER: string;
	export const FNM_DIR: string;
	export const npm_config_cache: string;
	export const LOGNAME: string;
	export const LESS: string;
	export const CONDA_PYTHON_EXE: string;
	export const npm_lifecycle_script: string;
	export const ATUIN_SESSION: string;
	export const LC_CTYPE: string;
	export const npm_config_user_agent: string;
	export const FNM_RESOLVE_ENGINES: string;
	export const _P9K_SSH_TTY: string;
	export const OSLogRateLimit: string;
	export const GIT_PAGER: string;
	export const SECURITYSESSIONID: string;
	export const ATUIN_SHLVL: string;
	export const npm_node_execpath: string;
	export const npm_config_prefix: string;
	export const COLORTERM: string;
	export const CODEX_INTERNAL_ORIGINATOR_OVERRIDE: string;
	export const NODE_ENV: string;
}

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';
 * 
 * console.log(ENVIRONMENT); // => throws error during build
 * console.log(PUBLIC_BASE_URL); // => "http://site.com"
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * 
 * console.log(env.ENVIRONMENT); // => "production"
 * console.log(env.PUBLIC_BASE_URL); // => undefined
 * ```
 */
declare module '$env/dynamic/private' {
	export const env: {
		RUST_LOG: string;
		CODEX_SANDBOX_NETWORK_DISABLED: string;
		NODE: string;
		FNM_LOGLEVEL: string;
		INIT_CWD: string;
		PYENV_ROOT: string;
		TERM: string;
		SHELL: string;
		FNM_NODE_DIST_MIRROR: string;
		TMPDIR: string;
		npm_config_global_prefix: string;
		CONDA_SHLVL: string;
		MallocNanoZone: string;
		COLOR: string;
		NO_COLOR: string;
		npm_config_noproxy: string;
		npm_config_local_prefix: string;
		ZSH: string;
		LC_ALL: string;
		FNM_COREPACK_ENABLED: string;
		_CONDA_EXE: string;
		USER: string;
		LS_COLORS: string;
		COMMAND_MODE: string;
		npm_config_globalconfig: string;
		CONDA_EXE: string;
		SSH_AUTH_SOCK: string;
		__CF_USER_TEXT_ENCODING: string;
		npm_execpath: string;
		PAGER: string;
		_CE_CONDA: string;
		LSCOLORS: string;
		FNM_VERSION_FILE_STRATEGY: string;
		FNM_ARCH: string;
		PATH: string;
		CODEX_SANDBOX: string;
		ZSH_TMUX_AUTOSTART: string;
		npm_package_json: string;
		_: string;
		LaunchInstanceID: string;
		npm_config_userconfig: string;
		npm_config_init_module: string;
		__CFBundleIdentifier: string;
		CODEX_THREAD_ID: string;
		npm_command: string;
		PWD: string;
		DISABLE_AUTO_UPDATE: string;
		npm_lifecycle_event: string;
		EDITOR: string;
		P9K_SSH: string;
		npm_package_name: string;
		LANG: string;
		npm_config_npm_version: string;
		XPC_FLAGS: string;
		FNM_MULTISHELL_PATH: string;
		CODEX_CI: string;
		ZSH_TMUX_AUTOSTARTED: string;
		ATUIN_TMUX_POPUP: string;
		npm_config_node_gyp: string;
		npm_package_version: string;
		_CONDA_ROOT: string;
		_CE_M: string;
		XPC_SERVICE_NAME: string;
		SHLVL: string;
		PYENV_SHELL: string;
		HOME: string;
		CODEX_SHELL: string;
		LOG_FORMAT: string;
		GH_PAGER: string;
		FNM_DIR: string;
		npm_config_cache: string;
		LOGNAME: string;
		LESS: string;
		CONDA_PYTHON_EXE: string;
		npm_lifecycle_script: string;
		ATUIN_SESSION: string;
		LC_CTYPE: string;
		npm_config_user_agent: string;
		FNM_RESOLVE_ENGINES: string;
		_P9K_SSH_TTY: string;
		OSLogRateLimit: string;
		GIT_PAGER: string;
		SECURITYSESSIONID: string;
		ATUIN_SHLVL: string;
		npm_node_execpath: string;
		npm_config_prefix: string;
		COLORTERM: string;
		CODEX_INTERNAL_ORIGINATOR_OVERRIDE: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://example.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.ENVIRONMENT); // => undefined, not public
 * console.log(env.PUBLIC_BASE_URL); // => "http://example.com"
 * ```
 * 
 * ```
 * 
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
