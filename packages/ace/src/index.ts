#!/usr/bin/env node

import yargs from 'yargs'

import buildCommand from './commands/build'
import packageCommand from './commands/package'

yargs.scriptName('ace').usage('$0 <command> [args]')

yargs.command(buildCommand)
yargs.command(packageCommand)

yargs.fail((msg) => {
  if (msg) {
    console.error(msg)
  }
  process.exit(1)
})

yargs.help().showHelpOnFail(false).parse()
