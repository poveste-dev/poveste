/* eslint-disable perfectionist/sort-imports -- global styles must load before app bundle */
import 'virtual:$poveste-global-styles'
import { mountMainApp } from './bundled/index.js'
// Self-hosted app face, here rather than in main.pcss so Vite hashes the font
// files into the book instead of postcss shipping a node_modules path (#219).
import './app/style/font.css'
import './style.css'
import './bundled/app.css'

mountMainApp()
