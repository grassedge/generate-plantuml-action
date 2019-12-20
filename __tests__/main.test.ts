import { retrieveCodes, updatedFiles } from '../src/utils'
import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'

test('retrieveCodes', async() => {
    const codes = await retrieveCodes([
        '__tests__/assets/test1.md',
        '__tests__/assets/test3.pu',
    ]);
    await expect(codes).toEqual([
        {
            name: 'test-1',
            code: `@startuml
A -> B: test1
@enduml
`
        },
        {
            name: 'test_2',
            code: `@startuml
A -> B: test2
@enduml
`
        },
        {
            name: 'test.4',
            code: `@startgantt
[Prototype design] lasts 15 days
[Test prototype] lasts 10 days
@endgantt
`
        },
        {
            name: 'test3',
            code: `@startuml
A -> B: test3
B -> C: test3
@enduml
`
        }
    ]);
});

test('updatedFiles', async() => {
    const files = await updatedFiles(octokitMock, pushEventPayloadMock);
    await expect(files).toEqual([ 'action.yml', '' ]);
});

const octokitMock = {
    git: {
        getCommit: async function(opts) {
            switch(opts.commit_sha) {
                case '8bcd2e375cabcfe6fabd35f8685d13c48c2d09d0':
                    return { data: commitMock };
                default:
                    throw new Error('');
            }
        }
    }
}

const pushEventPayloadMock = {
    "commits": [
        {
            "id": "8bcd2e375cabcfe6fabd35f8685d13c48c2d09d0"
        }
    ],
    "repository": {
        "name": "Hello-World",
        "owner": {
            "login": "Codertocat",
        }
    }
};

const commitMock = {
    "parents": [
        {
            "sha": "e1127d04c7fb5730692b09eea14f34d60598577b"
        }
    ]
};
