import type { Router } from 'vue-router'
import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { povesteConfig } from './util/config'

export const base = import.meta.env.BASE_URL as string

function createRouterHistory() {
  switch (povesteConfig.routerMode) {
    case 'hash': return createWebHashHistory(base)
    case 'history':
    default:
      return createWebHistory(base)
  }
}

function newRouter(): Router {
  return createRouter({
    history: createRouterHistory(),
    routes: [
      {
        path: '/',
        name: 'home',
        component: () => import('./components/HomeView.vue'),
      },
      {
        path: '/story/:storyId',
        name: 'story',
        component: () => import('./components/story/StoryView.vue'),
      },
    ],
  })
}

// A page in `poveste dev` can hold two copies of this module: each importer's
// URL is stamped when the server serves it, and a story edit stamps most of the
// chrome. Every copy hands out the router the app installed, or the story store
// read one still at `/` and the page showed no story until reloaded (#1320).
export const router: Router = import.meta.hot
  ? (import.meta.hot.data.router ??= newRouter())
  : newRouter()
