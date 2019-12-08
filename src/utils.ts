import fs from 'fs';
import path from 'path';
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
