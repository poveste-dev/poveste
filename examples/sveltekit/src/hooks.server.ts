import type { Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
  let userid = event.cookies.get('userid')

  if (!userid) {
    // First visit: mint an id and remember it so we recognise them next time.
    //
    // `secure` is SvelteKit's default except on `http://localhost` literally —
    // not `127.0.0.1`, not a LAN address — so a cookie set with the defaults is
    // dropped by the browser when this example is served with `--host`. It is
    // a demo id that authenticates nothing, so it follows the page instead.
    userid = crypto.randomUUID()
    event.cookies.set('userid', userid, {
      path: '/',
      secure: event.url.protocol === 'https:',
    })
  }

  event.locals.userid = userid

  return resolve(event)
}
