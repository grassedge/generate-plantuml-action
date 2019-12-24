// TODO logging.
import * as core from '@actions/core';
import * as github from '@actions/github';
const axios = require('axios');
import { Base64 } from 'js-base64';
const path = require('path');
const plantumlEncoder = require('plantuml-encoder');

import { retrieveCodes, getCommitsFromPayload, updatedFiles } from './utils';

function branchFromRef(ref) {
    const matched = ref.match(/^refs\/heads\/(.+)$/);
    if (!matched) {
        return null;
    }
    return matched[1];
}

async function generateSvg(code) {
    const encoded = plantumlEncoder.encode(code);
    try {
        const res = await axios.get(`http://www.plantuml.com/plantuml/svg/${encoded}`);
        return res.data;
    } catch(e) {
        // TODO
    }
}

const diagramPath = core.getInput('path');
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

    const branch = branchFromRef(ref);
    if (!branch) {
        core.setFailed("Branch is not found.");
        return;
    }

    const commits = getCommitsFromPayload(octokit, payload);
    const files = await updatedFiles(commits);
    const plantumlCodes = retrieveCodes(files);

    let tree: any[] = [];
    for (const plantumlCode of plantumlCodes) {
        const p = path.format({
            dir: diagramPath,
            name: plantumlCode.name,
            ext: '.svg'
        });

        const svg = await generateSvg(plantumlCode.code);
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
        console.log(`No file is generated.`);
        return;
    }

    const treeRes = await octokit.git.createTree({
        owner, repo, tree,
        base_tree: commits[0].tree.sha,
    });

    const createdCommitRes = await octokit.git.createCommit({
        owner, repo,
        message: `Generate svg files`,
        parents: [ commits[0].sha ],
        tree: treeRes.data.sha,
    });

    const updatedRefRes = await octokit.git.updateRef({
        owner, repo, ref,
        sha: createdCommitRes.data.sha,
    });

    console.log(`${tree.map(t => t.path).join("\n")} Abobe files are generated.`);
})().catch(e => {
    core.setFailed(e);
});
