import OctokitOrigin from "octokit";
import { exec } from "child_process";
import util from "util";

/**
 * This script will process a directory of bare git repos (also directories).
 * For each dir(repo) we'll create a new repo in github and push the local repo to it.
 * Make sure your ssh keys are set up to give you access to github.
 * Get a personal key and store it in the variable below. See github docs for how. The
 * personal key needs permissions to create a repo and push to it.
 */
const ORG_NAME = "MarekHealth";
const PREFERRED_DEFAULT_BRANCH_NAME = "master";
const PERSONAL_AUTH_KEY =
  "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";
const GIT_REPO_DIRECTORY = "/Users/jeremyparker/src/marek/all-repos";

const { Octokit } = OctokitOrigin;
const octokit = new Octokit({ auth: PERSONAL_AUTH_KEY });

// say hello to the user (and test auth)
const {
  data: { login },
} = await octokit.rest.users.getAuthenticated();
console.log(`Hi, ${login}. We're importing the repos in ${GIT_REPO_DIRECTORY}`);

// promisify exec once for the whole script
const execPromise = util.promisify(exec);

try {
  process.chdir(GIT_REPO_DIRECTORY);
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

    let defaultBranch;
    try {
      // create the repo on github
      const result = await octokit.rest.repos.createInOrg({
        org: ORG_NAME,
        name: directory,
        description: directory,
        private: true,
        visibility: "private",
        has_issues: true,
        delete_branch_on_merge: true,
        use_squash_pr_title_as_default: true,
        squash_merge_commit_title: "COMMIT_OR_PR_TITLE",
        squash_merge_commit_message: "COMMIT_MESSAGES",
      });
      defaultBranch = result.data?.default_branch;
    } catch (err) {
      // if it's not because the repo already exists, then re-throw because it's a real error that we should examine.
      const errorMessages = err.response?.data?.errors.map(
        (err) => err.message
      );
      if (!errorMessages.includes("name already exists on this account")) {
        console.error(err.message);
        throw new Error(err);
      }
    }

    // push the local repo to the new one on github
    const result = await execPromise(
      `git push --mirror git@github.com:${ORG_NAME}/${directory}`
    );

    // make sure the default branch is right
    console.log(` default_branch: ${defaultBranch}`);
    if (defaultBranch !== PREFERRED_DEFAULT_BRANCH_NAME) {
      const repo = directory.split(".")[0];
      const branchResult = await octokit.rest.repos.update({
        owner: ORG_NAME,
        repo,
        default_branch: PREFERRED_DEFAULT_BRANCH_NAME,
      });
      if (branchResult.status != 200) {
        console.log(JSON.stringify(branchResult));
        throw new Error(branchResult);
      }
    }

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
