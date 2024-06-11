#!/usr/bin/env node

"use strict";

const fs = require("fs");
const decompress = require("decompress");
const program = require("commander");
const fetch = require("node-fetch");

console.warn();
console.warn("@hilla/cli is deprecated. Use 'npm init vaadin' to create new projects");
console.warn();

program
  .option("--empty", "Create a project with no menu and no views")
  .option("--react", "Use React for the UI - this is the default")
  .option("--lit", "Use Lit for the UI")
  .option(
    "--latest",
    "Use the latest release - this is the default"
  )
  .option("--pre", "Use the latest pre release (if available)")
  .option(
    "--next",
    "Use the pre release for the next major version (if available)"
  )
  .option("--auth", "Add authentication support to the application")
  .option("--push", "Add push support / reactive endpoints to the application")
  .option(
    "--git",
    "Initialize a Git repository for the project and commit the initial files"
  )
  .option(
    "--preset <preset>",
    "Use the given preset you happen to know that exists"
  )
  .option("--server <server>", "For internal testing only")
  .arguments("<projectName>")
  .action(async function (projectName) {
    const options = program.opts();
    const git = !!options.git;
    let preset = "default";

    if (options.preset) {
      preset = options.preset;
    } else {
      if (options.lit) {
        preset = "hilla";
      } else {
        preset = "react";
      }
      if (options.empty) {
        preset += "-empty";
      }
    }

    if (options.push) {
      preset += "&preset=partial-push";
    }

    if (options.auth) {
      preset += "&preset=partial-auth";
    }

    if (options.pre) {
      preset += "&preset=partial-prerelease";
    } else if (options.next) {
      preset += "&preset=partial-nextprerelease";
    } else if (options.latest) {
      preset += "&preset=partial-latest";
    }

    if (fs.existsSync(projectName)) {
      console.error("Directory '" + projectName + "' already exists");
      return;
    }

    console.log(`Creating application '${projectName}'`);

    try {
      const host = options.server || "start.vaadin.com";
      const url = `https://${host}/dl?preset=${preset}&projectName=${projectName}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": `Hilla CLI`,
          method: "GET",
          "Accept-Encoding": "gzip",
        },
      });
      if (!response.ok) {
        if (response.status == 404) {
          console.error("Preset not found");
        } else {
          console.error("Unable to create project: " + response.status);
        }
        return;
      }

      const body = await response.buffer();
      fs.writeFileSync("temp.zip", body);
      try {
        await decompress("temp.zip", ".", {
          // workaround for https://github.com/kevva/decompress/issues/46
          filter: (file) => !file.path.endsWith("/"),
        });
      } catch (e) {
        console.error(e);
        return;
      }
      fs.unlinkSync("temp.zip");
      console.log("Project '" + projectName + "' created");
      if (git) {
        console.log("Creating Git repository and initial commit");
        process.chdir(projectName);

        require("simple-git")().init().add("./*").commit("Generated project");
      }
    } catch (e) {
      console.error("Unable to create project: " + e);
    }
  });

program.parse(process.argv);
