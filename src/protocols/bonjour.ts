import Bonjour, {BrowserOptions, Service} from 'bonjour'
import {EventIterator} from 'event-iterator'
export function discover(opts: BrowserOptions, timeout = 20000): EventIterator<Service> {
  return new EventIterator(({push, stop}) => {
    const bonjour = Bonjour()
    const browser = bonjour.find(opts, push)
    browser.on('up', push)
    setTimeout(stop, timeout)
    return () => {
      browser.off('up', push)
      browser.stop()
      bonjour.destroy()
    }
  })
}
