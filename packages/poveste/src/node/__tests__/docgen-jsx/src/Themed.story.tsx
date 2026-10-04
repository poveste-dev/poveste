import { Themed } from './Themed'

function wrap<T>(component: T): T {
  return component
}

export default { title: 'Themed', component: wrap(Themed) }
