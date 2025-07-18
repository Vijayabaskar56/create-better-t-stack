import path from "node:path";
import { consola } from "consola";
import {
	type API,
	type Addons,
	type Backend,
	type CLIInput,
	type Database,
	type DatabaseSetup,
	type Examples,
	type Frontend,
	type ORM,
	type PackageManager,
	type ProjectConfig,
	ProjectNameSchema,
	type Runtime,
} from "./types";

export function processAndValidateFlags(
	options: CLIInput,
	providedFlags: Set<string>,
	projectName?: string,
): Partial<ProjectConfig> {
	const config: Partial<ProjectConfig> = {};

	if (options.api) {
		config.api = options.api as API;
		if (options.api === "none") {
			if (
				options.examples &&
				!(options.examples.length === 1 && options.examples[0] === "none") &&
				options.backend !== "convex"
			) {
				consola.fatal(
					"Cannot use '--examples' when '--api' is set to 'none'. Please remove the --examples flag or choose an API type.",
				);
				process.exit(1);
			}
		}
	}

	if (options.backend) {
		config.backend = options.backend as Backend;
	}

	if (
		providedFlags.has("backend") &&
		config.backend &&
		config.backend !== "convex" &&
		config.backend !== "none"
	) {
		if (providedFlags.has("runtime") && options.runtime === "none") {
			consola.fatal(
				`'--runtime none' is only supported with '--backend convex' or '--backend none'. Please choose 'bun', 'node', or remove the --runtime flag.`,
			);
			process.exit(1);
		}
	}

	if (options.database) {
		config.database = options.database as Database;
	}
	if (options.orm) {
		config.orm = options.orm as ORM;
	}
	if (options.auth !== undefined) {
		config.auth = options.auth;
	}
	if (options.git !== undefined) {
		config.git = options.git;
	}
	if (options.install !== undefined) {
		config.install = options.install;
	}
	if (options.runtime) {
		config.runtime = options.runtime as Runtime;
	}
	if (options.dbSetup) {
		config.dbSetup = options.dbSetup as DatabaseSetup;
	}
	if (options.packageManager) {
		config.packageManager = options.packageManager as PackageManager;
	}

	if (projectName) {
		const result = ProjectNameSchema.safeParse(path.basename(projectName));
		if (!result.success) {
			consola.fatal(
				`Invalid project name: ${
					result.error.issues[0]?.message || "Invalid project name"
				}`,
			);
			process.exit(1);
		}
		config.projectName = projectName;
	} else if (options.projectDirectory) {
		const baseName = path.basename(
			path.resolve(process.cwd(), options.projectDirectory),
		);
		const result = ProjectNameSchema.safeParse(baseName);
		if (!result.success) {
			consola.fatal(
				`Invalid project name: ${
					result.error.issues[0]?.message || "Invalid project name"
				}`,
			);
			process.exit(1);
		}
		config.projectName = baseName;
	}

	if (options.frontend && options.frontend.length > 0) {
		if (options.frontend.includes("none")) {
			if (options.frontend.length > 1) {
				consola.fatal(`Cannot combine 'none' with other frontend options.`);
				process.exit(1);
			}
			config.frontend = [];
		} else {
			const validOptions = options.frontend.filter(
				(f): f is Frontend => f !== "none",
			);
			const webFrontends = validOptions.filter(
				(f) =>
					f === "tanstack-router" ||
					f === "react-router" ||
					f === "tanstack-start" ||
					f === "next" ||
					f === "nuxt" ||
					f === "svelte" ||
					f === "solid" ||
					f === "angular",
			);
			const nativeFrontends = validOptions.filter(
				(f) => f === "native-nativewind" || f === "native-unistyles",
			);

			if (webFrontends.length > 1) {
				consola.fatal(
					"Cannot select multiple web frameworks. Choose only one of: tanstack-router, tanstack-start, react-router, next, nuxt, svelte, solid",
				);
				process.exit(1);
			}
			if (nativeFrontends.length > 1) {
				consola.fatal(
					"Cannot select multiple native frameworks. Choose only one of: native-nativewind, native-unistyles",
				);
				process.exit(1);
			}
			config.frontend = validOptions;
		}
	}
	if (options.addons && options.addons.length > 0) {
		if (options.addons.includes("none")) {
			if (options.addons.length > 1) {
				consola.fatal(`Cannot combine 'none' with other addons.`);
				process.exit(1);
			}
			config.addons = [];
		} else {
			config.addons = options.addons.filter(
				(addon): addon is Addons => addon !== "none",
			);
		}
	}
	if (options.examples && options.examples.length > 0) {
		if (options.examples.includes("none")) {
			if (options.examples.length > 1) {
				consola.fatal("Cannot combine 'none' with other examples.");
				process.exit(1);
			}
			config.examples = [];
		} else {
			config.examples = options.examples.filter(
				(ex): ex is Examples => ex !== "none",
			);
			if (options.examples.includes("none") && config.backend !== "convex") {
				config.examples = [];
			}
		}
	}

	if (config.backend === "convex") {
		const incompatibleFlags: string[] = [];

		if (providedFlags.has("auth") && options.auth === true)
			incompatibleFlags.push("--auth");
		if (providedFlags.has("database") && options.database !== "none")
			incompatibleFlags.push(`--database ${options.database}`);
		if (providedFlags.has("orm") && options.orm !== "none")
			incompatibleFlags.push(`--orm ${options.orm}`);
		if (providedFlags.has("api") && options.api !== "none")
			incompatibleFlags.push(`--api ${options.api}`);
		if (providedFlags.has("runtime") && options.runtime !== "none")
			incompatibleFlags.push(`--runtime ${options.runtime}`);
		if (providedFlags.has("dbSetup") && options.dbSetup !== "none")
			incompatibleFlags.push(`--db-setup ${options.dbSetup}`);

		if (incompatibleFlags.length > 0) {
			consola.fatal(
				`The following flags are incompatible with '--backend convex': ${incompatibleFlags.join(
					", ",
				)}. Please remove them.`,
			);
			process.exit(1);
		}

		if (providedFlags.has("frontend") && options.frontend) {
			const incompatibleFrontends = options.frontend.filter(
				(f) => f === "nuxt" || f === "solid" || f === "angular",
			);
			if (incompatibleFrontends.length > 0) {
				consola.fatal(
					`The following frontends are not compatible with '--backend convex': ${incompatibleFrontends.join(
						", ",
					)}. Please choose a different frontend or backend.`,
				);
				process.exit(1);
			}
		}

		config.auth = false;
		config.database = "none";
		config.orm = "none";
		config.api = "none";
		config.runtime = "none";
		config.dbSetup = "none";
		config.examples = ["todo"];
	} else if (config.backend === "none") {
		const incompatibleFlags: string[] = [];

		if (providedFlags.has("auth") && options.auth === true)
			incompatibleFlags.push("--auth");
		if (providedFlags.has("database") && options.database !== "none")
			incompatibleFlags.push(`--database ${options.database}`);
		if (providedFlags.has("orm") && options.orm !== "none")
			incompatibleFlags.push(`--orm ${options.orm}`);
		if (providedFlags.has("api") && options.api !== "none")
			incompatibleFlags.push(`--api ${options.api}`);
		if (providedFlags.has("runtime") && options.runtime !== "none")
			incompatibleFlags.push(`--runtime ${options.runtime}`);
		if (providedFlags.has("dbSetup") && options.dbSetup !== "none")
			incompatibleFlags.push(`--db-setup ${options.dbSetup}`);
		if (providedFlags.has("examples") && options.examples) {
			const hasNonNoneExamples = options.examples.some((ex) => ex !== "none");
			if (hasNonNoneExamples) {
				incompatibleFlags.push("--examples");
			}
		}

		if (incompatibleFlags.length > 0) {
			consola.fatal(
				`The following flags are incompatible with '--backend none': ${incompatibleFlags.join(
					", ",
				)}. Please remove them.`,
			);
			process.exit(1);
		}

		config.auth = false;
		config.database = "none";
		config.orm = "none";
		config.api = "none";
		config.runtime = "none";
		config.dbSetup = "none";
		config.examples = [];
	}

	if (config.orm === "mongoose" && config.database !== "mongodb") {
		consola.fatal(
			"Mongoose ORM requires MongoDB database. Please use '--database mongodb' or choose a different ORM.",
		);
		process.exit(1);
	}

	if (
		config.database === "mongodb" &&
		config.orm &&
		config.orm !== "mongoose" &&
		config.orm !== "prisma"
	) {
		consola.fatal(
			"MongoDB database requires Mongoose or Prisma ORM. Please use '--orm mongoose' or '--orm prisma' or choose a different database.",
		);
		process.exit(1);
	}

	if (config.orm === "drizzle" && config.database === "mongodb") {
		consola.fatal(
			"Drizzle ORM does not support MongoDB. Please use '--orm mongoose' or '--orm prisma' or choose a different database.",
		);
		process.exit(1);
	}

	if (config.database && config.database !== "none" && config.orm === "none") {
		consola.fatal(
			"Database selection requires an ORM. Please choose '--orm drizzle', '--orm prisma', or '--orm mongoose'.",
		);
		process.exit(1);
	}

	if (config.orm && config.orm !== "none" && config.database === "none") {
		consola.fatal(
			"ORM selection requires a database. Please choose a database or set '--orm none'.",
		);
		process.exit(1);
	}

	if (config.auth && config.database === "none") {
		consola.fatal(
			"Authentication requires a database. Please choose a database or set '--no-auth'.",
		);
		process.exit(1);
	}

	if (
		config.dbSetup &&
		config.dbSetup !== "none" &&
		config.database === "none"
	) {
		consola.fatal(
			"Database setup requires a database. Please choose a database or set '--db-setup none'.",
		);
		process.exit(1);
	}

	if (config.dbSetup === "turso" && config.database !== "sqlite") {
		consola.fatal(
			"Turso setup requires SQLite database. Please use '--database sqlite' or choose a different setup.",
		);
		process.exit(1);
	}

	if (config.dbSetup === "neon" && config.database !== "postgres") {
		consola.fatal(
			"Neon setup requires PostgreSQL database. Please use '--database postgres' or choose a different setup.",
		);
		process.exit(1);
	}

	if (config.dbSetup === "prisma-postgres" && config.database !== "postgres") {
		consola.fatal(
			"Prisma PostgreSQL setup requires PostgreSQL database. Please use '--database postgres' or choose a different setup.",
		);
		process.exit(1);
	}

	if (config.dbSetup === "mongodb-atlas" && config.database !== "mongodb") {
		consola.fatal(
			"MongoDB Atlas setup requires MongoDB database. Please use '--database mongodb' or choose a different setup.",
		);
		process.exit(1);
	}

	if (config.dbSetup === "supabase" && config.database !== "postgres") {
		consola.fatal(
			"Supabase setup requires PostgreSQL database. Please use '--database postgres' or choose a different setup.",
		);
		process.exit(1);
	}

	return config;
}

export function validateConfigCompatibility(
	config: Partial<ProjectConfig>,
): void {
	const effectiveDatabase = config.database;
	const effectiveBackend = config.backend;
	const effectiveFrontend = config.frontend;
	const effectiveApi = config.api;

	const includesNuxt = effectiveFrontend?.includes("nuxt");
	const includesSvelte = effectiveFrontend?.includes("svelte");
	const includesSolid = effectiveFrontend?.includes("solid");
	const includesAngular = effectiveFrontend?.includes("angular");
	if (
		(includesNuxt || includesSvelte || includesSolid || includesAngular) &&
		effectiveApi === "trpc"
	) {
		consola.fatal(
			`tRPC API is not supported with '${
				includesNuxt
					? "nuxt"
					: includesSvelte
						? "svelte"
						: includesSolid
							? "solid"
							: "angular"
			}' frontend. Please use --api orpc or --api none or remove '${
				includesNuxt
					? "nuxt"
					: includesSvelte
						? "svelte"
						: includesSolid
							? "solid"
							: "angular"
			}' from --frontend.`,
		);
		process.exit(1);
	}

	if (config.addons && config.addons.length > 0) {
		const webSpecificAddons = ["pwa", "tauri"];
		const hasWebSpecificAddons = config.addons.some((addon) =>
			webSpecificAddons.includes(addon),
		);
		const hasCompatibleWebFrontend = effectiveFrontend?.some((f) => {
			const isPwaCompatible =
				f === "tanstack-router" ||
				f === "react-router" ||
				f === "solid" ||
				f === "next" ||
				f === "angular";
			const isTauriCompatible =
				f === "tanstack-router" ||
				f === "react-router" ||
				f === "nuxt" ||
				f === "svelte" ||
				f === "solid" ||
				f === "next" ||
				f === "angular";

			if (config.addons?.includes("pwa") && config.addons?.includes("tauri")) {
				return isPwaCompatible && isTauriCompatible;
			}
			if (config.addons?.includes("pwa")) {
				return isPwaCompatible;
			}
			if (config.addons?.includes("tauri")) {
				return isTauriCompatible;
			}
			return true;
		});

		if (hasWebSpecificAddons && !hasCompatibleWebFrontend) {
			let incompatibleReason = "Selected frontend is not compatible.";
			if (config.addons.includes("pwa")) {
				incompatibleReason =
					"PWA requires tanstack-router, react-router, next, angular, or solid.";
			}
			if (config.addons.includes("tauri")) {
				incompatibleReason =
					"Tauri requires tanstack-router, react-router, nuxt, svelte, solid, next, or angular.";
			}
			consola.fatal(
				`Incompatible addon/frontend combination: ${incompatibleReason}`,
			);
			process.exit(1);
		}

		if (config.addons.includes("husky") && !config.addons.includes("biome")) {
			consola.warn(
				"Husky addon is recommended to be used with Biome for lint-staged configuration.",
			);
		}
		config.addons = [...new Set(config.addons)];
	}

	if (
		config.examples &&
		config.examples.length > 0 &&
		!config.examples.includes("none")
	) {
		if (
			config.examples.includes("todo") &&
			effectiveBackend !== "convex" &&
			effectiveBackend !== "none" &&
			effectiveDatabase === "none"
		) {
			consola.fatal(
				"The 'todo' example requires a database if a backend (other than Convex) is present. Cannot use --examples todo when database is 'none' and a backend is selected.",
			);
			process.exit(1);
		}

		if (config.examples.includes("ai") && effectiveBackend === "elysia") {
			consola.fatal(
				"The 'ai' example is not compatible with the Elysia backend.",
			);
			process.exit(1);
		}

		if (config.examples.includes("ai") && includesSolid) {
			consola.fatal(
				"The 'ai' example is not compatible with the Solid frontend.",
			);
			process.exit(1);
		}
		if (config.examples.includes("ai") && includesAngular) {
			consola.fatal(
				"The 'ai' example is not compatible with the Angular frontend.",
			);
			process.exit(1);
		}
	}
}

export function getProvidedFlags(options: CLIInput): Set<string> {
	return new Set(
		Object.keys(options).filter(
			(key) => options[key as keyof CLIInput] !== undefined,
		),
	);
}
