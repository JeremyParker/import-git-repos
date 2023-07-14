This script will process a directory of bare git repos, which should all be subdirectories ending with .git) For each dir(repo) we'll create a new repo in github and push the local repo to it.

- Make sure your ssh keys are set up to give you access to github.
- Get a personal key and store it in the environment variable PERSONAL_AUTH_KEY. See github docs for how. The personal key needs permissions to create a repo and push to it.
- Install dependencies with `npm install`
- Run the script with `node index.js`

This script is idempotent. Running it twice on the same data should make no changes.
