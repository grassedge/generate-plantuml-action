// TODO logging.
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
const axios = require('axios');
import { Base64 } from 'js-base64';
const path = require('path');
const plantumlEncoder = require('plantuml-encoder');

import { retrieveCodes } from './utils';

function execute(cmd, args): Promise<{ exitCode: any; stdout: string; stderr: string }> {
    return new Promise(async (resolve, reject) => {
        let stdout = '', stderr = '';
        const exitCode = await exec.exec(
            cmd, args, {
                listeners: {
                    stdout: (data) => {
                        stdout += data.toString();
                    },
                    stderr: (data) => {
                        stderr += data.toString();
                    }
                }
            }
        );
        if (exitCode !== 0) {
            reject({ exitCode, stdout, stderr });
        } else {
            resolve({ exitCode, stdout, stderr });
        }
    });
}

async function updatedFiles(payload) {
    const commits = payload.commits;
    const owner   = payload.repository.owner.login;
    const repo    = payload.repository.name;

    const startCommit = (await octokit.git.getCommit({
        owner,
        repo,
        commit_sha: commits[0].id,
    })).data;

    const startSha = startCommit.parents[0].sha;
    const endSha   = commits[commits.length - 1].id;

    const executed = await execute(
        'git', ['diff', '--name-only', `${startSha}...${endSha}`]
    );
    const { exitCode, stdout } = <any>executed;
    return stdout.split("\n");
}

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

// TODO: handle force push
(async function main() {

    const payload = github.context.payload;
    const ref     = payload.ref;
    if (!payload.repository) {
        throw new Error();
    }
    const owner   = payload.repository.owner.login;
    const repo    = payload.repository.name;
    const commits = payload.commits;

    const branch = branchFromRef(ref);
    if (!branch) {
        core.setFailed("Branch is not found.");
        return;
    }

    const files = await updatedFiles(payload);
    const plantumlCodes = retrieveCodes(files);

    for (const plantumlCode of plantumlCodes) {

        const svg = await generateSvg(plantumlCode.code);

        const p = path.format({
            dir: diagramPath, name: plantumlCode.name, ext: '.svg'
        });

        const sha = await octokit.repos.getContents({
            owner,
            repo,
            ref,
            path: p,
        }).then(res => (<any>res.data).sha).catch(e => undefined);

        await octokit.repos.createOrUpdateFile({
            owner,
            repo,
            sha,
            branch,
            path: p,
            message: `Generate ${p}`,
            content: Base64.encode(svg),
        });

        console.log(`${p} is generated.`);
    }
})().catch(e => {
    core.setFailed(e);
});
