#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { argv } from 'node:process'
import electron from 'electron'

execFileSync(
    electron as unknown as string,
    [resolve(dirname(argv[1]), 'main.js'), ...argv.slice(2)],
    { stdio: 'inherit' },
)
