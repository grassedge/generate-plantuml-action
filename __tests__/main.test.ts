import { retrieveCodes, getCommitsFromPayload, updatedFiles } from '../src/utils'
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
`,
            dir: '__tests__/assets'
        },
        {
            name: 'test_2',
            code: `@startuml
A -> B: test2
@enduml
`,
            dir: '__tests__/assets'
        },
        {
            name: 'test.4',
            code: `@startgantt
[Prototype design] lasts 15 days
[Test prototype] lasts 10 days
@endgantt
`,
            dir: '__tests__/assets'
        },
        {
            name: 'test3',
            code: `@startuml
A -> B: test3
B -> C: test3
@enduml
`,
            dir: '__tests__/assets'
        }
    ]);
});

test('getCommitsFromPayload', async() => {
    const files = await getCommitsFromPayload(octokitMock, pushEventPayloadMock);
    await expect(files).toEqual([
        {
            "files": [
                {
                    "filename": "file1.txt",
                },
            ],
            "sha": "a",
        },
        {
            "files": [
                {
                    "filename": "file1.txt",
                },
                {
                    "filename": "file2.txt",
                },
            ],
            "sha": "b",
        }
    ]);
});

test('updatedFiles', async() => {
    const files = await updatedFiles([
        {
            "files": [
                {
                    "filename": "file1.txt",
                },
            ],
            "sha": "a",
        },
        {
            "files": [
                {
                    "filename": "file1.txt",
                },
                {
                    "filename": "file2.txt",
                },
            ],
            "sha": "b",
        }
    ]);
    await expect(files).toEqual([ 'file1.txt', 'file2.txt' ]);
});

const octokitMock = {
    repos: {
        async getCommit({ owner, repo, ref }) {
            return { data: commitMocks[ref] }
        }
    }
}

const pushEventPayloadMock = {
    "commits": [
        {
            "id": "a"
        },
        {
            "id": "b"
        }
    ],
    "repository": {
        "name": "Hello-World",
        "owner": {
            "login": "Codertocat",
        }
    }
};

const commitMocks = {
    a: {
        "sha": "a",
        "files": [
            {
                "filename": "file1.txt",
            }
        ]
    },
    b: {
        "sha": "b",
        "files": [
            {
                "filename": "file1.txt",
            },
            {
                "filename": "file2.txt",
            }
        ]
    }
};
