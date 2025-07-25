import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { argv } from 'node:process'
import type { BaseWindowConstructorOptions } from 'electron'
import { app, BrowserWindow, clipboard, dialog, Menu, shell } from 'electron'
import contextMenu from 'electron-context-menu'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const { _, ...options } = yargs(hideBin(argv))
    .options({
      width: { type: 'number', default: 1024, },
      height: { type: 'number', default: 768, },
    })
    .parseSync()

const target = (_[0] as string) || 'example.com'
const url = target.includes('://') ? target : `http${target.startsWith('localhost') ? '' : 's'}://${target}`
const { host } = new URL(url)

const appData = app.getPath('appData')
const userData = join(appData, 'tron', host.replace(':', '_'))
app.setPath('userData', userData)

async function main() {
  await app.whenReady()

  const window = new BrowserWindow({
    title: host,
    ...options,
  })

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
          click(_, window) {
            shell.openExternal((window as BrowserWindow).webContents.getURL())
          },
        },
        {
          label: 'Copy Link',
          click(_, window) {
            clipboard.writeText((window as BrowserWindow).webContents.getURL())
          },
        },

        { type: 'separator' },

        {
          label: 'Resize',
          submenu: [
            [360, 720],
            [600, 800],
            [800, 600],
            [1024, 768],
            [1280, 720],
            [1920, 1080],
          ].map(([width, height]) => ({
            label: `${width} × ${height}`,
            click(_, window) {
              window!.setSize(width, height)
              window!.center()
            },
          })),
        },
        {
          label: 'Toggle Always On Top',
          click(_, window) {
            window!.setAlwaysOnTop(!window!.isAlwaysOnTop())
          },
        },
        {
          label: 'Set Opacity',
          submenu: [0.25, 0.5, 0.75, 1].map(opacity => ({
            label: `${opacity * 100}%`,
            click(_, window) {
              window!.setOpacity(opacity)
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

    prepend(_, { selectionText, linkURL, isEditable, mediaType }, window) {
      const { navigationHistory } = (window as BrowserWindow).webContents
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

  configureWindow(window)
}

main()

function configureWindow(window: BrowserWindow) {
  const { webContents } = window

  webContents.setWindowOpenHandler(() => {
    const [width, height] = window.getSize()
    const [x, y] = window.getPosition()
    const offset = 24

    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        ...options,
        width,
        height,
        x: x + offset,
        y: y + offset,
      },
    }
  })

  webContents.on('did-create-window', configureWindow)
}

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
