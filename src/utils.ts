import fs from 'fs';
import { uniq } from 'lodash';
import path from 'path';
const markdownit = require('markdown-it');
const umlFileExtensions = [
    '.pu',
    '.pml',
    '.puml',
    '.plantuml',
];
export function retrieveCodes(files) {
    return files.reduce((accum, f) => {
        const p = path.parse(f);
        if (umlFileExtensions.indexOf(p.ext) !== -1) {
            return accum.concat({
                name: p.name,
                // TODO: files may have been deleted.
                code: fs.readFileSync(f).toString(),
                dir: p.dir
            });
        }
        return accum;
    }, []);
}

export async function getCommitsFromPayload(octokit, payload) {
    const commits = payload.commits;
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;

    const res = await Promise.all(commits.map(commit => octokit.repos.getCommit({
        owner, repo, ref: commit.id
    })));
    return res.map(res => (<any>res).data);
}

export function updatedFiles(commits) {
    return uniq(commits.reduce(
        (accum: any[], commit) => accum.concat(
            commit.files.filter(f => f.status !== 'removed').map(f => f.filename)
        ),
        []
    ));
}
