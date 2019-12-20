import fs from 'fs';
import path from 'path';
import * as exec from '@actions/exec';
const markdownit = require('markdown-it');

export function retrieveCodes(files) {
    return files.reduce((accum, f) => {
        const p = path.parse(f);
        if (p.ext === '.pu') {
            return accum.concat({
                name: p.name,
                // TODO: file may have deleted.
                code: fs.readFileSync(f).toString(),
            });
        }
        if (p.ext === '.md') {
            // TODO: file may have deleted.
            const content = fs.readFileSync(f).toString();
            return accum.concat(puFromMd(content));
        }
        return p.ext === '.md' ? accum.concat(f) : accum
    }, []);
}

const infoRegexp = /^plantuml(?:@(.+))?:([\w-_.]+)/;

function puFromMd(markdown) {
    const md = new markdownit();
    const fences = md.parse(markdown)
        .filter(token => token.type === 'fence')
        .filter(token => infoRegexp.test(token.info));

    return fences.reduce((accum, fence) => {
        const [, umlType, name] = fence.info.match(infoRegexp) || [];
        const [, typeInContent] = fence.content.match(/^(@start\w+)/) || [];

        if (!name) {
            return accum;
        }
        if (typeInContent) {
            return accum.concat({
                name,
                code: fence.content
            })
        }
        const t = umlType || 'uml';
        return accum.concat({
            name,
            code: [
                `@start${t}`,
                fence.content.trim(),
                `@end${t}`,
                ''
            ].join("\n"),
        })
    }, []);
}

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

export async function updatedFiles(octokit, payload) {
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
