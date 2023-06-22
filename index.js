import OctokitOrigin from "octokit";
import { exec } from "child_process";
import util from "util";

const GIT_REPO_DIRECTORY = "/Users/jeremyparker/src/marek/all-reposs";

// promisify exec
const execPromise = util.promisify(exec);

const { Octokit } = OctokitOrigin;
const octokit = new Octokit({
  auth: `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`,
});
const {
  data: { login },
} = await octokit.rest.users.getAuthenticated();
console.log("Hello, %s", login);

process.chdir(GIT_REPO_DIRECTORY);
console.log(`Current dir: ${process.cwd()}`);

try {
  const { stdout, stderr } = await execPromise("ls -1");
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    throw new Error(stderr);
  }

  const gitDirectoryArray = stdout.split("\n");

  for (const directory of gitDirectoryArray) {
    process.chdir(directory);

    console.log(`stdout: ${process.cwd()}`);
    process.chdir(".."); // go back up to previous dir
  }

  // const result = await octokit.rest.repos.createInOrg({
  //   org: "MarekHealth",
  //   name: "test",
  //   description: "This is your first repository",
  //   private: true,
  //   visibility: "private",
  //   has_issues: true,
  //   delete_branch_on_merge: true,
  //   use_squash_pr_title_as_default: true,
  //   squash_merge_commit_title: "COMMIT_OR_PR_TITLE",
  //   squash_merge_commit_message: "COMMIT_MESSAGES",
  // });
  // console.log(JSON.stringify(result));
} catch (error) {
  if (error.response) {
    console.error(
      `Error! Status: ${error.response.status}. Message: ${error.response.data.message}`
    );
  }
  console.error(error);
}
console.log("done");
