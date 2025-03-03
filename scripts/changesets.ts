import writeChangeset from "npm:@changesets/write";
import readChangesets from "npm:@changesets/read";
import { Command } from "jsr:@cliffy/command@1.0.0-rc.7";
import { Checkbox, Input, Select } from "jsr:@cliffy/prompt@1.0.0-rc.7";
import * as path from "jsr:@std/path";
import * as fs from "jsr:@std/fs";
import * as semver from "jsr:@std/semver";
import { z } from "npm:zod";
import * as JSONC from "npm:jsonc-parser";

const DenoJson = z.object({
  workspace: z.array(z.string()).optional(),
  name: z.string().optional(),
  version: z.string().transform((v, ctx) => {
    const version = semver.tryParse(v);
    if (!version) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid semver version",
      });

      return z.NEVER;
    }

    return version;
  }).optional(),
});

const addCommand = new Command()
  .name("add")
  .description("Add a new changeset")
  .option("-e, --empty", "The changeset message", { default: false })
  .action(async (opts) => {
    const { members, workspaceRootPath } = await getWorkspace(Deno.cwd());

    if (opts.empty) {
      await writeChangeset({
        summary: "",
        releases: [],
      }, workspaceRootPath);
      return;
    }

    const selectedMembers = await Checkbox.prompt({
      message: "Select packages to update",
      options: members.map((member) => ({
        name: member.name,
        value: member,
      })),
    });

    const semverBumpTypes: Record<string, VersionType> = {};

    for (const member of selectedMembers) {
      semverBumpTypes[member.name] = await promptSemverBumpType(member.name);
    }

    const summary = await Input.prompt({
      message: "Summary",
    });

    await writeChangeset({
      summary,
      releases: selectedMembers.map((member) => ({
        name: member.name,
        type: semverBumpTypes[member.name],
      })),
    }, workspaceRootPath);
  });

const versionCommand = new Command()
  .name("version")
  .description(
    "Updates the versions for all packages described in changesets since last release. Also generate changesets",
  )
  .action(async () => {
    const { members, workspaceRootPath, rootDenoConfig } = await getWorkspace(
      Deno.cwd(),
    );
    const changesets = await readChangesets(workspaceRootPath);

    const releases = members.map((member) => {
      const majorChangesets = [];
      const minorChangesets = [];
      const patchChangesets = [];

      for (const changeset of changesets) {
        for (const release of changeset.releases) {
          if (release.name !== member.name) {
            continue;
          }

          if (release.type === "major") {
            majorChangesets.push(changeset);
          } else if (release.type === "minor") {
            minorChangesets.push(changeset);
          } else {
            patchChangesets.push(changeset);
          }
        }
      }

      if (
        majorChangesets.length + minorChangesets.length +
            patchChangesets.length === 0
      ) {
        return null;
      }

      const bump = majorChangesets.length > 0
        ? "major"
        : minorChangesets.length > 0
        ? "minor"
        : "patch";

      return {
        ...member,
        bump,
        newVersion: semver.increment(member.version, bump),
        releaseLines,
      };
    }).filter((release) => release !== null);

    console.log(releases);
  });

await new Command()
  .name("changesets")
  .command("add", addCommand)
  .command("version", versionCommand)
  .parse(Deno.args);

async function getWorkspace(cwd: string) {
  const workspaceDenoJsonPath = await findClosestDenoConfigPath(cwd);
  const workspaceRootPath = path.dirname(workspaceDenoJsonPath);
  const denoConfig = DenoJson.parse(
    JSON.parse(await Deno.readTextFile(workspaceDenoJsonPath)),
  );

  if (!denoConfig.workspace) {
    throw new Error(
      `No workspace property found in ${workspaceDenoJsonPath}.`,
    );
  }

  const members = await Promise.all(
    denoConfig.workspace.map(async (member) => {
      const memberPath = path.join(workspaceRootPath, member);
      const denoConfigPath = await getDenoConfigPath(memberPath);
      if (!denoConfigPath) {
        throw new Error(
          `Could not find deno.json or deno.jsonc file in ${memberPath}`,
        );
      }

      const denoConfig = DenoJson.parse(JSON.parse(
        await Deno.readTextFile(
          denoConfigPath,
        ),
      ));

      if (!denoConfig.name) {
        throw new Error(
          `No name property found in ${denoConfigPath}.`,
        );
      }

      if (!denoConfig.version) {
        throw new Error(
          `No version property found in ${denoConfigPath}.`,
        );
      }

      return {
        name: denoConfig.name,
        version: denoConfig.version,
        denoConfigPath,
      };
    }),
  );

  return { members, workspaceRootPath, rootDenoConfig: denoConfig };
}

async function getDenoConfigPath(dir: string) {
  const denoJsonPath = path.join(dir, "deno.json");
  const denoJsoncPath = path.join(dir, "deno.jsonc");
  if (await fs.exists(denoJsonPath)) {
    return path.join(dir, "deno.json");
  } else if (await fs.exists(denoJsoncPath)) {
    return path.join(dir, "deno.jsonc");
  }

  return null;
}

async function findClosestDenoConfigPath(
  cwd: string,
): Promise<string> {
  let currentDir = cwd;
  while (true) {
    const denoConfigPath = await getDenoConfigPath(currentDir);
    if (denoConfigPath) {
      return denoConfigPath;
    }

    const parentDir = path.resolve(currentDir, "..");
    if (parentDir === currentDir) {
      throw new Error(
        `Could not find parent directory with deno.json or deno.jsonc file`,
      );
    }
    currentDir = parentDir;
  }
}

type VersionType = "patch" | "minor" | "major";

function promptSemverBumpType(packageName: string): Promise<VersionType> {
  return Select.prompt({
    message: `Select semver bump type for ${packageName}`,
    options: [
      { name: "patch", value: "patch" },
      { name: "minor", value: "minor" },
      { name: "major", value: "major" },
    ],
  }) as Promise<VersionType>;
}
