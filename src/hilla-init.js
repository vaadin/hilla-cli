#!/usr/bin/env node

"use strict";

const fs = require("fs");
const decompress = require("decompress");
const program = require("commander");
const fetch = require("node-fetch");

program
  .option("--empty", "Create a project with no menu and one empty view")
  .option("--react", "Use React for the UI - this is the default")
  .option("--lit", "Use Lit for the UI")
  .option(
    "--latest",
    "Use the latest release. By default uses the latest LTS release"
  )
  .option("--pre", "Use the latest pre release (if available)")
  .option(
    "--next",
    "Use the pre release for the next major version (if available)"
  )
  .option("--auth", "Add authentication support to the application")
  .option("--push", "Add experimental push support")
  .option(
    "--git",
    "Initialize a Git repository for the project and commit the initial files"
  )
  .option(
    "--preset <preset>",
    "Use the given preset you happen to know that exists"
  )
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
      const response = await fetch(
        `https://start.vaadin.com/dl?preset=${preset}&projectName=${projectName}`,
        {
          headers: {
            "User-Agent": `Hilla CLI`,
            method: "GET",
            "Accept-Encoding": "gzip",
          },
        }
      );
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
