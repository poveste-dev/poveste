import { testStories } from '@poveste/plugin-react/testing'
import { vi } from 'vitest'
import stories from './Patient.story'

vi.setConfig({ testTimeout: 50 })

testStories(stories, { timeout: 2000 })
