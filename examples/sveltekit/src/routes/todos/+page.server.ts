import type { Actions, PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'
import { api } from './api'

interface Todo {
  uid: string
  created_at: Date
  text: string
  done: boolean
  pending_delete: boolean
}

export const load: PageServerLoad = async ({ locals }) => {
  // locals.userid comes from src/hooks.server.ts
  const response = await api('GET', `todos/${locals.userid}`)

  if (response.status === 404) {
    // user hasn't created a todo list.
    // start with an empty array
    return {
      todos: [] as Todo[],
    }
  }

  if (response.status === 200) {
    return {
      todos: (await response.json()) as Todo[],
    }
  }

  throw error(response.status)
}

// Named actions, which a form reaches with `?/create`. SvelteKit reads only
// `actions` from a `+page.server.ts`; the HTTP verbs this used to export belong
// in a `+server.ts` and were never called here, because the `_method` override
// that dispatched to them was removed in SvelteKit 2.
export const actions: Actions = {
  create: async ({ request, locals }) => {
    const form = await request.formData()

    await api('POST', `todos/${locals.userid}`, {
      text: form.get('text'),
    })
  },

  edit: async ({ request, locals }) => {
    const form = await request.formData()

    await api('PATCH', `todos/${locals.userid}/${form.get('uid')}`, {
      text: form.has('text') ? form.get('text') : undefined,
      done: form.has('done') ? !!form.get('done') : undefined,
    })
  },

  delete: async ({ request, locals }) => {
    const form = await request.formData()

    await api('DELETE', `todos/${locals.userid}/${form.get('uid')}`)
  },
}
