import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { argv } from 'node:process'
import type { BaseWindowConstructorOptions } from 'electron'
import { app, BrowserWindow, clipboard, dialog, Menu, shell } from 'electron'
import contextMenu from 'electron-context-menu'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const { _, ...options } = yargs(hideBin(argv)).parseSync()

const target = (_[0] as string) || 'example.com'
const url = target.includes('://') ? target : `http${target.startsWith('localhost') ? '' : 's'}://${target}`
const { host } = new URL(url)

const appData = app.getPath('appData')
const userData = join(appData, 'tron', host.replace(':', '_'))
app.setPath('userData', userData)

async function main() {
  await app.whenReady()

  const window = new BrowserWindow(options as BaseWindowConstructorOptions)
  const { webContents } = window
  const { navigationHistory } = webContents

  window.loadURL(url)

  const titleBarHidden = options.titleBarStyle === 'hidden'
  const frameless = options.frame === false

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    // Remove default help menu
    // https://github.com/electron/electron/blob/ec748eb91526282c7f6ea7eba90bfb0b7222c6bd/lib/browser/default-menu.ts#L49-L56
    ...Menu.getApplicationMenu()!.items.slice(0, -1),

    {
      label: 'Tools',
      submenu: [
        {
          label: 'Open in Browser',
          click() {
            shell.openExternal(webContents.getURL())
          },
        },
        {
          label: 'Copy Link',
          click() {
            clipboard.writeText(webContents.getURL())
          },
        },

        { type: 'separator' },

        {
          label: 'Toggle Always On Top',
          click() {
            window.setAlwaysOnTop(!window.isAlwaysOnTop())
          },
        },
        {
          label: 'Set Opacity',
          submenu: [0.25, 0.5, 0.75, 1].map(opacity => ({
            label: `${opacity * 100}%`,
            click() {
              window.setOpacity(opacity)
            },
          })),
        },

        { type: 'separator' },

        {
          label: `${titleBarHidden ? 'Enable' : 'Disable'} Title Bar and Relaunch`,
          click() {
            const hideTitleBar = '--title-bar-style=hidden'
            app.relaunch({ args: titleBarHidden
                  ? argv.slice(1).filter(arg => arg !== hideTitleBar)
                  : [...argv.slice(1), hideTitleBar]
            })
            app.quit()
          },
        },
        {
          label: `${frameless ? 'Enable' : 'Disable'} Window Frame and Relaunch`,
          click() {
            const noFrame = '--no-frame'
            app.relaunch({ args: frameless
              ? argv.slice(1).filter(arg => arg !== noFrame)
              : [...argv.slice(1), noFrame]
            })
            app.quit()
          },
        },
      ],
    },

    {
      role: 'help',
      submenu: [
        {
          label: 'Reset and Quit',
          click: resetAndQuit,
        },
      ],
    },
  ]))

  contextMenu({
    showCopyImageAddress: true,
    showSaveImageAs: true,
    showCopyVideoAddress: true,
    showSaveVideoAs: true,

    prepend(_, { selectionText, linkURL, isEditable, mediaType }) {
      const navigationVisible = !selectionText && !linkURL && !isEditable && mediaType === 'none'

      return [
        {
          label: 'Back',
          visible: navigationVisible,
          enabled: navigationHistory.canGoBack(),
          click: navigationHistory.goBack,
        },
        {
          label: 'Forward',
          visible: navigationVisible,
          enabled: navigationHistory.canGoForward(),
          click: navigationHistory.goForward,
        },

        {
          label: 'Open in Browser',
          visible: Boolean(linkURL),
          click() {
            shell.openExternal(linkURL)
          },
        },
      ]
    },
  })
}

main()

function resetAndQuit() {
  const option = dialog.showMessageBoxSync({
    type: 'warning',
    message: `Delete ${userData} and quit?`,
    buttons: ['OK', 'Cancel'],
  })
  if (option !== 0) return

  app.once('will-quit', () => {
    rmSync(userData, { recursive: true })
  })
  app.quit()
}
