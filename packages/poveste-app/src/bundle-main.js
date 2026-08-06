/* eslint-disable perfectionist/sort-imports -- global styles must load before app bundle */
import 'virtual:$poveste-global-styles'
import { mountMainApp } from './bundled/index.js'
import './style.css'
import './bundled/app.css'

mountMainApp()
