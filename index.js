import OctokitOrigin from "octokit";
import { exec } from "child_process";
import util from "util";

/**
 * Make sure your ssh keys are set up to give you access to github
 * Get a personal key and store it in the variable below
 */

const GIT_REPO_DIRECTORY = "/Users/jeremyparker/src/marek/one-repo";
const PERSONAL_AUTH_KEY = "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";

const { Octokit } = OctokitOrigin;
const octokit = new Octokit({ auth: PERSONAL_AUTH_KEY });
const {
  data: { login },
} = await octokit.rest.users.getAuthenticated();
console.log("Hello, %s", login);

process.chdir(GIT_REPO_DIRECTORY);
console.log(`Current dir: ${process.cwd()}`);

// promisify exec once for the whole script
const execPromise = util.promisify(exec);

try {
  const { stdout, stderr } = await execPromise("ls -1");
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    throw new Error(stderr);
  }

  const gitDirectoryArray = stdout.split("\n");

  for (const directory of gitDirectoryArray) {
    if (!directory) {
      continue;
    }

    process.chdir(directory);
    console.log(`processing: ${process.cwd()}`);

    try {
      // create the repo on github
      const result = await octokit.rest.repos.createInOrg({
        org: "MarekHealth",
        name: directory,
        description: "This is your first repository",
        private: true,
        visibility: "private",
        has_issues: true,
        delete_branch_on_merge: true,
        use_squash_pr_title_as_default: true,
        squash_merge_commit_title: "COMMIT_OR_PR_TITLE",
        squash_merge_commit_message: "COMMIT_MESSAGES",
      });
      console.log(JSON.stringify(result));
    } catch(err) {
      // if it's not because the repo already exists, then re-throw because it's a real error that we should examine.
      const errorMessages = err.response?.data?.errors.map(err => err.message);
      if (!errorMessages.includes("name already exists on this account")) {
        console.error(err.message);
        throw new Error(err);
      }
    }

    const result = await execPromise(
      `git push --mirror git@github.com:MarekHealth/${directory}`
    );

    process.chdir(".."); // go back up to previous dir
  }
} catch (error) {
  if (error.response) {
    console.error(
      `Error! Status: ${error.response.status}. Message: ${error.response.data.message}`
    );
  }
  console.error(error);
}
console.log("done");
