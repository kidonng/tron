#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { argv } from 'node:process'
import electron from 'electron'

execFileSync(
    electron as unknown as string,
    [require.resolve('./main.js'), ...argv.slice(2)],
    { stdio: 'inherit' },
)
