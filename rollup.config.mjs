import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default {
	input: "src/plugin.ts",
	output: {
		dir: "bin",
		format: "esm",
		preserveModules: true,
		preserveModulesRoot: "src",
		sourcemap: false,
		entryFileNames: "[name].js"
	},
	plugins: [
		nodeResolve({
			preferBuiltins: true
		}),
		commonjs(),
		json(),
		typescript({
			tsconfig: "./tsconfig.json",
			importHelpers: false
		})
	],
	external: [
		/^node:.*/
	]
};
