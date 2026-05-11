export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.B_akyIhZ.js",app:"_app/immutable/entry/app.YJzXXRUq.js",imports:["_app/immutable/entry/start.B_akyIhZ.js","_app/immutable/chunks/B0IFkSEu.js","_app/immutable/chunks/m7g37BMq.js","_app/immutable/chunks/BS2VqvcL.js","_app/immutable/entry/app.YJzXXRUq.js","_app/immutable/chunks/m7g37BMq.js","_app/immutable/chunks/6ySMUxSO.js","_app/immutable/chunks/Du0n9tfP.js","_app/immutable/chunks/BS2VqvcL.js","_app/immutable/chunks/BlrWpG27.js","_app/immutable/chunks/C7AAG_HP.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
