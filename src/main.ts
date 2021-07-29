// TODO logging.
import * as core from '@actions/core';
import * as github from '@actions/github';
const axios = require('axios');
import { Base64 } from 'js-base64';
const path = require('path');
const plantumlEncoder = require('plantuml-encoder');

import { retrieveCodes, getCommitsFromPayload, updatedFiles } from './utils';

async function generateSvg(code, plantUmlServerUrl) {
    const encoded = plantumlEncoder.encode(code);
    try {
        const res = await axios.get(`${plantUmlServerUrl}/svg/${encoded}`);
        return res.data;
    } catch(e) {
        // TODO
    }
}

const diagramPath = core.getInput('path');
const commitMessage = core.getInput('message');
const plantUmlServerUrl = core.getInput('plant_uml_server_url');

if (!process.env.GITHUB_TOKEN) {
    core.setFailed('Please set GITHUB_TOKEN env var.');
    process.exit(1);
}
const octokit = new github.GitHub(process.env.GITHUB_TOKEN);

(async function main() {
    const payload = github.context.payload;
    const ref     = payload.ref;
    if (!payload.repository) {
        throw new Error();
    }
    const owner   = payload.repository.owner.login;
    const repo    = payload.repository.name;

    const commits = await getCommitsFromPayload(octokit, payload);
    const files = updatedFiles(commits);
    const plantumlCodes = retrieveCodes(files);

    let tree: any[] = [];
    for (const plantumlCode of plantumlCodes) {
        const p = path.format({
            dir: (diagramPath === '.') ? plantumlCode.dir : diagramPath,
            name: plantumlCode.name,
            ext: '.svg'
        });

        const svg = await generateSvg(plantumlCode.code, plantUmlServerUrl);
        const blobRes = await octokit.git.createBlob({
            owner, repo,
            content: Base64.encode(svg),
            encoding: 'base64',
        });

        const sha = await octokit.repos.getContents({
            owner, repo, ref, path: p
        }).then(res => (<any>res.data).sha).catch(e => undefined);

        if (blobRes.data.sha !== sha) {
            tree = tree.concat({
                path: p.toString(),
                mode: "100644",
                type: "blob",
                sha: blobRes.data.sha
            })
        }
    }

    if (tree.length === 0) {
        console.log(`There are no files to be generated.`);
        return;
    }

    const treeRes = await octokit.git.createTree({
        owner, repo, tree,
        base_tree: commits[commits.length - 1].commit.tree.sha,
    });

    const createdCommitRes = await octokit.git.createCommit({
        owner, repo,
        message: commitMessage,
        parents: [ commits[commits.length - 1].sha ],
        tree: treeRes.data.sha,
    });

    const updatedRefRes = await octokit.git.updateRef({
        owner, repo,
        ref: ref.replace(/^refs\//, ''),
        sha: createdCommitRes.data.sha,
    });

    console.log(`${tree.map(t => t.path).join("\n")}\nAbobe files are generated.`);
})().catch(e => {
    core.setFailed(e);
});
