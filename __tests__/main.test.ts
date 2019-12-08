import { retrieveCodes } from '../src/utils'
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
