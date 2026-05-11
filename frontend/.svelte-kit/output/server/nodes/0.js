

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.BcG_Rw7B.js","_app/immutable/chunks/Du0n9tfP.js","_app/immutable/chunks/m7g37BMq.js","_app/immutable/chunks/C7AAG_HP.js"];
export const stylesheets = [];
export const fonts = [];
