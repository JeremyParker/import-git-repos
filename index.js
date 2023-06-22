import OctokitOrigin from "octokit";
import { exec } from "child_process";
import util from "util";

/**
 * This script will process a directory of bare git repos, which should all be
 * subdirectories ending with .git)
 * For each dir(repo) we'll create a new repo in github and push the local repo to it.
 * Make sure your ssh keys are set up to give you access to github.
 * Get a personal key and store it in the variable below. See github docs for how. The
 * personal key needs permissions to create a repo and push to it.
 * This script is idempotent. Running it twice on the same data should make no changes.
 */
const PERSONAL_AUTH_KEY =
  "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";
const ORG_NAME = "MarekHealth";
const ACCEPTABLE_DEFAULT_BRANCH_NAMES = ["master", "main"];
const GIT_REPO_DIRECTORY = "/Users/jeremyparker/src/marek/all-repos";

const { Octokit } = OctokitOrigin;
const octokit = new Octokit({ auth: PERSONAL_AUTH_KEY });

// promisify exec once for the whole script
const execPromise = util.promisify(exec);

/**
 * Main execution
 */
const main = async () => {
  await sayHello(GIT_REPO_DIRECTORY);

  try {
    process.chdir(GIT_REPO_DIRECTORY);

    const gitDirectoryArray = await getRepoList();

    for (const directory of gitDirectoryArray) {
      process.chdir(directory);
      console.log(`------------------ \nprocessing: ${process.cwd()}`);

      const defaultBranch =   await createRepo(ORG_NAME, directory, directory);

      // push the local repo to the new one on github
      const { stderr, stdout } = await execPromise(
        `git push --mirror git@github.com:${ORG_NAME}/${directory}`
      );
      console.log(stdout, stderr);

      // make sure the default branch is right
      console.log(` default_branch: ${defaultBranch}`);
      await ensureAcceptableDefaultBranch(
        ORG_NAME,
        directory,
        defaultBranch,
        ACCEPTABLE_DEFAULT_BRANCH_NAMES
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
};

/**
 *  say hello to the user (and test auth)
 */
const sayHello = async (dir) => {
  const {
    data: { login },
  } = await octokit.rest.users.getAuthenticated();
  console.log(`Hi, ${login}. We're importing the repos in ${dir}`);
};

const getRepoList = async () => {
  const { stdout, stderr } = await execPromise("ls -1");
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    throw new Error(stderr);
  }
  return stdout.trim().split("\n");
};

/**
 * @param {*} org - the org to which the new repo will belong
 * @param {*} name - the name of the new repo
 * @param {*} description - description for the new repo
 * @returns the name of the new repo's default branch
 */
const createRepo = async (org, name, description) => {
  try {
    // create the repo on github
    const result = await octokit.rest.repos.createInOrg({
      org,
      name,
      description,
      private: true,
      visibility: "private",
      has_issues: true,
      delete_branch_on_merge: true,
      use_squash_pr_title_as_default: true,
      squash_merge_commit_title: "COMMIT_OR_PR_TITLE",
      squash_merge_commit_message: "COMMIT_MESSAGES",
    });
    console.log(`Repo ${name} created`);
    return result.data?.default_branch;
  } catch (err) {
    // if it's not because the repo already exists, then re-throw because it's a real error that we should examine.
    const errorMessages = err.response?.data?.errors.map((err) => err.message);
    if (errorMessages.includes("name already exists on this account")) {
      console.log("name already exists on this account");
    } else {
      console.error(err.message);
      throw new Error(err);
    }
  }
};

/**
 * @param {*} owner - the name of the org to which this repo belongs
 * @param {*} directory - the dir that contains the repo, ending with *.git
 * @param {*} newDefaultBranch - array of acceptable default branch names e.g. [master, main]
 */
const ensureAcceptableDefaultBranch = async (
  owner,
  directory,
  defaultBranch,
  acceptableDefaultBranches
) => {
  if (ACCEPTABLE_DEFAULT_BRANCH_NAMES.includes(defaultBranch)) {
    return;
  }

  const repo = directory.split(".")[0];
  const branchResponse = await octokit.rest.repos.listBranches({ owner, repo });
  const branches = branchResponse.data?.map((d) => d.name);

  for (const name of acceptableDefaultBranches) {
    if (branches.includes(name)) {
      const result = await octokit.rest.repos.update({
        owner,
        repo,
        default_branch: name,
      });

      if (result.status != 200) {
        console.error(JSON.stringify(result));
        throw new Error(result);
      }

      console.log(`Set default branch to ${name}`);
      break;
    }
  }
};

await main();
console.log("done");
