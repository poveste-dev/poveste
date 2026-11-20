import { register } from './registration.js'

export default {
  id: 'registration',
  title: 'Registration',
  variants: [{ title: 'Default', onMount: register }],
}
